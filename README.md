# Dice Throne Playtest 0.34.0 — Doctor Strange

Doctor Strange joins the Marvel set with his Book of Vishanti, all nine Spell cards, five standard action cards, optional Hosts of Hoggoth! promo, board, leaflets, dice and status artwork. He uses the supplied Marvel shared cards. The build retains Black Widow, Captain Marvel and the supplied Vibranium Suit artwork.

To update from 0.33.0, extract the Doctor Strange update archive and merge its `dice-throne-offline` folder into your existing project, replacing matching files. Upload the changed `docs` files to GitHub Pages. The full archive contains the complete build instead.

Open the hosted game online after updating and allow the offline-ready indicator to appear before using it offline. The service-worker cache is now version 0.34.0. Existing saves retain the same storage key, schema and hero IDs.

Doctor Strange includes once-per-turn preparation from hand, separate Prepare/Cast effects, sequential spell chains, discard casting with recursion protection, his top-five Ultimate, Premonition's Income draw/return choices, Déjà Vu roll restarts and Crimson Bands' card restriction. Flames of Faltine starts prepared, with no Prepare effect, and is excluded from the initial draw deck. He has no ability-upgrade cards.

This release also corrects Captain Marvel's Barrel Roll: its On-Photon bonus adds 2 damage once when either subsidiary die shows Photon, rather than adding 2 per Photon. The explicit multiplication for Ascend/Cosmic Flare is unchanged.

Existing legacy timing and deck reshuffling remain in use. The January 2027 rules change has not been enabled.

Validation: 34 Doctor Strange rules groups, 34 Black Widow groups, 35 Captain Marvel groups, and 61 interface rendering states passed. All 28 artwork bundle lengths, cached scripts and saved-state JSON checks passed. Differential checks across the previous 27 heroes passed 4,130 comparisons (1,944 transitions), with the deliberate Barrel Roll correction applied to the comparison baseline. All 15 Doctor Strange card crops were inspected against their IDs and costs; supplied token bytes were preserved exactly. Live browser and installed-PWA playtesting remains required.

Run the included checks with Node.js:

```sh
node tests/doctor-strange.test.cjs
node tests/black-widow.test.cjs
node tests/captain-marvel.test.cjs
node tests/ui-and-offline.test.cjs
```

See `SYSTEM.md` for the current development handover and timing decisions.
