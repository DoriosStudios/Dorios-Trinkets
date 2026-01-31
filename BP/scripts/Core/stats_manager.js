import { system, world } from '@minecraft/server'
import { ActionFormData } from '@minecraft/server-ui'
import { data, statsConfig, statTexts, vanillaStats, vanillaEventStats, scriptEventsHandler } from './config.js'

system.afterEvents.scriptEventReceive.subscribe((e) => {
    const event = scriptEventsHandler[e.id]
    if (event) event(e)
});

/**
 * Recalculates, stores, and applies all stat categories for a player.
 * 
 * @param {Entity} player The player to update.
 */
export function updatePlayerStats(player) {
    const playerData = calculateAllStats(player);

    // Guardar
    saveStatsToProperties(player, playerData);

    // Aplicar vanilla stats con eventos
    applyVanillaStatsViaEvents(player, playerData.stats);
}

/**
 * Applies vanilla stat events to a player based on the stat values.
 * Assumes each value maps to an event like: `minecraft:statNameValue`
 *
 * @param {Entity} player The player to apply stats to.
 * @param {Object} stats Object of statName → final value.
 */
function applyVanillaStatsViaEvents(player, stats) {
    let tickOffset = 0;

    vanillaEventStats.forEach(stat => {
        const value = stats[stat];
        if (value === undefined) return;

        const eventName = `minecraft:${stat}${value}`;
        system.runTimeout(() => {
            player.triggerEvent(eventName);
        }, tickOffset++);
    });

    vanillaStats.forEach(stat => {
        const value = stats[stat[0]];
        if (value === undefined) return;
        player.getComponent(`minecraft:${stat[1]}`).setCurrentValue((value / 100) * stat[2])
    });
}

/**
 * Saves all 5 stat categories to dynamic properties on the player.
 *
 * @param {Entity} player The target player entity.
 * @param {Object} playerData Object containing stats, passives, actives, and immunities.
 */
function saveStatsToProperties(player, playerData) {
    player.setDynamicProperty("dorios:playerData.stats", JSON.stringify(playerData.stats));
    player.setDynamicProperty("dorios:playerData.passives", JSON.stringify(playerData.passives));
    player.setDynamicProperty("dorios:playerData.actives", JSON.stringify(playerData.actives));
    player.setDynamicProperty("dorios:playerData.immunities", JSON.stringify(playerData.immunities));
}

/**
 * Loads a specific stat category from dynamic properties.
 *
 * @param {Entity} player The player entity to read from.
 * @param {string} category One of: "stats", "passives", "actives", "immunities".
 * @returns {Object} The parsed stat category, or empty object if not found.
 */
export function getStatCategory(player, category) {
    const valid = ["stats", "passives", "actives", "immunities"];
    if (!valid.includes(category)) return {};

    const raw = player.getDynamicProperty(`dorios:playerData.${category}`);
    return raw ? JSON.parse(raw) : {};
}

/**
 * Loads all five stat categories from the player's dynamic properties.
 * 
 * @param {Entity} player The player entity to retrieve stats from.
 * @returns {{
 *   stats: Object,
 *   passives: Object,
 *   actives: Object,
 *   immunities: Object
 * }}
 */
export function getAllStats(player) {
    const get = (key) => {
        const raw = player.getDynamicProperty(`dorios:playerData.${key}`);
        return raw ? JSON.parse(raw) : {};
    };

    return {
        stats: get("stats"),
        passives: get("passives"),
        actives: get("actives"),
        immunities: get("immunities")
    };
}


/**
 * Calculates all stat categories: stats, passives, actives, and immunities.
 * Applies clamping only to vanilla playerData. Other categories are purely additive.
 *
 * @param {Entity} entity The target entity.
 * @returns {{ stats: Object, passives: Object, actives: Object, immunities: string[] }}
 */
