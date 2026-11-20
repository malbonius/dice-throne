# Dice Throne Playtest 0.50.0 — Santa

Santa joins Singles with his board abilities, seven upgrades, seven standard action cards, optional Rebel Without a Claus! promo, leaflets, dice and supplied token artwork. He uses normal shared card artwork. His deck contains 32 standard cards, or 33 with the promo.

To update from 0.49.0, extract this update and merge its `dice-throne-offline` folder into your existing project, replacing matching files and keeping the other files. Upload the updated `docs` contents to your existing hosting location. This is an update package containing changed and new files only. Existing hero/card IDs, schema-2 saves and local storage remain compatible.

Cheer rerolls an owned die or changes it to 6; Egg Nog rolls a Santa die for damage, healing, CP or a card. Both tokens work after being transferred to other heroes. Existing tokens can be spent before an overflowing batch is collected. Ho, Ho, Ho! supports Cheer on eligible board dice while its card die is being rolled.

Fireside Chat uses an opposed roll with each die assigned to its actual owner. Naughty or Nice handles its opponent rewards and optional Extremely Naughty! apology choice. White Elephant Gift! has separate concealment and opponent-guess screens. Comfort and Joy! clears the previous Roll Phase's expiring effects and grants another Offensive Roll Phase against the same opponent if both survive.

Validation: 93 Santa rules groups and all 1,194 previous groups passed (1,287 total), together with 435 simulated interface states, 44 artwork bundles, 94 JavaScript syntax checks, offline script references and saved-state JSON round-trips. Exact comparisons against 0.49.0 passed 5,959 checks across all 43 previous heroes (2,777 transitions). All fifteen card crops and six dice faces were inspected; 27 new WebP payloads validate and both supplied token images preserve their source bytes. Browser layout, touch controls and installed-PWA update/offline launch remain manual playtesting checks.

SYSTEM.md is updated with timing and implementation details. Legacy timing, Income and primary-deck reshuffling remain enabled; January 2027 global rules remain disabled. Deadpool is now the only remaining Singles character before the dedicated architecture pass, pending rescans of his unique cards.

Run `node tests/santa.test.cjs` for Santa's rules checks, `node tests/ui-and-offline.test.cjs` for interface/offline checks, and the other hero test files under `tests` for the full regression suite.
