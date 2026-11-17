# Dice Throne Playtest 0.15.0

Artificer joins **Season Two** in both player selectors. This update includes the board, both leaflet sides, dice, Synth and Nanite tokens, and Basic and Advanced artwork for Nanobot, Shock Bot and Heal Bot. The deck includes 32 standard cards and the optional Synthesize! promo.

## Update from 0.14.0

1. Extract this ZIP over the working 0.14.0 repository or assembled release.
2. Upload the extracted files together to the same GitHub Pages branch. Keep the existing files, the `/docs` publish folder and the Pages URL.
3. Open the deployed app online and wait for **Playtest 0.15.0** and **Ready for offline play**.
4. Start a match with **Season Two → Artificer**. Reopen offline to resume the match.

Heal Bot follows the updated healing timing. It heals when its roll resolves and qualifies based on modified attack damage before prevention. Free bot activations resolve in time to affect the attack.

## Verification

Scripted checks cover Synth, upgrades and action cards, both defence levels, all three bots, free activations, the Heal Bot threshold, and simultaneous Nanobot damage. The regression harness compared 405 seeded matches across the 81 ordered pairings from 0.14.0. The new roster completed 95 seeded matches across all 19 ordered pairings involving Artificer. The offline harness tested cache replacement, Artificer artwork and save restoration. Installed-app checks on Android and Windows are pending.
