# Dice Throne Offline Engine

**Playtest 0.53.14**

An offline Dice Throne engine for playing and testing two-hero matches. Play both sides in a browser or install the game as a web app on supported Windows and Android browsers. The roster includes 45 heroes from Season One Rerolled, Season Two, Outcasts, Vanguard, Marvel, X-Men and Singles.

## Play locally

From the repository root, start a local server for the `docs` folder.

```sh
python -m http.server 8000 --directory docs
```

Open [http://localhost:8000/](http://localhost:8000/), choose both heroes in **Match setup** and select **Set up initiative**. Wait for **Ready for offline play** before disconnecting. If your browser offers **Install app**, you can install from an HTTPS deployment or localhost. The game saves your current match automatically. Open the same address with the same browser profile to resume it after an update.

## What changed in 0.53.14

- Deadpool's Curmudgeon coin control shows the coin artwork on a transparent background.

## What changed in 0.53.13

- Black Widow's Time Bomb artwork matches each token's current countdown.

## What changed in 0.53.12

- Card choices each have a row with the action on the left and an outlined **View** button on the right. The hand and deck viewers use the same preview style.

## What changed in 0.53.11

- The deck viewer labels cards in the draw pile, hand, discard and other tracked locations. Cards with all copies discarded appear together at the end of the list.

## What changed in 0.53.10

- The draw-deck control looks like a plain deck icon and draw count. Hovering or pressing highlights the count.

## What changed in 0.53.9

- Identical cards share a row in the deck viewer, with the number of copies listed beside the card name.

## What changed in 0.53.8

- The hero picker can choose a random hero from the whole roster for either player.
- Select the draw deck in Hero details to browse the hero's card list. Cards are grouped by play timing and type, with a preview for each card.

## What changed in 0.53.7

- Offensive Roll Phase ability requirements use a paler gold to distinguish them from ability names.

## What changed in 0.53.6

- The defence panel shows the printed text and symbols from the relevant board or equipped upgrade scan.
- The defence Roll button uses the original yellow fill and dark text.

## What changed in 0.53.5

- Each hand button shows the total cards and how many are playable at the current timing window. Both hands can still be opened to inspect cards.
- The hero picker shows the complexity rating from each hero’s leaflet on a scale of 1 to 6.
- Ability names use the same gold in roll and choice screens. The defence reference lists the current effects and dice count before rolling and while editing or responding to the result.

## What changed in 0.53.4

- Pending cards are excluded from reshuffles only in their owner's deck. This fixes draws during another hero's card roll and draws granted by Cyclops's Support.
- Deadpool's **…Dealt It!** checks the owner of the pending **He Who Smelt It…** roll.

## What changed in 0.53.3

- Shadow Thief’s **Wild Shadow!** now changes the selected dice correctly. Barbarian’s **Concuss!** is resolved by his own card rules.

## What changed in 0.53.2

- The mobile Match setup selector now fills the panel, with equal space for both hero controls.

## What changed in 0.53.1

- Tap the dice on the tray and confirm to reroll them. This also covers the second reroll for **Try, Try Again!** and the ability and defence rerolls that previously used tick boxes.
- Offensive ability cards show the roll requirement once in yellow, followed by the effect in white.

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
