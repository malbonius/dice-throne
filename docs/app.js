const art = window.diceThroneArt;
const portraitSource = id => `./portraits/${HEROES[id].name.toLowerCase().replaceAll(' ', '-')}.webp`;
const heroPortrait = id => `<img class="hero-portrait" src="${portraitSource(id)}" alt="" width="179" height="323" loading="lazy">`;

function cardArtwork(match,seat,cardId) {
  const hero=heroId(match,seat);
  if(cardId>18)return art.uniqueCards[hero][cardId-19];
  const marvel=sets.some(set=>['Marvel','X-Men'].includes(set.name)&&set.heroes.includes(hero));
  return (marvel&&art.marvelSharedCards?art.marvelSharedCards:art.sharedCards)[cardId-1];
}

const match = document.getElementById('match');
const storageKey = 'dice-throne-card-pilot-v2';
const roll = () => 1 + Math.floor(Math.random()*6);
const testToggle = document.getElementById('test-mode');
testToggle.checked = false;
const testVitals = document.getElementById('test-vitals');
const testVitalsForm = document.getElementById('test-vitals-form');
let testRoll;
let testDraft;
let editTestFaces = false;
let testAbilityMessage;
const dieFaces = [1, 2, 3, 4, 5, 6];
let testCard;
let testVitalsSeat;
let state;
let rollRequest;
let lastTokenResult;
let selectedDefence;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved?.version === 2 && saved.cards && saved.players?.length === 2 && Array.isArray(saved.log)) {
    const {uiRollRequest, uiDefenceChoice, ...matchState} = saved;
    state = matchState;
    selectedDefence = uiDefenceChoice;
    if (uiRollRequest?.action || uiRollRequest?.setup) rollRequest = uiRollRequest;
  } else if (saved?.uiRollRequest?.setup) rollRequest = saved.uiRollRequest;
} catch {}
let names = state ? heroNames(state) : [];
let selectedCard=null;
let handSeat;
let diceEdit;
const dicePicks = new Map();
const effectDicePlans = [];
let selectedPotion;
const handDialog=document.getElementById('hand-dialog');
const handTitle=document.getElementById('hand-title');
const handContent=document.getElementById('hand-content');
const deckDialog = document.getElementById('deck-dialog');
const deckTitle = document.getElementById('deck-title');
const deckContent = document.getElementById('deck-content');
const fullDeckButton = document.getElementById('view-all-deck');
const heroSheet = document.getElementById('hero-sheet');
const heroSheetContent = document.getElementById('hero-sheet-content');
let deckSeat;
const button = (action,label,attrs='') => `<button type="button" data-action="${action}" ${attrs}>${label}</button>`;
const equippedUpgrades = seat => Object.values(state.players[seat].upgrades ?? {});
function boardButton(seat, quick = false) {
  const count = equippedUpgrades(seat).length;
  const label = `${count} ${count === 1 ? 'upgrade' : 'upgrades'}`;
  return button('inspect-board',`<span>Board</span><small>${label}</small>`,
    `class="board-button${quick?' quick-board':''}" data-index="${seat}" aria-label="Open ${names[seat]}’s board · ${label} equipped" aria-haspopup="dialog"`);
}
const abilityName = (name, tag = 'span') => `<${tag} class="ability-name">${name}</${tag}>`;
function previewCard(state, seat, id, label = 'View') {
  const style = label === 'View' ? 'class="card-preview" ' : '';
  return button('inspect-card', label, `${style}data-index="${id}" data-seat="${seat}" aria-label="View ${seatCard(state,seat,id).name}" aria-haspopup="dialog"`);
}
function previewableOption(state, seat, id, controls) {
  return `<div class="card-option">${controls}${previewCard(state,seat,id)}</div>`;
}
function boardImage(state,seat,full=false) {
  const id=heroId(state,seat);
  if(id===cursedPirate.id && state.players[seat].cursed)
    return full?art.cursedPirateFullBoard:art.cursedPirateBoard;
  if(id===paleLady.id&&state.players[seat].werewolf)return full?art.werewolfFullBoard:art.werewolfBoard;
  if(id===jeanGrey.id&&state.players[seat].darkPhoenix)return full?art.jeanDarkFullBoard:art.jeanDarkBoard;
  const form=state.players[seat].druidForm;
  if(id===druid.id&&form!=='druid')return art[form+(full?'DruidFullBoard':'DruidBoard')];
  return (full?art.fullBoards:art.boards)[id];
}
function heroComponents(seat) {
  return `${heroId(state,seat)===alchemist.id?attachedPotions(seat):''}
    ${heroId(state,seat)===krampus.id?`<details class="board-upgrades" data-disclosure="rejects-${seat}"><summary>Rejects (${state.players[seat].rejects.length}/3)</summary><div class="controls">${state.players[seat].rejects.map(id=>button('inspect-reject',`<img src="${art.krampusRejects[id]}" alt="${krampus.names[id]}" style="width:100px;max-width:100%"><br>${krampus.names[id]}${state.players[seat].rejectUsed[id]===state.turn?' · used this turn':''}`,`data-index="${id}" data-seat="${seat}"`)).join('')||'No Rejects in play'}</div><p>Draw pile: ${state.players[seat].rejectDeck.length} · Discard: ${state.players[seat].rejectDiscard.map(id=>krampus.names[id]).join(', ')||'empty'}</p></details>`:''}`;
}
const statusNotes = {
  donut:'Positive, stack limit 2. When gaining Donut, choose any player to receive it. During your own Upkeep, spend one and roll: heal half the final value, rounded up. Healing uses the existing end-of-Upkeep timing.',
  onomatopoeia:'Unique, stack limit 2; removable, never transferable. During any Roll Phase, say an onomatopoeia and spend one to change an owned die to Knife (4) or Joke (5). Frozen dice and accepted Ultimates cannot be changed. Curmudgeon coin waives the spoken requirement.',
  rps:'Positive, stack limit 1. Once per global turn, spend while Attacking or being Attacked, excluding pure damage. Win RPS to add 2 Attack damage (3 with active Shoot) or prevent 2. Ties replay. Own Ultimates automatically win; opponents cannot act during an accepted Ultimate.',
  cheer:'Positive, stack limit 3. Spend 1 to reroll one of your own dice, or 3 to change one of your own dice to 6. Transferred Cheer belongs to its new owner. Cannot alter accepted Ultimate dice.',
  eggNog:'Positive, stack limit 5. Spend 3 at any time to roll a Santa die: Axe deals 2 separate undefendable damage; Bell heals 2 and gains 1 CP; Star heals 2 and draws 1. Spend existing tokens before collecting a new batch; the batch is gained together.',
  strengthOcean:'Unique, stack limit 3; removable, never transferable. Once per turn during your Upkeep, spend 1 for 1 CP, or 2 for 1 CP and healing 2. You may choose only one option. Sea Song! is a separate card effect.',
  strengthMountain:'Unique, stack limit 2; removable, never transferable. Persistent Attack Modifier: each token adds 1 Attack damage while present. Removing one before damage calculation removes its bonus. Does not increase pure or collateral damage.',
  strengthSky:'Unique, stack limit 2; removable, never transferable. Each token adds one die when activating your Defensive Ability. Gaining or removing one after the defence has rolled does not resize that roll.',
  coal:'Negative, stack limit 4. With four Coal, the next CP gain first removes all Coal and reduces that gain by 1 CP. At 15 CP, an attempted gain cannot clear Coal. Amounts below four have no CP penalty.',
  gift:'Unique, stack limit 3. During your own Main Phase, spend one to draw a Reject into play. Removable, never transferable. Rejects are Companions with a separate draw/discard pile, not hand cards.',
  punchify:'Unique Potion, limit 6 across the whole board. Offensive slots only. Spend at the end of its ability’s Offensive Roll Phase for +2 Attack damage. Cannot be transferred.',
  bolsterate:'Unique Potion, limit 2 across the whole board. Defensive slots only. After resolving Passivation’s attachments, spend to prevent 2 damage. You must have activated the defence. Cannot be transferred.',
  cleansitude:'Unique Potion, limit 3 across the whole board. Attach to any printed Potion slot. Spend with the activated ability to heal 1 or remove one status from yourself, including an incoming status during defence. Cannot be transferred.',
  toxification:'Unique Potion, limit 1 across the whole board. Attach to any printed Potion slot. Spend with the activated ability to inflict Poison on a chosen player. Cannot be transferred.',
  rage:'Positive, stack limit 3. Spend one and discard a card to add 3 Attack damage, or spend three to draw one. Wolverine’s Recovery/Frenzy cards trigger only when discarded by Rage, without being played or gaining CP. Existing Rage can be spent before collecting an overflowing gain.',
  alpha:'Unique, stack limit 1; removable but never transferable. When inflicted by an Attack, attacker and receiver immediately roll one die each. Remove Alpha if the attacker’s result is lower; ties retain it. At the holder’s next Income, skip that phase and remove Alpha.',
  tornado:'Positive, stack limit 4. Spend before the first Offensive Roll Attempt to borrow one opposing die per token, up to five. The holder controls these dice; foreign symbols cannot activate abilities, but numbers can form straights and matching-number bonuses. Same-hero dice retain usable symbols.',
  windShear:'Positive, stack limit 1. When Attacked, spend to prevent 2 damage, then deal 2 isolated undefendable damage to the opponent. Works even if the incoming damage is avoided or blocked by Parlay. Raging Winds! doubles the next spend this turn.',
  lightning:'Companion. Place on a chargeable ability. On activating a previously Charged ability, optionally remove it for that ability’s Charged Effect, once per ability per turn. Placing a second Lightning immediately removes both and deals 2 isolated undefendable damage.',
  influence:'Negative, stack limit 3. At the start of the holder’s actual Offensive Roll Phase, roll one die per token. Each 1–3 removes one Roll Attempt. Then remove all Influence. Dice Cube and Manifest do not affect these separate dice.',
  ionicEnergy:'Positive. Ionic (1) and Ionic (2) share a stack limit of 4 unless increased by Ionic Intensity! Spend to add the indicated damage to an Attack; two tokens per global turn, or pay 1 CP to permit four. A full stack cannot replace an old token with a stronger new one.',
  ionicEnergy2:'Positive, Ionic Energy (2). Shares a stack limit with Ionic Energy (1). Spend to add 2 Attack damage. The same two-token/four-token allowance applies to both values together.',
  skyward:'Positive, stack limit 2. When Attacked, spend and both players roll one die. Pay 1 CP per reroll of your own die. Greater returns 3 damage; equal prevents 4; lower has no effect. Resolve only once after the final roll.',
  paralyze:'Negative, stack limit 1. Blocks status effects gained or inflicted by normal Offensive Abilities. Ultimates, passives, cards and token actions are unaffected. Remove at the end of the holder’s actual Offensive Roll Phase.',
  infiltration:'Positive, stack limit 2. Spend one to force a reroll of any player’s Defensive Roll Attempt die. Cannot affect subsidiary defence rolls such as Agility.',
  manifestDie:'A separate Psylocke die rolled with her first Offensive Roll Attempt. Once per turn, use it to replace one offensive die or add half its value rounded up to an attack. Only effects naming Manifest can alter it while separate; once inserted it is a normal die.',
  acuity:'Positive, stack limit 4. Spend 1 to reroll one own die, 2 to gain 1 CP, or 4 to inflict Phoenix Burn on an opponent. Whole incoming batches cannot be split to make room.',
  flameBlast:'Positive, stack limit 5. Dark Phoenix may spend 1 for +1 attack damage or 3 for +4. Synthesis permits Jean Grey to spend them for the current turn. Pure damage cannot be modified.',
  forceField:'Positive, stack limit 1. Remove this token and one other Positive Status token from your board to prevent half a chosen player’s incoming damage, rounded up.',
  phoenixBurn:'Negative, stack limit 1. In Upkeep receive 2 damage, then roll 1 die; a 5 or 6 removes it. If removed and inflicted again during the same Upkeep, the new token triggers again.',
  diceCube:'Negative, stack limit 2. Freeze the lowest die (two lowest at cap) from the first Offensive Roll Attempt. Ties let the roller choose. Those original dice cannot be changed by either player; separate subsidiary rolls are unaffected. Remove at the end of that Roll Phase.',
  iceShard:'Positive, stack limit 5. Spend 5 at any time to gain Glide. Incoming gains arrive as one batch: spend existing shards before collecting, without using a partial incoming batch to make room.',
  glide:'Unique, stack limit 1. Cannot be removed or transferred. At the end of a qualifying Roll Phase, spend once per turn to activate the ability at the end of the printed Glide Path, against the same opponent. No dice objective, Income or Main Phase between the abilities.', 
  dissolution:'Positive, stack limit 2. In your own Main Phase spend one to heal a chosen player 2, or remove one Negative Status Effect from that player.',
  disruption:'Negative, stack limit 1. During Upkeep choose to lose 1 CP or receive 2 damage. If you cannot pay CP, take the damage. Then remove the token. Damage joins the other Upkeep damage.', 
  battlePlan:'Positive, stack limit 4. Each option once per turn: spend 1 to examine an opponent’s hand; spend 3 to inspect your top 3, take up to 1 Leadership card and discard/order the rest; spend 3 to inflict Focus Fire. Incoming gains arrive as one batch; spend existing tokens before collecting excess.',
  support:'Positive, stack limit 3. Spend 1 to give any player 1 CP or reroll one of their dice; spend 3 to let any player draw 1. No turn limit. Incoming gains arrive as one batch; existing tokens may be spent before collecting excess. Ultimate dice cannot be altered.',
  focusFire:'Negative, persistent, stack limit 2. Each token adds +1 incoming Attack damage as an Attack Modifier. Cannot increase pure damage or non-Attack damage.', 
  electrokinesis:'Stack limit 4. Once per turn in your own Main Phase, spend 4 to draw a card. If gaining beyond the limit in that window, you may draw before adding the excess tokens.',
  mjolnir:'Companion. Discard one card at any time to throw or retrieve your own Mjölnir. Throw: move to an opponent and deal 1 isolated undefendable damage. Retrieve: move back to Thor and gain Electrokinesis. Ability movements do not require a discard.', 
  combo:'Unique, stack limit 1. After your attack and its Defensive Roll Phase conclude, spend once per turn to start another Offensive Roll Phase against the same opponent. No Income or Main Phase between them. Cannot be transferred; can be removed.',
  invisibility:'Unique, stack limit 1. Spend when attacked with undefendable or pure damage to activate a Defensive Ability. Cannot defend twice against one attack, or against Ultimate or isolated damage. Spider-Sense may instead discard this token for an additional Roll Attempt. Cannot be transferred; can be removed.',
  webbed:'Negative, stack limit 1. A newly inflicted token deals 2 isolated undefendable damage. The next normal attack becomes undefendable and consumes it. Ensnare inflicts its new token after damage, so it affects a later attack. Existing Webbed is not consumed by pure, undefendable or Ultimate attacks.',
  probabilityManipulation:'Stack limit 2. Spend as an instant action to change one of your dice showing 2, 4 or 6 by one. Cannot increase a 6 or wrap it to 1. A borrowed Reality Warp die belongs to its current roller.',
  realityWarp:'At the beginning of your next Offensive Roll Phase, remove this token and replace die 5 with a Scarlet Witch die. Its number still counts; its symbol does not count for another hero. Scarlet Witch mirror matches keep its symbols. Lasts for that Offensive Roll Phase.',
  conjure:'Once per turn in your own Main Phase, spend to inflict Reality Warp or gain one Positive Status Effect from a chosen player’s leaflet. The opponent may block the gain by discarding a card. Unique effects and companions are ineligible.',
  crackle:'Stack limit 3. After activating an attack, spend for +1 damage per remaining Positive or Negative Status token on your board, maximum +3. Unique effects do not count. At most two Crackle per turn. Cannot modify pure damage.',
  illusion:'Stack limit 2. Spend when attacked to arrange three hidden Illusion cards for the attacker to choose. Success gives the attacker Bag of Tricks; Partial Success prevents half damage; Fail prevents all damage. Cannot be transferred. Defence still resolves.',
  bagOfTricks:'Stack limit 2. Remove and roll each token separately in Upkeep: 1 loses 1 CP; 2–5 lets its original Loki choose heal 2, gain 1 CP or take 2 damage; 6 gains 2 CP. Healing and damage accumulate until Upkeep ends.',
  spellbound:'Stack limit 3. Blocks a named non-Ultimate Offensive Ability through upgrades. Existing tokens expire after your next Offensive Roll Phase; tokens inflicted by defence wait for your following Roll Phase. Cannot be transferred. Removed when the board flips.',
  premonition:'Stack limit 3. Once in your Income Phase, spend 1 to draw 2 cards or 3 to draw 3, instead of the usual 1. Return one of those drawn cards to the top or bottom of your deck. Cannot be used when Income is skipped.',
  dejaVu:'Spend before activating an ability to conclude your Offensive Roll Phase and start a new one. No new Income Phase. Statuses that expire at the end of the old Roll Phase are removed.',
  crimsonBands:'Cannot play cards during your next own Roll Phase, until its Defensive Roll Phase concludes. Passives, statuses and casting spells still work. Removed when that Roll Phase ends.',
  cosmicRay:'Stack limit 2. After choosing an attack, spend once per turn to roll 2 dice and add one chosen value. Cannot boost pure damage. Newly gained tokens normally cannot be spent until a later turn. Cosmic Ray cannot be removed or transferred.',
  cosmicFlare:'Stack limit 3. During your Upkeep, deal 1 damage per token to the opponent, then remove 1 token. Compulsory. Damage applies with the other Upkeep damage.',
  radiance:'Stack limit 2. Spend one token to change one of your Defensive Roll Attempt dice to 6. You can spend more than one token on different dice. Cannot change subsidiary card or status rolls.',
  covertOps:'Stack limit 3. Once per turn in your Main Phase, spend to put an upgrade from hand into play for free, or inspect the top 3 cards. If none are upgrades, you may reveal them and search for an upgrade; otherwise reorder them. Cannot be removed or transferred.',
  agility:'Stack limit 2. Spend when receiving damage and roll: on 1–3, prevent half incoming damage, rounded up. Two successful uses prevent all damage. Cannot prevent Ultimate damage.',
  timeBomb:'Stack limit 2. Each bomb has its own countdown. During Upkeep, roll for each: a 6 removes it; otherwise advance it. Advancing 0:01 explodes for 4 isolated undefendable damage. Transfers preserve the countdown.',
  kineticEnergy: 'Every 2 tokens add 1 attack damage. At the stack limit, remove all, gain 2 CP, draw 2 and deal 5 isolated undefendable damage.',
  vibraniumSuit: 'Spend to prevent 3 incoming damage. Can be removed and cannot be transferred.',
  sunDial: 'Dusk gains 1 in upkeep and flips to Dawn at 5. Dawn can add the dial value to an attack, then loses 4 after damage. At 0, flip to Dusk.',
  chargedGem: 'Spend in your Main Phase and roll. On 1–2, gain 1 CP. On 3–4, deal 2 isolated undefendable damage. On 5–6, do both.',
  sunMarked: 'When attacked, the attacker heals 2. Persistent. Pure and collateral damage do not trigger this effect.',
  footwork: 'Move on the Footwork Track with Reposition, abilities and cards. Your final position can give one bonus per turn.',
  guardBreak: 'Spend after activating a defendable attack and roll one die. A 4 or 5 makes it undefendable.',
  disarm: 'During upkeep, discard a card or skip your Income Phase. Then remove Disarm.',
  shapeshift: 'Spend to change between Druid, Bear and Cat forms. Stack limit 2.',
  regenerate: 'Heal 2 during upkeep, then flip to the 1-point side.',
  regenerate1: 'Heal 1 during upkeep, then remove this token.',
  wound: 'Take 1 damage per token during upkeep, then roll for each token. A 4–6 removes it. Stack limit 2.',
  feather: 'Spend 1 to reroll the Nevermore die, 2 to change it by 1, or 3 to activate Nevermore.',
  hex: 'Your sixes have no number or symbol. Remove Hex at the end of your turn.',
  nevermore: 'On an opponent, Nevermore can absorb vitality and triggers an upkeep roll. Returning him normally heals the Raveness for the dial value.',
  prey: 'When attacked, the attacker may roll for each Prey. On 1, remove that token. On 2–5, add 1 damage. On 6, add 2 damage.',
  moonShard: 'Twilight flips Pale Lady at three Moon Shards in upkeep. Werewolf normally loses one at turn end and flips back at zero. Stack limit 3.',
  decrepify: 'After the first Roll Attempt, reroll at most two dice per attempt. Reduces modifiable attack damage by 1 and clears when the Roll Phase ends.',
  resurrect: 'On lethal damage, return with 5 Health. Discard your hand and lose access to cards and CP for the rest of the match.',
  dreadful: 'Adds dice to Hallowed Reckoning and Spectral Assault. Spend 4 during upkeep to Terrorize. Stack limit 5.',
  grim: 'Spend for an extra Roll Attempt or to roll for bonus attack damage. Each option can be used once per turn. Stack limit 3.',
  hauntedHead: 'Each Headless Horseman has a separate Haunted Head. It grants its owner Dreadful at the end of their turn while the opponent holds it.',
  nyraBond: 'Spend to heal Nyra by 2 immediately, or spend when assigning attack damage to split it between Huntress and Nyra.',
  tactical: 'Spend for CP, a reroll of one of your dice, a card, Targeted, Protect or a status transfer. Transfers are only available in your Main Phase.',
  constrict: 'Pay 1 CP for each Roll Attempt after your first. Remove Constrict at the end of that Roll Phase.',
  honor: 'Spend 1 Honor for +1 attack damage or 2 Honor together for +3. Stack limit 2.',
  shame: 'Each Shame reduces your next normal or undefendable attack by 1. A damaging offensive ability consumes Shame even if its damage type is unaffected. Stack limit 2.',
  backStrike: 'When damage is incoming from an opposing offensive ability, spend to roll a die and deal half its value back, rounded up. Ultimates prevent responding with Back Strike.',
  bounty: 'When attacked, take 1 additional damage and give the attacker 1 CP. Persistent. Stack limit 1.',
  reload: 'Spend after activating an attack and roll one die. Add half its value, rounded up, as damage. Stack limit 2.',
  bloodPower: 'Stack limit 5. Once per turn per effect, spend 1 to add 3 attack damage, 2 to remove a status in your Main Phase, 3 to draw 2 cards, or 4 to heal the attack damage you successfully deal.',
  bleed: 'Stack limit 2. In upkeep roll one die per token. A 1–4 deals 1 damage and a 5–6 removes the token.',
  mesmerize: 'Roll one die. On a 5 or 6, force the opponent to reroll one die.',
  flight: 'Spend during a Roll Phase and roll two dice. On any 6, make your attack undefendable or avoid the incoming damage as defender. Stack limit 3.',
  blindingLight: 'After locking in an offensive ability, roll one die. A 1 cancels all effects. A 2 or 3 reduces your final damage by half, rounding the reduction up. An Ultimate uses up the token and resolves normally.',
  holyPresence: 'Deal 1 undefendable damage to the opponent per token during your upkeep. Can be removed. Stack limit 2.',
  synth: 'Stack limit 7. Build a Basic Bot for 2 Synth, upgrade one for 3, or spend 4 to inflict a Nanite.',
  nanite: 'Roll one die per Nanite during upkeep and remove one for each 6. A detonation deals 1, 3 or 5 damage for 1, 2 or 3 Nanites.',

  doubloon: 'Your own Doubloons delay the board flip. Each Doubloon inflicted by an opponent deals 1 upkeep damage. Unique.',
  powderKeg: 'Roll during upkeep. A 1–2 explodes for 3 undefendable damage. On a 6 you may pass the token. A second Keg detonates the first.',
  wither: 'Each token reduces normal or undefendable attack damage by 1. Persistent. Stack limit 2.',
  parlay: 'Your Offensive Roll Phase deals no damage. Other ability effects still resolve. Remove Parlay when the phase ends.',
  delayedPoison: 'At the end of your turn, remove all Delayed Poison and take 3 damage per token. Stack limit 2.',
  smoke: 'Spend while avoidable damage is pending. Roll a die. A 1–3 avoids the damage.',
  ninjutsu: 'Spend to modify your attack. Roll 1–3 for +1 damage, 4–5 for +2, or 6 for a choice. Stack limit 3.',
  crit: 'Spend to add 4 damage to your attack if the offensive ability deals at least 5 damage before modifiers.',
  accuracy: 'Spend at the end of your Offensive Roll Phase to make your attack undefendable.',
  protect: 'Spend to prevent half your incoming damage, rounded up.',
  retribution: 'After being attacked, spend to deal half the incoming damage, rounded up, back to the attacker.',
  blessing: 'If damage would reduce your health to zero, consume this token and set health to 1.',
  chi: 'Spend to prevent incoming damage or boost an eligible attack by 1 per Chi. Chi gained this turn can prevent damage immediately and can boost an attack on a later turn.',
  barbed: 'Take 1 damage per offensive Roll Attempt after the first, up to 2 per turn. The token clears when the Roll Phase ends.',
  wellspring: 'Spend in your Main Phase and roll one die. Heal half the result, rounded up.',
  seedling: 'A companion. Spend once per turn to reroll one of your dice. Stack limit 3.',
  sapling: 'A companion. Spend once per turn to heal 1 and gain 1 CP, or pay 1 CP to draw a card. Stack limit 2.',
  dryad: 'A companion. Spend once per turn to add 3 attack damage or prevent a negative status from an incoming attack.',
  cleanse: 'Spend one Cleanse to remove one other status token from yourself. Stack limit 3.',
  poison: 'Take 1 damage per Poison token during upkeep. Persistent. Stack limit 3.',
  shadows: 'Avoid damage from opposing offensive abilities, except Ultimates. No defence roll against an attack avoided this way. Expires after holding the same token for a complete turn.',
  sneak: 'Spend at the end of your Offensive Roll Phase to roll one die and add that value to a modifiable attack.',
  burn: 'Take 2 damage in your Upkeep Phase. Persistent.',
  knockdown: 'Pay 2 CP before your Offensive Roll Phase or skip it. Then remove Knockdown.',
  fireMastery: 'Used by Pyromancer abilities. Lose 1 Fire Mastery during your Upkeep Phase.',
  targeted: 'Incoming Attacks deal 2 extra damage. Persistent. Stack limit 1.',
  concussion: 'Skip your next Income Phase, then remove Concussion. Stack limit 1.',
  stun: 'You cannot act during this attack. Stun clears when it concludes. If you survive, the attacker starts another Offensive Roll Phase. Stack limit 1.',
  evasive: 'Spend while avoidable damage is pending. Roll a die. A 1 or 2 avoids the damage. Stack limit 3.',
  entangle: 'One fewer attempt in your next Offensive Roll Phase. Remove at the end of that Roll Phase. Stack limit 1.',
  blind: 'Check before resolving your next offensive ability. A 1 or 2 cancels it. Remove Blind if you end the phase without an ability. Stack limit 1.'
};
function tokenImage(view,seat,key,bombId) {
  if (!key) return '';
  const hero=heroId(view,seat), player=view.players[seat];
  const tokenArt=hero===mysticBrawler.id&&key==='concussion'?'mysticConcussion':hero===alchemist.id&&key==='poison'?'alchemistPoison':hero===psylocke.id&&key==='agility'?'psylockeAgility':hero===thor.id&&key==='guardBreak'?'thorGuardBreak':hero===gunslinger.id&&key==='evasive'?'gunslingerEvasive':
    hero===gunslinger.id&&key==='knockdown'?'gunslingerKnockdown':
    hero===tactician.id&&key==='targeted'?'tacticianTargeted':
    hero===tactician.id&&key==='protect'?'tacticianProtect':
    hero===seraph.id&&key==='cleanse'?'seraphCleanse':
    hero===seraph.id&&key==='blessing'?'seraphBlessing':key;
  let image=key==='manifestDie'?art.manifestDice[(player.manifestDie||1)-1]:key==='sunDial'?(player.sunDawn?art.dialSun:art.dialDusk):key==='regenerate1'?art.regenerate:key==='regenerate'?art.regenerate2:key==='moonShard'?art.moonShards[(player.moonShard||1)-1]:art[tokenArt];
  if (key==='timeBomb') {
    const timers = player.timeBombTimers ?? [];
    const timer = bombId===undefined ? timers[0] : timers.find(bomb=>bomb.id===bombId);
    if (bombId===undefined && timers.some(bomb=>bomb.ticks!==timer?.ticks)) return '';
    if (timer?.ticks===1) image=art.timeBomb1;
  }
  return image?`<img class="token-icon" src="${image}" alt="">`:'';
}

function tokenChoiceLabel(view, choice, seat) {
  const image = tokenImage(view,choice.target??seat,choice.status??choice.key,choice.bombId??choice.tokenId);
  return image?`<span class="token-choice">${image}<span>${choice.label}</span></span>`:choice.label;
}

const token = (seat,key,label,suffix=key,bombId,scope='hero') => {
  const id = `status-${scope}-${seat}-${suffix}`;
  return `<span class="token-help">${button('status',`<span class="token">${tokenImage(state,seat,key,bombId)}${label}</span>`,
    `aria-expanded="false" aria-controls="${id}" aria-describedby="${id}"`)}<span class="token-note" id="${id}" hidden>${statusNotes[key]}</span></span>`;
};
const urgentStatuses = new Set(['timeBomb','phoenixBurn','poison','burn','delayedPoison',
  'bleed','wound','powderKeg','concussion','knockdown','disarm','blind','blindingLight']);
const undeadNotes = {
  warrior: 'Bone Spear adds 1 damage to your attack.',
  mage: 'Withering inflicts Decrep-ify. After using three Bone Spears, Scything Touch can steal 1 Health.',
  golem: 'Bone Spur adds 2 damage to your attack. When defending, you can remove the Golem to prevent 2 damage and deal 2 damage back.'
};
const botNotes = {
  nanobot: 'Detonate Nanites during your Upkeep. Deal 1, 3 or 5 damage for 1, 2 or 3 Nanites on each affected hero.',
  shockbot: 'Add 3 damage to your attack once per turn.',
  healbot: 'When an eligible attack deals at least 6 damage, roll to heal 1 on a Wrench or 2 on another symbol. Up to twice per attack.'
};

