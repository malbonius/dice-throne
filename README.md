# Dice Throne Playtest 0.33.0 — Captain Marvel

Captain Marvel joins the Marvel set with her complete standard deck, optional Ace Pilot! promo, board, leaflets, dice and status artwork. She uses the supplied Marvel shared cards. This build also retains Black Widow and the supplied Vibranium Suit artwork from 0.32.1.

To update from 0.32.1, extract the Captain Marvel update archive and merge its `dice-throne-offline` folder into your existing project, replacing matching files. Upload the changed `docs` files to GitHub Pages. The full archive contains the complete build instead.

Open the hosted game online after updating and allow the offline-ready indicator to appear before using it offline. The service-worker cache is now version 0.33.0. Existing saves retain the same storage key, schema and hero IDs.

Captain Marvel includes Cosmic Ray age tracking, once-per-turn spending, choice of two bonus dice, overflow handling and same-turn exceptions; Radiance on Defensive Roll Attempt dice; compulsory Cosmic Flare damage accumulated with the other Upkeep damage; all board upgrades and their bonus abilities; and her action cards.

Existing legacy timing and deck reshuffling remain in use. The January 2027 rules change has not been enabled.

Validation: 34 Captain Marvel test groups and the existing 34 Black Widow groups passed; 49 interface rendering states passed; all artwork bundle lengths and cached script references checked. Differential comparison against 0.32.1 passed 4,003 checks across the existing 26 heroes, covering 1,881 state transitions. The 15 Captain Marvel card images were checked against their IDs, titles and costs. Live browser and installed-PWA playtesting is still required; this environment could not launch Chromium during the preceding development work.

Run the included checks with Node.js:

```sh
node tests/captain-marvel.test.cjs
node tests/black-widow.test.cjs
node tests/ui-and-offline.test.cjs
```

See `SYSTEM.md` for the current development handover and timing decisions.
