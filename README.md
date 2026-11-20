# Dice Throne Offline Engine

**Playtest 0.53.0**

An offline Dice Throne engine for playing and testing two-hero matches. Play both sides in a browser or install the game as a web app on supported Windows and Android browsers. The roster includes 45 heroes from Season One Rerolled, Season Two, Outcasts, Vanguard, Marvel, X-Men and Singles.

## Play locally

From the repository root, start a local server for the `docs` folder.

```sh
python -m http.server 8000 --directory docs
```

Open [http://localhost:8000/](http://localhost:8000/), choose both heroes in **Match setup** and select **Set up initiative**. Wait for **Ready for offline play** before disconnecting. If your browser offers **Install app**, you can install from an HTTPS deployment or localhost. The game saves your current match automatically. Open the same address with the same browser profile to resume it after an update.

## What changed in 0.53.0

- **Match view** shows both heroes’ Health, CP and status summaries alongside the current decision. Both hands are within reach, and the interface indicates who can act.
- **Dice** appear in the tray as soon as you roll for offence or defence. When a card lets you change a die, you can preview eligible faces directly on the tray and confirm your choice.
- **Rules and artwork** are easier to consult during play. Offensive abilities list their roll requirements, card selections can preview the artwork, and token choices show their icons.
- **Hero controls** include a two-step Alchemist potion picker with leaflet descriptions and eligible slots. Deadpool’s Curmudgeon toggle is available with Shoot closed.

The 0.52.0 architecture release introduced shared modules for turn flow, dice ownership and damage. [SYSTEM.md](SYSTEM.md) records the architecture and match interface changes in detail.

## Development

Run the regression suite from the repository root.

```sh
node tests/architecture.test.cjs
```

Pass the path to an original 0.51.1 `docs` folder as the first argument to repeat the baseline comparisons across all 45 heroes.