function heroStatuses(seat) {
  const p = state.players[seat];
  const status = (key, label, suffix, bombId, count = Number.isInteger(p[key]) ? p[key] : undefined) =>
    ({key, label, suffix, bombId, count, note:statusNotes[key], icon:tokenImage(state,seat,key,bombId)});
  return [p.evasive && status('evasive',`Evasive ×${p.evasive}`),p.entangle && status('entangle','Entangle'),p.blind && status('blind','Blind'),p.targeted && status('targeted','Targeted'),
    p.pirateCoins?.[seat]&&status('doubloon',`Own Doubloons ×${p.pirateCoins[seat]}`,undefined,undefined,p.pirateCoins[seat]),
    p.pirateCoins?.[1-seat]&&status('doubloon',`Opponent’s Doubloons ×${p.pirateCoins[1-seat]}`,'opponent',undefined,p.pirateCoins[1-seat]),
    ...['powderKeg','wither','parlay'].map(key=>p[key]&&status(key,statusLabel(key)+(key==='wither'?` ×${p[key]}`:''))),
    ...['flight','blindingLight','holyPresence'].map(key=>p[key]&&status(key,statusLabel(key)+(key==='blindingLight'?'':` ×${p[key]}`))),
    ...['bloodPower','bleed','mesmerize'].map(key=>p[key]&&status(key,statusLabel(key)+(key==='mesmerize'?'':` ×${p[key]}`))),
    ...Object.entries(p.armor??{}).filter(([,tier])=>tier).map(([slot,tier])=>{
      const name=forgemaster.armorName(slot,tier);
      const imageKey=name.split(' ')[0].toLowerCase()+(slot==='helm'?'Helm':'Shield');
      const note = slot==='helm' ? `When defending against a normal attack, deal ${tier} damage back.`
        : `Prevent ${Math.min(2,tier)} incoming damage from ${tier===3?'a normal, undefendable or pure attack':'a normal attack'}.`;
      return {label:name, note, icon:`<img src="${art[imageKey]}" alt="">`};
    }),
    p.combo&&status('combo','Combo'),
    p.invisibility&&status('invisibility','Invisibility'),
    p.webbed&&status('webbed','Webbed'),
    p.probabilityManipulation>0&&status('probabilityManipulation',`Probability Manipulation ×${p.probabilityManipulation}`),
    p.realityWarp&&status('realityWarp','Reality Warp'),
    p.conjure&&status('conjure','Conjure'),
    p.crackle>0&&status('crackle',`Crackle ×${p.crackle}`),
    p.illusion>0&&status('illusion',`Illusion ×${p.illusion}`),
    ...(p.trickBags??[]).map(b=>status('bagOfTricks',`Bag of Tricks · ${names[b.owner]}`,`bag-${b.id}`)),
    ...(p.boundAbilities??[]).map(b=>status('spellbound',`Spellbound · ${b.key}`,`bound-${b.id}`)),
    p.premonition>0&&status('premonition',`Premonition ×${p.premonition}`),
    p.dejaVu&&status('dejaVu','Déjà Vu'),
    p.crimsonBands&&status('crimsonBands','Crimson Bands'),
    p.cosmicRay>0&&status('cosmicRay',`Cosmic Ray ×${p.cosmicRay} · ${(p.cosmicRays??[]).filter(ray=>captainMarvel.readyRay(ray,state.turn)).length} ready`),
    p.cosmicFlare>0&&status('cosmicFlare',`Cosmic Flare ×${p.cosmicFlare}`),
    p.radiance>0&&status('radiance',`Radiance ×${p.radiance}`),
    p.covertOps>0&&status('covertOps',`Covert Ops ×${p.covertOps}`),
    p.agility>0&&status('agility',`Agility ×${p.agility}`),
    ...(p.timeBombTimers??[]).map((b,i)=>status('timeBomb',`Time Bomb ${i+1} · 0:0${b.ticks}`,`timeBomb-${b.id}`,b.id)),
    p.kineticEnergy>0&&status('kineticEnergy',`Kinetic Energy ${p.kineticEnergy}/${statusCap(p,'kineticEnergy')}`),
    p.vibraniumSuit&&status('vibraniumSuit','Vibranium Suit'),
    p.sunMarked&&status('sunMarked','Sun Marked'),
    p.chargedGem&&status('chargedGem','Charged Gem'),
    p.guardBreak>0&&status('guardBreak',`Guard Break ×${p.guardBreak}`),
    p.disarm&&status('disarm','Disarm'),
    p.shapeShift>0&&status('shapeshift',`Shape Shift ×${p.shapeShift}`,undefined,undefined,p.shapeShift),
    p.regenerate>0&&status('regenerate',`Regenerate (2) ×${p.regenerate}`),
    p.regenerate1>0&&status('regenerate1',`Regenerate (1) ×${p.regenerate1}`),
    p.wound>0&&status('wound',`Wound ×${p.wound}`),
    p.hex&&status('hex','Hex'),
    p.feather>0&&status('feather',`Feathers ${p.feather}/${p.featherCap??5}`),
    p.moonShard>0&&status('moonShard',`Moon Shards ×${p.moonShard}`),
    p.prey>0&&status('prey',`Prey ×${p.prey}`),
    ...Object.entries(p.undead??{}).filter(([,count])=>count).map(([kind,count])=>{
      const {name}=necromancer.undead[kind], key={warrior:'skeletalWarrior',mage:'skeletalMage',golem:'boneGolem'}[kind];
      return {label:`${name} ×${count}`, count, icon:`<img src="${art[key]}" alt="">`, note:undeadNotes[kind]};
    }),
    p.resurrect&&status('resurrect','Resurrect'),
    p.decrepify&&status('decrepify','Decrep-ify'),
    p.dreadful&&status('dreadful',`Dreadful ×${p.dreadful}`),
    p.grim&&status('grim',`Grim Pursuit ×${p.grim}`),
    ...state.players.map((owner,i)=>owner.hauntedHeadSeat===seat&&status('hauntedHead',i===seat?'Own Haunted Head':'Opponent’s Haunted Head',`hauntedHead-${i}`)),
    p.nyraBond&&status('nyraBond','Nyra’s Bond'),
    ...alchemist.types.map(key=>p[key]&&status(key,`${statusLabel(key)} ${p[key]}/${alchemist.limits[key]}`)),
    p.coal&&status('coal',`Coal ${p.coal}/4`),
    p.gift&&status('gift',`Gift ${p.gift}/3`),
    ...['donut','onomatopoeia','rps'].map(key=>p[key]&&status(key,`${statusLabel(key)} ${p[key]}/${statusCap(p,key)}`)),
    ...['cheer','eggNog'].map(key=>p[key]&&status(key,`${statusLabel(key)} ${p[key]}/${statusCap(p,key)}`)),
    ...mysticBrawler.keys.map(key=>p[key]&&status(key,`${statusLabel(key)} ${p[key]}/${mysticBrawler.caps[key]}`)),
    p.rage&&status('rage',`Rage ${p.rage}/3`),
    p.alpha&&status('alpha','Alpha'),
    p.tornado&&status('tornado',`Tornado ${p.tornado}/4`),
    p.windShear&&status('windShear','Wind Shear'),
    p.influence&&status('influence',`Influence ${p.influence}/3`),
    p.ionicEnergy&&status('ionicEnergy',`Ionic (1) ×${p.ionicEnergy} · ${rogue.total(p)}/${rogue.cap(p)}`),
    p.ionicEnergy2&&status('ionicEnergy2',`Ionic (2) ×${p.ionicEnergy2} · ${rogue.total(p)}/${rogue.cap(p)}`),
    p.skyward&&status('skyward',`Skyward ${p.skyward}/2`),
    p.paralyze&&status('paralyze','Paralyze'),
    p.infiltration&&status('infiltration',`Infiltration ${p.infiltration}/2`),
    p.acuity&&status('acuity',`Acuity ${p.acuity}/4`),
    p.flameBlast&&status('flameBlast',`Flame Blast ${p.flameBlast}/5`),
    p.forceField&&status('forceField','Force Field'),
    p.phoenixBurn&&status('phoenixBurn','Phoenix Burn'),
    p.iceShard&&status('iceShard',`Ice Shards ${p.iceShard}/5`),
    p.diceCube&&status('diceCube',`Dice Cube ×${p.diceCube}`),
    p.glide&&status('glide','Glide'),
    p.dissolution&&status('dissolution',`Dissolution ×${p.dissolution}`),
    p.disruption&&status('disruption','Disruption'),
    p.battlePlan&&status('battlePlan',`Battle Plan ${p.battlePlan}/4`),
    p.support&&status('support',`Support ${p.support}/3`),
    p.focusFire&&status('focusFire',`Focus Fire ×${p.focusFire}`),
    p.electrokinesis&&status('electrokinesis',`Electrokinesis ${p.electrokinesis}/4`),
    ...state.players.map((owner,i)=>owner.mjolnirSeat===seat&&status('mjolnir',i===seat?'Own Mjölnir':`${names[i]}’s Mjölnir`,`mjolnir-${i}`)),
    p.tactical&&status('tactical',`Tactical Advantage ${p.tactical}/${statusCap(p,'tactical')}`),
    p.constrict&&status('constrict','Constrict'),
    p.honor&&status('honor',`Honor ×${p.honor}`),p.shame&&status('shame',`Shame ×${p.shame}`),
    p.backStrike&&status('backStrike','Back Strike'),
    p.reload&&status('reload',`Reload ×${p.reload}`),p.bounty&&status('bounty','Bounty'),
    p.synth&&status('synth',`Synth ×${p.synth}`),p.nanite&&status('nanite',`Nanite ×${p.nanite}`),
    ...Object.entries(p.bots??{}).map(([bot,level])=>({
      label:`${level===2?'Advanced':'Basic'} ${artificer.bots[bot]}`,
      icon:`<img src="${art.artificerBots[bot][level-1]}" alt="">`,
      note:`Costs ${artificer.cost(p,bot)} Synth to activate. ${botNotes[bot]}`
    })),
    p.barbed&&status('barbed','Barbed Vine'),p.wellspring&&status('wellspring','Wellspring'),
    ...spiritTypes.map(key=>p[key]&&status(key,`${statusLabel(key)} ×${p[key]}`)),
    p.delayedPoison&&status('delayedPoison',`Delayed Poison ×${p.delayedPoison}`),
    p.smoke&&status('smoke','Smoke Bomb'),p.ninjutsu&&status('ninjutsu',`Ninjutsu ×${p.ninjutsu}`),
    ...[...paladinBuffs,'blessing'].map(key=>p[key]&&status(key,statusLabel(key))),
    p.chi&&status('chi',`Chi ${p.chi}/${statusCap(p,'chi')}`),p.cleanse&&status('cleanse',`Cleanse ×${p.cleanse}`),
    p.poison&&status('poison',`Poison ×${p.poison}`),p.shadows&&status('shadows','Shadows'),p.sneak&&status('sneak','Sneak Attack'),
    p.burn&&status('burn','Burn'),p.knockdown&&status('knockdown','Knockdown'),
    p.fireMastery&&status('fireMastery',`Fire Mastery ${p.fireMastery}/${statusCap(p,'fireMastery')}`),
    p.concussion && status('concussion','Concussion')].filter(Boolean);
}

function tokenSymbol(label, icon) {
  return icon || `<span class="token-initial" aria-hidden="true">${label.slice(0,2)}</span>`;
}

function mobileTokens(seat, statuses) {
  if (!statuses.length) return '';
  return `<div class="hero-token-strip" aria-label="${names[seat]}’s attached tokens">
    ${statuses.map(({icon, label, count},index)=>{
      const symbol = tokenSymbol(label,icon);
      const badge = count>0 ? `<small class="token-count" aria-hidden="true">${count}</small>` : '';
      return button('inspect-token',symbol+badge,
        `class="hero-token-button" data-seat="${seat}" data-index="${index}" aria-label="${label}" aria-haspopup="dialog" aria-controls="token-info"`);
    }).join('')}
  </div>`;
}

function heroStateRows(seat, scope) {
  const player = state.players[seat];
  const hero = heroId(state,seat);
  const note = (key, label, suffix) => token(seat,key,label,suffix,undefined,scope);
  const rows = [
    hero===jeanGrey.id && `${player.darkPhoenix?'Dark Phoenix':'Jean Grey'} active`,
    player.werewolf && 'Werewolf form',
    player.druidForm && `${druid.formName(player.druidForm)} Form`,
    player.resurrected && 'Resurrected · CP and cards locked',
    state.stage==='locked' && state.pending.stun && seat!==state.active && note('stun','Stun'),
    player.nyra && `<span class="token"><img src="${art.nyraDials[Number(player.nyra.downed)]}" alt="">Nyra · ${player.nyra.downed?'Downed':'Active'} · ${player.nyra.hp}/7 Health</span>`,
    ...state.players.map((owner,i)=>owner.nevermoreSeat===seat &&
      note('nevermore',`Nevermore${heroId(state,1-i)===raveness.id?` (P${i+1})`:''} · ${owner.nevermoreVitality}/3`,`nevermore-${i}`)),
    player.sunDial!==undefined && note('sunDial',`${player.sunDawn?'Dawn':'Dusk'} · ${player.sunDial}/5`),
    player.footwork!==undefined && note('footwork',`Footwork · ${duelist.positions[player.footwork+2]}`),
    player.corpses!==undefined && `<span class="token"><img src="${art.corpseDial}" alt="">Corpses ${player.corpses}/10</span>`,
    player.covered && `Unearth covers ${player.covered}`,
    hero===cyclops.id && `<span role="status">Leadership cards played this turn: <strong>${cyclops.count(state,seat)}</strong></span>`,
    state.realityDie?.seat===seat && note('realityWarp','Reality Warp · Scarlet Witch die 5','active'),
    hero===psylocke.id && note('manifestDie',`Manifest die · ${player.manifestDie||1}${!player.manifestDie?' · not rolled':''}${player.manifestUsedTurn===state.turn?' · used this turn':''}`),
    player.lightningCharges && `<details><summary>Lightning · ${Object.values(player.lightningCharges).filter(Boolean).length} charged abilities</summary>
      ${storm.slots.map((slot,i)=>note('lightning',`${slot}: ${player.lightningCharges[slot]?'Charged':'empty'}`,`lightning-${i}`)).join('')}</details>`
  ].filter(Boolean);
  return rows.length ? `<div class="hero-states">${rows.map(row=>`<div class="hero-state-row">${row}</div>`).join('')}</div>` : '';
}

function hero(seat, decisionSeat, responding) {
  const p = state.players[seat];
  const statuses = heroStatuses(seat);
  const summaryLabels = statuses.filter(({key}) => urgentStatuses.has(key))
    .concat(statuses.filter(({key}) => !urgentStatuses.has(key)));
  const visibleStatuses = summaryLabels.slice(0, 2).map(({label}) => label).join(' · ');
  const moreStatuses = statuses.length > 2 ? `+${statuses.length - 2}` : '';
  const statusSummary = visibleStatuses || 'Hero details';
  const ready = seat === decisionSeat && state.stage !== 'finished';
  return `<section class="hero seat-${seat}" aria-label="${names[seat]}" data-deciding="${ready}" style="--hero:${seat ? '#89cbc5' : '#e9a987'}">
    <div class="hero-head">
      <div class="hero-identity">
        ${heroPortrait(heroId(state,seat))}
        <div>
          <span class="seat-label">Player ${seat + 1}</span>
          <h2>${names[seat]}</h2>
          <div class="vitals"><span><strong>${p.hp}</strong> Health</span><span><strong>${p.cp}</strong> CP</span></div>
          ${canEditTestVitals() ? button('test-vitals', 'Edit Health / CP',
            `class="test-vitals-button" data-index="${seat}" aria-label="Edit ${names[seat]}’s Health and CP" aria-haspopup="dialog"`) : ''}
        </div>
      </div>
      <div class="hero-links">
        ${boardButton(seat)}
        ${button('inspect-leaflet','Leaflet',`data-index="${seat}" aria-label="Open ${names[seat]}’s leaflet" aria-haspopup="dialog"`)}
      </div>
      ${heroId(state,seat)===deadpool.id&&seat===responding&&seat===state.active&&isMain(state)&&!state.cardRoll&&!state.mainAction&&!rollRequest?
        button('toggleCurmudgeon',`<img src="${art.curmudgeonCoin}" alt="" width="24" height="24"><span>Curmudgeon coin · ${p.curmudgeon?'On':'Off'}</span>`,`class="curmudgeon-toggle" aria-pressed="${!!p.curmudgeon}" title="Waive Deadpool’s spoken bonus requirements"`):''}
    </div>
    ${mobileTokens(seat,statuses)}
    ${button('open-hero-details','Hero details',
      `class="hero-sheet-trigger" data-index="${seat}" aria-label="${names[seat]}’s hero details" aria-haspopup="dialog" aria-controls="hero-sheet"`)}
    <details class="hero-information" data-disclosure="hero-${seat}">
      <summary>${statusSummary}${moreStatuses?` · ${moreStatuses}`:''}</summary>
      ${heroInformation(seat,statuses)}
    </details>
  </section>`;
}

function heroInformation(seat, statuses, compact = false) {
  const p = state.players[seat];
  const drawCount = p.deck.length ?? p.deck;
  const discardCount = p.discard?.length ?? 0;
  const shootLabel = `Shoot · ${p.shootActive?'Active':'Inactive'}`;
  const spellBook = p.spellBook && `<div class="controls">${p.spellBook.map(id =>
    button('inspect-card',doctorStrange.spells[id],`data-index="${id}" data-seat="${seat}"`)).join('')||'No prepared Spells'}</div>`;
  const spellBookLabel = `Book of Vishanti · ${p.spellBook?.length ?? 0} prepared`;
  return `<div class="hero-information-body">
        ${heroStateRows(seat,compact?'sheet':undefined)}
        <div class="tokens">${statuses.map(({key,label,suffix,bombId,icon})=>key
          ? token(seat,key,label,suffix,bombId,compact?'sheet':undefined)
          : `<span class="token">${icon}${label}</span>`).join('') || 'No tokens'}</div>
        <div class="inventory">
          ${button('open-deck',`<img src="${art.back}" alt="">Draw ${drawCount}`,`class="draw-count" data-index="${seat}" aria-label="Draw ${drawCount}. View ${names[seat]}’s ${compact?'draw pile':'deck list'}" aria-haspopup="dialog"${compact?' data-location="draw"':''}`)}
          ${compact?button('open-deck',`Discard ${discardCount}`,`data-index="${seat}" data-location="discard" aria-label="Discard ${discardCount}. View ${names[seat]}’s discard pile" aria-haspopup="dialog"`):`<span>Discard ${discardCount}</span><span>${p.hand.length ?? p.hand} in hand</span>`}
        </div>
        ${p.undead?`<div class="hero-reference-row">${button('inspect-undead','Undead reference',`class="hero-component-link" data-index="${seat}" aria-haspopup="dialog"`)}</div>`:''}
        ${heroComponents(seat)}
    ${heroId(state,seat)===deadpool.id?(compact
      ? `<div class="hero-reference-row">${button('inspect-shoot',shootLabel,`class="hero-component-link" data-index="${seat}" aria-haspopup="dialog"`)}</div>`
      : `<details class="token-actions deadpool-shoot" data-disclosure="shoot-${seat}"><summary>${shootLabel}</summary><div class="controls">${button('inspect-shoot',`<img src="${art.deadpoolShoot[p.shootActive?0:1]}" alt="${shootLabel}" style="max-width:120px;width:100%">`,`data-index="${seat}"`)}</div><p>The Shoot card is separate from the draw deck.</p></details>`):''}
    ${spellBook?(compact
      ? `<details class="forge-inventory"><summary>${spellBookLabel}</summary>${spellBook}</details>`
      : `<div class="forge-inventory"><strong>${spellBookLabel}</strong>${spellBook}</div>`):''}
    ${p.forgeOre?`<details class="forge-inventory" data-disclosure="forge-${seat}"><summary>The Forge · ${p.forgeOre.length} Ore</summary>
      <div class="controls">${[19,28,34].map(id=>{
        const ore=forgemaster.oreType(id),cards=p.forgeOre.filter(card=>forgemaster.oreType(card)===ore);
        return cards.length?button('inspect-card',`${seatCard(state,seat,id).name} ×${cards.length}`,`data-index="${id}" data-seat="${seat}"`):'';
      }).join('')}${['mining','crafting'].map(key=>button('inspect-forging',key==='mining'?'Mining rules':'Crafting rules',`data-status="${key}"`)).join('')}</div>
    </details>`:''}
    ${p.freezer?`<details class="token-actions" data-disclosure="freezer-${seat}"><summary>The Freezer · ${p.freezer.shards}/5 Ice Shards · ${p.freezer.glide?'Glide stored':'No Glide'}</summary><div class="controls">${button('inspect-freezer','View The Freezer',`data-index="${seat}"`)}</div><p>Stored tokens are out of play. They cannot be removed, transferred by ordinary status cards or counted for damage. Only an authorised ability or card can transfer them to your board. Five stored shards can be converted into stored Glide.</p></details>`:''}
    ${p.aces?`<details class="token-actions" data-disclosure="aces-${seat}"><summary>Ace cards · ${p.aceTurn===state.turn?p.aceExploded??0:0}/${1+(p.aceTurn===state.turn?p.aceExtra??0:0)} exploded this turn</summary><div class="controls">${gambit.suits.map((suit,i)=>`<figure style="max-width:150px;margin:6px">${button('inspect-ace',`<img src="${p.aces[suit].up?art.gambitAces[i]:art.back}" alt="${suit} Ace" style="width:100%">`,`data-index="${i}" data-seat="${seat}"`)}<figcaption>${statusLabel(suit)} · ${p.aces[suit].up?`${p.aces[suit].charge}/${gambit.caps[suit]} charged`:'Face down'}</figcaption></figure>`).join('')}</div><p>One Ace explosion per turn in total, plus any additional allowance. Acceleration tokens remain on their own Aces and cannot be transferred or removed.</p></details>`:''}
  </div>`;
}
function dieFace(values, seat, index, view, value = values[index], showFace = false) {
  const primary = values === view.dice;
  const blank = !dieValue(value,view.players[seat]);
  const foreign = primary && view.realityDie?.seat===seat && view.realityDie.index===index;
  const borrowed = primary && storm.borrowed(view,seat,index);
  const ownerHero = heroId(view,seat);
  const dieHero = values===view.santaNogRoll?.dice ? santa.id : foreign ? scarletWitch.id
    : primary ? storm.dieHero(view,seat,index) : ownerHero;
  const manifest = primary && ownerHero===psylocke.id && view.players[seat].manifestIndex===index;
  const symbols = HEROES[dieHero].symbols[value-1];
  const label = blank ? showFace ? `${value}, blank due to Hex` : 'Blank · Hex'
    : borrowed ? `${value} ${symbols} · borrowed ${HEROES[dieHero].name} die${dieHero!==ownerHero?', symbol unavailable':''}`
    : foreign && ownerHero!==scarletWitch.id ? `${value} · Scarlet Witch die, symbol unavailable`
    : `${value} ${symbols}${manifest?' · Manifest die':''}`;
  const image = manifest ? art.manifestDice[value-1] : art.dice[dieHero][value-1];
  const picture = blank&&!showFace ? '<span aria-label="Blank due to Hex">—</span>' : `<img src="${image}" alt="${label}">`;
  return {label,picture};
}

const rerollBadge = '<small class="reroll-badge" aria-hidden="true">New</small>';

function tray(values,seat,editable,held=[],view=state,rerolled=values.rerolled) {
  return `<div class="dice" role="group" aria-label="${names[seat]} dice">${values.map((value,i) => {
    if (!value) return blankDie;
    const {label,picture} = dieFace(values,seat,i,view);
    if(values===view.dice&&iceman.locked(view,seat,i))return `<span class="die frozen" aria-label="Die ${i+1}, ${label}, frozen by Dice Cube">${picture}<small class="frozen-label" aria-hidden="true">Frozen</small></span>`;
    const fresh = rerolled?.includes(i);
    const face = picture + (fresh ? rerollBadge : '');
    const classes = `class="die${fresh?' rerolled':''}"`;
    const description = `Die ${i+1}, ${label}${fresh?', rerolled':''}`;
    return editable ? button('hold',face,`${classes} data-index="${i}" aria-pressed="${!!held[i]}" aria-label="${description}, ${held[i]?'held':'available to reroll'}"`)
      : `<span class="die${held[i]?' kept':''}${fresh?' rerolled':''}"${held[i]||fresh?` aria-label="${description}${held[i]?', held':''}"`:''}>${face}</span>`;
  }).join('')}</div>`;
}
function handCardChoices(choices, seat, view = state) {
  if (!choices.length || (choices.length===1 && choices[0].label==='Play')) return '';
  const labels=choices.map(choice=>tokenChoiceLabel(view,choice,seat));
  if (labels.some((label,index)=>label!==choices[index].label)) {
    return `<fieldset class="card-token-choices"><legend>Choose effect</legend>
      ${labels.map((label,index)=>`<label><input type="radio" name="card-choice" value="${index}" ${index===0?'checked':''}>${label}</label>`).join('')}
    </fieldset>`;
  }
  return `<label>Choose effect <select id="card-choice">${labels.map((label,index)=>`<option value="${index}">${label}</option>`).join('')}</select></label>`;
}

function handOptions(seat) {
  const canPlay = !rollRequest && canPlayFromHand(state, seat);
  return state.players[seat].hand.map(id => ({id, choices: canPlay ? cardChoices(state,seat,id) : []}));
}

function handPanel() {
  if(!state.cards || state.stage==='finished')return '';
  const seat=handSeat, options=handOptions(seat);
  const canSell = !rollRequest && canPlayFromHand(state, seat) && isSelling(state) && seat===state.active;
  if(!options.length)return '<p>No cards in hand.</p>';
  const groups={playable:[],unavailable:[]};
  for(const {id,choices} of options){
    const c=seatCard(state,seat,id);
    const chosen=selectedCard===id;
    const detail=chosen&&!cardDicePlan(seat,id,choices)?handCardChoices(choices,seat):'';
    const entry=`<div class="hand-card">
      ${button('select-card',`<strong>${c.name}</strong><small>${price(state,seat,id)} CP · ${c.phase}</small>`,`data-index="${id}" aria-expanded="${chosen}"`)}
      ${previewCard(state,seat,id)}
    </div>${chosen?`<div class="card-command">${detail}
      ${choices.length?button('playCard','Play card',`class="primary" data-index="${id}"`):'<small>Unavailable in this window.</small>'}
      ${canSell?button('sell','Sell for 1 CP',`data-index="${id}"`):''}</div>`:''}`;
    groups[choices.length?'playable':'unavailable'].push(entry);
  }
  return [['Playable now',groups.playable],['Unavailable now',groups.unavailable]]
    .filter(([,cards])=>cards.length)
    .map(([heading,cards])=>`<section class="hand-group"><h3>${heading}</h3><div class="hand-grid">${cards.join('')}</div></section>`).join('');
}
function incomeSummary(income) {
  if(!income)return '';
  let message;
  if(income.skipped==='first-turn')message='Skipped on the starting hero’s first turn.';
  else if(income.skipped==='dark-phoenix')message='Skipped while Dark Phoenix is Active.';
  else if(income.skipped==='disarm')message='Skipped due to Disarm.';
  else if(income.skipped==='alpha')message='Skipped due to Alpha.';
  else if(income.skipped==='concussion')message='Skipped due to Concussion.';
  else {
    const cp=income.coal?'Coal prevented the 1 CP gain':income.cp ? '+1 CP' : 'CP already at the cap';
    const card=income.drawn ? 'drew 1 card' : 'no cards available to draw';
    message=`${cp} · ${card}`;
  }
  return `<div class="income-note" role="status"><strong>Income Phase</strong> · ${message}</div>`;
}
function orderedDice(dice, owners, first) {
  return dice.map((value, index) => ({value, owner: owners[index], index}))
    .sort((left, right) => Number(right.owner === first) - Number(left.owner === first));
}

function opposedTray(dice, owners, first, playerNames, renderDie) {
  return `<div class="opposed-dice" role="group" aria-label="${dice[0] ? 'Opposed dice' : 'Unrolled dice'}">${orderedDice(dice, owners, first)
    .map(({value, owner, index}) => `<div><strong>${playerNames[owner]}</strong>${renderDie(value, owner, index)}</div>`).join('')}</div>`;
}

function rerolledIndices(context, view) {
  return context.rerolled ?? context.dice.rerolled ??
    (context.scalar && view.uiScalarReroll === view.stage ? [0] : []);
}

function rollDisplay(context, view = state, first = view.active) {
  const rerolled = rerolledIndices(context,view);
  if (!context.owners) return tray(context.dice, context.seat, false, context.held, view, rerolled);
  return opposedTray(context.dice, context.owners, first, names, (value, owner, index) =>
    tray([value], owner, false, [], view, rerolled.includes(index) ? [0] : []));
}

function scalarTray(seat) {
  return rollDisplay({dice:[state.effectDie],seat,scalar:true});
}

function cardDicePlan(seat, id, choices) {
  const context = rollContext(state);
  if (!context) return null;
  const options = choices.map((choice, choiceIndex) => {
    const index = choice.i ?? (Number.isInteger(choice.to) ? choice.index : undefined);
    const dice = Number.isInteger(index) ? [[index, choice.v ?? choice.to ?? null]] : [];
    if (Number.isInteger(choice.j)) dice.push([choice.j, choice.w ?? null]);
    return {choiceIndex, label: choice.label, dice};
  });
  const diceOptions = options.filter(option => option.dice.length);
  if (!diceOptions.length) return null;
  const hero = heroId(state,seat);
  const mode = diceOptions[0].dice[0][1] !== null ? 'change'
    : hero===cursedPirate.id && id===29 ? 'target' : 'reroll';
  const cost = hero===cyclops.id && id===27 ? 'Changing a die spends 1 Support and 1 Battle Plan.' : '';
  return {seat,id,context,options,mode,cost,limit:Math.max(...diceOptions.map(option=>option.dice.length))};
}

function activeDiceOptions(editor, except) {
  return editor.options.filter(option => option.dice.length && [...editor.picks].every(([index, face]) =>
    index === except || option.dice.some(([candidate, value]) => candidate === index && value === face)));
}

function selectableRoll(context, renderDie) {
  if (!context.owners) {
    return `<div class="dice" role="group" aria-label="${names[context.seat]} dice">${context.dice.map((_,i)=>renderDie(i,context.seat)).join('')}</div>`;
  }
  return opposedTray(context.dice,context.owners,state.active,names,(_,owner,index)=>
    `<div class="dice">${renderDie(index,owner)}</div>`);
}

function selectableDie(context, index, seat, action, enabled, selected, face, open = false, attrs = '') {
  const {label,picture} = dieFace(context.dice,seat,index,state,face);
  const frozen = iceman.contextLocked(state,context,index);
  const fresh = face===undefined && rerolledIndices(context,state).includes(index);
  const content = picture + (fresh ? rerollBadge : '') +
    (frozen ? '<small class="frozen-label" aria-hidden="true">Frozen</small>' : '');
  const classes = `class="die${selected?' kept':''}${open?' face-picker-open':''}${enabled?'':' unavailable-die'}${frozen?' frozen':''}${fresh?' rerolled':''}"`;
  const description = `aria-label="Die ${index+1}, ${label}${frozen?', frozen':''}${fresh?', rerolled':''}"`;
  if (!enabled) return `<span ${classes} ${description}>${content}</span>`;
  const expanded = action==='pick-card-die' && diceEdit?.mode==='change' ? ` aria-expanded="${open}"` : '';
  return button(action,content,`${classes} ${description} data-index="${index}" aria-pressed="${selected}"${expanded} ${attrs}`);
}

function diceSelectionTray(context, options, instruction, pickAction, renderButton) {
  const group = options[0].type;
  const picks = dicePicks.get(group) ?? new Set();
  const max = Math.max(...options.map(option=>option.limit));
  const permits = (option,index) => option.canPick?.(context.dice[index],index) ?? true;
  const dice = selectableRoll(context,(index,owner)=>{
    const selected = picks.has(index);
    const enabled = selected || options.some(option=>permits(option,index) &&
      (max===1 || picks.size<option.limit && [...picks].every(pick=>permits(option,pick))));
    return selectableDie(context,index,owner,pickAction,enabled,selected,undefined,false,
      `data-dice-group="${group}" data-limit="${max}"`);
  });
  const actions = options.map(option=>{
    const ready = picks.size >= (option.minimum ?? 1) && picks.size<=option.limit &&
      [...picks].every(index=>permits(option,index));
    const label = typeof option.label==='function' ? option.label(picks) : option.label;
    const choice = ready && option.choice ? `data-choice="${option.choice(picks)}"` : '';
    return renderButton(option.type,label,`data-dice-group="${group}" ${choice} ${option.primary?'class="primary"':''} ${ready?'':'disabled'}`);
  }).join('');
  return `${instruction?`<p>${instruction}</p>`:''}${dice}<div class="controls">${actions}</div>`;
}

function rerollTray(context, options, renderButton = button) {
  if (!options.length) return rollDisplay(context);
  const max = Math.max(...options.map(option=>option.limit));
  const instruction = max===1 ? 'Select a die to reroll.' : `Select up to ${max} dice to reroll.`;
  return diceSelectionTray(context,options.map(option=>({
    ...option, primary:option.type==='retryDie',
    label:option.label ?? (options.length>1 ? `Ability reroll · up to ${option.limit}`
      : option.limit===1 ? 'Reroll selected die' : 'Reroll selected dice')
  })),instruction,'pick-reroll-die',renderButton);
}

function chooseDiceTray(context, type, label, {count = 1, canPick, choice} = {}) {
  return diceSelectionTray(context,[{type,label,minimum:count,limit:count,canPick,choice,primary:true}],
    '', 'pick-match-die', button);
}

function faceChoices(editor, index) {
  return [...new Set(activeDiceOptions(editor,index).flatMap(option=>
    option.dice.filter(([candidate])=>candidate===index).map(([,face])=>face)))].sort((a,b)=>a-b);
}

function facePicker(index, faces, renderFace, action, selected, extra = '') {
  if (index === undefined) return '';
  return `<div class="face-picker" role="group" aria-label="New face for die ${index+1}">
    <strong>New face for die ${index+1}</strong>
    <div class="face-picker-options">${faces.map(value => {
      const {label, picture} = renderFace(value);
      return button(action, picture, `class="die" data-index="${value}" aria-label="${label}" aria-pressed="${selected===value}"`);
    }).join('')}${extra}</div></div>`;
}

function diceEditorPanel(editor) {
  const {context,mode,picks,open,seat,id,limit,cost,effect} = editor;
  const title = editor.title ?? seatCard(state,seat,id).name;
  const changing = mode==='change';
  const dice = selectableRoll(context, (index,owner)=>{
    const selected=picks.has(index);
    const enabled=selected||activeDiceOptions(editor,index).some(option=>option.dice.some(([candidate])=>candidate===index));
    return selectableDie(context,index,owner,'pick-card-die',enabled,selected,picks.get(index) ?? undefined,open===index);
  });
  const faces = open===undefined ? '' : facePicker(open, faceChoices(editor,open),
    value => dieFace(context.dice,dieOwner(context,open),open,state,value,true), 'pick-card-face',
    picks.get(open), picks.has(open) ? button('undo-card-face','Undo change') : '');
  const ready=confirmedDiceOptions(editor);
  const confirm=changing?'Confirm changes':mode==='reroll'?'Reroll selected dice':'Confirm target';
  const instruction=changing?'Select a die, then choose its new face.':mode==='reroll'
    ? id===12 ? 'Select dice to reroll. If you roll one die, you can choose to reroll again after seeing the result.'
      : 'Tap the dice you want to reroll.'
    : 'Choose a die to target.';
  return `<section class="arena dice-editor" aria-label="Choose dice">
    <div class="phase"><span>${names[seat]} · ${picks.size} of ${limit} selected</span></div>
    <h2 tabindex="-1" id="action-title">${title}</h2>
    <p>${instruction}${cost?` ${cost}`:''}</p>
    ${(effect && tokenRollReference(tokenRollForAction(state,editor.options[0]?.action,seat),title)) ||
      cardRollReference(state.cardRoll,title) || defenceReference()+effectAbilityReference()}
    ${!context.owners&&context.seat!==seat?`<strong>${names[context.seat]}’s dice</strong>`:''}
    ${dice}${faces}
    <div class="controls">${ready.length>1
      ? ready.map(option=>button('confirm-card-dice',option.confirm ?? confirm,`data-choice="${option.choiceIndex}"`)).join('')
      : button('confirm-card-dice',ready[0]?.confirm ?? confirm,`class="primary" ${ready.length?'':'disabled'}`)}
    ${editor.options.filter(option=>!option.dice.length).map(option=>button('confirm-card-dice',option.label,`data-choice="${option.choiceIndex}"`)).join('')}
    ${button('cancel-card-dice','Cancel')}</div></section>`;
}

function confirmedDiceOptions(editor) {
  const ready = activeDiceOptions(editor).filter(option=>option.dice.length===editor.picks.size);
  // A card confirms the selected faces. Token effects can offer distinct payment choices.
  return editor.effect ? ready : ready.slice(0,1);
}

function handleDiceEditor(type, index, alternate) {
  const editor = diceEdit;
  const {picks,open,mode} = editor;
  if (type==='cancel-card-dice') {
    diceEdit = null;
    render();
    if (editor.effect) {
      const source = match.querySelector(`button[data-action="open-effect-dice"][data-index="${editor.effect.index}"]`);
      const section = source?.closest?.('details.match-effects');
      if (section) section.open = true;
      source?.focus();
    } else {
      handSeat = editor.seat;
      selectedCard = editor.id;
      testCard = editor.testCard;
      renderHand();
      handDialog.showModal();
    }
    return;
  }
  if (type==='confirm-card-dice') {
    const ready = confirmedDiceOptions(editor);
    const option = alternate===undefined ? ready[0]
      : [...ready,...editor.options.filter(option=>!option.dice.length)].find(option=>option.choiceIndex===Number(alternate));
    if (!option) return;
    const action = editor.effect
      ? {...option.action,effectSeat:editor.effect.seat}
      : {type:'playCard',id:editor.id,seat:editor.seat,choice:option.choiceIndex,testPile:editor.testCard?.pile};
    diceEdit=null;
    dicePicks.clear();
    selectedCard=null;
    testCard=null;
    state=mode==='reroll' && !testToggle.checked ? transitionWithRerolls(action,roll,Math.random).next
      : applyMatchAction(action,editor.title ?? seatCard(state,editor.seat,editor.id).name,mode==='reroll');
    render();
    focusRollAction();
    return;
  }
  if (type==='pick-card-die') {
    const selected=picks.has(index);
    if (!selected && !activeDiceOptions(editor).some(option=>option.dice.some(([candidate])=>candidate===index))) return;
    if (mode==='change') editor.open=open===index?undefined:index;
    else if (selected) picks.delete(index);
    else picks.set(index,null);
  } else if (type==='pick-card-face' && open!==undefined && faceChoices(editor,open).includes(index)) {
    picks.set(open,index);
    editor.open=undefined;
  } else if (type==='undo-card-face' && open!==undefined) {
    picks.delete(open);
    editor.open=undefined;
  } else return;
  render();
  const die = type==='pick-card-die'?index:open;
  const selector = editor.open===undefined
    ? `button[data-action="pick-card-die"][data-index="${die}"]` : 'button[data-action="pick-card-face"]';
  match.querySelector(selector)?.focus({preventScroll:true});
}

