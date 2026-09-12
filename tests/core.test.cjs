const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function runtime(file, overrides = {}) {
  const events = {}, intervals = [], timeouts = [], runs = [];
  const signals = new Proxy({}, { get: (_, key) => ({ subscribe: fn => { (events[key] ??= []).push(fn); } }) });
  const context = vm.createContext({
    console, world: { afterEvents: signals, beforeEvents: signals },
    system: { beforeEvents: signals, afterEvents: signals, run: fn => runs.push(fn), runInterval: fn => intervals.push(fn), runTimeout: fn => timeouts.push(fn), clearRun() {} },
    ...overrides,
  });
  const source = fs.readFileSync(path.join(__dirname, '../BP/scripts', file), 'utf8')
    .replace(/^import\s+[\s\S]*?\sfrom\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export /gm, '');
  vm.runInContext(source, context, { filename: file });
  return { context, events, intervals, timeouts, runs };
}
const core = name => `DoriosRPGCore/${name}.js`;

function inventoryFixture(contents, entries = { 'test:a': { trinket: 'head' }, 'test:b': { trinket: 'head' } }) {
  const cells = [...contents], tags = new Set(), returned = [], dropped = [], held = [{ typeId: 'test:a', amount: 1 }];
  const container = { getItem: i => cells[i], setItem: (i, x) => { cells[i] = x; }, moveItem: (i, j) => { cells[j] = cells[i]; cells[i] = undefined; } };
  const inv = { getItem: i => held[i], addItem: item => { returned.push(item); }, emptySlotsCount: 10 };
  const entity = { isValid: true, getComponent: () => ({ container }), remove() { this.isValid = false; } };
  const player = { id: 'p', isValid: true, typeId: 'minecraft:player', selectedSlotIndex: 0,
    location: {}, dimension: { getEntities: () => [entity], spawnItem: item => dropped.push(item) },
    getTags: () => [...tags], hasTag: t => tags.has(t), addTag: t => tags.add(t), removeTag: t => tags.delete(t),
    getEffects: () => [], getComponent: () => ({ container: inv }) };
  let consume = true;
  const r = runtime(core('trinketsInv'), { data: entries, slots: { head: 0, body: 1 },
    statDisplayItem: 'dorios:stat_display', getStatCategory: () => [], changeItemAmount: () => consume, stopPlayerTracking() {},
    ItemStack: class { constructor(typeId) { this.typeId = typeId; this.amount = 1; } } });
  return { ...r, cells, tags, returned, dropped, player, entity, held, inv, setConsume: value => { consume = value; } };
}
const item = typeId => ({ typeId, amount: 1 });

test('invalid, missing and malformed stats have safe category-specific defaults', () => {
  const { context: c } = runtime(core('statsManager'));
  let reads = 0;
  assert.equal(c.getStatCategory({ isValid: false, getDynamicProperty() { reads++; } }, 'immunities').length, 0);
  assert.equal(reads, 0);
  for (const value of [undefined, '{broken', 'null', '42', '{}']) {
    assert.equal(c.getStatCategory({ isValid: true, getDynamicProperty: () => value }, 'immunities').length, 0);
  }
  assert.equal(c.getStatCategory({ isValid: true, getDynamicProperty() { throw Error('InvalidEntityError'); } }, 'immunities').length, 0);
  assert.equal(c.getStatCategory({ isValid: true, getDynamicProperty: () => '{"attack":4}' }, 'stats').attack, 4);
});

test('rejected accessory is returned once and valid equipment survives closing', () => {
  const f = inventoryFixture([item('test:a'), item('test:b')]);
  f.context.validateTrinketSlots(f.player, f.entity);
  assert.deepEqual([...f.tags], ['test:a']);
  assert.deepEqual(f.returned.map(x => x.typeId), ['test:b']);
  f.context.removeInvEntity(f.player);
  assert.deepEqual(f.returned.map(x => x.typeId), ['test:b']);
  assert.equal(f.tags.size, 1);
});

test('moving an accessory to an earlier slot preserves exactly one tag', () => {
  const f = inventoryFixture([undefined, item('test:a')]);
  f.context.validateTrinketSlots(f.player, f.entity);
  assert.equal(f.cells[0].typeId, 'test:a');
  assert.equal(f.cells[1], undefined);
  assert.deepEqual([...f.tags], ['test:a']);
});

