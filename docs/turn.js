// Turn boundaries and phase entry for the classic-script engine.

function needsTurnStartUpkeep(state, opening = false) {
  const cadence = heroRoster[heroId(state, state.active)].turnStartUpkeep;
  if (cadence === 'every-turn') return true;
  if (opening) return false;
  if (cadence === 'after-opening') return true;

  const player = state.players[state.active];
  return player.donut || player.strengthOcean || player.phoenixBurn || player.disruption ||
    player.bagOfTricks || player.cosmicFlare || player.timeBomb || player.disarm ||
    player.wound || druid.regenTotal(player) || nevermoreOwner(state) !== null ||
    upkeepDamage(player, state.active) || player.fireMastery || player.cursed ||
    player.powderKeg || player.nanite || player.holyPresence || player.bleed || player.nyra?.downed;
}

function resetUpkeepDamage(state) {
  state.upkeepEvaded = false;
  state.upkeepPrevention = 0;
  delete state.upkeepInvulnerability;
  delete state.upkeepDisruptionDamage;
  state.upkeepProtect = 0;
}

function resetOffensiveRoll(state, roll, enter) {
  const player = state.players[state.active];
  delete state.stormDice;
  iceman.onStart(state);
  psylocke.start(state);
  alchemist.start(state);
  scarletWitch.start(state, state.active, enter);
  Object.assign(state, {
    stage: player.knockdown ? 'knockdown' : 'offence',
    dice: [],
    held: [],
    defenceDice: [],
    attempts: 0,
    defenceKind: null,
    budget: player.entangle ? 2 : 3,
    wasEntangled: !!player.entangle,
    extraDefence: 0,
    pending: null,
    vineAttempts: 0
  });
  if (player.boundAbilities?.length) state.spellboundExpires = player.boundAbilities.map(binding => binding.id);
  else delete state.spellboundExpires;
  if (player.crimsonBands) state.bandsTurn = state.turn;
  else delete state.bandsTurn;
  if (player.decrepify) state.wasDecrepified = true;
  else delete state.wasDecrepified;
  if (enter) rogue.start(state, roll);
  if (player.constrict) state.wasConstricted = true;
  else delete state.wasConstricted;
}

function startOffensiveRoll(state, roll) {
  resetOffensiveRoll(state, roll, true);
}

function prepareMainPhaseOne(state) {
  resetOffensiveRoll(state, undefined, false);
  state.stage = 'main1';
}

function resolveIncome(state, roll, random) {
  const player = state.players[state.active];
  const name = heroNames(state)[state.active];
  const add = message => state.log.unshift(message);
  let skipped;
  let reason;

  if (player.alpha) {
    removeStatus(player, 'alpha');
    skipped = 'alpha';
    reason = 'due to Alpha';
  } else if (player.hero === jeanGrey.id && player.darkPhoenix) {
    skipped = 'dark-phoenix';
    reason = 'while Dark Phoenix is Active';
  } else if (player.concussion || state.disarmSkip) {
    const status = state.disarmSkip ? 'Disarm' : 'Concussion';
    skipped = status.toLowerCase();
    reason = `due to ${status}`;
  }

  if (skipped) {
    player.concussion = false;
    delete state.disarmSkip;
    state.income = {skipped};
    const phase = skipped === 'disarm' || skipped === 'concussion' ? 'income' : 'Income';
    add(`Turn ${state.turn}. ${name} skips ${phase} ${reason}.`);
  } else if (state.cards && player.premonition && !player.resurrected) {
    state.premonitionTask = {seat: state.active, kind: 'choose'};
    state.stage = 'incomePremonition';
    return;
  } else {
    const previousCP = player.cp;
    const coalBlocked = player.coal === 4 && previousCP < 15 && !player.resurrected;
    if (!player.resurrected) gainCP(player, 1);
    const previousHand = state.cards ? player.hand.length : player.hand;
    if (state.cards) drawCards(player, 1, random);
    else if (player.deck) {
      player.deck--;
      player.hand = Math.min(6, player.hand + 1);
    }
    const drawn = (state.cards ? player.hand.length : player.hand) - previousHand;
    state.income = {cp: player.cp - previousCP, drawn, ...(coalBlocked ? {coal: true} : {})};
    add(`Turn ${state.turn}. ${name} gains ${state.income.cp} CP and draws ${drawn} ${drawn === 1 ? 'card' : 'cards'} in the Income Phase.`);
  }

  if (player.entangle) add(`${name} has one fewer Roll Attempt due to Entangle.`);
  if (state.cards) prepareMainPhaseOne(state);
  else startOffensiveRoll(state, roll);
}

