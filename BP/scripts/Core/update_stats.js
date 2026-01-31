import { system, world, ItemStack } from '@minecraft/server'
import { updatePlayerStats, getStatCategory } from './stats_manager.js'
import { trinketTick } from './trinkets_inv.js'
import { manaBarFrames } from './config.js'

const previousEquipmentMap = new Map();
const intervalMap = new Map();

world.afterEvents.playerSpawn.subscribe(e => { updateData(e.player); });
world.afterEvents.playerHotbarSelectedSlotChange.subscribe(e => updatePlayerStats(e.player))

world.afterEvents.worldLoad.subscribe(() => {
    system.runTimeout(() => {
        world.getDimension('overworld').runCommand('scoreboard objectives add dorios:mana dummy Mana')
        for (const player of world.getPlayers()) {
            const id = player.id;
            if (!intervalMap.has(id)) {
                updateData(player);
            }
        }
    }, 20);
});

world.beforeEvents.effectAdd.subscribe(e => {
    const { effectType, entity } = e
    if (entity.typeId != 'minecraft:player') return
    const immunities = getStatCategory(entity, "immunities")
    immunities.forEach(effect => {
        if (effectType.includes(effect)) e.cancel = true
    })
})

/**
 * Converts equipment and tags into a single string for comparison.
 */
function equipmentAndTagsString(player) {
    const equipment = player.getEquipment();
    const equipmentStr = ['Head', 'Chest', 'Legs', 'Feet', 'Mainhand', 'Offhand']
        .map(slot => equipment?.[slot]?.typeId ?? 'none')
        .join('|');

    const tagsStr = player.getTags().join('|');

    return `${equipmentStr}:${tagsStr}`;
}

function manaDisplay(manaScore, player, stats) {
    let scoreId = player.scoreboardIdentity
    if (scoreId != undefined) {
        let mana = manaScore.getScore(scoreId);
        if (mana < 0 || mana == NaN || mana == undefined) mana = 0
        const maxMana = stats.mana;
        const regen = Math.min(stats.manaRegen / 5, maxMana - mana)
        mana += regen
        manaScore.setScore(scoreId, mana || 0);
        const percentage = mana / maxMana;
        const frameIndex = Math.floor(percentage * (manaBarFrames.length - 1));
        const bar = manaBarFrames[frameIndex];
        try {
            if (player.getGameMode() == 'Survival') {
                player.onScreenDisplay.setActionBar(`                         ${bar}`);
            }
        } catch { return false }
    } else {
        player.runCommand('scoreboard players add @s dorios:mana 100')
        world.getDimension('overworld').runCommand('scoreboard objectives add dorios:mana dummy Mana')
    }
}

function updateData(player) {
    const id = player.id;
    if (intervalMap.has(id)) return
    previousEquipmentMap.set(id, equipmentAndTagsString(player));

    let tick = 0;

    const interval = system.runInterval(() => {
        // Ensure player is still valid
        if (!player.isValid) return
        // world.sendMessage(`${player.dimension.getBiome(player.location).id}`)
        // Trinket updates and extra jump logic
        trinketTick(player);

        // Equipment or tag change detection every 20 ticks (1 second)
        if (tick % 20 === 0) {
            const current = equipmentAndTagsString(player);
            const previous = previousEquipmentMap.get(id);
            if (current !== previous) {
                previousEquipmentMap.set(id, current);
                updatePlayerStats(player);
            }
            applyPassiveEffects(player)
        }

        const stats = getStatCategory(player, 'stats');


        // Mana display and refill every 4 ticks (up to 5 times)
        // if (tick % 4 == 0) {
        //     if (stats) {
        //         const manaScore = world.scoreboard.getObjective('dorios:mana');
        //         manaDisplay(manaScore, player, stats);

        //         // Health regeneration
        //         if (stats.healthRegen > 0) {
        //             doriosAPI.entities.changeHealth(player, stats.healthRegen / 5);
        //         }
        //     }
        // }


        if (stats?.extraJumps > 0) {
            let jumps = player.getDynamicProperty('dorios:extraJumps') || 0;

            if (player.isFalling && jumps > 0 && player.isJumping) {
                const { x, z } = player.getVelocity();
                player.applyKnockback({ x, z }, 0.6);
                jumps -= 1;
            }
            if (player.isOnGround) {
                jumps = stats.extraJumps;
            }
            player.setDynamicProperty('dorios:extraJumps', jumps);
        }

        tick++;
        if (tick > 1000) tick = 0; // prevent overflow
    }, 1);

    intervalMap.set(id, interval);
}

/**
 * Applies all passive status effects to a player based on their passive stats.
 * Effects are refreshed periodically with a short duration to ensure persistence.
 *
 * @param {import('@minecraft/server').Player} player Player entity to apply passive effects to
 */
function applyPassiveEffects(player) {
    // Apply passive effects
    const passives = getStatCategory(player, "passives");
    for (const [effectName, level] of Object.entries(passives)) {
        try {
            player.addEffect(effectName, 240, {
                amplifier: level - 1,
                showParticles: false,
            });
        } catch (e) {
            console.warn(`[Dorios RPG Core] Error applying effect '${effectName}': `, e);
        }
    }
}