test('pending removal is reconciled when the scroll closes', () => {
  const f = inventoryFixture([]); f.tags.add('test:a');
  f.context.removeInvEntity(f.player);
  assert.equal(f.returned.length, 0);
  assert.equal(f.tags.size, 0);
});

test('failed conditions, consumption or mismatched held items never grant equipment', () => {
  const f = inventoryFixture([], { 'test:a': { trinket: 'head', condition: () => false } });
  f.context.tryEquipTrinket(f.player, item('test:a'));
  assert.equal(f.returned.length, 0); assert.equal(f.tags.size, 0);
  const g = inventoryFixture([]); g.setConsume(false);
  g.context.tryEquipTrinket(g.player, item('test:a'));
  assert.equal(g.tags.size, 0);
  g.setConsume(true); g.held[0] = item('test:b');
  g.context.tryEquipTrinket(g.player, item('test:a'));
  assert.equal(g.tags.size, 0);
  g.held[0] = item('test:a'); g.context.tryEquipTrinket(g.player, item('test:a'));
  assert.deepEqual([...g.tags], ['test:a']);
});

test('rejected stacks return completely, including inventory overflow', () => {
  const f = inventoryFixture([{ typeId: 'test:a', amount: 3 }]);
  f.inv.addItem = item => ({ ...item, amount: 2 });
  f.context.validateTrinketSlots(f.player, f.entity);
  assert.equal(f.tags.size, 0); assert.equal(f.dropped[0].amount, 2);
});

test('before hurt changes the original hit once and defers all side effects', () => {
  const stats = { attack: 1, critChance: 100, critMulti: 25, attackMulti: 0, lifeSteal: 10 };
  let healed = 0, effects = 0;
  const r = runtime(core('activeAbilities'), { getStatCategory: (_, c) => c === 'stats' ? stats : { poison: 1 }, addHealth: (_, n) => { healed += n; } });
  const attacker = { isValid: true, typeId: 'minecraft:player', getComponent: () => undefined };
  const target = { isValid: true, typeId: 'test:mob', addEffect() { effects++; }, applyDamage() { assert.fail('must not create another attack'); } };
  const source = { cause: 'entityAttack', damagingEntity: attacker };
  const e = { hurtEntity: target, damage: 4, damageSource: source };
  r.events.entityHurt[0](e);
  assert.equal(e.damage, 5.25); assert.equal(e.damageSource, source); assert.equal(e.cancel, undefined);
  assert.equal(effects, 0); assert.equal(healed, 0);
  r.runs[0](); assert.equal(effects, 1); assert.equal(healed, 0.525);
});

test('existing multipliers and falling bonus include the original damage exactly once', () => {
  const r = runtime(core('activeAbilities'));
  const stats = { attack: 2, critChance: 100, critMulti: 50, attackMulti: 20 };
  const result = r.context.calculateAttackDamage(10, stats, 1, { isFalling: true });
  // Old bonus: ((2 + 1 + 1.5) * 1.2 + 10 * .2) * 1.5 = 11.1.
  assert.ok(Math.abs(result.damage - 21.1) < 1e-9);
});

test('thorns is deferred and cannot reflect or buff itself again', () => {
  const r = runtime(core('activeAbilities'), { getStatCategory: (_, c) => c === 'stats' ? { thorns: 100, critChance: 0 } : {} });
  let hits = 0;
  const attacker = { isValid: true, typeId: 'test:mob', applyDamage(damage, damageSource) {
    hits++; assert.equal(damage, 4); assert.equal(damageSource.cause, 'thorns');
    r.events.entityHurt[0]({ hurtEntity: attacker, damage, damageSource });
  } };
  const target = { isValid: true, typeId: 'minecraft:player' };
  r.events.entityHurt[0]({ hurtEntity: target, damage: 4, damageSource: { cause: 'entityAttack', damagingEntity: attacker } });
  assert.equal(hits, 0); r.runs[0](); assert.equal(hits, 1); assert.equal(r.runs.length, 1);
});

