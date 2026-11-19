# Dice Throne Playtest 0.39.0 — Cyclops

Cyclops starts the X-Men set with all board abilities, six upgrades, nine Leadership action cards, optional No Train, No Gain! promo, Battle Plan, Support, Focus Fire, board, leaflets and dice. He uses the supplied Marvel/X-Men shared card artwork. His standard deck has 33 cards; including the promo gives 34.

To update from 0.38.0, extract the Cyclops update archive and merge its `dice-throne-offline` folder into your existing project, replacing matching files. Upload the changed `docs` files to GitHub Pages. This archive contains the update only. Complete builds are provided only when requested.

Open the hosted game online after updating and wait for the offline-ready indicator before using it offline. The service-worker cache is version 0.39.0. Existing saves retain the same storage key, schema and hero IDs.

Leadership cards count for their owner for the entire global turn, including the opponent's turn. Explicit “before then” windows let you play eligible cards before resolving the next effect. Later conditional phrases count the Leadership cards played by the time the phrase resolves. Taking a Leadership card into hand, selling it, or playing an upgrade/shared/promo card does not count as playing Leadership.

Battle Plan offers three separately once-per-turn options: examine the opponent's hand, inspect the top three cards and take up to one Leadership card while discarding/ordering the others, or inflict Focus Fire. Support can grant CP, reroll a chosen player's current die, or draw a card. Token gains arrive as whole batches: spend existing tokens before collecting an overflowing batch; you cannot collect part of it, spend, then collect the rest.

Focus Fire persistently adds one incoming Attack damage per token, to a maximum of two, including Ultimates. It does not increase pure or non-Attack damage. Recourse offers its printed Blast choice; Recourse II may remove two Battle Plan to activate once against an undefendable attack. The extra teammate-only Selfless! option is not applicable to this two-opponent engine.

Existing legacy timing and deck reshuffling remain in use. The supplied leaflet permits Never Let Go! to be played without discarding tokens or changing a die, while still counting as Leadership. The January 2027 restriction on that play and other global rules changes have not been enabled.

Validation: 70 Cyclops and 315 previous Marvel rules groups passed. All 175 simulated interface states, 33 artwork bundle lengths, cached script references and saved-state JSON checks passed. Differential checks against 0.38.0 passed 4,683 comparisons across the previous 32 heroes (2,211 transitions). All 16 card crops were inspected against IDs/costs; supplied token bytes are preserved exactly. Browser layout and installed-PWA update/offline play still require manual playtesting.

Run checks with Node.js:

```sh
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
