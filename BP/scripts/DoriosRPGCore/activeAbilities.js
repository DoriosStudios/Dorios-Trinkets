import { system, world } from '@minecraft/server'
import { getStatCategory } from './statsManager.js'
import { manaBarFrames } from './config.js'
import { addHealth } from '../DoriosLib/entity/index.js'


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
        addHealth(attacker, lifeStealValue)
    },
    manaSteal: (_entity, value, attacker, stats) => {
        let manaScore = world.scoreboard.getObjective('dorios:mana');
        if (!manaScore || !attacker.scoreboardIdentity) return;
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

world.beforeEvents.entityHurt.subscribe(event => {
    const { hurtEntity, damageSource } = event;
    const { damagingProjectile, damagingEntity: attacker, cause } = damageSource;
    if (event.cancel || event.damage <= 0 || !hurtEntity?.isValid) return;
    const generatedHit = cause === 'thorns' || cause === 'override';
    const isAttack = attacker?.isValid && (cause === 'entityAttack' || cause === 'projectile');
    const stats = isAttack && attacker.typeId === 'minecraft:player'
        ? getStatCategory(attacker, 'stats') : undefined;
    const actives = stats ? getStatCategory(attacker, 'actives') : undefined;

    if (stats) {
        const item = attacker.getComponent('equippable')?.getEquipment('Mainhand');
        const ability = item?.getComponent('ea:main_ability')?.customComponentParameters?.params;
        const weaponDamage = Array.isArray(ability) ? ability[0]?.damage ?? 0 : 0;
        event.damage = calculateAttackDamage(event.damage, stats, weaponDamage + 1, attacker).damage;
    }

    const defense = hurtEntity.typeId === 'minecraft:player'
        ? getStatCategory(hurtEntity, 'stats') : {};
    // Defense covers every damage cause, including environmental and generated hits.
    // The stat is unrestricted; damage itself cannot become negative.
    event.damage = Math.max(0, event.damage * (1 - (defense.damageReduction ?? 0) / 100));
    if (event.damage <= 0 || generatedHit || !attacker?.isValid) return;

    const damage = event.damage;
    const thorns = defense.thorns ?? 0;
    if (!stats && thorns <= 0) return;

    // Only the damage value changes in restricted execution. Side effects run later.
    system.run(() => {
        if (!attacker.isValid || !hurtEntity.isValid) return;
        if (stats) {
            applyActiveStatusEffects(hurtEntity, actives);
            applyStatsEffects(hurtEntity, stats, attacker, { cause, damage, damagingProjectile });
        }
        if (thorns > 0 && attacker.isValid) {
            attacker.applyDamage(damage * thorns / 100, { damagingEntity: hurtEntity, cause: 'thorns' });
        }
    });
});


/**
 * Adds the existing bonus formula to the original hit instead of dealing a second hit.
 *
 * @param {number} contextDamage The incoming damage of the original hit before this modifier
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
        damage: contextDamage + Math.max(0, damage)
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

function applyStatsEffects(entity, stats, attacker, context) {
    for (const [effectName, value] of Object.entries(stats)) {
        if (value <= 0) continue
        const handler = activesEffectHandlers[effectName];
        if (handler) {
            handler(entity, value, attacker, stats, context);
        }
    }
}
