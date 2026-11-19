# Dice Throne Playtest 0.45.0 — Storm

Storm joins X-Men with her board abilities, five upgrades, nine standard action cards, optional Atmokinesis! promo, leaflets, dice and three supplied token/Companion images. She uses the Marvel/X-Men shared card artwork. Her normal deck has 32 cards, or 33 with the promo.

To update from 0.44.0, extract this Storm update and merge its `dice-throne-offline` folder into your existing project, replacing matching files and keeping the other files. Upload the updated `docs` contents to your existing hosting location. This archive includes changed and new files only. Existing hero IDs, card IDs, schema-2 saves and local storage remain compatible.

Lightning is a Companion placed on one of eight outlined abilities. An ability already Charged before activation offers its Charged Effect or lets you keep the token. Each ability's Charged Effect can be used once per global turn. Placing a second Lightning on the same ability immediately removes both and deals a separate, preventable 2 damage. Multiple gains are placed one at a time. Maelstrom places up to four Lightning on different other abilities; Gust's two straights share one charge.

Tornado borrows opposing dice before the first Offensive Roll Attempt. These join all Roll Attempts and count as the holder's dice for manipulation and Hex. Foreign symbols cannot activate abilities, but their numbers form straights and numerical matches. Same-hero borrowed dice retain their symbols. Borrowed dice keep their original artwork, can be held, and are considered by Dice Cube. They return when the Roll Phase ends. Super Tornado! removes three tokens to borrow five dice, respecting the opponent's available five.

Maelstrom requires the six-number straight. Lightning Strike! activates an eligible uncharged ability's Charged Effect. Charged Opposites Attract can reroll one or both effect dice once. Tsunami! permits up to three sequential rerolls of the same or different eligible dice; unused rerolls cannot be saved.

Wind Shear prevents 2 incoming Attack damage, then deals a separate, preventable 2 damage to the opponent. It still works when Shadows avoids the Attack or Parlay reduces it to zero, following the updated supplied clarification. Raging Winds! doubles the next Wind Shear spent that turn. Ultimates cannot be interrupted with Wind Shear.

Paralyze blocks ordinary board Tornado/Wind Shear gains. Lightning remains a Companion, and its independent spend effects, cards and Ultimates remain available. Existing Upkeep fixes, legacy timing, Income rules and deck reshuffling remain in use. January 2027 global rules changes have not been enabled.

Validation: 84 Storm and 811 existing rules test groups passed (895 total), plus 316 simulated interface states, 39 artwork bundle lengths, offline script references, saved-state JSON and 84 JavaScript syntax checks. Differential checks against 0.44.0 passed 5,524 comparisons across all 38 previous heroes (2,592 transitions). All fifteen card crops and dice faces were inspected; 28 new WebP payloads validate and all three supplied token/Companion images are preserved byte-for-byte. Real-browser layout, touch controls and installed-PWA update/offline launch still require manual playtesting.

Run checks with Node.js:

```sh
node tests/storm.test.cjs
node tests/rogue.test.cjs
node tests/psylocke.test.cjs
node tests/jean-grey.test.cjs
node tests/gambit.test.cjs
node tests/iceman.test.cjs
node tests/cyclops.test.cjs
node tests/thor.test.cjs
node tests/spider-man.test.cjs
node tests/scarlet-witch.test.cjs
node tests/loki.test.cjs
node tests/doctor-strange.test.cjs
node tests/black-widow.test.cjs
node tests/captain-marvel.test.cjs
node tests/ui-and-offline.test.cjs
```

See `SYSTEM.md` for the development handover and timing decisions.
