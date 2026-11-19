# Dice Throne Playtest 0.41.1 — Upkeep fix

Iceman joins X-Men with all board abilities, six upgrades, eight standard action cards, optional I Thaw, I Conquered! promo, Ice Shards, Dice Cube, Glide, The Freezer, board, leaflets and dice. He uses the supplied Marvel/X-Men shared card artwork. His normal deck has 32 cards, or 33 with the promo; The Freezer stays beside his board.

This hotfix corrects the actual start-of-turn Upkeep check. Disruption alone now enters Upkeep for any hero, and Gambit enters Upkeep for High Stakes on every own turn, including when he goes second. Previously these effects worked only if another effect independently triggered Upkeep, apart from Gambit's correctly handled opening turn as starting player. Disruption is resolved before Income, so its CP payment uses the CP already held.

To update from 0.41.0, extract this Upkeep Fix archive and merge its `dice-throne-offline` folder into your existing project, replacing matching files and keeping all other files. Apply the 0.41.0 Iceman update first if you are still on 0.40.0. Upload the updated `docs` contents to your existing hosting location. This is an update-only archive; it does not include artwork or a complete build. Existing hero IDs, card IDs, schema-2 saves and local storage remain compatible. The fix applies when the next turn begins; an already-skipped phase is not replayed or retroactively charged.

The five directed Glide Paths are Frostbite → Everybody Chill, Everybody Chill → Cold Treat, Cold Treat → Ice to Meet You, Hoarfrost → Thawsome, and Hail the King → Thawsome. Glide starts a distinct Roll Phase against the same opponent without a dice objective or an intervening Income or Main Phase. It can only be spent once per turn; secondary upgrade abilities cannot be glided to or from.

The Freezer has its own protected storage for five Ice Shards and one Glide. Authorised transfers allow partial quantities and conversion between transfers. Stored shards may be converted while collecting a large store instruction; ordinary Hero Board shard gains arrive as a whole batch. Frostbite's optional transfer occurs after damage, even without four matching numbers. Stored Glide can be transferred and spent in that end window. Only the supplied Freezer front scan is included.

Dice Cube locks the original lowest offensive die, or two lowest at its stack limit, with an explicit choice for ties. Frozen dice cannot be changed or rerolled by either player, including through cards and token effects. Separate ability, card and defence dice remain independent. Cube expires when the actual Roll Phase ends, including a failed phase; a skipped phase preserves it.

Existing legacy timing and deck reshuffling remain in use. The January 2027 global rules changes have not been enabled.

Validation: 559 rules groups passed, including 87 Gambit and 87 Iceman groups. Nine new Gambit groups exercise real turn entry, both seat positions, later turns, Disruption on all 35 heroes, CP timing, an actual Bo Staff attack and pending saved choices. All 226 simulated interface states, 35 artwork bundle lengths, offline script references, saved-state JSON checks and JavaScript syntax checks passed. Differential checks against 0.41.0 passed 4,986 comparisons across the 34 heroes other than Gambit (2,323 transitions), whose unrelated behaviour stays the same. Gambit's intended changed turn flow is covered by the new integration tests. Real-browser layout and installed-PWA update/offline play still require manual playtesting.

Run checks with Node.js:

```sh
node tests/iceman.test.cjs
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
