# Dorios' Trinkets v2.1.3 (in preparation)

## CHANGED

- Wrapped long item descriptions into shorter tooltip lines across all five locales, preserving their wording and stat icons.

- Silenced the successful Dorios RPG Core initialization chat message.

- Removed Stats Scroll and Recover Scroll, their recipes, creative entries, textures and item-use handlers. Trinket Scroll is now the only scroll; its guide no longer references Recover Scroll.

- Adapted Lava Waders to the nearby freezing behavior of Helpful Items Lava Boots: a two-block circular radius at foot level, refreshed temporary blocks and native melting after about three seconds away. Original lava depth is retained in block states, including flowing lava.

- Removed the colon from the sidebar Stats heading.

- Resized the scroll guide to the standard inventory panel dimensions (176 by 166), shortened the explanations and added spacing between entries. Moved guide text to the five existing English, Spanish and Portuguese locale files.

- Added a vanilla How to Play toggle in the scroll corner, opening an overlaid, scrollable icon guide. Its close toggle returns to the scroll without closing the container; underlying inventory controls are hidden while the guide is open.

- Reduced the stats sidebar width from 120 to 96 UI pixels (80%), preserving its attached position and centering the combined interface.

- Simplified effect lore to glyphs and Roman numeral levels, with glyph-only immunities; section headings and None placeholders remain.

- Arranged stats into two columns and replaced fixed effect columns with one dynamically sized name/lore label. Only granted effects and immunities appear; each empty category shows None. Reduced internal display items from twelve to three.

- Included the base damage point in the sidebar attack value (`attack + 1`) without changing combat calculations.

- Removed item locks and keep-on-death flags from internal stat display items in inaccessible UI slots.

- Temporarily hid the eight statistics without current trinket modifiers from the sidebar, keeping its column layout. Documented the hidden keys and restoration glyphs in `docs/trinketStats.md`; core behavior and the existing Stat Scroll are unchanged.

- Updated the shared F5 glyph sheet from UtilityCraft to include missing icons; preserved the Trinkets-specific E8 font sheet.

- Added a local UI prototype with a narrow vertically scrollable stats panel attached to the original Trinket Scroll, with smaller text and compact spacing. Preserved the player preview, equipment slots and inventory layout; the panel contains non-mana statistics, passive effects, active effects and immunities grouped like the Stat Scroll. Reused existing stat and effect glyphs beside their labels, including the specified combat, movement, life-steal, Thorns and health-regeneration glyphs, with two left-aligned icon/value column pairs at 0.65 font scale for the 8 currently modified non-mana stats, followed by dynamic effect sections. Added a left-aligned Trinkets heading above the nine accessory slots; section titles are left-aligned gray with tighter section spacing, and the redundant All Stats title is omitted. The Trinkets heading is shifted 5 px to the right.

- Applied damage reduction directly to before-hurt damage after attack bonuses, including environmental and reflected damage; removed its config limits and rounding. Removed 200 legacy reduction groups/events, retaining only the neutral reset on player initialization for existing worlds.

- Removed unused foreign player groups and events (bf, masks and associated utilities), preserving base player behavior, raids and all RPG stat groups.

- Moved attack damage, Holy Cross and critical bonuses to before-hurt damage edits, preserving the original damage source; deferred attack effects and reflection safely without after-hurt handlers.

- Organized the generic runtime under DoriosRPGCore with camelCase filenames and separate script-event handling; kept trinket registrations and gameplay formulas unchanged.

## FIXED

- Prevented temporary lava blocks from changing melting stages while supported by Lava Waders, avoiding repeated stage resets while standing still.
- Deferred scroll inventory creation while the player chunk is unloaded and retried transient unloaded-chunk spawn failures on the normal tick.

- Removed the extra base damage point from combat bonuses; attacks with no offensive bonuses retain their incoming damage.
- Deferred chest structure detection when nearby chunks are unloaded and skipped positions outside dimension height bounds.

- Hide the help toggle while the scroll guide is open and restore it when the guide closes, using direct bindings to avoid the unsupported modifications property.

- Moved sidebar collection indices to the direct children of each collection panel, correcting the twelve unknown-property errors reported by the client.

- Restored the damage-reduction text formatter so the legacy Stat Scroll can display its stats.

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