test('cancelled, zero, generated and invalid hits do not schedule actions', () => {
  const r = runtime(core('activeAbilities'), { getStatCategory: () => ({}) });
  const actor = { isValid: true, typeId: 'minecraft:player', getComponent: () => undefined };
  for (const change of [{ cancel: true }, { damage: 0 }, { hurtEntity: { isValid: false } }, { damageSource: { cause: 'thorns', damagingEntity: actor } }, { damageSource: { cause: 'override', damagingEntity: actor } }]) {
    const event = { hurtEntity: actor, damage: 4, damageSource: { cause: 'entityAttack', damagingEntity: actor }, ...change };
    r.events.entityHurt[0](event);
  }
  assert.equal(r.runs.length, 0);
  r.events.entityHurt[0]({ hurtEntity: actor, damage: 4, damageSource: { cause: 'projectile', damagingEntity: actor } });
  actor.isValid = false; assert.doesNotThrow(() => r.runs[0]());
});

test('Holy Cross modifies the hit while quivers and Echo remain deferred', () => {
  const r = runtime('system.js');
  const tags = new Set(['dorios:holy_cross', 'dorios:strong_echo_ring', 'dorios:frost_quiver']);
  let effects = 0, echoes = 0;
  const attacker = { isValid: true, typeId: 'minecraft:player', hasTag: id => tags.has(id) };
  const target = { isValid: true, typeId: 'test:mob', getComponent: () => ({ hasTypeFamily: () => true }),
    addEffect() { effects++; }, applyDamage(n, source) { echoes++; assert.equal(n, 1); assert.equal(source.damagingEntity, attacker); assert.equal(source.cause, 'thorns'); } };
  const event = { hurtEntity: target, damage: 4, damageSource: { cause: 'entityAttack', damagingEntity: attacker } };
  r.events.entityHurt[0](event); assert.equal(event.damage, 6); assert.equal(echoes, 0);
  r.timeouts[0](); assert.equal(echoes, 1);
  r.events.entityHurt[0]({ ...event, damageSource: { cause: 'projectile', damagingEntity: attacker } });
  assert.equal(effects, 0); r.runs[0](); assert.equal(effects, 1);
});

test('attack handlers only subscribe to before hurt', () => {
  for (const name of ['system.js', core('activeAbilities')]) {
    const source = fs.readFileSync(path.join(__dirname, '../BP/scripts', name), 'utf8');
    assert.ok(source.includes('world.beforeEvents.entityHurt.subscribe'));
    assert.ok(!source.includes('world.afterEvents.entityHurt.subscribe'));
  }
});

test('effect handler ignores unloading players and compares exact effect names', () => {
  const r = runtime(core('updateStats'), { getStatCategory: () => ['poison'] });
  const handler = r.events.effectAdd[0];
  const e = { entity: { isValid: false, typeId: 'minecraft:player' }, effectType: 'poison' }; handler(e); assert.equal(e.cancel, undefined);
  e.entity.isValid = true; handler(e); assert.equal(e.cancel, true);
  const other = { entity: e.entity, effectType: 'fatal_poison' }; handler(other); assert.equal(other.cancel, undefined);
});

test('Rush of Fear expires after three seconds and clears on unequip', () => {
  const tags = new Set(['dorios:rush_of_fear', 'dorios:rush_of_fear_tag']);
  const props = { 'dorios:rush_of_fear_time': 3 };
  const player = { isValid: true, location: {}, dimension: { getBlock() {} }, getHeadLocation: () => ({}),
    hasTag: t => tags.has(t), removeTag: t => tags.delete(t), getDynamicProperty: k => props[k], setDynamicProperty: (k,v) => { props[k] = v; } };
  const r = runtime('system.js'); r.context.world.getAllPlayers = () => [player];
  assert.equal(r.intervals.length, 0); r.events.worldLoad[0]();
  for (let i = 0; i < 60; i++) r.intervals[0]();
  assert.equal(props['dorios:rush_of_fear_time'], 0); assert.equal(tags.has('dorios:rush_of_fear_tag'), false);
  tags.add('dorios:rush_of_fear_tag'); tags.delete('dorios:rush_of_fear'); r.intervals[0]();
  assert.equal(tags.has('dorios:rush_of_fear_tag'), false);
});


