import { world, system, ItemStack, Block, Player, Entity } from "@minecraft/server";

export class ChestLootInjector {
    static PLACED_CHESTS_KEY = "dorios:placed_chests";
    static OPENED_CHESTS_KEY = "dorios:opened_chests";
    static REGION_SIZE = 256;

    /**
     * Registers a structure definition.
     * If the structure already exists, it is ignored.
     *
     * @param {string} id
     * @param {Object | string[]} definition
     */
    static registerStructure(id, definition) {
        if (this.structures[id]) return;

        this.structures[id] = definition;
    }

    /**
     * Loot tables applied when a structure is detected.
     */
    static structureLoot = {};

    /**
     * Base loot tables per biome.
     */
    static biomeLoot = {};

    /**
     * Structure detection definitions.
     *
     * - Array  → existence check (at least one block exists)
     * - Object → minimum required block counts
     *
     * Order matters: first match wins.
     */
    static structures = {
        "desert_pyramid": {
            "minecraft:chiseled_sandstone": 2,
            "minecraft:tnt": 2
        },
        "ruined_portal": [
            "minecraft:obsidian",
            "minecraft:netherrack"
        ],
        "buried_treasure": {
            "minecraft:sand": 2,
            "minecraft:sandstone": 2
        },
        "nether_fortress": {
            "minecraft:nether_brick": 2,
            "minecraft:nether_brick_fence": 1
        },
        "bastion": {
            "minecraft:blackstone": 4
        },
        "pillager_outpost": {
            "minecraft:dark_oak_log": 4,
            "minecraft:birch_planks": 4
        }
    };
    /**
     * Registers loot for a structure.
     * If loot already exists, it is merged.
     * Duplicate items keep the entry with higher chance.
     *
     * @param {string} structureId
     * @param {Array<{item:string, chance:number, conditions?:Object}>} loot
     */
    static registerStructureLoot(structureId, loot) {
        if (!this.structureLoot[structureId]) {
            this.structureLoot[structureId] = [...loot];
            return;
        }

        const existing = this.structureLoot[structureId];
        const map = new Map();

        // Existing loot
        for (const entry of existing) {
            map.set(entry.item, entry);
        }

        // New loot
        for (const entry of loot) {
            const prev = map.get(entry.item);
            if (!prev || entry.chance > prev.chance) {
                map.set(entry.item, entry);
            }
        }

        this.structureLoot[structureId] = Array.from(map.values());
    }

    /**
     * Registers loot for a biome.
     * If loot already exists, it is merged.
     * Duplicate items keep the entry with higher chance.
     *
     * @param {string} biomeId
     * @param {Array<{item:string, chance:number}>} loot
     */
    static registerBiomeLoot(biomeId, loot) {
        if (!this.biomeLoot[biomeId]) {
            this.biomeLoot[biomeId] = [...loot];
            return;
        }

        const existing = this.biomeLoot[biomeId];
        const map = new Map();

        // Existing loot
        for (const entry of existing) {
            map.set(entry.item, entry);
        }

        // New loot
        for (const entry of loot) {
            const prev = map.get(entry.item);
            if (!prev || entry.chance > prev.chance) {
                map.set(entry.item, entry);
            }
        }

        this.biomeLoot[biomeId] = Array.from(map.values());
    }

    /**
        * Builds a unique string key for a block position.
        *
        * @param {{x:number,y:number,z:number}} pos
        * @returns {string}
        */
    static posKey(pos) {
        return `${pos.x},${pos.y},${pos.z}`;
    }

    /**
     * Returns the macro-chunk region key for a position.
     *
     * @param {{x:number,z:number}} pos
     * @returns {string}
     */
    static regionKey(pos) {
        const rx = Math.floor(pos.x / this.REGION_SIZE);
        const rz = Math.floor(pos.z / this.REGION_SIZE);
        return `${rx},${rz}`;
    }

