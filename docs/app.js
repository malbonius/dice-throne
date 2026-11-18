const art = window.diceThroneArt;
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
  return `<span class="token-help">${button('status',`<span class="token"><img src="${art[tokenArt]}" alt="">${label}</span>`,
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
      ${button('open-hand','Hand',`data-index="${seat}" aria-label="Open ${names[seat]}’s hand" aria-haspopup="dialog" ${seat===cardActor(state)&&!['finished','nyraDamage'].includes(state.stage)?'':'disabled'}`)}</span>${button('inspect-leaflet','Leaflet',`class="leaflet" data-index="${seat}" aria-label="${names[seat]} leaflet"`)}</div>
  </section>`;
}
function tray(values,seat,editable,held=[]) {
  return `<div class="dice" role="group" aria-label="${names[seat]} dice">${values.map((value,i) => {
    if (!value) return '<span class="die empty" aria-hidden="true">·</span>';
    const label = `${value} ${HEROES[heroId(state,seat)].symbols[value-1]}`;
    const picture = `<img src="${art.dice[heroId(state,seat)][value-1]}" alt="${label}">`;
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
  if(state.tacticalOverflow){
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
    content=tray(state.cardRoll.dice,seat,false)+(allowed.abilityReroll?rerollDice(state.cardRoll.dice,state.cardRoll.ninjaRerolls,v=>v!==4&&v!==5):'')+button('finishCardRoll','Resolve card roll','class="primary"');
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
      detail=state.attempts ? 'Tap dice to keep them, reroll the rest, or announce an available ability.' : 'Roll all five dice to begin.';
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
    case 'upkeep': {
      phase='Upkeep'; heading=`${activeName} resolves upkeep`;
      const hero=state.players[state.active];
      detail=[heroId(state,state.active)===gunslinger.id&&hero.reload!==2&&!state.quickDrawChecked?'Quick Draw grants Reload.':'',hero.nyra?.downed?(hero.nyra.hp>=5?'Nyra becomes Active.':'Nyra heals 1 and remains Downed.'):'',hero.bleed&&!state.bleedChecked?`Roll for ${hero.bleed} Bleed.`:'',hero.holyPresence&&!state.holyPresenceChecked?`Holy Presence deals ${hero.holyPresence} damage to ${names[1-state.active]}.`:'',heroId(state,state.active)===7&&!state.fertilized?'Fertilize grows one Spirit.':'',hero.fireMastery?'Lose 1 Fire Mastery.':'',hero.cursed?'Cursed deals 4 unpreventable damage.':'',hero.powderKeg&&!state.pirateKegChecked?'Roll for Powder Keg.':'',cursedPirate.foreignCoins(state,state.active)?'Opponent’s Doubloons deal upkeep damage.':'',hero.burn&&!state.upkeepEvaded?'Burn deals 2 damage.':'',hero.poison&&!state.upkeepEvaded?`Poison deals ${hero.poison} damage.`:'',state.upkeepPrevention?`Chi prevents ${state.upkeepPrevention} damage.`:''].filter(Boolean).join(' ');
      content=(allowed.collectSynth?button('collectSynth','Use Scrap Collector'):'')+(allowed.clearNanites?button('clearNanites','Roll to clear Nanites'):'')+
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
      phase=state.sideDamage.endTurn?'End of turn':state.sideDamage.source==='Barbed Vine'?'End of Roll Phase':state.sideDamage.source==='Powder Keg'?'Powder Keg damage':'Main Phase damage';
      heading=state.sideDamage.source;
      detail=`${actingName} has ${sideIncoming(state.sideDamage)} incoming damage.`;
      content=button('resolveSideDamage','Resolve damage','class="primary"'); break;
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
      detail=`${actingName} rolls ${effectDiceCount(p)} separate effect dice to determine the ability’s effects.`;
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
      content=button('settle',p.damage?'Resolve damage':'Resolve ability','class="primary"'); break;
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
        +`<div class="controls">${allowed.evade?button('evade',`${actingName} spends Evasive`):''}${allowed.evadeReturn?button('evadeReturn',`${activeName} spends Evasive`):''}${button('settle',nyraIncoming(state)?'Assign damage':'Resolve damage','class="primary"')}</div>`; break;
    case 'evasion':
      phase='Avoid damage'; heading=`${actingName} checks ${statusLabel(state.evasionToken??'evasive')}`;
      detail=state.evasionToken==='smoke'?'A 1–3 avoids the incoming damage.':'A 1 or 2 avoids the incoming damage.';
      content=tray([state.effectDie],seat,false)+button('resolveEvade','Resolve roll','class="primary"'); break;
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
  const tokens=tokenChoices(state,responding);
  const tacticalActions=tacticalChoices(state,responding).map(({cost,label},index)=>
    button('spendTactical',`${cost} Tactical Advantage · ${label}`,`data-choice="${index}"`));
  const tokenActions=state.stage==='nyraDamage'?[]:state.tacticalOverflow||state.tacticalRemoval?tacticalActions:[
    ...tacticalActions,
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
    ...tokens.cleanse.map(status=>button('useCleanse',`Cleanse ${statusLabel(status)}`,`data-status="${status}"`)),
    ...Array.from({length:tokens.boost},(_,i)=>button('boostChi',`Spend ${i+1} Chi · +${i+1} damage`,`data-amount="${i+1}"`)),
    ...Array.from({length:tokens.prevent},(_,i)=>button('preventChi',`Spend ${i+1} Chi · prevent ${i+1}`,`data-amount="${i+1}"`))
  ];
  if(tokenActions.length)content+=`<div class="token-actions"><strong>${names[responding]} · spend tokens</strong><div class="controls">${tokenActions.join('')}</div></div>`;
  const tithe=state.stage==='nyraDamage'?{}:titheChoices(state,responding);
  const titheActions=[
    ...(tithe.draw?[button('titheDraw',`Draw 1 card · ${titheDrawCost(state.players[responding])} CP`)]:[]),
    ...(tithe.dice??[]).map((value,i)=>button('titheReroll',`Reroll die ${i+1} (${value}) · 1 CP`,`data-index="${i}"`))
  ];
  if(titheActions.length)content+=`<div class="token-actions"><strong>${names[responding]} · ${state.players[responding].upgrades?.Tithe?'Tithe II':'Tithe'}</strong><div class="controls">${titheActions.join('')}</div></div>`;
  return `<section class="arena" aria-label="Match actions">
    <div class="phase"><span>Turn ${state.turn} · ${phase}</span><span>${state.stage==='offence' ? `Roll ${state.attempts}/${state.budget}` : ''}</span></div>
    <h2 tabindex="-1" id="action-title">${heading}</h2><p>Active hero · ${activeName}</p>
    ${detail?`<p>${detail}</p>`:''}${content}
    <details class="action-log"><summary>Action log</summary><ol reversed>${state.log.slice(0,35).map(event=>`<li>${event}</li>`).join('')}</ol></details>
    </section>`;
}
function render() {
  const logOpen=match.querySelector('.action-log')?.open;
  const openUpgrades=new Set([...match.querySelectorAll('.board-upgrades[open]')].map(el=>el.dataset.seat));
  const selected=boardOverride ?? cardActor(state);
  match.innerHTML=hero(0)+arena()+hero(1)+`<section class="mobile-board" aria-label="Hero boards"><div class="tabs">${names.map((name,i)=>button('board',`${name} board`,`data-index="${i}" aria-pressed="${selected===i}"`)).join('')}</div>${board(selected)}</section>`;
  match.querySelector('.action-log').open=!!logOpen;
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
    viewerImage.src=viewerCard<=18?art.sharedCards[viewerCard-1]:art.uniqueCards[heroId(state,viewerSeat)][viewerCard-19];
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
