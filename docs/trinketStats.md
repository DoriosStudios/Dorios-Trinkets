# Trinket stats in the scroll UI

The sidebar in `RP/ui/dorios_trinkets_menu.json` shows eight statistics in two columns. Each column has a fixed, left-aligned icon label and a separate value label 10 px to its right. Values grow rightward. Passive effects, active effects and immunities are generated as three sections in one name/lore label.

## Visible statistics

`health`, `attack`, `speed`, `waterSpeed`, `lifeSteal`, `thorns`, `fireAspect` and `extraJumps` are modified by the current definitions in `BP/scripts/register.js`. This includes the temporary `rush_of_fear_tag` speed modifier.

## Temporarily hidden statistics

The following core statistics have no modifiers in the current Trinkets registration data. They are temporarily omitted from the new sidebar only.

| Core key | Statistic | Glyph for restoration |
| --- | --- | --- |
| `attackMulti` | Attack multiplier | `U+F57D` |
| `knockback` | Knockback | `U+F515` |
| `knockbackRes` | Knockback resistance | `U+F57F` |
| `damageReduction` | Damage reduction | `U+F539` |
| `lavaSpeed` | Lava movement speed | `U+F56F` |
| `healthRegen` | Health regeneration | `U+F59A` |
| `critChance` | Critical chance | `U+F535` |
| `critMulti` | Critical multiplier | `U+F515` |

"No modifiers" does not mean that a statistic is absent from the core or has a zero default. Critical chance and critical multiplier still have base values. Regeneration and Resistance potion effects are distinct from `healthRegen` and `damageReduction`; trinkets granting those effects do not count as modifiers to these statistics.

`mana`, `manaRegen` and `manaSteal` are also hidden under the earlier decision to exclude mana from this UI temporarily.

## Scope and restoration

Only the eight displayed statistics are selected for this sidebar. Other core statistics and glyphs remain available; registration data and gameplay formulas are unchanged. The Trinket Scroll is the only scroll item. Stats are viewed in its sidebar and equipment is removed through its slots. The core script-event stats form remains available to integrations.

When a hidden statistic is needed, add its key to `statKeys` in `BP/scripts/DoriosRPGCore/statDisplay.js`, put its glyph in the matching UI column and adjust both column heights together. Entry `i` belongs to column `i % 2`; preserve the same row order on both sides.


## Opening and refresh behavior

After world load, `world.afterEvents.entityContainerOpened` listens for `dorios:trinkets_inv`. The handler accepts only a valid player opening their own tagged scroll entity. It loads equipment if needed, validates the 13 trinket slots and reconciles their tags, calls `updatePlayerStats` once, then writes the returned calculated data to the display items.

The panel is a snapshot at opening. Reopen it after changing equipment to refresh the displayed values. This adds no periodic UI refresh or cache. The existing core equipment/tag watcher and gameplay updates continue independently.

The eight stat icons stay in fixed positions and show calculated totals, including zero. Health is shown in hearts; attack is shown as `attack + 1`, without changing combat or adding weapon/critical bonuses. Display numbers are rounded to at most two decimal places.

Effects are fully dynamic: only positive passive and on-hit effect levels are listed, followed by the player's granted immunities without levels. Each section shows `None` when empty. Entries are sorted by effect identifier; immunity identifiers are normalized and deduplicated. Effects show only their glyph and level in Roman numerals (I, II, III, IV, V, etc.), with no effect name. Immunities show only their glyph, without a level. An unknown glyph uses `?` as a placeholder. These are effects granted by the registered trinkets, not all temporary potions affecting the player.

## Internal item slots

The entity inventory has 16 slots. Slots 0-12 remain equipment; three hidden `dorios:stat_display` items carry the sidebar:

| Slot | Content |
| --- | --- |
| 13 | First stats column, values in `nameTag` |
| 14 | Second stats column, values in `nameTag` |
| 15 | All effect sections: `Passive Effects` in `nameTag`, one lore string per effect or section heading |

The effect item lore continues with `Active Effects` and `Immunities`. Blank strings separate sections. Each lore entry is one line; the list is capped at 100 entries. The current registered effects fit comfortably within that limit. The UI reads name and lore through UtilityCraft's renamed `#hover_text` binding. Its effect label wraps within the sidebar and drives its own scroll-content height.

Each `collection_index` belongs to a direct child of its collection panel. Nested value labels inherit that context. Display slots have no interactive item controls; carriers have no item lock or keep-on-death flag and are excluded from equipment validation and returned items.

An already-existing 25-slot scroll has obsolete display carriers cleared from slots 16 onward when opened. Other item types are not deleted. An entity with fewer than 16 slots is skipped by the display writer; switching away from the scroll and holding it again recreates it with the current definition.

## Validation

Automated tests cover formatting, absent effects, name/lore sections, legacy carrier cleanup, slot boundaries, initialization before the first equipment tick, ownership filtering, reconciliation before calculation, one snapshot per opening and internal-item exclusion. In-game verification is still required for client label refresh, scrolling and touch/controller interaction.

## In-game guide

The vanilla How to Play icon at the upper-right opens `trinkets_guide.guide_panel`, a centered 176 by 166 UI overlay matching the standard inventory panel. It explains the scroll workflow, eight visible stats, effect glyphs, Roman levels and immunities. The original inventory and sidebar are hidden while the guide is shown. The guide uses the same radio-toggle pattern as UtilityCraft tabs: index 1 opens it and its X selects index 0. The X changes only the UI toggle; it does not send a container-close action. The guide needs no script or display item.

Guide text is localized through `ui.dorios:scroll_guide.*` keys in `en_US`, `es_ES`, `es_MX`, `pt_BR` and `pt_PT`. Each entry has 5 UI pixels of trailing space; section headings have an additional 6-pixel top gap.
