import { updatePlayerStats } from './stats_manager.js'
import { displayStats } from './stats_manager.js'
import { clearGlobalImmuneEffects } from './trinkets_inv.js'
import { ChestLootInjector, MobLootInjector } from './loot_injector.js'
import { world, system } from "@minecraft/server";

export let data = {};

export const vanillaStats = [
    ["speed", "movement", 0.1],
    ["waterSpeed", "underwater_movement", 0.02],
    ["lavaSpeed", "lava_movement", 0.01]
]
export const vanillaEventStats = ["health", "knockbackRes", "damageReduction"]
export const manaBarFrames = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];

export const slots = {
    head: 0,
    body: 1,
    feet: 2,
    necklace: 3,
    ring: 4,
    charm: 5,
    talisman: 6,
    gauntlet: 7,
    heartycharm: 8,
    doll: 9,
    witherring: 10,
    archaiccharm: 11,
    amulet: 12
};

export const statsConfig = {
    health: { default: 20, min: 2, max: 100, scale: 2 }, // Scale 2: 2,4,6,...
    mana: { default: 100 },
    attack: { default: 0 },
    attackMulti: { default: 0 },
    knockback: { default: 0 },
    knockbackRes: { default: 0, min: 0, max: 100, scale: 1 }, // Scale 1: 1,2,3,...
    damageReduction: { default: 0, min: -100, max: 100, scale: 1 }, // Scale 1: 1,2,3,... (Negative means it receives more damage -100 => x2)
    speed: { default: 100 },
    waterSpeed: { default: 100 },
    lavaSpeed: { default: 100 },
    healthRegen: { default: 0 },
    lifeSteal: { default: 0 },
    manaRegen: { default: 5 },
    manaSteal: { default: 0 },
    critMulti: { default: 25 },
    critChance: { default: 5 },
    thorns: { default: 0 },
    fireAspect: { default: 0 },
    extraJumps: { default: 0 },
};

export const statTexts = {
    title: '§6§lAll Stats:',
    sections: {
        stats: {
            title: "§e§lStats:§r",
            description: "§7These attributes modify your core abilities.",
            empty: "§8- None",
        },
        passives: {
            title: "§a§lPassive Effects:§r",
            description: "§7These effects are always active on you.",
            empty: "§8- None",
        },
        actives: {
            title: "§c§lActive Effects:§r",
            description: "§7These effects are applied by you to enemies.",
            empty: "§8- None",
        },
        immunities: {
            title: "§d§lImmunities:§r",
            description: "§7You are immune to the following effects.",
            empty: "§8- None",
        }
    },

    formats: {
        // Individual stat formatters
        health: value => `§7- Max Health: §f${value / 2}`,
        mana: value => `§7- Max Mana: §f${value}`,
        attack: value => `§7- Bonus Damage: §f${value}`,
        attackMulti: value => `§7- Attack Multiplier: §f${value}%%`,
        knockback: value => `§7- Knockback: §f${value}`,
        knockbackRes: value => `§7- Knockback Resistance: §f${value}%%`,
        damageReduction: value => `§7- Damage Reduction: §f${value}%%`,
        speed: value => `§7- Movement Speed: §f${value}%%`,
        waterSpeed: value => `§7- Water Speed: §f${value}%%`,
        lavaSpeed: value => `§7- Lava Speed: §f${value}%%`,
        healthRegen: value => `§7- Health Regen: §f${value}/s`,
        lifeSteal: value => `§7- Life Steal: §f${value}%%`,
        manaRegen: value => `§7- Mana Regen: §f${value}/s`,
        manaSteal: value => `§7- Mana Steal: §f${value}%%`,
        critMulti: value => `§7- Critical Multiplier: §f${value}%%`,
        critChance: value => `§7- Critical Chance: §f${value}%%`,
        thorns: value => `§7- Thorns: §f${value}%%`,
        fireAspect: value => `§7- Fire Aspect: §f${value}s`,
        extraJumps: value => `§7- Extra Jumps: §f${value}`,

        // Other categories
        passive: (label, value) => `§7- ${label}: §f${value}`,
        active: (label, value) => `§7- ${label}: §f${value}`,
        immunity: label => `§7- §f${label}`,

        // Fallback
        default: (label, value) => `§7- ${label}: §f${value}`,
    }
};

export const scriptEventsHandler = {
    "dorios:register_stat_data": e => {
        try {
            const payload = JSON.parse(e.message);
            const newData = payload

            if (!newData || typeof newData !== "object") {
                console.warn("[Dorios RPG Core] Invalid payload format:", e.message);
                return;
            }

            for (const [id, config] of Object.entries(newData)) {
                if (!config || typeof config !== "object") {
                    console.warn(`[Dorios RPG Core] Skipping invalid config for '${id}':`, config);
                    continue;
                }

                data[id] = config;

                if (config.loot) {
                    ChestLootInjector.registerTrinketLoot(id, config)
                }

                if (config.drops) {
                    MobLootInjector.registerTrinketDrop(id, config)
                }
            }

            system.sendScriptEvent(
                "dorios:stat_data_registered",
                JSON.stringify({ registered: true })
            );
        } catch (err) {
            system.sendScriptEvent(
                "dorios:stat_data_registered",
                JSON.stringify({ registered: false })
            );
            console.warn("[Dorios RPG Core] JSON parse failed:", err, e.message);
        }
    },
    "dorios:update_stats": e => {
        updatePlayerStats(e.sourceEntity)
    },
    "dorios:update_effects": e => {
        clearGlobalImmuneEffects(e.sourceEntity)
    },
    "dorios:print_data": e => {
        DoriosAPI.utils.printJSON(e.sourceEntity, 'Data', data)
    },
    "dorios:display_stats": e => {
        displayStats(e.sourceEntity)
    },
    "dorios:reset_chest_tracking": e => {
        ChestLootInjector.resetChestTracking()
    }
}