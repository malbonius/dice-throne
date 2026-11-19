# Dice Throne offline engine — current handover

Version: Playtest 0.33.0, 19 November 2026. Base: the supplied 0.31.2 project archive.

## Project structure

- `docs/index.html`: UI shell, styles, ordered classic-script loading, version label.
- `docs/heroes/*.js`: hero boards, upgrades, action cards, defence rules and hero-specific helpers. Black Widow is in `black-widow.js`; Captain Marvel is in `captain-marvel.js`.
- `docs/engine.js`: two-seat state machine, shared cards, hero registration, legal actions, turn flow and common damage/status handling.
- `docs/app.js`: rendering, controls, hand viewer, board/leaflet zoom, local saves and hero picker.
- `docs/art-shared.js`: standard shared cards and shared assets.
- `docs/art-shared-marvel.js`: the supplied Marvel/X-Men shared cards. `cardArtwork()` selects these for heroes in the Marvel or X-Men sets.
- `docs/art-hero-1.js` through `art-hero-27.js`: embedded per-hero artwork. Arrays must remain aligned with hero IDs. Black Widow uses art bundle 26; Captain Marvel uses bundle 27.
- `docs/service-worker.js`: complete offline cache manifest, versioned 0.33.0.
- `tests/`: Node-based rules tests and interface/asset checks.

## Compatibility

The roster is append-only: the previous 25 heroes retain IDs 0–24; Black Panther is 24, Black Widow is 25 and Captain Marvel is 26. Card IDs are hero-local. Black Widow uses shared 1–18, upgrades 19–26, standard actions 27–32, optional promo 33.

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

## Captain Marvel 0.33.0

Captain Marvel is appended as hero ID 26, in the Marvel set. Module: `docs/heroes/captain-marvel.js`; artwork: `docs/art-hero-27.js`. Shared card selection is automatic through set membership. Unique IDs: 19 Photon Punch II; 20 Inner Light II; 21 Supernova II; 22 Aurora Wave II; 23 Photonic II; 24 Light Torpedo II; 25 Energy Refraction II; 26 Refuel!; 27 Shine Bright!; 28 Inner Strength!; 29 Supersonic!; 30 Cosmic Shield!; 31 Scintillate!; 32 Flickering!; 33 optional Ace Pilot!. Cosmic Shield! costs 0 CP, matching its supplied card image.

- Cosmic Ray uses a numeric `cosmicRay` count plus a `cosmicRays` array recording each token's gained turn and immediate-use exception. Cap 2. The `cosmicRayUsedTurn` marker enforces a single spend across the whole turn, including extra attacks. Excluded from all generic status-removal and transfer lists.
- A Ray cannot normally be spent in the turn it was gained. Light Torpedo II flags the token it grants as immediately usable. Supersonic! spends a token gained this turn, subject to the same once-per-turn and attack/pure-damage restrictions. Gain/spend choices do not reopen attacks that have already finished.
- Cosmic Ray can be used after an offensive ability has activated, before or after the defence. It cannot modify pure damage. Its two dice have a separate `cosmicRayRoll` context and the player explicitly chooses one value. The normal response system permits dice alteration before final selection. Rolls made during an Ultimate cannot be altered.
- Gaining a Ray at the cap offers a `cosmicRayOverflow` choice only if an existing eligible Ray may actually be spent on the current attack. The player can spend first, then collect, or accept the cap and forgo the extra token. Resolving the choice does not loop. Gains in a Main Phase never reopen the previous attack.
- Radiance is a spendable positive token, cap 2: one token changes one own Defensive Roll Attempt die to 6. The supplied leaflet paragraph omits the word “spend”; the implementation explicitly consumes a token per use. It cannot alter subsidiary card/status dice. A transferred token works on the new holder's defence, including only the defending player's own die in Gunslinger's Duel.
- Cosmic Flare is a transferable positive token, cap 3. Its holder must activate it during their Upkeep: capture damage equal to the current token count and remove one token. An explicit response window allows the opponent to prevent or avoid the damage. The resulting damage is stored in `upkeepFlareDamage` and applied with the active player's normal Upkeep damage at the phase's end, allowing simultaneous defeats/draws. Upkeep flags reset each turn.
- Photon Punch's Flare trigger checks matching numerical faces, rather than the number of Photon symbols. Barrel Roll resolves each subsidiary die by symbol (Photon +2 damage, Ascend +1 Flare, any Hala Star gains one Ray). Aurora Wave uses the total numerical value of two dice; an earlier Cosmic Ray bonus is retained when that total is resolved.
- Energy Refraction rolls 4 dice, or 5 upgraded. Every Hala Star both returns 1 damage and prevents 1. Every pair of Ascend grants one Flare.
- Shine Bright! permits spending up to 3 available CP even at/near the Flare cap; the token count still caps at 3. Scintillate! discards a selected number of Radiance for 3 prevention each. Refuel!, Cosmic Shield! and Ace Pilot! resolve their own supplied symbol outcomes.

Validation added for this release: 34 Captain Marvel rules test groups, 49 UI render states, 27 artwork bundles, all cache references and save JSON round-trip. The existing 34 Black Widow groups pass. Comparison with 0.32.1 passed 4,003 checks across 26 existing heroes, including 1,881 state transitions. The three supplied token files are embedded without modification. Card crop ordering is explicit and all 15 titles/costs were inspected. A real browser/PWA lifecycle check remains a manual task.

Retains the 0.32.1 Vibranium Suit asset. No previous hero IDs, save keys or gameplay rules were renumbered. Keep the legacy rules model and deck reshuffling unless explicitly asked to enable the future rules changes.