    /**
     * Builds the full dynamic property key for a region.
     *
     * @param {string} baseKey
     * @param {{x:number,z:number}} pos
     * @returns {string}
     */
    static regionPropertyKey(baseKey, pos) {
        return `${baseKey}:${this.regionKey(pos)}`;
    }

    /**
     * Retrieves a regional chest set.
     *
     * @param {string} baseKey
     * @param {{x:number,z:number}} pos
     * @returns {{[key: string]: 1}}
     */
    static getChestSet(baseKey, pos) {
        const key = this.regionPropertyKey(baseKey, pos);
        const raw = world.getDynamicProperty(key);
        return raw ? JSON.parse(raw) : {};
    }

    /**
     * Saves a regional chest set.
     *
     * @param {string} baseKey
     * @param {{x:number,z:number}} pos
     * @param {{[key: string]: 1}} set
     */
    static saveChestSet(baseKey, pos, set) {
        const key = this.regionPropertyKey(baseKey, pos);
        world.setDynamicProperty(key, JSON.stringify(set));
    }

    /**
     * Checks whether a chest is eligible for loot injection.
     *
     * Conditions:
     * - Must NOT be player-placed
     * - Must NOT have been opened before
     *
     * @param {Block} block
     * @returns {boolean}
     */
    static canInjectChest(block) {
        const pos = block.location;
        const key = this.posKey(pos);

        const placed = this.getChestSet(this.PLACED_CHESTS_KEY, pos);
        if (placed[key]) return false;

        const opened = this.getChestSet(this.OPENED_CHESTS_KEY, pos);
        if (opened[key]) return false;

        return true;
    }

    /**
     * Marks a chest as opened.
     *
     * @param {Block} block
     */
    static markChestOpened(block) {
        const pos = block.location;
        const key = this.posKey(pos);

        const opened = this.getChestSet(this.OPENED_CHESTS_KEY, pos);
        opened[key] = 1;

        this.saveChestSet(this.OPENED_CHESTS_KEY, pos, opened);
    }

    /**
     * Marks a chest as player-placed.
     *
     * @param {Block} block
     */
    static markChestPlaced(block) {
        const pos = block.location;
        const key = this.posKey(pos);

        const placed = this.getChestSet(this.PLACED_CHESTS_KEY, pos);
        placed[key] = 1;

        this.saveChestSet(this.PLACED_CHESTS_KEY, pos, placed);
    }

    /**
     * Resets all chest tracking data, including regional properties.
     *
     * WARNING:
     * - This clears ALL tracked chest data across the world.
     * - Intended for development, debugging, or admin commands only.
     */
    static resetChestTracking() {
        const ids = world.getDynamicPropertyIds();

        for (const id of ids) {
            if (
                id.startsWith(this.PLACED_CHESTS_KEY) ||
                id.startsWith(this.OPENED_CHESTS_KEY)
            ) {
                world.setDynamicProperty(id, undefined);
            }
        }

        console.warn("[Dorios RPG Core] All chest tracking data has been fully reset.");
    }

