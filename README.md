# Dice Throne Playtest 0.51.1 — pre-architecture fixes

This update fixes the four reported issues:

- Psylocke's Manifest icon shows its current face, defaulting visually to 1 before its first roll. Once inserted, its purple artwork follows the replaced offensive die through subsequent value changes and saved-game reloads.
- Alchemist's base Potion slots are corrected: Transmute 1, Hermetics 0, Potion Overload 3, Diffusion 0, Chain Reaction 1, Catalyst 2, Passivation 2. Upgrade-dependent capacities continue to work.
- Deadpool's Shoot starts collapsed. Its summary shows Active/Inactive, and an expanded reference stays open through ordinary rerenders.
- Cyclops' hero panel shows Leadership cards played this turn, using the existing gameplay counter and resetting visually to 0 when the turn ends.

Merge this update's `dice-throne-offline` folder onto 0.51.0, replacing matching files and keeping the others. Upload the updated `docs` contents to your existing hosting location. This archive contains changed files only. Existing saves, hero/card IDs and offline operation remain compatible. Existing Potion attachments are retained. Pre-patch saves do not contain the position of an already-used Manifest swap; new swaps store that position.

All 1,381 rules test groups passed, along with 490 simulated interface states, 45 artwork bundles, 96 JavaScript syntax checks, JSON save round-trips and offline file references. Six cropped Manifest faces were validated and visually inspected. Browser/touch layout and installed-PWA lifecycle still require manual playtesting.

SYSTEM.md is updated for the architecture pass in the next conversation. Legacy timing, Income and primary-deck reshuffling remain enabled; January 2027 global rules remain disabled.
