# Dice Throne Playtest 0.42.0 — Jean Grey

Jean Grey joins X-Men with her board abilities, five upgrades, nine standard action cards, optional Psionic Nexus! promo, Dark Phoenix overlay, four status effects, leaflets and dice. She uses the supplied Marvel/X-Men shared card artwork. Her normal deck has 32 cards, or 33 with the promo; the overlay is a separate component.

To update from 0.41.1, extract this Jean Grey update and merge its `dice-throne-offline` folder into your existing project, replacing matching files and keeping the other files. Apply the previous Upkeep fix first if you are still on 0.41.0. Upload the updated `docs` contents to your existing hosting location. This archive includes changed and new files only. Existing hero IDs, card IDs, schema-2 saves and local storage remain compatible.

Jean Grey begins her first own turn active. On each subsequent own Upkeep, she must switch between Jean Grey and Dark Phoenix, preserving all tokens. Jean draws one extra card at the beginning of Main Phase 1, including her opening turn; Dark Phoenix skips Income. Concussion and a Disarm Income skip are still cleared while Dark Phoenix skips that phase.

Three matching numbers on a successfully activated Offensive Ability give the active form's bonus before the printed effects: Jean draws one, while Dark Phoenix chooses two additional attack damage or Phoenix Burn. Unused dice count towards the matching numbers. Pure damage cannot be increased. Dark Phoenix may spend Flame Blast for attack damage; Synthesis! allows Jean Grey to do so for that turn. Incoming Acuity and Flame Blast arrive as whole batches, with the option to spend existing tokens before collection.

Force Field requires its own token and one other Positive Status token from its holder. It prevents half a chosen player's incoming damage, rounded up. Acuity can reroll an own die, gain CP or inflict Phoenix Burn; its rerolls respect Dice Cube and normal Ultimate locks. All three Positive effects can be transferred or gained through Conjure, although Flame Blast spending remains tied to Dark Phoenix or Jean's Synthesis permission.

Phoenix Burn forces Upkeep on every hero carrying it. Resolve its preventable two damage first, then roll to remove it on 5–6. A new Burn inflicted after removal in the same Upkeep triggers again; gaining one while already at its cap does not create another trigger. Existing Gambit High Stakes and Disruption turn-entry fixes remain in place.

Legacy timing, Income rules and deck reshuffling remain in use. January 2027 global rules changes have not been enabled.

Validation: 83 Jean Grey and 559 existing Marvel/X-Men rules groups passed (642 total), plus 255 simulated interface states, 36 artwork bundle lengths, offline script references, saved-state JSON and syntax checks. Differential checks against 0.41.1 passed 4,759 comparisons across all 35 previous heroes (2,227 transitions). All fifteen card crops and the Dark Phoenix board composition were inspected; four supplied token assets are preserved byte-for-byte. Real-browser layout, touch controls and installed-PWA update/offline launch still require manual playtesting.

Run checks with Node.js:

```sh
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