function finishActiveTurn(state) {
  const attacker = state.players[state.active];
  const name = heroNames(state)[state.active];
  const add = message => state.log.unshift(message);
  if(attacker.werewolf){
    if(!attacker.keepMoonShard)attacker.moonShard=Math.max(0,attacker.moonShard-1);
    if(!attacker.moonShard){attacker.werewolf=false;add('Twilight returns Werewolf to Pale Lady.');}
  }
  delete attacker.keepMoonShard;
  if(attacker.druidForm==='druid')druid.regenerate(attacker);
  delete state.regenerateChecked;
  delete state.repositioned;
  delete state.minesChecked;
  delete state.sunUpkeep;
  delete state.disarmSkip;
  delete state.woundsResolved;
  delete state.woundsRemoved;
  delete state.woundsAtStart;
  if(attacker.hex)removeStatus(attacker,'hex');
  delete state.nevermoreChecked;
  if(heroId(state,state.active)===headlessHorseman.id&&attacker.hauntedHeadSeat===1-state.active){
    grantStatus(attacker,'dreadful');
    add('The Haunted Head grants Dreadful at the end of the turn.');
  }
  if(state.horseUpkeep)delete state.horseUpkeep;
  if(state.necroUpkeep)delete state.necroUpkeep;
  if(heroId(state,state.active)===samurai.id&&state.attempts>0&&state.attempts<3){
    const before=attacker.honor??0;
    grantStatus(attacker,'honor');
    if(attacker.honor>before)add(`${name} gains Honor from Bushido.`);
  }
  if(state.bloodReward){
    delete state.bloodReward;
    grantStatus(attacker,'bloodPower');
    add(`${name} gains Blood Power for damaging an opponent with 2 Bleed.`);
  }
  if(attacker.shadowsStarted)removeStatus(attacker,'shadows');
  for(const player of state.players){player.chiFresh=0;player.spentSpirits=[];}
  state.vineAttempts=0;
  state.vinePaid=0;
  state.fertilized=false;
  if(heroId(state,state.active)===cursedPirate.id)cursedPirate.endTurn(state,state.active,add);
}

function advanceTurn(state, roll, random) {
  finishActiveTurn(state);
  state.active = 1 - state.active;
  state.turn++;
  delete state.widowBombChecked;
  delete state.cosmicFlareChecked;
  delete state.upkeepFlareDamage;
  delete state.upkeepBagDamage;
  delete state.upkeepBagHeal;
  const player=state.players[state.active];
  jeanGrey.startTurn(state, state.active);
  delete state.jeanBurnChecked;
  player.shadowsStarted=!!player.shadows;
  if(state.pirateKegChecked)delete state.pirateKegChecked;
  if(state.holyPresenceChecked)delete state.holyPresenceChecked;
  if(state.bleedChecked)delete state.bleedChecked;
  if(state.quickDrawChecked)delete state.quickDrawChecked;
  if (needsTurnStartUpkeep(state)) {
    state.pending = null;
    state.stage = 'upkeep';
    resetUpkeepDamage(state);
  } else resolveIncome(state, roll, random);
}

function finishUpkeep(state, roll, random) {
  const attacker = state.players[state.active];
  const defender = state.players[1-state.active];
  const names = heroNames(state);
  const add = message => state.log.unshift(message);
  if(state.upkeepBagHeal){attacker.hp+=state.upkeepBagHeal;add(`${names[state.active]} heals ${state.upkeepBagHeal} from Bag of Tricks at the end of Upkeep.`);}
  delete state.upkeepBagHeal;
  if(state.upkeepDonutHeal){attacker.hp+=state.upkeepDonutHeal;add(`${names[state.active]} heals ${state.upkeepDonutHeal} from Donut at the end of Upkeep.`);delete state.upkeepDonutHeal;}
  if(state.upkeepOceanHeal){attacker.hp+=state.upkeepOceanHeal;add(`${names[state.active]} heals ${state.upkeepOceanHeal} from Strength of the Ocean at the end of Upkeep.`);delete state.upkeepOceanHeal;}
  const nyraUpdate=huntress.upkeep(attacker);
  if(nyraUpdate)add(nyraUpdate);
  if(attacker.cursed){
    const saved=takeDamage(attacker,4);
    add(`${names[state.active]} takes 4 unpreventable damage from Cursed.`);
    if(saved)add(`${names[state.active]} survives through Blessing of Divinity.`);
  }
  if(attacker.fireMastery){
    removeStatus(attacker,'fireMastery');add(`${names[state.active]} cools off and loses 1 Fire Mastery.`);
  }
  const damage=upkeepIncoming(state);
  if(attacker.hp&&damage&&!state.upkeepEvaded){
    if(takeDamage(attacker,damage))add(`${names[state.active]} survives through Blessing of Divinity.`);
    add(`${names[state.active]} takes ${damage} upkeep damage from ${[(state.upkeepBagDamage??0)?'Bag of Tricks':'',attacker.burn?'Burn':'',attacker.poison?'Poison':'',state.upkeepDisruptionDamage?'Disruption':'',cursedPirate.foreignCoins(state,state.active)?'Cursed Doubloon':''].filter(Boolean).join(' and ')}.`);
  }
  attacker.hp=bounded(attacker.hp,60);delete state.upkeepBagDamage;
  resetUpkeepDamage(state);
  if(state.upkeepFlareDamage){
    takeDamage(defender,state.upkeepFlareDamage);
    add(`${names[1-state.active]} takes ${state.upkeepFlareDamage} damage from Cosmic Flare.`);
  }
  delete state.upkeepFlareDamage;
  if(!attacker.hp||!defender.hp){
    state.stage='finished';state.winner=!attacker.hp&&!defender.hp?'Draw':`${names[attacker.hp?state.active:1-state.active]} wins`;add(state.winner);
  } else if(state.turn===1&&state.income?.skipped==='first-turn')state.stage='main1';
  else resolveIncome(state, roll, random);
}
