# Dice Throne Playtest 0.44.0 — Rogue

Rogue joins X-Men with her board abilities, six upgrades, eight standard action cards, optional Wind Up! promo, leaflets, dice and four supplied token images. She uses the Marvel/X-Men shared card artwork. Her normal deck has 32 cards, or 33 with the promo.

To update from 0.43.0, extract this Rogue update and merge its `dice-throne-offline` folder into your existing project, replacing matching files and keeping the other files. Upload the updated `docs` contents to your existing hosting location. This archive includes changed and new files only. Existing hero IDs, card IDs, schema-2 saves and local storage remain compatible.

Ionic Energy (1) and (2) share one stack limit of four, increased permanently by Ionic Intensity! Each token adds its indicated Attack damage. Spend up to two tokens per global turn, or pay 1 CP to allow four; Sweet Tea! also permits four. Incoming mixed batches let you choose which values fit. A full stack cannot replace an old token with a stronger new one. Eligible existing tokens can be spent before collecting an overflowing batch.

Ionic Drive grants one token after successful non-Ultimate Attack damage: value 1 for damage 1–6, or value 2 for damage 7 or more. It uses damage after prevention, including Iceman's combined Attack and collateral damage, and does not trigger from return damage, isolated damage, health stealing or fully prevented damage.

Influence rolls once per token at the start of an actual Offensive Roll Phase. Each 1–3 removes one Roll Attempt, then all Influence is removed. Entangle can reduce the remaining allowance further. Losing all attempts leaves no ordinary dice to alter, but One More Time! can restore an attempt and Déjà Vu can start a fresh Roll Phase without the old penalty. A Knockdown skip preserves Influence.

Skyward uses two separate dice, one per player. Its holder can pay 1 CP repeatedly to reroll their own die. Resolve once after the final roll: greater returns 3 damage, equal prevents 4, lower does nothing. Cloudy! doubles that resolved effect. Normal dice manipulation and Sugah! can affect these dice; Infiltration and Radiance cannot.

Leach steals Health without dealing Attack damage and permits repeated 1 CP increases to its effect die. Southern Belle! resolves each listed On-symbol result once; Ionic Intensity! counts every matching die. Back Off! uses the opponent's dice and retains their Influence tokens.

Paralyze blocks Rogue's ordinary board status gains and inflictions while retaining damage, CP and health stealing. Ionic Drive, cards, token actions and Ultimates remain valid. The Psylocke response window now also preserves Forced! choices when a blocked gain happened during an earlier step of an ability.

Existing Upkeep fixes, legacy timing, Income rules and deck reshuffling remain in use. January 2027 global rules changes have not been enabled.

Validation: 72 Rogue and 739 existing rules test groups passed (811 total), plus 298 simulated interface states, 38 artwork bundle lengths, offline script references, saved-state JSON and 82 JavaScript syntax checks. Differential checks against 0.43.0 passed 5,338 comparisons across all 37 previous heroes (2,500 transitions). All fifteen card crops and dice faces were inspected; all four supplied token assets are preserved byte-for-byte. Real-browser layout, touch controls and installed-PWA update/offline launch still require manual playtesting.

Run checks with Node.js:

```sh
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
