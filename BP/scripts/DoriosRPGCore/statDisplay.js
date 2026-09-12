import { ItemStack } from '@minecraft/server';

// Row-major order matches the two fixed icon columns in the UI.
const statKeys = ['health', 'attack', 'speed', 'waterSpeed', 'lifeSteal', 'thorns', 'fireAspect', 'extraJumps'];
const effectGlyphs = {
    conduit_power: '\uF51D', fire_resistance: '\uF529', haste: '\uF51E',
    night_vision: '\uF549', regeneration: '\uF50D', resistance: '\uF539',
    slow_falling: '\uF53A', speed: '\uF53B', strength: '\uF53D',
    village_hero: '\uF53F', water_breathing: '\uF54A', levitation: '\uF52E',
    poison: '\uF54C', slowness: '\uF53C', blindness: '\uF51C',
    darkness: '\uF51F', hunger: '\uF52B', wither: '\uF54B',
};

export const statDisplayItem = 'dorios:stat_display';
export const firstStatDisplaySlot = 13;

function numberText(value) {
    return Number.isFinite(value) ? String(Number(value.toFixed(2))) : '0';
}

export function formatStatColumns({ stats = {} }) {
    const values = statKeys.map(key => {
        const value = stats[key] ?? 0;
        if (key === 'health') return numberText(value / 2);
        if (key === 'attack') return numberText(value + 1);
        const suffix = ['speed', 'waterSpeed', 'lifeSteal', 'thorns'].includes(key) ? '%' : key === 'fireAspect' ? 's' : '';
        return numberText(value) + suffix;
    });
    return [0, 1].map(column =>
        '\u00a7r\u00a78' + values.filter((_, index) => index % 2 === column).join('\n\n')
    );
}

function effectKey(key) {
    return key.replace('minecraft:', '').toLowerCase();
}

function romanLevel(level) {
    let value = Math.max(1, Math.floor(level));
    let result = '';
    for (const [number, symbol] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) {
        while (value >= number) {
            result += symbol;
            value -= number;
        }
    }
    return result;
}

function effectLine(key, level) {
    const glyph = effectGlyphs[effectKey(key)] ?? '?';
    return '\u00a7r\u00a7f' + glyph
        + (level === undefined ? '' : ' \u00a78' + romanLevel(level));
}

export function formatEffectDisplay({ passives = {}, actives = {}, immunities = [] }) {
    const effects = values => Object.entries(values)
        .filter(([, level]) => Number.isFinite(level) && level > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, level]) => effectLine(key, level));
    const nonempty = lines => lines.length ? lines : ['\u00a7r\u00a78None'];
    const lore = [
        ...nonempty(effects(passives)),
        '', '\u00a7r\u00a78\u00a7lActive Effects',
        ...nonempty(effects(actives)),
        '', '\u00a7r\u00a78\u00a7lImmunities',
        ...nonempty([...new Set(immunities.map(effectKey))].sort().map(key => effectLine(key))),
    ];
    return { nameTag: '\u00a7r\u00a78\u00a7lPassive Effects', lore: lore.slice(0, 100) };
}

export function writeStatDisplay(entity, playerData) {
    if (!entity?.isValid || !playerData) return;
    const container = entity.getComponent('inventory')?.container;
    if (!container || container.size < 16) return;
    formatStatColumns(playerData).forEach((text, index) => {
        const item = new ItemStack(statDisplayItem);
        item.nameTag = text;
        container.setItem(firstStatDisplaySlot + index, item);
    });
    const effects = formatEffectDisplay(playerData);
    const item = new ItemStack(statDisplayItem);
    item.nameTag = effects.nameTag;
    item.setLore(effects.lore);
    container.setItem(15, item);

    // Remove obsolete display carriers from an already-open older scroll entity.
    for (let index = 16; index < container.size; index++) {
        if (container.getItem(index)?.typeId === statDisplayItem) container.setItem(index);
    }
}
