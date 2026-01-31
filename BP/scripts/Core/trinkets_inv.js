import { system, ItemStack, world } from '@minecraft/server'
import { data, slots } from './config.js'
import { getStatCategory, displayStats } from './stats_manager.js'


world.afterEvents.itemUse.subscribe(e => {
    if (e.itemStack.typeId == 'dorios:stats_scroll') displayStats(e.source)
    if (e.itemStack.typeId == 'dorios:recover_scroll') unequipAllTrinkets(e.source)
    tryEquipTrinket(e.source, e.itemStack)
})

export function trinketTick(player) {
    let mainHand = player.getEquipment("Mainhand")
    if (!mainHand || mainHand?.typeId != 'dorios:scroll') {
        const entity = getInvEntity(player)
        if (entity) entity.remove()
        return
    } else {
        // Lock Scroll in Mainhand
        const mainHandSlot = player.selectedSlotIndex

        system.runTimeout(() => {
            if (player.getEquipment("Mainhand")?.typeId == mainHand?.typeId) {
                mainHand.lockMode = "slot"
                player.getComponent('inventory').container.setItem(mainHandSlot, mainHand)
            } else {
                mainHand.lockMode = "none"
                player.getComponent('inventory').container.setItem(mainHandSlot, mainHand)
            }
        }, 1)

        const trinketInv = getInvEntity(player)
        if (!trinketInv) {
            summonInvEntity(player)
            return;
        }
        if (!trinketInv.getTags().includes('dorios:trinket_loaded')) {
            loadEntityInv(player, trinketInv)
            trinketInv.addTag('dorios:trinket_loaded')
        }
        const headPos = player.getHeadLocation();
        const viewDir = player.getViewDirection();
        const velocity = player.getVelocity();

        // Puedes ajustar este multiplicador según la frecuencia de actualización
        const predictionFactor = 5; // cuánto adelantarte con base en su velocidad

        const x = headPos.x + viewDir.x * 0.5 + velocity.x * predictionFactor;
        const y = headPos.y + viewDir.y * 0.5 + velocity.y * predictionFactor;
        const z = headPos.z + viewDir.z * 0.5 + velocity.z * predictionFactor;

        trinketInv.teleport({ x, y, z }, { dimension: player.dimension });

        validateTrinketSlots(player, trinketInv)
    }
}

function loadEntityInv(player, entity) {
    const container = entity.getComponent('inventory')?.container;
    if (!container) return;

    const tags = player.getTags();

    for (const tag of tags) {
        const entry = data[tag];
        if (!entry?.trinket) continue;

        const slot = entry.trinket;
        const index = slots[slot];
        if (index === undefined) continue;

        container.setItem(index, new ItemStack(tag));
    }
}

function validateTrinketSlots(player, entity) {
    const container = entity.getComponent('inventory')?.container;
    const playerInv = player.getComponent('inventory')?.container;
    if (!container || !playerInv) return;

    const currentTags = new Set(player.getTags());
    const expectedTags = new Set();

    for (const [_slotName, index] of Object.entries(slots)) {
        const slot = container.getSlot(index);
        const item = slot?.getItem();
        if (!item) continue;

        const id = item.typeId;
        const entry = data[id];

        const isTrinket = entry?.trinket;
        const passesCondition = entry?.condition != undefined ? entry.condition(player) : true;
        // Si no está en data, no es trinket, o falla condición → quitarlo
        if (!entry || !isTrinket || !passesCondition) {
            container.setItem(index);
            if (playerInv.emptySlotsCount > 0) {
                playerInv.addItem(item);
            } else {
                player.dimension.spawnItem(item, player.location);
            }
            continue;
        }

        const correctSlotKey = entry.trinket;
        const correctIndex = slots[correctSlotKey];

        expectedTags.add(id);

        // Mover al slot correcto si está en otro
        if (correctIndex !== index) {
            const targetSlot = container.getSlot(correctIndex);
            const occupied = targetSlot?.getItem();

            if (!occupied) {
                container.moveItem(index, correctIndex, container);
            } else {
                container.setItem(index);
                if (playerInv.emptySlotsCount > 0) {
                    playerInv.addItem(item);
                } else {
                    player.dimension.spawnItem(item, player.location);
                }
            }
        }
        clearGlobalImmuneEffects(player)
        // Agregar el tag si aún no lo tiene
        if (!currentTags.has(id)) {
            player.addTag(id);
        }
    }

    // Quitar tags de trinkets que ya no están o que fallan su condición
    for (const tag of currentTags) {
        const entry = data[tag];
        if (!entry?.trinket) continue;

        const condition = typeof entry.condition === "function" ? entry.condition(player) : true;
        if (!expectedTags.has(tag) || !condition) {
            player.removeTag(tag);
        }
    }
}

