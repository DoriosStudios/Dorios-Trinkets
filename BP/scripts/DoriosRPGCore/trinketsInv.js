import { system, ItemStack, world } from "@minecraft/server";
import {
  changeItemAmount,
  getEquipment,
  isPlayerTracking,
  startPlayerTracking,
  stopPlayerTracking,
} from "../DoriosLib/entity/index.js";
import { data, slots } from "./config.js";
import { getStatCategory, updatePlayerStats } from "./statsManager.js";

import { writeStatDisplay, statDisplayItem } from "./statDisplay.js";

const trinketEntities = new Map();

const TRACKING_OPTIONS = Object.freeze({
  anchor: "head",
  viewOffset: 0.5,
  velocityFactor: 5,
  offset: { x: 0, y: -0.5, z: 0 },
});

function isAuxiliaryTag(tag) {
  return tag.endsWith("_tag");
}

world.afterEvents.itemUse.subscribe((e) => {
  tryEquipTrinket(e.source, e.itemStack);
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  const entity = trinketEntities.get(playerId);
  if (!entity) return;

  stopPlayerTracking(entity);
  trinketEntities.delete(playerId);
  if (entity.isValid) entity.remove();
});

// Subscribe after world load, and calculate one snapshot per actual opening.
world.afterEvents.worldLoad.subscribe(() => {
  world.afterEvents.entityContainerOpened.subscribe(refreshOpenedTrinketStats, {
    entityFilter: { type: "dorios:trinkets_inv" },
  });
});

function refreshOpenedTrinketStats({ entity, openSource }) {
  const player = openSource?.entity;
  if (!entity?.isValid || entity.typeId !== "dorios:trinkets_inv"
      || !player?.isValid || player.typeId !== "minecraft:player"
      || !entity.getTags().includes(player.id)) return;

  prepareTrinketInventory(player, entity);
  validateTrinketSlots(player, entity);
  const playerData = updatePlayerStats(player);
  writeStatDisplay(entity, playerData);
}

function prepareTrinketInventory(player, entity) {
  if (entity.getTags().includes("dorios:trinket_loaded")) return;
  loadEntityInv(player, entity);
  entity.addTag("dorios:trinket_loaded");
}

export function trinketTick(player) {
  if (!player?.isValid || !player.dimension.isChunkLoaded(player.location)) return;
  let mainHand = getEquipment(player, "Mainhand");
  if (!mainHand || mainHand?.typeId != "dorios:scroll") {
    removeInvEntity(player);
    return;
  } else {
    // Lock Scroll in Mainhand
    const mainHandSlot = player.selectedSlotIndex;

    system.runTimeout(() => {
      if (!player.isValid) return;
      if (getEquipment(player, "Mainhand")?.typeId == mainHand?.typeId) {
        mainHand.lockMode = "slot";
        player.getComponent("inventory").container.setItem(mainHandSlot, mainHand);
      } else {
        mainHand.lockMode = "none";
        player.getComponent("inventory").container.setItem(mainHandSlot, mainHand);
      }
    }, 1);

    const trinketInv = getOrCreateInvEntity(player);
    if (!trinketInv) return;
    prepareTrinketInventory(player, trinketInv);
    validateTrinketSlots(player, trinketInv);
  }
}

function loadEntityInv(player, entity) {
  const container = entity.getComponent("inventory")?.container;
  if (!container) return;

  const tags = player.getTags();

  for (const tag of tags) {
    const entry = data[tag];
    if (!entry?.trinket) continue;
    if (isAuxiliaryTag(tag)) continue; // Evitar cargar tags auxiliares

    let item;
    try {
      item = new ItemStack(tag);
    } catch {
      continue;
    } // Si el item no existe, saltar

    const slot = entry.trinket;
    const index = slots[slot];
    if (index === undefined) continue;

    container.setItem(index, item);
  }
}

function returnItem(player, item) {
  const container = player.getComponent("inventory")?.container;
  const remaining = container ? container.addItem(item) : item;
  if (remaining) player.dimension.spawnItem(remaining, player.location);
}

function validateTrinketSlots(player, entity) {
  const container = entity.getComponent("inventory")?.container;
  if (!container) return;

  for (const index of Object.values(slots)) {
    const item = container.getItem(index);
    if (!item) continue;
    // Internal display items must never become equipment or returned items.
    if (item.typeId === statDisplayItem) {
      container.setItem(index);
      continue;
    }
    const entry = data[item.typeId];
    const target = slots[entry?.trinket];
    const allowed = typeof entry?.condition !== "function" || entry.condition(player);

    if (target === undefined || item.amount !== 1 || !allowed
        || (target !== index && container.getItem(target))) {
      container.setItem(index);
      returnItem(player, item);
      continue;
    }
    if (target !== index) container.moveItem(index, target, container);
  }

  // Only the final contents grant tags, never items returned to the player.
  const expectedTags = new Set();
  for (const index of Object.values(slots)) {
    const item = container.getItem(index);
    if (item) expectedTags.add(item.typeId);
  }
  for (const tag of player.getTags()) {
    if (!isAuxiliaryTag(tag) && data[tag]?.trinket && !expectedTags.has(tag)) {
      player.removeTag(tag);
    }
  }
  for (const tag of expectedTags) {
    if (!player.hasTag(tag)) player.addTag(tag);
  }
  clearGlobalImmuneEffects(player);
}

