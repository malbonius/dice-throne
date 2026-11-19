# Dice Throne Playtest 0.40.0 — Gambit

Gambit joins X-Men with all board abilities, six upgrades, eight standard action cards, optional Charged Up! promo, four separate Ace cards, Molecular Acceleration, Dissolution, Disruption, board, leaflets and dice. He uses the supplied Marvel/X-Men shared card artwork. His normal deck has 32 cards, or 33 with the promo; the four Aces stay beside his board.

To update from 0.39.0, extract the Gambit update archive and merge its `dice-throne-offline` folder into your existing project, replacing matching files. Upload the changed `docs` files to GitHub Pages. This archive contains the update only. Complete builds are provided only when requested.

Open the hosted game online after updating and wait for the offline-ready indicator before using it offline. The service-worker cache is version 0.40.0. Existing saves retain the same storage key, schema and hero IDs.

All four Aces start face up and uncharged. Diamond has three slots, Heart and Spade four each, Club two. Allocate an acceleration batch before its charges are placed; you cannot explode an Ace part-way through it. A fully charged Ace can explode as an Attack Modifier, normally once per global turn across all Aces. Bojutsu and Gambit’s Gambit! provide extra allowances. All-In repeats the entire Explode Effect. An exploded Ace flips face down after resolving and loses its charges; regaining it returns it face up without charges. Mandatory regain instructions and optional “up to” instructions have separate controls.

High Stakes occurs in Upkeep, including Gambit's opening turn if he starts. Choose two or five dice; a one busts only the five-dice version, losing all its rewards and removing one existing charge. Card Magic! can reroll up to two dice sequentially, including the same die twice. Ultimate subsidiary dice remain final. The starting player still skips their first Income Phase.

Dissolution can heal a chosen player two or remove one of that player's Negative Status tokens in your own Main Phase. Disruption offers losing one CP or receiving two damage during Upkeep, then is removed. Its damage is accumulated with other ordinary Upkeep damage and can be prevented normally.

Existing legacy timing and deck reshuffling remain in use. The January 2027 global rules changes have not been enabled.

Validation: 78 Gambit and 385 previous Marvel/X-Men rules groups passed. All 198 simulated interface states, 34 artwork bundle lengths, four Ace assets, cached script references and saved-state JSON checks passed. Differential checks against 0.39.0 passed 4,908 comparisons across the previous 33 heroes (2,311 transitions). All 15 deck-card and four Ace crops were inspected; supplied token bytes are preserved exactly. Browser layout and installed-PWA update/offline play still require manual playtesting.

Run checks with Node.js:

```sh
node tests/gambit.test.cjs
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