    /**
     * Detects nearby structures using a single area scan.
     *
     * Detection order:
     * 1. Chest cluster (>= 6 chests)
     * 2. First matching structure (order matters)
     * 3. "default"
     *
     * @param {Block} block
     * @param {number} radius
     * @returns {string}
     */
    static detectNearbyStructure(block, radius = 6) {
        const dim = block.dimension;
        const origin = block.location;

        /** @type {Map<string, number>} */
        const blockCount = new Map();

        let chestCount = 0;

        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dz = -radius; dz <= radius; dz++) {

                    const b = dim.getBlock({
                        x: origin.x + dx,
                        y: origin.y + dy,
                        z: origin.z + dz
                    });

                    if (!b) continue;

                    const id = b.typeId;

                    // Count blocks
                    blockCount.set(id, (blockCount.get(id) ?? 0) + 1);

                    // Count chests
                    if (id === "minecraft:chest") {
                        chestCount++;
                    }
                }
            }
        }

        if (chestCount >= 6) {
            return "chest_cluster";
        }

        for (const [structureId, requirement] of Object.entries(this.structures)) {

            // Case A: Array -> existence
            if (Array.isArray(requirement)) {
                if (requirement.every(blockId => blockCount.has(blockId))) {
                    return structureId;
                }
                continue;
            }

            // Case B: Object -> required counts
            let valid = true;

            for (const [blockId, requiredAmount] of Object.entries(requirement)) {
                if ((blockCount.get(blockId) ?? 0) < requiredAmount) {
                    valid = false;
                    break;
                }
            }

            if (valid) {
                return structureId;
            }
        }

        return "default";
    }

    /**
     * Merges biome and structure loot tables into a final loot table.
     *
     * Rules:
     * - Biome loot is always base
     * - Structure loot is additive
     * - Structure entries may have hard conditions
     * - Duplicate items sum chances
     *
     * @param {LootEntry[] | null} biomeTable
     * @param {LootEntry[] | null} structureTable
     * @param {{
     *   biomeId: string,
     *   dimensionId: string
     * }} context
     *
     * @returns {Map<string, number>}
     */
    static mergeLootTables(biomeTable, structureTable, context) {
        /** @type {Map<string, number>} */
        const finalLoot = new Map();

        // ── 1. Biome loot (base layer) ──────────────────
        if (biomeTable) {
            for (const entry of biomeTable) {
                finalLoot.set(
                    entry.item,
                    (finalLoot.get(entry.item) ?? 0) + entry.chance
                );
            }
        }

        // ── 2. Structure loot (conditional layer) ───────
        if (structureTable) {
            for (const entry of structureTable) {

                const cond = entry.conditions;
                if (cond) {
                    if (cond.dimension && cond.dimension != context.dimensionId) continue;
                    if (cond.biomes && !cond.biomes.includes(context.biomeId)) continue;
                }

                finalLoot.set(
                    entry.item,
                    (finalLoot.get(entry.item) ?? 0) + entry.chance
                );
            }
        }

        return finalLoot;
    }

    static REPLACEABLE_ITEMS = new Set([
        "minecraft:rotten_flesh",
        "minecraft:bone",
        "minecraft:string",
        "minecraft:gunpowder",
        "minecraft:gold_nugget",
        "minecraft:iron_nugget",
        "minecraft:coal",
        "minecraft:bread",
        "minecraft:wheat"
    ]);

    /**
     * Builds initial slot pools for injection.
     *
     * @param {import("@minecraft/server").Container} container
     * @returns {{ empty: number[], replaceable: number[] }}
     */
    static getSlotPools(container) {
        const empty = [];
        const replaceable = [];

        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);

            if (!item) {
                empty.push(i);
            } else if (this.REPLACEABLE_ITEMS.has(item.typeId)) {
                replaceable.push(i);
            }
        }

        return { empty, replaceable };
    }

    /**
     * Injects loot into a chest container using random slots.
     *
     * Rules:
     * - Slots are consumed once used
     * - Empty slots are always preferred
     * - Replaceable slots are used only if no empty slots remain
     */
    static injectLoot(lootTable, block) {
        if (!lootTable || lootTable.size === 0) return;

        const container =
            block.getComponent("minecraft:inventory")?.container;

        if (!container) return;

        const { empty, replaceable } = this.getSlotPools(container);

        for (const [itemId, chance] of lootTable) {
            if (Math.random() > chance) continue;

            let pool;

            if (empty.length > 0) {
                pool = empty;
            } else if (replaceable.length > 0) {
                pool = replaceable;
            } else {
                break; // No slots left
            }

            const index = Math.floor(Math.random() * pool.length);
            const slot = pool[index];

            // Remove slot from pool so it can't be reused
            pool.splice(index, 1);

            container.setItem(slot, new ItemStack(itemId, 1));
        }
    }

    /**
     * Resolves, injects loot, and finalizes a chest interaction.
     *
     * This is the single entry point for chest loot injection.
     *
     * @param {Block} block Chest block
     */
    static resolve(block) {
        if (!this.canInjectChest(block)) return;

        const dimension = block.dimension;
        const dimensionId = dimension.id;
        // Biome is resolved from block position
        const biomeId = dimension.getBiome(block.location).id;
        // Structure detection (single scan)
        const structureId = this.detectNearbyStructure(block);
        // world.sendMessage(`${biomeId} ${structureId}`)

        // Obtain loot tables
        const biomeTable = this.biomeLoot[biomeId] ?? null;
        const structureTable = this.structureLoot[structureId] ?? null;

        // Merge loot tables
        const finalLoot = this.mergeLootTables(
            biomeTable,
            structureTable,
            {
                biomeId,
                dimensionId
            }
        );

        // Mark chest as opened
        this.markChestOpened(block);

        if (finalLoot.size === 0) return;

        // Inject loot
        this.injectLoot(finalLoot, block);
    }

    /**
     * Registers loot tables from a trinket definition.
     *
     * @param {string} trinketId
     * @param {Object} trinketData
     */
    static registerTrinketLoot(trinketId, trinketData) {
        const loot = trinketData.loot;
        if (!loot) return;

        // ── Biome loot ──────────────────────────────────
        if (Array.isArray(loot.biomes)) {
            for (const entry of loot.biomes) {
                if (!entry.biome || typeof entry.chance !== "number") continue;

                this.registerBiomeLoot(entry.biome, [
                    {
                        item: trinketId,
                        chance: entry.chance
                    }
                ]);
            }
        }

        // ── Structure loot ──────────────────────────────
        if (Array.isArray(loot.structures)) {
            for (const entry of loot.structures) {
                if (!entry.structure || typeof entry.chance !== "number") continue;

                this.registerStructureLoot(entry.structure, [
                    {
                        item: trinketId,
                        chance: entry.chance,
                        conditions: entry.conditions
                    }
                ]);
            }
        }
    }

    /**
     * Returns true if a chest position is already marked (placed or opened).
     *
     * @param {{x:number,y:number,z:number}} pos
     * @returns {boolean}
     */
    static isChestMarkedAt(pos) {
        const key = this.posKey(pos);

        const placed = this.getChestSet(this.PLACED_CHESTS_KEY, pos);
        if (placed[key]) return true;

        const opened = this.getChestSet(this.OPENED_CHESTS_KEY, pos);
        if (opened[key]) return true;

        return false;
    }

    /**
     * Marks a position as player-placed (no loot should ever be injected here).
     *
     * @param {{x:number,y:number,z:number}} pos
     */
    static markPosPlaced(pos) {
        const key = this.posKey(pos);

        const placed = this.getChestSet(this.PLACED_CHESTS_KEY, pos);
        placed[key] = 1;

        this.saveChestSet(this.PLACED_CHESTS_KEY, pos, placed);
    }

    /**
     * Offsets a position by a vector * amount.
     *
     * @param {{x:number,y:number,z:number}} pos
     * @param {{x:number,y:number,z:number}} vec
     * @param {number} amount
     */
    static offsetPos(pos, vec, amount = 1) {
        return {
            x: pos.x + vec.x * amount,
            y: pos.y + vec.y * amount,
            z: pos.z + vec.z * amount
        };
    }
}

