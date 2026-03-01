import { system } from "@minecraft/server";

const REGISTRATION_MARKER = "__insightNamespaceRegistry_dorios_trinkets";
const REGISTRATION_RETRY_TICKS = 20;
const MAX_REGISTRATION_ATTEMPTS = 180;

const ADDON_CONTENT = Object.freeze({
  "key": "dorios_trinkets",
  "name": "Dorios Trinkets",
  "type": "addon",
  "namespace": "dorios",
  "content": [
    "dorios:abyssal_clam_shell",
    "dorios:abyssal_diver_helmet",
    "dorios:abyssal_essence",
    "dorios:abyssal_orb",
    "dorios:abyssal_sun_amulet",
    "dorios:black_heart",
    "dorios:blazed_heart_necklace",
    "dorios:blazing_amulet",
    "dorios:blood_boots",
    "dorios:blood_chestplate",
    "dorios:blood_helmet",
    "dorios:blood_leggings",
    "dorios:blood_pact",
    "dorios:blood_pendant",
    "dorios:bloodbound_amulet",
    "dorios:bloodbound_emblem",
    "dorios:bloodgem",
    "dorios:bloodstained_heart",
    "dorios:bloodtide_chalice",
    "dorios:broken_paladin_helmet",
    "dorios:candy_heart",
    "dorios:cloud_steps_boots",
    "dorios:dead_abyssal_orb",
    "dorios:dragon_heart",
    "dorios:empty_ring",
    "dorios:eternal_heart",
    "dorios:fire_claw",
    "dorios:fire_gauntlet",
    "dorios:frost_quiver",
    "dorios:guardian_ring",
    "dorios:healer_ring",
    "dorios:heavy_empty_ring",
    "dorios:heavy_guardian_ring",
    "dorios:heavy_healer_ring",
    "dorios:heavy_miner_ring",
    "dorios:heavy_runner_ring",
    "dorios:heavy_warrior_ring",
    "dorios:holy_cross",
    "dorios:ice_claw",
    "dorios:ice_gauntlet",
    "dorios:idle_bloom",
    "dorios:immaculate_heart",
    "dorios:lava_flow_0",
    "dorios:lava_flow_1",
    "dorios:lava_flow_2",
    "dorios:lava_solid_0",
    "dorios:lava_solid_1",
    "dorios:lava_solid_2",
    "dorios:lava_waders",
    "dorios:mender_pendant",
    "dorios:miner_ring",
    "dorios:molten_quiver",
    "dorios:night_vision_goggles",
    "dorios:night_vision_mask",
    "dorios:obsidian_skull",
    "dorios:paladin_boots",
    "dorios:paladin_chestplate",
    "dorios:paladin_helmet",
    "dorios:paladin_leggings",
    "dorios:purity_blossom",
    "dorios:rabbit_rush",
    "dorios:recover_scroll",
    "dorios:repair_talis",
    "dorios:restored_paladin_helmet",
    "dorios:rotten_heart",
    "dorios:runner_ring",
    "dorios:rush_of_fear",
    "dorios:sacred_heart",
    "dorios:scroll",
    "dorios:soul_heart",
    "dorios:stats_scroll",
    "dorios:strong_abyssal_ring",
    "dorios:strong_ancient_ring",
    "dorios:strong_blood_ring",
    "dorios:strong_breeze_ring",
    "dorios:strong_brute_ring",
    "dorios:strong_celestial_ring",
    "dorios:strong_echo_ring",
    "dorios:strong_ender_ring",
    "dorios:strong_fortress_ring",
    "dorios:strong_inferno_ring",
    "dorios:strong_jade_ring",
    "dorios:strong_shulker_ring",
    "dorios:strong_trader_ring",
    "dorios:tideforged_carapace",
    "dorios:tideforged_eye",
    "dorios:tideforged_heart",
    "dorios:tideforged_knuckles",
    "dorios:tideforged_pendant",
    "dorios:tideforged_ring",
    "dorios:tideforged_stars",
    "dorios:trinkets_inv",
    "dorios:venom_claw",
    "dorios:venom_gauntlet",
    "dorios:venom_quiver",
    "dorios:voodoo",
    "dorios:warden_heart",
    "dorios:warrior_ring",
    "dorios:wither_heart"
  ]
});

function tryRegisterAddonContent() {
    if (globalThis[REGISTRATION_MARKER]) {
        return true;
    }

    const api = globalThis.InsightNamespaceRegistry;
    if (!api || typeof api.registerAddonContent !== "function") {
        return false;
    }

    api.registerAddonContent(ADDON_CONTENT, false);
    globalThis[REGISTRATION_MARKER] = true;
    return true;
}

function registerAddonContentWithRetry(attempt = 0) {
    if (tryRegisterAddonContent() || attempt >= MAX_REGISTRATION_ATTEMPTS) {
        return;
    }

    system.runTimeout(() => {
        registerAddonContentWithRetry(attempt + 1);
    }, REGISTRATION_RETRY_TICKS);
}

registerAddonContentWithRetry();
