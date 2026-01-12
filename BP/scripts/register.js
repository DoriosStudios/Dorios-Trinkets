import { world, system, BlockPermutation } from '@minecraft/server'

let rpgCoreDetected = false;

world.afterEvents.worldLoad.subscribe(() => {
    for (const [key, value] of Object.entries(trinkets)) {
        const payload = {};
        payload[key] = value;

        system.sendScriptEvent("dorios:register_stat_data", JSON.stringify(payload));
    }

    system.runTimeout(() => {
        if (!rpgCoreDetected) {
            world.sendMessage(
                "§c[Dorios Trinkets] Required dependency missing: Dorios RPG Core.\n" +
                "§7Please download it from §eCurseForge §7or §eMCPEDL§7."
            );
            system.runTimeout(() => {
                if (!rpgCoreDetected) {
                    world.sendMessage(
                        "§c[Dorios Trinkets] Required dependency missing: Dorios RPG Core.\n" +
                        "§7Please download it from §eCurseForge §7or §eMCPEDL§7."
                    );
                }
            }, 3600);
        }
    }, 300);
})

system.afterEvents.scriptEventReceive.subscribe(e => {
    if (e.id !== "dorios:stat_data_registered" || rpgCoreDetected) return;

    try {
        const data = JSON.parse(e.message);
        if (data?.registered == true) {
            rpgCoreDetected = true;
            system.runTimeout(() => {

                world.sendMessage(
                    "§a[Dorios Trinkets] Dorios RPG Core initialized successfully."
                );
            }, 300);
        }
    } catch { }
});