world.afterEvents.playerInteractWithBlock.subscribe(({ block }) => {
    if (block.typeId !== "minecraft:chest") return;
    ChestLootInjector.resolve(block);
});

world.afterEvents.playerPlaceBlock.subscribe(({ block }) => {
    if (block.typeId !== "minecraft:chest") return;
    ChestLootInjector.markChestPlaced(block);
});

world.afterEvents.pistonActivate.subscribe(e => {
    const { piston, isExpanding, dimension } = e;

    // Locations affected (works even when getAttachedBlocks() is bugged)
    const locations = piston.getAttachedBlocksLocations();
    if (!locations || locations.length === 0) return;

    // Facing direction -> vector
    const facing = piston.block.permutation.getState("facing_direction");
    const dirVec = getDirectionVector(facing);

    // Expand: blocks move +dirVec
    // Retract (sticky): blocks move -dirVec
    const step = isExpanding ? -1 : 1;

    for (const pos of locations) {
        // Solo nos importa si esa posición ya estaba marcada (explotable)
        if (!ChestLootInjector.isChestMarkedAt(pos)) continue;

        // Marcar la posición original también (por seguridad)
        ChestLootInjector.markPosPlaced(pos);

        // Posición destino del bloque movido
        const destPos = ChestLootInjector.offsetPos(pos, dirVec, step);
        // world.sendMessage(`${JSON.stringify(destPos)}`)

        // Marcar el destino como placed también
        ChestLootInjector.markPosPlaced(destPos);
    }
});

