# Dice Throne Playtest 0.36.0 — Scarlet Witch

Scarlet Witch joins Marvel with all board abilities, eight upgrades, six standard action cards, optional Hexellent! promo, board, leaflets, dice and four status-token images. She uses the supplied Marvel shared cards.

To update from 0.35.0, extract the Scarlet Witch update archive and merge its `dice-throne-offline` folder into your existing project, replacing matching files. Upload the changed `docs` files to GitHub Pages. This archive contains the update only. Complete builds are provided only when requested.

Open the hosted game online after updating and wait for the offline-ready indicator before using it offline. The service-worker cache is version 0.36.0. Existing saves retain the same storage key, schema and hero IDs.

Reality Warp replaces the fifth offensive die with a Scarlet Witch die for one Offensive Roll Phase. Other heroes can use its number for straights and matching numbers, but cannot use its symbol. Scarlet Witch mirror matches retain its symbols. The borrowed die belongs to its current roller for manipulation.

Probability Manipulation changes an owned even die up or down by one. Conjure gains a Positive Status Effect from a chosen player's leaflet, with an explicit opponent discard-or-allow choice, or inflicts Reality Warp. Crackle counts remaining Positive/Negative token instances, excludes Unique effects, caps each bonus at three and permits two spends per turn.

Jinx follows the supplied advanced clarifications: base outcomes occur once across the whole ability, limiting base damage to nine; Jinx II scales its multiplication and Crown repeats. Each reroll has its own dice context, so earlier resolved dice cannot be altered or used for Samesies. Probability gained from an earlier roll may affect a later reroll.

Existing legacy timing and deck reshuffling remain in use. The January 2027 global rules change has not been enabled.

Validation: 51 Scarlet Witch rules groups and the previous 145 Marvel rules groups passed. All 123 interface states, 30 artwork bundle lengths, cached script references and saved-state JSON checks passed. Differential checks against 0.35.0 passed 4,085 comparisons across the previous 29 heroes (1,914 transitions). All 15 Scarlet Witch card crops were inspected against IDs/costs; supplied token bytes are preserved exactly. Browser layout and installed-PWA update/offline play still require manual playtesting.

Run checks with Node.js:

```sh
node tests/scarlet-witch.test.cjs
node tests/loki.test.cjs
node tests/doctor-strange.test.cjs
node tests/black-widow.test.cjs
node tests/captain-marvel.test.cjs
node tests/ui-and-offline.test.cjs
```

See `SYSTEM.md` for the development handover and timing decisions.