const blankDie = '<span class="die empty" aria-hidden="true">·</span>';

function blankRoll(count, owners, playerNames = names, first = state?.active) {
  if (owners) return opposedTray(Array(count).fill(null), owners, first, playerNames,
    () => `<div class="dice">${blankDie}</div>`);
  return `<div class="dice" role="group" aria-label="Unrolled dice">${blankDie.repeat(count)}</div>`;
}

function initiativeTray(request, playerNames) {
  if (!request.initiative) {
    return testToggle.checked ? testDraftTray('initiative', {count: 2, owners: request.owners, setup: request.setup})
      : blankRoll(2, request.owners, playerNames, 0);
  }
  return opposedTray(request.initiative, request.owners, 0, playerNames, (value, seat) =>
    `<div class="dice"><span class="die${request.tieBreak?' rerolled':''}"><img src="${art.dice[request.setup.heroes[seat]][value - 1]}"
      alt="${playerNames[seat]} ${request.tieBreak?'rerolled':'rolled'} ${value}">${request.tieBreak?rerollBadge:''}</span></div>`);
}

function testBlankRoll(key, count, seat, owners) {
  return testToggle.checked && !testRoll ? testDraftTray(key, {count, seat, owners})
    : blankRoll(count, owners);
}

function offenceTray(seat, allowed) {
  const dice = offenceDice();
  if (!testToggle.checked || testRoll) return tray(dice,seat,!!allowed.hold,state.held) + manifestRoll(seat,allowed.roll);
  if (!state.dice.length && allowed.roll) {
    const manifest = heroId(state,seat) === psylocke.id;
    return testDraftTray('roll', {count: dice.length + Number(manifest), dice, seat,
      manifestIndex: manifest ? dice.length : undefined}) + '<p>Tap a slot to set its face. Empty slots roll randomly.</p>';
  }
  if (!state.dice.length) return tray(dice,seat,false);
  return (editTestFaces ? testDraftTray('edit', {count: dice.length, dice, seat, live: true})
    : tray(dice,seat,!!allowed.hold,state.held)) + manifestRoll(seat,allowed.roll) +
    button('test-edit-faces',editTestFaces ? 'Done editing dice' : 'Edit dice faces',
      `aria-pressed="${editTestFaces}"`);
}

function offenceDice() {
  return state.dice.length ? state.dice : Array(5+(state.stormDice?.count??0)).fill(null);
}

function manifestRoll(seat, canRoll) {
  const player = state.players[seat];
  if (heroId(state,seat)!==psylocke.id) return '';
  const unrolled = state.attempts===0 && canRoll;
  if (!unrolled && !player.manifestReady) return '';
  const die = unrolled ? blankDie
    : `<span class="die"><img src="${art.manifestDice[player.manifestDie-1]}" alt="Manifest die rolled ${player.manifestDie}"></span>`;
  return `<div class="manifest-roll" role="group" aria-label="${unrolled?'Unrolled Manifest die':'Manifest die'}">
    ${die}<span>Manifest die</span>
  </div>`;
}

function abilityRequirement(ability) {
  if (ability.straight) {
    const length = ability.straight;
    const label = {4:'Small straight', 5:'Large straight', 6:'Six-number straight'}[length] ?? `${length}-number straight`;
    const ranges = Array.from({length: 7 - length}, (_, index) => `${index + 1}–${index + length}`);
    return `${label} (${ranges.length > 1 ? ranges.slice(0, -1).join(', ') + ' or ' + ranges.at(-1) : ranges[0]})`;
  }
  return Object.entries(ability.symbols).map(([symbol, count]) => `${count} × ${symbol}`).join(' + ');
}

function defenceKinds(seat) {
  return heroRoster[heroId(state,seat)].defenceKinds ?? ['defence'];
}

// Bounds as percentages of each full board scan, in roster order.
const defenceBoardBounds = [
  [84, 71, 98, 75],
  [84, 73, 99, 85],
  [84, 73, 99, 81],
  [84, 73, 99, 81],
  [84, 73, 99, 80], // 5
  [84, 72, 99, 83],
  [84, 73, 99, 87],
  [84, 72, 99, 80],
  [81, 69, 94, 84],
  [84, 70, 99, 77], // 10
  [84, 70, 99, 81],
  [84, 71, 99, 80],
  [81, 69, 94, 84],
  [84, 70, 98, 88],
  [84, 71, 98, 83], // 15
  [84, 71, 99, 83],
  [84, 71, 99, 87],
  [85, 72, 99, 80],
  [84, 72, 99, 80],
  [84, 72, 99, 82], // 20
  [84, 72, 99, 85],
  [84, 72, 99, 81],
  [84, 70, 99, 85],
  [84, 72, 99, 82],
  [84, 73, 98, 76], // 25
  [84, 71, 99, 85],
  [84, 72, 99, 82],
  [84, 72, 99, 82],
  [84, 71, 99, 81],
  [84, 71, 99, 84], // 30
  [84, 72, 99, 83],
  [84, 71, 99, 84],
  [84, 72, 98, 81],
  [84, 72, 99, 81],
  [84, 72, 99, 88], // 35
  [84, 70, 98, 85],
  [84, 73, 99, 82],
  [81, 70, 94, 82],
  [84, 71, 98, 82],
  [84, 71, 99, 79], // 40
  [85, 73, 98, 77],
  [84, 71, 99, 82],
  [84, 72, 99, 82],
  [84, 71, 98, 80],
  [83, 72, 99, 83], // 45
];
const alternateDefenceBounds = {
  shadowDefence:[85,33,99,48],
  counterpunch:[68,73,82,77],
  werewolf:[84,71,99,83]
};
// A few upgrades have printed effects further down the card.
const defenceUpgradeBottom = {
  5:{28:70}, 6:{26:68}, 7:{26:68}, 10:{28:73}, 12:{19:71},
  15:{27:69}, 16:{25:74}, 25:{25:69}, 29:{26:87}, 32:{24:75}, 34:{24:72}
};

function printedAbility(seat, name, bounds, card) {
  const fromCard = Number.isInteger(card);
  const [left, top, right, bottom] = bounds;
  const width = right - left, height = bottom - top;
  const scale = fromCard ? .635 : 1.64;
  const scan = `<span class="ability-scan" style="aspect-ratio:${width * scale}/${height}">
    <img data-ability-scan data-seat="${seat}" data-card="${card ?? ''}" alt="Printed ${name} effects"
      style="width:${10000 / width}%;height:${10000 / height}%;left:${-100 * left / width}%;top:${-100 * top / height}%">
    </span>`;
  return fromCard
    ? previewCard(state,seat,card,scan)
    : button('inspect-board',scan,`data-index="${seat}" aria-label="View ${name} on ${names[seat]}’s board" aria-haspopup="dialog"`);
}

function printedDefence(seat, kind, name) {
  const hero = heroId(state,seat), player = state.players[seat], upgrade = player.upgrades?.[kind];
  const bounds = Number.isInteger(upgrade) ? [9, 26, 93, defenceUpgradeBottom[hero]?.[upgrade] ?? 65]
    : alternateDefenceBounds[player.werewolf ? 'werewolf' : kind] ?? defenceBoardBounds[hero];
  return printedAbility(seat,name,bounds,upgrade);
}

const cardEffectBounds = [6, 52, 96, 98];

const tokenRollActions = {
  flight:'flight', spendAgility:'agility', spendSkyward:'skyward', rerollSkyward:'skyward',
  spendDonut:'donut', spendEggNog:'eggNog', spendCosmicRay:'cosmicRay',
  spendChargedGem:'chargedGem', evade:'evasive', evadeReturn:'evasive', evadeUpkeep:'evasive', evadeSide:'evasive',
  smoke:'smoke', ninjutsu:'ninjutsu', spendSneak:'sneak', mesmerize:'mesmerize', rerollMesmerized:'mesmerize',
  backStrike:'backStrike', spendReload:'reload', rerollReload:'reload', spendGuardBreak:'guardBreak',
  spendGrim:'grim', wellspring:'wellspring', widowBombRoll:'timeBomb', rollPhoenixBurn:'phoenixBurn',
  clearNanites:'nanite', rollTrickBag:'bagOfTricks', rollNevermore:'nevermore', rollPrey:'prey',
  seedling:'seedling', spendCheer:'cheer', spendSupport:'support', spendInfiltration:'infiltration',
  spendAcuity:'acuity', spendTactical:'tactical', spiderSenseReroll:'invisibility', nyraReroll:'nyra',
};

function tokenRollForAction(view, action, seat) {
  if (action?.type === 'passResponse') action = view.response?.action;
  const type = action?.type;
  if (!type) return null;
  const token = type === 'artificerAction' && action.status === 'heal' ||
    type === 'chooseFreeBot' && action.status === 'healbot' ? 'healbot'
    : type === 'effectRetry' && view.pending?.tempestChi ? 'chi'
    : type === 'spendFeather' && action.status==='reroll' ? 'feather' : tokenRollActions[type];
  if (!token) return null;
  const roller = seat ?? action.effectSeat ?? cardActor(view);
  const holder = {evade:1-view.active, evadeReturn:view.active, evadeUpkeep:view.active,
    rollPrey:1-view.active, rollNevermore:view.active, rollPhoenixBurn:view.jeanBurnRoll?.seat,
    rerollSkyward:view.rogueRoll?.seat, rerollReload:view.gunReload?.seat,
    rerollMesmerized:view.mesmerizeRoll?.seat, spendFeather:action.target}[type] ?? roller;
  return {token, seat:holder, bombId:token==='timeBomb'?action.index:undefined};
}

function currentTokenRoll(view, allowed = {}) {
  const {active, stage} = view;
  if (view.retry || view.cardRoll?.id != null) return null;
  if (view.cardRoll) return {token:'wellspring', seat:view.cardRoll.seat};
  if (view.seraphRoll) {
    const {kind, seat} = view.seraphRoll;
    return {token:kind==='blinding'?'blindingLight':'flight', seat};
  }
  if (view.artRoll && view.artRoll.kind !== 'scrap') {
    return {token:view.artRoll.kind==='nanites'?'nanite':'healbot', seat:view.artRoll.seat};
  }
  if (view.rogueRoll) return {token:view.rogueRoll.kind, seat:view.rogueRoll.seat};
  if (view.lokiBag?.kind === 'roll' && !view.lokiBag.outwit || allowed.rollTrickBag) {
    return {token:'bagOfTricks', seat:view.lokiBag?.seat ?? active};
  }
  if (view.widowBombRoll) return {token:'timeBomb', seat:active, bombId:view.widowBombRoll.id};
  if (view.preyRoll || stage==='prey' && allowed.rollPrey) return {token:'prey', seat:1-active};
  if (view.bleedRoll) return {token:'bleed', seat:active};
  if (view.nevermoreRoll || allowed.rollNevermore) return {token:'nevermore', seat:active};
  if (stage==='evasion') return {token:view.evasionToken??'evasive', seat:view.evasionSeat??1-active};

  const roll = [
    ['deadpoolDonutRoll','donut'], ['santaNogRoll','eggNog'], ['alphaRoll','alpha'],
    ['jeanBurnRoll','phoenixBurn'], ['cosmicRayRoll','cosmicRay'], ['widowAgility','agility'],
    ['sunGemRoll','chargedGem'], ['mesmerizeRoll','mesmerize'], ['guardBreakRoll','guardBreak'],
    ['woundRoll','wound'], ['gunReload','reload'], ['samuraiRoll','backStrike'], ['horseRoll','grim']
  ].find(([key]) => view[key]);
  if (roll) {
    const [key,token] = roll;
    const result = view[key];
    return {token, seat:result.target ?? result.seat ?? active};
  }
  const token = {blind:'blind', pirateKegRoll:'powderKeg', sneakRoll:'sneak',
    ninjutsuRoll:'ninjutsu', ninjutsuChoice:'ninjutsu'}[stage];
  return token ? {token, seat:active} : null;
}

const tokenRollLabel = token => ({healbot:'Heal Bot'}[token] ?? statusLabel(token));

function tokenRollReference(source, heading) {
  if (!source) return '';
  const {token, seat, bombId} = source;
  const label = tokenRollLabel(token);
  const note = token==='healbot'?botNotes.healbot:token==='nyra'?'Nyra takes 1 damage to reroll a die.':statusNotes[token];
  const image = token==='healbot'?art.artificerBots.healbot[(state.players[seat].bots?.healbot??1)-1]
    : token==='nyra'?art.nyraDials[0]:null;
  const icon = image ? `<img src="${image}" alt="">` : tokenImage(state,seat,token,bombId);
  return `<div class="token-roll-reference" role="group" aria-label="${label} token effect">
    <span class="large-token-icon">${tokenSymbol(label,icon)}</span>
    <div>${heading===label?'':`<strong>${label}</strong>`}${note?`<p>${note}</p>`:''}</div>
  </div>`;
}

function cardRollReference(source, heading) {
  if (!Number.isInteger(source?.id)) return '';
  const {seat,id} = source;
  const {name} = seatCard(state,seat,id);
  return `<div class="ability-reference" role="group" aria-label="Card roll effects"><div>
    ${heading===name?'':`<div><strong>${name}</strong></div>`}
    ${printedAbility(seat,name,cardEffectBounds,id)}
  </div></div>`;
}

function defenceReference() {
  const {stage, gunContest, pending} = state;
  const choosing = stage === 'defence';
  const opposed = gunContest?.kind === 'duel' && stage === 'gunContest';
  if (choosing ? pending?.parlayBlocked || shadowAvoids(state) : stage !== 'defenceResponse' && !opposed) return '';
  const seat = 1 - state.active;
  const player = state.players[seat];
  const hero = heroRoster[heroId(state,seat)];
  const options = defenceKinds(seat);
  const kinds = choosing && !selectedDefence ? options
    : [choosing ? selectedDefence : state.defenceKind ?? options[0]];
  return `<div class="ability-reference" role="group" aria-label="Defensive ability effects">${kinds.map(kind=>{
    const count = hero.defenceDiceCount(player,kind);
    const dice = hero.id===gunslinger.id ? '1 die each' : count===1 ? '1 die' : `${count} dice`;
    const name = defenceName(state,seat,kind);
    return `<div><div>${abilityName(name,'strong')}<small>${dice}</small></div>
      ${printedDefence(seat,kind,name)}</div>`;
  }).join('')}</div>`;
}

// Crop the printed effects from the same board images used by the board viewer.
const effectBoardBounds = {
  Overpower:[18,70,34,81],
  'Exploding Arrow':[18,71,32,86],
  Pyroblast:[2,71,16,86],
  'Shadow Dance':[68,32,82,45],
  'Combo Strike':[2,71,16,90],
  'Tempest Rush':[18,71,33,84],
  'Righteous Combat':[2,70,16,82],
  'Holy Light':[68,70,82,85],
  'Walk the Line':[18,30,32,40],
  'Death Blossom':[2,70,16,82],
  'Call of the Wild':[68,72,82,84],
  'X Marks the Spot':[20,32,34,43],
  'Dread Mark':[20,32,34,44],
  'Spanner Strike':[2,24,16,48],
  'Holy Smite':[18,68,33,84],
  Triumphant:[68,29,82,44],
  Rend:[18,69,33,83],
  Possess:[68,30,82,39],
  Showdown:[66,32,79,44],
  Masamune:[68,70,82,85],
  Profiteer:[2,69,16,87],
  Savage:[18,30,33,43],
  'Spectral Assault':[68,69,83,89],
  Harvest:[2,70,16,89],
  'Corpse Explosion':[18,70,33,89],
  'Full Moon':[68,71,82,83],
  'Jaws of the Wolf':[85,28,98,40],
  'Murder of Crows':[2,71,17,83],
  Maul:[18,69,33,80],
  'Forest’s Answer':[68,72,83,86],
  'En Garde':[68,70,83,78],
  Furnace:[18,29,33,37],
  'Scorching Staff':[2,69,16,84],
  'Triple Threat':[68,70,82,83],
  Vengeance:[68,70,82,85],
  'Barrel Roll':[2,70,16,82],
  'Aurora Wave':[18,69,33,80],
  'Astral Incursion':[18,71,33,84],
  'Kneel to Me':[68,71,82,85],
  Jinx:[2,69,16,86],
  'Mind Blast':[18,69,33,84],
  'Spider-Reflexes':[18,70,33,81],
  Odinforce:[1,69,17,85],
  'Chain Lightning':[18,69,33,87],
  'Ice to Meet You':[18,29,33,48],
  'Psychic Multiplier':[18,29,33,41],
  Leach:[21,69,34,89],
  'Light It Up':[18,30,33,45],
  'Opposites Attract':[18,69,33,85],
  Hunter:[18,70,33,80],
  'Severe Threat':[68,70,82,83],
  Rotter:[18,69,33,85],
  'Strong Arm':[18,29,33,45],
  'Tidal Blow':[18,70,33,85],
  'Fireside Chat':[2,69,16,85],
  'Naughty or Nice':[18,69,33,88],
  Besmirched:[18,71,33,85],
};

// Percentages of the card's height. For Savage Maul and Disentomb, show the effects they activate.
const effectUpgradeRows = {
  'Overpower II':[24,54],
  'Exploding Arrow II':[24,64], 'Exploding Arrow III':[24,64],
  'Pyroblast II':[26,63], 'Pyroblast III':[26,69],
  'Shadow Dance II':[24,59],
  'Combo Strike II':[26,72], 'Tempest Rush II':[25,71],
  'Righteous Combat II':[25,57], 'Righteous Combat III':[25,56], 'Holy Light II':[24,63],
  'Death Blossom II':[25,74], 'Walk the Line II':[25,52], 'Tip of the Blade':[85,100], 'Poison Blade II':[27,63],
  'Call of the Wild II':[27,56],
  'Spanner Strike II':[11,73],
  'Triumphant II':[28,65], 'Holy Smite II':[23,54],
  'Rend II':[23,58],
  'Showdown II':[26,58], 'Showdown III':[26,58],
  'Masamune II':[27,58],
  'Profiteer II':[24,70],
  'Savage II':[25,60],
  'Spectral Assault II':[23,66],
  'Harvest II':[20,68], 'Corpse Explosion II':[21,64], Disentomb:[21,64],
  'Murder of Crows II':[24,61],
  'Maul II':[24,53], 'Savage Maul':[24,53],
  'Scorching Staff II':[21,61],
  'Triple Threat II':[24,58],
  'Vengeance II':[27,62],
  'Aurora Wave II':[23,57],
  'Kneel to Me II':[28,64],
  'Jinx II':[24,66], 'Mind Blast II':[24,61],
  'Chain Lightning II':[25,68], 'Odinforce II':[23,76],
  'Bo Staff Mastery':[79,99],
  'Light It Up II':[24,71], 'Opposites Attract II':[24,65],
  'Severe Threat II':[24,65],
  'Rotter II':[24,67],
  'Tidal Blow II':[23,62],
  'Naughty or Nice II':[24,76],
  'Besmirched Dos':[28,66],
};

const abilityEffectStages = new Set([
  'effect', 'effectResponse', 'artSpanner', 'santaTarget', 'santaRoll',
  'mysticStrongTarget', 'mysticContest', 'scarletJinx'
]);

function effectAbilityReference(heading) {
  const {active:seat, stage, pending, gunContest, cardRoll} = state;
  if (!pending?.name || cardRoll) return '';
  const rolling = abilityEffectStages.has(stage) ||
    stage==='targeting' && (pending.showdown || pending.effect==='paleJaws') ||
    stage==='gunContest' && gunContest?.kind==='showdown' ||
    stage==='necroChoice' && pending.explosion;
  if (!rolling) return '';

  const name = pending.name;
  const upgrades = Object.values(state.players[seat].upgrades ?? {});
  const upgrade = upgrades.find(id => {
    const card = seatCard(state,seat,id);
    return card.name === name || card.extra?.name === name;
  });
  const bounds = upgrade ? [8, effectUpgradeRows[name]?.[0] ?? 8, 95, effectUpgradeRows[name]?.[1] ?? 98]
    : effectBoardBounds[name];
  if (!bounds) return '';
  const showTitle = heading !== name && heading !== abilityName(name);
  return `<div class="ability-reference" role="group" aria-label="Rolled ability effects"><div>
    ${showTitle ? `<div>${abilityName(name,'strong')}</div>` : ''}
    ${printedAbility(seat,name,bounds,upgrade)}</div></div>`;
}

function potionSlotName(seat, slot, abilities) {
  if (slot==='defence') return defenceName(state,seat);
  const ability=abilities.find(ability=>(ability.upgradeSlot??ability.name)===slot);
  return ability?.label??slot;
}

function attachedPotions(seat) {
  const potions=alchemist.tokens(state,seat);
  const abilities=abilitiesFor(state,seat);
  const capacities=alchemist.slots(state.players[seat]);
  const slots=Object.entries(capacities).filter(([,capacity])=>capacity>0);
  const legacy=potions.filter(potion=>!capacities[potion.slot]);
  return `<details class="board-upgrades" data-disclosure="potions-${seat}">
    <summary>Attached Potions (${potions.length})</summary>
    <div class="potion-inventory">${slots.map(([slot,capacity])=>{
      const attached=potions.filter(potion=>potion.slot===slot);
      return `<div>${abilityName(potionSlotName(seat,slot,abilities),'strong')} · ${attached.length}/${capacity} slots
        ${attached.length?`<ul>${attached.map(potion=>`<li>${tokenChoiceLabel(state,{
          key:potion.key,label:`Slot ${potion.index+1} · ${statusLabel(potion.key)}`
        },seat)}</li>`).join('')}</ul>`:'<small>Empty</small>'}</div>`;
    }).join('')}${legacy.map(potion=>tokenChoiceLabel(state,{key:potion.key,label:alchemist.tokenLabel(potion)},seat)).join('')}</div></details>`;
}

const potionLeafletText = {
  punchify: 'May only be Attached to an Offensive Ability. When spent, add 2 dmg to your Attack. Attack Modifier.',
  bolsterate: 'May only be Attached to a Defensive Ability. When spent, prevent 2 incoming dmg.',
  cleansitude: 'May be Attached to any Ability. When spent, the Alchemist chooses one: Remove 1 status effect from yourself or Heal 1.',
  toxification: 'May be Attached to any Ability. When spent, inflict Poison on a chosen player.'
};

function potionAttachmentChoices(seat, choices) {
  const slots=choices.map((choice,index)=>({...choice,choiceIndex:index})).filter(choice=>choice.key===selectedPotion);
  if (!slots.length) {
    return `<div class="potion-picker" role="group" aria-label="Potion types">${alchemist.types.map(key=>{
      const available=choices.some(choice=>choice.key===key);
      return button('select-potion',`${tokenChoiceLabel(state,{key,label:`<strong>${statusLabel(key)}</strong>`},seat)}
        <small>Limit ${alchemist.limits[key]} · ${potionLeafletText[key]}</small>
        ${available?'':'<small>Unavailable for this attachment</small>'}`,
        `class="potion-type" data-status="${key}" ${available?'':'disabled'}`);
    }).join('')}</div>`;
  }
  const abilities=abilitiesFor(state,seat);
  const defensiveRequirement=`Defensive roll · ${alchemist.defenceDiceCount(state.players[seat])} dice · 1 attachment per Crucible (6)`;
  return `<div class="potion-picker" role="group" aria-label="Open Potion slots">
    <strong>${tokenChoiceLabel(state,{key:selectedPotion,label:statusLabel(selectedPotion)},seat)}</strong>
    ${slots.map(({slot,index,choiceIndex})=>{
      const ability=abilities.find(ability=>(ability.upgradeSlot??ability.name)===slot)
        ?? boardFor(state,seat).abilities.find(ability=>ability.name===slot);
      const requirement=slot==='defence'?defensiveRequirement:abilityRequirement(ability);
      const name=slot==='defence'?defenceName(state,seat):ability.label??ability.name;
      return button('alchemistChoice',`<strong>${abilityName(name)} · slot ${index+1}</strong>
        <small class="ability-requirement">${requirement}</small>`,
        `class="ability potion-slot" data-choice="${choiceIndex}"`);
    }).join('')}
    ${button('back-to-potions','Choose a different Potion','class="potion-back"')}
  </div>`;
}

function offenceAbilities(seat, available = []) {
  return `<div class="abilities">${abilitiesFor(state,seat).map((a,i)=>{
    // Legacy ability copy puts the printed roll requirement before the first middle dot.
    const separator=a.text.indexOf(' · ');
    const prefix=separator<0?'':a.text.slice(0,separator);
    const usesMultipleCounts=/^\d+(?:\+|\s*(?:[–/]\s*|or\s+)\d)/.test(prefix);
    const requirement=usesMultipleCounts?prefix:abilityRequirement(a);
    const text=separator<0?a.text:a.text.slice(separator+3);
    const effect=text.charAt(0).toUpperCase()+text.slice(1);
    const ready = available.includes(a.name);
    return button(testToggle.checked ? 'test-ability' : 'declare',`${abilityName(a.label??a.name,'strong')}<small class="ability-requirement">${requirement}</small><small class="ability-effect">${effect}</small>`,
      `class="ability" data-ability="${i}" ${testToggle.checked
        ? `data-index="${i}" data-test-ready="${ready}"` : ready ? '' : 'disabled'}`);
  }).join('')}</div>`;
}

function rollResultTray(request) {
  return request.reveal.map(batch => {
    const view = request.next;
    const context = batch.primary ? {...batch, dice: view.dice, held: view.held} : batch;
    return rollDisplay(context, view, state.active);
  }).join('');
}

function rollRequestPanel(request) {
  const {setup, owners, initiative, reveal} = request;
  const token = setup ? null : testRoll?.token ?? request.token ?? tokenRollForAction(state,request.action);
  const heading = token ? tokenRollLabel(token.token) : request.description;
  const playerNames = setup ? setup.heroes.map((id, seat) =>
    setup.heroes[0] === setup.heroes[1] ? `${HEROES[id].name} (P${seat + 1})` : HEROES[id].name) : names;
  const tied = initiative && initiative[0] === initiative[1];
  const readyToAdvance = initiative || reveal;
  const phase = setup ? 'Match setup' : `Turn ${state.turn} · Roll`;
  const label = readyToAdvance
    ? setup ? tied ? 'Prepare tie-break roll' : 'Start match' : 'Continue'
    : setup ? 'Roll for initiative' : owners ? 'Roll both dice' : request.count === 1 ? 'Roll die' : 'Roll dice';
  let dice;
  if (setup) dice = initiativeTray(request, playerNames);
  else if (reveal) dice = rollResultTray(request);
  else dice = testToggle.checked && !testRoll
    ? testDraftTray(request, {count:request.count, seat:rollTestSeat(request), owners, token})
    : blankRoll(request.count, owners);
  return `<section class="arena" aria-label="${readyToAdvance?'Roll result':'Pending roll'}">
    <div class="phase"><span>${phase}</span></div>
    <h2 tabindex="-1" id="action-title">${heading}</h2>
    ${tied ? '<p>Tied initiative. Roll again to break the tie.</p>' : ''}
    ${setup ? '' : tokenRollReference(token,heading) || cardRollReference(request.card ?? rollCardSource(request.action), heading) ||
      defenceReference() + (abilityRollActions.has(request.rollType) || rerollActions.has(request.rollType)
        ? effectAbilityReference(heading) : '')}
    ${testRoll ? testRollControls(testRoll) : dice + button(readyToAdvance ? 'advance-roll' : 'roll-request',label,'class="primary"')}
    ${setup ? '' : matchTools(cardActor(state))}
  </section>`;
}

const rerollActions = new Set([
  'rerollDuel', 'rerollSkyward', 'gambitMagicReroll', 'mysticWildReroll',
  'spiderSenseReroll', 'widowDefenceReroll', 'abilityReroll', 'effectRetry',
  'retryDie', 'extraDefence', 'stormOppReroll', 'rerollUndead', 'rerollReload',
  'rerollMesmerized', 'nyraReroll', 'titheReroll'
]);

// These effects already show both the empty tray and their own resolution controls.
const inlineEffectRolls = new Set([
  'deadpoolLuckyRoll', 'rollTrickBag', 'widowBombRoll', 'rollPrey', 'rollNevermore',
  'rollPhoenixBurn'
]);

const abilityRollActions = new Set([
  'rollEffect', 'resolveEffect', 'resolveScarletJinx', 'resolveTarget', 'rollSantaAbility', 'rollMysticContest'
]);

const manualRollActions = new Set([
  'roll', 'defend', 'rollEffect', 'rollMysticContest', 'rollSantaAbility',
  ...inlineEffectRolls,
  ...rerollActions
]);

function upcomingTokenRoll(view, type) {
  const seat = view.active;
  const player = view.players[seat];
  if (type==='accept' && view.stage==='announce') {
    const token = player.blind ? 'blind' : player.blindingLight && !view.pending?.ultimate ? 'blindingLight' : null;
    return token ? {token,seat,count:1} : null;
  }
  if (type==='resolveUpkeep' && view.stage==='upkeep') {
    if (player.bleed && !view.bleedChecked) return {token:'bleed',seat,count:player.bleed};
    if (player.holyPresence && !view.holyPresenceChecked) return null;
    if (player.powderKeg && !view.pirateKegChecked) return {token:'powderKeg',seat,count:1};
  }
  return null;
}

function showdownPending(view) {
  return view.stage==='targeting' && !!view.pending?.showdown;
}

function effectRollOnCurrentScreen(view, type) {
  return inlineEffectRolls.has(type) || type === 'rollEffect' && view.cards ||
    type === 'rollSantaAbility' && !view.pending?.santa?.contest ||
    type === 'resolveTarget' && showdownPending(view) || !!upcomingTokenRoll(view,type);
}

function rollsOnCurrentScreen(view, type) {
  if (['roll','defend','retryDie','gambitMagicReroll','rerollUndead','rerollMesmerized','stormOppReroll'].includes(type) ||
      effectRollOnCurrentScreen(view,type)) return true;
  if (type==='effectRetry' && view.pending?.tempestChi) return true;
  if (!rerollActions.has(type)) return false;
  const context = rollContext(view);
  return !!context && (context.dice === view.dice || context.dice === view.defenceDice ||
    view.gunContest?.kind === 'duel' && context.dice === view.gunContest.dice);
}

function hasRollOnResolutionScreen(view, request, next, token) {
  if (!next || !rollContext(next)?.dice.length) return false;
  if (next.gunContest?.kind==='showdown' && request.rollType==='resolveTarget' ||
      next.nevermoreRoll && request.rollType==='spendFeather') return true;
  const activeToken = currentTokenRoll(next);
  return !!activeToken &&
    (token ? activeToken.token===token.token : currentTokenRoll(view)?.token!==activeToken.token);
}

function effectPriorityView(view, seat) {
  return {...view, response: {seat}};
}

function transitionOnMatchScreen(view, action, roller, random) {
  if (action.testPile) {
    const {testPile, ...play} = action;
    const withCard = viewWithPileCard(view, play.seat, testPile, play.id);
    if (!withCard) return view;
    const next = transitionOnMatchScreen(withCard, play, roller, random);
    return next === withCard ? view : next;
  }
  if (action.type === 'defend') return transition(view, action, roller, random, true);
  const effectSeat = action.attackerEffect ? view.active : action.effectSeat;
  if (effectSeat === undefined) return transition(view, action, roller, random, 'inlineCards');
  if (effectSeat !== inlineEffectSeat(view)) return view;
  const priority = effectPriorityView(view, effectSeat);
  const next = transition(priority, action, roller, random, 'inlineCards');
  if (next === priority) return view;
  // The temporary priority has no deferred action and must never enter the save.
  if (next.response && !next.response.action) next.response = null;
  return next;
}

function transitionWithRerolls(action, roller, random) {
  const updates = new Map();
  let scalarRerolled = false;
  const observed = () => roller();
  observed.requestBatch = roller.requestBatch;
  observed.onReroll = (dice, index, scalar) => {
    roller.onReroll?.();
    if (scalar) scalarRerolled = true;
    if (!updates.has(dice)) updates.set(dice,new Set());
    updates.get(dice).add(index);
  };
  const next = transitionOnMatchScreen(state,action,observed,random);
  if (next === state) return {next};

  // Array properties follow the dice through structuredClone and stay out of the save.
  for (const [dice,indices] of updates) dice.rerolled = [...indices];
  if (scalarRerolled) next.uiScalarReroll = next.stage;
  else if (state.effectDie!==next.effectDie || state.stage!==next.stage) delete next.uiScalarReroll;
  const context = rollContext(next);
  const rerolled = context?.scalar && scalarRerolled ? [0] : [...(updates.get(context?.dice) ?? [])];
  return {next, context, rerolled};
}

function rollCardSource(action) {
  if (action?.type==='passResponse') action=state.response?.action;
  switch(action?.type) {
    case 'playCard': return {seat:action.seat ?? cardActor(state), id:action.id};
    case 'finishMainCard': return state.mainAction;
    case 'resolveMainChoice': return state.mainChoice;
    default: return state.cardRoll;
  }
}

// Stop just before an incidental roll so the player can roll explicitly.
function beforeDice(action, onRoll, random) {
  const stop = Symbol('pause before dice');
  const before = structuredClone(state);
  const wait = () => wait.requestBatch(1);
  wait.requestBatch = (count, owners, card) => {
    onRoll?.(count, owners, card);
    throw stop;
  };
  try {
    const next = transitionOnMatchScreen(before, action, wait, random);
    return next === before ? state : next;
  } catch (error) {
    if (error !== stop) throw error;
    return state;
  }
}

