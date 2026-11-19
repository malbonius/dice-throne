# Dice Throne offline engine — current handover

Version: Playtest 0.32.1, 19 November 2026. Base: the supplied 0.31.2 project archive.

## Project structure

- `docs/index.html`: UI shell, styles, ordered classic-script loading, version label.
- `docs/heroes/*.js`: hero boards, upgrades, action cards, defence rules and hero-specific helpers. Black Widow is in `black-widow.js`.
- `docs/engine.js`: two-seat state machine, shared cards, hero registration, legal actions, turn flow and common damage/status handling.
- `docs/app.js`: rendering, controls, hand viewer, board/leaflet zoom, local saves and hero picker.
- `docs/art-shared.js`: standard shared cards and shared assets.
- `docs/art-shared-marvel.js`: the supplied Marvel/X-Men shared cards. `cardArtwork()` selects these for heroes in the Marvel or X-Men sets.
- `docs/art-hero-1.js` through `art-hero-26.js`: embedded per-hero artwork. Arrays must remain aligned with hero IDs. Black Widow uses art bundle 26.
- `docs/service-worker.js`: complete offline cache manifest, versioned 0.32.1.
- `tests/`: Node-based rules tests and interface/asset checks.

## Compatibility

The roster is append-only: the previous 25 heroes retain IDs 0–24; Black Panther is 24 and Black Widow is 25. Card IDs are hero-local. Black Widow uses shared 1–18, upgrades 19–26, standard actions 27–32, optional promo 33.

Save version remains 2, storage key remains `dice-throne-card-pilot-v2`. All new state is serialisable. No save migration or cache-clearing of localStorage is required.

Keep existing legacy timing, Income (draw one and gain one CP, except the first player's first turn), and deck reshuffling behaviour. The advanced-rules document includes future January 2027 changes: those changes are not globally enabled by this update. Follow the supplied hero scans and relevant existing-rule clarifications.

## Black Widow implementation and timing

- Begins with 3 Covert Ops. Cap 3; excluded from generic status removal/transfer lists. Once per global turn, usable in own Main Phases for a free hand upgrade or top-three inspection. If no upgrade is seen, optional revealed search adds a chosen upgrade to hand and shuffles. Otherwise order top cards explicitly from top to bottom.
- Red Room Training allows paid upgrades in Roll Phases, including an opponent's Roll Phase. A declared/activated ability keeps its original base version. Upgrade-dependent additional damage continues to reflect the upgrades in play. Count includes passive and defence upgrades. Five upgrades add 1 to attacks.
- Red Room Training II draws for later upgrade plays and free placements, excluding itself. During a two-upgrade Ultimate batch, a passive newly installed in that batch does not grant a draw for the other simultaneous upgrade. An already installed passive grants both draws. Search selections finish and the deck shuffles before any such draws.
- Covert Ops and Cunning! ordering use `widowTask`; Baton Strike II uses `widowReveal`. These mandatory choices block other card plays until finished. Recon and Ultimate continue via `widowAbility`.
- Time Bombs use `timeBombTimers` (each with stable ID and ticks 1 or 2), plus a synchronised numeric `timeBomb` count for common status logic. Cap 2. New bombs use 1 tick if their inflictor has at least 6 upgrades, otherwise 2. Transfer retains the chosen bomb's countdown. Generic removal synchronises timers; shared removal/transfer and Cleanse permit choosing a particular bomb. Defensive incoming-status prevention removes the newly inflicted bomb, preserving any old bomb.
- Upkeep requires one modifiable roll per remaining bomb. A 6 removes it; otherwise advance. Advancing 1 removes the token and queues one isolated 4-damage event. Each explosion has its own response/prevention window. Both players' bombs are advanced by Infiltrate. Base Infiltrate advances existing bombs before inflicting; Infiltrate II inflicts before advancing, including the new bomb.
- Agility cap 2. Its separate dice context can be modified before resolution, including opponent responses. Success on 1–3 adds one half-prevention counter after flat prevention. Two successes prevent all incoming damage, following leaflet rounding. Supports incoming attack, return, isolated and upkeep damage; no prevention of Ultimate damage.
- Elude! requires an unresolved Agility roll showing 5–6. The die remains alterable until it resolves; the final result determines whether full prevention applies. A resolved Agility roll cannot be reopened.
- Sabotage uses 3 dice, or 4 when upgraded. Batons return damage, Espionage prevents damage; Time Bomb requires 1 Widow normally or 2 when upgraded. Four upgrades permit one additional selected-dice Roll Attempt per defence; Better D! remains separate.
- Subversion! adds 2 plus the number of upgrades put into play by that player during the current turn. Counts reset on the next global turn. Assemble and Smoke Screen! follow the supplied scan.

## Verification and remaining manual checks

34 Black Widow rules test groups and 40 interface rendering states passed. Checked all 26 hero artwork bundles, Black Widow's 15 card images against their IDs, Marvel shared art selection, cached file references, syntax, and serialised saved-state round-trip. Differential checks against 0.31.2 passed 3,933 comparisons across all 25 old heroes, including 1,857 state transitions.

A real Chromium session could not start in this execution environment. Manual checks still required on the user's Windows/Android browsers: hero selection, touch controls, card/board zoom, reload of an existing save, online installation/update then offline launch, and gameplay against other heroes. The interface tests simulate DOM elements; they do not validate browser layout or service-worker lifecycle.

For the next hero: append its module and artwork arrays, register it in the correct set, load both scripts before the engine, and add both files to the service worker. Marvel/X-Men shared artwork selection is automatic through the set. Keep each new hero's distinctive rules in its own module, retaining common state-machine hooks in the engine.

## Artwork patch 0.32.1

Replaced only `window.diceThroneArt.vibraniumSuit` in `docs/art-hero-25.js` with the exact bytes of the newly supplied `vibraniumSuit.webp`. The standalone token replaces the previous placeholder/crop. Other Black Panther artwork and all gameplay code are unchanged. Version label and offline cache bumped to 0.32.1.
