# Dice Throne Offline Engine

**Playtest 0.52.0 · Architecture release**

An offline Dice Throne engine for playing and testing two-hero matches. The current build includes 45 heroes from Season One Rerolled, Season Two, Outcasts, Vanguard, Marvel, X-Men and Singles. It runs in a browser and can be installed as a web app on supported Windows and Android browsers.

## Play locally

From the repository root, start a local server for the `docs` folder.

```sh
python -m http.server 8000 --directory docs
```

Open [http://localhost:8000/](http://localhost:8000/), choose two heroes and start a match. Wait for **Ready for offline play** before closing the app or disconnecting. At an HTTPS deployment or on localhost, use your browser's **Install app** option if available. The game stores the current match in the browser, and existing 0.51.1 saves carry forward when you use the same address and browser profile.

## What changed in 0.52.0

- Hero modules declare their own Positive statuses and recurring Upkeep. Shared effects such as Conjure use those declarations.
- Turn flow, dice ownership and response timing, and damage calculation now have dedicated modules. Additional Offensive Roll Phases share the same restart path, and attacks, return damage, Upkeep and isolated damage share the same prevention arithmetic.
- The regression suite covers turn transitions, nested responses, prevention and the hand controls for playing and selling cards. The final refactor passed 30,932 comparisons against the original 0.51.1 across all 45 heroes. The merged preview also passed the Windows and Android save and offline checks.

## Development

Run the regression suite from the repository root.

```sh
node tests/architecture.test.cjs
```

Pass the path to an original 0.51.1 `docs` folder as the first argument to repeat the baseline comparisons. See [SYSTEM.md](SYSTEM.md) for the engine layout, compatibility details and rules decisions.
