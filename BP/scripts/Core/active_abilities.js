import { system, world } from '@minecraft/server'
import { getStatCategory } from './stats_manager.js'
import { manaBarFrames } from './config.js'


const activesEffectHandlers = {
    fireAspect: (entity, value) => {
        entity.setOnFire(value);
    },
    knockback: (entity, value, attacker) => {
        if (!attacker?.getViewDirection) return;

        const dir = attacker.getViewDirection(); // Vector con x, y, z
        entity.applyKnockback?.(
            {
                x: dir.x * value,
                z: dir.z * value
            },
            dir.y * value
        );
    },
    lifeSteal: (_entity, value, attacker, _stats, context) => {
        const lifeStealValue = (value / 100) * context.damage
        attacker.addHealth(lifeStealValue)
    },
    manaSteal: (_entity, value, attacker, stats) => {
        let manaScore = world.scoreboard.getObjective('dorios:mana');
        let mana = manaScore.getScore(attacker.scoreboardIdentity) || 0;
        const maxMana = stats.mana;
        const regen = Math.min((value / 100) * maxMana, maxMana - mana)
        mana += regen
        manaScore.setScore(attacker.scoreboardIdentity, mana);

        const percentage = mana / maxMana;
        const frameIndex = Math.floor(percentage * (manaBarFrames.length - 1));
        const bar = manaBarFrames[frameIndex];
        if (attacker.getGameMode() != 'creative') {
            attacker.onScreenDisplay.setActionBar(`                         ${bar}`);
        }
    }
};

world.afterEvents.entityHurt.subscribe(e => {
    const { hurtEntity, damageSource, damage } = e
    const { damagingProjectile, damagingEntity, cause } = damageSource

    if (cause == 'thorns') return

    if (damagingEntity?.typeId == 'minecraft:player') {
        const player = damagingEntity
        const actives = getStatCategory(player, 'actives');
        if (actives) {
            applyActiveStatusEffects(hurtEntity, actives);
        }

        const stats = getStatCategory(player, 'stats')
        const context = { cause, damage, damagingProjectile }
        if (stats) {
            applystatsEffects(hurtEntity, stats, player, context)
        }

        const itemStack = player.getComponent("equippable")?.getEquipment('Mainhand')
        const mainAbility = itemStack?.getComponent('ea:main_ability')?.customComponentParameters?.params;
        const baseWeaponDamage = Array.isArray(mainAbility) ? mainAbility[0]?.damage ?? 0 : 0;

        const totalDamage = calculateAttackDamage(damage, stats, baseWeaponDamage + 1, player);
        if (totalDamage.damage > 0) {
            if (totalDamage.isCrit) {
                hurtEntity.applyDamage(totalDamage.damage, { damagingEntity: player, cause: 'override' })
            } else {
                hurtEntity.applyDamage(totalDamage.damage, { damagingEntity: player, cause: 'thorns' })
            }
        }

    }

    if (hurtEntity?.typeId == 'minecraft:player') {
        const player = hurtEntity
        const stats = getStatCategory(player, 'stats');
        if (stats) {
            if (stats.thorns <= 0) return
            damagingEntity?.applyDamage((stats.thorns / 100) * damage, { damagingEntity: hurtEntity })
        }
    }
})


/**
 * Calculates final damage and whether it was a critical hit.
 *
 * @param {number} contextDamage The damage already applied from other sources (e.g., base melee)
 * @param {Object} stats Object containing combat stats
 * @param {number} [stats.attack=0] Flat attack stat
 * @param {number} [stats.critChance=0] Chance (%) to land a critical hit
 * @param {number} [stats.critMulti=0] Critical multiplier (% of baseAttack + weapon)
 * @param {number} [stats.attackMulti=0] Final damage multiplier (%)
 * @param {number} [baseWeaponDamage=0] Optional base weapon damage (from `ea:main_ability`)
 * @returns {{
 *   isCrit: boolean,
 *   damage: number
 * }}
 */
function calculateAttackDamage(contextDamage, stats, baseWeaponDamage = 0, player) {
    const baseAttack = (stats.attack ?? 0);
    const weaponBase = baseWeaponDamage ?? 0;

    const critChance = stats.critChance ?? 0;
    const critMulti = stats.critMulti ?? 0;
    const attackMulti = stats.attackMulti ?? 0;

    const isCrit = Math.random() < (critChance / 100);
    const critBonus = isCrit ? (baseAttack + weaponBase) * (critMulti / 100) : 0;

    const multiplier = 1 + (attackMulti / 100);

    const weaponDamage = (baseAttack + weaponBase + critBonus) * multiplier;
    const scaledOriginal = contextDamage * (attackMulti / 100);
    let damage = weaponDamage + scaledOriginal
    if (player.isFalling) {
        damage *= 1.5
    }
    return {
        isCrit,
        damage
    };
}



function applyActiveStatusEffects(entity, actives) {
    for (const [effectName, level] of Object.entries(actives)) {
        try {
            entity.addEffect(effectName, 100, {
                amplifier: level - 1,
                showParticles: false
            });
        } catch (e) {
            console.warn(`[Dorios RPG Core] Error applying active effect '${effectName}':`, e);
        }
    }
}

function applystatsEffects(entity, stats, attacker, context) {
    for (const [effectName, value] of Object.entries(stats)) {
        if (value <= 0) continue
        // try {
        const handler = activesEffectHandlers[effectName];
        if (handler) {
            handler(entity, value, attacker, stats, context);
        }
        // } catch (e) {
        //     console.warn(`[Dorios RPG Core] Error applying stats effect '${effectName}':`, e);
        // }
    }
}