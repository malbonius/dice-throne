# Dice Throne Playtest 0.38.0 — Thor

Thor joins Marvel with all board abilities, nine upgrade cards (including Hammered III), six standard action cards, optional Bifrost! promo, Mjölnir, Electrokinesis, Guard Break, board, leaflets and dice. He uses the supplied Marvel shared card artwork. His standard deck has 33 cards; including the promo gives 34.

To update from 0.37.0, extract the Thor update archive and merge its `dice-throne-offline` folder into your existing project, replacing matching files. Upload the changed `docs` files to GitHub Pages. This archive contains the update only. Complete builds are provided only when requested.

Open the hosted game online after updating and wait for the offline-ready indicator before using it offline. The service-worker cache is version 0.38.0. Existing saves retain the same storage key, schema and hero IDs.

Mjölnir starts with its owner. Discard a hand card to throw or retrieve it; ability movements do not require a discard. Each throw resolves its own one-damage event before the next movement. Optional multi-movement abilities permit stopping at any point, including zero movements. Mirror matches track each owner's hammer separately. An Ultimate locks the opponent's responses and passive Energy Absorption during hammer damage as well as its main damage.

Electrokinesis caps at four. Once per turn in either of your Main Phases, spend four to draw one card. A gain beyond the cap offers this draw first when legal, then adds the pending excess. Guard Break retains its end-of-Offensive-Roll-Phase timing. Chain Lightning lets you choose any two subsidiary dice; its collateral damage resolves separately. Indomitable Will saves only the lethal attack for which it was played, if its final die shows Worthy.

Existing legacy timing and deck reshuffling remain in use. The January 2027 global rules change has not been enabled.

Validation: 69 Thor and 246 previous Marvel rules groups passed. All 155 simulated interface states, 32 artwork bundle lengths, cached script references and saved-state JSON checks passed. Differential checks against 0.37.0 passed 4,482 comparisons across the previous 31 heroes (2,111 transitions). All 16 card crops were inspected against IDs/costs; supplied token bytes are preserved exactly. Browser layout and installed-PWA update/offline play still require manual playtesting.

Run checks with Node.js:

```sh
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