function calculateAllStats(entity) {
    const stats = {};
    const passives = {};
    const actives = {};
    const immunitiesSet = new Set(); // use Set to avoid duplicates
    const equippedTypeIds = [...entity.getTags()];

    for (const statName in statsConfig) {
        const { default: base, min, max, scale } = statsConfig[statName];
        let total = base + (stats[statName] ?? 0);

        equippedTypeIds.forEach(typeId => {
            const itemStats = data[typeId]?.stats;
            if (itemStats?.[statName] !== undefined) {
                total += itemStats[statName];
            }
        });

        if (min !== undefined && max !== undefined) {
            total = Math.min(Math.max(total, min), max);
        }

        if (scale) {
            total = scale * Math.floor(total / scale)
        }

        stats[statName] = total;
    }

    // Effects: passives and actives (additive)
    const effects = ["passives", "actives"]
    effects.forEach(key => {
        equippedTypeIds.forEach(typeId => {
            const effects = data[typeId]?.[key];
            if (!effects) return;

            const storage = key === "passives" ? passives : actives;

            for (const effect in effects) {
                storage[effect] = (storage[effect] ?? 0) + effects[effect];
            }
        });
    });

    // Immunities (array merge)
    equippedTypeIds.forEach(typeId => {
        const immunityList = data[typeId]?.immunities;
        if (Array.isArray(immunityList)) {
            immunityList.forEach(effect => immunitiesSet.add(effect));
        }
    });

    // Conflict resolution for passives and actives
    const conflicting = [
        ["poison", "regeneration"],
        ["weakness", "strength"],
        ["mining_fatigue", "haste"],
        ["slowness", "speed"]
    ];

    conflicting.forEach(([a, b]) => {
        [passives, actives].forEach(storage => {
            const aVal = storage[a] ?? 0;
            const bVal = storage[b] ?? 0;

            if (aVal > 0 || bVal > 0) {
                const diff = aVal - bVal;
                if (diff > 0) {
                    storage[a] = diff;
                    delete storage[b];
                } else if (diff < 0) {
                    storage[b] = -diff;
                    delete storage[a];
                } else {
                    delete storage[a];
                    delete storage[b];
                }
            }
        });
    });

    return {
        stats,
        passives,
        actives,
        immunities: [...immunitiesSet]
    };
}

function formatAllStats(player) {
    const playerData = getAllStats(player);
    if (!playerData) return "No player data available.";

    const { sections, formats } = statTexts;
    let output = "";

    // --- Main Stats ---
    output += `${sections.stats.title}\n${sections.stats.description}\n`;
    const keys = Object.keys(playerData.stats);
    if (keys.length > 0) {
        for (const key of Object.keys(statsConfig)) {
            const value = playerData.stats[key] ?? 0
            const label = formatStatName(key);
            const formatter = formats[key] ?? ((v) => formats.default(label, v));
            output += formatter(value) + "\n";
        }
    } else {
        output += sections.stats.empty + "\n";
    }

    // --- Passives ---
    output += `\n${sections.passives.title}\n${sections.passives.description}\n`;
    if (Object.keys(playerData.passives).length > 0) {
        for (const [effect, level] of Object.entries(playerData.passives)) {
            output += formats.passive(formatStatName(effect), level) + "\n";
        }
    } else {
        output += sections.passives.empty + "\n";
    }

    // --- Actives ---
    output += `\n${sections.actives.title}\n${sections.actives.description}\n`;
    if (Object.keys(playerData.actives).length > 0) {
        for (const [effect, level] of Object.entries(playerData.actives)) {
            output += formats.active(formatStatName(effect), level) + "\n";
        }
    } else {
        output += sections.actives.empty + "\n";
    }

    // --- Immunities ---
    output += `\n${sections.immunities.title}\n${sections.immunities.description}\n`;
    if (playerData.immunities?.length > 0) {
        for (const effect of playerData.immunities) {
            output += formats.immunity(formatStatName(effect)) + "\n";
        }
    } else {
        output += sections.immunities.empty + "\n";
    }

    return output;
}

function formatStatName(name) {
    return name
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim();
}

export function displayStats(player) {
    const text = formatAllStats(player)
    const form = new ActionFormData()
        .title('§6§lAll Stats:')
        .body(text)
    form.show(player)
}