test('damage reduction covers all causes without an attacker, with fractional and unrestricted values', () => {
  for (const cause of ['fall', 'lava', 'fire', 'drowning', 'thorns', 'override', 'entityAttack']) {
    for (const [reduction, expected] of [[0, 10], [25, 7.5], [12.5, 8.75], [100, 0], [150, 0], [-200, 30]]) {
      const r = runtime(core('activeAbilities'), { getStatCategory: () => ({ damageReduction: reduction }) });
      const e = { damage: 10, hurtEntity: { isValid: true, typeId: 'minecraft:player' }, damageSource: { cause } };
      r.events.entityHurt[0](e); assert.equal(e.damage, expected); assert.equal(r.runs.length, 0);
    }
  }
});

test('defense applies once after offense and reflected damage still gets defense', () => {
  const attacker = { isValid: true, typeId: 'minecraft:player', getComponent: () => undefined };
  const target = { isValid: true, typeId: 'minecraft:player' };
  const r = runtime(core('activeAbilities'), { getStatCategory: (who, category) => category !== 'stats' ? {} : who === attacker
    ? { attack: 1, critChance: 100, critMulti: 25 } : { damageReduction: 50 } });
  const e = { damage: 4, hurtEntity: target, damageSource: { cause: 'entityAttack', damagingEntity: attacker } };
  r.events.entityHurt[0](e); assert.equal(e.damage, 2.625);
  for (const cause of ['thorns', 'override']) {
    const reflected = { ...e, damage: 10, damageSource: { cause, damagingEntity: attacker } };
    r.events.entityHurt[0](reflected); assert.equal(reflected.damage, 5);
  }
  assert.equal(r.runs.length, 1);
});

test('damage reduction stays fractional and unbounded in calculated stats', () => {
  const config = runtime(core('config'));
  const statsConfig = vm.runInContext('statsConfig', config.context);
  assert.deepEqual(Object.keys(statsConfig.damageReduction), ['default']);
  assert.equal(vm.runInContext('vanillaEventStats.includes("damageReduction")', config.context), false);
  const r = runtime(core('statsManager'), { statsConfig, data: { 'test:a': { stats: { damageReduction: -200.5 } } } });
  assert.equal(r.context.calculateAllStats({ getTags: () => ['test:a'] }).stats.damageReduction, -200.5);
});

test('player initialization clears the old sensor before computing script stats', () => {
  const calls = [];
  const r = runtime(core('updateStats'), { getEquipment: () => undefined, updatePlayerStats: () => calls.push('stats') });
  const player = { id: 'p', isValid: true, triggerEvent: id => calls.push(id), getTags: () => [] };
  r.events.playerSpawn[0]({ player });
  assert.deepEqual(calls, ['minecraft:damageReduction0', 'stats']);
  const file = path.join(__dirname, '../BP/entities/player.json');
  const entity = JSON.parse(fs.readFileSync(file, 'utf8'))['minecraft:entity'];
  for (const part of ['component_groups', 'events']) {
    assert.deepEqual(Object.keys(entity[part]).filter(k => k.startsWith('minecraft:damageReduction')), ['minecraft:damageReduction0']);
  }
  assert.equal(entity.component_groups['minecraft:damageReduction0']['minecraft:damage_sensor'].triggers[0].damage_multiplier, 1);
  assert.deepEqual(entity.events['minecraft:damageReduction0'].sequence, [
    { remove: { component_groups: ['minecraft:damageReduction0'] } },
    { add: { component_groups: ['minecraft:damageReduction0'] } },
  ]);
});


test('two stat columns preserve row order, zero values and base attack', () => {
  const r = runtime(core('statDisplay'));
  const columns = r.context.formatStatColumns({
    stats: { health: 30, attack: 0, speed: 120, waterSpeed: 150, lifeSteal: 2.125, thorns: 0, fireAspect: 3, extraJumps: 2 },
  }).map(s => s.replace(/\u00a7./g, ''));
  assert.deepEqual(Array.from(columns), ['15\n\n120%\n\n2.13%\n\n3s', '1\n\n150%\n\n0%\n\n2']);
  assert.equal(r.context.formatStatColumns({ stats: { attack: 2 } })[1].replace(/\u00a7./g, '').split('\n')[0], '3');
});

