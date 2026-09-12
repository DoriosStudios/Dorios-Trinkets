import { world, system, BlockPermutation } from '@minecraft/server'

world.afterEvents.entityDie.subscribe(({ damageSource, deadEntity }) => {
    const player = damageSource.damagingEntity
    if (!player?.isValid || player.typeId != 'minecraft:player') return

    if (player.hasTag("dorios:bloodbound_emblem")) {
        player.addEffect('strength', 100, { amplifier: 0 })
    }
})

const freq = 1
let count = 0
world.afterEvents.worldLoad.subscribe(() => {
    system.runInterval(() => {
        const players = world.getAllPlayers()
        count += freq
        if (count >= 1000) count = 0

        for (const player of players) {
            if (!player.isValid) continue;
            if (!player.hasTag("dorios:rush_of_fear")) {
                player.removeTag("dorios:rush_of_fear_tag");
            }
            let blocks = {}
            try {
                blocks = {
                    head: player.dimension.getBlock(player.getHeadLocation()),
                    feet: player.dimension.getBlock(player.location)
                }
            } catch { continue }
            const isInLava = blocks.feet?.typeId.includes('lava') &&
                blocks.head?.typeId.includes('lava')

            if (player.hasTag("dorios:idle_bloom")) {
                const vel = player.getVelocity()
                const isMoving = vel.x === 0 && vel.y === 0 && vel.z === 0
                let idleTicks = player.getDynamicProperty("dorios:idle_ticks") ?? 0

                if (isMoving) {
                    idleTicks += freq
                    if (idleTicks >= 60) {
                        player.addTag("dorios:idle_bloom_tag")
                    }
                } else {
                    idleTicks = 0
                    player.removeTag("dorios:idle_bloom_tag")
                }

                player.setDynamicProperty("dorios:idle_ticks", idleTicks)
            } else player.removeTag("dorios:idle_bloom_tag")

            if (player.hasTag("dorios:tideforged_carapace") && player.isInWater) {
                player.addTag("dorios:tideforged_carapace_tag")
            } else player.removeTag("dorios:tideforged_carapace_tag")

            if (player.hasTag("dorios:obsidian_skull")) {
                if (isInLava) {
                    player.removeTag("dorios:obsidian_skull_tag")
                } else player.addTag("dorios:obsidian_skull_tag")
            } else player.removeTag("dorios:obsidian_skull_tag")

            if (player.hasTag("dorios:abyssal_essence") && player.isInWater) {
                player.addTag("dorios:abyssal_essence_tag")
            } else player.removeTag("dorios:abyssal_essence_tag")

            // --- Lava Waders: flotar y solidificar 3x3 sobre lava ---
            if (player.hasTag("dorios:lava_waders")) {
                handleLavaWaders(player)
            }

            if (player.hasTag("dorios:strong_celestial_ring")) {
                if (player.isSneaking) {
                    player.addTag("dorios:strong_celestial_ring_tag")
                } else {
                    player.removeTag("dorios:strong_celestial_ring_tag")
                }
            } else {
                player.removeTag("dorios:strong_celestial_ring_tag")
            }

            if (player.hasTag("dorios:abyssal_sun_amulet") && player.isInWater) {
                player.addTag("dorios:abyssal_sun_amulet_tag")
            } else player.removeTag("dorios:abyssal_sun_amulet_tag")


            if (count % 20 != 0) continue
            // world.sendMessage(`${player.dimension.getBiome(player.location).id}`)
            const rushSeconds = player.getDynamicProperty("dorios:rush_of_fear_time") ?? 0;
            const remaining = player.hasTag("dorios:rush_of_fear") ? Math.max(0, rushSeconds - 1) : 0;
            if (rushSeconds !== remaining) player.setDynamicProperty("dorios:rush_of_fear_time", remaining);
            if (remaining === 0) player.removeTag("dorios:rush_of_fear_tag");

            if (player.hasTag("dorios:mender_pendant")) {
                repair(player, "all")
            }
            if (player.hasTag("dorios:repair_talis")) {
                repair(player, ["Mainhand"])
            }
        }
    }, freq)
})

