# Dice Throne Playtest 0.49.0 — Mystic Brawler

Mystic Brawler joins Singles with all board abilities, six upgrades, nine standard action cards, the optional Elemental Calling! promo, leaflets, dice and supplied token artwork. He uses normal shared card artwork. His deck has 33 standard cards, or 34 with the promo.

To update from 0.48.0, extract this update and merge its `dice-throne-offline` folder into your existing project, replacing matching files and keeping the other files. Upload the updated `docs` contents to your existing hosting location. This archive contains changed and new files only. Existing hero/card IDs, schema-2 saves and local storage remain compatible.

Choose Ocean, Mountain or Sky when gaining Strengths, with separate limits of 3, 2 and 2. Ocean provides a once-per-turn Upkeep choice; Mountain adds persistent Attack damage; Sky adds defence dice when defence activates. Strength batches resolve together. All three are removable, non-transferable Unique tokens.

Strong Arm has a targeting step and an opposed roll with each die owned by its actual roller. Tectonic Punch accounts for the Mountain removed or gained before damage. Wild Strength! offers its printed selected-dice reroll, including on own Ultimates, and Haka! can increase the available reroll budget. Heavy Hand! respects die ownership and frozen dice.

Validation: 70 Mystic Brawler rules groups plus all 1,124 previous groups (1,194 total); 399 simulated interface states; 43 artwork bundles; 92 JavaScript syntax checks; 6,008 exact baseline comparisons and 2,813 transitions across all 42 previous heroes. All sixteen card crops and six dice faces were inspected; 30 new WebP payloads validate and all four supplied token images preserve their source bytes. Offline script references and saved-state JSON round-trips also pass. Real-browser layout, touch controls and installed-PWA update/offline launch remain manual playtesting checks.

Legacy timing, Income and primary-deck reshuffling remain enabled. January 2027 global rules remain disabled. Deadpool is deferred pending rescans of his unique cards; two Singles characters remain before the dedicated architecture pass. SYSTEM.md is updated with the implementation and timing decisions.

Run `node tests/mystic-brawler.test.cjs` for the new rules checks, `node tests/ui-and-offline.test.cjs` for interface/offline checks, and the other hero test files under `tests` for the regression suite.