test('effect lore lists only granted effects and deduplicates normalized immunities', () => {
  const r = runtime(core('statDisplay'));
  const result = r.context.formatEffectDisplay({
    passives: { regeneration: 2, speed: 0, resistance: -1, custom_effect: 1 },
    actives: { poison: 3 }, immunities: ['Poison', 'minecraft:poison', 'Wither'],
  });
  const clean = text => text.replace(/\u00a7./g, '');
  assert.equal(clean(result.nameTag), 'Passive Effects');
  assert.deepEqual(Array.from(result.lore, clean), [
    '? I', '\uF50D II', '', 'Active Effects', '\uF54C III', '', 'Immunities', '\uF54C', '\uF54B',
  ]);
  assert.ok(result.lore.every(line => !line.includes('\n')));
  const empty = r.context.formatEffectDisplay({});
  assert.equal(empty.lore.filter(line => clean(line) === 'None').length, 3);
  const many = Object.fromEntries(Array.from({ length: 120 }, (_, i) => ['effect_' + i, 1]));
  assert.ok(r.context.formatEffectDisplay({ passives: many }).lore.length <= 100);
});

test('display writer uses two named stat items and one effect item with lore', () => {
  const cells = Array.from({ length: 16 }, () => undefined);
  cells[0] = item('test:a'); const writes = [];
  const r = runtime(core('statDisplay'), {
    ItemStack: class { constructor(typeId) { this.typeId = typeId; } setLore(lines) { this.lore = lines; } },
  });
  const entity = { isValid: true, getComponent: () => ({ container: {
    size: 16, setItem: (i, v) => { cells[i] = v; writes.push(i); },
  } }) };
  r.context.writeStatDisplay(entity, { stats: { health: 20 }, passives: { regeneration: 1 } });
  assert.deepEqual(writes, [13, 14, 15]);
  assert.equal(cells[0].typeId, 'test:a');
  for (const value of cells.slice(13)) assert.equal(value.typeId, 'dorios:stat_display');
  assert.equal(cells[13].lore, undefined);
  assert.ok(cells[15].nameTag.includes('Passive Effects'));
  assert.equal(cells[15].lore[0].replace(/\u00a7./g, ''), '\uF50D I');
  assert.doesNotThrow(() => r.context.writeStatDisplay({ isValid: false }, {}));
  r.context.writeStatDisplay({ isValid: true, getComponent: () => ({ container: { size: 13 } }) }, {});
});

test('old scroll carriers are cleared without touching equipment or unrelated items', () => {
  const cells = Array.from({ length: 25 }, () => item('dorios:stat_display'));
  cells[0] = item('test:a'); cells[24] = item('test:other');
  const r = runtime(core('statDisplay'), {
    ItemStack: class { constructor(typeId) { this.typeId = typeId; } setLore(lines) { this.lore = lines; } },
  });
  r.context.writeStatDisplay({ isValid: true, getComponent: () => ({ container: {
    size: 25, getItem: i => cells[i], setItem: (i, v) => { cells[i] = v; },
  } }) }, {});
  assert.equal(cells[0].typeId, 'test:a');
  assert.ok(cells.slice(16, 24).every(value => value === undefined));
  assert.equal(cells[24].typeId, 'test:other');
});

test('opening the owned scroll reconciles tags before one calculation and one display write', () => {
  const f = inventoryFixture([item('test:a')]); const calls = [];
  f.entity.typeId = 'dorios:trinkets_inv';
  f.entity.getTags = () => ['p', 'dorios:trinket_loaded'];
  f.context.updatePlayerStats = player => {
    assert.deepEqual(player.getTags(), ['test:a']); calls.push('calculate'); return { stats: { health: 24 } };
  };
  f.context.writeStatDisplay = (entity, result) => {
    assert.equal(entity, f.entity); assert.equal(result.stats.health, 24); calls.push('display');
  };
  assert.equal(f.events.entityContainerOpened, undefined);
  f.events.worldLoad[0]();
  const open = f.events.entityContainerOpened[0];
  open({ entity: f.entity, openSource: { entity: f.player } });
  assert.deepEqual(calls, ['calculate', 'display']);
  assert.equal(f.intervals.length, 0);
  calls.length = 0;
  for (const event of [
    { entity: { isValid: false }, openSource: { entity: f.player } },
    { entity: { ...f.entity, typeId: 'minecraft:chest_minecart' }, openSource: { entity: f.player } },
    { entity: f.entity, openSource: {} },
    { entity: f.entity, openSource: { entity: { ...f.player, id: 'other' } } },
  ]) open(event);
  assert.deepEqual(calls, []);
});