world.beforeEvents.entityHurt.subscribe(event => {
    const { hurtEntity, damageSource } = event;
    const attacker = damageSource.damagingEntity;
    const cause = damageSource.cause;
    if (event.cancel || event.damage <= 0 || !attacker?.isValid || !hurtEntity?.isValid) return;
    if (cause === 'thorns' || cause === 'override') return;

    const playerAttack = attacker.typeId === 'minecraft:player';
    const melee = playerAttack && cause === 'entityAttack';
    const projectile = playerAttack && cause === 'projectile';
    const frost = projectile && attacker.hasTag('dorios:frost_quiver');
    const molten = projectile && attacker.hasTag('dorios:molten_quiver');
    const venom = projectile && attacker.hasTag('dorios:venom_quiver');
    const breeze = melee && attacker.hasTag('dorios:strong_breeze_ring');
    const echo = melee && attacker.hasTag('dorios:strong_echo_ring');
    const rush = hurtEntity.typeId === 'minecraft:player' && hurtEntity.hasTag('dorios:rush_of_fear');
    const baseDamage = event.damage;

    if (melee && attacker.hasTag('dorios:holy_cross')
        && hurtEntity.getComponent('type_family')?.hasTypeFamily('undead')) {
        event.damage += baseDamage * 0.50;
    }

    // Echo remains a delayed hit; its cause excludes it from offensive bonuses.
    if (echo) {
        system.runTimeout(() => {
            if (!hurtEntity.isValid || !attacker.isValid) return;
            hurtEntity.applyDamage(baseDamage * 0.25, { cause: 'thorns', damagingEntity: attacker });
        }, 20);
    }
    if (!frost && !molten && !venom && !breeze && !rush) return;
    system.run(() => {
        if (!attacker.isValid || !hurtEntity.isValid) return;
        if (frost) hurtEntity.addEffect('slowness', 100, { amplifier: 0 });
        if (molten) hurtEntity.setOnFire(5);
        if (venom) hurtEntity.addEffect('poison', 100, { amplifier: 0 });
        if (breeze) {
            hurtEntity.dimension.spawnParticle('minecraft:wind_explosion_emitter', hurtEntity.location);
            const dx = hurtEntity.location.x - attacker.location.x;
            const dz = hurtEntity.location.z - attacker.location.z;
            const magnitude = (Math.sqrt(dx * dx + dz * dz) || 1) * 2;
            hurtEntity.applyKnockback({ x: dx / magnitude, z: dz / magnitude }, 0.8);
        }
        if (rush && hurtEntity.hasTag('dorios:rush_of_fear')) {
            hurtEntity.addTag('dorios:rush_of_fear_tag');
            hurtEntity.setDynamicProperty('dorios:rush_of_fear_time', 3);
        }
    });
});

/**
 * Freeze nearby lava at foot level, following Helpful Items' Lava Boots pattern.
 * Native block ticks handle melting; each block retains its original liquid depth.
 */
function handleLavaWaders(player) {
    const dimension = player.dimension;
    const { x, y, z } = player.location;
    const baseX = Math.floor(x);
    const baseZ = Math.floor(z);
    const feetY = Math.floor(y);
    const radius = 2;

    for (const blockY of [feetY, feetY - 1]) {
        if (blockY < dimension.heightRange.min || blockY >= dimension.heightRange.max) continue;
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                if (dx * dx + dz * dz > radius * radius) continue;
                const location = { x: baseX + dx, y: blockY, z: baseZ + dz };
                if (!dimension.isChunkLoaded(location)) continue;
                const block = dimension.getBlock(location);
                if (!block) continue;

                if (block.typeId === 'minecraft:lava') {
                    const depth = block.permutation.getState('liquid_depth') ?? 0;
                    const typeId = depth === 0 ? 'dorios:lava_solid_0' : 'dorios:lava_flow_0';
                    block.setPermutation(BlockPermutation.resolve(typeId, { 'dorios:liquid_depth': depth }));
                } else if (/^dorios:lava_(solid|flow)_[12]$/.test(block.typeId)) {
                    const depth = block.permutation.getState('dorios:liquid_depth');
                    block.setPermutation(BlockPermutation.resolve(block.typeId.slice(0, -1) + '0', {
                        'dorios:liquid_depth': depth,
                    }));
                }
            }
        }
    }
}

/**
 * Repairs durability on equipped items for the given slots.
 *
 * Behavior:
 * - If targets is "all", repairs all standard slots.
 * - If targets is an array, repairs only those slots.
 * - If targets is empty/omitted, repairs "Mainhand" only.
 *
 * @param {Player} player Player to repair
 * @param {("Mainhand"|"Offhand"|"Head"|"Chest"|"Legs"|"Feet")[]|"all"} [targets] Target slots to repair or "all"
 *
 * @example
 * // Repair only mainhand and offhand
 * repair(player, ["Mainhand", "Offhand"])
 *
 * @example
 * // Repair everything
 * repair(player, "all")
 *
 * @example
 * // Default behavior (Mainhand only)
 * repair(player)
 */
function repair(player, targets) {
    const equippable = player.getComponent('equippable')
    if (!equippable) return

    /** @type {("Mainhand"|"Offhand"|"Head"|"Chest"|"Legs"|"Feet")[]} */
    const ALL_SLOTS = ['Mainhand', 'Offhand', 'Head', 'Chest', 'Legs', 'Feet']

    // Build slot list based on targets
    let slots
    if (targets === 'all') {
        slots = ALL_SLOTS
    } else if (Array.isArray(targets) && targets.length > 0) {
        slots = targets.filter(s => ALL_SLOTS.includes(s))
    } else {
        // default behavior: only Mainhand
        slots = ['Mainhand']
    }

    for (const slot of slots) {
        const item = equippable.getEquipment(slot)
        if (!item) continue

        if (!item.hasComponent('minecraft:durability')) continue
        const durability = item.getComponent('minecraft:durability')
        if (!durability) continue

        if (typeof durability.damage === 'number' && durability.damage > 0) {
            durability.damage = Math.max(durability.damage - 1, 0)
            equippable.setEquipment(slot, item)
        }
    }
}

