# Dice Throne Playtest 0.32.0 — Black Widow

Black Widow joins the Marvel set, using the supplied Marvel shared card artwork. Includes her complete standard deck, optional Smoke Screen! promo, board, leaflets, dice and status artwork.

To update from 0.31.2, extract the update archive and merge its `dice-throne-offline` folder into your existing project, replacing matching files. Upload the changed `docs` files to GitHub Pages. The full archive contains the complete build instead.

Open the hosted game online once after updating and allow the offline-ready indicator to appear before using it offline. The service-worker cache is now version 0.32.0. Existing saves use the same storage key, save schema and hero IDs.

Black Widow includes upgrades during Roll Phases; free upgrades, top-card ordering and searches through Covert Ops; individual Time Bomb countdowns and transfers; Agility and Elude!; Sabotage's additional Roll Attempt; upgrade-sensitive attacks; and Recon/Ultimate searches that shuffle before passive draws.

The existing legacy timing and deck-reshuffle rules remain in use. The January 2027 rules change has not been enabled.

Validation: 34 Black Widow rules test groups; 40 interface rendering states; all artwork bundle lengths and script/cache references; saved-state JSON round-trip; 3,933 comparisons against the 0.31.2 engine across all 25 existing heroes (1,857 state transitions). Live browser and installed-PWA playtesting remains to be done: this environment could not launch Chromium.

Run the included checks with Node.js:

```sh
node tests/black-widow.test.cjs
node tests/ui-and-offline.test.cjs
```

See `SYSTEM.md` for the current development handover and Black Widow timing decisions.