function revealRoll(request, random = Math.random, roller = roll) {
  const {action, rollType} = request;
  if (rollsOnCurrentScreen(state, rollType)) {
    rollRequest = null;
    return transitionWithRerolls(action,roller,random).next;
  }
  const batches = [];
  let singles;
  const record = () => {
    if (!singles) {
      singles = {dice: []};
      batches.push(singles);
    }
    const face = roller();
    singles.dice.push(face);
    return face;
  };
  record.onReroll = () => {
    (singles.rerolled ??= []).push(singles.dice.length-1);
  };
  record.requestBatch = (count, owners, source) => {
    singles = undefined;
    const dice = Array.from({length: count}, roller);
    batches.push({dice, owners, token:source?.token ? source : undefined});
    return dice;
  };
  const {next, context, rerolled} = transitionWithRerolls(action,record,random);
  const token = batches.find(batch=>batch.token)?.token ?? request.token ?? tokenRollForAction(state,action);
  if (!batches.length || next === state ||
      batches.length===1 && next.cardRoll?.dice===batches[0].dice ||
      hasRollOnResolutionScreen(state,request,next,token)) {
    rollRequest = null;
    return next;
  }
  const seat = context?.seat ?? action.seat ?? cardActor(state);
  const reveal = context?.dice.length && (rerolled.length || rerollActions.has(rollType))
    ? [{...context, rerolled, current: true, primary: context.dice === next.dice}]
    : batches.map(batch => ({...batch, seat}));
  // A token can also apply its result immediately, such as Heal Bot during an Ultimate.
  // Keep the result beside the following match action without another acknowledgement.
  if (token) {
    lastTokenResult = {token, reveal, next};
    rollRequest = null;
    return next;
  }
  rollRequest = {...request, reveal, next};
  return state;
}

function applyMatchAction(action, description, inline = false) {
  const rollAction = action.type === 'passResponse' ? state.response?.action : action;
  const rollType = rollAction?.type;
  if (testToggle.checked) {
    const preset = testDraft?.key === rollType ? testDraft : undefined;
    testDraft = undefined;
    return planTestRoll({action, description, rollType, inline, preset, faces: [], randomPrefix: []});
  }
  if (manualRollActions.has(rollType) || effectRollOnCurrentScreen(state,rollType)) {
    if (action.type === 'passResponse') description = state.pending?.name ?? 'Roll dice';
    return revealRoll({action, description, rollType});
  }
  const randomPrefix = [];
  return beforeDice(action, (count, owners, source) => {
    const token = source?.token ? source : tokenRollForAction(state,action);
    const card = source?.token ? undefined : source;
    const reference = card ?? rollCardSource(action);
    const title = token ? tokenRollLabel(token.token) : Number.isInteger(reference?.id)
      ? seatCard(state,reference.seat,reference.id).name : owners ? state.pending?.name ?? description : description;
    rollRequest = {action, rollType, description:title, count, owners, randomPrefix, card, token};
  }, () => {
    const value = Math.random();
    randomPrefix.push(value);
    return value;
  });
}

function resolveRollRequest() {
  const request = rollRequest;
  if (testToggle.checked) {
    if (request.setup) {
      const picks = testDraft?.key === 'initiative' ? testDraft.picks : [];
      rollRequest = {...request, initiative: [picks[0] ?? roll(), picks[1] ?? roll()]};
      testDraft = undefined;
    } else {
      const preset = testDraft?.key === request ? testDraft : undefined;
      testDraft = undefined;
      state = planTestRoll({...request, preset, faces: [], randomPrefix: request.randomPrefix?.slice() ?? []});
    }
  } else if (request.setup) {
    rollRequest = {...request, initiative: [roll(), roll()]};
  } else {
    let index = 0;
    const random = () => request.randomPrefix[index++] ?? Math.random();
    state = revealRoll(request, random);
  }
  render();
  focusRollAction();
}

// Replay from the same state when an action needs another choice of dice.
// Keep shuffles and other random decisions stable across those replays.
function planTestRoll(request) {
  let faceIndex = 0;
  let randomIndex = 0;
  const random = () => {
    if (randomIndex === request.randomPrefix.length) request.randomPrefix.push(Math.random());
    return request.randomPrefix[randomIndex++];
  };
  const waiting = Symbol('select test dice');
  const offenceSlots = request.rollType === 'roll'
    ? offenceDice().map((_, index) => index).filter(index => !state.held[index] && !iceman.locked(state, state.active, index))
    : [];
  const readFaces = (count, owners, source, context) => {
    if (faceIndex + count > request.faces.length && faceIndex + count <= (request.preset?.count ?? 0)) {
      for (let i = faceIndex; i < faceIndex + count; i++) request.faces[i] = request.preset.picks[i] ?? roll();
    }
    if (faceIndex + count > request.faces.length) {
      const token = source?.token ? source : tokenRollForAction(state,request.action);
      const card = source?.token ? undefined : source ?? request.card;
      testRoll = {...request, count, owners, card, token, picks: [], open: undefined, slots: undefined,
        manifestIndex: undefined, context};
      throw waiting;
    }
    const dice = request.faces.slice(faceIndex, faceIndex + count);
    faceIndex += count;
    return dice;
  };
  let offenceFaces;
  const probe = () => {
    if (offenceSlots.length && !offenceFaces) {
      offenceFaces = readFaces(offenceSlots.length);
    }
    if (offenceFaces?.length) return offenceFaces.shift();
    return readFaces(1)[0];
  };
  probe.requestBatch = readFaces;
  probe.forDie = (_, index) => offenceSlots.length ? probe() : readFaces(1, undefined, undefined, {index})[0];
  const before = structuredClone(state);
  try {
    const next = transitionOnMatchScreen(before, request.action, probe, random);
    testRoll = null;
    if (!request.faces.length) {
      rollRequest = null;
      return next === before ? state : next;
    }
    faceIndex = 0;
    randomIndex = 0;
    const roller = () => request.faces[faceIndex++];
    if (request.inline) return transitionWithRerolls(request.action, roller, random).next;
    const {action, rollType, description, card, token, randomPrefix} = request;
    return revealRoll({action, rollType, description, card, token, randomPrefix}, random, roller);
  } catch (error) {
    if (error !== waiting) throw error;
    if (offenceSlots.length && !request.faces.length && !offenceFaces) testRoll.slots = offenceSlots;
    else if (offenceSlots.length && request.faces.length === offenceSlots.length &&
      request.rollType === 'roll' && heroId(state, state.active) === psylocke.id && !state.attempts) {
      testRoll.manifestIndex = 0;
    }
    return state;
  }
}

function rollTestSeat(request) {
  const action = request.action?.type === 'passResponse' ? state.response?.action : request.action;
  return request.card?.seat ?? action?.effectSeat ?? (request.token && !['prey','nevermore'].includes(request.token.token)
    ? request.token.seat : undefined) ?? rollCardSource(action)?.seat ??
    (request.rollType === 'defend' ? 1-state.active : rollContext(state)?.seat ?? actor(state));
}

function testDieFace(selection, index, face) {
  if ((selection.token ?? tokenRollForAction(state,selection.action))?.token === 'eggNog') {
    const label = `${face} ${HEROES[santa.id].symbols[face-1]}`;
    return {label, picture:`<img src="${art.dice[santa.id][face-1]}" alt="${label}">`};
  }
  if (selection.manifestIndex === index) {
    const label = `Manifest die · ${face}`;
    return {label, picture:`<img src="${art.manifestDice[face-1]}" alt="${label}">`};
  }
  if (selection.setup) {
    const hero = selection.setup.heroes[selection.owners[index]];
    const label = `${face} ${HEROES[hero].symbols[face-1]}`;
    return {label, picture:`<img src="${art.dice[hero][face-1]}" alt="${label}">`};
  }
  const slot = selection.slots?.[index] ?? selection.context?.index ?? index;
  const context = selection.context ? rollContext(state) : null;
  const dice = selection.dice ?? context?.dice ?? [];
  const seat = selection.owners?.[index] ?? selection.seat ??
    (context ? dieOwner(context,slot) : rollTestSeat(selection));
  const primary = selection.slots || selection.key === 'roll' || selection.live || dice === state.dice;
  return dieFace(primary ? state.dice : dice, seat, slot, state, face, true);
}

function testDiceTray(selection) {
  const renderSlot = i => {
    const slot = selection.slots?.[i] ?? selection.context?.index ?? i;
    const face = selection.picks[i] ?? (selection.live ? state.dice[i] : undefined);
    const label = selection.manifestIndex === i ? 'Manifest die' : `Die ${slot+1}`;
    const faceArt = face ? testDieFace(selection,i,face) : null;
    if (selection.live && iceman.locked(state,state.active,i)) {
      return `<span class="die frozen" aria-label="${label}, frozen">${faceArt?.picture ?? ''}<small class="frozen-label">Frozen</small></span>`;
    }
    const held = selection.live && state.held[i];
    return button('test-die-slot', faceArt?.picture ?? '·',
      `class="die${held?' kept':''}${selection.open===i?' face-picker-open':''}${faceArt?'':' empty'}"
      data-index="${i}" aria-expanded="${selection.open===i}" aria-label="${label}, ${faceArt?.label ?? 'choose face'}${held?', held':''}"`);
  };
  const slots = Array.from({length: selection.count}, (_, i) => i);
  const ordinary = slots.filter(i => i !== selection.manifestIndex);
  const playerNames = selection.setup ? selection.setup.heroes.map((id,seat) =>
    selection.setup.heroes[0] === selection.setup.heroes[1] ? `${HEROES[id].name} (P${seat+1})` : HEROES[id].name) : names;
  const dice = selection.owners
    ? opposedTray(slots.map(i => selection.picks[i]), selection.owners, selection.setup ? 0 : state.active,
      playerNames, (_,owner,i) => `<div class="dice">${renderSlot(i)}</div>`)
    : `<div class="dice" role="group" aria-label="Test dice">${ordinary.map(renderSlot).join('')}</div>`;
  const manifest = selection.manifestIndex === undefined ? '' : `<div class="manifest-roll">
    ${renderSlot(selection.manifestIndex)}<span>Manifest die</span></div>`;
  const open = selection.open;
  return dice + manifest + facePicker(open, dieFaces, value => testDieFace(selection,open,value), 'test-die-face',
    selection.picks[open] ?? (selection.live ? state.dice[open] : undefined),
    selection.picks[open] && !selection.live ? button('test-die-clear','Roll randomly') : '');
}

function testDraftTray(key, context) {
  if (testDraft?.key !== key) testDraft = {key, picks: []};
  Object.assign(testDraft, context);
  return testDiceTray(testDraft);
}

function testRollControls(request) {
  return `<div class="test-roll-controls">
    <p>Tap a die to set its face. Empty slots roll randomly.</p>
    ${testDiceTray(request)}
    <div class="controls">${button('test-dice-confirm',request.owners?'Roll both dice':request.count===1?'Roll die':'Roll dice','class="primary"')}
    ${button('test-dice-cancel','Cancel')}</div></div>`;
}

function handleTestRoll(type, index) {
  const selection = testRoll ?? testDraft;
  if (!selection) return;
  if (type === 'test-die-slot' && index >= 0 && index < selection.count) {
    if (selection.live && iceman.locked(state,state.active,index)) return;
    selection.open = selection.open === index ? undefined : index;
    render();
    match.querySelector(selection.open === undefined
      ? `button[data-action="test-die-slot"][data-index="${index}"]`
      : 'button[data-action="test-die-face"]')?.focus();
    return;
  }
  if ((type === 'test-die-face' && dieFaces.includes(index) || type === 'test-die-clear') &&
      selection.open !== undefined) {
    const slot = selection.open;
    if (selection.live) {
      if (!dieFaces.includes(index) || iceman.locked(state,state.active,slot)) return;
      state.dice[slot] = index;
      testAbilityMessage = undefined;
    } else selection.picks[slot] = type === 'test-die-clear' ? undefined : index;
    selection.open = undefined;
    render();
    match.querySelector(`button[data-action="test-die-slot"][data-index="${slot}"]`)?.focus();
    return;
  }
  if (type === 'test-dice-confirm' && testRoll) {
    const request = testRoll;
    const selected = Array.from({length: request.count}, (_, i) => request.picks[i] ?? roll());
    testRoll = null;
    state = planTestRoll({...request, faces: [...request.faces, ...selected]});
  } else if (type === 'test-dice-cancel') testRoll = null;
  else return;
  render();
  focusRollAction();
}

function diceForTestAbility(ability) {
  const seat = state.active;
  const player = state.players[seat];
  const hero = heroId(state,seat);
  const current = offenceDice();
  const qualifiesWith = faces => {
    const dice = effectiveDice(faces,player);
    return qualifies(ability,dice,hero,scarletWitch.symbols(state,seat,dice));
  };
  if (current.every(Boolean) && qualifiesWith(current)) return current;
  const locked = current.map((_,index) => iceman.locked(state,seat,index));
  const rows = dieFaces.map(face => {
    const dice = effectiveDice(Array(current.length).fill(face),player);
    return ability.straight ? dice : scarletWitch.symbols(state,seat,dice)
      .map(value => HEROES[hero].symbols[value-1]);
  });
  const needed = ability.straight
    ? dieFaces.slice(0,3).filter(start => start+ability.straight<=7)
      .map(start => dieFaces.slice(start-1,start-1+ability.straight))
    : [Object.entries(ability.symbols).flatMap(([symbol,count]) => Array(count).fill(symbol))];
  for (const requirements of needed) {
    if (requirements.length > current.length) continue;
    const candidate = current.map(value => value || 1);
    const used = new Set();
    function fit(index) {
      if (index === requirements.length) return true;
      const requirement = requirements[index];
      // Try faces already on the table before changing any other die.
      for (const existing of [true,false]) {
        for (let slot = 0; slot < candidate.length; slot++) {
          if (used.has(slot)) continue;
          const previous = candidate[slot];
          const face = existing ? previous : !locked[slot] &&
            dieFaces.find(value => rows[value-1][slot] === requirement);
          if (!face || rows[face-1][slot] !== requirement) continue;
          candidate[slot] = face;
          used.add(slot);
          if (fit(index+1)) return true;
          used.delete(slot);
          candidate[slot] = previous;
        }
      }
      return false;
    }
    if (fit(0) && qualifiesWith(candidate)) return candidate;
  }
  return null;
}

function selectTestAbility(index) {
  const ability = abilitiesFor(state,state.active)[index];
  const allowed = legal(state);
  if (!ability || !allowed.declare) return;
  if (loki.blocked(state,state.active,ability)) testAbilityMessage = 'Spellbound prevents this ability.';
  else if (!state.dice.length && !allowed.roll) testAbilityMessage = 'A Roll Attempt is needed to set up this ability.';
  else {
    const dice = diceForTestAbility(ability);
    if (!dice) testAbilityMessage = 'This ability cannot be matched with the current dice and effects.';
    else {
      testAbilityMessage = undefined;
      const preparedManifest = testDraft?.key === 'roll' ? testDraft.picks[testDraft.manifestIndex] : undefined;
      testDraft = undefined;
      editTestFaces = false;
      if (!state.dice.length) {
        const manifest = heroId(state,state.active) === psylocke.id;
        const firstRoll = [...dice];
        if (manifest) firstRoll.push(preparedManifest ?? roll());
        state = planTestRoll({action:{type:'roll'}, description:'Roll dice', rollType:'roll',
          faces:firstRoll, randomPrefix:[]});
      } else if (dice !== state.dice) {
        state.dice = dice;
      }
      if (legal(state).declare?.includes(ability.name)) {
        state = applyMatchAction({type:'declare', ability:ability.name},ability.label ?? ability.name);
      }
    }
  }
  render();
  focusRollAction();
}

function advanceRollRequest() {
  const request = rollRequest;
  if (request.setup && request.initiative[0] === request.initiative[1]) {
    rollRequest = {...request, initiative: undefined, tieBreak:true};
  } else {
    let index = 0;
    state = request.setup ? createMatch(() => request.initiative[index++], request.setup) : request.next;
    const revealed = request.reveal?.[0];
    if (revealed?.current && revealed.rerolled?.length && !revealed.scalar) {
      const context = rollContext(state);
      if (context) context.dice.rerolled = revealed.rerolled;
    }
    names = heroNames(state);
    rollRequest = null;
    if (handDialog.open) handDialog.close();
    selectedCard = null;
  }
  render();
  focusRollAction();
}

function focusRollAction() {
  (match.querySelector('button[data-action="test-die-slot"], button[data-action="advance-roll"], button[data-action="roll-request"]')
    ?? document.getElementById('action-title'))?.focus();
}

