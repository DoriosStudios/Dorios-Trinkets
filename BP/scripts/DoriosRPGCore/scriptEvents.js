import { system } from '@minecraft/server';
import { data, slots } from './config.js';
import { updatePlayerStats, displayStats } from './statsManager.js';
import { clearGlobalImmuneEffects } from './trinketsInv.js';
import { ChestLootInjector, MobLootInjector } from './lootInjector.js';
import { printJson } from '../DoriosLib/messages/index.js';

system.afterEvents.scriptEventReceive.subscribe(e => {
    const handler = scriptEventsHandler[e.id];
    if (!Object.hasOwn(scriptEventsHandler, e.id)) return;
    if (['dorios:update_stats', 'dorios:update_effects', 'dorios:print_data', 'dorios:display_stats'].includes(e.id)
        && (!e.sourceEntity?.isValid || e.sourceEntity.typeId !== 'minecraft:player')) return;
    handler(e);
});

export const scriptEventsHandler = {
    "dorios:register_stat_data": e => {
        try {
            const payload = JSON.parse(e.message);
            const newData = payload

            if (!newData || typeof newData !== "object" || Array.isArray(newData)) {
                console.warn("[Dorios RPG Core] Invalid payload format:", e.message);
                return;
            }

            for (const [id, config] of Object.entries(newData)) {
                if (!/^[a-z0-9_]+:[a-z0-9_./-]+$/.test(id) || !config || typeof config !== "object" || Array.isArray(config)
                    || (config.trinket !== undefined && !Object.hasOwn(slots, config.trinket))) {
                    console.warn(`[Dorios RPG Core] Skipping invalid config for '${id}':`, config);
                    continue;
                }

                data[id] = config;

                if (config.loot) {
                    ChestLootInjector.registerTrinketLoot(id, config)
                }

                if (config.drops) {
                    MobLootInjector.registerTrinketDrop(id, config)
                }
            }

            system.sendScriptEvent(
                "dorios:stat_data_registered",
                JSON.stringify({ registered: true })
            );
        } catch (err) {
            system.sendScriptEvent(
                "dorios:stat_data_registered",
                JSON.stringify({ registered: false })
            );
            console.warn("[Dorios RPG Core] JSON parse failed:", err, e.message);
        }
    },
    "dorios:update_stats": e => {
        updatePlayerStats(e.sourceEntity)
    },
    "dorios:update_effects": e => {
        clearGlobalImmuneEffects(e.sourceEntity)
    },
    "dorios:print_data": e => {
        printJson(e.sourceEntity, 'Data', data)
    },
    "dorios:display_stats": e => {
        displayStats(e.sourceEntity)
    },
    "dorios:reset_chest_tracking": e => {
        ChestLootInjector.resetChestTracking()
    }
}