test('opening before the first trinket tick loads existing tag equipment before reconciliation', () => {
  const f = inventoryFixture([]); const entityTags = new Set(['p']);
  f.tags.add('test:a'); f.entity.typeId = 'dorios:trinkets_inv';
  f.entity.getTags = () => [...entityTags]; f.entity.addTag = tag => entityTags.add(tag);
  let count = 0;
  f.context.updatePlayerStats = () => { count++; assert.equal(f.cells[0].typeId, 'test:a'); return {}; };
  f.context.writeStatDisplay = () => {};
  f.context.refreshOpenedTrinketStats({ entity: f.entity, openSource: { entity: f.player } });
  assert.equal(count, 1); assert.ok(f.tags.has('test:a')); assert.ok(entityTags.has('dorios:trinket_loaded'));
});

test('internal display items never become equipment tags or returned items', () => {
  const f = inventoryFixture([item('dorios:stat_display')]);
  f.cells[13] = item('dorios:stat_display');
  f.context.validateTrinketSlots(f.player, f.entity);
  assert.equal(f.cells[0], undefined); assert.equal(f.cells[13].typeId, 'dorios:stat_display');
  assert.equal(f.tags.size, 0); assert.equal(f.returned.length, 0);
  f.context.removeInvEntity(f.player);
  assert.equal(f.returned.length, 0);
});

test('every legacy stat formatter remains callable, including damage reduction', () => {
  const r = runtime(core('config'));
  const result = vm.runInContext('Object.keys(statsConfig).every(key => typeof statTexts.formats[key] === "function")', r.context);
  assert.equal(result, true);
});

test('sidebar indices belong to direct collection children, not nested value labels', () => {
  const ui = JSON.parse(fs.readFileSync(path.join(__dirname, '../RP/ui/dorios_trinkets_menu.json'), 'utf8'));
  const indices = [];
  for (const child of ui.stats_content.controls) {
    const [name, section] = Object.entries(child)[0];
    if (!name.endsWith('_columns')) continue;
    assert.equal(section.type, 'collection_panel');
    assert.equal(section.collection_name, 'container_items');
    for (const entry of section.controls) {
      const column = Object.values(entry)[0];
      indices.push(column.collection_index);
      const values = column.controls.find(c => c['values@trinkets.dynamic_stat_label'])['values@trinkets.dynamic_stat_label'];
      assert.equal(Object.hasOwn(values, 'collection_index'), false);
    }
  }
  assert.deepEqual(indices, [13, 14]);
  const effects = ui.stats_content.controls.find(c => c.effects_collection).effects_collection;
  assert.equal(effects.type, 'collection_panel');
  assert.equal(effects.controls[0]['effects@trinkets.dynamic_stat_label'].collection_index, 15);
  assert.equal(effects.size[1], '100%cm');
});


test('effect levels display Roman numerals without changing stat number formatting', () => {
  const r = runtime(core('statDisplay'));
  for (const [level, roman] of [[1, 'I'], [2, 'II'], [3, 'III'], [4, 'IV'], [5, 'V'], [6, 'VI'], [9, 'IX'], [10, 'X'], [14, 'XIV'], [49, 'XLIX'], [256, 'CCLVI']]) {
    const effect = r.context.formatEffectDisplay({ passives: { regeneration: level } });
    assert.equal(effect.lore[0].replace(/\u00a7./g, ''), '\uF50D ' + roman);
  }
  assert.ok(r.context.formatStatColumns({ stats: { attack: 2 } })[1].includes('3'));
});


