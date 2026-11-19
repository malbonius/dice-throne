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
let boardOverride = null;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved?.version === 2 && saved.cards && saved.players?.length === 2 && Array.isArray(saved.log)) state = saved;
} catch {}
state ??= createMatch(roll,{});
let names=heroNames(state);
let selectedCard=null;
const handDialog=document.getElementById('hand-dialog');
const handTitle=document.getElementById('hand-title');
const handContent=document.getElementById('hand-content');
const button = (action,label,attrs='') => `<button type="button" data-action="${action}" ${attrs}>${label}</button>`;
function boardImage(state,seat,full=false) {
  const id=heroId(state,seat);
  if(id===cursedPirate.id && state.players[seat].cursed)
    return full?art.cursedPirateFullBoard:art.cursedPirateBoard;
  if(id===paleLady.id&&state.players[seat].werewolf)return full?art.werewolfFullBoard:art.werewolfBoard;
  const form=state.players[seat].druidForm;
  if(id===druid.id&&form!=='druid')return art[form+(full?'DruidFullBoard':'DruidBoard')];
  return (full?art.fullBoards:art.boards)[id];
}
function board(seat) {
  const upgrades=Object.values(state.players[seat].upgrades??{});
  return `<figure class="board-panel">${button('inspect-board',
    `<img src="${boardImage(state,seat)}" alt="">`,`class="board-open" data-index="${seat}" aria-label="Zoom ${names[seat]} board"`)}
    ${upgrades.length?`<details class="board-upgrades" data-seat="${seat}"><summary>Equipped upgrades (${upgrades.length})</summary>
      ${upgrades.map(id=>button('inspect-card',seatCard(state,seat,id).name,`data-index="${id}" data-seat="${seat}"`)).join('')}</details>`:''}</figure>`;
}
const statusNotes = {
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
const token = (seat,key,label,suffix=key) => {
  const id = `status-${seat}-${suffix}`;
  const hero=heroId(state,seat);
  const tokenArt=hero===gunslinger.id&&key==='evasive'?'gunslingerEvasive':
    hero===gunslinger.id&&key==='knockdown'?'gunslingerKnockdown':
    hero===tactician.id&&key==='targeted'?'tacticianTargeted':
    hero===tactician.id&&key==='protect'?'tacticianProtect':
    hero===seraph.id&&key==='cleanse'?'seraphCleanse':
    hero===seraph.id&&key==='blessing'?'seraphBlessing':key;
  const image=key==='sunDial'?(state.players[seat].sunDawn?art.dialSun:art.dialDusk):key==='regenerate1'?art.regenerate:key==='regenerate'?art.regenerate2:key==='moonShard'?art.moonShards[state.players[seat].moonShard-1]:art[tokenArt];
  return `<span class="token-help">${button('status',`<span class="token"><img src="${image}" alt="">${label}</span>`,
    `aria-expanded="false" aria-controls="${id}" aria-describedby="${id}"`)}<span class="token-note" id="${id}" hidden>${statusNotes[key]}</span></span>`;
};
function hero(seat) {
  const p=state.players[seat];
  return `<section class="hero" aria-label="${names[seat]}" style="--hero:${seat ? '#91ddff' : '#ffad86'}">
    <div class="hero-head"><h2>${names[seat]}</h2><span class="vitals"><strong>${p.hp} health</strong><strong>${p.cp} CP</strong></span>
    ${p.nyra?`<div class="tokens"><span class="token"><img src="${art.nyraDials[Number(p.nyra.downed)]}" alt="">
      Nyra · ${p.nyra.downed?'Downed':'Active'} · ${p.nyra.hp}/7 Health</span></div>`:''}
    <div class="tokens">${[p.evasive && token(seat,'evasive',`Evasive ×${p.evasive}`),p.entangle && token(seat,'entangle','Entangle'),p.blind && token(seat,'blind','Blind'),p.targeted && token(seat,'targeted','Targeted'),
    p.pirateCoins?.[seat]&&token(seat,'doubloon',`Own Doubloons ×${p.pirateCoins[seat]}`),
    p.pirateCoins?.[1-seat]&&token(seat,'doubloon',`Opponent’s Doubloons ×${p.pirateCoins[1-seat]}`,'opponent'),
    ...['powderKeg','wither','parlay'].map(key=>p[key]&&token(seat,key,statusLabel(key)+(key==='wither'?` ×${p[key]}`:''))),
    ...['flight','blindingLight','holyPresence'].map(key=>p[key]&&token(seat,key,statusLabel(key)+(key==='blindingLight'?'':` ×${p[key]}`))),
    ...['bloodPower','bleed','mesmerize'].map(key=>p[key]&&token(seat,key,statusLabel(key)+(key==='mesmerize'?'':` ×${p[key]}`))),
    ...Object.entries(p.armor??{}).filter(([,tier])=>tier).map(([slot,tier])=>{
      const name=forgemaster.armorName(slot,tier);
      const imageKey=name.split(' ')[0].toLowerCase()+(slot==='helm'?'Helm':'Shield');
      return `<span class="token"><img src="${art[imageKey]}" alt="">${name}</span>`;
    }),
    p.probabilityManipulation>0&&token(seat,'probabilityManipulation',`Probability Manipulation ×${p.probabilityManipulation}`),
    p.realityWarp&&token(seat,'realityWarp','Reality Warp'),
    state.realityDie?.seat===seat&&token(seat,'realityWarp','Reality Warp · Scarlet Witch die 5','active'),
    p.conjure&&token(seat,'conjure','Conjure'),
    p.crackle>0&&token(seat,'crackle',`Crackle ×${p.crackle}`),
    p.illusion>0&&token(seat,'illusion',`Illusion ×${p.illusion}`),
    ...(p.trickBags??[]).map(b=>token(seat,'bagOfTricks',`Bag of Tricks · ${names[b.owner]}`,`bag-${b.id}`)),
    ...(p.boundAbilities??[]).map(b=>token(seat,'spellbound',`Spellbound · ${b.key}`,`bound-${b.id}`)),
    p.premonition>0&&token(seat,'premonition',`Premonition ×${p.premonition}`),
    p.dejaVu&&token(seat,'dejaVu','Déjà Vu'),
    p.crimsonBands&&token(seat,'crimsonBands','Crimson Bands'),
    p.cosmicRay>0&&token(seat,'cosmicRay',`Cosmic Ray ×${p.cosmicRay} · ${(p.cosmicRays??[]).filter(ray=>captainMarvel.readyRay(ray,state.turn)).length} ready`),
    p.cosmicFlare>0&&token(seat,'cosmicFlare',`Cosmic Flare ×${p.cosmicFlare}`),
    p.radiance>0&&token(seat,'radiance',`Radiance ×${p.radiance}`),
    p.covertOps>0&&token(seat,'covertOps',`Covert Ops ×${p.covertOps}`),
    p.agility>0&&token(seat,'agility',`Agility ×${p.agility}`),
    ...(p.timeBombTimers??[]).map((b,i)=>token(seat,'timeBomb',`Time Bomb ${i+1} · 0:0${b.ticks}`,`timeBomb-${b.id}`)),
    p.kineticEnergy>0&&token(seat,'kineticEnergy',`Kinetic Energy ${p.kineticEnergy}/${statusCap(p,'kineticEnergy')}`),
    p.vibraniumSuit&&token(seat,'vibraniumSuit','Vibranium Suit'),
    p.sunDial!==undefined&&token(seat,'sunDial',`${p.sunDawn?'Dawn':'Dusk'} · ${p.sunDial}/5`),
    p.sunMarked&&token(seat,'sunMarked','Sun Marked'),
    p.chargedGem&&token(seat,'chargedGem','Charged Gem'),
    p.footwork!==undefined&&token(seat,'footwork',`Footwork · ${duelist.positions[p.footwork+2]}`),
    p.guardBreak>0&&token(seat,'guardBreak',`Guard Break ×${p.guardBreak}`),
    p.disarm&&token(seat,'disarm','Disarm'),
    p.druidForm&&`<span class="token">${druid.formName(p.druidForm)} Form</span>`,
    p.shapeShift>0&&token(seat,'shapeshift',`Shape Shift ×${p.shapeShift}`),
    p.regenerate>0&&token(seat,'regenerate',`Regenerate (2) ×${p.regenerate}`),
    p.regenerate1>0&&token(seat,'regenerate1',`Regenerate (1) ×${p.regenerate1}`),
    p.wound>0&&token(seat,'wound',`Wound ×${p.wound}`),
    p.hex&&token(seat,'hex','Hex'),
    p.feather>0&&token(seat,'feather',`Feathers ${p.feather}/${p.featherCap??5}`),
    ...state.players.flatMap((owner,i)=>owner.nevermoreSeat===seat?
      [token(seat,'nevermore',`Nevermore${heroId(state,1-i)===raveness.id?` (P${i+1})`:''} · ${owner.nevermoreVitality}/3`,`nevermore-${i}`)]:[]),
    p.werewolf&&'<span class="token">Werewolf form</span>',
    p.moonShard>0&&token(seat,'moonShard',`Moon Shards ×${p.moonShard}`),
    p.prey>0&&token(seat,'prey',`Prey ×${p.prey}`),
    p.corpses!==undefined&&`<span class="token"><img src="${art.corpseDial}" alt="">Corpses ${p.corpses}/10</span>`,
    p.covered&&`<span class="token">Unearth covers ${p.covered}</span>`,
    ...Object.entries(p.undead??{}).filter(([,count])=>count).map(([kind,count])=>{
      const {name}=necromancer.undead[kind], key={warrior:'skeletalWarrior',mage:'skeletalMage',golem:'boneGolem'}[kind];
      return `<span class="token"><img src="${art[key]}" alt="">${name} ×${count}</span>`;
    }),
    p.resurrected&&'<span class="token">Resurrected · CP and cards locked</span>',
    p.resurrect&&token(seat,'resurrect','Resurrect'),
    p.decrepify&&token(seat,'decrepify','Decrep-ify'),
    p.dreadful&&token(seat,'dreadful',`Dreadful ×${p.dreadful}`),
    p.grim&&token(seat,'grim',`Grim Pursuit ×${p.grim}`),
    ...state.players.map((owner,i)=>owner.hauntedHeadSeat===seat&&token(seat,'hauntedHead',i===seat?'Own Haunted Head':'Opponent’s Haunted Head',`hauntedHead-${i}`)),
    p.nyraBond&&token(seat,'nyraBond','Nyra’s Bond'),
    p.tactical&&token(seat,'tactical',`Tactical Advantage ${p.tactical}/${statusCap(p,'tactical')}`),
    p.constrict&&token(seat,'constrict','Constrict'),
    p.honor&&token(seat,'honor',`Honor ×${p.honor}`),p.shame&&token(seat,'shame',`Shame ×${p.shame}`),
    p.backStrike&&token(seat,'backStrike','Back Strike'),
    p.reload&&token(seat,'reload',`Reload ×${p.reload}`),p.bounty&&token(seat,'bounty','Bounty'),
    p.synth&&token(seat,'synth',`Synth ×${p.synth}`),p.nanite&&token(seat,'nanite',`Nanite ×${p.nanite}`),
    ...Object.entries(p.bots??{}).map(([bot,level])=>`<span class="token"><img src="${art.artificerBots[bot][level-1]}" alt="">${level===2?'Advanced':'Basic'} ${artificer.bots[bot]}</span>`),
    p.barbed&&token(seat,'barbed','Barbed Vine'),p.wellspring&&token(seat,'wellspring','Wellspring'),
    ...spiritTypes.map(key=>p[key]&&token(seat,key,`${statusLabel(key)} ×${p[key]}`)),
    p.delayedPoison&&token(seat,'delayedPoison',`Delayed Poison ×${p.delayedPoison}`),
    p.smoke&&token(seat,'smoke','Smoke Bomb'),p.ninjutsu&&token(seat,'ninjutsu',`Ninjutsu ×${p.ninjutsu}`),
    ...[...paladinBuffs,'blessing'].map(key=>p[key]&&token(seat,key,statusLabel(key))),
    p.chi&&token(seat,'chi',`Chi ${p.chi}/${statusCap(p,'chi')}`),p.cleanse&&token(seat,'cleanse',`Cleanse ×${p.cleanse}`),
    p.poison&&token(seat,'poison',`Poison ×${p.poison}`),p.shadows&&token(seat,'shadows','Shadows'),p.sneak&&token(seat,'sneak','Sneak Attack'),
    p.burn&&token(seat,'burn','Burn'),p.knockdown&&token(seat,'knockdown','Knockdown'),
    p.fireMastery&&token(seat,'fireMastery',`Fire Mastery ${p.fireMastery}/${statusCap(p,'fireMastery')}`),
    p.concussion && token(seat,'concussion','Concussion'),state.stage==='locked' && state.pending.stun && seat!==state.active && token(seat,'stun','Stun')].filter(Boolean).join('') || 'No status effects'}</div></div>
    ${board(seat)}<div class="inventory"><span class="deck">${(p.deck.length??p.deck) ? `<img src="${art.back}" alt="">` : ''} Draw ${p.deck.length??p.deck} · Discard ${p.discard?.length??0}</span><span class="hand-tools"><span class="hand-count">${p.hand.length??p.hand} in hand</span>
      ${button('open-hand','Hand',`data-index="${seat}" aria-label="Open ${names[seat]}’s hand" aria-haspopup="dialog" ${seat===cardActor(state)&&!['finished','nyraDamage'].includes(state.stage)?'':'disabled'}`)}</span>${button('inspect-leaflet','Leaflet',`class="leaflet" data-index="${seat}" aria-label="${names[seat]} leaflet"`)}${p.undead?button('inspect-undead','Undead reference',`data-index="${seat}"`):''}</div>
    ${p.spellBook?`<div class="forge-inventory"><strong>Book of Vishanti · ${p.spellBook.length} prepared</strong><div class="controls">${p.spellBook.map(id=>button('inspect-card',doctorStrange.spells[id],`data-index="${id}" data-seat="${seat}"`)).join('')||'No prepared Spells'}</div></div>`:''}
    ${p.forgeOre?`<details class="forge-inventory" data-seat="${seat}"><summary>The Forge · ${p.forgeOre.length} Ore</summary>
      <div class="controls">${[19,28,34].map(id=>{
        const ore=forgemaster.oreType(id),cards=p.forgeOre.filter(card=>forgemaster.oreType(card)===ore);
        return cards.length?button('inspect-card',`${seatCard(state,seat,id).name} ×${cards.length}`,`data-index="${id}" data-seat="${seat}"`):'';
      }).join('')}${['mining','crafting'].map(key=>button('inspect-forging',key==='mining'?'Mining rules':'Crafting rules',`data-status="${key}"`)).join('')}</div>
    </details>`:''}
  </section>`;
}
function tray(values,seat,editable,held=[]) {
  return `<div class="dice" role="group" aria-label="${names[seat]} dice">${values.map((value,i) => {
    if (!value) return '<span class="die empty" aria-hidden="true">·</span>';
    const blank=!dieValue(value,state.players[seat]);
    const foreign=values===state.dice&&state.realityDie?.seat===seat&&state.realityDie.index===i;
    const dieHero=foreign?scarletWitch.id:heroId(state,seat);
    const label = blank?'Blank · Hex':foreign&&heroId(state,seat)!==scarletWitch.id?`${value} · Scarlet Witch die, symbol unavailable`:`${value} ${HEROES[dieHero].symbols[value-1]}`;
    const picture = blank?'<span aria-label="Blank due to Hex">—</span>':
      `<img src="${art.dice[dieHero][value-1]}" alt="${label}">`;
    return editable ? button('hold',picture,`class="die" data-index="${i}" aria-pressed="${!!held[i]}" aria-label="Die ${i+1}, ${label}, ${held[i]?'held':'available to reroll'}"`)
      : `<span class="die">${picture}</span>`;
  }).join('')}</div>`;
}
function handPanel() {
  if(!state.cards || state.stage==='finished')return '';
  const seat=cardActor(state), player=state.players[seat];
  if(!player.hand.length)return '<p>No cards in hand.</p>';
  const groups={playable:[],unavailable:[]};
  for(const id of player.hand){
    const c=seatCard(state,seat,id), choices=cardChoices(state,seat,id);
    const chosen=selectedCard===id;
    const detail=choices.length===1&&choices[0].label==='Play' ? '' :
      choices.length ? `<label>Choose effect <select id="card-choice">${choices.map((choice,i)=>`<option value="${i}">${choice.label}</option>`).join('')}</select></label>` : '';
    const entry=`<div class="hand-card">
      ${button('select-card',`<strong>${c.name}</strong><small>${price(state,seat,id)} CP · ${c.phase}</small>`,`data-index="${id}" aria-expanded="${chosen}"`)}
      ${button('inspect-card','View',`data-index="${id}" data-seat="${seat}" aria-label="View ${c.name}"`)}
    </div>${chosen?`<div class="card-command">${detail}
      ${choices.length?button('playCard','Play card',`class="primary" data-index="${id}"`):'<small>Unavailable in this window.</small>'}
      ${isSelling(state)&&seat===state.active?button('sell','Sell for 1 CP',`data-index="${id}"`):''}</div>`:''}`;
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
  else if(income.skipped==='disarm')message='Skipped due to Disarm.';
  else if(income.skipped==='concussion')message='Skipped due to Concussion.';
  else {
    const cp=income.cp ? '+1 CP' : 'CP already at the cap';
    const card=income.drawn ? 'drew 1 card' : 'no cards available to draw';
    message=`${cp} · ${card}`;
  }
  return `<div class="income-note" role="status"><strong>Income Phase</strong> · ${message}</div>`;
}
function rerollDice(dice,max,filter=()=>true){
  const label=`Select up to ${max} ${max===1?'die':'dice'} to reroll`;
  return `<div class="defence-choice" role="group" aria-label="${label}">
    ${dice.map((v,i)=>`<label><input type="checkbox" name="ability-reroll" value="${i}" ${filter(v)?'':'disabled'}> Die ${i+1} (${v})</label>`).join('')}
    </div>${button('abilityReroll',`Reroll up to ${max}`)}`;
}
function rollDisplay(context){
  if(!context.owners)return tray(context.dice,context.seat,false);
  return context.dice.map((value,i)=>`<div><strong>${names[dieOwner(context,i)]}</strong>${tray([value],dieOwner(context,i),false)}</div>`).join('');
}
function arena() {
  const allowed=legal(state), seat=actor(state), p=state.pending, responding=cardActor(state);
  const activeName=names[state.active], actingName=names[seat];
  let heading, phase, detail='', content='';
  const effectRoll=p?.effectDice ? tray(p.effectDice,state.active,false) : '';
  const footworkPending=!!(duelist.bonus(state,state.active)||duelist.bonus(state,1-state.active));
  if(state.conjureTask){
    const t=state.conjureTask,opponent=1-t.seat;phase='Conjure';heading=`${names[opponent]} may block Conjure`;
    detail=`${names[t.seat]} wants to gain ${statusLabel(t.choice.status)} from ${names[t.choice.source]}’s leaflet. Discard one card to prevent the gain, or allow it.`;
    content=state.players[opponent].hand.map(id=>button('conjureDiscard',`Discard ${seatCard(state,opponent,id).name}`,`data-index="${id}"`)).join('')+button('conjureAllow','Allow the status gain','class="primary"');
  } else if(!state.response&&state.scarletJinx&&!state.cardRoll&&!state.retry){
    const t=state.scarletJinx;phase='Jinx';heading=`${activeName} resolves a Crown reroll`;
    detail=`${p.scarlet.jinxUpgrade?'Each Crown adds 1 damage and rolls again.':'Each On outcome can happen only once across the whole ability.'} ${t.left} reroll${t.left===1?'':'s'} pending. Earlier dice have resolved and cannot be changed or matched.`;
    content=tray(t.dice,t.seat,false)+button('resolveScarletJinx','Resolve this reroll','class="primary"');
  } else if(state.lokiTask){
    const t=state.lokiTask.queue[0];phase='Loki';heading=t.kind==='bind'?`Choose an ability to make Spellbound`:'Distribute Bags of Tricks';
    detail=`${names[state.lokiTask.seat]} chooses · ${t.left} remaining.${t.kind==='bind'?' An Ultimate cannot be covered.':' You may choose the same player more than once; stack limit 2.'}`;
    content=loki.options(state).map((choice,i)=>button('lokiChoose',choice.label,`data-choice="${i}"`)).join('')+(t.optional?button('lokiSkip','Finish distributing','class="primary"'):'');
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
    content=(state.players[state.active].trickBags??[]).map(b=>button('rollTrickBag',`Roll Bag of Tricks from ${names[b.owner]}`,`data-index="${b.id}"`)).join('');
  } else if(state.premonitionTask){
    const t=state.premonitionTask,player=state.players[t.seat];phase='Income Phase';heading=`${actingName} uses Premonition`;
    if(t.kind==='choose'){
      detail='Choose the normal draw or spend Premonition. After spending tokens, return one of the drawn cards to your deck.';
      content=button('choosePremonition','Normal Income · draw 1','data-amount="0"')+(player.premonition>=1?button('choosePremonition','Spend 1 Premonition · draw 2','data-amount="1"'):'')+(player.premonition>=3?button('choosePremonition','Spend 3 Premonition · draw 3','data-amount="3"'):'');
    } else if(t.kind==='return'){
      detail='Return one of these newly drawn cards. Other cards in your hand cannot be returned.';
      content=t.drawn.map(id=>`<div class="controls"><strong>${seatCard(state,t.seat,id).name}</strong>${button('returnPremonition','Put on top',`data-index="${id}" data-status="top"`)}${button('returnPremonition','Put on bottom',`data-index="${id}" data-status="bottom"`)}</div>`).join('');
    } else {detail='Income complete.';content=button('completePremonition','Continue to Main Phase','class="primary"');}
  } else if(state.strangeTask&&state.stage!=='sideDamage'){
    const task=state.strangeTask,t=task.queue[0];phase='Spells';heading=t.kind==='prepare'?'Prepare a Spell':t.kind==='cast'?'Cast a Spell':t.kind==='order'?'Order the remaining cards':t.kind==='heal'?'Choose a Hero to heal':t.kind==='dejaTarget'?'Give Déjà Vu to a player':'Remove a status effect';
    if(t.kind==='prepare'||t.kind==='cast')detail=`${t.left} remaining · ${t.zone==='peek'?'among the top five cards':t.zone==='book'?'from the Book of Vishanti':'from your discard pile'}. Resolve this effect completely before choosing another Spell.`;
    if(t.kind==='order')detail='Choose from top to bottom. The remaining cards stay in the order you choose.';
    content=doctorStrange.options(state).map((choice,i)=>button('strangeChoose',choice.label,`data-choice="${i}"`)).join('')+(t.optional?button('strangeSkip','Continue without this effect','class="primary"'):'');
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
      content=blackWidow.upgradeChoices(state,t.seat,'hand').map(id=>button('widowHandUpgrade',`Play ${seatCard(state,t.seat,id).name}`,`data-index="${id}"`)).join('')+button('widowPeek','Look at top 3 cards');
    } else if(t.kind==='order'){
      detail+=' Choose the next card from top to bottom.';
      if(t.ordered?.length)detail+=' Chosen: '+t.ordered.map(id=>seatCard(state,t.seat,id).name).join(' → ')+'.';
      content=t.cards.map(id=>button('widowOrder',seatCard(state,t.seat,id).name,`data-index="${id}"`)).join('')+button('widowKeep','Keep remaining order','class="primary"');
    } else {
      if(t.kind==='covertSearch')detail='No upgrades in the top 3. You may reveal these cards and search for an upgrade: '+(t.revealed??[]).map(id=>seatCard(state,t.seat,id).name).join(', ')+'.';
      else detail=`Choose up to ${t.left} more upgrades. Your deck is shuffled before any passive card draws.`;
      content=(t.kind==='search'&&!t.left?[]:blackWidow.upgradeChoices(state,t.seat)).map(id=>button('widowSearch',seatCard(state,t.seat,id).name,`data-index="${id}"`)).join('')+button(t.kind==='search'?'widowSearchDone':'widowKeep',t.kind==='search'?'Finish selection and shuffle':'Do not search','class="primary"');
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
    content=(state.players[state.active].timeBombTimers??[]).filter(b=>!(state.widowBombChecked??[]).includes(b.id)).map(b=>button('widowBombRoll',`Roll for bomb · 0:0${b.ticks}`,`data-index="${b.id}"`)).join('');
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
  } else if(state.retry) {
    const context=rollContext(state);
    phase='Try, Try Again!'; heading=`${actingName} can reroll once more`;
    content=rollDisplay(context)+`<div class="controls">${diceOwnedBy(context,seat).map((value,i)=>button('retryDie',`Reroll die ${i+1} (${value})`,`data-index="${i}"`)).join('')}
      ${button('finishRetry','Keep this roll','class="primary"')}</div>`;
  } else if(state.mainChoice) {
    const {seat,id}=state.mainChoice;
    phase='Main Phase action'; heading=seatCard(state,seat,id).name;
    detail='Choose the target after the response.';
    content=`<div class="controls">${mainTargets(state,seat,id).map(({label},i)=>button('resolveMainChoice',label,`data-choice="${i}"`)).join('')}</div>`;
  } else if(state.response) {
    phase='Card response'; heading=`${names[responding]} can respond`;
    const context=rollContext(state);
    detail='Play an eligible card, use an available ability or token, or pass to continue.';
    content=(context?rollDisplay(context):'')+`<div class="controls">
      ${allowed.evade?button('evade','Spend Evasive'):''}${allowed.evadeReturn?button('evadeReturn','Spend Evasive'):''}
      ${button('passResponse','Pass','class="primary"')}</div>`;
  } else if(state.mesmerizeRoll){
    const effect=state.mesmerizeRoll;
    phase='Status effect roll'; heading='Mesmerize';
    if(effect.choosing){
      const context=rollContext({...state,stage:effect.resume,mesmerizeRoll:null});
      content=rollDisplay(context)+diceOwnedBy(context,1-effect.seat).map((value,index)=>
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
    content=tray(state.cardRoll.dice,seat,false)+(allowed.abilityReroll?rerollDice(state.cardRoll.dice,state.cardRoll.ninjaRerolls,v=>heroId(state,seat)===paleLady.id||v!==4&&v!==5):'')+button('finishCardRoll','Resolve card roll','class="primary"');
  } else if(state.stage==='gunContest') {
    const contest=state.gunContest;
    phase=contest.kind==='duel'?'Defensive Roll':'Ability roll';
    heading=contest.kind==='duel'?defenceName(state,contest.seat):p.name;
    content=rollDisplay(rollContext(state))+
      (allowed.rerollDuel?button('rerollDuel','Reroll the defence die'):'')+
      button('resolveGunContest','Resolve roll-off','class="primary"');
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
      detail=state.players[state.active].decrepify&&state.attempts?'Decrep-ify · hold at least three dice to reroll.':state.attempts ? 'Tap dice to keep them, reroll the rest, or announce an available ability.' : 'Roll all five dice to begin.';
      content=tray(state.dice.length ? state.dice : Array(5).fill(null),seat,!!allowed.hold,state.held)
        + `<div class="controls">${button('roll',state.attempts?(constrictCost(state)?'Reroll · 1 CP':'Reroll'):'Roll dice',`class="primary" ${allowed.roll?'':'disabled'}`)}
        ${button('end','End without an ability',allowed.end?'':'disabled')}</div>`
        + `<div class="abilities">${abilitiesFor(state,seat).map((a,i)=>button('declare',`<strong>${a.label??a.name}</strong><small>${a.text}</small>`,
          `class="ability" data-ability="${i}" ${allowed.declare.includes(a.name)?'':'disabled'}`)).join('')}</div>`;
      break;
    case 'announce':
      phase='Ability response'; heading=`${actingName} responds`;
      detail=`${activeName} announces ${p.name}.`;
      content=tray(state.dice,state.active,false)+button('accept','Accept roll','class="primary"'); break;
    case 'blind':
      phase='Blind check'; heading=`${actingName} checks Blind`;
      detail='A 1 or 2 cancels the ability.';
      content=tray([state.effectDie],seat,false)+button('resolveBlind','Resolve Blind','class="primary"'); break;
    case 'gunDuelChoice':
      phase='Defensive Roll'; heading=defenceName(state,seat);
      content=button('chooseDuel','Deal 3 damage','data-choice="0"')+
        button('chooseDuel','Prevent half the incoming damage','data-choice="1"');
      break;
    case 'vampireSearch': {
      phase='Ability choice'; heading=p.name;
      detail='Choose one card to put into your hand. The rest of the deck will be shuffled.';
      const deck=state.players[state.active].deck.slice().sort((a,b)=>seatCard(state,seat,a).name.localeCompare(seatCard(state,seat,b).name));
      content=deck.map(id=>button('searchVampireDeck',seatCard(state,seat,id).name,`data-index="${id}"`)).join('');
      break;
    }
    case 'vampireChoice':
      phase='Ability choice'; heading=p.name;
      content=p.possessChoice?button('chooseVampireBenefit','Inflict Bleed','data-choice="0"')+
        button('chooseVampireBenefit','Gain Mesmerize','data-choice="1"'):
        button('chooseVampireBenefit','Keep Mesmerize','data-choice="0"')+
        button('chooseVampireBenefit','Spend Mesmerize · make undefendable','data-choice="1"');
      break;
    case 'seraphTarget':
      phase='Ability choice'; heading=p.name;
      content=names.map((name,target)=>button('chooseSeraphTarget',name,`data-target="${target}"`)).join('');
      break;
    case 'purify':
      phase='Ability choice'; heading=p.name;
      detail=`Choose a status to remove from ${names[p.seraphTarget]}.`;
      content=statusKeys.filter(key=>state.players[p.seraphTarget][key]).map(status=>button('resolvePurify',`Remove ${statusLabel(status)}`,`data-status="${status}"`)).join('')+
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
      phase='Ability choice';heading=p.name;
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
      phase='Ability choice';heading=p.name;
      content=button('chooseHorrify','Gain 3 Dreadful','data-status="dreadful"')+
        button('chooseHorrify','Gain Grim Pursuit','data-status="grim"');
      break;
    case 'pantherAbility':
      phase='Ability';heading=p.name;
      content=button('finishPantherAbility','Continue ability','class="primary"');
      break;
    case 'sunGemRoll':
      phase='Main Phase action';heading='Charged Gem';
      content=tray(state.sunGemRoll.dice,state.active,false)+button('resolveChargedGem','Resolve Charged Gem','class="primary"');
      break;
    case 'sunBurstChoice':
      phase='Ability choice';heading=p.name;
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
      detail=task.cards.map(id=>seatCard(state,task.seat,id).name).join(' · ');
      content=ores.map(id=>button('forgeMineChoice',`Reveal ${seatCard(state,task.seat,id).name}`,`data-index="${id}" data-status="one"`)).join('')+
        (task.all&&ores.length>1?button('forgeMineChoice','Reveal all Ore','data-status="all"'):'')+
        button('forgeMineChoice','Reveal none · gain 1 CP','data-status="none"');
      break;
    }
    case 'forgeOrder':
      phase='The Mines';heading='Return the remaining cards';
      detail='Choose which card goes on the bottom next.';
      content=state.forgeTask.cards.map(id=>button('forgeOrder',seatCard(state,seat,id).name,`data-index="${id}"`)).join('');
      break;
    case 'forgeSearch':
      phase='Ultimate';heading='Final Touches!';
      content=[...new Map(state.players[state.active].deck.filter(forgemaster.oreType).map(id=>[forgemaster.oreType(id),id])).values()]
        .map(id=>button('forgeSearch',`Forge ${seatCard(state,state.active,id).name}`,`data-index="${id}"`)).join('');
      break;
    case 'forgeAbility':
      phase='Ability';heading=p.name;
      content=button('finishForgeAbility','Continue ability','class="primary"');
      break;
    case 'forgeMasterwork': {
      phase='Defensive Roll';heading='Masterwork';
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
      phase='Ability';heading=p.name;
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
      phase='Offensive Roll';heading=p.name;
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
      content=state.players[seat].hand.map(id=>button('ravenDiscard',seatCard(state,seat,id).name,`data-index="${id}"`)).join('');
      break;
    case 'ravenAttackChoice': {
      const holder=state.players[seat].nevermoreSeat;
      phase='Main Phase action';heading='Nevermore Attack!';
      content=button('ravenAttackChoice',`Heal ${names[holder]} by 2`,'data-status="heal"')+
        button('ravenAttackChoice',`Deal 2 damage to ${names[holder]}`,'data-status="damage"');
      break;
    }
    case 'ravenAbility':
      phase='Ability';heading=p.name;
      content=button('finishRavenAbility','Continue ability','class="primary"');
      break;
    case 'prey':
      phase='Attack modifier';heading='Prey';
      content=state.preyRoll?tray(state.preyRoll,state.active,false)+button('resolvePrey','Resolve Prey roll','class="primary"'):
        (allowed.rollPrey?button('rollPrey','Roll for Prey','class="primary"'):'')+button('skipPrey','Continue attack');
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
        content=hero.hand.map(id=>button('resolveDisarm',`Discard ${seatCard(state,state.active,id).name}`,`data-index="${id}" data-status="discard"`)).join('')+
          button('resolveDisarm','Skip Income Phase','data-status="skip"');
        break;
      }
      if(allowed.reposition){
        heading='Reposition';detail=`Current position · ${duelist.positions[hero.footwork+2]}. Moving backward grants one Guard Break.`;
        content=duelist.steps(hero,2,1).map(({label},i)=>button('reposition',label,`data-choice="${i}"`)).join('');
        break;
      }
      if(allowed.rollNevermore){
        heading='Nevermore';detail=`${activeName} starts their upkeep with Nevermore.`;
        content=button('rollNevermore','Roll the Nevermore die','class="primary"');
        break;
      }
      if(allowed.unearth){
        heading='Unearth';detail='Choose a different ability to cover and gain its Corpses.';
        content=unearthChoices(hero).map(name=>button('unearth',`${name} · +${necromancer.unearth[name]+Number(!!hero.upgrades[name])} Corpses`,
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
        (allowed.checkRegenerate?button('checkRegenerate','Resolve Regenerate'):'')+(allowed.collectSynth?button('collectSynth','Use Scrap Collector'):'')+(allowed.clearNanites?button('clearNanites','Roll to clear Nanites'):'')+
        (allowed.evadeUpkeep?button('evadeUpkeep','Spend Evasive'):'')+(allowed.resolveUpkeep?button('resolveUpkeep','Resolve upkeep','class="primary"'):'');
      break;
    }
    case 'artSpanner':
      phase='Ability roll'; heading=p.name;
      content=button('chooseSpanner','Roll one die','data-choice="0"')+button('chooseSpanner','Spend 1 Synth to roll three dice','data-choice="1"');
      break;
    case 'artBuild':
      phase='Ability choice'; heading=p.name;
      content=artificer.buildChoices(state.players[state.active]).map(bot=>button('scratchBuild',`Make Advanced ${artificer.bots[bot]}`,`data-status="${bot}"`)).join('');
      break;
    case 'artFreeBots':
      phase='Ability choice'; heading=p.name;
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
      if(kind==='inspect')detail=state.players[1-chooser].hand.map(id=>seatCard(state,1-chooser,id).name).join(' · ')||'Opponent’s hand is empty.';
      content=cursedPirate.choices(state).map((label,i)=>button('resolvePirateChoice',label,`data-choice="${i}"`)).join('');
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
      phase='Ability choice'; heading=p.name;
      content=spiritDiscards(state.players[state.active],p.spiritCost).map((choice,i)=>button('paySpirits',discardLabel(choice),`data-choice="${i}"`)).join('');
      break;
    case 'overgrowthWells':
      phase='Ability choice'; heading=p.name;
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
      phase='Attack modifier'; heading=p.name;
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
      phase='Ability roll'; heading=p.name;
      detail=`${actingName} rolls ${effectDiceCount(p,state.players[state.active])} separate effect dice to determine the ability’s effects.`;
      content=button('rollEffect','Roll for effect','class="primary"'); break;
    case 'effectResponse':
      phase='Ability roll'; heading=p.name;
      detail='Modify the ability roll or resolve it.';
      content=effectRoll+(allowed.abilityReroll?rerollDice(p.effectDice,p.ninjaRerolls):'')+`<div class="controls">${allowed.effectRetry?p.effectDice.map((_,i)=>button('effectRetry',`${p.tempestChi?'Spend 1 Chi to reroll':'Reroll'} die ${i+1}`,`data-index="${i}"`)).join(''):''}${button('resolveEffect','Resolve effect roll','class="primary"')}</div>`; break;
    case 'targeting':
      phase='Targeting'; heading=`${p.name} targets ${names[1-seat]}`;
      content=button('resolveTarget','Apply ability effects','class="primary"'); break;
    case 'choice':
      phase='Ability choice'; heading=p.name;
      content=p.ninjaTarget?names.map((name,target)=>button('chooseEffect',`Give Smoke Bomb and Ninjutsu to ${name}`,`data-target="${target}"`)).join('')
        :p.retributionTarget?names.map((name,target)=>button('chooseEffect',`Give Retribution to ${name}`,`data-target="${target}"`)).join('')
        :p.grantEvasive?names.map((name,target)=>button('chooseEffect',`Give Evasive to ${name}`,`data-target="${target}"`)).join('')
        :statusKeys.filter(k=>state.players[state.active][k]).map(k=>button('chooseEffect',`Remove ${statusLabel(k)}`,`data-status="${k}"`)).join('')+button('chooseEffect','Keep status effects');
      break;
    case 'preventStatus':
      phase='Defensive Roll'; heading='Thick Skin II';
      detail='You may prevent one incoming status effect.';
      content=p.incomingStatus.map(k=>button('preventStatus',`Prevent ${statusLabel(k)}`,`data-status="${k}"`)).join('')+button('preventStatus','Continue without prevention');
      break;
    case 'defenceResponse':
      phase='Defensive Roll'; heading=`${actingName} reviews the defence roll`;
      content=tray(state.defenceDice,seat,false);
      if(allowed.abilityReroll)content+=rerollDice(state.defenceDice,p.seraphDefenceReroll??p.ninjaDefenceRerolls);
      if(allowed.extraDefence)content+=`<div class="defence-choice">${state.defenceDice.map((v,i)=>`<label><input type="checkbox" name="defence-reroll" value="${i}"> Die ${i+1}</label>`).join('')}</div>`+button('extraDefence','Reroll selected dice');
      if(allowed.evade)content+=button('evade','Spend Evasive before resolving defence');
      content+=button('resolveDefence','Resolve defence','class="primary"');break;
    case 'postHit':
      phase='After damage'; heading=`${actingName} can play Head Bash!`;
      content=button('continueHit','Continue to Main Phase 2','class="primary"');break;
    case 'locked':
      phase=p.ultimate ? 'Ultimate damage' : 'Stunned defender';
      heading=`${activeName} resolves ${p.name}`;
      detail=`${p.damage?`${p.damage} incoming damage. `:''}${names[1-state.active]} cannot respond.${vineDamage(state)?` Barbed Vine deals up to ${vineDamage(state)} to ${activeName}.`:''}`;
      content=(allowed.reopenPrey?button('reopenPrey','Roll for Prey'):'')+button('settle',footworkPending?'Apply Footwork bonus':p.damage?'Resolve damage':'Resolve ability','class="primary"'); break;
    case 'defence':
      phase='Defensive Roll'; heading=`${actingName} can defend`;
      detail=`${p.name} brings ${p.damage} incoming damage.`;
      {
        const defences=heroId(state,seat)===3?['shadowDefence','counterStrike']:['defence'];
        const options=allowed.defend?defences.map(kind=>button('defend',`Roll ${defenceName(state,seat,kind)}`,`class="primary" data-defence="${kind}"`)).join(''):'';
        content=effectRoll+`<div class="controls">${options}${button('skipDefence',allowed.defend?'Decline defence':'Continue with Shadows')}</div>`;
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
      detail=`${incomingDamage(state)} incoming damage${shadowAvoids(state)&&p.damage?' after Shadows':p.pure?' (pure)':p.undefendable?' (undefendable)':''}${returnDamageFor(state) ? ` · ${returnDamageFor(state)} return damage` : ''}.${p.recoil && incomingDamage(state) ? ` Reckless deals ${p.recoil} damage to Barbarian if this attack hits.` : ''}`;
      content=(state.defenceDice.length ? tray(state.defenceDice,seat,false):'')
        +`<div class="controls">${allowed.evade?button('evade',`${actingName} spends Evasive`):''}${allowed.evadeReturn?button('evadeReturn',`${activeName} spends Evasive`):''}${allowed.reopenPrey?button('reopenPrey','Roll for Prey'):''}${button('settle',footworkPending?'Apply Footwork bonus':nyraIncoming(state)?'Assign damage':'Resolve damage','class="primary"')}</div>`; break;
    case 'evasion':
      phase='Avoid damage'; heading=`${actingName} checks ${statusLabel(state.evasionToken??'evasive')}`;
      detail=state.evasionToken==='smoke'?'A 1–3 avoids the incoming damage.':'A 1 or 2 avoids the incoming damage.';
      content=tray([state.effectDie],seat,false)+button('resolveEvade','Resolve roll','class="primary"'); break;
    case 'scarletAbility':
      phase='Scarlet Witch';heading=p.name;content=button('finishScarletAbility','Continue ability','class="primary"');break;
    case 'lokiAbility':
      phase='Loki';heading=p.name;content=button('finishLokiAbility','Continue ability','class="primary"');break;
    case 'strangeAbility':
      phase='Ability';heading=p.name;content=button('finishStrangeAbility','Continue ability','class="primary"');break;
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
  if(!state.conjureTask&&!state.lokiTask&&!state.lokiIllusion&&state.lokiBag?.kind!=='choose'){
  const probability=scarletWitch.probabilityChoices(state,responding);
  if(probability.length)content+=`<div class="token-actions"><strong>${names[responding]} · Probability Manipulation</strong><div class="controls">${probability.map((choice,i)=>button('spendProbability',choice.label,`data-choice="${i}"`)).join('')}</div></div>`;
  const scarletChanges=scarletWitch.defenceChanges(state,responding);
  if(scarletChanges.length)content+=`<details class="token-actions"><summary>Double Trouble II · discard Probability Manipulation to change any die</summary><div class="controls">${scarletChanges.map((choice,i)=>button('scarletDefenceChange',choice.label,`data-choice="${i}"`)).join('')}</div></details>`;
  if(scarletWitch.canCrackle(state,responding))content+=button('spendCrackle',`Spend Crackle · +${Math.min(3,Math.max(0,scarletWitch.countedStatuses(state.players[responding])-1))} damage`);
  const conjure=scarletWitch.conjureChoices(state,responding);
  if(conjure.length)content+=`<details class="token-actions"><summary>Spend Conjure</summary><div class="controls">${conjure.map((choice,i)=>button('spendConjure',choice.label,`data-choice="${i}"`)).join('')}</div></details>`;
  if(!state.response||state.response.seat===state.active){
    if(sunElf.canGem(state,state.active))content+=button('spendChargedGem','Spend Charged Gem');
    const player=state.players[state.active];
    if(sunElf.canDawn(state,state.active))content+=button('spendSunDawn',`Use Dawn · +${player.sunDial} damage`);
  }
  if(loki.canIllusion(state,responding))content+=button('spendIllusion',`${names[responding]} · spend Illusion`);
  if(doctorStrange.canPrepare(state,state.active))content+=`<div class="token-actions"><strong>Book of Vishanti · prepare once per turn</strong><div class="controls">${state.players[state.active].hand.filter(doctorStrange.isSpell).map(id=>button('prepareSpell',`Prepare ${doctorStrange.spells[id]}`,`data-index="${id}"`)).join('')}</div></div>`;
  if(doctorStrange.canDeja(state,state.active))content+=button('spendDejaVu',`${activeName} · spend Déjà Vu and restart the roll`);
  if(captainMarvel.canRay(state,responding))content+=button('spendCosmicRay','Spend Cosmic Ray · roll 2 dice');
  for(const die of captainMarvel.radianceDice(state,responding))content+=button('spendRadiance',`Spend Radiance · defence die ${die.index+1} (${die.value}) → 6`,`data-index="${die.index}"`);
  if(blackWidow.canCovert(state,responding))content+=button('spendCovertOps','Spend Covert Ops');
  if(state.players[responding].agility&&blackWidow.incoming(state,responding))content+=button('spendAgility','Spend Agility · roll to prevent half damage');
  if(state.stage==='defenceResponse'&&!state.response&&!state.cardRoll&&heroId(state,1-state.active)===blackWidow.id&&blackWidow.count(state.players[1-state.active])>=4&&!state.pending.widowDefenceRerolled){
    content+=`<div class="defence-choice">${state.defenceDice.map((v,i)=>`<label><input type="checkbox" name="widow-defence-reroll" value="${i}"> Die ${i+1} (${v})</label>`).join('')}</div>`+button('widowDefenceReroll','Sabotage · additional Roll Attempt');
  }
  if(state.players[responding].vibraniumSuit&&blackPanther.incoming(state,responding))
    content+=button('spendVibraniumSuit','Spend Vibranium Suit · prevent 3 damage');
  const forgeActions=forgemaster.choices(state,responding).map(({label},i)=>button('forgemasterAction',label,`data-choice="${i}"`));
  if(forgeActions.length)content+=`<div class="token-actions"><strong>${names[responding]} · The Mines and The Forge</strong><div class="controls">${forgeActions.join('')}</div></div>`;
  const shapeSeats=state.response?[responding]:state.stage==='announce'?[responding,state.active]:[responding];
  for(const owner of shapeSeats){
    const options=druid.shiftChoices(state,owner);
    if(options.length)content+=`<div class="token-actions"><strong>${names[owner]} · Shape Shift</strong><div class="controls">${options.map(form=>
      button('spendShapeShift',`Shift to ${druid.formName(form)} Form`,`data-target="${owner}" data-status="${form}"`)).join('')}</div></div>`;
  }
  const featherSeats=state.response?[responding]:state.nevermoreRoll?[state.nevermoreRoll.owner,state.nevermoreRoll.target]:[responding];
  for(const owner of featherSeats){
    const options=raveness.featherChoices(state,owner);
    if(options.length)content+=`<div class="token-actions"><strong>${names[owner]} · spend Feathers</strong><div class="controls">${options.map(option=>
      button('spendFeather',`${option.cost} Feather · ${option.label}`,`data-target="${owner}" data-status="${option.kind}"`)).join('')}</div></div>`;
  }
  const tokens=tokenChoices(state,responding);
  const tacticalActions=tacticalChoices(state,responding).map(({cost,label},index)=>
    button('spendTactical',`${cost} Tactical Advantage · ${label}`,`data-choice="${index}"`));
  const grimActions=grimChoices(state,responding).map(kind=>button('spendGrim',
    kind==='attempt'?'Grim Pursuit · extra Roll Attempt':'Grim Pursuit · roll for attack damage',`data-status="${kind}"`));
  const tokenActions=state.grimOverflow?grimActions:state.stage==='nyraDamage'?[]:state.tacticalOverflow||state.tacticalRemoval?tacticalActions:[
    ...tacticalActions,
    ...grimActions,
    ...necroActions(state,responding).map(({kind,label})=>button('necroAction',label,`data-status="${kind}"`)),
    ...(canHealNyra(state,responding)?[button('healNyra','Nyra’s Bond · heal Nyra by 2')]:[]),
    ...nyraRerolls(state,responding).map((value,i)=>button('nyraReroll',`Nyra takes 1 damage · reroll die ${i+1} (${value})`,`data-index="${i}"`)),
    ...artificerActions(state,responding).map(({key,label})=>button('artificerAction',label,`data-status="${key}"`)),
    ...(canBackStrike(state,responding)?[button('backStrike','Spend Back Strike')]:[]),
    ...Array.from({length:honorChoices(state,responding)},(_,i)=>button('spendHonor',
      `Spend ${i+1} Honor · +${i===0?1:3} damage`,`data-amount="${i+1}"`)),
    ...(canReload(state,responding)?[button('spendReload','Spend Reload')]:[]),
    ...(canMesmerize(state,responding)?[button('mesmerize','Spend Mesmerize')]:[]),
    ...bloodPowerChoices(state,responding).map(({cost,label},index)=>
      button('bloodPower',`${cost} Blood Power · ${label}`,`data-choice="${index}"`)),
    ...(tokens.flight?[button('flight',tokens.flight==='attack'?'Flight · make the attack undefendable':'Flight · avoid incoming damage')]:[]),
    ...tokens.seedling.map((v,i)=>button('seedling',`Seedling · reroll die ${i+1} (${v})`,`data-index="${i}"`)),
    ...(tokens.sapling?[button('sapling','Sapling · heal 1 and gain 1 CP')]:[]),
    ...(tokens.saplingDraw?[button('saplingDraw','Sapling · draw for 1 CP')]:[]),
    ...(tokens.dryad?[button('dryad','Dryad · add 3 damage')]:[]),
    ...tokens.dryadPrevent.map(status=>button('dryadPrevent',`Dryad · prevent ${statusLabel(status)}`,`data-status="${status}"`)),
    ...(tokens.wellspring?[button('wellspring','Spend Wellspring')]:[]),
    ...(tokens.smoke?[button('smoke','Spend Smoke Bomb')]:[]),
    ...(tokens.ninjutsu?[button('ninjutsu','Spend Ninjutsu')]:[]),
    ...(tokens.evadeSide?[button('evadeSide','Spend Evasive')]:[]),
    ...paladinBuffs.filter(key=>tokens[key]).map(key=>button(key,`Spend ${statusLabel(key)}`)),
    ...tokens.cleanse.flatMap(status=>status==='spellbound'?(state.players[responding].boundAbilities??[]).map(b=>button('useCleanse',`Cleanse Spellbound · ${b.key}`,`data-status="spellbound" data-index="${b.id}"`)):status==='bagOfTricks'?(state.players[responding].trickBags??[]).map(b=>button('useCleanse',`Cleanse Bag of Tricks from ${names[b.owner]}`,`data-status="bagOfTricks" data-index="${b.id}"`)):status==='timeBomb'?(state.players[responding].timeBombTimers??[]).map(b=>button('useCleanse',`Cleanse Time Bomb 0:0${b.ticks}`,`data-status="timeBomb" data-index="${b.id}"`)):[button('useCleanse',`Cleanse ${statusLabel(status)}`,`data-status="${status}"`)]),
    ...Array.from({length:tokens.boost},(_,i)=>button('boostChi',`Spend ${i+1} Chi · +${i+1} damage`,`data-amount="${i+1}"`)),
    ...Array.from({length:tokens.prevent},(_,i)=>button('preventChi',`Spend ${i+1} Chi · prevent ${i+1}`,`data-amount="${i+1}"`))
  ];
  if(tokenActions.length)content+=`<div class="token-actions"><strong>${names[responding]} · spend tokens</strong><div class="controls">${tokenActions.join('')}</div></div>`;
  const tithe=state.stage==='nyraDamage'||state.grimOverflow?{}:titheChoices(state,responding);
  const titheActions=[
    ...(tithe.draw?[button('titheDraw',`Draw 1 card · ${titheDrawCost(state.players[responding])} CP`)]:[]),
    ...(tithe.dice??[]).map((value,i)=>button('titheReroll',`Reroll die ${i+1} (${value}) · 1 CP`,`data-index="${i}"`))
  ];
  if(titheActions.length)content+=`<div class="token-actions"><strong>${names[responding]} · ${state.players[responding].upgrades?.Tithe?'Tithe II':'Tithe'}</strong><div class="controls">${titheActions.join('')}</div></div>`;
  }
  return `<section class="arena" aria-label="Match actions">
    <div class="phase"><span>Turn ${state.turn} · ${phase}</span><span>${state.stage==='offence' ? `Roll ${state.attempts}/${state.budget}` : ''}</span></div>
    <h2 tabindex="-1" id="action-title">${heading}</h2><p>Active hero · ${activeName}</p>
    ${detail?`<p>${detail}</p>`:''}${content}
    <details class="action-log"><summary>Action log</summary><ol reversed>${state.log.slice(0,35).map(event=>`<li>${event}</li>`).join('')}</ol></details>
    </section>`;
}
function render() {
  const logOpen=match.querySelector('.action-log')?.open;
  const openForge=new Set([...match.querySelectorAll('.forge-inventory[open]')].map(el=>el.dataset.seat));
  const openUpgrades=new Set([...match.querySelectorAll('.board-upgrades[open]')].map(el=>el.dataset.seat));
  const selected=boardOverride ?? cardActor(state);
  match.innerHTML=hero(0)+arena()+hero(1)+`<section class="mobile-board" aria-label="Hero boards"><div class="tabs">${names.map((name,i)=>button('board',`${name} board`,`data-index="${i}" aria-pressed="${selected===i}"`)).join('')}</div>${board(selected)}</section>`;
  match.querySelector('.action-log').open=!!logOpen;
  for(const details of match.querySelectorAll('.forge-inventory'))details.open=openForge.has(details.dataset.seat);
  for(const details of match.querySelectorAll('.board-upgrades'))details.open=openUpgrades.has(details.dataset.seat);
  if(handDialog.open)renderHand();
  try { localStorage.setItem(storageKey,JSON.stringify(state)); } catch {}
}
function renderHand() {
  const seat=cardActor(state);
  handTitle.textContent=`${names[seat]}’s hand · ${state.players[seat].hand.length}`;
  handContent.innerHTML=handPanel();
}
function handleAction(event) {
  const target=event.target.closest('button[data-action]');
  if (!target) return;
  const type=target.dataset.action, index=Number(target.dataset.index);
  if(type==='open-hand') {
    if(index!==cardActor(state)||state.stage==='finished')return;
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
  if (type==='board') {
    boardOverride=index;
    render();
    match.querySelector(`button[data-action="board"][data-index="${index}"]`).focus();
    return;
  }
  const oldState=state, oldStage=state.stage, oldSeat=cardActor(state);
  const action={type,index,id:index,ability:abilitiesFor(state,state.active)[Number(target.dataset.ability)]?.name,
    choice:Number(target.dataset.choice??document.getElementById('card-choice')?.value??0), target:Number(target.dataset.target),status:target.dataset.status, amount:Number(target.dataset.nyraSplit?document.getElementById('nyra-damage').value:target.dataset.amount), defence:target.dataset.defence};
  if(type==='widowDefenceReroll')action.indices=[...match.querySelectorAll('input[name="widow-defence-reroll"]:checked')].map(input=>Number(input.value));
  if(type==='abilityReroll')action.indices=[...match.querySelectorAll('input[name="ability-reroll"]:checked')].map(input=>Number(input.value));
  if(type==='extraDefence')action.indices=[...match.querySelectorAll('input[name="defence-reroll"]:checked')].map(input=>Number(input.value));
  state=transition(state,action,roll);
  if(oldStage!==state.stage || oldSeat!==cardActor(state) || type==='playCard' || type==='sell')selectedCard=null;
  if(handDialog.open && (oldStage!==state.stage || oldSeat!==cardActor(state) || (!oldState.retry&&state.retry) || (!oldState.cardRoll&&state.cardRoll) || (!oldState.mainAction&&state.mainAction)))handDialog.close();
  if (oldStage!==state.stage) boardOverride=null;
  render();
  const focus=oldStage!==state.stage ? document.getElementById('action-title')
    : type==='hold' ? match.querySelector(`button[data-index="${index}"][data-action="hold"]`) : match.querySelector('button[data-action="roll"]:enabled');
  if (focus && !handDialog.open) focus.focus({preventScroll:true});
  else if(handDialog.open) {
    const nextCard=handContent.querySelector('button[data-action="select-card"]');
    (nextCard??handDialog.querySelector('button')).focus({preventScroll:true});
  }
}
match.addEventListener('click',handleAction);
handContent.addEventListener('click',handleAction);
const viewer = document.getElementById('viewer');
const viewerImage = document.getElementById('viewer-image');
const viewerScroll = document.getElementById('viewer-scroll');
const front = document.getElementById('leaflet-front');
const back = document.getElementById('leaflet-back');
let viewerSeat, viewerLeaflet, viewerCard, zoom=1, pinch=null;
function setZoom(value) {
  zoom=bounded(value-1,3)+1;
  viewerImage.style.width=`${(viewerCard?Math.min(460,viewerScroll.clientWidth):viewerScroll.clientWidth)*zoom}px`;
}
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
const setupHeroes=state.players.map((_,seat)=>heroId(state,seat));
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
            ${HEROES[id].name}${id===currentHero?'<small aria-hidden="true">Selected</small>':''}
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

heroGroups.addEventListener('click',event=>{
  const option=event.target.closest('button[data-hero]');
  if(!option)return;
  const id=Number(option.dataset.hero);
  setupHeroes[pickerSeat]=id;
  setupHeroNames[pickerSeat].textContent=HEROES[id].name;
  heroPicker.close();
});

document.getElementById('reset').addEventListener('click',()=>{
  if ((state.attempts || state.turn>1) && state.stage!=='finished' && !confirm('Start a new match and replace the current one?')) return;
  state=createMatch(roll,{promo:document.getElementById('promos').checked,heroes:setupHeroes});
  names=heroNames(state);
  selectedCard=null;boardOverride=null;render();
});
document.getElementById('promos').checked=state.promo;
render();
