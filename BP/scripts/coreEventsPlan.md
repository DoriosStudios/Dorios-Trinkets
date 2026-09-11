# RPG Core — Condition & Event Catalog
Based on events in the documentation, components already available in StatsCore, and existing registers from Dorios' Trinkets, the following list shows possible improvements to the core and core conditions.


## 1. Entity State
### Health
- `health`
- `healthPercent`
- `healthAbove`
- `healthBelow`
- `healthBetween`
- `healthCrossedAbove`
- `healthCrossedBelow`

### Movement
- `moving`
- `stationary`
- `speedAbove`
- `speedBelow`
- `verticalSpeedAbove`
- `verticalSpeedBelow`
- `onGround`
- `falling`
- `climbing`
- `swimming`
- `inWater`
- `sneaking`
- `sprinting`
- `sleeping`
- `onFire`

### Effects & Identity
- `hasEffect`
- `effectAmplifier`
- `hasTag`
- `entityType`
- `dimension`

---

## 2. Player State
- `jumping`
- `gliding`
- `flying`
- `emoting`
- `gameMode`
- `selectedSlot`

### Input
- `jumpPressed`
- `sneakPressed`
- `movementInput`

---

## 3. Actor / Target Relationship

- `distanceAbove`
- `distanceBelow`
- `horizontalDistanceAbove`
- `horizontalDistanceBelow`
- `verticalDistanceAbove`
- `verticalDistanceBelow`
- `sameDimension`

### Target State
- `targetType`
- `targetHasTag`
- `targetHasEffect`
- `targetHealthAbove`
- `targetHealthBelow`
- `targetOnFire`
- `targetInWater`
- `targetSprinting`
- `targetSneaking`
- `targetAirborne`

### Derived Target Categories
- `targetIsBoss`
- `targetIsHostile`
- `targetIsPassive`
- `targetIsUndead`
- `targetIsAquatic`
- `targetIsPlayer`

---

## 4. Combat Events
### Attack
- `onAttack`
- `onMeleeHit`
- `onProjectileHit`
- `onProjectileHitEntity`
- `onProjectileHitBlock`
- `onCrit`

### Damage
- `onHurt`
- `onDamageTaken`
- `onDamageDealt`
- `damageType`
- `damageAbove`
- `damageBelow`
- `wouldBeFatal`

### Kill / Death
- `onKill`
- `onDeath`
- `killedTarget`

### Combat Context
- `criticalHit`
- `targetWasMarked`
- `attackerDistance`
- `projectile`
- `melee`

---

## 5. Combat Memory / Temporal States

- `recentlyDamaged`
- `recentlyAttacked`
- `recentlyDealtDamage`
- `recentlyCrit`
- `recentlyKilled`
- `recentlyHealed`
- `recentlyDied`

### Streaks & Accumulated State
- `killStreak`
- `hitStreak`
- `critStreak`
- `damageTakenInWindow`
- `damageDealtInWindow`

---

## 6. Mining Events

### Mining Lifecycle
- `onMiningStart`
- `whileMining`
- `onMiningCancel`
- `beforeBlockBreak`
- `onBlockBreak`

### Breaking Progress
- `breakProgressAbove`
- `breakProgressBelow`

### Block Conditions
- `blockType`
- `blockTag`
- `blockState`
- `blockFace`
- `isOre`
- `isCrop`
- `isMatureCrop`
- `isLog`
- `isLeaf`
- `isPlant`

### Tool Conditions
- `usingCorrectTool`
- `usingSilkTouch`
- `usingFortune`
- `toolType`
- `toolTag`

### Combined Mining State
- `whileSneakingAndMining`
- `whileSprintingAndMining`
- `whileMiningOre`

---

## 7. Mining Memory / Streaks

- `recentlyMined`
- `recentlyMinedOre`
- `blocksMinedInWindow`
- `oresMinedInWindow`
- `consecutiveMining`
- `miningStreak`
- `oreMiningStreak`

---

## 8. Explosion Events

### Explosion Lifecycle
- `beforeExplosion`
- `onExplosion`
- `onBlockExploded`

### Explosion Context
- `explosionSource`
- `causedExplosion`
- `causedBySelf`
- `impactedBlocksAbove`
- `impactedBlocksBelow`
- `distanceFromExplosion`
- `nearExplosion`

