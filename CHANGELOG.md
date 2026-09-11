# Dorios' Trinkets v2.1.3 (in preparation)

## CHANGED

- Applied damage reduction directly to before-hurt damage after attack bonuses, including environmental and reflected damage; removed its config limits and rounding. Removed 200 legacy reduction groups/events, retaining only the neutral reset on player initialization for existing worlds.

- Removed unused foreign player groups and events (bf, masks and associated utilities), preserving base player behavior, raids and all RPG stat groups.

- Moved attack damage, Holy Cross and critical bonuses to before-hurt damage edits, preserving the original damage source; deferred attack effects and reflection safely without after-hurt handlers.

- Organized the generic runtime under DoriosRPGCore with camelCase filenames and separate script-event handling; kept trinket registrations and gameplay formulas unchanged.

## FIXED

- Guarded player stat and effect access during loading and deferred actions, with safe defaults for missing or malformed stat data.
- Prevented rejected trinkets from granting equipment tags, conditional equip refunds from creating items, and failed item consumption from granting equipment.
- Reconciled scroll contents before closing or recovering accessories.
- Prevented generated critical and reflected damage from recursively applying combat bonuses.
- Removed Rush of Fear's temporary speed bonus when its timer expires or the necklace is unequipped.
- Initialized player statistics on spawn and avoided recreating an existing mana objective.

---

# Dorios' Trinkets v2.1.2

This update improves how trinkets, ring bases and scrolls are organized in the creative inventory.

## HIGHLIGHTS

- Added a localized item catalog for every visible trinket, ring base and scroll.

## ADDED

- Added a localized item catalog that organizes every visible trinket, ring base, and scroll into menu groups.

## CHANGED

- Synchronized the visible pack version metadata with v2.1.2.

---

# Dorios' Trinkets v2.1.1

## FIXED

- Fixed an issue that prevented the trinket scroll from opening.
- Improved trinket inventory stability while moving or reconnecting.

## CHANGED

- Updated stat and effect icons to the latest UtilityCraft font.