const trinkets = {
    head: {
        "dorios:abyssal_diver_helmet": { // Obtained in ocean chests, deep more chance and also drowned
            trinket: "head",
            stats: {
                waterSpeed: 20
            },
            passives: {
                water_breathing: 1
            },
            drops: [
                {
                    entity: "minecraft:drowned",
                    chance: 0.05
                }
            ],
            loot: {
                biomes: [
                    { biome: "minecraft:beach", chance: 0.15 },
                    { biome: "minecraft:ocean", chance: 0.15 },
                    { biome: "minecraft:cold_ocean", chance: 0.15 },
                    { biome: "minecraft:lukewarm_ocean", chance: 0.15 },
                    { biome: "minecraft:deep_ocean", chance: 0.30 },
                    { biome: "minecraft:deep_cold_ocean", chance: 0.30 },
                    { biome: "minecraft:deep_lukewarm_ocean", chance: 0.30 }
                ]
            }

        },
        "dorios:broken_paladin_helmet": {
            trinket: "head",
            stats: {
                attack: 1
            },
            loot: {
                structures: [
                    {
                        structure: "bastion",
                        chance: 0.30
                    },
                    {
                        structure: "nether_fortress",
                        chance: 0.20
                    }
                ]
            }
        },
        "dorios:night_vision_goggles": {
            trinket: "head",
            passives: {
                night_vision: 1
            },
            drops: [
                {
                    entity: "minecraft:phantom",
                    chance: 0.10
                }
            ]
        },
        "dorios:night_vision_mask": {
            trinket: "head",
            passives: {
                night_vision: 1
            },
            immunities: ['Darkness', 'Blindness'],
            drops: [
                {
                    entity: "minecraft:warden",
                    chance: 0.25
                }
            ]
        },
        "dorios:restored_paladin_helmet": {
            trinket: "head",
            stats: {
                attack: 3
            },
            loot: {
                structures: [
                    {
                        structure: "bastion",
                        chance: 0.12
                    },
                    {
                        structure: "nether_fortress",
                        chance: 0.08
                    }
                ]
            }
        }
    },
    heartyCharm: {
        "dorios:bloodstained_heart": {
            trinket: "heartycharm",
            stats: {
                health: 8
            },
            loot: {
                structures: [
                    {
                        structure: "bastion",
                        chance: 0.15
                    }
                ]
            }
        },
        "dorios:dragon_heart": {
            trinket: "heartycharm",
            stats: {
                health: 20,
                attack: 2
            },
            passives: {
                regeneration: 1
            },
            drops: [
                {
                    entity: "minecraft:ender_dragon",
                    chance: 0.25
                }
            ],
            loot: {
                structures: [
                    {
                        structure: "default",
                        chance: 0.01,
                        conditions: {
                            dimension: "minecraft:the_end" // TEST
                        }
                    }
                ]
            }
        },
        "dorios:black_heart": {
            trinket: "heartycharm",
            stats: {
                health: 6
            },
            drops: [
                {
                    entity: "minecraft:enderman",
                    chance: 0.10
                }
            ],
            loot: {
                structures: [
                    {
                        structure: "default",
                        chance: 0.15,
                        conditions: {
                            dimension: "minecraft:the_end" // TEST
                        }
                    }
                ]
            }
        },
        "dorios:candy_heart": {
            trinket: "heartycharm",
            stats: {
                health: 4
            },
            drops: [
                {
                    entity: "minecraft:witch",
                    chance: 0.05
                }
            ]
        },
        "dorios:eternal_heart": {
            trinket: "heartycharm",
            stats: {
                health: 8
            },
            immunities: ['Poison', 'Wither', 'Hunger'],
            drops: [
                {
                    entity: "minecraft:wither",
                    chance: 0.50
                }
            ]
        },
        "dorios:immaculate_heart": {
            trinket: "heartycharm",
            stats: {
                health: 10,
                attack: 1
            },
            loot: {
                structures: [
                    {
                        structure: "desert_pyramid",
                        chance: 0.15
                    }
                ]
            }
        },
        "dorios:rotten_heart": {
            trinket: "heartycharm",
            stats: {
                health: 2
            },
            drops: [
                {
                    entity: "minecraft:zombie",
                    chance: 0.05
                }
            ]
        },
        "dorios:sacred_heart": {
            trinket: "heartycharm",
            stats: {
                health: 20
            },
            passives: {
                regeneration: 1
            },
            loot: {
                structures: [
                    {
                        structure: "desert_pyramid",
                        chance: 0.05
                    }
                ]
            }
        },
        "dorios:soul_heart": {
            trinket: "heartycharm",
            stats: {
                health: 8
            },
            immunities: ['Darkness'],
            drops: [
                {
                    entity: "minecraft:warden",
                    chance: 0.50
                }
            ]
        },
        "dorios:warden_heart": { // Crafteado usando el soul heart
            trinket: "heartycharm",
            stats: {
                health: 16
            },
            immunities: ['Darkness', 'Blindness']
        },
        "dorios:wither_heart": {
            trinket: "heartycharm",
            stats: {
                health: 16
            },
            passives: {
                regeneration: 1
            },
            immunities: ['Wither'],
            drops: [
                {
                    entity: "minecraft:wither",
                    chance: 0.20
                }
            ]
        },
        "dorios:tideforged_heart": {
            trinket: "heartycharm",
            stats: {
                health: 4
            },
            loot: {
                biomes: [
                    { biome: "minecraft:beach", chance: 0.15 },
                    { biome: "minecraft:ocean", chance: 0.15 },
                    { biome: "minecraft:cold_ocean", chance: 0.15 },
                    { biome: "minecraft:lukewarm_ocean", chance: 0.15 },
                    { biome: "minecraft:deep_ocean", chance: 0.30 },
                    { biome: "minecraft:deep_cold_ocean", chance: 0.30 },
                    { biome: "minecraft:deep_lukewarm_ocean", chance: 0.30 }
                ]
            }
        }
    },
    body: {
        "dorios:bloodbound_emblem": { // Strength 1 after killing an entity
            trinket: "body",
            drops: [
                {
                    entity: "minecraft:wither_skeleton",
                    chance: 0.05
                }
            ],
            loot: {
                structures: [
                    {
                        structure: "bastion",
                        chance: 0.25
                    },
                    {
                        structure: "nether_fortress",
                        chance: 0.15
                    }
                ]
            }
        },
        "dorios:frost_quiver": { // Inflicts slowness I for 5 seconds when shot an entity
            trinket: "body",
            drops: [
                {
                    entity: "minecraft:stray",
                    chance: 0.10
                }
            ]
        },
        "dorios:idle_bloom": {
            trinket: "body",
            loot: {
                biomes: [
                    { biome: "minecraft:jungle", chance: 0.40 },
                    { biome: "minecraft:jungle_hills", chance: 0.40 },
                    { biome: "minecraft:jungle_edge", chance: 0.40 },
                    { biome: "minecraft:jungle_edge_mutated", chance: 0.40 },
                    { biome: "minecraft:jungle_mutated", chance: 0.40 },
                    { biome: "minecraft:bamboo_jungle", chance: 0.40 },
                    { biome: "minecraft:bamboo_jungle_hills", chance: 0.40 }
                ]
            }
        },
        "dorios:idle_bloom_tag": { // Tag of Idle Bloom, gives effects when still over 3 seconds
            passives: {
                regeneration: 2
            }
        },
        "dorios:molten_quiver": { // Inflicts fire for 5 seconds when shot an entity
            trinket: "body",
            drops: [
                {
                    entity: "minecraft:skeleton",
                    chance: 0.05,
                    conditions: {
                        dimension: "minecraft:nether"
                    }
                    // condition: (entity) =>
                    //     entity.dimension.id === "minecraft:nether"
                }
            ]
        },
        "dorios:tideforged_carapace": {
            trinket: "body",
            drops: [
                {
                    entity: "minecraft:guardian",
                    chance: 0.25
                }
            ]
        },
        "dorios:tideforged_carapace_tag": { // Tag of Tideforged Carapace, gives effects when underwater
            passives: {
                resistance: 1
            }
        },
        "dorios:venom_quiver": { // Inflicts venom for 5 seconds when shot an entity
            trinket: "body",
            drops: [
                {
                    entity: "minecraft:bogged",
                    chance: 0.10
                }
            ]
        },
    },
    gauntlet: {
        "dorios:fire_claw": {
            trinket: "gauntlet",
            stats: {
                attack: 2,
                fireAspect: 3
            },
            loot: {
                structures: [
                    {
                        structure: "bastion",
                        chance: 0.25
                    },
                    {
                        structure: "nether_fortress",
                        chance: 0.15
                    }
                ]
            }
        },
        "dorios:fire_gauntlet": {
            trinket: "gauntlet",
            stats: {
                fireAspect: 3
            },
            loot: {
                structures: [
                    {
                        structure: "bastion",
                        chance: 0.30
                    },
                    {
                        structure: "nether_fortress",
                        chance: 0.20
                    }
                ]
            }
        },
        "dorios:ice_claw": {
            trinket: "gauntlet",
            stats: {
                attack: 2
            },
            actives: {
                slowness: 1
            },
            drops: [
                {
                    entity: "minecraft:stray",
                    chance: 0.05
                }
            ]
        },
        "dorios:ice_gauntlet": {
            trinket: "gauntlet",
            actives: {
                slowness: 1
            },
            drops: [
                {
                    entity: "minecraft:stray",
                    chance: 0.10
                }
            ]
        },
        "dorios:venom_claw": {
            trinket: "gauntlet",
            stats: {
                attack: 2
            },
            actives: {
                poison: 1
            },
            drops: [
                {
                    entity: "minecraft:cave_spider",
                    chance: 0.05
                }
            ]
        },
        "dorios:venom_gauntlet": {
            trinket: "gauntlet",
            actives: {
                poison: 1
            },
            drops: [
                {
                    entity: "minecraft:cave_spider",
                    chance: 0.10
                }
            ]
        },
        "dorios:tideforged_knuckles": {
            trinket: "gauntlet",
            stats: {
                attack: 1
            },
            drops: [
                {
                    entity: "minecraft:guardian",
                    chance: 0.15
                },
                {
                    entity: "minecraft:elder_guardian",
                    chance: 0.60
                }
            ]
        }
    },
    charm: {
        "dorios:abyssal_orb": {
            trinket: "charm",
            stats: {
                waterSpeed: 100
            },
            passives: {
                conduit_power: 1
            },
            loot: {
                biomes: [
                    { biome: "minecraft:ocean", chance: 0.05 },
                    { biome: "minecraft:cold_ocean", chance: 0.05 },
                    { biome: "minecraft:lukewarm_ocean", chance: 0.05 },
                    { biome: "minecraft:deep_ocean", chance: 0.10 },
                    { biome: "minecraft:deep_cold_ocean", chance: 0.10 },
                    { biome: "minecraft:deep_lukewarm_ocean", chance: 0.10 }
                ]
            }
        },
        "dorios:dead_abyssal_orb": {
            trinket: "charm",
            stats: {
                waterSpeed: 30
            },
            loot: {
                biomes: [
                    { biome: "minecraft:beach", chance: 0.20 },
                    { biome: "minecraft:ocean", chance: 0.20 },
                    { biome: "minecraft:cold_ocean", chance: 0.20 },
                    { biome: "minecraft:lukewarm_ocean", chance: 0.20 },
                    { biome: "minecraft:deep_ocean", chance: 0.40 },
                    { biome: "minecraft:deep_cold_ocean", chance: 0.40 },
                    { biome: "minecraft:deep_lukewarm_ocean", chance: 0.40 }
                ]
            }
        },
        "dorios:bloodtide_chalice": {
            trinket: "charm",
            stats: {
                lifeSteal: 10
            },
            loot: {
                structures: [
                    {
                        structure: "bastion",
                        chance: 0.15
                    },
                    {
                        structure: "nether_fortress",
                        chance: 0.05
                    }
                ]
            }
        },
        "dorios:obsidian_skull": { // Crafted
            trinket: "charm",
            loot: {
                structures: [
                    {
                        structure: "ruined_portal",
                        chance: 0.15
                    }
                ]
            }
        },
        "dorios:obsidian_skull_tag": { // Tag of Obsidian Skull, stop giving effect when touching lava
            passives: {
                fire_resistance: 1
            }
        },
        "dorios:purity_blossom": {
            trinket: "charm",
            immunities: ['Poison'],
            drops: [
                {
                    entity: "minecraft:witch",
                    chance: 0.05
                }
            ],
            loot: {
                biomes: [
                    { biome: "minecraft:jungle", chance: 0.25 },
                    { biome: "minecraft:jungle_hills", chance: 0.25 },
                    { biome: "minecraft:jungle_edge", chance: 0.25 },
                    { biome: "minecraft:jungle_edge_mutated", chance: 0.25 },
                    { biome: "minecraft:jungle_mutated", chance: 0.25 },
                    { biome: "minecraft:bamboo_jungle", chance: 0.25 },
                    { biome: "minecraft:bamboo_jungle_hills", chance: 0.25 }
                ]
            }
        },
        "dorios:tideforged_stars": {
            trinket: "charm",
            stats: {
                waterSpeed: 50
            },
            drops: [
                {
                    entity: "minecraft:guardian",
                    chance: 0.05
                },
                {
                    entity: "minecraft:elder_guardian",
                    chance: 0.25
                }
            ],
            loot: {
                biomes: [
                    { biome: "minecraft:beach", chance: 0.15 },
                    { biome: "minecraft:ocean", chance: 0.15 },
                    { biome: "minecraft:cold_ocean", chance: 0.15 },
                    { biome: "minecraft:lukewarm_ocean", chance: 0.15 },
                    { biome: "minecraft:deep_ocean", chance: 0.30 },
                    { biome: "minecraft:deep_cold_ocean", chance: 0.30 },
                    { biome: "minecraft:deep_lukewarm_ocean", chance: 0.30 }
                ]
            }
        }
    },
    archaicCharm: {
        "dorios:blood_pact": {
            trinket: "archaiccharm",
            stats: {
                health: -20,
                lifeSteal: 12
            },
            immunities: ['Regeneration'],
            drops: [
                {
                    entity: "minecraft:piglin_brute",
                    chance: 0.025
                }
            ],
            loot: {
                structures: [
                    {
                        structure: "bastion",
                        chance: 0.10
                    },
                    {
                        structure: "nether_fortress",
                        chance: 0.025
                    }
                ]
            }
        },
        "dorios:abyssal_essence": {
            trinket: "archaiccharm",
            stats: {
                waterSpeed: 200
            },
            passives: {
                conduit_power: 1
            },
            drops: [
                {
                    entity: "minecraft:guardian",
                    chance: 0.025
                },
                {
                    entity: "minecraft:elder_guardian",
                    chance: 0.15
                }
            ],
            loot: {
                biomes: [
                    { biome: "minecraft:deep_ocean", chance: 0.05 },
                    { biome: "minecraft:deep_cold_ocean", chance: 0.05 },
                    { biome: "minecraft:deep_lukewarm_ocean", chance: 0.05 }
                ]
            }
        },
        "dorios:abyssal_essence_tag": { // Tag of Abyssal Essence, gives effects when underwater
            trinket: "archaiccharm",
            passives: {
                strength: 1
            }
        }
    },
    doll: {
        "dorios:voodoo": {
            trinket: "doll",
            stats: {
                thorns: 10
            },
            drops: [
                {
                    entity: "minecraft:witch",
                    chance: 0.05
                }
            ]
        }
    },
    feet: {
        "dorios:cloud_steps_boots": {
            trinket: "feet",
            stats: {
                speed: 30,
                extraJumps: 1
            },
            drops: [
                {
                    entity: "minecraft:phantom",
                    chance: 0.05
                }
            ],
            loot: {
                biomes: [
                    { biome: "minecraft:jungle", chance: 0.25 },
                    { biome: "minecraft:jungle_hills", chance: 0.25 },
                    { biome: "minecraft:jungle_edge", chance: 0.25 },
                    { biome: "minecraft:jungle_edge_mutated", chance: 0.25 },
                    { biome: "minecraft:jungle_mutated", chance: 0.25 },
                    { biome: "minecraft:bamboo_jungle", chance: 0.25 },
                    { biome: "minecraft:bamboo_jungle_hills", chance: 0.25 }
                ]
            }
        },
        "dorios:lava_waders": { // Allows the user to walk over lava
            trinket: "feet",
            stats: {
                speed: 20
            },
            drops: [
                {
                    entity: "minecraft:strider",
                    chance: 0.05
                }
            ],
            loot: {
                structures: [
                    {
                        structure: "ruined_portal",
                        chance: 0.15
                    }
                ]
            }
        }
    },
    rings: {
        "dorios:guardian_ring": {
            trinket: "ring",
            passives: {
                resistance: 1
            },
            drops: [
                {
                    entity: "minecraft:guardian",
                    chance: 0.05
                },
                {
                    entity: "minecraft:elder_guardian",
                    chance: 0.25
                }
            ]
        },
        "dorios:healer_ring": {
            trinket: "ring",
            passives: {
                regeneration: 1
            },
            drops: [
                {
                    entity: "minecraft:witch",
                    chance: 0.10
                }
            ]
        },
        "dorios:miner_ring": {
            trinket: "ring",
            passives: {
                haste: 1
            },
            loot: {
                biomes: [
                    { biome: "minecraft:jungle", chance: 0.25 },
                    { biome: "minecraft:jungle_hills", chance: 0.25 },
                    { biome: "minecraft:jungle_edge", chance: 0.25 },
                    { biome: "minecraft:jungle_edge_mutated", chance: 0.25 },
                    { biome: "minecraft:jungle_mutated", chance: 0.25 },
                    { biome: "minecraft:bamboo_jungle", chance: 0.25 },
                    { biome: "minecraft:bamboo_jungle_hills", chance: 0.25 }
                ],
                structures: [
                    {
                        structure: "desert_pyramid",
                        chance: 0.15
                    },
                    {
                        structure: "pillager_outpost",
                        chance: 0.30
                    }
                ]
            }
        },
        "dorios:runner_ring": {
            trinket: "ring",
            passives: {
                speed: 1
            },
            loot: {
                biomes: [
                    { biome: "minecraft:jungle", chance: 0.25 },
                    { biome: "minecraft:jungle_hills", chance: 0.25 },
                    { biome: "minecraft:jungle_edge", chance: 0.25 },
                    { biome: "minecraft:jungle_edge_mutated", chance: 0.25 },
                    { biome: "minecraft:jungle_mutated", chance: 0.25 },
                    { biome: "minecraft:bamboo_jungle", chance: 0.25 },
                    { biome: "minecraft:bamboo_jungle_hills", chance: 0.25 }
                ],
                structures: [
                    {
                        structure: "desert_pyramid",
                        chance: 0.15
                    },
                    {
                        structure: "pillager_outpost",
                        chance: 0.30
                    }
                ]
            }
        },
        "dorios:warrior_ring": {
            trinket: "ring",
            stats: {
                attack: 2
            },
            drops: [
                {
                    entity: "minecraft:vindicator",
                    chance: 0.15
                }
            ]
        },
        "dorios:tideforged_ring": {
            trinket: "ring",
            stats: {
                waterSpeed: 30
            },
            drops: [
                {
                    entity: "minecraft:guardian",
                    chance: 0.05
                },
                {
                    entity: "minecraft:elder_guardian",
                    chance: 0.25
                }
            ],
            loot: {
                biomes: [
                    { biome: "minecraft:beach", chance: 0.20 },
                    { biome: "minecraft:ocean", chance: 0.20 },
                    { biome: "minecraft:cold_ocean", chance: 0.20 },
                    { biome: "minecraft:lukewarm_ocean", chance: 0.20 },
                    { biome: "minecraft:deep_ocean", chance: 0.40 },
                    { biome: "minecraft:deep_cold_ocean", chance: 0.40 },
                    { biome: "minecraft:deep_lukewarm_ocean", chance: 0.40 }
                ]
            }
        }
    },
    witherrings: {
        "dorios:heavy_guardian_ring": {
            trinket: "witherring",
            passives: {
                resistance: 1
            },
            loot: {
                biomes: [
                    { biome: "minecraft:jungle", chance: 0.15 },
                    { biome: "minecraft:jungle_hills", chance: 0.15 },
                    { biome: "minecraft:jungle_edge", chance: 0.15 },
                    { biome: "minecraft:jungle_edge_mutated", chance: 0.15 },
                    { biome: "minecraft:jungle_mutated", chance: 0.15 },
                    { biome: "minecraft:bamboo_jungle", chance: 0.15 },
                    { biome: "minecraft:bamboo_jungle_hills", chance: 0.15 }
                ],
                structures: [
                    {
                        structure: "desert_pyramid",
                        chance: 0.05
                    }
                ]
            }
        },
        "dorios:heavy_healer_ring": {
            trinket: "witherring",
            passives: {
                regeneration: 1
            },
            loot: {
                biomes: [
                    { biome: "minecraft:jungle", chance: 0.15 },
                    { biome: "minecraft:jungle_hills", chance: 0.15 },
                    { biome: "minecraft:jungle_edge", chance: 0.15 },
                    { biome: "minecraft:jungle_edge_mutated", chance: 0.15 },
                    { biome: "minecraft:jungle_mutated", chance: 0.15 },
                    { biome: "minecraft:bamboo_jungle", chance: 0.15 },
                    { biome: "minecraft:bamboo_jungle_hills", chance: 0.15 }
                ],
                structures: [
                    {
                        structure: "desert_pyramid",
                        chance: 0.05
                    }
                ]
            }
        },
        "dorios:heavy_miner_ring": {
            trinket: "witherring",
            passives: {
                haste: 1
            },
            loot: {
                biomes: [
                    { biome: "minecraft:jungle", chance: 0.15 },
                    { biome: "minecraft:jungle_hills", chance: 0.15 },
                    { biome: "minecraft:jungle_edge", chance: 0.15 },
                    { biome: "minecraft:jungle_edge_mutated", chance: 0.15 },
                    { biome: "minecraft:jungle_mutated", chance: 0.15 },
                    { biome: "minecraft:bamboo_jungle", chance: 0.15 },
                    { biome: "minecraft:bamboo_jungle_hills", chance: 0.15 }
                ],
                structures: [
                    {
                        structure: "desert_pyramid",
                        chance: 0.05
                    }
                ]
            }
        },
        "dorios:heavy_runner_ring": {
            trinket: "witherring",
            passives: {
                speed: 1
            },
            loot: {
                biomes: [
                    { biome: "minecraft:jungle", chance: 0.15 },
                    { biome: "minecraft:jungle_hills", chance: 0.15 },
                    { biome: "minecraft:jungle_edge", chance: 0.15 },
                    { biome: "minecraft:jungle_edge_mutated", chance: 0.15 },
                    { biome: "minecraft:jungle_mutated", chance: 0.15 },
                    { biome: "minecraft:bamboo_jungle", chance: 0.15 },
                    { biome: "minecraft:bamboo_jungle_hills", chance: 0.15 }
                ],
                structures: [
                    {
                        structure: "desert_pyramid",
                        chance: 0.05
                    }
                ]
            }
        },
        "dorios:heavy_warrior_ring": {
            trinket: "witherring",
            passives: {
                strength: 1
            },
            drops: [
                {
                    entity: "minecraft:piglin_brute",
                    chance: 0.05
                }
            ]
        },
        "dorios:strong_abyssal_ring": {
            trinket: "witherring",
            stats: {
                waterSpeed: 50
            },
            passives: {
                regeneration: 1
            },
            drops: [
                {
                    entity: "minecraft:guardian",
                    chance: 0.05
                },
                {
                    entity: "minecraft:elder_guardian",
                    chance: 0.25
                }
            ]
        },
        "dorios:strong_ancient_ring": {
            trinket: "witherring",
            stats: {
                attack: 2,
                health: 4,
                speed: 10
            },
            loot: {
                biomes: [
                    { biome: "minecraft:jungle", chance: 0.25 },
                    { biome: "minecraft:jungle_hills", chance: 0.25 },
                    { biome: "minecraft:jungle_edge", chance: 0.25 },
                    { biome: "minecraft:jungle_edge_mutated", chance: 0.25 },
                    { biome: "minecraft:jungle_mutated", chance: 0.25 },
                    { biome: "minecraft:bamboo_jungle", chance: 0.25 },
                    { biome: "minecraft:bamboo_jungle_hills", chance: 0.25 }
                ]
            }
        },
        "dorios:strong_blood_ring": {
            trinket: "witherring",
            stats: {
                attack: 2
            },
            drops: [
                {
                    entity: "minecraft:piglin_brute",
                    chance: 0.10
                }
            ],
            loot: {
                structures: [
                    {
                        structure: "bastion",
                        chance: 0.15
                    },
                    {
                        structure: "nether_fortress",
                        chance: 0.05
                    }
                ]
            }
        },
        "dorios:strong_breeze_ring": { // Elevates the enemy into the air
            trinket: "witherring",
            stats: {
                attack: 3
            },
            drops: [
                {
                    entity: "minecraft:breeze",
                    chance: 0.10
                }
            ]
        },
        "dorios:strong_brute_ring": {
            trinket: "witherring",
            stats: {
                attack: 4
            },
            passives: {
                strength: 1
            },
            drops: [
                {
                    entity: "minecraft:piglin_brute",
                    chance: 0.10
                }
            ]
        },
        "dorios:strong_celestial_ring": {
            trinket: "witherring",
            stats: {
                extraJumps: 2
            },
            drops: [
                {
                    entity: "minecraft:vex",
                    chance: 0.05
                }
            ],
            loot: {
                structures: [
                    {
                        structure: "default",
                        chance: 0.15,
                        conditions: {
                            dimension: "minecraft:the_end" // TEST
                        }
                    }
                ]
            }
        },
        "dorios:strong_celestial_ring_tag": { // Gives effect when sneaking
            trinket: "witherring",
            passives: {
                slow_falling: 1
            }
        },
        "dorios:strong_echo_ring": { // Does a second hit a second later with 25% of the original damage
            trinket: "witherring",
            drops: [
                {
                    entity: "minecraft:warden",
                    chance: 0.15
                }
            ],
            loot: {
                structures: [
                    {
                        structure: "default",
                        chance: 0.05,
                        conditions: {
                            dimension: "minecraft:the_end" // TEST
                        }
                    }
                ]
            }
        },
        "dorios:strong_ender_ring": {
            trinket: "witherring",
            stats: {
                attack: 2
            },
            drops: [
                {
                    entity: "minecraft:enderman",
                    chance: 0.05
                }
            ],
            loot: {
                structures: [
                    {
                        structure: "default",
                        chance: 0.05,
                        conditions: {
                            dimension: "minecraft:the_end" // TEST
                        }
                    }
                ]
            }
        },
        "dorios:strong_fortress_ring": {
            trinket: "witherring",
            stats: {
                attack: 2
            },
            passives: {
                resistance: 1,
                fire_resistance: 1
            },
            drops: [
                {
                    entity: "minecraft:wither_skeleton",
                    chance: 0.05
                }
            ]
        },
        "dorios:strong_inferno_ring": {
            trinket: "witherring",
            stats: {
                attack: 4,
                fireAspect: 5
            },
            passives: {
                fire_resistance: 1
            },
            drops: [
                {
                    entity: "minecraft:piglin_brute",
                    chance: 0.05
                }
            ]
        },
        "dorios:strong_jade_ring": {
            trinket: "witherring",
            stats: {
                health: 10
            },
            passives: {
                regeneration: 1
            },
            immunities: ['Regeneration'],
            loot: {
                biomes: [
                    { biome: "minecraft:jungle", chance: 0.20 },
                    { biome: "minecraft:jungle_hills", chance: 0.20 },
                    { biome: "minecraft:jungle_edge", chance: 0.20 },
                    { biome: "minecraft:jungle_edge_mutated", chance: 0.20 },
                    { biome: "minecraft:jungle_mutated", chance: 0.20 },
                    { biome: "minecraft:bamboo_jungle", chance: 0.20 },
                    { biome: "minecraft:bamboo_jungle_hills", chance: 0.20 }
                ]
            }
        },
        "dorios:strong_shulker_ring": {
            trinket: "witherring",
            stats: {
                attack: 1
            },
            actives: {
                levitation: 1
            },
            drops: [
                {
                    entity: "minecraft:shulker",
                    chance: 0.10
                }
            ],
            loot: {
                structures: [
                    {
                        structure: "default",
                        chance: 0.15,
                        conditions: {
                            dimension: "minecraft:the_end" // TEST
                        }
                    }
                ]
            }
        },
        "dorios:strong_trader_ring": {
            trinket: "witherring",
            passives: {
                village_hero: 2
            },
            drops: [
                {
                    entity: "minecraft:pillager",
                    chance: 0.05
                }
            ],
            loot: {
                biomes: [
                    { biome: "minecraft:jungle", chance: 0.25 },
                    { biome: "minecraft:jungle_hills", chance: 0.25 },
                    { biome: "minecraft:jungle_edge", chance: 0.25 },
                    { biome: "minecraft:jungle_edge_mutated", chance: 0.25 },
                    { biome: "minecraft:jungle_mutated", chance: 0.25 },
                    { biome: "minecraft:bamboo_jungle", chance: 0.25 },
                    { biome: "minecraft:bamboo_jungle_hills", chance: 0.25 }
                ],
                structures: [
                    {
                        structure: "desert_pyramid",
                        chance: 0.15
                    },
                    {
                        structure: "pillager_outpost",
                        chance: 0.30
                    }
                ]
            }
        }
    },
    amulet: {
        "dorios:abyssal_sun_amulet": {
            trinket: "amulet",
            stats: {
                waterSpeed: 100
            },
            drops: [
                {
                    entity: "minecraft:guardian",
                    chance: 0.05
                }
            ],
            loot: {
                structures: [
                    {
                        structure: "default",
                        chance: 0.15,
                        conditions: {
                            dimension: "minecraft:the_end" // TEST
                        }
                    }
                ]
            }
        },
        "dorios:abyssal_sun_amulet_tag": {
            trinket: "amulet",
            passives: {
                regeneration: 1
            }
        },
        "dorios:blazing_amulet": {
            trinket: "amulet",
            stats: {
                fireAspect: 5
            },
            drops: [
                {
                    entity: "minecraft:blaze",
                    chance: 0.05
                }
            ],
            loot: {
                structures: [
                    {
                        structure: "ruined_portal",
                        chance: 0.15
                    }
                ]
            }
        },
        "dorios:bloodbound_amulet": {
            trinket: "amulet",
            stats: {
                health: 6,
                lifeSteal: 6
            },
            drops: [
                {
                    entity: "minecraft:piglin_brute",
                    chance: 0.05
                }
            ]
        }
    },
    talisman: {
        "dorios:abyssal_clam_shell": {
            trinket: "talisman",
            stats: {
                waterSpeed: 50
            },
            drops: [
                {
                    entity: "minecraft:drowned",
                    chance: 0.05
                }
            ]
        },
        "dorios:bloodgem": {
            trinket: "talisman",
            stats: {
                lifeSteal: 4
            },
            loot: {
                structures: [
                    {
                        structure: "bastion",
                        chance: 0.20
                    },
                    {
                        structure: "nether_fortress",
                        chance: 0.10
                    }
                ]
            }
        },
        "dorios:holy_cross": {
            trinket: "talisman",
            drops: [
                {
                    entity: "evocation_illager",
                    chance: 0.05
                }
            ]
        },
        "dorios:tideforged_eye": {
            trinket: "talisman",
            passives: {
                conduit_power: 1
            },
            drops: [
                {
                    entity: "minecraft:drowned",
                    chance: 0.05
                }
            ]
        },

    },
    necklace: {
        "dorios:blazed_heart_necklace": {
            trinket: "necklace",
            stats: {
                health: 4
            },
            drops: [
                {
                    entity: "minecraft:blaze",
                    chance: 0.05
                }
            ]
        },
        "dorios:blood_pendant": {
            trinket: "necklace",
            stats: {
                health: 4,
                lifeSteal: 2
            },
            drops: [
                {
                    entity: "minecraft:piglin_brute",
                    chance: 0.05
                }
            ]
        },
        "dorios:mender_pendant": {
            trinket: "necklace",
            loot: {
                biomes: [
                    { biome: "minecraft:jungle", chance: 0.15 },
                    { biome: "minecraft:jungle_hills", chance: 0.15 },
                    { biome: "minecraft:jungle_edge", chance: 0.15 },
                    { biome: "minecraft:jungle_edge_mutated", chance: 0.15 },
                    { biome: "minecraft:jungle_mutated", chance: 0.15 },
                    { biome: "minecraft:bamboo_jungle", chance: 0.15 },
                    { biome: "minecraft:bamboo_jungle_hills", chance: 0.15 }
                ],
                structures: [
                    {
                        structure: "desert_pyramid",
                        chance: 0.05
                    },
                    {
                        structure: "default",
                        chance: 0.15,
                        conditions: {
                            dimension: "minecraft:the_end" // TEST
                        }
                    }
                ]
            }
        },
        "dorios:rabbit_rush": {
            trinket: "necklace",
            stats: {
                speed: 20
            },
            drops: [
                {
                    entity: "minecraft:rabbit",
                    chance: 0.05
                }
            ],
            loot: {
                biomes: [
                    { biome: "minecraft:jungle", chance: 0.25 },
                    { biome: "minecraft:jungle_hills", chance: 0.25 },
                    { biome: "minecraft:jungle_edge", chance: 0.25 },
                    { biome: "minecraft:jungle_edge_mutated", chance: 0.25 },
                    { biome: "minecraft:jungle_mutated", chance: 0.25 },
                    { biome: "minecraft:bamboo_jungle", chance: 0.25 },
                    { biome: "minecraft:bamboo_jungle_hills", chance: 0.25 }
                ],
                structures: [
                    {
                        structure: "desert_pyramid",
                        chance: 0.15
                    },
                    {
                        structure: "pillager_outpost",
                        chance: 0.30
                    }
                ]
            }
        },
        "dorios:repair_talis": {
            trinket: "necklace",
            loot: {
                biomes: [
                    { biome: "minecraft:jungle", chance: 0.30 },
                    { biome: "minecraft:jungle_hills", chance: 0.30 },
                    { biome: "minecraft:jungle_edge", chance: 0.30 },
                    { biome: "minecraft:jungle_edge_mutated", chance: 0.30 },
                    { biome: "minecraft:jungle_mutated", chance: 0.30 },
                    { biome: "minecraft:bamboo_jungle", chance: 0.30 },
                    { biome: "minecraft:bamboo_jungle_hills", chance: 0.30 }
                ],
                structures: [
                    {
                        structure: "desert_pyramid",
                        chance: 0.10
                    },
                    {
                        structure: "pillager_outpost",
                        chance: 0.05
                    }
                ]
            }
        },
        "dorios:rush_of_fear": {
            trinket: "necklace",
            stats: {
                health: 4
            },
            loot: {
                biomes: [
                    { biome: "minecraft:jungle", chance: 0.25 },
                    { biome: "minecraft:jungle_hills", chance: 0.25 },
                    { biome: "minecraft:jungle_edge", chance: 0.25 },
                    { biome: "minecraft:jungle_edge_mutated", chance: 0.25 },
                    { biome: "minecraft:jungle_mutated", chance: 0.25 },
                    { biome: "minecraft:bamboo_jungle", chance: 0.25 },
                    { biome: "minecraft:bamboo_jungle_hills", chance: 0.25 }
                ],
                structures: [
                    {
                        structure: "desert_pyramid",
                        chance: 0.15
                    }
                ]
            }
        },
        "dorios:rush_of_fear_tag": {
            trinket: "necklace",
            stats: {
                speed: 100
            }
        },
        "dorios:tideforged_pendant": {
            trinket: "necklace",
            stats: {
                waterSpeed: 20
            },
            drops: [
                {
                    entity: "minecraft:drowned",
                    chance: 0.05
                }
            ],
            loot: {
                biomes: [
                    { biome: "minecraft:beach", chance: 0.20 },
                    { biome: "minecraft:ocean", chance: 0.20 },
                    { biome: "minecraft:cold_ocean", chance: 0.20 },
                    { biome: "minecraft:lukewarm_ocean", chance: 0.20 },
                    { biome: "minecraft:deep_ocean", chance: 0.40 },
                    { biome: "minecraft:deep_cold_ocean", chance: 0.40 },
                    { biome: "minecraft:deep_lukewarm_ocean", chance: 0.40 }
                ]
            }
        }
    }
}