# Dice Throne Playtest 0.48.0 — Krampus

Krampus joins Singles with his board abilities, seven upgrades, six standard action cards, optional Krusty Krampus! promo, separate six-Reject Companion deck, leaflets, dice and supplied Coal/Gift artwork. He uses normal shared card artwork. His primary deck has 31 standard cards, or 32 with the promo; Rejects are separate.

To update from 0.47.0, extract this update and merge its `dice-throne-offline` folder into your existing project, replacing matching files and keeping the other files. Upload the updated `docs` contents to your existing hosting location. This archive contains changed and new files only. Existing hero/card IDs, schema-2 saves and local storage remain compatible.

Coal works against every hero: at four tokens, the next available positive CP gain removes all Coal and reduces the gain by one. It does not trigger at 15 CP or during skipped Income. The shared CP helper is used by Income, sales, shared cards, hero abilities and token actions, which is why this update includes changes to several existing hero modules. Their behaviour without Coal is preserved.

Gift is a removable, non-transferable Unique token. Spend it during your Main Phase to draw a Reject directly into play. Setup starts Krampus with one Reject. At most three may be in play, and each can activate once per global turn. Whole two-card draws finish before overflow discards; no activation occurs between the cards or while discarding excess. Free activations and Regift! keep the Reject but retain its used marker.

Dotty adds damage; Squishy prevents damage; Sproingy inflicts Coal and adds damage; Sargey makes an Attack undefendable; Bitey heals and adds damage; Wormy gives an additional Offensive Roll Attempt. The interface shows Reject references, usage and separate deck/discard counts, with explicit activation and overflow controls.

Bad Tidings resolves its Coal and saved collateral damage without a middle interruption. Its collateral damage is not an Attack and cannot use Attack Modifiers. Sproingy's Surprise! snapshots its Coal bonus when played. The Reject-specific cards have a dedicated activation window, and ordinary Companion effects remain usable under Paralyze or Crimson Bands where appropriate.

Validation: 75 Krampus and 1,049 existing rules test groups (1,124 total), 376 simulated interface states, 42 art bundles, offline script references, saved-state JSON and 90 JavaScript syntax checks passed. Exact comparisons against 0.47.0 passed 5,812 checks across all 41 previous heroes (2,713 transitions). All fourteen card crops, six Reject references and six dice faces were inspected; 33 new WebP payloads validate and both token images preserve their source bytes. Real-browser layout, touch controls and installed-PWA update/offline launch remain manual playtesting checks.

Legacy timing, Income and deck reshuffling remain enabled. January 2027 global rules remain disabled. Deadpool is deferred pending rescans of his unique cards; three Singles characters remain before the dedicated architecture pass.

Run `node tests/krampus.test.cjs` for the new rules checks, `node tests/ui-and-offline.test.cjs` for interface/offline checks, and the other hero test files under `tests` for the full regression suite. See `SYSTEM.md` for the current handover and timing decisions.
