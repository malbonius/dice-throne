# Dice Throne Playtest 0.37.0 — Spider-Man

Miles Morales: Spider-Man joins Marvel with all board abilities, four upgrades, ten standard action cards, optional Tingling! promo, two defensive abilities, board, leaflets, dice and three status-token images. He uses the supplied Marvel shared cards.

To update from 0.36.0, extract the Spider-Man update archive and merge its `dice-throne-offline` folder into your existing project, replacing matching files. Upload the changed `docs` files to GitHub Pages. This archive contains the update only. Complete builds are provided only when requested.

Open the hosted game online after updating and wait for the offline-ready indicator before using it offline. The service-worker cache is version 0.37.0. Existing saves retain the same storage key, schema and hero IDs.

The supplied V2 leaflet is used: Combo and Invisibility are removable Unique effects that cannot be transferred. A newly inflicted Webbed deals two isolated undefendable damage. It turns the next normal attack undefendable and is then consumed. Ensnare applies its new Webbed after the attack's damage calculation, preserving it for a later attack. Status prevention can block that delayed token and its two damage.

Combo offers an extra Offensive Roll Phase against the same opponent after the attack concludes, at most once per turn, without Income or an intervening Main Phase. Invisibility allows one defensive ability against an undefendable or pure attack. Choose Counterpunch or Spider-Sense; Spider-Sense can instead discard Invisibility for an additional selected-dice Roll Attempt. Swing Escape changes its success symbol before the defence resolves.

Existing legacy timing and deck reshuffling remain in use. This hero uses the supplied updated leaflet; the January 2027 global rules change has not been enabled.

Validation: 50 Spider-Man rules groups and the previous 196 Marvel rules groups passed. All 138 interface states, 31 artwork bundle lengths, cached script references and saved-state JSON checks passed. Differential checks against 0.36.0 passed 4,286 comparisons across the previous 30 heroes (2,014 transitions). All 15 card crops were inspected against IDs/costs; supplied token bytes are preserved exactly. Browser layout and installed-PWA update/offline play still require manual playtesting.

Run checks with Node.js:

```sh
node tests/spider-man.test.cjs
node tests/scarlet-witch.test.cjs
node tests/loki.test.cjs
node tests/doctor-strange.test.cjs
node tests/black-widow.test.cjs
node tests/captain-marvel.test.cjs
node tests/ui-and-offline.test.cjs
```

See `SYSTEM.md` for the development handover and timing decisions.