/**
 * Converts piston facing direction to a vector.
 *
 * @param {number} dir
 * @returns {{x:number,y:number,z:number}}
 */
function getDirectionVector(dir) {
    switch (dir) {
        case 0: return { x: 0, y: -1, z: 0 }; // down
        case 1: return { x: 0, y: 1, z: 0 };  // up
        case 2: return { x: 0, y: 0, z: -1 }; // north
        case 3: return { x: 0, y: 0, z: 1 };  // south
        case 4: return { x: -1, y: 0, z: 0 }; // west
        case 5: return { x: 1, y: 0, z: 0 };  // east
        default: return { x: 0, y: 0, z: 0 };
    }
}


export class MobLootInjector {
    /**
     * Mob-based loot table.
     * Indexed by entity type id.
     *
     * Example:
     * {
     *   "minecraft:zombie": [
     *     {
     *       item: "dorios:rotten_heart",
     *       amount: 1,
     *       chance: 0.05,
     *       conditions: {}
     *     }
     *   ]
     * }
     *
     * @type {Object<string, {
     *   item: string,
     *   amount: number,
     *   chance: number,
     *   conditions?: Object
     * }[]>}
     */
    static entityDrops = {};

    /**
     * Resolves and spawns custom drops for a dead entity based on configured rules.
     *
     * This method:
     * - Looks up drop definitions using the entity's `typeId`
     * - Evaluates optional conditions (e.g. dimension restrictions)
     * - Applies probabilistic drop chances
     * - Attempts to spawn drops at the dead entity's location
     * - Falls back to spawning at the player location if the entity context fails
     *
     * @static
     *
     * @param {Entity} deadEntity
     * The entity that has died and is the source of the drops.
     *
     * @param {Player} player
     * The player associated with the kill (used as a fallback spawn location).
     *
     * @returns {void}
     */
    static resolve(deadEntity, player) {
        const drops = this.entityDrops[deadEntity.typeId];
        if (!drops) return;

        drops.forEach(drop => {
            const conditions = drop.conditions
            if (conditions) {
                if (conditions.dimension && conditions.dimension != deadEntity?.dimension?.id) return
            };
            if (Math.random() <= drop.chance) {
                try {
                    deadEntity.dimension.spawnItem(new ItemStack(drop.item, drop.amount), deadEntity.location);
                } catch {
                    player.dimension.spawnItem(new ItemStack(drop.item, drop.amount), player.location);
                }
            }
        });
    }

    /**
     * Registers loot tables from a trinket definition.
     *
     * @param {string} trinketId
     * @param {Object} trinketData
     */
    static registerTrinketDrop(trinketId, trinketData) {
        if (!trinketData.drops) return;

        for (const drop of trinketData.drops) {
            const entity = drop.entity;
            if (!this.entityDrops[entity]) this.entityDrops[entity] = [];

            this.entityDrops[entity].push({
                item: trinketId,
                amount: drop.amount ?? 1,
                chance: drop.chance ?? 0.10,
                conditions: drop.conditions
            });
        }
    }

}

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
    const player = damageSource?.damagingEntity;
    if (!player || player.typeId !== 'minecraft:player') return;
    MobLootInjector.resolve(deadEntity, player)
});