function arena(seat, responding, decisionSeat) {
  const allowed=legal(state), p=state.pending;
  const pendingAbility=p?.name ? abilityName(p.name) : '';
  const activeName=names[state.active], actingName=names[seat];
  let heading, phase, detail='', content='', preparedToken;
  const stageEffects = [[],[]];
  const addEffect = (action, label, attrs = '', owner = seat) =>
    stageEffects[owner].push(button(action,label,attrs));
  const naughtyOrNiceDetail='The final die determines whether the opponent is naughty or nice. Dice can be altered before resolution.';
  const effectRoll=p?.effectDice ? tray(p.effectDice,state.active,false) : '';
  const footworkPending=!!(duelist.bonus(state,state.active)||duelist.bonus(state,1-state.active));
  if(state.deadpoolRps){
    const r=state.deadpoolRps;phase='Rock, Paper, Scissors';
    if(['first','second'].includes(r.step)){heading=`${names[responding]} · choose privately`;detail='The first choice stays hidden until both choices are committed. A tied round is replayed.';content=deadpool.hands.map((hand,i)=>button('deadpoolRpsPick',`<img src="${art.deadpoolRps[i]}" alt="${hand}" style="max-width:110px;width:100%">${hand}`,`data-status="${hand}"`)).join('')+(r.step==='second'?button('deadpoolRpsRandom','Draw a random opponent RPS card'):'');}
    if(r.step==='reveal'){heading=r.winner===null?'Tie · play again':`${names[r.winner]} wins the round`;content=r.picks.map((hand,i)=>`<figure><figcaption>${names[i===0?r.seat:1-r.seat]} · ${hand}</figcaption><img src="${art.deadpoolRps[deadpool.hands.indexOf(hand)]}" alt="${hand}" style="max-width:130px;width:100%"></figure>`).join('')+button('deadpoolRpsReveal',r.winner===null?'Play the tied round again':'Continue RPS result','class="primary"');}
    if(r.step==='shoot'){heading=`${names[responding]} may use Shoot`;detail='Flip the active Shoot card to win this round, or accept the result. Once Shoot is used, the other player cannot use a second Shoot.';content=button('deadpoolShoot','Use Shoot · flip to Inactive','data-status="yes"')+button('deadpoolShoot','Keep Shoot Active · accept the result','data-status="no"');}
  } else if(state.deadpoolTask&&state.stage==='deadpoolChoices'){
    const t=state.deadpoolTask,h=t.queue[0];phase='Deadpool';heading=names[t.seat];
    if(h.kind==='donuts'){heading=`Give Donut · ${h.left} remaining`;detail='Choose any player for each token. The whole batch is allocated before tokens are gained; excess is lost at each player’s limit of 2.';content=names.map((name,target)=>button('deadpoolDonutTarget',`${name} · ${(state.players[target].donut??0)+h.allocation[target]}/2`,`data-target="${target}"`)).join('');}
    if(h.kind==='gain'){heading=`Gain ${h.amount} ${statusLabel(h.key)}`;detail='Spend existing eligible tokens before collecting the whole batch if desired. Excess is lost.';content=button('deadpoolCollect','Collect the whole batch','class="primary"');}
    if(h.kind==='speechCP'||h.kind==='speechTaco'){heading=h.kind==='speechCP'?'Finger Guns · spoken bonus':'Taco Truck · spoken bonus';detail=h.kind==='speechCP'?'Say “Pew, Pew” while pointing finger guns to gain 1 CP, or skip the bonus.':'The straight can use a 1 or 6. Shout “Taco Tuesday!” to add 1 damage, or skip the bonus.';content=button('deadpoolSpeech','Claim the spoken bonus','data-status="yes"')+button('deadpoolSpeech','Skip the spoken bonus','data-status="no"');}
    if(h.kind==='fourth'){heading='Fourth Wall! · choose a Positive status';content=`<div class="controls">${deadpool.fourthChoices(state,t.seat).map((choice,i)=>
      button('deadpoolFourth',tokenChoiceLabel(state,choice,choice.key==='donut'?t.seat:1-t.seat),`data-choice="${i}"`)).join('')}</div>`;}
  } else if(state.deadpoolDonutRoll&&!state.response&&!state.retry){
    phase='Donut';heading='Roll for Donut healing';detail='Heal half the final die value, rounded up. Healing is accumulated with the existing end-of-Upkeep effects.';content=rollDisplay(rollContext(state))+button('resolveDonut','Resolve Donut healing','class="primary"');
  } else if(state.deadpoolLucky&&!state.response&&!state.retry){
    const r=state.deadpoolLucky;phase='Do You Feel Lucky?!';heading=`${names[r.target]} · hope for a number`;
    if(r.step==='hope'){content=`<label>Hope for <select id="deadpool-lucky-hope">${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${n===6?'selected':''}>${n}</option>`).join('')}</select></label>`+button('deadpoolLuckyHope','Commit the hoped-for number','class="primary"');}
    else {
      detail=`Hope: ${r.hope}. Match it to heal 3; otherwise receive 3 isolated damage. The die belongs to ${names[r.target]} and can be altered before resolution.`;
      content=r.step==='ready'?testBlankRoll('deadpoolLuckyRoll',1,1-seat)+button('deadpoolLuckyRoll','Roll the opponent’s die','class="primary"'):
        rollDisplay(rollContext(state))+button('deadpoolLuckyResolve','Resolve the hoped-for roll','class="primary"');
    }
  } else if(state.santaRemoval&&!state.santaNogRoll&&!state.sideDamage&&!state.retry){
    const removal=state.santaRemoval;
    phase='Status effect response';heading=removal.choosing?`${names[removal.source]} resolves the removal`:`${names[removal.seat]} may spend tokens first`;
    detail='If the chosen token has gone, select another available token.';
    content=removal.choosing?`<div class="controls">${santa.removalChoices(state).map((choice,i)=>
      button('resolveSantaRemoval',tokenChoiceLabel(state,choice,removal.seat),`data-choice="${i}"`)).join('')}</div>`
      :button('santaRemovalReady','Finish token response','class="primary"');
  } else if(state.santaGift){
    const g=state.santaGift;phase='White Elephant Gift';heading=g.stage==='hide'?'Santa · conceal the gift':'Opponent · choose a hand';detail=g.stage==='hide'?'Privately choose which hand holds Cheer and 3 Egg Nog from the supply, then let the opponent guess.':'Choose a hand. If it is empty, Santa gains the gift; otherwise no tokens are gained.';content=['left','right'].map(hand=>button(g.stage==='hide'?'santaGiftHide':'santaGiftGuess',`${hand==='left'?'Left':'Right'} hand`,`data-status="${hand}"`)).join('');
  } else if(state.santaTask&&state.stage==='santaChoices'){
    const t=state.santaTask,h=t.queue[0];phase='Santa';heading=names[responding];
    if(h.kind==='gain'){heading=`Gain ${h.amount} ${statusLabel(h.key)}`;detail='Spend existing tokens first if desired, then collect this whole batch. Excess tokens are lost at the stack limit.';content=button('collectSantaTokens','Collect the whole batch','class="primary"');}
    if(h.kind==='mistletoe'){heading=`Mistletoe · choose ${h.left} recipient${h.left===1?'':'s'}`;detail='The same player may be chosen twice. Both choices finish before gaining Cheer.';content=names.map((name,target)=>button('santaMistletoe',name,`data-target="${target}"`)).join('');}
    if(h.kind==='apology'){heading='Extremely Naughty!';detail='The opponent must choose whether to apologise for being naughty. Declining causes 2 separate undefendable damage.';content=button('santaApology','Apologise','data-status="yes"')+button('santaApology','Decline · receive 2 damage','data-status="no"');}
  } else if(state.santaNogRoll&&!state.response&&!state.retry){
    phase='Egg Nog';heading='Resolve the Egg Nog die';detail='Axe: 2 isolated undefendable damage. Bell: heal 2 and gain 1 CP. Star: heal 2 and draw 1. This die uses Santa’s symbols regardless of its owner’s hero.';content=rollDisplay(rollContext(state))+button('resolveEggNog','Resolve Egg Nog','class="primary"');
  } else if(state.santaRoll&&!state.cardRoll&&!state.response&&!state.retry){
    const contest=state.pending.santa.contest;
    phase=contest?'Fireside Chat':'Naughty or Nice';heading=contest?'Resolve the ability roll':`Target ${names[1-state.active]}`;
    detail=contest?'Each die belongs to its actual roller. Equal or greater wins, including ties. Dice can be altered before comparison.':naughtyOrNiceDetail;
    content=rollDisplay(rollContext(state))+button('resolveSantaRoll','Resolve the roll','class="primary"');
  } else if(state.mysticTask&&state.stage==='mysticChoices'){
    const t=state.mysticTask,h=t.queue[0];phase='Mystic Brawler';heading=names[t.seat];
    if(h.kind==='strengths'){heading=`Choose Strengths · ${h.left} remaining`;detail='Allocate the whole batch before the tokens are gained. Each type has its own stack limit.';content=mysticBrawler.gainOptions(state).map(key=>button('mysticStrength',`${statusLabel(key)} · ${(state.players[t.seat][key]??0)+(h.allocation[key]??0)}/${mysticBrawler.caps[key]}`,`data-status="${key}"`)).join('');}
    if(h.kind==='tectonic'){
      heading='Tectonic Punch';
      detail='Removing a Mountain adds 3 ability damage, but that removed token no longer contributes its persistent +1.';
      content=button('mysticTectonic','Gain Strength of the Mountain','data-status="gain"');
      if(state.players[t.seat].strengthMountain)addEffect('mysticTectonic','Remove a Mountain · add 3 damage','data-status="remove"');
    }
  } else if(!state.response&&state.mysticContest&&!state.cardRoll&&!state.retry){
    phase='Strong Arm';heading='Compare the opposed roll';detail='Equal or greater: gain 1 Strength and deal 6 damage. Lower: deal 7. Each die belongs to its own roller and can be altered before resolution.';content=rollDisplay(rollContext(state))+button('resolveMysticContest','Resolve Strong Arm','class="primary"');
  } else if(state.krampusOverflow!==undefined){
    const seat=state.krampusOverflow,player=state.players[seat];phase='Reject limit';heading=`${names[seat]} must discard down to 3 Rejects`;detail='The whole draw batch has finished. Excess Rejects must be discarded without activation.';content=player.rejects.map(id=>button('discardReject',`Discard ${krampus.names[id]}`,`data-index="${id}"`)).join('');
  } else if(state.krampusActivation){
    const a=state.krampusActivation;phase='Activate Reject';heading=krampus.names[a.reject];detail=`${a.free?'This activation keeps the Reject in play.':'The Reject is discarded after its effect.'} Each Reject can activate only once per global turn. Eligible Krampus cards can be played before finishing.`;content=`<img src="${art.krampusRejects[a.reject]}" alt="${krampus.names[a.reject]}" style="max-width:240px;width:100%">`+button('finishReject','Resolve Reject effect','class="primary"');
  } else if(state.krampusTask&&state.stage==='krampusChoices'){
    const h=state.krampusTask.queue[0];phase='Krampus';heading=names[state.krampusTask.seat];
    if(h.kind==='draw'){heading=`Draw ${h.amount} Reject${h.amount===1?'':'s'}`;detail='Activate eligible existing Rejects first if desired, then draw the whole batch. If over the limit, discard down to three without activating the excess.';content=button('collectRejects','Draw the whole batch','class="primary"');}
    if(h.kind==='gift'){heading=`Gain ${h.amount} Gifts`;detail='Spend existing Gifts first if desired, then collect the whole batch. Excess Gifts are lost.';content=button('collectGifts','Collect Gifts','class="primary"');}
    if(h.kind==='free'){heading='Optional free Reject activation';detail='Activate one eligible Reject without discarding it. The once-per-turn limit still applies.';content=krampus.options(state,responding,true).map((c,i)=>button('krampusFree',c.label,`data-choice="${i}"`)).join('')+button('krampusFreeSkip','Keep the Rejects without activating','class="primary"');}
    if(h.kind==='rejection'){heading='Rejection · choose the benefit';content=button('krampusRejection','Draw 1 Reject','data-status="draw"')+button('krampusRejection','Activate a Reject without discarding','data-status="free"');}
  } else if(!state.response&&state.alchemistTask&&state.stage==='alchemistChoices'){
    const task=state.alchemistTask, h=task.queue[0], choices=alchemist.taskChoices(state);
    phase='Alchemist';
    if (h.kind==='attach') {
      const choosingSlot=choices.some(choice=>choice.key===selectedPotion);
      heading=choosingSlot?`Choose a slot · ${h.left} remaining`:`Choose a Potion · ${h.left} remaining`;
      content=potionAttachmentChoices(task.seat,choices);
    } else {
      heading=h.kind==='remove'?`Remove Potions · up to ${h.left}`:h.kind==='target'?'Tonic! · choose a player':'Transmogrify! · choose a status';
      if(h.kind==='remove')detail='Removing a Potion leaves its effect unused.';
      content=`<div class="controls">${choices.map((choice,i)=>button('alchemistChoice',
        tokenChoiceLabel(state,choice,task.seat),`data-choice="${i}"`)).join('')}
        ${allowed.alchemistDone?button('alchemistDone','Finish removing Potions'):''}</div>`;
    }
  } else if(!state.response&&state.alchemistRoll&&!state.cardRoll&&!state.retry){
    phase='Upkeep · The Lab II';heading=names[state.alchemistRoll.seat];detail='Solution attaches 1 Potion. Composition or Crucible attaches 2. A blank attaches none.';content=tray(state.alchemistRoll.dice,state.alchemistRoll.seat,false)+button('resolveAlchemistLab','Resolve The Lab roll','class="primary"');
  } else if(state.iceFreezeChoice){
    const f=state.iceFreezeChoice;phase='Dice Cube';heading=`${names[f.seat]} chooses a tied lowest die`;detail='The chosen original die will remain frozen for this Roll Phase, unless its Dice Cube is removed.';
    content=chooseDiceTray({dice:state.dice,seat:f.seat},'iceChooseFrozen','Confirm freeze',
      {canPick:(_,i)=>f.candidates.includes(i)});
  } else if(!state.response&&state.wolverineRageRoll&&!state.cardRoll&&!state.retry){
    const t=state.wolverineRageRoll;phase='Rage discard · Recovery';heading=seatCard(state,t.seat,t.id).name;detail='Any Mask returns this discarded card to hand. Astonishing Recovery heals 2 instead if no Mask is rolled.';content=tray(t.dice,t.seat,false)+button('resolveRageRecovery','Resolve Recovery roll','class="primary"');
  } else if(!state.response&&state.alphaRoll&&!state.cardRoll&&!state.retry){
    const t=state.alphaRoll;phase='Alpha';heading=`${names[t.seat]} challenges ${names[t.target]}`;detail='If the attacker’s result is lower, remove Alpha. A tie retains it. Each die uses its owner’s Hex and manipulation rules.';content=rollDisplay(rollContext(state))+button('resolveAlpha','Resolve Alpha','class="primary"');
  } else if(state.wolverineIntimidate){
    const t=state.wolverineIntimidate;phase='Intimidate!';heading=`${names[t.target]} chooses`;detail='Discard one card, or receive 4 isolated damage. This discard does not trigger Recovery or Frenzy.';content=state.players[t.target].hand.map(id=>previewableOption(state,t.target,id,button('wolverineIntimidate',`Discard ${seatCard(state,t.target,id).name}`,`data-status="discard" data-index="${id}"`))).join('')+button('wolverineIntimidate','Receive 4 isolated damage','data-status="damage"');
  } else if(!state.response&&state.wolverineGain){
    const t=state.wolverineGain;phase='Gain Rage';heading=`${names[t.seat]} gains ${t.amount} Rage`;detail='Spend existing Rage first if desired, then collect the whole batch. Tokens beyond the stack limit are lost.';content=button('collectRage','Collect incoming Rage','class="primary"');
  } else if(!state.response&&state.stormTask&&state.stage==='stormChoices'){
    const t=state.stormTask,h=t.queue[0];phase='Lightning';heading=`${names[t.seat]} places Lightning`;detail=`${h.left} remaining. A second Lightning on an ability removes both and immediately deals 2 isolated damage.`;content=storm.places(state).map(key=>button('stormPlace',`${abilityName(key)}${state.players[t.seat].lightningCharges?.[key]?' · overload for 2 damage':' · Charge'}`,`data-status="${key}"`)).join('')+(allowed.stormPlaceDone?button('stormPlaceDone','Finish placing Lightning','class="primary"'):'');
  } else if(!state.response&&state.rogueGain){
    const t=state.rogueGain;phase='Ionic Energy';heading=`${names[t.seat]} collects Ionic Energy`;detail=`${t.ones} Ionic (1) and ${t.twos} Ionic (2) are waiting. The two values share one stack limit. Spend existing tokens first if eligible, then choose what fits; excess is lost.`;content=rogue.collectChoices(state).map((c,i)=>button('rogueCollect',c.label,`data-choice="${i}"`)).join('');
  } else if(!state.response&&state.rogueRoll&&!state.cardRoll&&!state.retry){
    const t=state.rogueRoll;phase=t.kind==='influence'?'Influence · start of Roll Phase':'Skyward';heading=names[t.seat];detail=t.kind==='influence'?'Each 1–3 removes one Roll Attempt, then all Influence is removed. These dice may be modified before resolution.':'Greater returns 3 damage; equal prevents 4. You may pay 1 CP for each reroll of your own die before resolving once.';content=rollDisplay(rollContext(state))+(allowed.rerollSkyward?button('rerollSkyward','Pay 1 CP · reroll own Skyward die'):'')+button('resolveRogueRoll','Resolve the roll','class="primary"');
  } else if(state.psyReveal){
    const t=state.psyReveal;phase='Deft Maneuver';heading=`${names[t.seat]} examines ${names[1-t.seat]}’s hand`;detail=t.cards.length?'The examined hand stays unchanged.':'The opponent’s hand is empty.';content=t.cards.map(card=>`<figure class="reveal-card"><img src="${cardArtwork(state,1-t.seat,card)}" alt="${seatCard(state,1-t.seat,card).name}" style="max-width:180px;width:100%"><figcaption>${seatCard(state,1-t.seat,card).name}</figcaption></figure>`).join('')+button('psyRevealDone','Finish examining','class="primary"');
  } else if(!state.response&&state.jeanTask&&state.stage==='jeanChoices'&&!state.cardRoll&&!state.retry){
    const t=state.jeanTask,h=t.queue[0],player=state.players[t.seat];phase='Jean Grey';heading=names[t.seat];
    if(h.kind==='gain'){heading=`Gain ${h.amount} ${statusLabel(h.key)}`;detail=`You hold ${player[h.key]??0}/${statusCap(player,h.key)}. Spend existing tokens first if desired, then collect the whole batch; excess is lost.`;content=button('jeanCollect','Collect the whole batch','class="primary"');}
    if(h.kind==='passive'){heading='Dark Phoenix · matching numbers';detail='The activated ability has three matching numbers. Choose the bonus before resolving its other effects.';content=(!p.pure?button('jeanPassive','Add 2 attack damage','data-status="damage"'):'')+button('jeanPassive','Inflict Phoenix Burn','data-status="burn"');}
    if(h.kind==='essence'){heading='Essence';content=button('jeanEssence','Gain 2 Flame Blast','data-status="flameBlast"')+button('jeanEssence','Gain 4 Acuity','data-status="acuity"');}
  } else if(!state.response&&state.iceTask&&state.stage==='iceChoices'&&!state.cardRoll&&!state.retry){
    const t=state.iceTask,h=t.queue[0],player=state.players[t.seat];phase='Iceman';heading=names[t.seat];
    if(h.kind==='gain'){
      heading=`Gain ${h.amount} Ice Shard${h.amount===1?'':'s'}`;detail=`You currently hold ${player.iceShard??0}/5 on your board. Spend existing shards now if desired, then collect the whole batch. Incoming shards cannot be collected in parts.`;
      content=button('iceCollect','Collect the whole batch','class="primary"');
    } else if(h.kind==='store'){
      heading='Store Ice Shards in The Freezer';detail=`The Freezer holds 5 shards; ${h.left} more waiting. You may convert five stored shards into stored Glide, then continue storing the remaining shards.`;
      content=button('iceStoreDone','Keep the stored five · discard the excess','class="primary"');
    } else if(h.kind==='transfer'){
      heading='Transfer tokens from The Freezer';detail='Take any permitted amount, in any order. You may convert five board shards into Glide between transfers. You may also leave tokens stored.';
      content=iceman.transferOptions(state).map((choice,i)=>button('iceTransfer',choice.label,`data-choice="${i}"`)).join('')+button('iceTransferDone','Finish transferring','class="primary"');
    } else if(h.kind==='chill'){
      heading='Everybody Chill · choose the bonus';detail=`Damage counts board shards, including this ability’s gain. Converting shards after activation does not reduce the saved damage bonus; stored Freezer shards do not count.`;
      content=button('iceChill',`Add ${Math.max(p.iceman.shardSnapshot??0,player.iceShard??0)} damage`,'data-status="damage"')+button('iceChill','Gain 2 Ice Shards and draw 1','data-status="draw"');
    } else if(h.kind==='frost'){
      heading=`Ice to Meet You · ${h.left} Frost outcome(s)`;detail='Choose for each Frost. Glide cannot be spent to make room for another Glide during this ability.';
      content=button('iceFrost','Gain Glide','data-status="glide"')+button('iceFrost','Draw 1','data-status="draw"');
    }
  } else if(!state.response&&state.gambitRoll&&!state.cardRoll&&!state.retry){
    const r=state.gambitRoll;phase=r.kind==='high'?'Upkeep · High Stakes':'Ace explosion';heading=r.kind==='high'?`${names[r.seat]} resolves High Stakes`:r.kind==='heartRoll'?'Heart Ace · healing roll':'Club Ace · damage roll';
    detail=r.kind==='high'?`${r.dice.length} dice. With five dice, any 1 busts the whole ability. Super Charge accelerates any Ace; Spade/Club charges a black Ace; Heart/Diamond charges a red Ace.`:'Half the final numerical value, rounded up.';
    const rerolls = r.kind==='high' && r.magicLeft
      ? [{type:'gambitMagicReroll',limit:1,label:`Card Magic · reroll selected die · ${r.magicLeft} left`}] : [];
    content=rerollTray({dice:r.dice,seat:r.seat},rerolls)+button('gambitResolveRoll','Resolve roll','class="primary"');
  } else if(!state.response&&state.gambitTask&&state.stage==='gambitSequence'&&!state.cardRoll&&!state.retry){
    const t=state.gambitTask,h=t.queue[0];phase='Gambit';heading=names[t.seat];
    if(h.kind==='accelerate'){
      heading=`Accelerate · ${h.left} remaining`;detail='Allocate this batch before any tokens are placed. Aces cannot be exploded part-way through the batch. You may stop without using the remaining acceleration.';
      content=gambit.available(state,t.seat,h).map(suit=>button('gambitCharge',`${statusLabel(suit)} · ${state.players[t.seat].aces[suit].charge+(h.allocation[suit]??0)}/${gambit.caps[suit]} allocated`,`data-status="${suit}"`)).join('')+button('gambitChargeSkip','Finish this acceleration batch','class="primary"');
    } else if(h.kind==='regain'){
      heading=h.optional===false?`Regain ${h.left} Ace card(s)`:`Regain up to ${h.left} Ace card(s)`;detail='Regained Aces return face up with no charge tokens.';
      content=gambit.regainChoices(state,t.seat,h).map(suit=>button('gambitRegain',`Regain ${statusLabel(suit)}`,`data-status="${suit}"`)).join('')+(h.optional===false?'':button('gambitRegainSkip','Finish regaining','class="primary"'));
    } else if(h.kind==='window'){
      heading='Continue ability effects';detail=h.label;content=button('gambitContinue','Continue','class="primary"');
    } else if(h.kind==='sleight'){
      heading='Sleight of Hand';detail=h.upgraded?'Both choices inflict Disruption.':'The regain choice also inflicts Disruption.';
      content=button('gambitSleight','Accelerate twice','data-status="accelerate"')+button('gambitSleight',h.upgraded?'Regain up to two Aces':'Regain an Ace','data-status="regain"');
    } else if(h.kind==='hand'){
      heading=`Examine ${names[h.target]}’s hand`;detail='Call Your Bluff! accelerates once if the hand contains a Roll Phase Action card.';
      content=h.cards.map(card=>`<figure class="reveal-card"><img src="${cardArtwork(state,h.target,card)}" alt="${seatCard(state,h.target,card).name}" style="max-width:180px;width:100%"><figcaption>${seatCard(state,h.target,card).name}</figcaption></figure>`).join('')+button('gambitHandDone','Finish examining','class="primary"');
    } else if(h.kind==='dissolution'){
      heading=`Gain ${h.amount} Dissolution`;detail='You may spend existing Dissolution in your Main Phase before collecting the incoming tokens. Excess above two is lost.';content=button('gambitCollect','Collect Dissolution','class="primary"');
    } else if(h.kind==='loseCharge'){
      heading='High Stakes bust · remove one charge';detail='Choose an Ace from which to remove one Molecular Acceleration token.';
      content=gambit.suits.filter(k=>state.players[t.seat].aces[k].charge).map(suit=>button('gambitLoseCharge',`Remove one from ${statusLabel(suit)}`,`data-status="${suit}"`)).join('');
    }
  } else if(!state.response&&state.cyclopsTask&&state.stage==='cyclopsSequence'&&!state.cardRoll&&!state.retry){
    const t=state.cyclopsTask,h=t.queue[0];phase='Cyclops';heading=names[t.seat];
    if(h.kind==='then'){
      heading='Before “then”';detail=`${h.label}. You may play eligible Leadership cards first; later bonuses use the cards played by the time they resolve.`;
      content=button('cyclopsContinue','Continue after “then”','class="primary"');
    } else if(h.kind==='gain'){
      heading=`Collect ${h.amount} ${statusLabel(h.key)}`;detail=`You currently hold ${state.players[t.seat][h.key]??0}; stack limit ${statusCap(state.players[t.seat],h.key)}. Spend existing tokens now if desired, then collect the entire incoming batch. Excess tokens are lost.`;
      content=button('cyclopsCollect','Collect the whole batch','class="primary"');
    } else if(h.kind==='choice'){
      heading='Hand to Hand · matching numbers';content=button('cyclopsTokenChoice','Gain Battle Plan','data-status="battlePlan"')+button('cyclopsTokenChoice','Gain Support','data-status="support"');
    } else if(h.kind==='hand'){
      heading=`${names[t.seat]} examines ${names[h.target]}’s hand`;
      content=h.cards.map(card=>`<figure class="reveal-card"><img src="${cardArtwork(state,h.target,card)}" alt="${seatCard(state,h.target,card).name}" style="max-width:180px;width:100%"><figcaption>${seatCard(state,h.target,card).name}</figcaption></figure>`).join('')+button('cyclopsHandDone','Finish examining','class="primary"');
      detail=h.cards.length?'This does not discard, draw or transfer any cards.':'The opponent’s hand is empty.';
    } else if(h.kind==='scout'){
      heading='Battle Plan · top three cards';detail=h.picking?'Reveal and add up to one Leadership card to your hand, or skip.':'For each remaining card, discard it or choose it as the next card returned. The first returned card will be on top.';
      content=h.cards.map((card,i)=>`<figure class="reveal-card"><img src="${cardArtwork(state,t.seat,card)}" alt="${seatCard(state,t.seat,card).name}" style="max-width:180px;width:100%"><figcaption>${seatCard(state,t.seat,card).name}</figcaption>${previewCard(state,t.seat,card)}${h.picking?(cyclops.isLeadership(state,t.seat,card)?button('cyclopsScoutTake','Reveal and take',`data-index="${i}"`):''):button('cyclopsScoutTop','Return next to deck',`data-index="${i}"`)+button('cyclopsScoutDiscard','Discard',`data-index="${i}"`)}</figure>`).join('')+(h.picking?button('cyclopsScoutSkip','Take no Leadership card','class="primary"'):'');
      if(h.order.length)detail+=` ${h.order.length} card(s) already ordered.`;
    } else if(h.kind==='defence'){
      heading='Recourse · Blast result';detail='This choice applies once, regardless of the number of Blast symbols.';
      content=button('cyclopsDefenceChoice','Deal 3 return damage','data-status="damage"')+button('cyclopsDefenceChoice','Prevent 2 damage','data-status="prevent"')+(h.optional?button('cyclopsDefenceChoice','No additional effect','data-status="skip"'):'');
    }
  } else if(state.thorOverflow){
    const t=state.thorOverflow;phase='Electrokinesis';heading=`${names[t.seat]} is at the stack limit`;
    detail=`${t.amount} more Electrokinesis waiting. Spend 4 to draw once this turn, then receive the pending tokens, or keep the current 4 and discard the excess.`;
    addEffect('thorOverflowDraw','Spend 4 Electrokinesis · draw a card, then gain the pending tokens');
    content=button('thorOverflowKeep','Keep 4 Electrokinesis','class="primary"');
  } else if(!state.response&&state.thorTask&&state.stage==='thorSequence'&&!state.cardRoll){
    const t=state.thorTask,step=t.queue[0];phase='Mjölnir';heading=`${names[t.seat]} chooses the next movement`;
    detail=`Up to ${step.left} further throw/retrieve movements. Each throw deals its own isolated damage before the next choice.`;
    content=button('thorHammerChoice',thor.holder(state,t.seat)===t.seat?'Throw Mjölnir · 1 isolated damage':'Retrieve Mjölnir · gain Electrokinesis','class="primary"')+button('thorHammerStop','Finish moving Mjölnir');
  } else if(state.conjureTask){
    const t=state.conjureTask,opponent=1-t.seat;phase='Conjure';heading=`${names[opponent]} may block Conjure`;
    detail=`${names[t.seat]} wants to gain ${statusLabel(t.choice.status)} from ${names[t.choice.source]}’s leaflet. Discard one card to prevent the gain, or allow it.`;
    content=state.players[opponent].hand.map(id=>previewableOption(state,opponent,id,button('conjureDiscard',`Discard ${seatCard(state,opponent,id).name}`,`data-index="${id}"`))).join('')+button('conjureAllow','Allow the status gain','class="primary"');
  } else if(!state.response&&state.scarletJinx&&!state.cardRoll&&!state.retry){
    const t=state.scarletJinx;phase='Jinx';heading=`${activeName} resolves a Crown reroll`;
    detail=`${p.scarlet.jinxUpgrade?'Each Crown adds 1 damage and rolls again.':'Each On outcome can happen only once across the whole ability.'} ${t.left} reroll${t.left===1?'':'s'} pending. Earlier dice have resolved and cannot be changed or matched.`;
    content=tray(t.dice,t.seat,false)+button('resolveScarletJinx','Resolve this reroll','class="primary"');
  } else if(state.lokiTask){
    const t=state.lokiTask.queue[0];phase='Loki';heading=t.kind==='bind'?`Choose an ability to make Spellbound`:'Distribute Bags of Tricks';
    detail=`${names[state.lokiTask.seat]} chooses · ${t.left} remaining.${t.kind==='bind'?' An Ultimate cannot be covered.':' You may choose the same player more than once; stack limit 2.'}`;
    content=loki.options(state).map((choice,i)=>button('lokiChoose',t.kind==='bind'?abilityName(choice.label):choice.label,`data-choice="${i}"`)).join('')+(t.optional?button('lokiSkip','Finish distributing','class="primary"'):'');
  } else if(state.lokiIllusion){
    const t=state.lokiIllusion;phase='Illusion';
    if(t.kind==='arrange'){
      heading=`${names[t.seat]} arranges the hidden cards`;detail='Attacker, look away. Choose the card for the next position, or shuffle all three.';
      if(t.order.length)detail+=' Position 1: '+loki.illusionNames[t.order[0]]+'.';
      content=[0,1,2].filter(i=>!t.order.includes(i)).map(i=>button('arrangeIllusion',loki.illusionNames[i],`data-index="${i}"`)).join('')+button('shuffleIllusion','Shuffle the three cards');
    } else if(t.kind==='pick'){
      heading=`${activeName} chooses a hidden card`;detail='Choose one card to reveal. Loki may suggest a position.';
      content=[0,1,2].map(i=>button('pickIllusion',`<img src="${art.back}" alt="Face-down Illusion card" style="width:90px;display:block">Card ${i+1}`,`data-index="${i}"`)).join('');
    } else {
      heading=loki.illusionNames[t.result];detail=`${incomingDamage(state)} attack damage remains. Your Defensive Ability can still resolve.`;
      content=`<img src="${art.lokiIllusions[t.result]}" alt="${loki.illusionNames[t.result]}" style="max-width:230px;width:100%;display:block">`+button('finishIllusion','Continue attack','class="primary"');
    }
  } else if(!state.response&&(allowed.rollTrickBag||state.lokiBag&&!state.cardRoll&&!state.retry)){
    const t=state.lokiBag;phase=t?.outwit?'Outwit!':'Upkeep · Bag of Tricks';
    if(t?.kind==='choose'){
      heading=`${names[t.owner]} chooses the result`;detail=`Choose for ${names[t.seat]}.${t.outwit?'':' Healing and damage apply together at the end of Upkeep.'}`;
      content=button('chooseTrickBag',`Heal ${t.amount}`, 'data-status="heal"')+button('chooseTrickBag',`Gain ${t.outwit?3:1} CP`,'data-status="cp"')+button('chooseTrickBag',`Receive ${t.amount} damage`,'data-status="damage"');
    } else {
      heading=`${names[t?.seat??state.active]} rolls for ${t?.outwit?'Outwit!':'Bag of Tricks'}`;
      detail=t?.outwit?'On 1–5, Loki chooses heal 3, gain 3 CP or receive 3 damage. On 6, gain 4 CP.':'On 1 lose 1 CP; on 2–5 its original Loki chooses heal 2, gain 1 CP or receive 2 damage; on 6 gain 2 CP.';
      content=t?tray(t.dice,t.seat,false)+button('resolveTrickBag','Resolve roll','class="primary"'):
        testBlankRoll('rollTrickBag',1,state.active)+(state.players[state.active].trickBags??[]).map(b=>button('rollTrickBag',`Roll Bag of Tricks from ${names[b.owner]}`,`data-index="${b.id}"`)).join('');
    }
  } else if(state.premonitionTask){
    const t=state.premonitionTask,player=state.players[t.seat];phase='Income Phase';heading=`${actingName} uses Premonition`;
    if(t.kind==='choose'){
      detail='Choose the normal draw or spend Premonition. After spending tokens, return one of the drawn cards to your deck.';
      for(const [amount,draw] of [[1,2],[3,3]]){
        if(player.premonition>=amount)addEffect('choosePremonition',`Spend ${amount} Premonition · draw ${draw}`,`data-amount="${amount}"`);
      }
      content=button('choosePremonition','Normal Income · draw 1','class="primary" data-amount="0"');
    } else if(t.kind==='return'){
      detail='Return one of these newly drawn cards. Other cards in your hand cannot be returned.';
      content=t.drawn.map(id=>previewableOption(state,t.seat,id,`<div class="controls">
        <strong>${seatCard(state,t.seat,id).name}</strong>
        ${button('returnPremonition','Put on top',`data-index="${id}" data-status="top"`)}
        ${button('returnPremonition','Put on bottom',`data-index="${id}" data-status="bottom"`)}
      </div>`)).join('');
    } else {detail='Income complete.';content=button('completePremonition','Continue to Main Phase','class="primary"');}
  } else if(state.strangeTask&&state.stage!=='sideDamage'){
    const task=state.strangeTask,t=task.queue[0];phase='Spells';heading=t.kind==='prepare'?'Prepare a Spell':t.kind==='cast'?'Cast a Spell':t.kind==='order'?'Order the remaining cards':t.kind==='heal'?'Choose a Hero to heal':t.kind==='dejaTarget'?'Give Déjà Vu to a player':'Remove a status effect';
    if(t.kind==='prepare'||t.kind==='cast')detail=`${t.left} remaining · ${t.zone==='peek'?'among the top five cards':t.zone==='book'?'from the Book of Vishanti':'from your discard pile'}. Resolve this effect completely before choosing another Spell.`;
    if(t.kind==='order')detail='Choose from top to bottom. The remaining cards stay in the order you choose.';
    content=doctorStrange.options(state).map((choice,i)=>{
      const select=button('strangeChoose',tokenChoiceLabel(state,choice,task.seat),`data-choice="${i}"`);
      return choice.card===undefined?select:previewableOption(state,task.seat,choice.card,select);
    }).join('')+(t.optional?button('strangeSkip','Continue without this effect','class="primary"'):'');
  } else if(!state.response&&state.cosmicRayRoll&&!state.cardRoll&&!state.retry){
    phase='Cosmic Ray';heading=`${actingName} chooses the damage bonus`;
    detail=state.cosmicRayRoll.locked?'Ultimate: these dice cannot be altered. Choose one die.':'Choose one of the two dice to add to your attack. Dice may be altered before this choice is final.';
    const dice = state.cosmicRayRoll.dice;
    content=chooseDiceTray({dice,seat},'chooseCosmicRay',picks=>{
      const [index] = picks;
      return index===undefined ? 'Confirm damage bonus' : `Add ${dieValue(dice[index],state.players[seat])} damage`;
    });
  } else if(!state.response&&state.cosmicRayOverflow&&!state.cosmicRayRoll){
    phase='Cosmic Ray';heading='Make room for Cosmic Ray';
    detail='You are about to gain Cosmic Ray at the stack limit. You may spend an eligible existing token first. Only one Cosmic Ray may be spent per turn.';
    content=button('collectCosmicRay','Collect Cosmic Ray up to the stack limit','class="primary"');
  } else if(allowed.resolveCosmicFlare){
    phase='Upkeep · Cosmic Flare';heading=`${actingName} activates Cosmic Flare`;
    detail=`Deal ${state.players[state.active].cosmicFlare} damage to ${names[1-state.active]}, then remove one Cosmic Flare. Damage applies at the end of Upkeep.`;
    content=button('resolveCosmicFlare','Resolve Cosmic Flare','class="primary"');
  } else if(state.widowReveal){
    const r=state.widowReveal;
    phase='Baton Strike II';heading=`${names[r.target]} reveals their hand`;
    content=r.cards.map(id=>button('inspect-card',seatCard(state,r.target,id).name,`data-seat="${r.target}" data-index="${id}"`)).join('')+button('widowRevealDone','Continue','class="primary"');
  } else if(state.widowTask){
    const t=state.widowTask,player=state.players[t.seat];
    phase='Black Widow';heading=t.kind==='covert'?'Spend Covert Ops':t.kind==='order'?'Choose the order of your deck':t.kind==='search'?'Put upgrades into play':'Covert Ops · search your deck';
    if(t.revealed?.length)detail='Revealed upgrades/cards: '+t.revealed.map(id=>seatCard(state,t.seat,id).name).join(', ')+'.';
    if(t.kind==='covert'){
      detail='Put an upgrade from your hand into play for free, or look at the top 3 cards of your deck.';
      content=blackWidow.upgradeChoices(state,t.seat,'hand').map(id=>previewableOption(state,t.seat,id,button('widowHandUpgrade',`Play ${seatCard(state,t.seat,id).name}`,`data-index="${id}"`))).join('')+button('widowPeek','Look at top 3 cards');
    } else if(t.kind==='order'){
      detail+=' Choose the next card from top to bottom.';
      if(t.ordered?.length)detail+=' Chosen: '+t.ordered.map(id=>seatCard(state,t.seat,id).name).join(' → ')+'.';
      content=t.cards.map(id=>previewableOption(state,t.seat,id,button('widowOrder',seatCard(state,t.seat,id).name,`data-index="${id}"`))).join('')+button('widowKeep','Keep remaining order','class="primary"');
    } else {
      if(t.kind==='covertSearch'){
        detail='No upgrades in the top 3. You may reveal these cards and search for an upgrade.';
        content=(t.revealed??[]).map(id=>previewCard(state,t.seat,id,seatCard(state,t.seat,id).name)).join('');
      } else detail=`Choose up to ${t.left} more upgrades. Your deck is shuffled before any passive card draws.`;
      content+=(t.kind==='search'&&!t.left?[]:blackWidow.upgradeChoices(state,t.seat)).map(id=>previewableOption(state,t.seat,id,button('widowSearch',seatCard(state,t.seat,id).name,`data-index="${id}"`))).join('')+button(t.kind==='search'?'widowSearchDone':'widowKeep',t.kind==='search'?'Finish selection and shuffle':'Do not search','class="primary"');
    }
  } else if(!state.response&&state.widowAgility&&!state.cardRoll&&!state.retry){
    phase='Agility';heading=`${actingName} rolls for Agility`;
    detail='On 1–3, prevent half incoming damage. Elude! may be played on a 5–6 before resolving this roll.';
    content=tray(state.widowAgility.dice,seat,false)+button('resolveAgility','Resolve Agility','class="primary"');
  } else if(!state.response&&(allowed.widowBombRoll||state.widowBombRoll&&!state.cardRoll&&!state.retry)){
    phase='Upkeep · Time Bombs';heading=`${actingName} checks Time Bombs`;
    detail='On a 6, remove the bomb. Otherwise advance its countdown.';
    content=state.widowBombRoll
      ?tray(state.widowBombRoll.dice,seat,false)+button('widowBombResolve','Resolve bomb roll','class="primary"')
      :testBlankRoll('widowBombRoll',1,state.active)+(state.players[state.active].timeBombTimers??[]).filter(b=>!(state.widowBombChecked??[]).includes(b.id)).map(b=>button('widowBombRoll',
        tokenChoiceLabel(state,{key:'timeBomb',bombId:b.id,label:`Roll for bomb · 0:0${b.ticks}`},state.active),`data-index="${b.id}"`)).join('');
  } else if(allowed.collectShapeShift){
    phase='Status effect';heading='Collect Shape Shift';
    detail='You may spend an existing Shape Shift to make room for incoming tokens.';
    content=button('collectShapeShift','Collect Shape Shift','class="primary"');
  } else if(allowed.collectFeathers){
    phase='Status effect';heading='Collect Feathers';
    detail=`Gain up to ${state.ravenFeathers.amount} Feathers. You may spend existing Feathers first.`;
    content=button('collectFeathers','Collect Feathers','class="primary"');
  } else if(state.grimOverflow){
    phase='Grim Pursuit';heading='Make room for Grim Pursuit';
    detail=`Gain ${state.grimOverflow.amount} Grim Pursuit. Spend existing tokens first if you want to make room.`;
    content=button('collectGrim','Collect Grim Pursuit','class="primary"');
  } else if(state.tacticalOverflow){
    phase='Tactical Advantage'; heading=`${actingName} is about to gain Tactical Advantage`;
    detail=`Gain ${state.tacticalOverflow.amount} together. Spend your current tokens first if you want to make room.`;
    content=button('collectTactical','Collect Tactical Advantage','class="primary"');
  } else if(state.tacticalRemoval){
    phase='Status effect response'; heading=`${actingName} may spend Tactical Advantage`;
    detail='Buh, Bye! removes one token if you have any left.';
    content=button('resolveTacticalRemoval','Resolve Buh, Bye!','class="primary"');
  } else if(state.honorOverflow){
    phase='Honor'; heading=`${actingName} is about to gain Honor`;
    detail='Spend Honor on this attack before collecting the new token.';
    content=button('collectHonor','Collect Honor','class="primary"');
  } else if(state.bloodOverflow){
    phase='Blood Power'; heading=`${actingName} is about to gain Blood Power`;
    detail=`Gain ${state.bloodOverflow.amount}. You can spend Blood Power before collecting it.`;
    content=button('collectBloodPower','Collect Blood Power','class="primary"');
  } else if(state.growth) {
    const g=state.growth;
    phase='Grow Spirits'; heading=g.source;
    detail=g.original?'Grow each original Spirit at most once.':`${g.left} growth ${g.left===1?'step':'steps'} left.`;
    content=growthChoices(state).map(status=>button('growSpirit',status==='seedling'?'Gain Seedling':`Grow ${statusLabel(spiritTypes[spiritTypes.indexOf(status)-1])} into ${statusLabel(status)}`,`data-status="${status}"`)).join('');
    if(allowed.finishGrowth)content+=button('finishGrowth','Finish growing','class="primary"');
  } else if(allowed.jeanSwitch){
    phase='Upkeep · Call of the Phoenix';heading=`${activeName} changes form`;detail='Switching form preserves all status effects. Jean Grey draws at the start of Main Phase 1; Dark Phoenix skips Income.';content=button('jeanSwitch',`Become ${state.players[state.active].darkPhoenix?'Jean Grey':'Dark Phoenix'}`,'class="primary"');
  } else if(allowed.checkPhoenixBurn){
    phase='Upkeep · Phoenix Burn';heading=`${activeName} resolves Phoenix Burn`;detail='Receive 2 damage first, then roll to remove the token. Damage can be prevented normally.';content=button('checkPhoenixBurn','Check Phoenix Burn damage','class="primary"');
  } else if(!state.response&&state.jeanBurnRoll&&!state.cardRoll&&!state.retry){
    phase='Upkeep · Phoenix Burn';heading='Roll to remove Phoenix Burn';detail='A 5 or 6 removes the token. This roll may be modified before it resolves.';
    content=state.jeanBurnRoll.dice
      ?tray(state.jeanBurnRoll.dice,state.jeanBurnRoll.seat,false)+button('resolvePhoenixBurn','Resolve removal roll','class="primary"')
      :testBlankRoll('rollPhoenixBurn',1,seat)+button('rollPhoenixBurn','Roll die','class="primary"');
  } else if(allowed.gambitHighStakes){
    phase='Upkeep · High Stakes';heading='Choose two or five dice';detail='With five dice, any 1 loses every reward and removes one charge token. With two dice, a 1 does not cause a bust.';
    content=button('gambitHighStakes','Choose 2 dice','data-amount="2"')+button('gambitHighStakes','Choose 5 dice','data-amount="5"');
  } else if(allowed.gambitTakeDisruption){
    phase='Upkeep · Disruption';heading=`${activeName} resolves Disruption`;detail='Remove the token after choosing. Its two damage joins the other Upkeep damage and can be prevented normally.';
    content=(allowed.gambitPayDisruption?button('gambitPayDisruption','Lose 1 CP'):'')+button('gambitTakeDisruption','Receive 2 Upkeep damage','class="primary"');
  } else if(state.retry) {
    const context=rollContext(state);
    phase=state.retry.remaining?'Tsunami!':'Try, Try Again!'; heading=state.retry.remaining?`${actingName} may reroll up to ${state.retry.remaining} more ${state.retry.remaining===1?"time":"times"}`:`${actingName} can reroll once more`;
    const eligible=diceOwnedBy(context,state.retry.seat,state);
    content=rerollTray(context,[{type:'retryDie',limit:1,canPick:(_,index)=>Boolean(eligible[index])}])+
      button('finishRetry','Keep this roll');
  } else if(state.mainChoice) {
    const {seat,id}=state.mainChoice;
    phase='Main Phase action'; heading=seatCard(state,seat,id).name;
    detail='Choose a target.';
    content=`<div class="controls">${mainTargets(state,seat,id).map((choice,i)=>
      button('resolveMainChoice',tokenChoiceLabel(state,choice,seat),`data-choice="${i}"`)).join('')}</div>`;
  } else if(state.response) {
    phase=state.stage==='offence'?'Offensive Roll':
      ['defence','defenceResponse'].includes(state.stage)||state.gunContest?.kind==='duel'&&state.stage==='gunContest'?'Defensive Roll':'Response';
    heading=`${names[responding]} can respond`;
    const context=rollContext(state);
    detail=phase==='Defensive Roll' && pendingAbility ? `${pendingAbility} brings ${p.damage} incoming damage.` : 'Use an available effect or pass.';
    content=(context?rollDisplay(context):'')+button('passResponse','Pass','class="primary"');
  } else if(state.mesmerizeRoll){
    const effect=state.mesmerizeRoll;
    phase='Status effect roll'; heading='Mesmerize';
    if(effect.choosing){
      const context=rollContext({...state,stage:effect.resume,mesmerizeRoll:null});
      detail='Choose one of the opponent’s dice to reroll.';
      const eligible = diceOwnedBy(context,1-effect.seat,state);
      content=chooseDiceTray(context,'rerollMesmerized','Reroll selected die',{canPick:(_,i)=>Boolean(eligible[i])})+
        button('rerollMesmerized','Keep the current roll','data-index="-1"');
    } else {
      detail='A 5 or 6 lets you reroll one of the opponent’s dice.';
      content=tray(effect.dice,effect.seat,false)+button('resolveMesmerize','Resolve Mesmerize','class="primary"');
    }
  } else if(state.bleedRoll&&!state.cardRoll){
    phase='Upkeep'; heading='Bleed';
    detail='On 1–4, take 1 damage. On 5–6, remove one Bleed.';
    content=tray(state.bleedRoll,state.active,false)+button('resolveBleed','Resolve Bleed','class="primary"');
  } else if(allowed.rollNevermore||state.stage==='ravenNevermoreRoll'&&!state.cardRoll){
    phase='Upkeep';heading='Nevermore';detail=`${activeName} starts their upkeep with Nevermore.`;
    content=state.nevermoreRoll
      ?tray(state.nevermoreRoll.dice,seat,false)+button('resolveNevermore','Resolve Nevermore die','class="primary"')
      :testBlankRoll('rollNevermore',1,state.active)+button('rollNevermore','Roll the Nevermore die','class="primary"');
  } else if(state.cardRoll) {
    phase='Effect roll'; heading=state.cardRoll.id===null?'Wellspring':seatCard(state,state.cardRoll.seat,state.cardRoll.id).name;
    detail=`${names[seat]} can modify the roll before it resolves.`;
    const rerolls=[];
    if (allowed.mysticWildReroll) rerolls.push({type:'mysticWildReroll',limit:mysticBrawler.wildLimit(state)});
    if (allowed.abilityReroll) rerolls.push({type:'abilityReroll',limit:state.cardRoll.ninjaRerolls,
      canPick:value=>heroId(state,seat)===paleLady.id||value!==4&&value!==5});
    content=rerollTray({dice:state.cardRoll.dice,seat:state.cardRoll.roller??seat},rerolls)+
      button('finishCardRoll','Resolve card roll','class="primary"');
  } else if(state.stage==='gunContest') {
    const contest=state.gunContest;
    const duel=contest.kind==='duel';
    phase=duel?'Defensive Roll':'Ability roll';
    heading=duel?`${names[contest.seat]} defends`:pendingAbility;
    if(duel)detail=`${pendingAbility} brings ${p.damage} incoming damage.`;
    content=(duel?effectRoll:'')+rollDisplay(rollContext(state))+
      `<div class="controls">${allowed.rerollDuel?button('rerollDuel','Reroll the defence die'):''}
      ${button('resolveGunContest','Resolve roll-off','class="primary"')}</div>`;
  } else if(state.stage==='gunReload') {
    phase='Attack Modifier'; heading='Reload';
    detail='Add half the die value, rounded up.';
    content=rollDisplay(rollContext(state))+reloadRerolls(state).map(([key,label])=>
      button('rerollReload',`${label} · reroll`,`data-status="${key}"`)).join('')+
      button('resolveReload','Apply Reload damage','class="primary"');
  } else if(state.stage==='samuraiRoll') {
    phase='Status effect roll'; heading='Back Strike';
    detail='Deal half the die value back to the attacker, rounding up.';
    content=rollDisplay(rollContext(state))+button('resolveBackStrike','Apply Back Strike','class="primary"');
  } else if(state.seraphRoll) {
    const {kind,dice,seat:roller}=state.seraphRoll;
    phase='Status effect roll'; heading=kind==='blinding'?'Blinding Light':'Flight';
    detail=kind==='blinding'?'A 1 cancels the ability. On 2 or 3, halve final damage.':'Roll at least one 6.';
    content=tray(dice,roller,false)+button('resolveSeraphRoll','Resolve roll','class="primary"');
  } else if(state.artRoll) {
    const {kind,dice,seat:roller}=state.artRoll;
    phase=state.artRoll.resume==='upkeep'?'Upkeep':'Bot activation';
    heading={scrap:'Scrap Collector II',nanites:'Clear Nanites',heal:'Heal Bot',freeHeal:'Heal Bot'}[kind];
    content=tray(dice,roller,false)+button('resolveArtRoll','Resolve roll','class="primary"');
  } else if(state.mainAction) {
    phase='Main Phase'; heading=seatCard(state,state.mainAction.seat,state.mainAction.id).name;
    detail=`${actingName} can use an eligible card or effect before this card resolves.`;
    content=button('finishMainCard','Resolve card','class="primary"');
  } else switch (state.stage) {
    case 'tacticalRestart':
      phase='Offensive Roll'; heading='Profiteer';
      content=button('restartTacticalOffence','Begin additional Offensive Roll Phase','class="primary"');
      break;
    case 'offence':
      phase='Offensive Roll';
      heading=`${actingName} rolls`;
      detail=state.budget===0?'Influence removed all Roll Attempts. End this phase, spend Déjà Vu, or play One More Time! to gain a Roll Attempt.':state.players[state.active].decrepify&&state.attempts?'Decrep-ify · hold at least three dice to reroll.':state.attempts ? 'Tap dice to keep them, reroll the rest, or announce an available ability.' : 'Roll all five dice to begin.';
      if(testToggle.checked && editTestFaces && !testRoll) detail='Tap a die to change its face.';
      if(state.stormDice)detail+=` ${state.stormDice.count} borrowed ${HEROES[state.stormDice.hero].name} ${state.stormDice.count===1?"die":"dice"} join the five ordinary dice.`;
      content=offenceTray(seat,allowed)
        + `<div class="controls">${button('roll',state.attempts?(constrictCost(state)?'Reroll · 1 CP':'Reroll'):'Roll dice',`class="primary" ${allowed.roll?'':'disabled'}`)}
        ${button('end','End without an ability',allowed.end?'':'disabled')}</div>`
        + (testAbilityMessage ? `<p role="status">${testAbilityMessage}</p>` : '')
        + offenceAbilities(seat, allowed.declare);
      break;
    case 'announce':
      preparedToken = upcomingTokenRoll(state,'accept');
      phase=preparedToken?'Status effect roll':'Ability response';
      heading=preparedToken?tokenRollLabel(preparedToken.token):`${actingName} responds`;
      detail=`${activeName} announces ${pendingAbility}.`;
      content=preparedToken
        ? testBlankRoll('accept',1,state.active)+button('accept','Roll die','class="primary"')
        : tray(state.dice,state.active,false)+button('accept','Accept roll','class="primary"');
      break;
    case 'blind':
      phase='Status effect roll'; heading='Blind';
      detail='A 1 or 2 cancels the ability.';
      content=scalarTray(seat)+button('resolveBlind','Resolve Blind','class="primary"'); break;
    case 'gunDuelChoice':
      phase='Defensive Roll'; heading=abilityName(defenceName(state,seat));
      content=button('chooseDuel','Deal 3 damage','data-choice="0"')+
        button('chooseDuel','Prevent half the incoming damage','data-choice="1"');
      break;
    case 'vampireSearch': {
      phase='Ability choice'; heading=pendingAbility;
      detail='Choose one card to put into your hand. The rest of the deck will be shuffled.';
      const deck=state.players[state.active].deck.slice().sort((a,b)=>seatCard(state,seat,a).name.localeCompare(seatCard(state,seat,b).name));
      content=deck.map(id=>previewableOption(state,seat,id,button('searchVampireDeck',seatCard(state,seat,id).name,`data-index="${id}"`))).join('');
      break;
    }
    case 'vampireChoice':
      phase='Ability choice'; heading=pendingAbility;
      if(p.possessChoice){
        content=button('chooseVampireBenefit','Inflict Bleed','data-choice="0"')+
          button('chooseVampireBenefit','Gain Mesmerize','data-choice="1"');
      }else{
        if(state.players[seat].mesmerize)addEffect('chooseVampireBenefit','Spend Mesmerize · make undefendable','data-choice="1"');
        content=button('chooseVampireBenefit','Keep Mesmerize','class="primary" data-choice="0"');
      }
      break;
    case 'seraphTarget':
      phase='Ability choice'; heading=pendingAbility;
      content=names.map((name,target)=>button('chooseSeraphTarget',name,`data-target="${target}"`)).join('');
      break;
    case 'purify':
      phase='Ability choice'; heading=pendingAbility;
      detail=`Choose a status to remove from ${names[p.seraphTarget]}.`;
      content=statusKeys.filter(key=>state.players[p.seraphTarget][key]).map(status=>button('resolvePurify',
        tokenChoiceLabel(state,{status,label:`Remove ${statusLabel(status)}`},p.seraphTarget),`data-status="${status}"`)).join('')+
        button('resolvePurify','Continue without removing a status','class="primary"');
      break;
    case 'undeadRoll': {
      const pending=state.undeadRoll;
      phase='Undead';heading='Roll for activated Undead';
      detail='Remove one Undead of your choice for each Bones result.';
      const rerolls = pending.rerolls
        ? [{type:'rerollUndead',limit:1,label:`Reroll selected die · ${pending.rerolls} left`}] : [];
      content=rerollTray({dice:pending.dice,seat},rerolls)+button('resolveUndead','Resolve Undead roll','class="primary"');
      break;
    }
    case 'undeadRemove':
      phase='Undead';heading='Choose an Undead to remove';
      content=Object.keys(necromancer.undead).filter(kind=>state.players[seat].undead[kind]).map(kind=>
        button('removeUndead',necromancer.undead[kind].name,`data-status="${kind}"`)).join('');
      break;
    case 'necroChoice': {
      phase='Ability choice';heading=pendingAbility;
      const player=state.players[state.active];
      if(p.explosion){
        for(let count=1;count<=Math.min(p.explosion,player.corpses);count++){
          addEffect('necroChoice',`Spend ${count} ${count===1?'Corpse':'Corpses'}`,`data-amount="${count}"`);
        }
        content=button('necroChoice','Continue without spending Corpses','class="primary" data-amount="0"');
      }else if(p.shroud){
        const kinds=necromancer.types(player);
        content=kinds.map(kind=>button('necroChoice',`Summon ${necromancer.undead[kind].name}`,`data-status="${kind}"`)).join('');
        if(!kinds.length||p.shroud!=='both')content+=button('necroChoice','Gain 3 Corpses','data-status="corpses"');
      } else content=button('necroChoice','Finish Reanimate','class="primary"');
      break;
    }
    case 'horseRoll':
      phase='Attack Modifier';heading='Grim Pursuit';
      detail='Add 1 damage per Horseshoe rolled.';
      content=tray(state.horseRoll.dice,seat,false)+button('resolveGrimRoll','Apply Grim Pursuit','class="primary"');
      break;
    case 'horrifyChoice':
      phase='Ability choice';heading=pendingAbility;
      content=button('chooseHorrify','Gain 3 Dreadful','data-status="dreadful"')+
        button('chooseHorrify','Gain Grim Pursuit','data-status="grim"');
      break;
    case 'pantherAbility':
      phase='Ability';heading=pendingAbility;
      content=button('finishPantherAbility','Continue ability','class="primary"');
      break;
    case 'sunGemRoll':
      phase='Main Phase action';heading='Charged Gem';
      content=tray(state.sunGemRoll.dice,state.active,false)+button('resolveChargedGem','Resolve Charged Gem','class="primary"');
      break;
    case 'sunBurstChoice':
      phase='Ability choice';heading=pendingAbility;
      content=button('sunBurstChoice','Gain Charged Gem','data-status="gem"')+
        button('sunBurstChoice','Inflict Sun Marked','data-status="mark"');
      break;
    case 'sunMarked':
      phase='Start of defence';heading='Sun Marked';
      detail=`${activeName} heals 2 if Sun Marked is still on ${names[1-state.active]}.`;
      content=button('resolveSunMarked',state.players[1-state.active].sunMarked?'Resolve Sun Marked':'Continue attack','class="primary"');
      break;
    case 'forgeMine': {
      const task=state.forgeTask, ores=task.cards.filter(forgemaster.oreType);
      phase='The Mines';heading=`${actingName} looks at the top ${task.cards.length} cards`;
      content=task.cards.map(id=>forgemaster.oreType(id)
        ? previewableOption(state,task.seat,id,button('forgeMineChoice',`Reveal ${seatCard(state,task.seat,id).name}`,`data-index="${id}" data-status="one"`))
        : previewCard(state,task.seat,id,seatCard(state,task.seat,id).name)).join('')+
        (task.all&&ores.length>1?button('forgeMineChoice','Reveal all Ore','data-status="all"'):'')+
        button('forgeMineChoice','Reveal none · gain 1 CP','data-status="none"');
      break;
    }
    case 'forgeOrder':
      phase='The Mines';heading='Return the remaining cards';
      detail='Choose which card goes on the bottom next.';
      content=state.forgeTask.cards.map(id=>previewableOption(state,seat,id,button('forgeOrder',seatCard(state,seat,id).name,`data-index="${id}"`))).join('');
      break;
    case 'forgeSearch':
      phase='Ultimate';heading='Final Touches!';
      content=[...new Map(state.players[state.active].deck.filter(forgemaster.oreType).map(id=>[forgemaster.oreType(id),id])).values()]
        .map(id=>previewableOption(state,state.active,id,button('forgeSearch',`Forge ${seatCard(state,state.active,id).name}`,`data-index="${id}"`))).join('');
      break;
    case 'forgeAbility':
      phase='Ability';heading=pendingAbility;
      content=button('finishForgeAbility','Continue ability','class="primary"');
      break;
    case 'forgeMasterwork': {
      phase='Defensive Roll';heading=abilityName(defenceName(state,seat));
      detail=p.armorDoubleLimit===2?'Double up to two armour effects.':'Double one armour effect.';
      const slots=Object.keys(state.players[seat].armor).filter(slot=>state.players[seat].armor[slot]);
      content=forgemaster.selections(slots,p.armorDoubleLimit===2,p.armorDoubleLimit===2)
        .map(({label},i)=>button('forgeMasterwork',label,`data-choice="${i}"`)).join('');
      break;
    }
    case 'forgeArmor':
      phase='Damage response';heading='Armour';
      content=forgemaster.selections(forgemaster.eligibleArmor(state),true)
        .map(({label},i)=>button('forgeArmor',label,`data-choice="${i}"`)).join('');
      break;
    case 'duelMove': {
      const {max}=state.duelMovement;
      phase='Footwork';heading=`${actingName} can take up to ${max} ${max===1?'Step':'Steps'}`;
      const player=state.players[seat];
      detail=`Current position · ${duelist.positions[player.footwork+2]}`;
      content=duelist.steps(player,max).map(({label},i)=>button('duelMove',label,`data-choice="${i}"`)).join('');
      break;
    }
    case 'duelAbility':
      phase='Ability';heading=pendingAbility;
      content=button('finishDuelAbility','Continue ability','class="primary"');
      break;
    case 'guardOffer':
      phase='Attack modifier';heading='Guard Break';
      if(allowed.spendGuardBreak)addEffect('spendGuardBreak','Spend Guard Break and roll');
      content=button('skipGuardBreak','Continue attack','class="primary"');
      break;
    case 'guardBreakRoll':
      phase='Attack modifier';heading='Guard Break';
      content=tray(state.guardBreakRoll,state.active,false)+button('resolveGuardBreak','Resolve Guard Break','class="primary"');
      break;
    case 'druidReady':
      phase='Offensive Roll';heading=pendingAbility;
      detail=p.druid.wildDraw?'Draw a card if you finish this ability in Druid Form.':p.damage?'Cat Form adds 2 damage and inflicts Wound.':'';
      content=button('finishDruidAbility','Continue ability','class="primary"');
      break;
    case 'druidRainfall':
      phase='Ability choice';heading='Rainfall';
      detail='Choose a hero to gain 1 CP and 2 Regenerate.';
      content=names.map((name,i)=>button('druidRainfall',name,`data-target="${i}"`)).join('');
      break;
    case 'woundRoll':
      phase='Upkeep';heading='Wound';
      content=tray(state.woundRoll,seat,false)+button('resolveWound','Resolve Wound roll','class="primary"');
      break;
    case 'ravenActivate': {
      const task=state.ravenActivation, holder=state.players[task.owner].nevermoreSeat;
      phase='Companion';heading=`${names[task.owner]} activates Nevermore`;
      detail=`${task.left} ${task.left===1?'activation':'activations'} remaining. Nevermore is with ${names[holder]}.`;
      content=button('activateNevermore',`Move Nevermore to ${names[1-holder]}`,`data-status="move" data-target="${1-holder}"`)+
        (holder!==task.owner?button('activateNevermore','Absorb Vitality','data-status="absorb"'):'')+
        button('activateNevermore','Skip this activation','data-status="skip"');
      break;
    }
    case 'ravenDiscard':
      phase='Upkeep';heading='Nevermore forces a discard';
      content=state.players[seat].hand.map(id=>previewableOption(state,seat,id,button('ravenDiscard',seatCard(state,seat,id).name,`data-index="${id}"`))).join('');
      break;
    case 'ravenAttackChoice': {
      const holder=state.players[seat].nevermoreSeat;
      phase='Main Phase action';heading='Nevermore Attack!';
      content=button('ravenAttackChoice',`Heal ${names[holder]} by 2`,'data-status="heal"')+
        button('ravenAttackChoice',`Deal 2 damage to ${names[holder]}`,'data-status="damage"');
      break;
    }
    case 'ravenAbility':
      phase='Ability';heading=pendingAbility;
      content=button('finishRavenAbility','Continue ability','class="primary"');
      break;
    case 'prey':
      phase='Attack modifier';heading='Prey';
      content=state.preyRoll?tray(state.preyRoll,state.active,false)+button('resolvePrey','Resolve Prey roll','class="primary"'):
        (allowed.rollPrey?testBlankRoll('rollPrey',1,state.active)+button('rollPrey','Roll for Prey','class="primary"'):'')+button('skipPrey','Continue attack');
      break;
    case 'petulant':
      phase='Main Phase action';heading='Petulant!';
      content=(state.players[seat].cp?button('resolvePetulant','Pay 1 CP','data-choice="1"'):'')+
        button('resolvePetulant','Let Pale Lady transform','data-choice="0"');
      break;
    case 'paleMoonChoice':
      phase='Ability choice';heading='Full Moon';
      content=button('paleMoonChoice','Gain 1 CP','data-choice="0"')+button('paleMoonChoice','Gain a Moon Shard','data-choice="1"');
      break;
    case 'upkeep': {
      phase='Upkeep'; heading=`${activeName} resolves upkeep`;
      const hero=state.players[state.active];
      if(allowed.forgeUpkeep){
        heading='The Mines';detail='You may Mine your deck during upkeep.';
        content=button('forgeUpkeep','Mine your deck','data-status="mine"')+button('forgeUpkeep','Skip mining','data-status="skip"');
        break;
      }
      if(allowed.resolveDisarm){
        heading='Disarm';detail='Discard one card or skip your Income Phase.';
        content=hero.hand.map(id=>previewableOption(state,state.active,id,button('resolveDisarm',`Discard ${seatCard(state,state.active,id).name}`,`data-index="${id}" data-status="discard"`))).join('')+
          button('resolveDisarm','Skip Income Phase','data-status="skip"');
        break;
      }
      if(allowed.reposition){
        heading='Reposition';detail=`Current position · ${duelist.positions[hero.footwork+2]}. Moving backward grants one Guard Break.`;
        content=duelist.steps(hero,2,1).map(({label},i)=>button('reposition',label,`data-choice="${i}"`)).join('');
        break;
      }
      if(allowed.alchemistUpkeep){heading=state.players[state.active].upgrades['The Lab']?'The Lab II':'The Lab';detail='Resolve the mandatory Upkeep attachment before continuing.';content=button('alchemistUpkeep',state.players[state.active].upgrades['The Lab']?'Roll for The Lab II':'Attach 1 Potion','class="primary"');break;}
      if(allowed.unearth){
        heading='Unearth';detail='Choose a different ability to cover and gain its Corpses.';
        content=unearthChoices(hero).map(name=>button('unearth',`${abilityName(name)} · +${necromancer.unearth[name]+Number(!!hero.upgrades[name])} Corpses`,
          `data-status="${name}"`)).join('');
        break;
      }
      if(allowed.horseUpkeep){
        heading='Headless Mayhem';
        const move=hero.hauntedHeadSeat===seat
          ?button('horseUpkeep',`Send Haunted Head to ${names[1-seat]} · gain Dreadful`,'data-status="send"')
          :button('horseUpkeep','Bring Haunted Head back','data-status="return"');
        if(hero.dreadful>=4)addEffect('horseUpkeep','Terrorize · spend 4 Dreadful','data-status="terrorize"');
        content=move+button('horseUpkeep','Skip Headless Mayhem','data-status="skip"');
        break;
      }
      detail=[hero.sunDial!==undefined&&!hero.sunDawn&&!state.sunUpkeep?'Dusk increases the Sun Dial by 1.':'',hero.moonShard===3&&!hero.werewolf?'Twilight flips Pale Lady to Werewolf.':'',heroId(state,state.active)===gunslinger.id&&hero.reload!==2&&!state.quickDrawChecked?'Quick Draw grants Reload.':'',hero.nyra?.downed?(hero.nyra.hp>=5?'Nyra becomes Active.':'Nyra heals 1 and remains Downed.'):'',hero.bleed&&!state.bleedChecked?`Roll for ${hero.bleed} Bleed.`:'',hero.holyPresence&&!state.holyPresenceChecked?`Holy Presence deals ${hero.holyPresence} damage to ${names[1-state.active]}.`:'',heroId(state,state.active)===7&&!state.fertilized?'Fertilize grows one Spirit.':'',hero.fireMastery?'Lose 1 Fire Mastery.':'',hero.cursed?'Cursed deals 4 unpreventable damage.':'',hero.powderKeg&&!state.pirateKegChecked?'Roll for Powder Keg.':'',cursedPirate.foreignCoins(state,state.active)?'Opponent’s Doubloons deal upkeep damage.':'',hero.burn&&!state.upkeepEvaded?'Burn deals 2 damage.':'',hero.poison&&!state.upkeepEvaded?`Poison deals ${hero.poison} damage.`:'',state.upkeepPrevention?`Chi prevents ${state.upkeepPrevention} damage.`:''].filter(Boolean).join(' ');
      preparedToken = allowed.resolveUpkeep ? upcomingTokenRoll(state,'resolveUpkeep') : null;
      if (preparedToken) {
        heading = tokenRollLabel(preparedToken.token);
        detail = '';
        content = testBlankRoll('resolveUpkeep',preparedToken.count,state.active) +
          button('resolveUpkeep',preparedToken.count===1?'Roll die':'Roll dice','class="primary"');
        break;
      }
      content=(allowed.checkWound?button('checkWound','Resolve a Wound token'):'')+
        (allowed.checkRegenerate?button('checkRegenerate','Resolve Regenerate'):'')+(allowed.collectSynth?button('collectSynth','Use Scrap Collector'):'')+(allowed.clearNanites?button('clearNanites','Check Nanites'):'')+
        (allowed.resolveUpkeep?button('resolveUpkeep','Resolve upkeep','class="primary"'):'');
      break;
    }
    case 'artSpanner':
      phase='Ability roll'; heading=pendingAbility;
      if(state.players[seat].synth)addEffect('chooseSpanner','Spend 1 Synth to roll three dice','data-choice="1"');
      content=button('chooseSpanner','Roll one die','class="primary" data-choice="0"');
      break;
    case 'artBuild':
      phase='Ability choice'; heading=pendingAbility;
      content=artificer.buildChoices(state.players[state.active]).map(bot=>button('scratchBuild',`Make Advanced ${artificer.bots[bot]}`,`data-status="${bot}"`)).join('');
      break;
    case 'artFreeBots':
      phase='Ability choice'; heading=pendingAbility;
      content=artificer.freeChoices(state).map(bot=>button('chooseFreeBot',`Activate ${artificer.bots[bot]}`,`data-status="${bot}"`)).join('')+
        (p.freeRequired?'':button('chooseFreeBot','Finish bot activation','data-status="done"'));
      break;
    case 'pirateKegRoll':
      phase='Upkeep'; heading='Powder Keg';
      detail='A 1–2 detonates the keg. A 6 lets you pass it.';
      content=scalarTray(seat)+button('resolvePirateKeg','Resolve Powder Keg','class="primary"'); break;
    case 'pirateChoice': {
      const {kind,seat: chooser}=state.pirateChoice;
      const titles={coins:'Gain Cursed Doubloons',remove:'Shiver Me Timbers',plank:'Walk the Plank',discard:'Choose a card to discard',inspect:'Crow’s Nest!',yoHo:'Yo Ho!',ransom:'Ransom!',passKeg:'Powder Keg'};
      phase='Choice'; heading=titles[kind]; detail=`${actingName} chooses.`;
      if(kind==='inspect'){
        const cards=state.players[1-chooser].hand;
        detail=cards.length?'':'Opponent’s hand is empty.';
        content=cards.map(id=>previewCard(state,1-chooser,id,seatCard(state,1-chooser,id).name)).join('');
      }
      content+=cursedPirate.choices(state).map((label,i)=>{
        if(kind==='remove')label=tokenChoiceLabel(state,{key:'doubloon',label},chooser);
        const select=button('resolvePirateChoice',label,`data-choice="${i}"`);
        const card=state.players[chooser].hand[i];
        return kind==='discard'&&card!==undefined?previewableOption(state,chooser,card,select):select;
      }).join('');
      break;
    }
    case 'knockdown':
      phase='Knockdown';heading=allowed.begin?`${activeName} can roll`:`${activeName} has Knockdown`;
      content=allowed.begin?button('begin','Start Offensive Roll','class="primary"'):`${button('payKnockdown','Pay 2 CP and roll',allowed.payKnockdown?'class="primary"':'disabled')}${button('skipKnockdown','Skip Offensive Roll')}`;
      break;
    case 'combustion': {
      phase='Combustion';heading='Spend Fire Mastery';
      const max=Math.min(4,state.players[state.active].fireMastery??0);
      for(let count=1;count<=max;count++){
        addEffect('chooseMastery',`Spend ${count} Fire Mastery · ${count*p.combustRate} damage`,`data-amount="${count}"`);
      }
      content=button('chooseMastery','Continue without spending Fire Mastery','class="primary" data-amount="0"');
      break;
    }
    case 'pickpocket': {
      phase='Pickpocket';heading='Choose opponent CP loss';
      const max=Math.min(p.pickLimit,state.players[1-seat].cp);
      content=`<div class="controls">${Array.from({length:max+1},(_,i)=>button('chooseStolenCP',`${i} CP`,`data-amount="${i}"`)).join('')}</div>`;
      break;
    }
    case 'sneakOffer':
      phase='Attack modifier';heading='Sneak Attack';
      if(allowed.spendSneak)addEffect('spendSneak','Spend Sneak Attack');
      content=button('skipSneak','Continue without Sneak Attack','class="primary"');
      break;
    case 'sneakRoll':
      phase='Attack modifier';heading='Sneak Attack roll';
      content=scalarTray(seat)+button('resolveSneak','Add die value to damage','class="primary"');
      break;
    case 'dryadResponse':
      phase='Status response'; heading=`${actingName} can prevent an incoming status`;
      content=button('acceptStatuses','Apply ability effects','class="primary"');
      break;
    case 'spiritPayment':
      phase='Ability choice'; heading=pendingAbility;
      for(const [index,choice] of spiritDiscards(state.players[seat],p.spiritCost).entries()){
        if(spiritTotal(choice))addEffect('paySpirits',`Spend ${discardLabel(choice)}`,`data-choice="${index}"`);
        else content=button('paySpirits',discardLabel(choice),`class="primary" data-choice="${index}"`);
      }
      break;
    case 'overgrowthWells':
      phase='Ability choice'; heading=pendingAbility;
      if(state.players[seat].wellspring)addEffect('finishOvergrowth','Spend Wellspring for undefendable damage','data-choice="1"');
      content=button('finishOvergrowth','Continue with defendable damage','class="primary" data-choice="0"');
      break;
    case 'attackWells':
    case 'defenceWells':
      phase='Status choice'; heading='Give Wellspring';
      content=names.map((name,target)=>button('chooseWells',name,`data-target="${target}"`)).join('');
      break;
    case 'harvestWells':
      phase='Main Phase'; heading='Give Wellspring';
      content=['Neither player',...names,'Both players'].map((name,i)=>button('harvestWells',name,`data-choice="${i}"`)).join('');
      break;
    case 'ninjaGain':
      phase='Attack modifier'; heading=pendingAbility;
      detail=`Gain ${p.ninjaTokens} Ninjutsu. You may spend existing Ninjutsu first.`;
      content=button('finishNinjaGain','Gain Ninjutsu','class="primary"'); break;
    case 'ninjutsuRoll':
      phase='Attack modifier'; heading='Ninjutsu';
      content=scalarTray(seat)+button('resolveNinjutsu','Resolve Ninjutsu','class="primary"'); break;
    case 'ninjutsuChoice':
      phase='Attack modifier'; heading='Choose a Ninjutsu effect';
      content=scalarTray(seat)+ninjutsuOutcomes(state).map(status=>button('chooseNinjutsu',ninjutsuLabel(status),`data-status="${status}"`)).join(''); break;
    case 'sideDamage':
      phase=state.sideDamage.strangeSpell?'Spell damage':state.sideDamage.cosmicFlare?'Upkeep damage':state.sideDamage.endTurn?'End of turn':state.sideDamage.source==='Barbed Vine'?'End of Roll Phase':state.sideDamage.source==='Powder Keg'?'Powder Keg damage':'Main Phase damage';
      heading=state.sideDamage.source;
      detail=`${actingName} has ${sideIncoming(state.sideDamage)} incoming damage.${state.sideDamage.cosmicFlare?' This applies with the other damage at the end of Upkeep.':''}`;
      content=button('resolveSideDamage',state.sideDamage.cosmicFlare?'Confirm Cosmic Flare damage':'Resolve damage','class="primary"'); break;
    case 'paladinReward':
      phase='After damage'; heading='Offensive Stance';
      content=['crit','accuracy'].map(status=>button('choosePaladinReward',`Gain ${statusLabel(status)}`,`data-status="${status}"`)).join('');
      break;
    case 'monkChoice':
      phase='Status choice';heading=`${actingName} chooses a token`;
      detail=state.monkChoice.left>1?`Choose ${state.monkChoice.left} tokens, one at a time.`:'';
      content=`<div class="controls">${button('chooseMonkReward','Gain Evasive','data-status="evasive"')}${button('chooseMonkReward','Gain Cleanse','data-status="cleanse"')}</div>`;
      break;
    case 'effect': {
      phase='Ability roll'; heading=pendingAbility;
      const count=effectDiceCount(p,state.players[state.active]);
      detail=`${actingName} rolls ${count} separate effect ${count===1?'die':'dice'} to determine the ability’s effects.`;
      content=testBlankRoll('rollEffect',count,state.active)+button('rollEffect','Roll for effect','class="primary"'); break;
    }
    case 'effectResponse':
      if(p.effect==='thorChain'){
        phase='Chain Lightning';heading='Choose any two dice';detail=`Their total becomes the attack damage. The separate ${p.thor.chain} collateral damage resolves first.`;
        const dice=effectiveDice(p.effectDice,state.players[state.active]);
        content=chooseDiceTray({dice:p.effectDice,seat:state.active},'chooseThorChain',picks=>
          picks.size===2 ? `Confirm ${[...picks].reduce((total,i)=>total+dice[i],0)} damage` : 'Confirm selected dice', {
            count:2, choice:picks=>thor.chainPairs(dice.length).findIndex(pair=>pair.every(i=>picks.has(i)))
          });
        break;
      }
      phase='Ability roll'; heading=pendingAbility;
      detail='Modify the ability roll or resolve it.';
      const rerolls=[];
      if (allowed.abilityReroll) rerolls.push({type:'abilityReroll',limit:p.ninjaRerolls});
      if (storm.oppReroll(state,state.active)) rerolls.push({type:'stormOppReroll',limit:2,label:'Reroll with Charged Effect'});
      const roll = {dice:p.effectDice,seat:state.active};
      if(allowed.effectRetry){
        const retry = {type:'effectRetry',limit:1};
        if(p.tempestChi)stageEffects[seat].push(rerollTray(roll,[{...retry,label:'Spend 1 Chi to reroll selected die'}]));
        else rerolls.push(retry);
      }
      content=rerollTray(roll,rerolls)+button('resolveEffect','Resolve effect roll','class="primary"');
      break;
    case 'targeting':
      if (showdownPending(state)) {
        phase='Ability roll'; heading=pendingAbility;
        content=testBlankRoll('resolveTarget',2,state.active,[state.active,1-state.active])+
          button('resolveTarget','Roll both dice','class="primary"');
      } else {
        phase='Targeting'; heading=`${pendingAbility} targets ${names[1-seat]}`;
        content=button('resolveTarget','Apply ability effects','class="primary"');
      }
      break;
    case 'choice':
      phase='Ability choice'; heading=pendingAbility;
      content=p.ninjaTarget?names.map((name,target)=>button('chooseEffect',`Give Smoke Bomb and Ninjutsu to ${name}`,`data-target="${target}"`)).join('')
        :p.retributionTarget?names.map((name,target)=>button('chooseEffect',`Give Retribution to ${name}`,`data-target="${target}"`)).join('')
        :p.grantEvasive?names.map((name,target)=>button('chooseEffect',`Give Evasive to ${name}`,`data-target="${target}"`)).join('')
        :statusKeys.filter(k=>state.players[state.active][k]).map(k=>button('chooseEffect',
          tokenChoiceLabel(state,{key:k,label:`Remove ${statusLabel(k)}`},state.active),`data-status="${k}"`)).join('')+button('chooseEffect','Keep status effects');
      break;
    case 'preventStatus':
      phase='Defensive Roll'; heading=abilityName(defenceName(state,seat));
      detail='You may prevent one incoming status effect.';
      content=p.incomingStatus.map(k=>button('preventStatus',`Prevent ${statusLabel(k)}`,`data-status="${k}"`)).join('')+button('preventStatus','Continue without prevention');
      break;
    case 'postHit':
      phase='After damage'; heading=`${actingName} can play Head Bash!`;
      content=button('continueHit','Continue to Main Phase 2','class="primary"');break;
    case 'locked':
      phase=p.ultimate ? 'Ultimate damage' : 'Stunned defender';
      heading=`${activeName} resolves ${pendingAbility}`;
      detail=`${p.damage?`${p.damage} incoming damage. `:''}${names[1-state.active]} cannot respond.${vineDamage(state)?` Barbed Vine deals up to ${vineDamage(state)} to ${activeName}.`:''}`;
      content=(allowed.reopenPrey?button('reopenPrey','Use Prey'):'')+button('settle',footworkPending?'Apply Footwork bonus':p.damage?'Resolve damage':'Resolve ability','class="primary"'); break;
    case 'defenceResponse':
    case 'defence':
      phase='Defensive Roll'; heading=`${actingName} defends`;
      detail=`${pendingAbility} brings ${p.damage} incoming damage.`;
      if(state.stage==='defenceResponse'){
        const rerolls=[];
        if (allowed.abilityReroll) rerolls.push({type:'abilityReroll',limit:p.seraphDefenceReroll||p.ninjaDefenceRerolls});
        if (allowed.extraDefence) rerolls.push({type:'extraDefence',limit:state.defenceDice.length,label:'Reroll · additional Roll Attempt'});
        if (heroId(state,responding)===blackWidow.id&&blackWidow.count(state.players[responding])>=4&&!p.widowDefenceRerolled)
          rerolls.push({type:'widowDefenceReroll',limit:state.defenceDice.length,label:'Reroll with Sabotage'});
        content=effectRoll+rerollTray({dice:state.defenceDice,seat},rerolls);
        content+=button('resolveDefence','Resolve defence','class="primary"');
      } else {
        const kinds=defenceKinds(seat);
        const kind=selectedDefence ?? (kinds.length===1 ? kinds[0] : null);
        let dice='', options='';
        if(allowed.defend && kind){
          const defender=heroRoster[heroId(state,seat)];
          dice=defender.id===gunslinger.id ? testBlankRoll('defend',2,seat,[state.active,seat])
            : testBlankRoll('defend',defender.defenceDiceCount(state.players[seat],kind),seat);
          options=button('defend',`Roll ${abilityName(defenceName(state,seat,kind))}`,`class="primary" data-defence="${kind}"`);
          if(kinds.length>1)options+=button('change-defence','Change defence');
        }else if(allowed.defend){
          heading=`${actingName} chooses a defence`;
          options=kinds.map(option=>button('choose-defence',`Choose ${abilityName(defenceName(state,seat,option))}`,
            `data-defence="${option}"`)).join('');
        }
        content=effectRoll+dice+`<div class="controls">${options}
          ${button('skipDefence',allowed.defend?'Decline defence':'Continue with Shadows')}</div>`;
      } break;
    case 'nyraDamage': {
      phase='Damage assignment'; heading='Huntress and Nyra';
      const total=nyraIncoming(state), companion=state.players[seat];
      detail=`Assign ${total} incoming damage. Nyra has ${companion.nyra.hp} Health${p.nyraDefenceHeal?` and ${p.nyraDefenceHeal} defence healing pending`:''}.`;
      content=`<div class="controls">${button('settle',`Huntress takes all ${total}`,'data-amount="0"')}
        ${button('settle',`Nyra takes all ${total}`,`data-amount="${total}"`)}</div>`;
      if(companion.nyraBond&&total>1)stageEffects[seat].push(`<div class="controls"><label>Damage to Nyra
        <select id="nyra-damage">${Array.from({length:total-1},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select></label>
        ${button('settle','Spend Nyra’s Bond to split damage','data-nyra-split="true"')}</div>`);
      break;
    }
    case 'damage':
      phase='Damage response'; heading=`${actingName} responds`;
      detail=`${pendingAbility ? `${pendingAbility} · ` : ''}${incomingDamage(state)} incoming damage${shadowAvoids(state)&&p.damage?' after Shadows':p.pure?' (pure)':p.undefendable?' (undefendable)':''}${returnDamageFor(state) ? ` · ${returnDamageFor(state)} return damage` : ''}.${p.recoil && incomingDamage(state) ? ` Barbarian takes ${p.recoil} recoil damage if this attack hits.` : ''}`;
      content=(state.defenceDice.length ? tray(state.defenceDice,seat,false):'')
        +`<div class="controls">${allowed.reopenPrey?button('reopenPrey','Use Prey'):''}${button('settle',footworkPending?'Apply Footwork bonus':nyraIncoming(state)?'Assign damage':'Resolve damage','class="primary"')}</div>`; break;
    case 'evasion':
      phase='Avoid damage'; heading=tokenRollLabel(state.evasionToken??'evasive');
      detail=state.evasionToken==='smoke'?'A 1–3 avoids the incoming damage.':'A 1 or 2 avoids the incoming damage.';
      content=scalarTray(seat)+button('resolveEvade','Resolve roll','class="primary"'); break;
    case 'spiderAfter':
      phase='After damage';heading='Finish Ensnare';detail='The new Webbed token and its isolated damage have resolved.';content=button('finishSpiderAfter','Conclude the Roll Phase','class="primary"');break;
    case 'deadpoolAbility':
      phase='Deadpool';heading=pendingAbility;content=button('finishDeadpoolAbility','Resolve Deadpool’s printed effects','class="primary"');break;
    case 'deadpoolPrepared':
      phase='Deadpool';heading='Continue the activated ability';content=button('finishDeadpoolPrepared','Continue ability','class="primary"');break;
    case 'deadpoolResolved':
      phase='Deadpool';heading='Finish the ability’s effect roll';content=button('finishDeadpoolResolved','Continue ability','class="primary"');break;
    case 'santaAbility':
      phase='Santa';heading='Resolve Santa’s printed effects';content=button('finishSantaAbility','Continue Santa’s ability','class="primary"');break;
    case 'santaTarget':
      phase=p.santa.contest?'Fireside Chat':'Naughty or Nice';heading=`Target ${names[1-state.active]}`;
      detail=p.santa.contest?'The opponent is targeted before the subsidiary dice are rolled.':naughtyOrNiceDetail;
      content=testBlankRoll('rollSantaAbility',p.santa.contest?2:1,state.active,p.santa.contest?[state.active,1-state.active]:undefined)+button('rollSantaAbility',p.santa.contest?'Roll both dice':'Roll die','class="primary"');break;
    case 'santaPrepared':
      phase='Santa';heading='Continue the activated ability';content=button('finishSantaPrepared','Continue ability','class="primary"');break;
    case 'santaExtraRoll':
      phase='Comfort and Joy!';heading='Additional Offensive Roll Phase';detail='Target the same opponent again. Income is not repeated; effects that expire at the end of the previous Roll Phase have cleared.';content=button('startSantaRoll','Start the additional Roll Phase','class="primary"');break;
    case 'mysticAbility':
      phase='Mystic Brawler';heading=pendingAbility;content=button('finishMysticAbility','Resolve ability effects','class="primary"');break;
    case 'mysticStrongTarget':
      phase='Targeting · Strong Arm';heading=`Strong Arm targets ${names[1-state.active]}`;detail='Both players roll one die after targeting.';content=testBlankRoll('rollMysticContest',2,state.active,[state.active,1-state.active])+button('rollMysticContest','Roll both dice','class="primary"');break;
    case 'mysticPrepared':
      phase='Mystic Brawler';heading=pendingAbility;content=button('finishMysticPrepared','Continue ability','class="primary"');break;
    case 'mysticResolved':
      phase='Mystic Brawler';heading=pendingAbility;content=button('finishMysticResolved','Continue after the effect roll','class="primary"');break;
    case 'krampusAbility':
      phase='Krampus';heading=pendingAbility;content=button('finishKrampusAbility','Resolve ability effects','class="primary"');break;
    case 'krampusPrepared':
      phase='Krampus';heading=pendingAbility;content=button('finishKrampusPrepared','Continue ability','class="primary"');break;
    case 'krampusResolved':
      phase='Krampus';heading=pendingAbility;content=button('finishKrampusResolved','Continue after the effect roll','class="primary"');break;
    case 'alchemistDefence':
      phase='Defensive Potions · attacker priority';heading=`${activeName} may respond`;detail='The defence attachments have resolved. The attacker may use legal effects before Alchemist spends these Potions.';content=button('alchemistDefenceReady','Continue to defensive Potions','class="primary"');break;
    case 'alchemistAbility':
      phase='Alchemist';heading=pendingAbility;detail='Resolve the printed attachments and other effects before spending Potions.';content=button('finishAlchemistAbility','Resolve ability effects','class="primary"');break;
    case 'alchemistPotions':
      phase=state.alchemistSpend.defensive?'Defensive Potions':'End of Offensive Roll Phase';heading='Spend attached Potions';detail='Spend eligible Potions, or keep them for later. Potions removed for The Lab or a card do not activate their effects.';
      for(const [index,choice] of alchemist.spendChoices(state,responding).entries()){
        addEffect('spendPotion',tokenChoiceLabel(state,{key:choice.key,label:choice.label},responding),`data-choice="${index}"`,responding);
      }
      content=button('finishAlchemistPotions','Finish spending Potions','class="primary"');break;
    case 'wolverineAbility':
      phase='Wolverine';heading=pendingAbility;detail='Resolve healing, card draws and Rage before the Attack continues.';content=button('finishWolverineAbility','Continue ability','class="primary"');break;
    case 'wolverineResolved':
      phase='Wolverine';heading=pendingAbility;content=button('finishWolverineResolved','Continue after the effect roll','class="primary"');break;
    case 'wolverineBarrage':
      phase='Barrage';heading='Choose the benefit';content=button('wolverineBarrage','Gain Rage','data-status="rage"')+button('wolverineBarrage','Inflict Alpha','data-status="alpha"');break;
    case 'wolverineSevere':
      phase='Severe Threat II';heading='Mask result';content=button('wolverineSevere','Gain Rage','data-status="rage"')+button('wolverineSevere','Add 3 damage','data-status="damage"');break;
    case 'wolverineRemove':
      phase='Regenerate';heading='Optional status removal';content=wolverine.removalChoices(state).map((choice,i)=>
        button('wolverineRemove',tokenChoiceLabel(state,{...choice,label:`Remove ${choice.label}`},state.active),`data-choice="${i}"`)).join('')+
        button('wolverineRemove','Keep current status effects','data-choice="-1"');break;
    case 'stormCharge':
      phase='Charged Effect';heading=pendingAbility;detail='The ability was Charged before activation. Remove its Lightning for the Charged Effect, or keep it.';
      addEffect('stormUseCharge','Remove Lightning · use Charged Effect');
      content=button('stormKeepCharge','Keep the Lightning','class="primary"');break;
    case 'stormAbility':
      phase='Storm';heading=pendingAbility;detail='Resolve the ability’s printed effects. Lightning Strike! can activate an eligible uncharged ability’s Charged Effect now.';content=button('finishStormAbility','Continue ability','class="primary"');break;
    case 'stormResolved':
      phase='Storm';heading=pendingAbility;content=button('finishStormResolved','Continue after Lightning placements','class="primary"');break;
    case 'rogueAbility':
      phase='Rogue';heading=pendingAbility;content=button('finishRogueAbility','Continue ability','class="primary"');break;
    case 'psyAbility':
      phase='Psylocke';heading=pendingAbility;content=button('finishPsyAbility','Continue ability','class="primary"');break;
    case 'paralyzeAfter':
      phase='Paralyze · ability effects';heading=pendingAbility;detail='Paralyze prevented the status gains. Eligible responses such as Forced! may be played before concluding the Roll Phase.';content=button('finishParalyze','Conclude the Roll Phase','class="primary"');break;
    case 'jeanAbility':
      phase='Jean Grey';heading=pendingAbility;detail='The activation bonus and initial gains have resolved.';content=button('finishJeanAbility','Continue ability','class="primary"');break;
    case 'jeanResolved':
      phase='Jean Grey';heading=pendingAbility;content=button('finishJeanResolved','Continue after the effect roll','class="primary"');break;
    case 'iceAbility':
      phase='Iceman';heading=pendingAbility;content=button('finishIcemanAbility','Continue ability','class="primary"');break;
    case 'iceResolved':
      phase='Iceman';heading=pendingAbility;content=button('finishIcemanResolved','Continue after the effect roll','class="primary"');break;
    case 'iceAfter':
      phase='After damage';heading='Frostbite · conclude the Roll Phase';content=button('finishIcemanAfter','Continue to the end of the Roll Phase','class="primary"');break;
    case 'iceGlideOffer':
      phase='End of Roll Phase';heading=`Glide Path · ${pendingAbility} → ${abilityName(p.iceman.path)}`;
      detail='Spend Glide to activate the connected primary ability against the same opponent. You may gain or transfer Glide now using an eligible effect. Glide can only be spent once per turn.';
      if(allowed.spendGlide)addEffect('spendGlide','Spend Glide · activate the connected ability');
      content=button('skipGlide','Continue to Main Phase 2','class="primary"');break;
    case 'iceGlideReady':
      phase='Glide · new Roll Phase';heading=abilityName(state.iceGlideTarget);detail='No dice objective is required. Normal activation, targeting and defence rules still apply.';
      content=button('activateIcemanGlide','Activate the connected ability','class="primary"');break;
    case 'gambitAbility':
      phase='Gambit';heading=pendingAbility;detail='Acceleration and other selected effects have resolved. You may explode a fully charged Ace before continuing, if this ability is an attack.';
      content=button('finishGambitAbility','Continue ability','class="primary"');break;
    case 'cyclopsAbility':
      phase='Cyclops';heading=pendingAbility;detail=`${cyclops.count(state,state.active)} Leadership card(s) played this turn.`;
      content=button('finishCyclopsAbility','Continue ability','class="primary"');break;
    case 'thorAbility':
      phase='Thor';heading=pendingAbility;detail='The hammer movements and status gains have resolved.';
      content=button('finishThorAbility','Continue ability','class="primary"');break;
    case 'spiderCombo':
      phase='Combo';heading=`${activeName} may attack again`;detail='Spend Combo for another Offensive Roll Phase against the same opponent. No Income or Main Phase occurs between these rolls. Combo can only be spent once per turn.';
      if(allowed.spendCombo)addEffect('spendCombo','Spend Combo · start another Offensive Roll Phase');
      content=button('skipCombo','Continue to Main Phase 2','class="primary"');break;
    case 'scarletAbility':
      phase='Scarlet Witch';heading=pendingAbility;content=button('finishScarletAbility','Continue ability','class="primary"');break;
    case 'lokiAbility':
      phase='Loki';heading=pendingAbility;content=button('finishLokiAbility','Continue ability','class="primary"');break;
    case 'strangeAbility':
      phase='Ability';heading=pendingAbility;content=button('finishStrangeAbility','Continue ability','class="primary"');break;
    case 'widowAbility':
      phase='Black Widow';heading='Finish resolving the ability';
      content=button('finishWidowAbility','Continue ability','class="primary"');break;
    case 'main1':
      phase='Main Phase 1'; heading=`${actingName} can play or sell cards`;
      content=incomeSummary(state.income)+button('begin','Start Offensive Roll','class="primary"');break;
    case 'discard':
      phase='Discard Phase'; heading=`${actingName} finishes the turn`;
      detail=allowed.next?'You have six or fewer cards.':'Sell cards until you have six or fewer.';
      content=button('next',`Start ${names[1-seat]}’s turn`,`class="primary" ${allowed.next?'':'disabled'}`);break;
    case 'main':
      if(state.cards){
        phase='Main Phase 2'; heading=`${actingName} can play or sell cards`;
        content=button('endMain','Go to Discard Phase','class="primary"');break;
      }
      phase='End of Roll Phase'; heading=`${activeName} finishes the turn`;
      detail=state.log[0];
      content=button('next',`Start ${names[1-seat]}’s turn`,'class="primary"'); break;
    default:
      phase='Match complete'; heading=state.winner; detail=state.log[1] ?? '';
  }
  if(allowed.evade&&incomingDamage(state)>0)addEffect('evade','Spend Evasive','',1-state.active);
  if(allowed.evadeReturn)addEffect('evadeReturn','Spend Evasive · avoid return damage','',state.active);
  if(allowed.evadeUpkeep)addEffect('evadeUpkeep','Spend Evasive','',state.active);
  if(spiderMan.canSenseReroll(state,responding)){
    stageEffects[responding].push(rerollTray({dice:state.defenceDice,seat:responding},
      [{type:'spiderSenseReroll',limit:state.defenceDice.length,label:'Reroll with Spider-Sense · discard Invisibility'}]));
  }

  const effects = stageEffects[responding].join('') + matchEffects(state, responding);
  const otherSeat = 1-responding;
  const inlineEffects = inlineEffectSeat(state)===otherSeat ? matchEffects(effectPriorityView(state,otherSeat),otherSeat,
    (action, label, attrs = '') => button(action,label,`data-effect-seat="${otherSeat}" ${attrs}`)) : '';
  const otherEffects = stageEffects[otherSeat].join('') + inlineEffects;
  const otherEffectsTitle = allowed.defend && otherSeat === state.active
    ? `${activeName} · effects before the defence roll` : `Available effects · ${names[otherSeat]}`;
  const playing = state.stage !== 'finished';
  const decisionName = names[decisionSeat];
  const tokenRoll = testRoll ? testRoll.token : preparedToken ?? currentTokenRoll(state,allowed);
  const recentTokenResult = !testRoll && lastTokenResult?.next === state
    ? tokenRollReference(lastTokenResult.token) + rollResultTray(lastTokenResult) : '';
  if (testRoll?.token) heading = tokenRollLabel(testRoll.token.token);
  return `<section class="arena" aria-label="Match actions">
    <div class="phase"><span>Turn ${state.turn} · ${phase}</span><span>${state.stage==='offence' ? `Roll ${state.attempts}/${state.budget}` : ''}</span></div>
    ${playing?`<div class="decision-owner" data-player="${decisionSeat}">
      <strong>${decisionName} to act</strong>
      ${decisionSeat!==state.active?`<span>${activeName}’s turn</span>`:''}
    </div>`:''}
    <h2 tabindex="-1" id="action-title">${heading}</h2>
    ${detail&&!testRoll?.token?`<p>${detail}</p>`:''}
    ${preparedToken&&state.stage==='announce'&&state.dice.length ? tray(state.dice,state.active,false) : ''}
    ${effects?`<details class="match-effects" data-disclosure="effects-${state.stage}-${responding}" ${!content?'open':''}><summary>Available effects · ${names[responding]}</summary><div class="effect-options">${effects}</div></details>`:''}
    ${otherEffects?`<details class="match-effects" data-disclosure="effects-${state.stage}-${otherSeat}"><summary>${otherEffectsTitle}</summary><div class="effect-options">${otherEffects}</div></details>`:''}
    ${tokenRollReference(tokenRoll,heading) ||
      cardRollReference(testRoll?.card ?? (testRoll && rollCardSource(testRoll.action)) ?? state.cardRoll,heading) ||
      defenceReference()+effectAbilityReference(heading)}
    ${p?.paralyzePrevented?.length?`<p>Paralyze prevented: ${p.paralyzePrevented.map(statusLabel).join(', ')}.</p>`:''}
    <div class="decision-actions">${recentTokenResult}${testRoll ? testRollControls(testRoll) : content}</div>
    <details class="action-log" data-disclosure="action-log"><summary>Action log</summary><ol reversed>${state.log.slice(0,35).map(event=>`<li>${event}</li>`).join('')}</ol></details>
    ${matchTools(responding)}
    </section>`;
}

function matchEffects(state, responding, renderButton = button) {
  function pickDice(type, title, choices, {mode = 'reroll', context = rollContext(state), byIndex = false} = {}) {
    if (!context) return '';
    const options = choices.flatMap((choice, choiceIndex) => Number.isInteger(choice.index) ? [{
      choiceIndex, confirm:choice.confirm,
      dice:[[choice.index, mode==='change' ? choice.to : null]],
      action:byIndex ? {type,index:choice.index} : {type,choice:choice.choice ?? choiceIndex}
    }] : []);
    if (!options.length) return '';
    const index = effectDicePlans.push({context,mode,seat:responding,limit:1,options,title})-1;
    return renderButton('open-effect-dice',title,`data-index="${index}"`);
  }
  const dieChoices = dice => dice?.map((_,index)=>({index})) ?? [];
  let content = '';
  if(!state.psyReveal){
  const onomatopoeia = deadpool.onomChoices(state,responding);
  if(onomatopoeia.length){
    const title = state.players[responding].curmudgeon ? 'Spend Onomatopoeia' : 'Say a sound · spend Onomatopoeia';
    content+=pickDice('spendOnomatopoeia',title,onomatopoeia,{mode:'change',context:rollContext(deadpool.view(state))});
  }
  if(deadpool.canRps(state,responding))content+=renderButton('spendRps','Spend RPS · play Rock, Paper, Scissors');
  if(deadpool.canDonut(state,responding))content+=renderButton('spendDonut','Spend Donut · roll for healing');
  const cheer = santa.cheerChoices(state,responding).map((choice,index)=>({...choice,choice:index}));
  for(const {kind,ctx:context} of cheer.length ? santa.contexts(state) : []){
    const available = cheer.filter(choice=>choice.kind===kind);
    const target = kind==='board'?'a board die':'a die';
    content+=pickDice('spendCheer',`Spend Cheer · reroll ${target}`,available.filter(choice=>!choice.value),{context});
    content+=pickDice('spendCheer',`Spend 3 Cheer · set ${target} to 6`,available.filter(choice=>choice.value),{context,mode:'target'});
  }
  if(santa.canNog(state,responding))content+=renderButton('spendEggNog','Spend 3 Egg Nog · roll for a benefit');
  for(const n of mysticBrawler.oceanChoices(state,responding))content+=renderButton('spendOcean',n===1?'Spend 1 Ocean · gain 1 CP':'Spend 2 Ocean · gain 1 CP and heal 2',`data-amount="${n}"`);
  if(krampus.canGift(state,responding))content+=renderButton('spendGift','Spend Gift · draw 1 Reject');
  if(!(state.krampusTask&&state.stage==='krampusChoices'&&state.krampusTask.queue[0]?.kind==='free'))for(const [i,c] of krampus.options(state,responding).entries())content+=renderButton('activateReject',c.label,`data-choice="${i}"`);
  const lab=alchemist.labChoices(state,responding);
  if(lab.length){
    const potions=new Map(alchemist.tokens(state,responding).map(token=>[token.id,token]));
    for(const choice of lab)choice.confirm=`Remove ${alchemist.tokenLabel(potions.get(choice.tokenId))} and reroll`;
  }
  content+=pickDice('alchemistLab','The Lab · remove a Potion and reroll',lab);
  for(const [i,c] of wolverine.rageChoices(state,responding).entries())content+=renderButton('spendRage',c.label,`data-choice="${i}"`);
  }
  if(!state.deadpoolRps&&!(state.deadpoolTask&&state.stage==='deadpoolChoices')&&!state.santaGift&&!(state.santaTask&&state.stage==='santaChoices')&&!(state.mysticTask&&state.stage==='mysticChoices')&&!state.krampusActivation&&state.krampusOverflow===undefined&&!(state.krampusTask&&state.stage==='krampusChoices')&&!(state.alchemistTask&&state.stage==='alchemistChoices')&&!state.psyReveal&&!state.wolverineGain&&!state.wolverineIntimidate&&!(state.stormTask&&state.stage==='stormChoices')){
  if(storm.canTornado(state,responding))content+=renderButton('spendTornado',`Spend Tornado · borrow one opposing die (${state.stormDice?.count??0}/5 borrowed)`);
  if(storm.canWind(state,responding))content+=renderButton('spendWindShear',state.players[responding].ragingWindsTurn===state.turn?'Spend Wind Shear · prevent 4 and deal 4 isolated damage':'Spend Wind Shear · prevent 2 and deal 2 isolated damage');
  for(const c of rogue.ionicChoices(state,responding))content+=renderButton('spendIonic',c.label,`data-status="${c.key}"`);
  if(rogue.canExpand(state,responding))content+=renderButton('expandIonic','Pay 1 CP · allow four Ionic tokens this turn');
  if(rogue.canSkyward(state,responding))content+=renderButton('spendSkyward','Spend Skyward · both players roll');
  if(rogue.boostLeach(state,responding))content+=renderButton('rogueLeachBoost','Pay 1 CP · add 1 to Leach die');
  }
  if(!state.deadpoolRps&&!(state.deadpoolTask&&state.stage==='deadpoolChoices')&&!state.santaGift&&!(state.santaTask&&state.stage==='santaChoices')&&!(state.mysticTask&&state.stage==='mysticChoices')&&!state.krampusActivation&&state.krampusOverflow===undefined&&!(state.krampusTask&&state.stage==='krampusChoices')&&!(state.alchemistTask&&state.stage==='alchemistChoices')&&!state.psyReveal&&!state.wolverineGain&&!state.wolverineIntimidate&&!state.rogueGain&&!(state.stormTask&&state.stage==='stormChoices')){
  const manifest = psylocke.swaps(state,responding);
  if(manifest.length)content+=pickDice('manifestSwap',`Use Manifest ${state.players[responding].manifestDie} · replace a die`,
    manifest,{mode:'target',byIndex:true,context:{dice:state.dice,seat:responding}});
  if(psylocke.canBoost(state,responding))content+=renderButton('manifestBoost',`Use Manifest ${state.players[responding].manifestDie} · add ${Math.ceil(dieValue(state.players[responding].manifestDie,state.players[responding])/2)} attack damage`);
  content+=pickDice('spendInfiltration','Spend Infiltration · reroll a defence die',psylocke.infiltrationChoices(state,responding));
  const acuity = jeanGrey.acuityChoices(state,responding);
  content+=pickDice('spendAcuity','Spend 1 Acuity · reroll a die',acuity);
  for(const [i,c] of acuity.entries())if(c.kind!=='reroll')content+=renderButton('spendAcuity',c.label,`data-choice="${i}"`);
  for(const [i,c] of jeanGrey.flameChoices(state,responding).entries())content+=renderButton('spendFlameBlast',c.label,`data-choice="${i}"`);
  for(const [i,c] of jeanGrey.fieldChoices(state,responding).entries())content+=renderButton('spendForceField',c.label,`data-choice="${i}"`);
  if(!state.iceFreezeChoice&&iceman.canConvert(state,responding))content+=renderButton('iceConvert','Spend 5 board Ice Shards · gain Glide');
  if(!state.iceFreezeChoice&&iceman.canFreezerConvert(state,responding))content+=renderButton('iceFreezerConvert','Convert 5 stored Ice Shards into stored Glide');
  const explode=gambit.canExplode(state,responding),dissolve=gambit.dissolveChoices(state,responding);
  if(explode.length)content+=`<div class="token-actions"><strong>Explode one Ace · Attack Modifier</strong><div class="controls">${explode.map(suit=>renderButton('gambitExplode',`Explode ${statusLabel(suit)}`,`data-status="${suit}"`)).join('')}</div></div>`;
  if(dissolve.length)content+=`<details class="token-actions"><summary>Spend Dissolution</summary><div class="controls">${dissolve.map((choice,i)=>renderButton('spendDissolution',choice.label,`data-choice="${i}"`)).join('')}</div></details>`;
  const support=state.iceFreezeChoice||gambit.forced(state)?[]:cyclops.supportChoices(state,responding),battlePlan=state.iceFreezeChoice||gambit.forced(state)?[]:cyclops.battleChoices(state,responding);
  if(support.length)content+=`<details class="token-actions"><summary>${names[responding]} · spend Support</summary><div class="controls">
    ${pickDice('spendSupport','Spend Support · reroll a die',support)}
    ${support.map((choice,i)=>choice.kind==='reroll'?'':renderButton('spendSupport',choice.label,`data-choice="${i}"`)).join('')}
    </div></details>`;
  if(battlePlan.length)content+=`<details class="token-actions"><summary>${names[responding]} · spend Battle Plan</summary><div class="controls">${battlePlan.map((choice,i)=>renderButton('spendBattlePlan',choice.label,`data-choice="${i}"`)).join('')}</div></details>`;
  if(cyclops.canRecourse(state,responding))content+=renderButton('cyclopsRecourse','Remove 2 Battle Plan · activate Recourse II against this undefendable attack');
  if(thor.canDraw(state,responding)&&!state.thorOverflow)content+=renderButton('thorDraw','Spend 4 Electrokinesis · draw a card');
  if(thor.canMove(state,responding))content+=`<details class="token-actions"><summary>Mjölnir · discard a card to ${thor.holder(state,responding)===responding?'throw':'retrieve'}</summary><div class="controls">${state.players[responding].hand.map((id,i)=>previewableOption(state,responding,id,renderButton('thorPassive',`Discard ${seatCard(state,responding,id).name}`,`data-index="${i}"`))).join('')}</div></details>`;
  if(!state.iceFreezeChoice&&!gambit.forced(state)&&!cyclops.choosing(state)&&!state.thorOverflow&&!(state.thorTask&&state.stage==='thorSequence')&&!state.conjureTask&&!state.lokiTask&&!state.lokiIllusion&&state.lokiBag?.kind!=='choose'){
  content+=pickDice('spendProbability','Spend Probability Manipulation · change a die',
    scarletWitch.probabilityChoices(state,responding),{mode:'change'});
  content+=pickDice('scarletDefenceChange','Double Trouble II · change a die',
    scarletWitch.defenceChanges(state,responding),{mode:'change',context:{dice:state.defenceDice,seat:responding}});
  if(scarletWitch.canCrackle(state,responding))content+=renderButton('spendCrackle',`Spend Crackle · +${Math.min(3,Math.max(0,scarletWitch.countedStatuses(state.players[responding])-1))} damage`);
  const conjure=scarletWitch.conjureChoices(state,responding);
  if(conjure.length)content+=`<details class="token-actions"><summary>Spend Conjure</summary><div class="controls">${conjure.map((choice,i)=>renderButton('spendConjure',choice.label,`data-choice="${i}"`)).join('')}</div></details>`;
  if(!state.response||state.response.seat===state.active){
    if(sunElf.canGem(state,state.active))content+=renderButton('spendChargedGem','Spend Charged Gem');
    const player=state.players[state.active];
    if(sunElf.canDawn(state,state.active))content+=renderButton('spendSunDawn',`Use Dawn · +${player.sunDial} damage`);
  }
  if(spiderMan.canInvisibility(state,responding))content+=renderButton('spendInvisibility','Spend Invisibility · activate a Defensive Ability');
  if(loki.canIllusion(state,responding))content+=renderButton('spendIllusion',`${names[responding]} · spend Illusion`);
  if(doctorStrange.canPrepare(state,state.active))content+=`<div class="token-actions"><strong>Book of Vishanti · prepare once per turn</strong><div class="controls">${state.players[state.active].hand.filter(doctorStrange.isSpell).map(id=>previewableOption(state,state.active,id,renderButton('prepareSpell',`Prepare ${doctorStrange.spells[id]}`,`data-index="${id}"`))).join('')}</div></div>`;
  if((responding===state.active||!state.response||state.response.action)&&doctorStrange.canDeja(state,state.active))content+=renderButton('spendDejaVu',`${names[state.active]} · spend Déjà Vu and restart the roll`);
  if(captainMarvel.canRay(state,responding))content+=renderButton('spendCosmicRay','Spend Cosmic Ray · roll 2 dice');
  content+=pickDice('spendRadiance','Spend Radiance · set a defence die to 6',
    captainMarvel.radianceDice(state,responding),{mode:'target',byIndex:true});
  if(blackWidow.canCovert(state,responding))content+=renderButton('spendCovertOps','Spend Covert Ops');
  if(state.players[responding].agility&&blackWidow.incoming(state,responding))content+=renderButton('spendAgility','Spend Agility · roll to prevent half damage');
  if(state.players[responding].vibraniumSuit&&blackPanther.incoming(state,responding))
    content+=renderButton('spendVibraniumSuit','Spend Vibranium Suit · prevent 3 damage');
  const forge = forgemaster.choices(state,responding).map((choice,i)=>({...choice,choice:i}));
  const forgeActions=forge.filter(choice=>choice.index===undefined).map(({label,card,choice})=>{
    const select=renderButton('forgemasterAction',label,`data-choice="${choice}"`);
    return card===undefined?select:previewableOption(state,responding,card,select);
  });
  for(const kind of ['reroll','six']){
    const choices = forge.filter(choice=>choice.kind===kind);
    for(const card of new Set(choices.map(choice=>choice.card))){
      const ore = seatCard(state,responding,card).name;
      const title = `Scrap ${ore} · ${kind==='reroll'?'reroll a die':'set a die to 6'}`;
      const select = pickDice('forgemasterAction',title,choices.filter(choice=>choice.card===card),
        {mode:kind==='reroll'?'reroll':'target'});
      if(select)forgeActions.push(previewableOption(state,responding,card,select));
    }
  }
  if(forgeActions.length)content+=`<div class="token-actions"><strong>${names[responding]} · The Mines and The Forge</strong><div class="controls">${forgeActions.join('')}</div></div>`;
  const shapeSeats=state.stage==='announce'&&!state.response&&inlineEffectSeat(state)===null?[responding,state.active]:[responding];
  for(const owner of shapeSeats){
    const options=druid.shiftChoices(state,owner);
    if(options.length)content+=`<div class="token-actions"><strong>${names[owner]} · Shape Shift</strong><div class="controls">${options.map(form=>
      renderButton('spendShapeShift',`Shift to ${druid.formName(form)} Form`,`data-target="${owner}" data-status="${form}"`)).join('')}</div></div>`;
  }
  const featherSeats=state.nevermoreRoll&&!state.response&&inlineEffectSeat(state)===null?[state.nevermoreRoll.owner,state.nevermoreRoll.target]:[responding];
  for(const owner of featherSeats){
    const options=raveness.featherChoices(state,owner);
    if(options.length)content+=`<div class="token-actions"><strong>${names[owner]} · spend Feathers</strong><div class="controls">${options.map(option=>
      renderButton('spendFeather',`${option.cost} Feather · ${option.label}`,`data-target="${owner}" data-status="${option.kind}"`)).join('')}</div></div>`;
  }
  const tokens=tokenChoices(state,responding);
  const tactical = tacticalChoices(state,responding);
  const tacticalActions=tactical.map((choice,index)=>{
    if(choice.kind==='reroll')return '';
    const label = `${choice.cost} Tactical Advantage · ${choice.label}`;
    return renderButton('spendTactical',choice.status==='timeBomb'
      ? tokenChoiceLabel(state,{...choice,label},choice.from) : label,`data-choice="${index}"`);
  }).filter(Boolean);
  const tacticalReroll = pickDice('spendTactical','Spend 1 Tactical Advantage · reroll a die',tactical);
  if(tacticalReroll)tacticalActions.push(tacticalReroll);
  const grimActions=grimChoices(state,responding).map(kind=>renderButton('spendGrim',
    kind==='attempt'?'Grim Pursuit · extra Roll Attempt':'Grim Pursuit · roll for attack damage',`data-status="${kind}"`));
  const tokenActions=state.grimOverflow?grimActions:state.stage==='nyraDamage'?[]:state.tacticalOverflow||state.tacticalRemoval?tacticalActions:[
    ...tacticalActions,
    ...grimActions,
    ...necroActions(state,responding).map(({kind,label})=>renderButton('necroAction',label,`data-status="${kind}"`)),
    ...(canHealNyra(state,responding)?[renderButton('healNyra','Nyra’s Bond · heal Nyra by 2')]:[]),
    pickDice('nyraReroll','Nyra takes 1 damage · reroll a die',dieChoices(nyraRerolls(state,responding)),{byIndex:true}),
    ...artificerActions(state,responding).map(({key,label})=>renderButton('artificerAction',label,`data-status="${key}"`)),
    ...(canBackStrike(state,responding)?[renderButton('backStrike','Spend Back Strike')]:[]),
    ...Array.from({length:honorChoices(state,responding)},(_,i)=>renderButton('spendHonor',
      `Spend ${i+1} Honor · +${i===0?1:3} damage`,`data-amount="${i+1}"`)),
    ...(canReload(state,responding)?[renderButton('spendReload','Spend Reload')]:[]),
    ...(canMesmerize(state,responding)?[renderButton('mesmerize','Spend Mesmerize')]:[]),
    ...bloodPowerChoices(state,responding).map(({cost,label},index)=>
      renderButton('bloodPower',`${cost} Blood Power · ${label}`,`data-choice="${index}"`)),
    ...(tokens.flight?[renderButton('flight',tokens.flight==='attack'?'Flight · make the attack undefendable':'Flight · avoid incoming damage')]:[]),
    pickDice('seedling','Spend Seedling · reroll a die',dieChoices(tokens.seedling),{byIndex:true}),
    ...(tokens.sapling?[renderButton('sapling','Sapling · heal 1 and gain 1 CP')]:[]),
    ...(tokens.saplingDraw?[renderButton('saplingDraw','Sapling · draw for 1 CP')]:[]),
    ...(tokens.dryad?[renderButton('dryad','Dryad · add 3 damage')]:[]),
    ...tokens.dryadPrevent.map(status=>renderButton('dryadPrevent',`Dryad · prevent ${statusLabel(status)}`,`data-status="${status}"`)),
    ...(tokens.wellspring?[renderButton('wellspring','Spend Wellspring')]:[]),
    ...(tokens.smoke?[renderButton('smoke','Spend Smoke Bomb')]:[]),
    ...(tokens.ninjutsu?[renderButton('ninjutsu','Spend Ninjutsu')]:[]),
    ...(tokens.evadeSide?[renderButton('evadeSide','Spend Evasive')]:[]),
    ...paladinBuffs.filter(key=>tokens[key]).map(key=>renderButton(key,`Spend ${statusLabel(key)}`)),
    ...tokens.cleanse.flatMap(status=>status==='spellbound'?(state.players[responding].boundAbilities??[]).map(b=>renderButton('useCleanse',`Cleanse Spellbound · ${b.key}`,`data-status="spellbound" data-index="${b.id}"`)):status==='bagOfTricks'?(state.players[responding].trickBags??[]).map(b=>renderButton('useCleanse',`Cleanse Bag of Tricks from ${names[b.owner]}`,`data-status="bagOfTricks" data-index="${b.id}"`)):status==='timeBomb'?(state.players[responding].timeBombTimers??[]).map(b=>renderButton('useCleanse',tokenChoiceLabel(state,{key:'timeBomb',bombId:b.id,label:`Cleanse Time Bomb 0:0${b.ticks}`},responding),`data-status="timeBomb" data-index="${b.id}"`)):[renderButton('useCleanse',`Cleanse ${statusLabel(status)}`,`data-status="${status}"`)]),
    ...Array.from({length:tokens.boost},(_,i)=>renderButton('boostChi',`Spend ${i+1} Chi · +${i+1} damage`,`data-amount="${i+1}"`)),
    ...Array.from({length:tokens.prevent},(_,i)=>renderButton('preventChi',`Spend ${i+1} Chi · prevent ${i+1}`,`data-amount="${i+1}"`))
  ].filter(Boolean);
  if(tokenActions.length)content+=`<div class="token-actions"><strong>${names[responding]} · spend tokens</strong><div class="controls">${tokenActions.join('')}</div></div>`;
  const tithe=state.stage==='nyraDamage'||state.grimOverflow?{}:titheChoices(state,responding);
  const titheActions=[
    ...(tithe.draw?[renderButton('titheDraw',`Draw 1 card · ${titheDrawCost(state.players[responding])} CP`)]:[]),
    pickDice('titheReroll','Tithe · pay 1 CP to reroll a die',dieChoices(tithe.dice),{byIndex:true})
  ].filter(Boolean);
  if(titheActions.length)content+=`<div class="token-actions"><strong>${names[responding]} · ${abilityName(state.players[responding].upgrades?.Tithe?'Tithe II':'Tithe')}</strong><div class="controls">${titheActions.join('')}</div></div>`;
  }
  }
  return content;
}

function matchTools(responding) {
  if (!state.cards || state.stage === 'finished') return '';
  return `<nav class="match-tools" aria-label="Match references">
    ${boardButton(responding,true)}
    <div class="match-tool-buttons">${state.players.map((_, seat) => {
      const options = handOptions(seat);
      const playable = options.filter(({choices}) => choices.length).length;
      return button('open-hand',`<span>${names[seat]}</span><small>Hand (${options.length}) · <span class="playable-count" data-available="${playable>0}">${playable} playable</span></small>`,
        `data-index="${seat}" data-responding="${seat === responding}" aria-label="Open ${names[seat]}’s hand, ${options.length} ${options.length===1?'card':'cards'}, ${playable} playable" aria-haspopup="dialog"`);
    }).join('')}</div>
  </nav>`;
}
function render() {
  if (lastTokenResult?.next !== state) lastTokenResult = undefined;
  if (state?.stage !== 'offence' || rollRequest?.setup) {
    editTestFaces = false;
    testAbilityMessage = undefined;
  }
  if (state?.stage!=='defence' || rollRequest?.setup || !defenceKinds(1-state.active).includes(selectedDefence)) {
    selectedDefence = undefined;
  }
  effectDicePlans.length = 0;
  const open = new Set(Array.from(match.querySelectorAll('details[data-disclosure][open]'), detail => detail.dataset.disclosure));
  if (!state || rollRequest?.setup) {
    match.innerHTML = rollRequest ? rollRequestPanel(rollRequest) :
      '<section class="arena"><h2 id="action-title">Set up a match</h2><p>Choose both heroes in Match setup.</p></section>';
  } else {
    const seat = actor(state);
    const responding = cardActor(state);
    const decisionSeat = diceEdit?.seat ?? (state.response ? responding : seat);
    match.innerHTML = hero(0, decisionSeat, responding) + hero(1, decisionSeat, responding) +
      (rollRequest ? rollRequestPanel(rollRequest) :
        diceEdit ? diceEditorPanel(diceEdit) : arena(seat, responding, decisionSeat));
  }
  for (const image of match.querySelectorAll('[data-ability-scan]')) {
    const seat = Number(image.dataset.seat), card = image.dataset.card;
    image.src = card ? cardArtwork(state,seat,Number(card)) : boardImage(state,seat,true);
  }
  for (const detail of match.querySelectorAll('details[data-disclosure]')) {
    if (open.has(detail.dataset.disclosure)) detail.open = true;
  }
  if(handDialog.open)renderHand();
  try {
    if (state || rollRequest) {
      const saved = {...state, uiRollRequest: rollRequest ?? undefined, uiDefenceChoice: selectedDefence};
      localStorage.setItem(storageKey, JSON.stringify(saved));
    }
  } catch {}
}
function viewWithPileCard(view, seat, pile, id) {
  if (pile !== 'deck' && pile !== 'discard') return null;
  const original = view.players[seat];
  const index = original[pile].indexOf(id);
  if (index < 0 || original.hand.includes(id)) return null;
  const player = {...original, [pile]: original[pile].slice(), hand: [...original.hand, id]};
  player[pile].splice(index, 1);
  const players = view.players.slice();
  players[seat] = player;
  return {...view, players};
}

function pileCardChoices(seat, pile, id) {
  const view = viewWithPileCard(state, seat, pile, id);
  return view && canPlayFromHand(view, seat) ? cardChoices(view, seat, id) : [];
}

function canPlayTestCard() {
  return testToggle.checked && state?.cards && state.stage !== 'finished' &&
    !testRoll && !rollRequest && !diceEdit;
}

function canEditTestVitals() {
  return testToggle.checked && state && state.stage !== 'finished' && !testRoll && !rollRequest && !diceEdit;
}

function openTestVitals(seat) {
  testVitalsSeat = seat;
  const player = state.players[seat];
  document.getElementById('test-vitals-title').textContent = `Edit ${names[seat]}’s Health and CP`;
  document.getElementById('test-hp').value = player.hp;
  document.getElementById('test-cp').value = player.cp;
  testVitals.showModal();
}

testVitalsForm.addEventListener('click', event => {
  const step = event.target.closest('button[data-step]');
  if (!step) return;
  const input = document.getElementById(step.dataset.field);
  if (step.dataset.step === 'up') input.stepUp();
  else input.stepDown();
});

testVitalsForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!canEditTestVitals()) return;
  const hp = document.getElementById('test-hp').valueAsNumber;
  const cp = document.getElementById('test-cp').valueAsNumber;
  if (!Number.isInteger(hp) || hp < 1 || hp > 60 || !Number.isInteger(cp) || cp < 0 || cp > 15) return;
  const player = state.players[testVitalsSeat];
  if (player.hp !== hp || player.cp !== cp) {
    player.hp = hp;
    player.cp = cp;
    state.log.unshift(`Test mode sets ${names[testVitalsSeat]} to ${hp} Health and ${cp} CP.`);
  }
  testVitals.close();
  render();
  match.querySelector(`button[data-action="test-vitals"][data-index="${testVitalsSeat}"]`)?.focus();
});

testToggle.addEventListener('change', () => {
  if (!testToggle.checked) {
    testRoll = null;
    testDraft = undefined;
    editTestFaces = false;
    testAbilityMessage = undefined;
    if (diceEdit?.testCard) diceEdit = null;
    testCard = null;
  }
  render();
});

function renderHand() {
  const seat=handSeat;
  if (testCard) {
    const {id, pile} = testCard;
    const choices = pileCardChoices(seat, pile, id);
    handTitle.textContent = seatCard(state, seat, id).name;
    handContent.innerHTML = `<p>${names[seat]} · ${pile === 'deck' ? 'Draw pile' : 'Discard pile'}</p>
      ${choices.length && !cardDicePlan(seat, id, choices) ? handCardChoices(choices, seat, viewWithPileCard(state, seat, pile, id)) : ''}
      ${choices.length ? button('playCard','Play card',`class="primary" data-index="${id}"`) : '<p>Unavailable in this window.</p>'}`;
    return;
  }
  handTitle.textContent=`${names[seat]}’s hand · ${state.players[seat].hand.length}`;
  handContent.innerHTML=handPanel();
}

const deckSections = {
  main:'Main Phase', roll:'Roll Phase', instant:'Instant', upgrade:'Upgrades',
  spell:'Spells', rage:'Rage', ore:'Ore', discard:'Discard pile'
};

function renderDeck(seat, location) {
  const hero = heroId(state,seat);
  const player = state.players[seat];
  const {startingSpell, promoId = 33} = heroRoster[hero];
  const pile = location === 'draw' ? player.deck : location === 'discard' ? player.discard : null;
  const pileLabel = location === 'draw' ? 'Draw pile' : 'Discard pile';
  const locations = [
    ['Draw pile', player.deck],
    ['In hand', player.hand],
    ['In discard', player.discard],
    ['Equipped', Object.values(player.upgrades ?? {})],
    ['Covered upgrade', player.coveredUpgrades ?? []],
    ['Prepared', player.spellBook ?? []],
    ['In the Forge', player.forgeOre ?? []]
  ];
  const copies = new Map();
  for (const id of deckCardIds(hero,state.promo)) {
    const card = cardInfo(hero,id);
    const key = JSON.stringify([card.phase, card.name, card.cost]);
    const entry = copies.get(key);
    if (entry) entry.ids.push(id);
    else copies.set(key, {...card, ids:[id]});
  }
  const cards = [...copies.values()].flatMap(({ids, name, phase}) => {
    if (pile) {
      const entries = ids.filter(id => pile.includes(id));
      return entries.length ? [{id:entries[0], ids:entries, name, count:entries.length, section:phase}] : [];
    }
    const count = ids.length;
    const current = locations
      .map(([label, pile]) => [label, ids.filter(id => pile.includes(id)).length])
      .filter(([, quantity]) => quantity > 0);
    const outside = count - current.reduce((total, [, quantity]) => total + quantity, 0);
    if (outside > 0) current.push(['Outside draw pile', outside]);
    const status = current.map(([label, quantity]) => count > 1 ? `${label} ×${quantity}` : label).join(' · ');
    const section = ids.every(id => player.discard.includes(id)) ? 'discard' : phase;
    return [{id: ids[0], ids, name, count, status, section}];
  }).sort((a,b) => a.name.localeCompare(b.name));
  const testButtons = ids => {
    if (!canPlayTestCard()) return '';
    const sources = [['deck', 'Draw pile'], ['discard', 'Discard pile']];
    return sources.filter(([key]) => !pile || player[key] === pile).map(([key, label]) => {
      const id = ids.find(cardId => player[key].includes(cardId));
      if (id === undefined) return '';
      const enabled = pileCardChoices(seat, key, id).length > 0;
      return button('test-pile-card', pile ? 'Play' : `Play from ${label.toLowerCase()}`,
        `data-index="${id}" data-pile="${key}" ${enabled ? '' : 'disabled title="Unavailable in this window"'}`);
    }).join('');
  };
  const cardList = entries => `<ul class="deck-card-list" role="list">
      ${entries.map(({id, ids, name, count, status}) => {
        const controls = testButtons(ids);
        return `<li class="deck-entry">
        <span>${name}${count>1 ? ` ×${count}` : ''}${status ? `<small>${status}</small>` : ''}${id===startingSpell ? '<small>Starts prepared</small>' : id===promoId ? '<small>Promo</small>' : ''}</span>
        ${previewCard(state,seat,id)}
        ${controls ? `<div class="controls test-deck-actions">${controls}</div>` : ''}
      </li>`;
      }).join('')}
    </ul>`;
  deckTitle.textContent = pile ? `${names[seat]} · ${pileLabel} (${pile.length})` : `${names[seat]}’s deck list`;
  fullDeckButton.hidden = !pile;
  deckContent.innerHTML = pile ? cards.length ? cardList(cards) : `<p>${pileLabel} is empty.</p>` :
    Object.entries(deckSections).map(([section, label]) => {
      const entries = cards.filter(card => card.section === section);
      return entries.length ? `<details class="deck-group"><summary>${label}</summary>${cardList(entries)}</details>` : '';
    }).join('');
  deckContent.scrollTop = 0;
}

function openDeck(seat, location) {
  deckSeat = seat;
  renderDeck(seat, location);
  deckDialog.showModal();
  deckContent.scrollTop = 0;
}

function openHeroSheet(seat) {
  document.getElementById('hero-sheet-title').textContent = names[seat];
  heroSheetContent.innerHTML = heroInformation(seat,heroStatuses(seat),true);
  heroSheetContent.scrollTop = 0;
  heroSheet.showModal();
}

function handleAction(event) {
  const target=event.target.closest('button[data-action]');
  if (!target) return;
  let type=target.dataset.action;
  const index=Number(target.dataset.index);
  if (testToggle.checked && (type.startsWith('test-die-') || type.startsWith('test-dice-'))) {
    handleTestRoll(type, index);
    return;
  }
  if (testRoll) return;
  if (type === 'test-edit-faces') {
    if (!testToggle.checked || state.stage !== 'offence' || !state.dice.length) return;
    editTestFaces = !editTestFaces;
    testDraft = undefined;
    render();
    match.querySelector('button[data-action="test-edit-faces"]')?.focus();
    return;
  }
  if (type === 'test-ability') {
    if (testToggle.checked && !rollRequest && !diceEdit) selectTestAbility(index);
    return;
  }
  if (type === 'test-vitals') {
    if (canEditTestVitals() && [0,1].includes(index)) openTestVitals(index);
    return;
  }
  if (type === 'test-pile-card') {
    const {pile} = target.dataset;
    if (!canPlayTestCard()) return;
    const choices = pileCardChoices(deckSeat, pile, index);
    if (!choices.length) return;
    handSeat = deckSeat;
    testCard = {id: index, pile};
    selectedCard = null;
    deckDialog.close();
    if (choices.length > 1 && !cardDicePlan(deckSeat, index, choices)) {
      renderHand();
      handDialog.showModal();
      return;
    }
    type = 'playCard';
  }
  if (type==='roll-request' && rollRequest && !rollRequest.initiative && !rollRequest.reveal) {
    resolveRollRequest();
    return;
  }
  if (type==='advance-roll' && (rollRequest?.initiative || rollRequest?.reveal)) {
    advanceRollRequest();
    return;
  }
  if (!state || rollRequest?.setup) return;
  if(type==='inspect-token') {
    const entry = heroStatuses(Number(target.dataset.seat))[index];
    if(!entry)return;
    document.getElementById('token-info-title').textContent = entry.label;
    document.getElementById('token-info-icon').innerHTML = tokenSymbol(entry.label,entry.icon);
    document.getElementById('token-info-note').textContent = entry.note || 'See the hero leaflet for this token’s ability.';
    document.getElementById('token-info').showModal();
    return;
  }
  if(type==='open-hero-details') {
    openHeroSheet(index);
    return;
  }
  if(type==='open-deck') {
    openDeck(index,target.dataset.location);
    return;
  }
  if(type==='open-hand') {
    if(!state.cards||![0,1].includes(index)||state.stage==='finished')return;
    handSeat=index;
    testCard=null;
    selectedCard=null;
    renderHand();
    handDialog.showModal();
    return;
  }
  if(type==='inspect-card') {
    openViewer(Number(target.dataset.seat),false,index);
    return;
  }
  if(type==='select-card') {
    selectedCard=selectedCard===index?null:index;
    renderHand();
    handContent.querySelector(`button[data-action="select-card"][data-index="${index}"]`)?.focus();
    return;
  }
  if(type==='inspect-shoot'){
    const active=state.players[index].shootActive;
    openReference(art.deadpoolShoot[active?0:1],`${names[index]} · Shoot ${active?'Active':'Inactive'}`);
    return;
  }
  if(type==='inspect-reject'){
    openReference(art.krampusRejects[index],krampus.names[index]);
    return;
  }
  if(type==='inspect-forging'){
    const key=target.dataset.status;
    openReference(art[key],key==='mining'?'Mining rules':'Crafting rules');
    return;
  }
  if(type==='inspect-freezer'){
    openReference(art.icemanFreezer,'The Freezer');
    return;
  }
  if(type==='inspect-ace'){
    const seat=Number(target.dataset.seat);
    openReference(art.gambitAces[index],`${names[seat]} · ${statusLabel(gambit.suits[index])} Ace`);
    return;
  }
  if(type==='inspect-undead'){
    openReference(art.undeadLeaflet,'Undead reference');
    return;
  }
  if (type==='inspect-board' || type==='inspect-leaflet') {
    openViewer(index,type==='inspect-leaflet');
    return;
  }
  if (type==='status') {
    const note=document.getElementById(target.getAttribute('aria-controls'));
    note.hidden=!note.hidden;
    target.setAttribute('aria-expanded',String(!note.hidden));
    return;
  }
  if (diceEdit) {
    handleDiceEditor(type,index,target.dataset.choice);
    return;
  }
  if (rollRequest) return;
  if (type==='choose-defence'||type==='change-defence') {
    if (state.stage!=='defence'||!legal(state).defend) return;
    const kinds=defenceKinds(1-state.active);
    const choosing=type==='choose-defence';
    if (kinds.length<2 || choosing&&!kinds.includes(target.dataset.defence)) return;
    selectedDefence=choosing ? target.dataset.defence : undefined;
    testDraft = undefined;
    render();
    match.querySelector(`button[data-action="${choosing?'defend':'choose-defence'}"]`)?.focus();
    return;
  }
  if (type==='open-effect-dice') {
    const plan = effectDicePlans[index];
    if (!plan) return;
    const seat = target.dataset.effectSeat===undefined ? undefined : Number(target.dataset.effectSeat);
    diceEdit={...plan,picks:new Map(),effect:{index,seat}};
    render();
    focusRollAction();
    return;
  }
  if (type==='select-potion'||type==='back-to-potions') {
    const potion=target.dataset.status, task=state.alchemistTask;
    if (state.stage!=='alchemistChoices'||task?.queue[0]?.kind!=='attach'||
        type==='select-potion'&&!alchemist.taskChoices(state).some(choice=>choice.key===potion)) return;
    selectedPotion=type==='select-potion'?potion:undefined;
    render();
    focusRollAction();
    return;
  }
  const diceGroup = target.dataset.diceGroup;
  if (type==='pick-reroll-die'||type==='pick-match-die') {
    const picks = dicePicks.get(diceGroup) ?? new Set();
    if (picks.has(index)) picks.delete(index);
    else {
      if (Number(target.dataset.limit)===1) picks.clear();
      picks.add(index);
    }
    dicePicks.set(diceGroup,picks);
    render();
    match.querySelector(`button[data-action="${type}"][data-index="${index}"][data-dice-group="${diceGroup}"]`)?.focus({preventScroll:true});
    return;
  }
  if (type==='sell' && (handSeat!==state.active || !canPlayFromHand(state, handSeat))) return;
  const oldState=state, oldStage=state.stage, oldSeat=cardActor(state);
  const action={type,index,id:index,ability:abilitiesFor(state,state.active)[Number(target.dataset.ability)]?.name,
    choice:Number(target.dataset.choice??0), target:Number(target.dataset.target),status:target.dataset.status, amount:Number(target.dataset.nyraSplit?document.getElementById('nyra-damage').value:target.dataset.amount), defence:target.dataset.defence};
  if (diceGroup) {
    action.indices = [...(dicePicks.get(diceGroup) ?? [])].sort((a,b)=>a-b);
    if (!action.indices.length) return;
    action.index = action.indices[0];
  }
  dicePicks.clear();
  if(target.dataset.effectSeat!==undefined)action.effectSeat=Number(target.dataset.effectSeat);
  if(type==='playCard') {
    if(!canPlayFromHand(state, handSeat))return;
    action.seat=handSeat;
    action.choice = target.dataset.action === 'test-pile-card' ? 0
      : Number(handContent.querySelector('input[name="card-choice"]:checked')?.value
        ?? document.getElementById('card-choice')?.value ?? 0);
    const source = testCard;
    const choices = source ? pileCardChoices(handSeat, source.pile, index) : cardChoices(state,handSeat,index);
    if (source && (!canPlayTestCard() || source.id !== index || !choices[action.choice])) return;
    if (source) action.testPile = source.pile;
    testCard = null;
    const plan=cardDicePlan(handSeat,index,choices);
    if(plan){
      diceEdit={...plan,picks:new Map(),testCard:source};
      handDialog.close();
      render();
      document.getElementById('action-title')?.focus();
      return;
    }
    if (source) handDialog.close();
  }
  if(type==='deadpoolLuckyHope')action.amount=Number(document.getElementById('deadpool-lucky-hope').value);
  const rollTitle = type === 'playCard' ? seatCard(state, handSeat, action.id).name : target.textContent?.trim();
  const safeTitle = rollTitle?.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  state = applyMatchAction(action, safeTitle || 'Roll dice');
  if(state!==oldState)selectedPotion=undefined;
  if (rollRequest || testRoll) {
    if (handDialog.open) handDialog.close();
    selectedCard = null;
    render();
    focusRollAction();
    return;
  }
  if(oldStage!==state.stage || oldSeat!==cardActor(state) || type==='playCard' || type==='sell')selectedCard=null;
  if(handDialog.open && (oldStage!==state.stage || oldSeat!==cardActor(state) || (!oldState.retry&&state.retry) || (!oldState.cardRoll&&state.cardRoll) || (!oldState.mainAction&&state.mainAction)))handDialog.close();
  render();
  const decisionChanged = oldStage!==state.stage || oldState.response?.seat!==state.response?.seat
    || type==='alchemistChoice'&&state!==oldState;
  const effectRoll=state!==oldState&&effectRollOnCurrentScreen(oldState,type);
  const focus=decisionChanged||effectRoll ? document.getElementById('action-title')
    : type==='hold' ? match.querySelector(`button[data-index="${index}"][data-action="hold"]`) : match.querySelector('button[data-action="roll"]:enabled');
  if (focus && !handDialog.open) focus.focus({preventScroll:!decisionChanged||type==='defend'||effectRoll});
  else if(handDialog.open) {
    const nextCard=handContent.querySelector('button[data-action="select-card"]');
    (nextCard??handDialog.querySelector('button')).focus({preventScroll:true});
  }
}
match.addEventListener('click',handleAction);
handContent.addEventListener('click',handleAction);
deckContent.addEventListener('click',handleAction);
heroSheetContent.addEventListener('click',handleAction);
fullDeckButton.addEventListener('click',()=>{
  renderDeck(deckSeat);
  deckDialog.querySelector('form button').focus();
});
const viewer = document.getElementById('viewer');
const viewerImage = document.getElementById('viewer-image');
const viewerScroll = document.getElementById('viewer-scroll');
const viewerZoom = document.getElementById('viewer-zoom');
const boardSections = document.getElementById('board-sections');
const boardScanButton = document.getElementById('board-scan');
const boardUpgradesButton = document.getElementById('board-upgrades-tab');
const boardUpgradesPanel = document.getElementById('board-upgrades-panel');
const front = document.getElementById('leaflet-front');
const back = document.getElementById('leaflet-back');
const aidSections = document.getElementById('player-aid-sections');
const aidPages = [
  ['turn-summary','Turn summary'],
  ['quick-reference','Quick reference'],
  ['damage-cheat-sheet','Damage cheat sheet']
].map(([key, title]) => ({key, title, button: document.getElementById(`aid-${key}`)}));
let viewerSeat, viewerMode, zoom=1, pinch=null;
const desktopViewer = window.matchMedia('(hover: hover) and (pointer: fine)');
function setZoom(value) {
  zoom=bounded(value-1,3)+1;
  const width=viewerScroll.clientWidth;
  let fit=viewerMode==='card'?Math.min(460,width):width;
  const fitHeight=viewerMode==='card'||viewerMode==='leaflet'||
    viewerMode==='aid'&&viewerImage.naturalWidth<viewerImage.naturalHeight;
  if(fitHeight&&desktopViewer.matches&&viewerImage.complete&&viewerImage.naturalHeight){
    fit=Math.min(fit,viewerScroll.clientHeight*viewerImage.naturalWidth/viewerImage.naturalHeight);
  }
  viewerImage.style.width=`${fit*zoom}px`;
}
viewerImage.addEventListener('load',()=>{
  if(viewer.open&&viewerMode!=='board')setZoom(zoom);
});
function showViewerImage(source, title) {
  viewerImage.alt=title;
  viewerImage.src=source;
  document.getElementById('viewer-title').textContent=title;
  setZoom(1);
  viewerScroll.scrollTo(0,0);
}
function showScan(side) {
  const leaflet=viewerMode==='leaflet';
  const reference=leaflet?`leaflet, ${side?'back':'front'}`:'board';
  front.setAttribute('aria-pressed',String(side===0));
  back.setAttribute('aria-pressed',String(side===1));
  showViewerImage(leaflet?art.leaflets[heroId(state,viewerSeat)][side]:boardImage(state,viewerSeat,true),
    `${names[viewerSeat]} ${reference}`);
}
function openImageViewer(mode) {
  viewerMode=mode;
  front.hidden=back.hidden=mode!=='leaflet';
  aidSections.hidden=mode!=='aid';
  boardSections.hidden=mode!=='board';
  boardUpgradesPanel.hidden=true;
  viewerScroll.hidden=viewerZoom.hidden=false;
  viewer.showModal();
}
function openReference(source, title) {
  openImageViewer('card');
  showViewerImage(source,title);
}
function openViewer(seat,leaflet,card=null) {
  if(card!==null){
    openReference(cardArtwork(state,seat,card),seatCard(state,seat,card).name);
    return;
  }
  viewerSeat=seat;
  openImageViewer(leaflet?'leaflet':'board');
  if(leaflet)showScan(0);
  else openBoardScan(seat);
}
function openBoardScan(seat) {
  const upgrades = equippedUpgrades(seat);
  boardUpgradesButton.textContent = `Upgrades (${upgrades.length})`;
  boardUpgradesPanel.innerHTML = upgrades.length
    ? `<ul role="list">${upgrades.map(id => {
        const name = seatCard(state,seat,id).name;
        return `<li class="deck-entry"><span>${name}</span>
        ${button('preview-equipped-upgrade','View',`class="card-preview" data-index="${id}" aria-label="View ${name}"`)}</li>`;
      }).join('')}</ul>`
    : '<p>No equipped upgrades.</p>';
  showBoardPage('board');
}
function showBoardPage(page, cardId) {
  boardScanButton.setAttribute('aria-pressed',String(page==='board'));
  boardUpgradesButton.setAttribute('aria-pressed',String(page!=='board'));
  const showList = page==='upgrades';
  viewerScroll.hidden=viewerZoom.hidden=showList;
  boardUpgradesPanel.hidden=!showList;
  if(showList) {
    document.getElementById('viewer-title').textContent=`${names[viewerSeat]} · Equipped upgrades`;
    return;
  }
  viewerMode = page==='board' ? 'board' : 'card';
  if(page==='board')showScan(0);
  else showViewerImage(cardArtwork(state,viewerSeat,cardId),seatCard(state,viewerSeat,cardId).name);
}
boardScanButton.addEventListener('click',()=>showBoardPage('board'));
boardUpgradesButton.addEventListener('click',()=>showBoardPage('upgrades'));
boardUpgradesPanel.addEventListener('click',event=>{
  const target=event.target.closest('button[data-action="preview-equipped-upgrade"]');
  if(!target)return;
  showBoardPage('card', Number(target.dataset.index));
  boardUpgradesButton.focus();
});
function showAidPage(page) {
  for(const section of aidPages)section.button.setAttribute('aria-pressed', String(section===page));
  showViewerImage(`./player-aid/${page.key}.webp`,page.title);
}
for(const page of aidPages)page.button.addEventListener('click',()=>showAidPage(page));
document.getElementById('open-player-aid').addEventListener('click',()=>{
  openImageViewer('aid');
  showAidPage(aidPages[0]);
});
front.addEventListener('click',()=>showScan(0));
back.addEventListener('click',()=>showScan(1));
document.getElementById('zoom-in').addEventListener('click',()=>setZoom(zoom*1.5));
document.getElementById('zoom-out').addEventListener('click',()=>setZoom(zoom/1.5));
document.getElementById('zoom-fit').addEventListener('click',()=>setZoom(1));
function spacing(touches) {
  return Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
}
viewerScroll.addEventListener('touchstart',event=>{
  if(event.touches.length===2) {
    pinch={distance:spacing(event.touches),zoom};
    event.preventDefault();
  }
},{passive:false});
viewerScroll.addEventListener('touchmove',event=>{
  if(pinch?.distance && event.touches.length===2) {
    event.preventDefault();
    setZoom(pinch.zoom*spacing(event.touches)/pinch.distance);
  }
},{passive:false});
for(const type of ['touchend','touchcancel']) viewerScroll.addEventListener(type,()=>{pinch=null;});
window.addEventListener('resize',()=>{if(viewer.open)setZoom(zoom);});
// Older in-progress rolls that now use the match screen already have their final dice saved.
if (rollRequest?.reveal && (rollsOnCurrentScreen(state,rollRequest.rollType) ||
    hasRollOnResolutionScreen(state,rollRequest,rollRequest.next,rollRequest.token ?? tokenRollForAction(state,rollRequest.action)))) {
  state = rollRequest.next;
  names = heroNames(state);
  rollRequest = null;
}

// Older Phoenix Burn prompts paused the damage itself at the removal roll.
if (state?.sideDamage?.jeanBurnCheck !== undefined &&
    (rollRequest?.action?.type === 'resolveSideDamage' ||
      rollRequest?.action?.type === 'passResponse' && state.response?.action?.type === 'resolveSideDamage')) {
  state = rollRequest.next ?? transition({...state,response:null},{type:'resolveSideDamage'},roll,Math.random,true);
  rollRequest = null;
}

// Clear any Dice Cube prompt from a save where every candidate now freezes automatically.
if (state?.iceFreezeChoice) iceman.freeze(state);
if (rollRequest?.next?.iceFreezeChoice) iceman.freeze(rollRequest.next);

// A saved Glide announcement has no offensive roll to accept.
if (!rollRequest && state?.stage==='announce' && state.pending?.iceman &&
    !state.attempts && !state.dice.length && state.players[state.active].glideTurn===state.turn && !state.response) {
  state=applyMatchAction({type:'accept'},'Resolve Glide ability');
}

// Resume an old pre-defence response on the unrolled tray.
if (!rollRequest && state?.stage === 'defence' && state.response?.action?.type === 'defend') {
  state.response = null;
}

const setupHeroes = rollRequest?.setup?.heroes.slice() ?? (state ? state.players.map((_,seat)=>heroId(state,seat)) : [0,1]);
const setupHeroNames=setupHeroes.map((_,seat)=>document.getElementById(`setup-hero-${seat}`));
const setupPortraits=setupHeroes.map((_,seat)=>document.getElementById(`setup-portrait-${seat}`));
const heroPicker=document.getElementById('hero-picker');
const heroPickerTitle=document.getElementById('hero-picker-title');
const heroSearch=document.getElementById('hero-search');
const heroGroups=document.getElementById('hero-groups');
const heroNoResults=document.getElementById('hero-no-results');
const touchPicker=window.matchMedia('(hover: none) and (pointer: coarse)');
let pickerSeat;
let groupsBeforeSearch=null;

function openHeroPicker(seat) {
  pickerSeat=seat;
  const currentHero=setupHeroes[seat];
  heroPickerTitle.textContent=`Choose a hero for Player ${seat+1}`;
  heroSearch.value='';
  heroNoResults.textContent='';
  groupsBeforeSearch=null;
  heroGroups.innerHTML=sets.filter(set=>set.heroes.length).map(set=>`
    <details ${set.heroes.includes(currentHero)?'open':''}>
      <summary>${set.name}</summary>
      <div class="picker-heroes">
        ${set.heroes.map(id=>`
          <button type="button" class="picker-hero" data-hero="${id}" ${id===currentHero?'aria-current="true"':''}>
            ${heroPortrait(id)}<span>${HEROES[id].name}</span><small>Complexity ${heroRoster[id].complexity}/6</small>
          </button>`).join('')}
      </div>
    </details>`).join('');
  heroPicker.showModal();
  heroGroups.parentElement.scrollTop=0;
  if(!touchPicker.matches)heroSearch.focus();
}

function renderSetupHero(seat) {
  const id=setupHeroes[seat];
  setupHeroNames[seat].textContent=HEROES[id].name;
  setupPortraits[seat].src=portraitSource(id);
}

for(const seat of setupHeroes.keys()){
  renderSetupHero(seat);
  document.getElementById(`change-hero-${seat}`).addEventListener('click',()=>openHeroPicker(seat));
}

heroSearch.addEventListener('input',()=>{
  const query=heroSearch.value.trim().toLowerCase();
  const groups=Array.from(heroGroups.children);
  if(query && !groupsBeforeSearch)groupsBeforeSearch=groups.map(group=>group.open);
  let found=false;
  for(const [index,group] of groups.entries()){
    let hasMatch=false;
    for(const option of group.querySelectorAll('[data-hero]')){
      const matches=HEROES[option.dataset.hero].name.toLowerCase().includes(query);
      option.hidden=!matches;
      hasMatch ||= matches;
    }
    group.hidden=!hasMatch;
    if(query)group.open=hasMatch;
    else if(groupsBeforeSearch)group.open=groupsBeforeSearch[index];
    found ||= hasMatch;
  }
  if(!query)groupsBeforeSearch=null;
  heroNoResults.textContent=found?'':'No heroes match your search.';
  heroGroups.parentElement.scrollTop=0;
});

function chooseSetupHero(id) {
  setupHeroes[pickerSeat]=id;
  renderSetupHero(pickerSeat);
  heroPicker.close();
}

heroGroups.addEventListener('click',event=>{
  const option=event.target.closest('button[data-hero]');
  if(option)chooseSetupHero(Number(option.dataset.hero));
});
document.getElementById('random-hero').addEventListener('click',()=>{
  chooseSetupHero(Math.floor(Math.random() * HEROES.length));
});

document.getElementById('reset').addEventListener('click',()=>{
  if (state && (state.attempts || state.turn>1) && state.stage!=='finished' &&
      !confirm('Start a new match and replace the current one?')) return;
  if (handDialog.open) handDialog.close();
  diceEdit=undefined;
  testRoll=null;
  testDraft=undefined;
  editTestFaces=false;
  testAbilityMessage=undefined;
  testCard=null;
  dicePicks.clear();
  selectedPotion=undefined;
  rollRequest = {
    setup: {promo: document.getElementById('promos').checked, heroes: setupHeroes.slice()},
    description: 'Decide who starts', count: 2, owners: [0,1]
  };
  selectedCard = null;
  document.getElementById('match-setup').open = false;
  render();
  match.querySelector('button[data-action="roll-request"]')?.focus();
});
document.getElementById('promos').checked = rollRequest?.setup?.promo ?? state?.promo ?? false;
if (!state && !rollRequest) document.getElementById('match-setup').open = true;
render();
