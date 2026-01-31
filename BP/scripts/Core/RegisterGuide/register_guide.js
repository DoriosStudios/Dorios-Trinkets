/*
=====================================================
Dorios RPG Core – Registration & Initialization Guide
=====================================================

This file demonstrates the complete and correct way to:
- Register items, trinkets, weapons, armor, and tags
- Detect Dorios RPG Core safely
- Understand available trinket slots
- Know which statistics can be modified
- Define immunities correctly

All comments are informational only.
The code can be used directly as a reference.

-----------------------------------------------------

-----------------------------------------------------
Available Trinket Slots
-----------------------------------------------------
These are the valid slot identifiers that can be used
in the `trinket` field when registering trinkets.

Example:
trinket: "ring"

- "head",
- "body",
- "feet",
- "necklace",
- "ring",
- "charm",
- "talisman",
- "gauntlet",
- "heartycharm",
- "doll",
- "witherring",
- "archaiccharm",
- "amulet"

-----------------------------------------------------
Available Statistics
-----------------------------------------------------
These are the base statistics supported by Dorios RPG Core.
They are NOT configurable by addons.
Addons only provide modifiers (positive or negative values).

Internal clamping and validation is handled by the core.
Only Health, Knockback Resistance, and Damage Reduction
have enforced limits internally.

- health: "Maximum health value",
- mana: "Mana resource used for abilities",
- attack: "Flat attack damage bonus",
- attackMulti: "Percentage-based damage multiplier",
- knockback: "Knockback applied to enemies on hit",
- knockbackRes: "Resistance to incoming knockback",
- damageReduction: "Percentage damage mitigation (negative increases damage taken)",
- speed: "Ground movement speed",
- waterSpeed: "Movement speed while in water",
- lavaSpeed: "Movement speed while in lava",
- healthRegen: "Passive health regeneration",
- lifeSteal: "Health restored based on damage dealt",
- manaRegen: "Passive mana regeneration",
- manaSteal: "Mana restored based on damage dealt",
- critMulti: "Critical hit damage multiplier",
- critChance: "Chance to trigger a critical hit",
- thorns: "Reflects damage back to attackers",
- fireAspect: "Applies fire damage on hit",
- extraJumps: "Grants additional mid-air jumps"

-----------------------------------------------------
Immunities
-----------------------------------------------------
Immunities prevent specific effects from being applied
to the player while the item is equipped.

IMPORTANT:
Effect names in `immunities` MUST start with
an uppercase first letter.

Correct:
immunities: ["Poison", "Wither"]

Incorrect:
immunities: ["poison", "wither"]

-----------------------------------------------------
Registration Data
-----------------------------------------------------
All content is registered using a single object.
The `trinket` field is optional and only required
if the item occupies a trinket slot.
*/

const register = {
    // Full-feature reference example
    "dorios:example_master_trinket": {
        trinket: "ring",
        stats: {
            health: 10,
            attack: 2,
            attackMulti: 5,
            critChance: 5,
            critMulti: 25,
            speed: 20,
            waterSpeed: 40,
            fireAspect: 3,
            lifeSteal: 5,
            manaRegen: 3,
            extraJumps: 1
        },
        passives: {
            regeneration: 1,
            night_vision: 1
        },
        actives: {
            poison: 1,
            slowness: 1
        },
        immunities: [
            "Poison",
            "Wither"
        ],
        drops: [
            { entity: "minecraft:zombie", chance: 0.05 },
            { entity: "minecraft:skeleton", chance: 0.03 }
        ],
        loot: {
            biomes: [
                { biome: "minecraft:forest", chance: 0.20 },
                { biome: "minecraft:plains", chance: 0.15 }
            ],
            structures: [
                { structure: "desert_pyramid", chance: 0.10 },
                {
                    structure: "default",
                    chance: 0.05,
                    conditions: { dimension: "minecraft:overworld" }
                }
            ]
        }
    },

    // Normal item / armor / weapon (no trinket slot)
    "dorios:warrior_helmet": {
        stats: {
            health: 4,
            attack: 1
        }
    },

    // Tag-based registration
    "dorios:example_tag_effect": {
        passives: {
            resistance: 1
        }
    }
};

// -----------------------------------------------------
// Registration & Dependency Detection
// -----------------------------------------------------

let rpgCoreDetected = false;

world.afterEvents.worldLoad.subscribe(() => {

    // Send registration payload to Dorios RPG Core
    system.sendScriptEvent(
        "dorios:register_stat_data",
        JSON.stringify(register)
    );

    // Delayed verification in case the core is missing
    system.runTimeout(() => {
        if (!rpgCoreDetected) {
            world.sendMessage(
                "§c[Addon Name] Required dependency missing: Dorios RPG Core."
            );

            system.runTimeout(() => {
                if (!rpgCoreDetected) {
                    world.sendMessage(
                        "§c[Addon Name] Required dependency missing: Dorios RPG Core."
                    );
                }
            }, 3600);
        }
    }, 300);
});

// -----------------------------------------------------
// Confirmation Listener
// -----------------------------------------------------

system.afterEvents.scriptEventReceive.subscribe(e => {
    if (e.id !== "dorios:stat_data_registered" || rpgCoreDetected) return;

    try {
        const data = JSON.parse(e.message);
        if (data?.registered === true) {
            rpgCoreDetected = true;

            system.runTimeout(() => {
                world.sendMessage(
                    "§a[Addon Name] Dorios RPG Core initialized successfully."
                );
            }, 300);
        }
    } catch {
        // Ignore malformed responses
    }
});