function summonInvEntity(player) {
  const dimension = player.dimension;
  const location = player.location;
  if (!dimension.isChunkLoaded(location)) return;
  let entity;
  try {
    entity = dimension.spawnEntity("dorios:trinkets_inv", location);
  } catch (error) {
    // A chunk can stop ticking during loading or a dimension transition.
    // The existing player tick retries without changing equipment tags.
    if (error.name === 'LocationInUnloadedChunkError') return;
    throw error;
  }
  entity.addTag(`${player.id}`);
  entity.getComponent("minecraft:tameable").tame(player);
  entity.nameTag = "Dorios Trinkets";
  return trackInvEntity(player, entity);
}

function getOrCreateInvEntity(player) {
  const cached = trinketEntities.get(player.id);
  if (cached?.isValid) {
    if (!isPlayerTracking(cached)) startPlayerTracking(cached, player, TRACKING_OPTIONS);
    return cached;
  }

  if (cached) stopPlayerTracking(cached);
  trinketEntities.delete(player.id);
  const existing = player.dimension.getEntities({
    tags: [player.id],
    type: "dorios:trinkets_inv",
  })[0];
  return existing ? trackInvEntity(player, existing) : summonInvEntity(player);
}

function trackInvEntity(player, entity) {
  trinketEntities.set(player.id, entity);
  startPlayerTracking(entity, player, TRACKING_OPTIONS);
  return entity;
}

function removeInvEntity(player) {
  const cached = trinketEntities.get(player.id);
  const entity = cached?.isValid
    ? cached
    : player.dimension.getEntities({
      tags: [player.id],
      type: "dorios:trinkets_inv",
    })[0];

  trinketEntities.delete(player.id);
  if (cached && cached !== entity) stopPlayerTracking(cached);
  if (!entity) return;
  stopPlayerTracking(entity);
  if (entity.isValid) {
    validateTrinketSlots(player, entity);
    entity.remove();
  }
}

function tryEquipTrinket(player, item) {
  if (!player?.isValid) return;
  const id = item?.typeId;
  if (!id || !data[id]) return;

  const entry = data[id];
  const slot = entry?.trinket;
  if (!slot) return;

  if (slots[slot] === undefined) return;
  // itemUse has not consumed the item; a failed condition needs no refund.
  if (typeof entry.condition === "function" && !entry.condition(player)) return;

  // Reconcile a scroll closed by switching to this item before granting its tag.
  removeInvEntity(player);

  // Revisar si ya tiene un trinket en ese slot (por tag)
  const tags = player.getTags();
  for (const tag of tags) {
    if (isAuxiliaryTag(tag)) continue;

    const tagEntry = data[tag];
    if (tagEntry?.trinket === slot) {
      // Ya hay algo en ese slot, cancelar
      return;
    }
  }

  const held = player.getComponent("inventory")?.container?.getItem(player.selectedSlotIndex);
  if (held?.typeId !== id) return;
  if (!changeItemAmount(player, { slot: player.selectedSlotIndex, amount: -1 })) return;
  player.addTag(id);
  clearTrinketImmuneEffects(player, entry);
}

/**
 * Elimina efectos activos del jugador si coinciden con alguna inmunidad registrada.
 * @param {Entity} player - Entidad jugador.
 */
export function clearGlobalImmuneEffects(player) {
  if (!player?.isValid || player.typeId !== "minecraft:player") return;

  const immunities = getStatCategory(player, "immunities");
  if (!Array.isArray(immunities)) return;

  const effects = player.getEffects();
  if (!effects) return;

  for (const effect of effects) {
    const effectName = effect.typeId.replace("minecraft:", ""); // ej: "poison"

    // Buscar si el nombre base está en la lista de inmunidades (case-insensitive)
    if (immunities.some((im) => im.toLowerCase() === effectName.toLowerCase())) {
      try {
        player.removeEffect(effect.typeId);
      } catch (e) {
        console.warn(`[Dorios RPG Core] Failed to remove effect '${effect.typeId}':`, e);
      }
    }
  }
}

/**
 * Elimina efectos del jugador que coincidan con las inmunidades de un trinket específico.
 *
 * @param {Entity} player - El jugador objetivo.
 * @param {object} entry - Objeto del trinket con propiedad `.immunities` como array de strings.
 */
function clearTrinketImmuneEffects(player, entry) {
  if (!player?.isValid || player.typeId !== "minecraft:player") return;
  if (!Array.isArray(entry.immunities)) return;

  const effects = player.getEffects();
  if (!effects) return;

  for (const effect of effects) {
    const effectName = effect.typeId.replace("minecraft:", "");
    if (entry.immunities.some((im) => im.toLowerCase() === effectName.toLowerCase())) {
      player.removeEffect(effect.typeId);
    }
  }
}