test('guide toggles share a group and the guide close does not close the container', () => {
  const uiPath = name => path.join(__dirname, '../RP/ui', name);
  const menu = JSON.parse(fs.readFileSync(uiPath('dorios_trinkets_menu.json'), 'utf8'));
  const guide = JSON.parse(fs.readFileSync(uiPath('trinkets_guide.json'), 'utf8'));
  const root = menu.trinket_panel.controls[4]['root_panel@common.root_panel'];
  const open = root.controls.find(c => c['trinkets_help_open@trinkets_guide.guide_toggle'])['trinkets_help_open@trinkets_guide.guide_toggle'];
  const close = guide.guide_panel.controls.find(c => c['trinkets_help_close@trinkets_guide.guide_toggle'])['trinkets_help_close@trinkets_guide.guide_toggle'];
  assert.equal(open.$toggle_group_forced_index, 1);
  assert.equal(close.$toggle_group_forced_index, 0);
  assert.equal(guide['guide_toggle@common.toggle'].$radio_toggle_group, true);
  assert.equal(guide['guide_toggle@common.toggle'].$toggle_group_default_selected, 0);
  assert.equal(guide.guide_panel.bindings[0].source_control_name, 'trinkets_help_open');
  assert.equal(guide.guide_panel.bindings[0].source_property_name, '#toggle_state');
  for (const name of ['common_panel@common.common_panel', 'chest_panel', 'stats_sidebar@trinkets.stats_sidebar']) {
    const entry = root.controls.find(c => c[name])[name];
    assert.equal(entry.bindings[0].source_property_name, '(not #toggle_state)');
  }
  assert.ok(!JSON.stringify(guide).includes('button.menu_exit'));
  const defs = JSON.parse(fs.readFileSync(uiPath('_ui_defs.json'), 'utf8'));
  assert.ok(defs.ui_defs.includes('ui/trinkets_guide.json'));
});


test('zero attack bonuses preserve incoming melee and projectile damage', () => {
  const r = runtime(core('activeAbilities'), { getStatCategory: () => ({}) });
  const attacker = { isValid: true, typeId: 'minecraft:player', getComponent: () => undefined };
  for (const cause of ['entityAttack', 'projectile']) {
    for (const damage of [1, 4, 9]) {
      const e = { damage, hurtEntity: { isValid: true, typeId: 'test:mob' }, damageSource: { cause, damagingEntity: attacker } };
      r.events.entityHurt[0](e);
      assert.equal(e.damage, damage);
    }
  }
});

test('structure scans defer unloaded areas and do not mark the chest as opened', () => {
  const r = runtime(core('lootInjector'));
  const injector = vm.runInContext('ChestLootInjector', r.context);
  const dimension = { id: 'minecraft:overworld', heightRange: { min: -64, max: 320 },
    getBiome: () => ({ id: 'minecraft:plains' }), isChunkLoaded: () => false,
    getBlock() { assert.fail('must not read an unloaded chunk'); } };
  const block = { location: { x: 0, y: 64, z: 0 }, dimension };
  injector.canInjectChest = () => true;
  injector.markChestOpened = () => assert.fail('incomplete scans must remain retryable');
  assert.equal(injector.detectNearbyStructure(block), undefined);
  injector.resolve(block);
  dimension.isChunkLoaded = () => true;
  dimension.getBlock = position => {
    assert.ok(position.y >= -64 && position.y < 320);
    return { typeId: 'minecraft:air' };
  };
  block.location.y = -64;
  assert.equal(injector.detectNearbyStructure(block), 'default');
});


test('Lava Waders freeze only the nearby foot-level circle and refresh aging blocks', () => {
  const cells = new Map();
  const makeBlock = (typeId, depth) => ({ typeId, permutation: { getState: () => depth },
    setPermutation(value) { this.typeId = value.typeId; this.depth = Object.values(value.states)[0]; } });
  cells.set('0,64,0', makeBlock('minecraft:lava', 7));
  cells.set('1,63,0', makeBlock('dorios:lava_solid_2', 0));
  cells.set('0,63,1', makeBlock('minecraft:water', 0));
  const r = runtime('system.js', { BlockPermutation: { resolve: (typeId, states) => ({ typeId, states }) } });
  const dimension = { heightRange: { min: -64, max: 320 },
    isChunkLoaded: position => position.x !== -2,
    getBlock(position) {
      assert.notEqual(position.x, -2);
      assert.ok(position.x ** 2 + position.z ** 2 <= 4);
      assert.ok([63, 64].includes(position.y));
      return cells.get([position.x, position.y, position.z].join(','));
    } };
  r.context.handleLavaWaders({ dimension, location: { x: 0.3, y: 64, z: 0.5 } });
  assert.equal(cells.get('0,64,0').typeId, 'dorios:lava_flow_0');
  assert.equal(cells.get('0,64,0').depth, 7);
  assert.equal(cells.get('1,63,0').typeId, 'dorios:lava_solid_0');
  assert.equal(cells.get('0,63,1').typeId, 'minecraft:water');
  dimension.heightRange.min = 65;
  dimension.getBlock = () => assert.fail('out-of-bounds positions must be skipped');
  r.context.handleLavaWaders({ dimension, location: { x: 0, y: 64, z: 0 } });
});