function summonInvEntity(player) {
    let entity = player.dimension.spawnEntity('dorios:trinkets_inv', player.location)
    entity.addTag(`${player.id}`)
    entity.getComponent('minecraft:tameable').tame(player)
    entity.nameTag = "Dorios Trinkets"
}

function getInvEntity(player) {
    return player.dimension.getEntities({
        tags: [player.id],
        type: "dorios:trinkets_inv"
    })[0]
}

function tryEquipTrinket(player, item) {
    const id = item?.typeId;
    if (!id || !data[id]) return;

    const entry = data[id];
    const slot = entry?.trinket;
    if (!slot) return;

    // Si hay una condición y no se cumple, tratar como si el slot estuviera lleno
    if (typeof entry.condition === "function" && !entry.condition(player)) {
        // Cancelar equipamiento y devolver el ítem
        const inv = player.getComponent('inventory')?.container;
        if (inv?.emptySlotsCount > 0) {
            inv.addItem(item);
        } else {
            player.dimension.spawnItem(item, player.location);
        }
        return;
    }

    // Revisar si ya tiene un trinket en ese slot (por tag)
    const tags = player.getTags();
    for (const tag of tags) {
        const tagEntry = data[tag];
        if (tagEntry?.trinket === slot) {
            // Ya hay algo en ese slot, cancelar
            return;
        }
    }

    // Todo ok, se equipa
    player.addTag(id);
    clearTrinketImmuneEffects(player, entry)
    player.changeItemAmount(player.selectedSlotIndex, -1)
}

/**
 * Elimina efectos activos del jugador si coinciden con alguna inmunidad registrada.
 * @param {Entity} player - Entidad jugador.
 */
export function clearGlobalImmuneEffects(player) {
    if (!player || player.typeId !== "minecraft:player") return;

    const immunities = getStatCategory(player, "immunities");
    if (!Array.isArray(immunities)) return;

    const effects = player.getEffects();
    if (!effects) return;

    for (const effect of effects) {
        const effectName = effect.typeId.replace("minecraft:", ""); // ej: "poison"

        // Buscar si el nombre base está en la lista de inmunidades (case-insensitive)
        if (immunities.some(im => im.toLowerCase() === effectName.toLowerCase())) {
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
    if (!player || player.typeId !== "minecraft:player") return;
    if (!Array.isArray(entry.immunities)) return;

    const effects = player.getEffects();
    if (!effects) return;

    for (const effect of effects) {
        const effectName = effect.typeId.replace("minecraft:", "");
        if (entry.immunities.some(im => im.toLowerCase() === effectName.toLowerCase())) {
            player.removeEffect(effect.typeId);
        }
    }
}



function unequipAllTrinkets(player) {
    const tags = player.getTags();
    const inv = player.getComponent('inventory')?.container;
    if (!inv) return;

    for (const tag of tags) {
        const entry = data[tag];
        if (!entry?.trinket) continue;

        const item = new ItemStack(tag);
        if (inv.emptySlotsCount > 0) {
            inv.addItem(item);
        } else {
            player.dimension.spawnItem(item, player.location);
        }

        player.removeTag(tag);
    }
}