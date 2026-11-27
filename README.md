# Dice Throne Offline Engine

**Playtest 0.53.38**

An offline Dice Throne engine for playing and testing two-hero matches. Play both sides in a browser or install the game as a web app on supported Windows and Android browsers. The roster includes 45 heroes from Season One Rerolled, Season Two, Outcasts, Vanguard, Marvel, X-Men and Singles.

## Play locally

From the repository root, start a local server for the `docs` folder.

```sh
python -m http.server 8000 --directory docs
```

Open [http://localhost:8000/](http://localhost:8000/), choose both heroes in **Match setup** and select **Set up initiative**. Wait for **Ready for offline play** before disconnecting. If your browser offers **Install app**, you can install from an HTTPS deployment or localhost. The game saves your current match automatically. Open the same address with the same browser profile to resume it after an update.

## What changed in 0.53.38

- Card choices use one row per card with a **View** button.
- Crow’s Nest! names the card discarded on a 6.
- Artificer’s bots and Huntress’s Nyra use transparent backgrounds. Bot details show the activation cost and effect. Nyra appears in the token strip with her Health and status in the detail view.

## What changed in 0.53.37

- Defence displays the defender’s dice, or the two dice involved in a Duel.
- Token action buttons show the associated icons. Cards with token recipients use a dedicated chooser, including separate rows for Divine Intervention!’s three choices.

## What changed in 0.53.36

- Token rolls and Showdown go straight from blank dice to the rolled faces and the effect’s Resolve button. This includes Flight, Blinding Light, Bleed, Mesmerize, Reload and Evasive.

## What changed in 0.53.35

- Token rolls show the token’s icon and rules text. The original card or ability reference returns when its roll resumes.
- Tap a token on mobile to see its enlarged icon and rules text.

## Test mode

Tick **Test mode** in the header during a match. Use **Edit Health / CP** beneath either hero’s totals to type a value or step it up and down. Changes apply to the current match and are autosaved.

Use **Play** in the draw or discard pile, or choose the source in the full deck list. The card still needs enough CP, legal timing and valid targets.

Tap a blank dice slot to choose its face before rolling. Use the illustrated picker that also appears when playing **So Wild!**. Empty slots roll randomly. If a card, ability or reroll needs another choice of dice, the picker appears in the current match panel.

After an Offensive Roll Attempt, tap dice to hold or release them. Choose **Edit dice faces** to change rolled values directly, then **Done editing dice** to return to holding. Select any offensive ability in the list to set the dice to a matching roll and announce it. Abilities still need the right dice and any applicable rules conditions, such as a sixth die for Maelstrom. Reloading the app starts with Test mode off.

## What changed in 0.53.32

- Spend Evasive and other eligible tokens from the owning hero’s **Available effects** dropdown. This includes Glide, Combo, attached Potions, and token spends tied to individual abilities. The main prompt still provides the action to resolve or continue.

## What changed in 0.53.31

- When a hero has a choice of defences, choose an ability to see its blank dice and Roll button. You can change your choice before rolling.

## What changed in 0.53.30

- Each defence option shows its own blank dice before you roll, including both of Shadow Thief’s and Spider-Man’s defences.
- Psylocke’s Manifest die has a blank slot beside her first Offensive Roll Attempt and appears there when you roll.

## What changed in 0.53.29

- Samesies! shows one confirmation when several dice have the face being copied.
- Two Dice Cubes automatically freeze both dice when exactly two share the lowest value.

## What changed in 0.53.28

- Select dice directly for Dice Cube ties, Cosmic Ray, Chain Lightning and other roll effects. The Frozen label sits below the highlighted die.
- Iceman’s Glide activates its linked ability without an Accept Roll screen. Required status checks still resolve.

## What changed in 0.53.27

- The most recently rerolled dice display a **New** label, including when they land on the same face.
- Card effect rolls display their printed instructions before the roll and alongside the result. Tap the instructions to open the full card.

## What changed in 0.53.26

- Moon Elf’s base Longbow deals 4, 5 or 7 damage for three, four or five Arrows. The board artwork and in-game ability text show the updated values.

## What changed in 0.53.25

- Extra ability rolls show the printed effects from the hero board or equipped upgrade before rolling, alongside the result, and while choosing dice to change with a card. Select the printed effects to open the board or card viewer.

## What changed in 0.53.24

- Mobile hero panels show all attached token icons and counts. Tap an icon for its ability.
- The installed app uses the Dice Throne logo, with padding for launchers that mask icons.
- Hero drawer reference buttons have dividers. Available effects sit above the match actions and can be used without a separate pass prompt in ordinary play.

## What changed in 0.53.23

- Board buttons show the number of equipped upgrades.
- Hero forms and trackers have their own rows above the tokens in hero details.

## What changed in 0.53.22

- On mobile, tap a hero's status row to see tokens, draw and discard piles, and hero-specific components in a scrollable sheet.
- Open **Board → Upgrades** on mobile or desktop to see equipped cards.

## What changed in 0.53.21

- **Turn summary** shows the phase list. **Damage cheat sheet** shows the damage type chart.

## What changed in 0.53.20

- Open **Player aid** beside **Match setup** for the rulebook's turn summary, quick reference and damage cheat sheet. All three work offline and use the existing zoom controls.

## What changed in 0.53.19

- Phoenix Burn applies damage and prevention before asking for the removal roll.
- Common roll and damage responses use the current screen's hands and effect controls, so the normal resolve button can advance play directly.

## What changed in 0.53.18

- The header displays the transparent Dice Throne logo above the playtest version.

## What changed in 0.53.17

- All 45 hero portraits appear in the character picker, match setup and in-match status boxes, including when playing offline.

## What changed in 0.53.16

- Standalone cards such as Deadpool's Shoot and Iceman's Freezer fit the desktop viewer when opened.
- Time Bomb, Bag of Tricks, Prey, Nevermore, Do You Feel Lucky?!, Naughty or Nice and ability effect rolls show the result in the same tray.

## What changed in 0.53.15

- Card categories start collapsed each time the deck viewer opens.

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