### Temporal Explosion States
- `recentExplosion`
- `recentlyCausedExplosion`
- `recentlyDamagedByExplosion`

---

## 9. Projectile Conditions

- `projectileType`
- `projectileSource`
- `projectileDistance`
- `projectileSpeed`
- `impactDirection`
- `hitFace`
- `longRangeHit`

### Projectile Context
- `projectileHitEntity`
- `projectileHitBlock`
- `projectileWhileAirborne`
- `projectileWhileSprinting`

---

## 10. Item Use Events

### Use Lifecycle
- `onItemUse`
- `onItemStartUse`
- `whileUsingItem`
- `onItemStopUse`
- `onItemReleaseUse`
- `onItemCompleteUse`

### Item Conditions
- `itemType`
- `itemTag`
- `chargeDuration`
- `chargeProgress`
- `fullyCharged`

---

## 11. Interaction Events

### Entity Interaction
- `onInteractEntity`
- `interactionEntityType`

### Block Interaction
- `onInteractBlock`
- `interactionBlockType`
- `interactionFace`

### Redstone / Functional Blocks
- `onButtonPush`
- `onLeverAction`
- `onPressurePlatePush`

---

## 12. Inventory Events

- `onItemPickup`
- `onItemDrop`
- `onInventoryChange`
- `onHotbarChange`
- `onContainerOpen`
- `onContainerClose`

### Inventory Context
- `pickedItemType`
- `droppedItemType`
- `selectedItemType`
- `inventoryContains`
- `inventoryContainsTag`

---

## 13. Building Events

- `beforeBlockPlace`
- `onBlockPlace`
- `placedBlockType`
- `placedBlockTag`

### Building Memory
- `recentlyPlacedBlock`
- `blocksPlacedInWindow`
- `buildingStreak`

---

## 14. Health & Recovery Events

- `onHealthChanged`
- `onHeal`
- `healAmount`
- `damageAmount`

### Threshold Transitions
- `healthCrossedAbove`
- `healthCrossedBelow`

### Temporal Recovery
- `recentlyHealed`
- `recentlyRegenerated`

---

## 15. Status Effect Events

- `onEffectAdded`
- `effectType`
- `effectAmplifier`

### Derived Effect State
- `hasPositiveEffect`
- `hasNegativeEffect`
- `effectCountAbove`
- `effectCountBelow`

---

## 16. Environment Conditions

### Weather
- `weather`
- `raining`
- `thundering`
- `onWeatherChange`

### Time
- `timeOfDay`
- `day`
- `night`

### Position
- `heightAbove`
- `heightBelow`
- `dimension`

### Surroundings
- `blockBelow`
- `blockAbove`
- `blockAtFeet`
- `biome`
- `underwater`
- `inLava`
- `inRain`
- `wet`

---

## 17. Movement Transitions

- `startedSneaking`
- `stoppedSneaking`
- `startedSprinting`
- `stoppedSprinting`
- `startedGliding`
- `stoppedGliding`
- `startedSwimming`
- `stoppedSwimming`
- `becameAirborne`
- `landed`

### Movement Duration
- `fallDistance`
- `airborneTime`
- `groundedTime`
- `sprintingTime`
- `swimmingTime`

---

## 18. Player / World Lifecycle

- `onJoin`
- `onSpawn`
- `onRespawn`
- `onDimensionChange`
- `onGameModeChange`

---

## 19. Entity Lifecycle

- `onEntitySpawn`
- `onEntityLoad`
- `onEntityRemove`
- `onEntityTamed`
- `onEntityDie`

---

## 20. Generic Temporal Conditions

These should accept a configurable duration in ticks.

- `recentlyDamaged`
- `recentlyAttacked`
- `recentlyKilled`
- `recentlyCrit`
- `recentlyHealed`
- `recentlyMined`
- `recentlyMinedOre`
- `recentlyPlacedBlock`
- `recentlyUsedItem`
- `recentlyShotProjectile`
- `recentlyExploded`
- `recentlyCausedExplosion`
- `recentlyChangedDimension`

Example:

```js
conditions: {
    actor: {
        recentlyKilled: {
            withinTicks: 100
        }
    }
}