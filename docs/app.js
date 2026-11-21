const art = window.diceThroneArt;
function cardArtwork(match,seat,cardId) {
  const hero=heroId(match,seat);
  if(cardId>18)return art.uniqueCards[hero][cardId-19];
  const marvel=sets.some(set=>['Marvel','X-Men'].includes(set.name)&&set.heroes.includes(hero));
  return (marvel&&art.marvelSharedCards?art.marvelSharedCards:art.sharedCards)[cardId-1];
}

const match = document.getElementById('match');
const storageKey = 'dice-throne-card-pilot-v2';
const roll = () => 1 + Math.floor(Math.random()*6);
let state;
let rollRequest;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved?.version === 2 && saved.cards && saved.players?.length === 2 && Array.isArray(saved.log)) {
    const {uiRollRequest, ...matchState} = saved;
    state = matchState;
    if (uiRollRequest?.action || uiRollRequest?.setup) rollRequest = uiRollRequest;
  } else if (saved?.uiRollRequest?.setup) rollRequest = saved.uiRollRequest;
} catch {}
let names = state ? heroNames(state) : [];
let selectedCard=null;
let handSeat;
let diceEdit;
const rerollPicks = new Map();
let selectedPotion;
const handDialog=document.getElementById('hand-dialog');
const handTitle=document.getElementById('hand-title');
const handContent=document.getElementById('hand-content');
const deckDialog = document.getElementById('deck-dialog');
const deckTitle = document.getElementById('deck-title');
const deckContent = document.getElementById('deck-content');
const button = (action,label,attrs='') => `<button type="button" data-action="${action}" ${attrs}>${label}</button>`;
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
function heroEquipment(seat) {
  const upgrades=Object.values(state.players[seat].upgrades??{});
  return `${heroId(state,seat)===alchemist.id?attachedPotions(seat):''}
    ${heroId(state,seat)===krampus.id?`<details class="board-upgrades" data-disclosure="rejects-${seat}"><summary>Rejects (${state.players[seat].rejects.length}/3)</summary><div class="controls">${state.players[seat].rejects.map(id=>button('inspect-reject',`<img src="${art.krampusRejects[id]}" alt="${krampus.names[id]}" style="width:100px;max-width:100%"><br>${krampus.names[id]}${state.players[seat].rejectUsed[id]===state.turn?' · used this turn':''}`,`data-index="${id}" data-seat="${seat}"`)).join('')||'No Rejects in play'}</div><p>Draw pile: ${state.players[seat].rejectDeck.length} · Discard: ${state.players[seat].rejectDiscard.map(id=>krampus.names[id]).join(', ')||'empty'}</p></details>`:''}
    ${upgrades.length?`<details class="board-upgrades" data-disclosure="upgrades-${seat}"><summary>Equipped upgrades (${upgrades.length})</summary>
      ${upgrades.map(id=>button('inspect-card',seatCard(state,seat,id).name,`data-index="${id}" data-seat="${seat}"`)).join('')}</details>`:''}`;
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
function tokenImage(view,seat,key) {
  if (!key) return '';
  const hero=heroId(view,seat), player=view.players[seat];
  const tokenArt=hero===mysticBrawler.id&&key==='concussion'?'mysticConcussion':hero===alchemist.id&&key==='poison'?'alchemistPoison':hero===psylocke.id&&key==='agility'?'psylockeAgility':hero===thor.id&&key==='guardBreak'?'thorGuardBreak':hero===gunslinger.id&&key==='evasive'?'gunslingerEvasive':
    hero===gunslinger.id&&key==='knockdown'?'gunslingerKnockdown':
    hero===tactician.id&&key==='targeted'?'tacticianTargeted':
    hero===tactician.id&&key==='protect'?'tacticianProtect':
    hero===seraph.id&&key==='cleanse'?'seraphCleanse':
    hero===seraph.id&&key==='blessing'?'seraphBlessing':key;
  const image=key==='manifestDie'?art.manifestDice[(player.manifestDie||1)-1]:key==='sunDial'?(player.sunDawn?art.dialSun:art.dialDusk):key==='regenerate1'?art.regenerate:key==='regenerate'?art.regenerate2:key==='moonShard'?art.moonShards[(player.moonShard||1)-1]:art[tokenArt];
  return image?`<img class="token-icon" src="${image}" alt="">`:'';
}

function tokenChoiceLabel(view, choice, seat) {
  const image = tokenImage(view,choice.target??seat,choice.status??choice.key);
  return image?`<span class="token-choice">${image}<span>${choice.label}</span></span>`:choice.label;
}

const token = (seat,key,label,suffix=key) => {
  const id = `status-${seat}-${suffix}`;
  return `<span class="token-help">${button('status',`<span class="token">${tokenImage(state,seat,key)}${label}</span>`,
    `aria-expanded="false" aria-controls="${id}" aria-describedby="${id}"`)}<span class="token-note" id="${id}" hidden>${statusNotes[key]}</span></span>`;
};
function hero(seat, decisionSeat, responding) {
  const p = state.players[seat];
  const drawCount = p.deck.length ?? p.deck;
  const statusLabels = [];
  const status = (key, label, suffix) => {
    statusLabels.push(label);
    return token(seat, key, label, suffix);
  };
  const statuses = [p.evasive && status('evasive',`Evasive ×${p.evasive}`),p.entangle && status('entangle','Entangle'),p.blind && status('blind','Blind'),p.targeted && status('targeted','Targeted'),
    p.pirateCoins?.[seat]&&status('doubloon',`Own Doubloons ×${p.pirateCoins[seat]}`),
    p.pirateCoins?.[1-seat]&&status('doubloon',`Opponent’s Doubloons ×${p.pirateCoins[1-seat]}`,'opponent'),
    ...['powderKeg','wither','parlay'].map(key=>p[key]&&status(key,statusLabel(key)+(key==='wither'?` ×${p[key]}`:''))),
    ...['flight','blindingLight','holyPresence'].map(key=>p[key]&&status(key,statusLabel(key)+(key==='blindingLight'?'':` ×${p[key]}`))),
    ...['bloodPower','bleed','mesmerize'].map(key=>p[key]&&status(key,statusLabel(key)+(key==='mesmerize'?'':` ×${p[key]}`))),
    ...Object.entries(p.armor??{}).filter(([,tier])=>tier).map(([slot,tier])=>{
      const name=forgemaster.armorName(slot,tier);
      const imageKey=name.split(' ')[0].toLowerCase()+(slot==='helm'?'Helm':'Shield');
      return `<span class="token"><img src="${art[imageKey]}" alt="">${name}</span>`;
    }),
    p.combo&&status('combo','Combo'),
    p.invisibility&&status('invisibility','Invisibility'),
    p.webbed&&status('webbed','Webbed'),
    p.probabilityManipulation>0&&status('probabilityManipulation',`Probability Manipulation ×${p.probabilityManipulation}`),
    p.realityWarp&&status('realityWarp','Reality Warp'),
    state.realityDie?.seat===seat&&status('realityWarp','Reality Warp · Scarlet Witch die 5','active'),
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
    ...(p.timeBombTimers??[]).map((b,i)=>status('timeBomb',`Time Bomb ${i+1} · 0:0${b.ticks}`,`timeBomb-${b.id}`)),
    p.kineticEnergy>0&&status('kineticEnergy',`Kinetic Energy ${p.kineticEnergy}/${statusCap(p,'kineticEnergy')}`),
    p.vibraniumSuit&&status('vibraniumSuit','Vibranium Suit'),
    p.sunDial!==undefined&&status('sunDial',`${p.sunDawn?'Dawn':'Dusk'} · ${p.sunDial}/5`),
    p.sunMarked&&status('sunMarked','Sun Marked'),
    p.chargedGem&&status('chargedGem','Charged Gem'),
    p.footwork!==undefined&&status('footwork',`Footwork · ${duelist.positions[p.footwork+2]}`),
    p.guardBreak>0&&status('guardBreak',`Guard Break ×${p.guardBreak}`),
    p.disarm&&status('disarm','Disarm'),
    p.druidForm&&`<span class="token">${druid.formName(p.druidForm)} Form</span>`,
    p.shapeShift>0&&status('shapeshift',`Shape Shift ×${p.shapeShift}`),
    p.regenerate>0&&status('regenerate',`Regenerate (2) ×${p.regenerate}`),
    p.regenerate1>0&&status('regenerate1',`Regenerate (1) ×${p.regenerate1}`),
    p.wound>0&&status('wound',`Wound ×${p.wound}`),
    p.hex&&status('hex','Hex'),
    p.feather>0&&status('feather',`Feathers ${p.feather}/${p.featherCap??5}`),
    ...state.players.flatMap((owner,i)=>owner.nevermoreSeat===seat?
      [status('nevermore',`Nevermore${heroId(state,1-i)===raveness.id?` (P${i+1})`:''} · ${owner.nevermoreVitality}/3`,`nevermore-${i}`)]:[]),
    p.werewolf&&'<span class="token">Werewolf form</span>',
    p.moonShard>0&&status('moonShard',`Moon Shards ×${p.moonShard}`),
    p.prey>0&&status('prey',`Prey ×${p.prey}`),
    p.corpses!==undefined&&`<span class="token"><img src="${art.corpseDial}" alt="">Corpses ${p.corpses}/10</span>`,
    p.covered&&`<span class="token">Unearth covers ${p.covered}</span>`,
    ...Object.entries(p.undead??{}).filter(([,count])=>count).map(([kind,count])=>{
      const {name}=necromancer.undead[kind], key={warrior:'skeletalWarrior',mage:'skeletalMage',golem:'boneGolem'}[kind];
      return `<span class="token"><img src="${art[key]}" alt="">${name} ×${count}</span>`;
    }),
    p.resurrected&&'<span class="token">Resurrected · CP and cards locked</span>',
    p.resurrect&&status('resurrect','Resurrect'),
    p.decrepify&&status('decrepify','Decrep-ify'),
    p.dreadful&&status('dreadful',`Dreadful ×${p.dreadful}`),
    p.grim&&status('grim',`Grim Pursuit ×${p.grim}`),
    ...state.players.map((owner,i)=>owner.hauntedHeadSeat===seat&&status('hauntedHead',i===seat?'Own Haunted Head':'Opponent’s Haunted Head',`hauntedHead-${i}`)),
    p.nyraBond&&status('nyraBond','Nyra’s Bond'),
    heroId(state,seat)===jeanGrey.id&&`<span class="token">${p.darkPhoenix?'Dark Phoenix':'Jean Grey'} active</span>`,
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
    p.lightningCharges&&`<details class="token-actions"><summary>Lightning · ${Object.values(p.lightningCharges).filter(Boolean).length} charged abilities</summary>${storm.slots.map(key=>`<span class="token">${status('lightning',key+': '+(p.lightningCharges[key]?'Charged':'empty'))}</span>`).join('')}</details>`,
    p.influence&&status('influence',`Influence ${p.influence}/3`),
    p.ionicEnergy&&status('ionicEnergy',`Ionic (1) ×${p.ionicEnergy} · ${rogue.total(p)}/${rogue.cap(p)}`),
    p.ionicEnergy2&&status('ionicEnergy2',`Ionic (2) ×${p.ionicEnergy2} · ${rogue.total(p)}/${rogue.cap(p)}`),
    p.skyward&&status('skyward',`Skyward ${p.skyward}/2`),
    p.paralyze&&status('paralyze','Paralyze'),
    p.infiltration&&status('infiltration',`Infiltration ${p.infiltration}/2`),
    heroId(state,seat)===psylocke.id&&status('manifestDie',`Manifest die · ${p.manifestDie||1}${!p.manifestDie?' · not rolled':''}${p.manifestUsedTurn===state.turn?' · used this turn':''}`),
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
    ...Object.entries(p.bots??{}).map(([bot,level])=>`<span class="token"><img src="${art.artificerBots[bot][level-1]}" alt="">${level===2?'Advanced':'Basic'} ${artificer.bots[bot]}</span>`),
    p.barbed&&status('barbed','Barbed Vine'),p.wellspring&&status('wellspring','Wellspring'),
    ...spiritTypes.map(key=>p[key]&&status(key,`${statusLabel(key)} ×${p[key]}`)),
    p.delayedPoison&&status('delayedPoison',`Delayed Poison ×${p.delayedPoison}`),
    p.smoke&&status('smoke','Smoke Bomb'),p.ninjutsu&&status('ninjutsu',`Ninjutsu ×${p.ninjutsu}`),
    ...[...paladinBuffs,'blessing'].map(key=>p[key]&&status(key,statusLabel(key))),
    p.chi&&status('chi',`Chi ${p.chi}/${statusCap(p,'chi')}`),p.cleanse&&status('cleanse',`Cleanse ×${p.cleanse}`),
    p.poison&&status('poison',`Poison ×${p.poison}`),p.shadows&&status('shadows','Shadows'),p.sneak&&status('sneak','Sneak Attack'),
    p.burn&&status('burn','Burn'),p.knockdown&&status('knockdown','Knockdown'),
    p.fireMastery&&status('fireMastery',`Fire Mastery ${p.fireMastery}/${statusCap(p,'fireMastery')}`),
    p.concussion && status('concussion','Concussion'),state.stage==='locked' && state.pending.stun && seat!==state.active && status('stun','Stun')].filter(Boolean);
  const visibleStatuses = statusLabels.slice(0, 2).join(' · ');
  const moreStatuses = statusLabels.length > 2 ? ` · +${statusLabels.length - 2}` : '';
  const statusSummary = visibleStatuses ? visibleStatuses + moreStatuses : 'Hero details';
  const ready = seat === decisionSeat && state.stage !== 'finished';
  return `<section class="hero seat-${seat}" aria-label="${names[seat]}" data-deciding="${ready}" style="--hero:${seat ? '#89cbc5' : '#e9a987'}">
    <div class="hero-head">
      <span class="seat-label">Player ${seat + 1}</span>
      <h2>${names[seat]}</h2>
      <div class="vitals"><span><strong>${p.hp}</strong> Health</span><span><strong>${p.cp}</strong> CP</span></div>
      <div class="hero-links">
        ${button('inspect-board','Board',`data-index="${seat}" aria-label="Open ${names[seat]}’s board" aria-haspopup="dialog"`)}
        ${button('inspect-leaflet','Leaflet',`data-index="${seat}" aria-label="Open ${names[seat]}’s leaflet" aria-haspopup="dialog"`)}
      </div>
      ${heroId(state,seat)===deadpool.id&&seat===responding&&seat===state.active&&isMain(state)&&!state.cardRoll&&!state.mainAction&&!rollRequest?
        button('toggleCurmudgeon',`Curmudgeon coin · ${p.curmudgeon?'On':'Off'}`,`class="curmudgeon-toggle" aria-pressed="${!!p.curmudgeon}" title="Waive Deadpool’s spoken bonus requirements"`):''}
    </div>
    <details class="hero-information" data-disclosure="hero-${seat}">
      <summary>${statusSummary}</summary>
      <div class="hero-information-body">
        ${heroId(state,seat)===cyclops.id?`<div class="leadership-counter" role="status">Leadership cards played this turn: <strong>${cyclops.count(state,seat)}</strong></div>`:''}
        ${p.nyra?`<div class="tokens"><span class="token"><img src="${art.nyraDials[Number(p.nyra.downed)]}" alt="">Nyra · ${p.nyra.downed?'Downed':'Active'} · ${p.nyra.hp}/7 Health</span></div>`:''}
        <div class="tokens">${statuses.join('') || 'No status effects'}</div>
        <div class="inventory">
          ${button('open-deck',`<img src="${art.back}" alt="">Draw ${drawCount}`,`class="draw-count" data-index="${seat}" aria-label="Draw ${drawCount}. View ${names[seat]}’s deck list" aria-haspopup="dialog"`)}
          <span>Discard ${p.discard?.length ?? 0}</span>
          <span>${p.hand.length ?? p.hand} in hand</span>
          ${p.undead?button('inspect-undead','Undead reference',`data-index="${seat}"`):''}
        </div>
        ${heroEquipment(seat)}
    ${heroId(state,seat)===deadpool.id?`<details class="token-actions deadpool-shoot" data-disclosure="shoot-${seat}"><summary>Shoot · ${p.shootActive?'Active':'Inactive'}</summary><div class="controls">${button('inspect-shoot',`<img src="${art.deadpoolShoot[p.shootActive?0:1]}" alt="Shoot ${p.shootActive?'Active':'Inactive'}" style="max-width:120px;width:100%">`,`data-index="${seat}"`)}</div><p>The Shoot card is separate from the draw deck.</p></details>`:''}
    ${p.spellBook?`<div class="forge-inventory"><strong>Book of Vishanti · ${p.spellBook.length} prepared</strong><div class="controls">${p.spellBook.map(id=>button('inspect-card',doctorStrange.spells[id],`data-index="${id}" data-seat="${seat}"`)).join('')||'No prepared Spells'}</div></div>`:''}
    ${p.forgeOre?`<details class="forge-inventory" data-disclosure="forge-${seat}"><summary>The Forge · ${p.forgeOre.length} Ore</summary>
      <div class="controls">${[19,28,34].map(id=>{
        const ore=forgemaster.oreType(id),cards=p.forgeOre.filter(card=>forgemaster.oreType(card)===ore);
        return cards.length?button('inspect-card',`${seatCard(state,seat,id).name} ×${cards.length}`,`data-index="${id}" data-seat="${seat}"`):'';
      }).join('')}${['mining','crafting'].map(key=>button('inspect-forging',key==='mining'?'Mining rules':'Crafting rules',`data-status="${key}"`)).join('')}</div>
    </details>`:''}
    ${p.freezer?`<details class="token-actions" data-disclosure="freezer-${seat}"><summary>The Freezer · ${p.freezer.shards}/5 Ice Shards · ${p.freezer.glide?'Glide stored':'No Glide stored'}</summary><div class="controls">${button('inspect-freezer','View The Freezer',`data-index="${seat}"`)}</div><p>Stored tokens are out of play. They cannot be removed, transferred by ordinary status cards or counted for damage. Only an authorised ability or card can transfer them to your board. Five stored shards can be converted into stored Glide.</p></details>`:''}
    ${p.aces?`<details class="token-actions" data-disclosure="aces-${seat}"><summary>Ace cards · ${p.aceTurn===state.turn?p.aceExploded??0:0}/${1+(p.aceTurn===state.turn?p.aceExtra??0:0)} exploded this turn</summary><div class="controls">${gambit.suits.map((suit,i)=>`<figure style="max-width:150px;margin:6px">${button('inspect-ace',`<img src="${p.aces[suit].up?art.gambitAces[i]:art.back}" alt="${suit} Ace" style="width:100%">`,`data-index="${i}" data-seat="${seat}"`)}<figcaption>${statusLabel(suit)} · ${p.aces[suit].up?`${p.aces[suit].charge}/${gambit.caps[suit]} charged`:'Face down'}</figcaption></figure>`).join('')}</div><p>One Ace explosion per turn in total, plus any additional allowance. Acceleration tokens remain on their own Aces and cannot be transferred or removed.</p></details>`:''}
      </div>
    </details>
  </section>`;
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

function tray(values,seat,editable,held=[],view=state) {
  return `<div class="dice" role="group" aria-label="${names[seat]} dice">${values.map((value,i) => {
    if (!value) return blankDie;
    const {label,picture} = dieFace(values,seat,i,view);
    if(values===view.dice&&iceman.locked(view,seat,i))return `<span class="die frozen" style="outline:2px solid #b8f5ff" aria-label="Die ${i+1}, ${label}, frozen by Dice Cube">${picture}<small>Frozen</small></span>`;
    return editable ? button('hold',picture,`class="die" data-index="${i}" aria-pressed="${!!held[i]}" aria-label="Die ${i+1}, ${label}, ${held[i]?'held':'available to reroll'}"`)
      : `<span class="die${held[i]?' kept':''}"${held[i]?` aria-label="Die ${i+1}, ${label}, held"`:''}>${picture}</span>`;
  }).join('')}</div>`;
}
function handCardChoices(choices, seat) {
  if (!choices.length || (choices.length===1 && choices[0].label==='Play')) return '';
  const labels=choices.map(choice=>tokenChoiceLabel(state,choice,seat));
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

function rollDisplay(context, view = state, first = view.active) {
  if (!context.owners) return tray(context.dice, context.seat, false, context.held, view);
  return opposedTray(context.dice, context.owners, first, names, (value, owner) => tray([value], owner, false, [], view));
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
  const classes = `class="die${selected?' kept':''}${open?' face-picker-open':''}${enabled?'':' unavailable-die'}${frozen?' frozen':''}"`;
  const description = `aria-label="Die ${index+1}, ${label}${frozen?', frozen':''}"`;
  if (!enabled) return `<span ${classes} ${description}>${picture}${frozen?'<small>Frozen</small>':''}</span>`;
  const expanded = action==='pick-card-die' && diceEdit?.mode==='change' ? ` aria-expanded="${open}"` : '';
  return button(action,picture,`${classes} ${description} data-index="${index}" aria-pressed="${selected}"${expanded} ${attrs}`);
}

function rerollTray(context, options) {
  if (!options.length) return rollDisplay(context);
  const group = options[0].type;
  const picks = rerollPicks.get(group) ?? new Set();
  const max = Math.max(...options.map(option=>option.limit));
  const permits = (option,index) => option.canPick?.(context.dice[index],index) ?? true;
  const dice = selectableRoll(context,(index,owner)=>{
    const selected = picks.has(index);
    const enabled = selected || options.some(option=>permits(option,index) &&
      (max===1 || picks.size<option.limit && [...picks].every(pick=>permits(option,pick))));
    return selectableDie(context,index,owner,'pick-reroll-die',enabled,selected,undefined,false,
      `data-reroll-group="${group}" data-limit="${max}"`);
  });
  const actions = options.map(option=>{
    const ready = picks.size>0 && picks.size<=option.limit && [...picks].every(index=>permits(option,index));
    const label = option.label ?? (options.length>1 ? `Ability reroll · up to ${option.limit}`
      : option.limit===1 ? 'Reroll selected die' : 'Reroll selected dice');
    return button(option.type,label,`data-reroll-group="${group}" ${option.type==='retryDie'?'class="primary"':''} ${ready?'':'disabled'}`);
  }).join('');
  const description = max===1 ? 'Select a die to reroll.' : `Select up to ${max} dice to reroll.`;
  return `<p>${description}</p>${dice}<div class="controls">${actions}</div>`;
}

function faceChoices(editor, index) {
  return [...new Set(activeDiceOptions(editor,index).flatMap(option=>
    option.dice.filter(([candidate])=>candidate===index).map(([,face])=>face)))].sort((a,b)=>a-b);
}

function diceEditorPanel(editor) {
  const {context,mode,picks,open,seat,id,limit,cost} = editor;
  const changing = mode==='change';
  const dice = selectableRoll(context, (index,owner)=>{
    const selected=picks.has(index);
    const enabled=selected||activeDiceOptions(editor,index).some(option=>option.dice.some(([candidate])=>candidate===index));
    return selectableDie(context,index,owner,'pick-card-die',enabled,selected,picks.get(index) ?? undefined,open===index);
  });
  const faces = open===undefined ? '' : `<div class="face-picker" role="group" aria-label="New face for die ${open+1}">
    <strong>New face for die ${open+1}</strong>
    <div class="face-picker-options">${faceChoices(editor,open).map(value=>{
      const {label,picture}=dieFace(context.dice,dieOwner(context,open),open,state,value,true);
      return button('pick-card-face',picture,`class="die" data-index="${value}" aria-label="${label}" aria-pressed="${picks.get(open)===value}"`);
    }).join('')}
    ${picks.has(open)?button('undo-card-face','Undo change'):''}</div></div>`;
  const ready=activeDiceOptions(editor).find(option=>option.dice.length===picks.size);
  const confirm=changing?'Confirm changes':mode==='reroll'?'Reroll selected dice':'Confirm target';
  const instruction=changing?'Select a die, then choose its new face.':mode==='reroll'
    ? id===12 ? 'Select dice to reroll. If you roll one die, you can choose to reroll again after seeing the result.'
      : 'Tap the dice you want to reroll.'
    : 'Choose a die to target.';
  return `<section class="arena dice-editor" aria-label="Choose dice">
    <div class="phase"><span>${names[seat]} · ${picks.size} of ${limit} selected</span></div>
    <h2 tabindex="-1" id="action-title">${seatCard(state,seat,id).name}</h2>
    <p>${instruction}${cost?` ${cost}`:''}</p>
    ${defenceReference()}
    ${!context.owners&&context.seat!==seat?`<strong>${names[context.seat]}’s dice</strong>`:''}
    ${dice}${faces}
    <div class="controls">${button('confirm-card-dice',confirm,`class="primary" ${ready?'':'disabled'}`)}
    ${editor.options.filter(option=>!option.dice.length).map(option=>button('confirm-card-dice',option.label,`data-choice="${option.choiceIndex}"`)).join('')}
    ${button('cancel-card-dice','Cancel')}</div></section>`;
}

function handleDiceEditor(type, index, alternate) {
  const editor = diceEdit;
  const {picks,open,mode} = editor;
  if (type==='cancel-card-dice') {
    diceEdit = null;
    handSeat = editor.seat;
    selectedCard = editor.id;
    render();
    renderHand();
    handDialog.showModal();
    return;
  }
  if (type==='confirm-card-dice') {
    const option = alternate===undefined
      ? activeDiceOptions(editor).find(option=>option.dice.length===picks.size)
      : editor.options.find(option=>!option.dice.length && option.choiceIndex===Number(alternate));
    if (!option) return;
    const action = {type:'playCard',id:editor.id,seat:editor.seat,choice:option.choiceIndex};
    diceEdit=null;
    selectedCard=null;
    state=mode==='reroll' ? transitionOnMatchScreen(state,action,roll,Math.random)
      : applyMatchAction(action,seatCard(state,editor.seat,editor.id).name);
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
  if (!request.initiative) return blankRoll(2, request.owners, playerNames, 0);
  return opposedTray(request.initiative, request.owners, 0, playerNames, (value, seat) =>
    `<div class="dice"><span class="die"><img src="${art.dice[request.setup.heroes[seat]][value - 1]}" alt="${playerNames[seat]} rolled ${value}"></span></div>`);
}

function offenceDice() {
  return state.dice.length ? state.dice : Array(5+(state.stormDice?.count??0)).fill(null);
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

function printedDefence(seat, kind, name) {
  const hero = heroId(state,seat), player = state.players[seat], upgrade = player.upgrades?.[kind];
  const hasUpgrade = Number.isInteger(upgrade);
  const bounds = hasUpgrade ? [9, 26, 93, defenceUpgradeBottom[hero]?.[upgrade] ?? 65]
    : alternateDefenceBounds[player.werewolf ? 'werewolf' : kind] ?? defenceBoardBounds[hero];
  const [left, top, right, bottom] = bounds;
  const width = right - left, height = bottom - top;
  const scale = hasUpgrade ? .635 : 1.64;
  const scan = `<span class="defence-scan" style="aspect-ratio:${width * scale}/${height}">
    <img data-defence-scan data-seat="${seat}" data-upgrade="${upgrade ?? ''}" alt="Printed ${name} effects"
      style="width:${10000 / width}%;height:${10000 / height}%;left:${-100 * left / width}%;top:${-100 * top / height}%">
    </span>`;
  return hasUpgrade
    ? previewCard(state,seat,upgrade,scan)
    : button('inspect-board',scan,`data-index="${seat}" aria-label="View ${name} on ${names[seat]}’s board" aria-haspopup="dialog"`);
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
  const kinds = choosing ? options : [state.defenceKind ?? options[0]];
  return `<div class="defence-reference" role="group" aria-label="Defensive ability effects">${kinds.map(kind=>{
    const count = hero.defenceDiceCount(player,kind);
    const dice = hero.id===gunslinger.id ? '1 die each' : count===1 ? '1 die' : `${count} dice`;
    const name = defenceName(state,seat,kind);
    return `<div><div>${abilityName(name,'strong')}<small>${dice}</small></div>
      ${printedDefence(seat,kind,name)}</div>`;
  }).join('')}</div>`;
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
    return button('declare',`${abilityName(a.label??a.name,'strong')}<small class="ability-requirement">${requirement}</small><small class="ability-effect">${effect}</small>`,
      `class="ability" data-ability="${i}" ${available.includes(a.name)?'':'disabled'}`);
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
  else dice = blankRoll(request.count, owners);
  return `<section class="arena" aria-label="${readyToAdvance?'Roll result':'Pending roll'}">
    <div class="phase"><span>${phase}</span></div>
    <h2 tabindex="-1" id="action-title">${request.description}</h2>
    ${tied ? '<p>Tied initiative. Roll again to break the tie.</p>' : ''}
    ${setup ? '' : defenceReference()}
    ${dice}
    ${button(readyToAdvance ? 'advance-roll' : 'roll-request',label,'class="primary"')}
    ${setup ? '' : matchTools(cardActor(state))}
  </section>`;
}

const rerollActions = new Set([
  'rerollDuel', 'rerollSkyward', 'gambitMagicReroll', 'mysticWildReroll',
  'spiderSenseReroll', 'widowDefenceReroll', 'abilityReroll', 'effectRetry',
  'retryDie', 'extraDefence', 'stormOppReroll', 'rerollUndead', 'rerollReload',
  'rerollMesmerized', 'nyraReroll', 'titheReroll'
]);

const manualRollActions = new Set([
  'roll', 'defend', 'rollEffect', 'rollMysticContest', 'rollSantaAbility',
  'deadpoolLuckyRoll', 'rollTrickBag', 'widowBombRoll', 'rollPrey', 'rollNevermore',
  ...rerollActions
]);

function rollsOnCurrentScreen(view, type) {
  if (type === 'roll' || type === 'defend' || type === 'retryDie') return true;
  if (!rerollActions.has(type)) return false;
  const context = rollContext(view);
  return !!context && (context.dice === view.dice || context.dice === view.defenceDice ||
    view.gunContest?.kind === 'duel' && context.dice === view.gunContest.dice);
}

function defenceAttackerView(view) {
  // Reuse the engine's response priority for an attacker effect chosen before the roll.
  return {...view, response: {seat: view.active}};
}

function transitionOnMatchScreen(view, action, roller, random) {
  if (action.type === 'defend') return transition(view, action, roller, random, true);
  if (!action.attackerEffect) return transition(view, action, roller, random, 'inlineCards');
  if (view.stage !== 'defence' || view.response) return view;
  const priority = defenceAttackerView(view);
  const next = transition(priority, action, roller, random, 'inlineCards');
  if (next === priority) return view;
  // The temporary priority has no deferred action and must never enter the save.
  if (next.response && !next.response.action) next.response = null;
  return next;
}

// Stop just before an incidental roll so the player can roll explicitly.
function beforeDice(action, onRoll, random) {
  const stop = Symbol('pause before dice');
  const before = structuredClone(state);
  const wait = () => wait.requestBatch(1);
  wait.requestBatch = (count, owners) => {
    onRoll?.(count, owners);
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

function revealRoll(request, random = Math.random) {
  const {action, rollType} = request;
  if (rollsOnCurrentScreen(state, rollType)) {
    rollRequest = null;
    return transitionOnMatchScreen(state, action, roll, random);
  }
  const batches = [];
  let singles;
  const record = () => {
    if (!singles) {
      singles = {dice: []};
      batches.push(singles);
    }
    const face = roll();
    singles.dice.push(face);
    return face;
  };
  record.requestBatch = (count, owners) => {
    singles = undefined;
    const dice = Array.from({length: count}, roll);
    batches.push({dice, owners});
    return dice;
  };
  const next = transitionOnMatchScreen(state, action, record, random);
  if (!batches.length || next === state) {
    rollRequest = null;
    return next;
  }
  const context = rollContext(next);
  const seat = context?.seat ?? action.seat ?? cardActor(state);
  const reveal = rerollActions.has(rollType) && context?.dice?.length
    ? [{...context, primary: context.dice === next.dice}]
    : batches.map(batch => ({...batch, seat}));
  rollRequest = {...request, reveal, next};
  return state;
}

function applyMatchAction(action, description) {
  const rollAction = action.type === 'passResponse' ? state.response?.action : action;
  const rollType = rollAction?.type;
  if (manualRollActions.has(rollType)) {
    if (action.type === 'passResponse') description = state.pending?.name ?? 'Roll dice';
    return revealRoll({action, description, rollType});
  }
  const randomPrefix = [];
  return beforeDice(action, (count, owners) => {
    const title = owners ? state.pending?.name ?? description : description;
    rollRequest = {action, rollType, description: title, count, owners, randomPrefix};
  }, () => {
    const value = Math.random();
    randomPrefix.push(value);
    return value;
  });
}

function resolveRollRequest() {
  const request = rollRequest;
  if (request.setup) {
    rollRequest = {...request, initiative: [roll(), roll()]};
  } else {
    let index = 0;
    const random = () => request.randomPrefix[index++] ?? Math.random();
    state = revealRoll(request, random);
  }
  render();
  focusRollAction();
}

function advanceRollRequest() {
  const request = rollRequest;
  if (request.setup && request.initiative[0] === request.initiative[1]) {
    rollRequest = {...request, initiative: undefined};
  } else {
    let index = 0;
    state = request.setup ? createMatch(() => request.initiative[index++], request.setup) : request.next;
    names = heroNames(state);
    rollRequest = null;
    if (handDialog.open) handDialog.close();
    selectedCard = null;
  }
  render();
  focusRollAction();
}

function focusRollAction() {
  (match.querySelector('button[data-action="advance-roll"], button[data-action="roll-request"]')
    ?? document.getElementById('action-title'))?.focus();
}

function arena(seat, responding, decisionSeat) {
  const allowed=legal(state), p=state.pending;
  const pendingAbility=p?.name ? abilityName(p.name) : '';
  const activeName=names[state.active], actingName=names[seat];
  let heading, phase, detail='', content='';
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
    if(r.step==='ready'){detail=`Hope: ${r.hope}. Match it to heal 3; otherwise receive 3 isolated damage.`;content=blankRoll(1)+button('deadpoolLuckyRoll','Roll the opponent’s die','class="primary"');}
    if(r.step==='roll'){detail=`Hope: ${r.hope}. The final die belongs to ${names[r.target]} and can be altered before resolution.`;content=rollDisplay(rollContext(state))+button('deadpoolLuckyResolve','Resolve the hoped-for roll','class="primary"');}
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
    phase=state.pending.santa.contest?'Fireside Chat':'Naughty or Nice';heading='Resolve the ability roll';detail=state.pending.santa.contest?'Each die belongs to its actual roller. Equal or greater wins, including ties. Dice can be altered before comparison.':'The final die determines whether the opponent is naughty or nice. Dice can be altered before resolution.';content=rollDisplay(rollContext(state))+button('resolveSantaRoll','Resolve the roll','class="primary"');
  } else if(state.mysticTask&&state.stage==='mysticChoices'){
    const t=state.mysticTask,h=t.queue[0];phase='Mystic Brawler';heading=names[t.seat];
    if(h.kind==='strengths'){heading=`Choose Strengths · ${h.left} remaining`;detail='Allocate the whole batch before the tokens are gained. Each type has its own stack limit.';content=mysticBrawler.gainOptions(state).map(key=>button('mysticStrength',`${statusLabel(key)} · ${(state.players[t.seat][key]??0)+(h.allocation[key]??0)}/${mysticBrawler.caps[key]}`,`data-status="${key}"`)).join('');}
    if(h.kind==='tectonic'){heading='Tectonic Punch';detail='Removing a Mountain adds 3 ability damage, but that removed token no longer contributes its persistent +1.';content=button('mysticTectonic','Gain Strength of the Mountain','data-status="gain"')+(state.players[t.seat].strengthMountain?button('mysticTectonic','Remove a Mountain · add 3 damage','data-status="remove"'):'');}
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
    content=tray(state.dice,f.seat,false)+f.candidates.map(i=>button('iceChooseFrozen',`Freeze die ${i+1} (${state.dice[i]})`,`data-index="${i}"`)).join('');
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
    content=tray(r.dice,r.seat,false)+(r.kind==='high'&&r.magicLeft?r.dice.map((v,i)=>button('gambitMagicReroll',`Card Magic · reroll die ${i+1} (${v}) · ${r.magicLeft} remaining`,`data-index="${i}"`)).join(''):'')+button('gambitResolveRoll','Resolve roll','class="primary"');
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
    content=button('thorOverflowDraw','Spend 4 · draw a card, then gain the pending tokens','class="primary"')+button('thorOverflowKeep','Keep 4 Electrokinesis');
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
  } else if(!state.response&&state.lokiBag&&!state.cardRoll&&!state.retry){
    const t=state.lokiBag;phase=t.outwit?'Outwit!':'Upkeep · Bag of Tricks';
    if(t.kind==='roll'){
      heading=`${names[t.seat]} rolls for ${t.outwit?'Outwit!':'Bag of Tricks'}`;detail=t.outwit?'On 1–5, Loki chooses heal 3, gain 3 CP or receive 3 damage. On 6, gain 4 CP.':'On 1 lose 1 CP; on 2–5 its original Loki chooses heal 2, gain 1 CP or receive 2 damage; on 6 gain 2 CP.';
      content=tray(t.dice,t.seat,false)+button('resolveTrickBag','Resolve roll','class="primary"');
    } else {
      heading=`${names[t.owner]} chooses the result`;detail=`Choose for ${names[t.seat]}.${t.outwit?'':' Healing and damage apply together at the end of Upkeep.'}`;
      content=button('chooseTrickBag',`Heal ${t.amount}`, 'data-status="heal"')+button('chooseTrickBag',`Gain ${t.outwit?3:1} CP`,'data-status="cp"')+button('chooseTrickBag',`Receive ${t.amount} damage`,'data-status="damage"');
    }
  } else if(!state.response&&allowed.rollTrickBag){
    phase='Upkeep · Bag of Tricks';heading=`${activeName} resolves a Bag of Tricks`;detail='Resolve each token separately. Choose which to remove and roll first.';
    content=blankRoll(1)+(state.players[state.active].trickBags??[]).map(b=>button('rollTrickBag',`Roll Bag of Tricks from ${names[b.owner]}`,`data-index="${b.id}"`)).join('');
  } else if(state.premonitionTask){
    const t=state.premonitionTask,player=state.players[t.seat];phase='Income Phase';heading=`${actingName} uses Premonition`;
    if(t.kind==='choose'){
      detail='Choose the normal draw or spend Premonition. After spending tokens, return one of the drawn cards to your deck.';
      content=button('choosePremonition','Normal Income · draw 1','data-amount="0"')+(player.premonition>=1?button('choosePremonition','Spend 1 Premonition · draw 2','data-amount="1"'):'')+(player.premonition>=3?button('choosePremonition','Spend 3 Premonition · draw 3','data-amount="3"'):'');
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
    content=tray(state.cosmicRayRoll.dice,seat,false)+state.cosmicRayRoll.dice.map((value,index)=>button('chooseCosmicRay',`Choose die ${index+1} · +${dieValue(value,state.players[seat])} damage`,`data-index="${index}"`)).join('');
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
  } else if(!state.response&&state.widowBombRoll&&!state.cardRoll&&!state.retry){
    phase='Time Bomb';heading=`${actingName} attempts to defuse a bomb`;
    detail='On a 6, remove the bomb. Otherwise advance its countdown.';
    content=tray(state.widowBombRoll.dice,seat,false)+button('widowBombResolve','Resolve bomb roll','class="primary"');
  } else if(allowed.widowBombRoll){
    phase='Upkeep · Time Bombs';heading=`${actingName} checks Time Bombs`;
    content=blankRoll(1)+(state.players[state.active].timeBombTimers??[]).filter(b=>!(state.widowBombChecked??[]).includes(b.id)).map(b=>button('widowBombRoll',`Roll for bomb · 0:0${b.ticks}`,`data-index="${b.id}"`)).join('');
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
    phase='Upkeep · Phoenix Burn';heading=`${activeName} resolves Phoenix Burn`;detail='Receive 2 damage first, then roll to remove the token. Damage can be prevented normally.';content=button('checkPhoenixBurn','Resolve Phoenix Burn damage','class="primary"');
  } else if(!state.response&&state.jeanBurnRoll&&!state.cardRoll&&!state.retry){
    phase='Upkeep · Phoenix Burn';heading='Roll to remove Phoenix Burn';detail='A 5 or 6 removes the token. This roll may be modified before it resolves.';content=tray(state.jeanBurnRoll.dice,state.jeanBurnRoll.seat,false)+button('resolvePhoenixBurn','Resolve removal roll','class="primary"');
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
    detail='Choose the target after the response.';
    content=`<div class="controls">${mainTargets(state,seat,id).map((choice,i)=>
      button('resolveMainChoice',tokenChoiceLabel(state,choice,seat),`data-choice="${i}"`)).join('')}</div>`;
  } else if(state.response) {
    phase=state.stage==='offence'?'Offensive Roll':
      ['defence','defenceResponse'].includes(state.stage)||state.gunContest?.kind==='duel'&&state.stage==='gunContest'?'Defensive Roll':'Response';
    heading=`${names[responding]} can respond`;
    const context=rollContext(state);
    detail=phase==='Defensive Roll' && pendingAbility ? `${pendingAbility} brings ${p.damage} incoming damage.` : 'Use an available effect or pass.';
    content=(context?rollDisplay(context):'')+`<div class="controls">
      ${allowed.evade?button('evade','Spend Evasive'):''}${allowed.evadeReturn?button('evadeReturn','Spend Evasive'):''}
      ${button('passResponse','Pass','class="primary"')}</div>`;
  } else if(state.mesmerizeRoll){
    const effect=state.mesmerizeRoll;
    phase='Status effect roll'; heading='Mesmerize';
    if(effect.choosing){
      const context=rollContext({...state,stage:effect.resume,mesmerizeRoll:null});
      content=rollDisplay(context)+diceOwnedBy(context,1-effect.seat,state).map((value,index)=>
        button('rerollMesmerized',`Reroll die ${index+1} (${value})`,`data-index="${index}"`)).join('')+
        button('rerollMesmerized','Keep the current roll','data-index="-1"');
    } else {
      detail='A 5 or 6 lets you reroll one of the opponent’s dice.';
      content=tray(effect.dice,effect.seat,false)+button('resolveMesmerize','Resolve Mesmerize','class="primary"');
    }
  } else if(state.bleedRoll&&!state.cardRoll){
    phase='Upkeep'; heading='Bleed';
    detail='On 1–4, take 1 damage. On 5–6, remove one Bleed.';
    content=tray(state.bleedRoll,state.active,false)+button('resolveBleed','Resolve Bleed','class="primary"');
  } else if(state.cardRoll) {
    phase='Effect roll'; heading=state.cardRoll.id===null?'Wellspring':seatCard(state,seat,state.cardRoll.id).name;
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
    phase='Main Phase response'; heading=`${actingName} can respond`;
    detail=`${seatCard(state,state.mainAction.seat,state.mainAction.id).name} is pending.`;
    content=button('finishMainCard','Pass and resolve','class="primary"');
  } else switch (state.stage) {
    case 'tacticalRestart':
      phase='Offensive Roll'; heading='Profiteer';
      content=button('restartTacticalOffence','Begin additional Offensive Roll Phase','class="primary"');
      break;
    case 'offence':
      phase='Offensive Roll';
      heading=`${actingName} rolls`;
      detail=state.budget===0?'Influence removed all Roll Attempts. End this phase, spend Déjà Vu, or play One More Time! to gain a Roll Attempt.':state.players[state.active].decrepify&&state.attempts?'Decrep-ify · hold at least three dice to reroll.':state.attempts ? 'Tap dice to keep them, reroll the rest, or announce an available ability.' : 'Roll all five dice to begin.';
      if(state.stormDice)detail+=` ${state.stormDice.count} borrowed ${HEROES[state.stormDice.hero].name} ${state.stormDice.count===1?"die":"dice"} join the five ordinary dice.`;
      content=tray(offenceDice(),seat,!!allowed.hold,state.held)
        + `<div class="controls">${button('roll',state.attempts?(constrictCost(state)?'Reroll · 1 CP':'Reroll'):'Roll dice',`class="primary" ${allowed.roll?'':'disabled'}`)}
        ${button('end','End without an ability',allowed.end?'':'disabled')}</div>`
        + offenceAbilities(seat, allowed.declare);
      break;
    case 'announce':
      phase='Ability response'; heading=`${actingName} responds`;
      detail=`${activeName} announces ${pendingAbility}.`;
      content=tray(state.dice,state.active,false)+button('accept','Accept roll','class="primary"'); break;
    case 'blind':
      phase='Blind check'; heading=`${actingName} checks Blind`;
      detail='A 1 or 2 cancels the ability.';
      content=tray([state.effectDie],seat,false)+button('resolveBlind','Resolve Blind','class="primary"'); break;
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
      content=p.possessChoice?button('chooseVampireBenefit','Inflict Bleed','data-choice="0"')+
        button('chooseVampireBenefit','Gain Mesmerize','data-choice="1"'):
        button('chooseVampireBenefit','Keep Mesmerize','data-choice="0"')+
        button('chooseVampireBenefit','Spend Mesmerize · make undefendable','data-choice="1"');
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
      content=tray(pending.dice,seat,false)+
        (pending.rerolls?pending.dice.map((value,i)=>button('rerollUndead',`Reroll die ${i+1} (${value}) · ${pending.rerolls} left`,`data-index="${i}"`)).join(''):'')+
        button('resolveUndead','Resolve Undead roll','class="primary"');
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
      if(p.explosion)content=Array.from({length:Math.min(p.explosion,player.corpses)+1},(_,n)=>
        button('necroChoice',`Spend ${n} Corpses`,`data-amount="${n}"`)).join('');
      else if(p.shroud){
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
      content=(allowed.spendGuardBreak?button('spendGuardBreak','Spend Guard Break and roll'):'')+
        button('skipGuardBreak','Continue attack','class="primary"');
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
    case 'ravenNevermoreRoll':
      phase='Upkeep';heading='Nevermore Die Roll';
      content=tray(state.nevermoreRoll.dice,seat,false)+button('resolveNevermore','Resolve Nevermore die','class="primary"');
      break;
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
        (allowed.rollPrey?blankRoll(1)+button('rollPrey','Roll for Prey','class="primary"'):'')+button('skipPrey','Continue attack');
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
      if(allowed.rollNevermore){
        heading='Nevermore';detail=`${activeName} starts their upkeep with Nevermore.`;
        content=blankRoll(1)+button('rollNevermore','Roll the Nevermore die','class="primary"');
        break;
      }
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
        content=move+(hero.dreadful>=4?button('horseUpkeep','Terrorize · spend 4 Dreadful','data-status="terrorize"'):'')+
          button('horseUpkeep','Skip Headless Mayhem','data-status="skip"');
        break;
      }
      detail=[hero.sunDial!==undefined&&!hero.sunDawn&&!state.sunUpkeep?'Dusk increases the Sun Dial by 1.':'',hero.moonShard===3&&!hero.werewolf?'Twilight flips Pale Lady to Werewolf.':'',heroId(state,state.active)===gunslinger.id&&hero.reload!==2&&!state.quickDrawChecked?'Quick Draw grants Reload.':'',hero.nyra?.downed?(hero.nyra.hp>=5?'Nyra becomes Active.':'Nyra heals 1 and remains Downed.'):'',hero.bleed&&!state.bleedChecked?`Roll for ${hero.bleed} Bleed.`:'',hero.holyPresence&&!state.holyPresenceChecked?`Holy Presence deals ${hero.holyPresence} damage to ${names[1-state.active]}.`:'',heroId(state,state.active)===7&&!state.fertilized?'Fertilize grows one Spirit.':'',hero.fireMastery?'Lose 1 Fire Mastery.':'',hero.cursed?'Cursed deals 4 unpreventable damage.':'',hero.powderKeg&&!state.pirateKegChecked?'Roll for Powder Keg.':'',cursedPirate.foreignCoins(state,state.active)?'Opponent’s Doubloons deal upkeep damage.':'',hero.burn&&!state.upkeepEvaded?'Burn deals 2 damage.':'',hero.poison&&!state.upkeepEvaded?`Poison deals ${hero.poison} damage.`:'',state.upkeepPrevention?`Chi prevents ${state.upkeepPrevention} damage.`:''].filter(Boolean).join(' ');
      content=(allowed.checkWound?button('checkWound','Resolve a Wound token'):'')+
        (allowed.checkRegenerate?button('checkRegenerate','Resolve Regenerate'):'')+(allowed.collectSynth?button('collectSynth','Use Scrap Collector'):'')+(allowed.clearNanites?button('clearNanites','Check Nanites'):'')+
        (allowed.evadeUpkeep?button('evadeUpkeep','Spend Evasive'):'')+(allowed.resolveUpkeep?button('resolveUpkeep','Resolve upkeep','class="primary"'):'');
      break;
    }
    case 'artSpanner':
      phase='Ability roll'; heading=pendingAbility;
      content=button('chooseSpanner','Roll one die','data-choice="0"')+button('chooseSpanner','Spend 1 Synth to roll three dice','data-choice="1"');
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
      content=tray([state.effectDie],seat,false)+button('resolvePirateKeg','Resolve Powder Keg','class="primary"'); break;
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
      content=`<div class="controls">${Array.from({length:max+1},(_,i)=>button('chooseMastery',`${i} tokens · ${i*p.combustRate} damage`,`data-amount="${i}"`)).join('')}</div>`;
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
      content=`<div class="controls">${allowed.spendSneak?button('spendSneak','Spend Sneak Attack','class="primary"'):''}${button('skipSneak','Continue without Sneak Attack')}</div>`;
      break;
    case 'sneakRoll':
      phase='Attack modifier';heading='Sneak Attack roll';
      content=tray([state.effectDie],seat,false)+button('resolveSneak','Add die value to damage','class="primary"');
      break;
    case 'dryadResponse':
      phase='Status response'; heading=`${actingName} can prevent an incoming status`;
      content=button('acceptStatuses','Apply ability effects','class="primary"');
      break;
    case 'spiritPayment':
      phase='Ability choice'; heading=pendingAbility;
      content=spiritDiscards(state.players[state.active],p.spiritCost).map((choice,i)=>button('paySpirits',discardLabel(choice),`data-choice="${i}"`)).join('');
      break;
    case 'overgrowthWells':
      phase='Ability choice'; heading=pendingAbility;
      content=button('finishOvergrowth','Continue with defendable damage','data-choice="0"')
        +(state.players[state.active].wellspring?button('finishOvergrowth','Spend Wellspring for undefendable damage','data-choice="1"'):'');
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
      content=tray([state.effectDie],seat,false)+button('resolveNinjutsu','Resolve Ninjutsu','class="primary"'); break;
    case 'ninjutsuChoice':
      phase='Attack modifier'; heading='Choose a Ninjutsu effect';
      content=tray([state.effectDie],seat,false)+ninjutsuOutcomes(state).map(status=>button('chooseNinjutsu',ninjutsuLabel(status),`data-status="${status}"`)).join(''); break;
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
    case 'effect':
      phase='Ability roll'; heading=pendingAbility;
      detail=`${actingName} rolls ${effectDiceCount(p,state.players[state.active])} separate effect dice to determine the ability’s effects.`;
      content=blankRoll(effectDiceCount(p,state.players[state.active]))+button('rollEffect','Roll for effect','class="primary"'); break;
    case 'effectResponse':
      if(p.effect==='thorChain'){
        phase='Chain Lightning';heading='Choose any two dice';detail=`Their total becomes the attack damage. The separate ${p.thor.chain} collateral damage resolves first.`;
        const dice=effectiveDice(p.effectDice,state.players[state.active]);let choice=0;
        content=effectRoll;for(let i=0;i<dice.length;i++)for(let j=i+1;j<dice.length;j++)content+=button('chooseThorChain',`Dice ${i+1} + ${j+1} · ${dice[i]+dice[j]} damage`,`data-choice="${choice++}"`);break;
      }
      phase='Ability roll'; heading=pendingAbility;
      detail='Modify the ability roll or resolve it.';
      const rerolls=[];
      if (allowed.abilityReroll) rerolls.push({type:'abilityReroll',limit:p.ninjaRerolls});
      if (allowed.effectRetry) rerolls.push({type:'effectRetry',limit:1,
        label:p.tempestChi?'Spend 1 Chi to reroll':'Reroll selected die'});
      content=rerollTray({dice:p.effectDice,seat:state.active},rerolls)+button('resolveEffect','Resolve effect roll','class="primary"');
      break;
    case 'targeting':
      phase='Targeting'; heading=`${pendingAbility} targets ${names[1-seat]}`;
      content=button('resolveTarget','Apply ability effects','class="primary"'); break;
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
        if (spiderMan.canSenseReroll(state,responding)) rerolls.push({type:'spiderSenseReroll',limit:state.defenceDice.length,
          label:'Reroll with Spider-Sense · discard Invisibility'});
        if (heroId(state,responding)===blackWidow.id&&blackWidow.count(state.players[responding])>=4&&!p.widowDefenceRerolled)
          rerolls.push({type:'widowDefenceReroll',limit:state.defenceDice.length,label:'Reroll with Sabotage'});
        content=effectRoll+rerollTray({dice:state.defenceDice,seat},rerolls);
        content+=`<div class="controls">${allowed.evade?button('evade','Spend Evasive before resolving defence'):''}
          ${button('resolveDefence','Resolve defence','class="primary"')}</div>`;
      } else {
        const defences=defenceKinds(seat);
        const options=allowed.defend?defences.map(kind=>button('defend',`Roll ${abilityName(defenceName(state,seat,kind))}`,`class="primary" data-defence="${kind}"`)).join(''):'';
        const defender = heroRoster[heroId(state,seat)];
        const readyDice = !allowed.defend ? '' : defender.id === gunslinger.id
          ? blankRoll(2,[state.active,seat])
          : defences.length === 1 ? blankRoll(defender.defenceDiceCount(state.players[seat],defences[0])) : '';
        content=effectRoll+readyDice+`<div class="controls">${options}${button('skipDefence',allowed.defend?'Decline defence':'Continue with Shadows')}</div>`;
      } break;
    case 'nyraDamage': {
      phase='Damage assignment'; heading='Huntress and Nyra';
      const total=nyraIncoming(state), companion=state.players[seat];
      detail=`Assign ${total} incoming damage. Nyra has ${companion.nyra.hp} Health${p.nyraDefenceHeal?` and ${p.nyraDefenceHeal} defence healing pending`:''}.`;
      content=`<div class="controls">${button('settle',`Huntress takes all ${total}`,'data-amount="0"')}
        ${button('settle',`Nyra takes all ${total}`,`data-amount="${total}"`)}</div>`;
      if(companion.nyraBond&&total>1)content+=`<div class="controls"><label>Damage to Nyra
        <select id="nyra-damage">${Array.from({length:total-1},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select></label>
        ${button('settle','Spend Nyra’s Bond to split damage','data-nyra-split="true"')}</div>`;
      break;
    }
    case 'damage':
      phase='Damage response'; heading=`${actingName} responds`;
      detail=`${pendingAbility ? `${pendingAbility} · ` : ''}${incomingDamage(state)} incoming damage${shadowAvoids(state)&&p.damage?' after Shadows':p.pure?' (pure)':p.undefendable?' (undefendable)':''}${returnDamageFor(state) ? ` · ${returnDamageFor(state)} return damage` : ''}.${p.recoil && incomingDamage(state) ? ` Barbarian takes ${p.recoil} recoil damage if this attack hits.` : ''}`;
      content=(state.defenceDice.length ? tray(state.defenceDice,seat,false):'')
        +`<div class="controls">${allowed.evade?button('evade',`${actingName} spends Evasive`):''}${allowed.evadeReturn?button('evadeReturn',`${activeName} spends Evasive`):''}${allowed.reopenPrey?button('reopenPrey','Use Prey'):''}${button('settle',footworkPending?'Apply Footwork bonus':nyraIncoming(state)?'Assign damage':'Resolve damage','class="primary"')}</div>`; break;
    case 'evasion':
      phase='Avoid damage'; heading=`${actingName} checks ${statusLabel(state.evasionToken??'evasive')}`;
      detail=state.evasionToken==='smoke'?'A 1–3 avoids the incoming damage.':'A 1 or 2 avoids the incoming damage.';
      content=tray([state.effectDie],seat,false)+button('resolveEvade','Resolve roll','class="primary"'); break;
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
      phase=state.pending.santa.contest?'Fireside Chat':'Naughty or Nice';heading=`Target ${names[1-state.active]}`;detail='The opponent is targeted before the subsidiary dice are rolled.';content=(p.santa.contest?blankRoll(2,[state.active,1-state.active]):blankRoll(1))+button('rollSantaAbility',p.santa.contest?'Roll both dice':'Roll die','class="primary"');break;
    case 'santaPrepared':
      phase='Santa';heading='Continue the activated ability';content=button('finishSantaPrepared','Continue ability','class="primary"');break;
    case 'santaExtraRoll':
      phase='Comfort and Joy!';heading='Additional Offensive Roll Phase';detail='Target the same opponent again. Income is not repeated; effects that expire at the end of the previous Roll Phase have cleared.';content=button('startSantaRoll','Start the additional Roll Phase','class="primary"');break;
    case 'mysticAbility':
      phase='Mystic Brawler';heading=pendingAbility;content=button('finishMysticAbility','Resolve ability effects','class="primary"');break;
    case 'mysticStrongTarget':
      phase='Targeting · Strong Arm';heading=`Strong Arm targets ${names[1-state.active]}`;detail='Both players roll one die after targeting.';content=blankRoll(2,[state.active,1-state.active])+button('rollMysticContest','Roll both dice','class="primary"');break;
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
      content=alchemist.spendChoices(state,responding).map((choice,i)=>
        button('spendPotion',tokenChoiceLabel(state,{key:choice.key,label:choice.label},responding),`data-choice="${i}"`)).join('')+
        button('finishAlchemistPotions','Finish spending Potions','class="primary"');break;
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
      phase='Charged Effect';heading=pendingAbility;detail='The ability was Charged before activation. Remove its Lightning for the Charged Effect, or keep it.';content=button('stormUseCharge','Remove Lightning · use Charged Effect','class="primary"')+button('stormKeepCharge','Keep the Lightning');break;
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
      content=(allowed.spendGlide?button('spendGlide','Spend Glide · activate the connected ability','class="primary"'):'')+button('skipGlide','Continue to Main Phase 2');break;
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
      phase='Combo';heading=`${activeName} may attack again`;detail='Spend Combo for another Offensive Roll Phase against the same opponent. No Income or Main Phase occurs between these rolls. Combo can only be spent once per turn.';content=(allowed.spendCombo?button('spendCombo','Spend Combo · start another Offensive Roll Phase','class="primary"'):'')+button('skipCombo','Continue to Main Phase 2');break;
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
  const effects = matchEffects(state, responding);
  const attackerEffects = allowed.defend && hasEffectResponse(state, state.active)
    ? matchEffects(defenceAttackerView(state), state.active, (action, label, attrs = '') =>
      button(action, label, `data-attacker-effect="true" ${attrs}`))
    : '';
  const playing = state.stage !== 'finished';
  const decisionName = names[decisionSeat];
  return `<section class="arena" aria-label="Match actions">
    <div class="phase"><span>Turn ${state.turn} · ${phase}</span><span>${state.stage==='offence' ? `Roll ${state.attempts}/${state.budget}` : ''}</span></div>
    ${playing?`<div class="decision-owner" data-player="${decisionSeat}">
      <strong>${decisionName} to act</strong>
      ${decisionSeat!==state.active?`<span>${activeName}’s turn</span>`:''}
    </div>`:''}
    <h2 tabindex="-1" id="action-title">${heading}</h2>
    ${detail?`<p>${detail}</p>`:''}
    ${defenceReference()}
    ${p?.paralyzePrevented?.length?`<p>Paralyze prevented: ${p.paralyzePrevented.map(statusLabel).join(', ')}.</p>`:''}
    <div class="decision-actions">${content}</div>
    ${effects?`<details class="match-effects" data-disclosure="effects-${state.stage}-${responding}" ${!content?'open':''}><summary>Available effects · ${names[responding]}</summary><div class="effect-options">${effects}</div></details>`:''}
    ${attackerEffects?`<details class="match-effects" data-disclosure="defence-attacker-effects"><summary>${activeName} · effects before the defence roll</summary><div class="effect-options">${attackerEffects}</div></details>`:''}
    <details class="action-log" data-disclosure="action-log"><summary>Action log</summary><ol reversed>${state.log.slice(0,35).map(event=>`<li>${event}</li>`).join('')}</ol></details>
    ${matchTools(responding)}
    </section>`;
}

function matchEffects(state, responding, renderButton = button) {
  let content = '';
  if(!state.psyReveal){
  for(const [choice,c] of deadpool.onomChoices(state,responding).entries())content+=renderButton('spendOnomatopoeia',c.label,`data-choice="${choice}"`);
  if(deadpool.canRps(state,responding))content+=renderButton('spendRps','Spend RPS · play Rock, Paper, Scissors');
  if(deadpool.canDonut(state,responding))content+=renderButton('spendDonut','Spend Donut · roll for healing');
  for(const [choice,c] of santa.cheerChoices(state,responding).entries())content+=renderButton('spendCheer',c.label,`data-choice="${choice}"`);
  if(santa.canNog(state,responding))content+=renderButton('spendEggNog','Spend 3 Egg Nog · roll for a benefit');
  for(const n of mysticBrawler.oceanChoices(state,responding))content+=renderButton('spendOcean',n===1?'Spend 1 Ocean · gain 1 CP':'Spend 2 Ocean · gain 1 CP and heal 2',`data-amount="${n}"`);
  if(krampus.canGift(state,responding))content+=renderButton('spendGift','Spend Gift · draw 1 Reject');
  if(!(state.krampusTask&&state.stage==='krampusChoices'&&state.krampusTask.queue[0]?.kind==='free'))for(const [i,c] of krampus.options(state,responding).entries())content+=renderButton('activateReject',c.label,`data-choice="${i}"`);
  const lab=alchemist.labChoices(state,responding);
  if(lab.length)content+=`<div class="token-actions"><label>The Lab <select id="alchemist-lab-${responding}">${lab.map((c,i)=>`<option value="${i}">${c.label}</option>`).join('')}</select></label>${renderButton('alchemistLab','Remove Potion and reroll')}</div>`;
  for(const [i,c] of wolverine.rageChoices(state,responding).entries())content+=renderButton('spendRage',c.label,`data-choice="${i}"`);
  }
  if(!state.deadpoolRps&&!(state.deadpoolTask&&state.stage==='deadpoolChoices')&&!state.santaGift&&!(state.santaTask&&state.stage==='santaChoices')&&!(state.mysticTask&&state.stage==='mysticChoices')&&!state.krampusActivation&&state.krampusOverflow===undefined&&!(state.krampusTask&&state.stage==='krampusChoices')&&!(state.alchemistTask&&state.stage==='alchemistChoices')&&!state.psyReveal&&!state.wolverineGain&&!state.wolverineIntimidate&&!(state.stormTask&&state.stage==='stormChoices')){
  if(storm.canTornado(state,responding))content+=renderButton('spendTornado',`Spend Tornado · borrow one opposing die (${state.stormDice?.count??0}/5 borrowed)`);
  if(storm.canWind(state,responding))content+=renderButton('spendWindShear',state.players[responding].ragingWindsTurn===state.turn?'Spend Wind Shear · prevent 4 and deal 4 isolated damage':'Spend Wind Shear · prevent 2 and deal 2 isolated damage');
  if(storm.oppReroll(state,responding))content+=`<div class="controls">${renderButton('stormOppReroll','Reroll effect die 1','data-status="first"')}${renderButton('stormOppReroll','Reroll effect die 2','data-status="second"')}${renderButton('stormOppReroll','Reroll both effect dice','data-status="both"')}</div>`;
  for(const c of rogue.ionicChoices(state,responding))content+=renderButton('spendIonic',c.label,`data-status="${c.key}"`);
  if(rogue.canExpand(state,responding))content+=renderButton('expandIonic','Pay 1 CP · allow four Ionic tokens this turn');
  if(rogue.canSkyward(state,responding))content+=renderButton('spendSkyward','Spend Skyward · both players roll');
  if(rogue.boostLeach(state,responding))content+=renderButton('rogueLeachBoost','Pay 1 CP · add 1 to Leach die');
  }
  if(!state.deadpoolRps&&!(state.deadpoolTask&&state.stage==='deadpoolChoices')&&!state.santaGift&&!(state.santaTask&&state.stage==='santaChoices')&&!(state.mysticTask&&state.stage==='mysticChoices')&&!state.krampusActivation&&state.krampusOverflow===undefined&&!(state.krampusTask&&state.stage==='krampusChoices')&&!(state.alchemistTask&&state.stage==='alchemistChoices')&&!state.psyReveal&&!state.wolverineGain&&!state.wolverineIntimidate&&!state.rogueGain&&!(state.stormTask&&state.stage==='stormChoices')){
  for(const c of psylocke.swaps(state,responding))content+=renderButton('manifestSwap',c.label,`data-index="${c.index}"`);
  if(psylocke.canBoost(state,responding))content+=renderButton('manifestBoost',`Use Manifest ${state.players[responding].manifestDie} · add ${Math.ceil(dieValue(state.players[responding].manifestDie,state.players[responding])/2)} attack damage`);
  for(const [i,c] of psylocke.infiltrationChoices(state,responding).entries())content+=renderButton('spendInfiltration',c.label,`data-choice="${i}"`);
  for(const [i,c] of jeanGrey.acuityChoices(state,responding).entries())content+=renderButton('spendAcuity',c.label,`data-choice="${i}"`);
  for(const [i,c] of jeanGrey.flameChoices(state,responding).entries())content+=renderButton('spendFlameBlast',c.label,`data-choice="${i}"`);
  for(const [i,c] of jeanGrey.fieldChoices(state,responding).entries())content+=renderButton('spendForceField',c.label,`data-choice="${i}"`);
  if(!state.iceFreezeChoice&&iceman.canConvert(state,responding))content+=renderButton('iceConvert','Spend 5 board Ice Shards · gain Glide');
  if(!state.iceFreezeChoice&&iceman.canFreezerConvert(state,responding))content+=renderButton('iceFreezerConvert','Convert 5 stored Ice Shards into stored Glide');
  const explode=gambit.canExplode(state,responding),dissolve=gambit.dissolveChoices(state,responding);
  if(explode.length)content+=`<div class="token-actions"><strong>Explode one Ace · Attack Modifier</strong><div class="controls">${explode.map(suit=>renderButton('gambitExplode',`Explode ${statusLabel(suit)}`,`data-status="${suit}"`)).join('')}</div></div>`;
  if(dissolve.length)content+=`<details class="token-actions"><summary>Spend Dissolution</summary><div class="controls">${dissolve.map((choice,i)=>renderButton('spendDissolution',choice.label,`data-choice="${i}"`)).join('')}</div></details>`;
  const support=state.iceFreezeChoice||gambit.forced(state)?[]:cyclops.supportChoices(state,responding),battlePlan=state.iceFreezeChoice||gambit.forced(state)?[]:cyclops.battleChoices(state,responding);
  if(support.length)content+=`<details class="token-actions"><summary>${names[responding]} · spend Support</summary><div class="controls">${support.map((choice,i)=>renderButton('spendSupport',choice.label,`data-choice="${i}"`)).join('')}</div></details>`;
  if(battlePlan.length)content+=`<details class="token-actions"><summary>${names[responding]} · spend Battle Plan</summary><div class="controls">${battlePlan.map((choice,i)=>renderButton('spendBattlePlan',choice.label,`data-choice="${i}"`)).join('')}</div></details>`;
  if(cyclops.canRecourse(state,responding))content+=renderButton('cyclopsRecourse','Remove 2 Battle Plan · activate Recourse II against this undefendable attack');
  if(thor.canDraw(state,responding)&&!state.thorOverflow)content+=renderButton('thorDraw','Spend 4 Electrokinesis · draw a card');
  if(thor.canMove(state,responding))content+=`<details class="token-actions"><summary>Mjölnir · discard a card to ${thor.holder(state,responding)===responding?'throw':'retrieve'}</summary><div class="controls">${state.players[responding].hand.map((id,i)=>previewableOption(state,responding,id,renderButton('thorPassive',`Discard ${seatCard(state,responding,id).name}`,`data-index="${i}"`))).join('')}</div></details>`;
  if(!state.iceFreezeChoice&&!gambit.forced(state)&&!cyclops.choosing(state)&&!state.thorOverflow&&!(state.thorTask&&state.stage==='thorSequence')&&!state.conjureTask&&!state.lokiTask&&!state.lokiIllusion&&state.lokiBag?.kind!=='choose'){
  const probability=scarletWitch.probabilityChoices(state,responding);
  if(probability.length)content+=`<div class="token-actions"><strong>${names[responding]} · Probability Manipulation</strong><div class="controls">${probability.map((choice,i)=>renderButton('spendProbability',choice.label,`data-choice="${i}"`)).join('')}</div></div>`;
  const scarletChanges=scarletWitch.defenceChanges(state,responding);
  if(scarletChanges.length)content+=`<details class="token-actions"><summary>${abilityName('Double Trouble II')} · discard Probability Manipulation to change any die</summary><div class="controls">${scarletChanges.map((choice,i)=>renderButton('scarletDefenceChange',choice.label,`data-choice="${i}"`)).join('')}</div></details>`;
  if(scarletWitch.canCrackle(state,responding))content+=renderButton('spendCrackle',`Spend Crackle · +${Math.min(3,Math.max(0,scarletWitch.countedStatuses(state.players[responding])-1))} damage`);
  const conjure=scarletWitch.conjureChoices(state,responding);
  if(conjure.length)content+=`<details class="token-actions"><summary>Spend Conjure</summary><div class="controls">${conjure.map((choice,i)=>renderButton('spendConjure',choice.label,`data-choice="${i}"`)).join('')}</div></details>`;
  if(!state.response||state.response.seat===state.active){
    if(sunElf.canGem(state,state.active))content+=renderButton('spendChargedGem','Spend Charged Gem');
    const player=state.players[state.active];
    if(sunElf.canDawn(state,state.active))content+=renderButton('spendSunDawn',`Use Dawn · +${player.sunDial} damage`);
  }
  if(spiderMan.canInvisibility(state,responding))content+=renderButton('spendInvisibility','Spend Invisibility · activate a Defensive Ability');
  if(state.response&&spiderMan.canSenseReroll(state,responding))content+=rerollTray({dice:state.defenceDice,seat:responding},
    [{type:'spiderSenseReroll',limit:state.defenceDice.length,label:'Reroll with Spider-Sense · discard Invisibility'}]);
  if(loki.canIllusion(state,responding))content+=renderButton('spendIllusion',`${names[responding]} · spend Illusion`);
  if(doctorStrange.canPrepare(state,state.active))content+=`<div class="token-actions"><strong>Book of Vishanti · prepare once per turn</strong><div class="controls">${state.players[state.active].hand.filter(doctorStrange.isSpell).map(id=>previewableOption(state,state.active,id,renderButton('prepareSpell',`Prepare ${doctorStrange.spells[id]}`,`data-index="${id}"`))).join('')}</div></div>`;
  if(doctorStrange.canDeja(state,state.active))content+=renderButton('spendDejaVu',`${names[state.active]} · spend Déjà Vu and restart the roll`);
  if(captainMarvel.canRay(state,responding))content+=renderButton('spendCosmicRay','Spend Cosmic Ray · roll 2 dice');
  for(const die of captainMarvel.radianceDice(state,responding))content+=renderButton('spendRadiance',`Spend Radiance · defence die ${die.index+1} (${die.value}) → 6`,`data-index="${die.index}"`);
  if(blackWidow.canCovert(state,responding))content+=renderButton('spendCovertOps','Spend Covert Ops');
  if(state.players[responding].agility&&blackWidow.incoming(state,responding))content+=renderButton('spendAgility','Spend Agility · roll to prevent half damage');
  if(state.players[responding].vibraniumSuit&&blackPanther.incoming(state,responding))
    content+=renderButton('spendVibraniumSuit','Spend Vibranium Suit · prevent 3 damage');
  const forgeActions=forgemaster.choices(state,responding).map(({label,card},i)=>{
    const select=renderButton('forgemasterAction',label,`data-choice="${i}"`);
    return card===undefined?select:previewableOption(state,responding,card,select);
  });
  if(forgeActions.length)content+=`<div class="token-actions"><strong>${names[responding]} · The Mines and The Forge</strong><div class="controls">${forgeActions.join('')}</div></div>`;
  const shapeSeats=state.response?[responding]:state.stage==='announce'?[responding,state.active]:[responding];
  for(const owner of shapeSeats){
    const options=druid.shiftChoices(state,owner);
    if(options.length)content+=`<div class="token-actions"><strong>${names[owner]} · Shape Shift</strong><div class="controls">${options.map(form=>
      renderButton('spendShapeShift',`Shift to ${druid.formName(form)} Form`,`data-target="${owner}" data-status="${form}"`)).join('')}</div></div>`;
  }
  const featherSeats=state.response?[responding]:state.nevermoreRoll?[state.nevermoreRoll.owner,state.nevermoreRoll.target]:[responding];
  for(const owner of featherSeats){
    const options=raveness.featherChoices(state,owner);
    if(options.length)content+=`<div class="token-actions"><strong>${names[owner]} · spend Feathers</strong><div class="controls">${options.map(option=>
      renderButton('spendFeather',`${option.cost} Feather · ${option.label}`,`data-target="${owner}" data-status="${option.kind}"`)).join('')}</div></div>`;
  }
  const tokens=tokenChoices(state,responding);
  const tacticalActions=tacticalChoices(state,responding).map(({cost,label},index)=>
    renderButton('spendTactical',`${cost} Tactical Advantage · ${label}`,`data-choice="${index}"`));
  const grimActions=grimChoices(state,responding).map(kind=>renderButton('spendGrim',
    kind==='attempt'?'Grim Pursuit · extra Roll Attempt':'Grim Pursuit · roll for attack damage',`data-status="${kind}"`));
  const tokenActions=state.grimOverflow?grimActions:state.stage==='nyraDamage'?[]:state.tacticalOverflow||state.tacticalRemoval?tacticalActions:[
    ...tacticalActions,
    ...grimActions,
    ...necroActions(state,responding).map(({kind,label})=>renderButton('necroAction',label,`data-status="${kind}"`)),
    ...(canHealNyra(state,responding)?[renderButton('healNyra','Nyra’s Bond · heal Nyra by 2')]:[]),
    ...nyraRerolls(state,responding).map((value,i)=>renderButton('nyraReroll',`Nyra takes 1 damage · reroll die ${i+1} (${value})`,`data-index="${i}"`)),
    ...artificerActions(state,responding).map(({key,label})=>renderButton('artificerAction',label,`data-status="${key}"`)),
    ...(canBackStrike(state,responding)?[renderButton('backStrike','Spend Back Strike')]:[]),
    ...Array.from({length:honorChoices(state,responding)},(_,i)=>renderButton('spendHonor',
      `Spend ${i+1} Honor · +${i===0?1:3} damage`,`data-amount="${i+1}"`)),
    ...(canReload(state,responding)?[renderButton('spendReload','Spend Reload')]:[]),
    ...(canMesmerize(state,responding)?[renderButton('mesmerize','Spend Mesmerize')]:[]),
    ...bloodPowerChoices(state,responding).map(({cost,label},index)=>
      renderButton('bloodPower',`${cost} Blood Power · ${label}`,`data-choice="${index}"`)),
    ...(tokens.flight?[renderButton('flight',tokens.flight==='attack'?'Flight · make the attack undefendable':'Flight · avoid incoming damage')]:[]),
    ...tokens.seedling.map((v,i)=>renderButton('seedling',`Seedling · reroll die ${i+1} (${v})`,`data-index="${i}"`)),
    ...(tokens.sapling?[renderButton('sapling','Sapling · heal 1 and gain 1 CP')]:[]),
    ...(tokens.saplingDraw?[renderButton('saplingDraw','Sapling · draw for 1 CP')]:[]),
    ...(tokens.dryad?[renderButton('dryad','Dryad · add 3 damage')]:[]),
    ...tokens.dryadPrevent.map(status=>renderButton('dryadPrevent',`Dryad · prevent ${statusLabel(status)}`,`data-status="${status}"`)),
    ...(tokens.wellspring?[renderButton('wellspring','Spend Wellspring')]:[]),
    ...(tokens.smoke?[renderButton('smoke','Spend Smoke Bomb')]:[]),
    ...(tokens.ninjutsu?[renderButton('ninjutsu','Spend Ninjutsu')]:[]),
    ...(tokens.evadeSide?[renderButton('evadeSide','Spend Evasive')]:[]),
    ...paladinBuffs.filter(key=>tokens[key]).map(key=>renderButton(key,`Spend ${statusLabel(key)}`)),
    ...tokens.cleanse.flatMap(status=>status==='spellbound'?(state.players[responding].boundAbilities??[]).map(b=>renderButton('useCleanse',`Cleanse Spellbound · ${b.key}`,`data-status="spellbound" data-index="${b.id}"`)):status==='bagOfTricks'?(state.players[responding].trickBags??[]).map(b=>renderButton('useCleanse',`Cleanse Bag of Tricks from ${names[b.owner]}`,`data-status="bagOfTricks" data-index="${b.id}"`)):status==='timeBomb'?(state.players[responding].timeBombTimers??[]).map(b=>renderButton('useCleanse',`Cleanse Time Bomb 0:0${b.ticks}`,`data-status="timeBomb" data-index="${b.id}"`)):[renderButton('useCleanse',`Cleanse ${statusLabel(status)}`,`data-status="${status}"`)]),
    ...Array.from({length:tokens.boost},(_,i)=>renderButton('boostChi',`Spend ${i+1} Chi · +${i+1} damage`,`data-amount="${i+1}"`)),
    ...Array.from({length:tokens.prevent},(_,i)=>renderButton('preventChi',`Spend ${i+1} Chi · prevent ${i+1}`,`data-amount="${i+1}"`))
  ];
  if(tokenActions.length)content+=`<div class="token-actions"><strong>${names[responding]} · spend tokens</strong><div class="controls">${tokenActions.join('')}</div></div>`;
  const tithe=state.stage==='nyraDamage'||state.grimOverflow?{}:titheChoices(state,responding);
  const titheActions=[
    ...(tithe.draw?[renderButton('titheDraw',`Draw 1 card · ${titheDrawCost(state.players[responding])} CP`)]:[]),
    ...(tithe.dice??[]).map((value,i)=>renderButton('titheReroll',`Reroll die ${i+1} (${value}) · 1 CP`,`data-index="${i}"`))
  ];
  if(titheActions.length)content+=`<div class="token-actions"><strong>${names[responding]} · ${abilityName(state.players[responding].upgrades?.Tithe?'Tithe II':'Tithe')}</strong><div class="controls">${titheActions.join('')}</div></div>`;
  }
  }
  return content;
}

function matchTools(responding) {
  if (!state.cards || state.stage === 'finished') return '';
  return `<nav class="match-tools" aria-label="Match references">
    ${button('inspect-board','Board',`class="quick-board" data-index="${responding}" aria-label="Open ${names[responding]}’s board" aria-haspopup="dialog"`)}
    <div class="match-tool-buttons">${state.players.map((_, seat) => {
      const options = handOptions(seat);
      const playable = options.filter(({choices}) => choices.length).length;
      return button('open-hand',`<span>${names[seat]}</span><small>Hand (${options.length}) · <span class="playable-count" data-available="${playable>0}">${playable} playable</span></small>`,
        `data-index="${seat}" data-responding="${seat === responding}" aria-label="Open ${names[seat]}’s hand, ${options.length} ${options.length===1?'card':'cards'}, ${playable} playable" aria-haspopup="dialog"`);
    }).join('')}</div>
  </nav>`;
}
function render() {
  const open = new Set(Array.from(match.querySelectorAll('details[data-disclosure][open]'), detail => detail.dataset.disclosure));
  if (!state || rollRequest?.setup) {
    match.innerHTML = rollRequest ? rollRequestPanel(rollRequest) :
      '<section class="arena"><h2 id="action-title">Set up a match</h2><p>Choose both heroes in Match setup.</p></section>';
  } else {
    const seat = actor(state);
    const responding = cardActor(state);
    const decisionSeat = diceEdit?.seat ?? (state.response ? responding : seat);
    match.innerHTML = hero(0, decisionSeat, responding) + hero(1, decisionSeat, responding) +
      (rollRequest ? rollRequestPanel(rollRequest) : diceEdit ? diceEditorPanel(diceEdit) : arena(seat, responding, decisionSeat));
  }
  for (const image of match.querySelectorAll('[data-defence-scan]')) {
    const seat = Number(image.dataset.seat), upgrade = image.dataset.upgrade;
    image.src = upgrade ? cardArtwork(state,seat,Number(upgrade)) : boardImage(state,seat,true);
  }
  for (const detail of match.querySelectorAll('details[data-disclosure]')) {
    if (open.has(detail.dataset.disclosure)) detail.open = true;
  }
  if(handDialog.open)renderHand();
  try {
    if (state || rollRequest) {
      const saved = rollRequest ? {...state, uiRollRequest: rollRequest} : state;
      localStorage.setItem(storageKey, JSON.stringify(saved));
    }
  } catch {}
}
function renderHand() {
  const seat=handSeat;
  handTitle.textContent=`${names[seat]}’s hand · ${state.players[seat].hand.length}`;
  handContent.innerHTML=handPanel();
}

const deckSections = {
  main:'Main Phase', roll:'Roll Phase', instant:'Instant', upgrade:'Upgrades',
  spell:'Spells', rage:'Rage', ore:'Ore', discard:'Discard pile'
};

function openDeck(seat) {
  const hero = heroId(state,seat);
  const player = state.players[seat];
  const {startingSpell, promoId = 33} = heroRoster[hero];
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
  const cards = [...copies.values()].map(({ids, name, phase}) => {
    const count = ids.length;
    const current = locations
      .map(([label, pile]) => [label, ids.filter(id => pile.includes(id)).length])
      .filter(([, quantity]) => quantity > 0);
    const outside = count - current.reduce((total, [, quantity]) => total + quantity, 0);
    if (outside > 0) current.push(['Outside draw pile', outside]);
    const status = current.map(([label, quantity]) => count > 1 ? `${label} ×${quantity}` : label).join(' · ');
    const section = ids.every(id => player.discard.includes(id)) ? 'discard' : phase;
    return {id: ids[0], name, count, status, section};
  }).sort((a,b) => a.name.localeCompare(b.name));
  deckTitle.textContent = `${names[seat]}’s deck list`;
  deckContent.innerHTML = Object.entries(deckSections).map(([section, label]) => {
    const entries = cards.filter(card => card.section === section);
    if (!entries.length) return '';
    return `<section class="deck-group"><h3>${label}</h3><ul role="list">
      ${entries.map(({id, name, count, status}) => `<li class="deck-entry">
        <span>${name}${count>1 ? ` ×${count}` : ''}<small>${status}</small>${id===startingSpell ? '<small>Starts prepared</small>' : id===promoId ? '<small>Promo</small>' : ''}</span>
        ${previewCard(state,seat,id)}
      </li>`).join('')}
    </ul></section>`;
  }).join('');
  deckDialog.showModal();
  deckContent.scrollTop = 0;
}

function handleAction(event) {
  const target=event.target.closest('button[data-action]');
  if (!target) return;
  const type=target.dataset.action, index=Number(target.dataset.index);
  if (type==='roll-request' && rollRequest && !rollRequest.initiative && !rollRequest.reveal) {
    resolveRollRequest();
    return;
  }
  if (type==='advance-roll' && (rollRequest?.initiative || rollRequest?.reveal)) {
    advanceRollRequest();
    return;
  }
  if (!state || rollRequest?.setup) return;
  if(type==='open-deck') {
    openDeck(index);
    return;
  }
  if(type==='open-hand') {
    if(!state.cards||![0,1].includes(index)||state.stage==='finished')return;
    handSeat=index;
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
    viewerSeat=index;viewerCard=null;viewerLeaflet=false;front.hidden=back.hidden=true;viewerImage.alt=`${names[index]} · Shoot ${state.players[index].shootActive?'Active':'Inactive'}`;viewerImage.src=art.deadpoolShoot[state.players[index].shootActive?0:1];document.getElementById('viewer-title').textContent=viewerImage.alt;viewer.showModal();setZoom(1);viewerScroll.scrollTo(0,0);return;
  }
  if(type==='inspect-reject'){
    viewerSeat=Number(target.dataset.seat);viewerCard=null;viewerLeaflet=false;front.hidden=back.hidden=true;viewerImage.alt=krampus.names[index];viewerImage.src=art.krampusRejects[index];document.getElementById('viewer-title').textContent=viewerImage.alt;viewer.showModal();setZoom(1);viewerScroll.scrollTo(0,0);return;
  }
  if(type==='inspect-forging'){
    const key=target.dataset.status;
    viewerSeat=index;viewerCard=null;viewerLeaflet=false;
    front.hidden=back.hidden=true;
    viewerImage.alt=key==='mining'?'Mining rules':'Crafting rules';
    viewerImage.src=art[key];
    document.getElementById('viewer-title').textContent=viewerImage.alt;
    viewer.showModal();setZoom(1);viewerScroll.scrollTo(0,0);
    return;
  }
  if(type==='inspect-freezer'){
    viewerSeat=index;viewerCard=null;viewerLeaflet=false;front.hidden=back.hidden=true;viewerImage.alt='The Freezer';viewerImage.src=art.icemanFreezer;
    document.getElementById('viewer-title').textContent=viewerImage.alt;viewer.showModal();setZoom(1);viewerScroll.scrollTo(0,0);return;
  }
  if(type==='inspect-ace'){
    viewerSeat=Number(target.dataset.seat);viewerCard=null;viewerLeaflet=false;front.hidden=back.hidden=true;
    viewerImage.alt=`${names[viewerSeat]} · ${statusLabel(gambit.suits[index])} Ace`;viewerImage.src=art.gambitAces[index];
    document.getElementById('viewer-title').textContent=viewerImage.alt;
    viewer.showModal();setZoom(1);viewerScroll.scrollTo(0,0);return;
  }
  if(type==='inspect-undead'){
    viewerSeat=index;viewerCard=null;viewerLeaflet=false;
    front.hidden=back.hidden=true;
    viewerImage.alt='Undead reference';
    viewerImage.src=art.undeadLeaflet;
    document.getElementById('viewer-title').textContent=viewerImage.alt;
    viewer.showModal();setZoom(1);viewerScroll.scrollTo(0,0);
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
  if (type==='select-potion'||type==='back-to-potions') {
    const potion=target.dataset.status, task=state.alchemistTask;
    if (state.stage!=='alchemistChoices'||task?.queue[0]?.kind!=='attach'||
        type==='select-potion'&&!alchemist.taskChoices(state).some(choice=>choice.key===potion)) return;
    selectedPotion=type==='select-potion'?potion:undefined;
    render();
    focusRollAction();
    return;
  }
  const rerollGroup = target.dataset.rerollGroup;
  if (type==='pick-reroll-die') {
    const picks = rerollPicks.get(rerollGroup) ?? new Set();
    if (picks.has(index)) picks.delete(index);
    else {
      if (Number(target.dataset.limit)===1) picks.clear();
      picks.add(index);
    }
    rerollPicks.set(rerollGroup,picks);
    render();
    match.querySelector(`button[data-action="pick-reroll-die"][data-index="${index}"][data-reroll-group="${rerollGroup}"]`)?.focus({preventScroll:true});
    return;
  }
  if (type==='sell' && (handSeat!==state.active || !canPlayFromHand(state, handSeat))) return;
  const oldState=state, oldStage=state.stage, oldSeat=cardActor(state);
  const action={type,index,id:index,ability:abilitiesFor(state,state.active)[Number(target.dataset.ability)]?.name,
    choice:Number(target.dataset.choice??0), target:Number(target.dataset.target),status:target.dataset.status, amount:Number(target.dataset.nyraSplit?document.getElementById('nyra-damage').value:target.dataset.amount), defence:target.dataset.defence};
  if (rerollGroup) {
    action.indices = [...(rerollPicks.get(rerollGroup) ?? [])].sort((a,b)=>a-b);
    if (!action.indices.length) return;
    action.index = action.indices[0];
  }
  rerollPicks.clear();
  if(target.dataset.attackerEffect)action.attackerEffect=true;
  if(type==='playCard') {
    if(!canPlayFromHand(state, handSeat))return;
    action.seat=handSeat;
    action.choice=Number(handContent.querySelector('input[name="card-choice"]:checked')?.value
      ?? document.getElementById('card-choice')?.value ?? 0);
    const plan=cardDicePlan(handSeat,index,cardChoices(state,handSeat,index));
    if(plan){
      diceEdit={...plan,picks:new Map()};
      handDialog.close();
      render();
      document.getElementById('action-title')?.focus();
      return;
    }
  }
  if(type==='deadpoolLuckyHope')action.amount=Number(document.getElementById('deadpool-lucky-hope').value);
  if(type==='alchemistLab')action.choice=Number(document.getElementById(`alchemist-lab-${action.attackerEffect?state.active:oldSeat}`).value);
  if(type==='stormOppReroll')action.indices=action.status==='both'?[0,1]:action.status==='first'?[0]:[1];
  const rollTitle = type === 'playCard' ? seatCard(state, handSeat, action.id).name : target.textContent?.trim();
  const safeTitle = rollTitle?.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  state = applyMatchAction(action, safeTitle || 'Roll dice');
  if(state!==oldState)selectedPotion=undefined;
  if (rollRequest) {
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
  const focus=decisionChanged ? document.getElementById('action-title')
    : type==='hold' ? match.querySelector(`button[data-index="${index}"][data-action="hold"]`) : match.querySelector('button[data-action="roll"]:enabled');
  if (focus && !handDialog.open) focus.focus({preventScroll:!decisionChanged||type==='defend'});
  else if(handDialog.open) {
    const nextCard=handContent.querySelector('button[data-action="select-card"]');
    (nextCard??handDialog.querySelector('button')).focus({preventScroll:true});
  }
}
match.addEventListener('click',handleAction);
handContent.addEventListener('click',handleAction);
deckContent.addEventListener('click',handleAction);
const viewer = document.getElementById('viewer');
const viewerImage = document.getElementById('viewer-image');
const viewerScroll = document.getElementById('viewer-scroll');
const front = document.getElementById('leaflet-front');
const back = document.getElementById('leaflet-back');
let viewerSeat, viewerLeaflet, viewerCard, zoom=1, pinch=null;
const desktopLeaflet = window.matchMedia('(hover: hover) and (pointer: fine)');
function setZoom(value) {
  zoom=bounded(value-1,3)+1;
  const width=viewerScroll.clientWidth;
  let fit=viewerCard?Math.min(460,width):width;
  if(viewerLeaflet&&desktopLeaflet.matches&&viewerImage.naturalHeight){
    fit=Math.min(width,viewerScroll.clientHeight*viewerImage.naturalWidth/viewerImage.naturalHeight);
  }
  viewerImage.style.width=`${fit*zoom}px`;
}
viewerImage.addEventListener('load',()=>{
  if(viewer.open&&viewerLeaflet)setZoom(zoom);
});
function showScan(side) {
  const reference = viewerLeaflet ? `leaflet, ${side ? 'back' : 'front'}` : 'board';
  viewerImage.alt=`${names[viewerSeat]} ${reference}`;
  viewerImage.src=viewerLeaflet ? art.leaflets[heroId(state,viewerSeat)][side] : boardImage(state,viewerSeat,true);
  if(viewerCard){
    viewerImage.alt=seatCard(state,viewerSeat,viewerCard).name;
    viewerImage.src=cardArtwork(state,viewerSeat,viewerCard);
  }
  document.getElementById('viewer-title').textContent=viewerImage.alt;
  front.setAttribute('aria-pressed',String(side===0));
  back.setAttribute('aria-pressed',String(side===1));
  setZoom(1);
  viewerScroll.scrollTo(0,0);
}
function openViewer(seat,leaflet,card=null) {
  viewerCard=card;
  viewerSeat=seat;
  viewerLeaflet=leaflet;
  front.hidden=back.hidden=!leaflet;
  viewer.showModal();
  showScan(0);
}
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
// In-progress phase rolls from Preview 3 already have their final dice saved.
if (rollRequest?.reveal && rollsOnCurrentScreen(state, rollRequest.rollType)) {
  state = rollRequest.next;
  names = heroNames(state);
  rollRequest = null;
}

// Resume an old pre-defence response on the unrolled tray.
if (!rollRequest && state?.stage === 'defence' && state.response?.action?.type === 'defend') {
  state.response = null;
}

const setupHeroes = rollRequest?.setup?.heroes.slice() ?? (state ? state.players.map((_,seat)=>heroId(state,seat)) : [0,1]);
const setupHeroNames=setupHeroes.map((_,seat)=>document.getElementById(`setup-hero-${seat}`));
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
            <span>${HEROES[id].name}</span><small>Complexity ${heroRoster[id].complexity}/6</small>
          </button>`).join('')}
      </div>
    </details>`).join('');
  heroPicker.showModal();
  heroGroups.parentElement.scrollTop=0;
  if(!touchPicker.matches)heroSearch.focus();
}

for(const [seat,id] of setupHeroes.entries()){
  setupHeroNames[seat].textContent=HEROES[id].name;
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
  setupHeroNames[pickerSeat].textContent=HEROES[id].name;
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
  rerollPicks.clear();
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
