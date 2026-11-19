# Dice Throne Playtest 0.43.0 — Psylocke

Psylocke joins X-Men with her board abilities, six upgrades, eight standard action cards, optional Depths of the Mind! promo, leaflets, dice, tokens and separate Manifest Die. She uses the supplied Marvel/X-Men shared card artwork. Her normal deck has 32 cards, or 33 with the promo.

To update from 0.42.0, extract this Psylocke update and merge its `dice-throne-offline` folder into your existing project, replacing matching files and keeping the other files. Upload the updated `docs` contents to your existing hosting location. This archive includes changed and new files only. Existing hero IDs, card IDs, schema-2 saves and local storage remain compatible.

Manifest rolls separately with the first Offensive Roll Attempt. Once per global turn, either swap its value with one offensive die before activation, or use half its value, rounded up, as an Attack Modifier. The separate die is protected from ordinary dice manipulation; Construct! can reroll it. After a swap, the inserted die behaves as an ordinary offensive die. Dice Cube follows the supplied Manifest clarification, including recalculating the frozen dice from first-roll values.

Infiltration can force a reroll of a real Defensive Roll Attempt die belonging to either player. It cannot affect subsidiary rolls such as Agility. Psylocke's Agility uses the existing half-prevention rules and has its own supplied artwork.

Paralyze blocks status gains and inflictions associated with the holder's ordinary Offensive Ability, including delayed and after-damage gains. Damage, healing, CP, drawing, Companions and resources still work. Ultimates, passives, cards, Attack Modifiers and token actions remain available. Gambit's Molecular Acceleration and Iceman's Freezer retain their documented exceptions. Paralyze expires when an actual Offensive Roll Phase concludes; skipping that phase with Knockdown preserves it.

Forced! offers a choice of one Positive Status type whose gain Paralyze prevented. Strong Will! spends Agility for guaranteed half prevention without rolling. Mind Altering! heals for the Manifest damage bonus. Deft Maneuver! reveals the opposing hand in a dismissible view.

Existing Upkeep fixes remain in place. Legacy timing, Income rules and deck reshuffling remain in use. January 2027 global rules changes have not been enabled.

Validation: 97 Psylocke and 642 existing Marvel/X-Men rules groups passed (739 total), plus 280 simulated interface states, 37 artwork bundle lengths, offline script references, saved-state JSON and syntax checks. Differential checks against 0.42.0 passed 5,156 comparisons across all 36 previous heroes (2,415 transitions). All fifteen card crops and dice faces were inspected; all four supplied token/component assets are preserved byte-for-byte. Real-browser layout, touch controls and installed-PWA update/offline launch still require manual playtesting.

Run checks with Node.js:

```sh
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
