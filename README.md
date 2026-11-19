# Dice Throne Playtest 0.46.0 — Wolverine

Wolverine joins X-Men with his board abilities, five upgrades, three standard action cards, six Recovery/Frenzy discard cards, optional Feral! promo, leaflets, dice and two supplied token images. He uses the Marvel/X-Men shared card artwork. His normal deck has 32 cards, or 33 with the promo.

To update from 0.45.0, extract this Wolverine update and merge its `dice-throne-offline` folder into your existing project, replacing matching files and keeping the other files. Upload the updated `docs` contents to your existing hosting location. This archive includes changed and new files only. Existing hero IDs, card IDs, schema-2 saves and local storage remain compatible.

Rage can be spent immediately: one token and a selected hand card add 3 Attack damage, or three tokens draw one card. Incoming gains pause when necessary so existing Rage can be spent before collecting the whole batch. Excess is lost. Any holder can use Rage, and ordinary card-play restrictions such as Crimson Bands do not prevent spending it.

Wolverine's Recovery/Frenzy cards cannot be played normally. They count towards the hand limit and can be sold for 1 CP. Discarding one through Rage triggers its effect without gaining CP: Recovery may return to hand; Astonishing Recovery heals 2 if no Mask is rolled; Frenzy regains Rage; Astonishing Frenzy makes that token add 4 damage and regains Rage. Other discards and sales do not trigger these effects.

Alpha is Unique, removable and non-transferable. When inflicted by an Attack, both players immediately roll a separate die. If the attacker's result is lower, remove Alpha; ties retain it. The holder skips their next Income and removes Alpha, without an additional delayed skip when other Income restrictions coincide.

Healing, Rage gains and Alpha choices resolve before the affected Attack continues. Regenerate offers optional removal of a selected own status. Severe Threat II offers its Mask choice, and Barrage's large straight offers Rage or Alpha. Fastball Special! resolves its Rage gain, separate preventable self-damage, and Attack bonus in order. The Ultimate targets the sole opponent in this two-seat engine.

Paralyze blocks ordinary Offensive Ability Rage and Alpha, including subsidiary-roll gains, while retaining healing, drawing and damage. Cards, independent Rage spending and Ultimate effects remain available. Existing Upkeep fixes, legacy timing, Income rules and deck reshuffling remain in use. January 2027 global rules changes have not been enabled.

Validation: 71 Wolverine and 895 existing rules test groups passed (966 total), plus 334 simulated interface states, 40 artwork bundle lengths, offline script references, saved-state JSON and 86 JavaScript syntax checks. Differential checks against 0.45.0 passed 5,371 comparisons across all 39 previous heroes (2,504 transitions). All fifteen card crops and dice faces were inspected; 27 new WebP payloads validate and both supplied token images are preserved byte-for-byte. Real-browser layout, touch controls and installed-PWA update/offline launch still require manual playtesting.

Run checks with Node.js:

```sh
node tests/wolverine.test.cjs
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
