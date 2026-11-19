# Dice Throne Playtest 0.35.0 — Loki

Loki joins the Marvel set with all board abilities, eight upgrades, six standard action cards, the optional Dash of Mischief! promo, three Illusion cards, board, leaflets, dice and token artwork. He uses the supplied Marvel shared cards.

To update from 0.34.0, extract the Loki update archive and merge its `dice-throne-offline` folder into your existing project, replacing matching files. Upload the changed `docs` files to GitHub Pages. This archive contains the update only. Complete builds are provided only when requested.

Open the hosted game online after updating and wait for the offline-ready indicator before using it offline. The service-worker cache is version 0.35.0. Existing saves retain the same storage key, schema and hero IDs.

Illusion lets Loki arrange three hidden cards or shuffle them, then lets the attacker choose and reveal one. His Defensive Ability still resolves if Illusion prevents all damage. Two half-prevention results prevent all damage, with the normal rounding and flat-prevention order.

Bags of Tricks resolve separately during Upkeep. Their original Loki chooses the middle result, including after transfers and in mirror matches. Healing and damage accumulate until the end of Upkeep. Outwit! uses its own printed amounts and a separate damage-prevention window.

Spellbound blocks individual named abilities through upgrades. Multiple activators for the same named ability are blocked together; separately named upgrade abilities remain separate. An Ultimate cannot be covered. Tokens present at the start of the holder's Roll Phase expire when that phase concludes; defensive Spellbound applies to their following Roll Phase. Board flips clear bindings. Shared removal cards, Cleanse and Doctor Strange's Winds can select a particular binding or Bag.

Existing legacy timing and deck reshuffling remain in use. The January 2027 global rules change has not been enabled.

Validation: 42 Loki rules groups, 34 Doctor Strange groups, 34 Black Widow groups, 35 Captain Marvel groups and 74 interface rendering states passed. All 29 artwork bundle lengths, cached script references and saved-state JSON checks passed. Differential checks against 0.34.0 passed 4,017 comparisons across the previous 28 heroes (1,886 transitions). All 15 Loki card crops were inspected against their IDs and costs; the supplied token bytes are preserved exactly. Browser layout and installed-PWA update/offline play still require manual playtesting.

Run the included checks with Node.js:

```sh
node tests/loki.test.cjs
node tests/doctor-strange.test.cjs
node tests/black-widow.test.cjs
node tests/captain-marvel.test.cjs
node tests/ui-and-offline.test.cjs
```

See `SYSTEM.md` for the development handover and timing decisions.