test('temporary lava preserves every liquid depth through melting and reloadable block states', () => {
  const r = runtime('blockTick.js', { BlockPermutation: { resolve: (typeId, states) => ({ typeId, states }) } });
  let component;
  r.events.startup[0]({ blockComponentRegistry: { registerCustomComponent: (_, value) => { component = value; } } });
  for (let depth = 0; depth < 16; depth++) {
    const family = depth === 0 ? 'solid' : 'flow';
    const block = { location: { x: 0, y: 63, z: 0 }, typeId: 'dorios:lava_' + family + '_0',
      permutation: { getState: () => depth }, setPermutation(value) {
        this.typeId = value.typeId;
        assert.equal(Object.values(value.states)[0], depth);
      } };
    for (let stage = 0; stage < 3; stage++) {
      const definition = JSON.parse(fs.readFileSync(path.join(__dirname, '../BP/blocks/lava_' + family + '_' + stage + '.json'), 'utf8'))['minecraft:block'];
      assert.ok(definition.description.states['dorios:liquid_depth'].includes(depth));
      component.onTick({ block, dimension: { getPlayers: () => [] } });
    }
    assert.equal(block.typeId, 'minecraft:lava');
  }
});


test('lava blocks do not advance melting stages while a wearer supports them', () => {
  const r = runtime('blockTick.js', { BlockPermutation: { resolve: (typeId, states) => ({ typeId, states }) } });
  let component;
  r.events.startup[0]({ blockComponentRegistry: { registerCustomComponent: (_, value) => { component = value; } } });
  let changes = 0;
  const block = { typeId: 'dorios:lava_solid_0', location: { x: 0, y: 63, z: 0 },
    permutation: { getState: () => 0 }, setPermutation() { changes++; } };
  const player = { isValid: true, hasTag: () => true, location: { x: 0.5, y: 64, z: 0.5 } };
  const dimension = { getPlayers: () => [player] };
  for (let i = 0; i < 20; i++) component.onTick({ block, dimension });
  assert.equal(changes, 0);
  player.location.x = 3;
  component.onTick({ block, dimension });
  assert.equal(changes, 1);
  player.location.x = 0;
  player.hasTag = () => false;
  component.onTick({ block, dimension });
  assert.equal(changes, 2);
});

test('scroll waits for a loaded chunk and tolerates a transient spawn failure', () => {
  let loaded = false, attempts = 0, tracked = 0;
  const entity = { isValid: true, addTag() {}, getComponent: () => ({ tame() {} }) };
  const player = { isValid: true, id: 'p', location: { x: 0, y: 64, z: 0 },
    dimension: { isChunkLoaded: () => loaded, spawnEntity() {
      attempts++;
      if (attempts === 1) throw Object.assign(new Error('not ticking'), { name: 'LocationInUnloadedChunkError' });
      return entity;
    } } };
  const r = runtime(core('trinketsInv'), { getEquipment() { assert.fail('unloaded tick must wait'); },
    startPlayerTracking() { tracked++; } });
  r.context.trinketTick(player);
  assert.equal(r.context.summonInvEntity(player), undefined);
  assert.equal(attempts, 0);
  loaded = true;
  assert.equal(r.context.summonInvEntity(player), undefined);
  assert.equal(r.context.summonInvEntity(player), entity);
  assert.equal(tracked, 1);
  player.dimension.spawnEntity = () => { throw new Error('unexpected failure'); };
  assert.throws(() => r.context.summonInvEntity(player), /unexpected failure/);
});
