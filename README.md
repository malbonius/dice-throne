# Dice Throne Playtest 0.13.4

This is an update for the working 0.13.3 installation. It reorganises the app's JavaScript and keeps the existing hero and card IDs, autosave key and offline setup.

- `docs/heroes/` contains one file per Season One ReRolled hero for their board, dice, deck, upgrades, defence and hero-specific effect handlers.
- `docs/engine.js` handles match flow, card legality, timing and shared rules. `docs/app.js` handles the browser interface and autosave.
- The hero files and engine use classic scripts so the browser can load them from local files as well as GitHub Pages. Keep the script order in `docs/index.html`.

## Update an existing 0.13.3 installation

1. Extract this ZIP over your 0.13.3 repository or assembled release. Keep the existing artwork, icons, manifest and install script in `docs/`.
2. Upload the extracted files to their existing paths on the same GitHub Pages branch in one commit. Keep the same Pages URL and `/docs` publish folder.
3. Once Pages has deployed, open the app online in the browser profile that holds your save. Check for **Playtest 0.13.4** and **Ready for offline play**.
4. Close the app, disable networking, then reopen it and advance the saved match.

The patch contains the README, HTML, service worker, engine, browser interface and all eight hero scripts. For a fresh deployment, assemble all five 0.13.2 archives first, then overlay this patch.

## Verification

The 0.13.4 engine matched 0.13.3 across 320 seeded matches and all 64 ordered pairings. The comparison checked game state, logs, legal actions and card choices. Scripted checks covered Barbarian action cards, both Overpower thresholds, Thick Skin II status prevention, Reckless recoil and Stun. The offline harness verified cache replacement, loaded the updated interface and advanced an in-progress 0.13.3 autosave with its network disabled. This build still needs an on-device check on Android and Windows 11.
