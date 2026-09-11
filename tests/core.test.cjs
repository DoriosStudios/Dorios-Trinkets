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
    system: { afterEvents: signals, run: fn => runs.push(fn), runInterval: fn => intervals.push(fn), runTimeout: fn => timeouts.push(fn), clearRun() {} },
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
    getStatCategory: () => [], changeItemAmount: () => consume, stopPlayerTracking() {},
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

test('rejected accessory does not grant a tag or get recovered twice', () => {
  const f = inventoryFixture([item('test:a'), item('test:b')]);
  f.context.validateTrinketSlots(f.player, f.entity);
  assert.deepEqual([...f.tags], ['test:a']);
  assert.deepEqual(f.returned.map(x => x.typeId), ['test:b']);
  f.context.unequipAllTrinkets(f.player);
  assert.deepEqual(f.returned.map(x => x.typeId), ['test:b', 'test:a']);
  assert.equal(f.tags.size, 0);
});

test('moving an accessory to an earlier slot preserves exactly one tag', () => {
  const f = inventoryFixture([undefined, item('test:a')]);
  f.context.validateTrinketSlots(f.player, f.entity);
  assert.equal(f.cells[0].typeId, 'test:a');
  assert.equal(f.cells[1], undefined);
  assert.deepEqual([...f.tags], ['test:a']);
});

test('pending removal is reconciled before recovery', () => {
  const f = inventoryFixture([]); f.tags.add('test:a');
  f.context.unequipAllTrinkets(f.player);
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
  assert.equal(e.damage, 6.5); assert.equal(e.damageSource, source); assert.equal(e.cancel, undefined);
  assert.equal(effects, 0); assert.equal(healed, 0);
  r.runs[0](); assert.equal(effects, 1); assert.equal(healed, 0.65);
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
  r.events.entityHurt[0](e); assert.equal(e.damage, 3.25);
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
