# Dice Throne Playtest 0.47.0 — Alchemist

Alchemist joins the Singles group with her board abilities, five upgrades, ten standard action cards, optional Refill! promo, leaflets, dice and five supplied token images. Singles use the normal shared card artwork. Her standard deck has 33 cards, or 34 with the promo.

To update from 0.46.0, extract this update and merge its `dice-throne-offline` folder into your existing project, replacing matching files and keeping the other files. Upload the updated `docs` contents to your existing hosting location. This archive includes changed and new files only. Existing hero/card IDs, schema-2 saves and local storage remain compatible.

Potions attach to individual ability slots. Their limits apply across the whole board: six Punchify, two Bolsterate, three Cleansitude and one Toxification. Attachments resolve before spending. Punchify adds Attack damage; Bolsterate prevents damage; Cleansitude heals or removes an own status; Toxification inflicts Poison on a chosen player. Potions are Unique, removable and non-transferable. Paralyze does not stop attachments or independent spends.

The Lab attaches a Potion during each own Upkeep, including the first player's first turn. Its upgrade rolls to determine the number. At any time an own die can legally be altered, The Lab may remove an attached Potion to reroll it. Removing a Potion does not activate its spend effect. Frozen dice and accepted Ultimate dice remain protected.

Offensive Potions are spent after the ability's printed effects and before targeting. Chain Reaction can additionally spend one Potion from another Offensive Ability; Chemical Trip! can spend up to three Offensive Potions. Passivation rolls five, attaches per Crucible, then permits spending defensive Potions. Its attacker receives the documented priority opportunity before those spends. Newly attached Potions can be used in the proper window, subject to the leaflet's rule about slots occupied at the start of the Offensive Roll Phase.

The interface shows the attached Potion inventory by ability and provides choices for placement, spending, removal and targets. All new state is serialisable. The update also preserves the existing Upkeep fixes and makes selected Time Bomb removal honour the chosen countdown.

Validation: 83 Alchemist and 966 existing rules test groups (1,049 total), 357 simulated interface states, 41 artwork bundle lengths, offline script references, saved-state JSON and 88 JavaScript syntax checks passed. Differential checks against 0.46.0 passed 5,590 comparisons across all 40 previous heroes (2,613 transitions). All sixteen card crops and six dice faces were inspected; 31 new WebP payloads validate and all five supplied token images are preserved byte-for-byte. Real-browser layout, touch controls and installed-PWA update/offline launch remain manual playtesting checks.

Legacy timing, Income and reshuffling remain in use. January 2027 global rules changes remain disabled. Four Singles characters remain before the agreed dedicated architecture pass.

Run the new rules checks with `node tests/alchemist.test.cjs`, the interface/offline checks with `node tests/ui-and-offline.test.cjs`, and the other hero test files under `tests` for the full regression suite.

See `SYSTEM.md` for the current development handover and timing decisions.
