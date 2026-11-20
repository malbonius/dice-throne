# Dice Throne Playtest 0.51.0 — Deadpool

Deadpool completes Singles with all board abilities, six upgrades, eight standard action cards, optional The Sound of an Eclaire! promo, leaflets, dice, tokens and separate RPS/Shoot references. His replacement unique-card sheet is included, and he uses normal shared card artwork. The draw deck has 32 standard cards, or 33 with the promo. Shoot and RPS references stay outside the deck.

To update from 0.50.0, extract this update and merge its `dice-throne-offline` folder into your existing project, replacing matching files and keeping the other files. Upload the updated `docs` contents to your existing hosting location. This is an update package containing changed and new files only. Existing hero/card IDs, schema-2 saves and local storage remain compatible.

Donut gains can be given to either player and provide modifiable healing rolls during the holder's Upkeep. Onomatopoeia changes owned dice during Roll Phases. RPS supports concealed choices, random opponent cards, tied rounds, transferred tokens, automatic Ultimate wins and the one-Shoot-only mirror-match rule. Finger Guns and Taco Truck expose their spoken bonuses; the optional Curmudgeon coin waives the speaking requirement.

Fourth Wall can gain any registered Positive from the other player's leaflet, resumes foreign gain choices safely, and restores Shoot before dealing damage. He Who Smelt It… and …Dealt It! work in either order. Do You Feel Lucky?! lets the opponent choose a hope number before their owned die is rolled and modified.

Validation: 90 Deadpool rules groups and all 1,287 previous groups passed (1,377 total), together with 471 simulated interface states, 45 artwork bundles, 96 JavaScript syntax checks, offline script references and saved-state JSON round-trips. Exact comparisons against 0.50.0 passed 6,237 checks across all 44 previous heroes (2,921 transitions). All fifteen unique-card crops, six dice faces, three RPS references and the Shoot sides were inspected; 33 new WebP payloads validate and all three supplied token images preserve their source bytes. Browser layout, touch controls and installed-PWA update/offline launch remain manual playtesting checks.

SYSTEM.md is updated. All five Singles are complete and the agreed incremental architecture pass is ready as the next dedicated release. This hero update retains legacy timing, Income and primary-deck reshuffling; January 2027 global rules remain disabled.

Run `node tests/deadpool.test.cjs` for Deadpool's rules checks, `node tests/ui-and-offline.test.cjs` for interface/offline checks, and the other hero test files under `tests` for the full regression suite.
