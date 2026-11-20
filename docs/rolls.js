// Roll timing, visible dice and action seats for the classic-script engine.

const rollPhaseStages = new Set([
  'offence', 'announce', 'blind', 'effect', 'effectResponse', 'defence',
  'defenceResponse', 'damage', 'evasion', 'postHit', 'targeting', 'combustion',
  'pickpocket', 'sneakOffer', 'sneakRoll', 'monkChoice', 'ninjaGain', 'ninjutsuRoll',
  'ninjutsuChoice', 'pirateKegRoll', 'artRoll', 'seraphRoll', 'mesmerizeRoll', 'gunContest',
  'gunReload', 'gunDuelChoice', 'horseRoll', 'undeadRoll', 'necroChoice', 'horrifyChoice',
  'samuraiRoll', 'vampireChoice', 'seraphTarget', 'purify', 'dryadResponse', 'spiritPayment',
  'overgrowthWells', 'prey', 'druidReady', 'guardBreakRoll', 'guardOffer', 'sunMarked',
  'thorAbility', 'cyclopsAbility', 'gambitAbility', 'iceAbility', 'iceResolved', 'iceGlideReady',
  'iceGlideDeclare', 'jeanAbility', 'jeanResolved', 'psyAbility', 'paralyzeAfter', 'rogueAbility',
  'rogueInfluence', 'rogueSkyward', 'stormCharge', 'stormAbility', 'stormResolved', 'stormChoices',
  'deadpoolAbility', 'deadpoolPrepared', 'deadpoolResolved', 'santaAbility', 'santaTarget', 'santaRoll',
  'santaPrepared', 'mysticAbility', 'mysticStrongTarget', 'mysticContest', 'mysticPrepared', 'mysticResolved',
  'krampusAbility', 'krampusPrepared', 'krampusResolved', 'krampusChoices', 'krampusActivation', 'alchemistAbility',
  'alchemistChoices', 'alchemistPotions', 'alchemistDefence', 'wolverineAbility', 'wolverineResolved', 'wolverineBarrage',
  'wolverineRemove', 'wolverineSevere', 'alphaRoll',
]);

function resumeRollTask(state, key, parent = state[key].parent ?? null) {
  return {...state, [key]: parent, stage: state[key].resume};
}

function rollPhase(s) {
  if(s.deadpoolTask&&s.stage==='deadpoolChoices')return rollPhase(resumeRollTask(s,'deadpoolTask'));
  if(s.santaNogRoll)return rollPhase(resumeRollTask(s,'santaNogRoll',null));
  if(s.santaTask&&s.stage==='santaChoices')return rollPhase(resumeRollTask(s,'santaTask'));
  if(s.mysticTask&&s.stage==='mysticChoices')return rollPhase(resumeRollTask(s,'mysticTask'));
  if(s.krampusTask&&s.stage==='krampusChoices')return rollPhase(resumeRollTask(s,'krampusTask'));
  if(s.jeanTask&&s.stage==='jeanChoices')return rollPhase(resumeRollTask(s,'jeanTask'));
  if(s.iceTask&&s.stage==='iceChoices')return rollPhase(resumeRollTask(s,'iceTask'));
  if(s.gambitRoll)return s.gambitRoll.kind==='high'?false:rollPhase(resumeRollTask(s,'gambitRoll',null));
  if(s.gambitTask&&s.stage==='gambitSequence')return rollPhase(resumeRollTask(s,'gambitTask'));
  if(s.cyclopsTask&&s.stage==='cyclopsSequence')return rollPhase(resumeRollTask(s,'cyclopsTask'));
  if(s.thorTask)return rollPhase(resumeRollTask(s,'thorTask',null));
  if(s.scarletJinx)return true;
  if(s.lokiBag)return rollPhase(resumeRollTask(s,'lokiBag'));
  if(s.strangeTask)return !['main','main1'].includes(s.strangeTask.resume);
  if(s.cosmicRayRoll)return true;
  return s.mesmerizeRoll?.resume!=='upkeep'&&s.artRoll?.resume!=='upkeep'&&s.evasionReturnStage!=='upkeep'&&
    (s.evasionReturnStage!=='sideDamage'||s.sideDamage?.source==='Barbed Vine')&&rollPhaseStages.has(s.stage);
}

function opposedRollContext(roll, opponent) {
  return {dice: roll.dice, seat: roll.seat, owners: [roll.seat, opponent]};
}

function rollContext(s) {
 if(s.deadpoolDonutRoll)return {dice:s.deadpoolDonutRoll.dice,seat:s.deadpoolDonutRoll.seat};
 if(s.deadpoolLucky?.dice&&!s.cardRoll)return {dice:s.deadpoolLucky.dice,seat:s.deadpoolLucky.target};
 if(s.santaNogRoll)return {dice:s.santaNogRoll.dice,seat:s.santaNogRoll.seat};
 if(s.santaRoll&&!s.cardRoll){
  const roll=s.santaRoll;
  if(roll.dice.length===2)return opposedRollContext(roll,1-roll.seat);
  return {dice:roll.dice,seat:roll.seat,owners:undefined};
 }
 if(s.mysticContest&&!s.cardRoll)return opposedRollContext(s.mysticContest,1-s.mysticContest.seat);
 if(s.alchemistRoll&&!s.cardRoll)return {dice:s.alchemistRoll.dice,seat:s.alchemistRoll.seat};
 if(s.wolverineRageRoll&&!s.cardRoll)return {dice:s.wolverineRageRoll.dice,seat:s.wolverineRageRoll.seat};
 if(s.alphaRoll&&!s.cardRoll)return opposedRollContext(s.alphaRoll,s.alphaRoll.target);
 if(s.rogueRoll&&!s.cardRoll)return s.rogueRoll.kind==='skyward'?opposedRollContext(s.rogueRoll,1-s.rogueRoll.seat):{dice:s.rogueRoll.dice,seat:s.rogueRoll.seat};
 if(s.jeanBurnRoll&&!s.cardRoll)return {dice:s.jeanBurnRoll.dice,seat:s.jeanBurnRoll.seat};
 if(s.jeanTask&&s.stage==='jeanChoices'&&!s.cardRoll&&!s.retry)return rollContext(resumeRollTask(s,'jeanTask'));
 if(s.iceTask&&s.stage==='iceChoices'&&!s.cardRoll&&!s.retry)return rollContext(resumeRollTask(s,'iceTask'));
 if(s.gambitRoll&&!s.cardRoll)return {dice:s.gambitRoll.dice,seat:s.gambitRoll.seat};
 if(s.gambitTask&&s.stage==='gambitSequence'&&!s.cardRoll&&!s.retry)return gambit.forced(s)?null:rollContext(resumeRollTask(s,'gambitTask'));
 if(s.cyclopsTask&&s.stage==='cyclopsSequence'&&!s.cardRoll&&!s.retry)return cyclops.choosing(s)?null:rollContext(resumeRollTask(s,'cyclopsTask'));
 if(s.scarletJinx&&!s.cardRoll)return {dice:s.scarletJinx.dice,seat:s.scarletJinx.seat};
 if(s.lokiBag?.kind==='roll'&&!s.cardRoll)return {dice:s.lokiBag.dice,seat:s.lokiBag.seat};
 if(s.cosmicRayRoll&&!s.cardRoll)return {dice:s.cosmicRayRoll.dice,seat:s.cosmicRayRoll.seat};
 if(s.widowAgility&&!s.cardRoll)return {dice:s.widowAgility.dice,seat:s.widowAgility.seat};
 if(s.widowBombRoll&&!s.cardRoll)return {dice:s.widowBombRoll.dice,seat:s.active};
 if(s.sunGemRoll)return {dice:s.sunGemRoll.dice,seat:s.active};
 if(s.mesmerizeRoll&&!s.mesmerizeRoll.choosing)return {dice:s.mesmerizeRoll.dice,seat:s.mesmerizeRoll.seat};
 if(s.guardBreakRoll&&!s.cardRoll)return {dice:s.guardBreakRoll,seat:s.active};
 if(s.woundRoll&&!s.cardRoll)return {dice:s.woundRoll,seat:s.active};
 if(s.nevermoreRoll&&!s.cardRoll)return {dice:s.nevermoreRoll.dice,seat:s.nevermoreRoll.target};
 if(s.preyRoll&&!s.cardRoll)return {dice:s.preyRoll,seat:s.active};
 if(s.bleedRoll&&!s.cardRoll)return {dice:s.bleedRoll,seat:s.active};
 if(s.cardRoll) return {dice:s.cardRoll.dice,seat:s.cardRoll.roller??s.cardRoll.seat};
 if(s.stage==='gunReload')return {dice:s.gunReload.dice,seat:s.gunReload.seat};
 if(s.stage==='gunContest')return opposedRollContext(s.gunContest,1-s.gunContest.seat);
 if(s.stage==='undeadRoll')return {dice:s.undeadRoll.dice,seat:s.undeadRoll.seat};
 if(s.stage==='horseRoll')return {dice:s.horseRoll.dice,seat:s.horseRoll.seat};
 if(s.stage==='samuraiRoll')return {dice:s.samuraiRoll.dice,seat:s.samuraiRoll.seat};
 if(s.seraphRoll)return {dice:s.seraphRoll.dice,seat:s.seraphRoll.seat};
 if(s.artRoll) return {dice:s.artRoll.dice,seat:s.artRoll.seat};
 if(['offence','announce'].includes(s.stage) && s.dice.length) return {dice:s.dice,seat:s.active};
 if(['blind','pirateKegRoll','sneakRoll','ninjutsuRoll'].includes(s.stage)) return {dice:[s.effectDie],seat:s.active,scalar:true};
 if(s.stage==='evasion') return {dice:[s.effectDie],seat:s.evasionSeat??1-s.active,scalar:true};
 if(s.stage==='effectResponse') return {dice:s.pending.effectDice,seat:s.active};
 if(s.stage==='defenceResponse') return {dice:s.defenceDice,seat:1-s.active};
 return null;
}
function dieOwner(context, index) {
  return context?.owners?.[index] ?? context?.seat;
}

function diceOwnedBy(context, seat, state) {
  if (!context) return [];
  const locked = index => state && iceman.contextLocked(state, context, index);
  if (!context.owners) {
    if (context.seat !== seat) return [];
    if (!context.dice.some((_, index) => locked(index))) return context.dice;
    const dice = context.dice.slice();
    dice.forEach((_, index) => {
      if (locked(index)) delete dice[index];
    });
    return dice;
  }
  const dice = [];
  context.dice.forEach((value, index) => {
    if (dieOwner(context, index) === seat && !locked(index)) dice[index] = value;
  });
  return dice;
}

function lokiActor(state) {
  if (state.lokiTask) return state.lokiTask.seat;
  if (state.lokiIllusion) return state.lokiIllusion.kind === 'pick' ? state.active : state.lokiIllusion.seat;
  if (state.lokiBag) {
    return state.cardRoll?.seat ?? state.retry?.seat ??
      (state.lokiBag.kind === 'choose' ? state.lokiBag.owner : state.lokiBag.seat);
  }
}

// The player making a choice and the player allowed to respond can differ.
// Honour the existing order when multiple tasks are open in a saved game.
function pendingActionSeat(state, forCards = false) {
  if(state.deadpoolDonutRoll)return state.deadpoolDonutRoll.seat;
  if(state.deadpoolRps)return deadpool.rpsActor(state);
  if(state.deadpoolLucky)return state.deadpoolLucky.target;
  if(state.deadpoolTask&&state.stage==='deadpoolChoices')return state.deadpoolTask.seat;
  if(state.santaRemoval&&!state.santaNogRoll&&!state.deadpoolDonutRoll&&!state.sideDamage)return state.santaRemoval.choosing?state.santaRemoval.source:state.santaRemoval.seat;
  if(state.santaGift)return state.santaGift.stage==='hide'?state.santaGift.seat:1-state.santaGift.seat;
  if(state.santaNogRoll)return state.santaNogRoll.seat;
  if(state.santaTask&&state.stage==='santaChoices'){
    const task=state.santaTask, step=task.queue[0];
    return step?.kind==='apology'?1-task.seat:step?.target??task.seat;
  }
  if(state.santaRoll&&!state.cardRoll&&!state.retry)return state.santaRoll.seat;
  if(state.mysticTask&&state.stage==='mysticChoices')return state.mysticTask.seat;
  if(state.mysticContest&&!state.cardRoll&&!state.retry)return state.mysticContest.seat;
  if(forCards&&state.krampusActivation)return state.krampusActivation.seat;
  if(state.krampusOverflow!==undefined)return state.krampusOverflow;
  if(state.krampusActivation)return state.krampusActivation.seat;
  if(state.krampusTask&&state.stage==='krampusChoices')return state.krampusTask.seat;
  if(state.alchemistTask&&state.stage==='alchemistChoices')return state.alchemistTask.seat;
  if(state.alchemistRoll&&!state.cardRoll&&!state.retry)return state.alchemistRoll.seat;
  if(state.stage==='alchemistPotions'&&state.alchemistSpend)return state.alchemistSpend.seat;
  if(!forCards&&state.wolverineIntimidate)return state.wolverineIntimidate.target;
  if(!forCards&&state.wolverineGain&&!state.wolverineRageRoll)return state.wolverineGain.seat;
  if(state.wolverineRageRoll&&!state.cardRoll&&!state.retry)return state.wolverineRageRoll.seat;
  if(state.alphaRoll&&!state.cardRoll&&!state.retry)return state.alphaRoll.seat;
  if(forCards&&state.wolverineIntimidate)return state.wolverineIntimidate.target;
  if(forCards&&state.wolverineGain)return state.wolverineGain.seat;
  if(state.stormTask&&state.stage==='stormChoices')return state.stormTask.seat;
  if(state.rogueGain)return state.rogueGain.seat;
  if(state.rogueRoll&&!state.cardRoll&&!state.retry)return state.rogueRoll.seat;
  if(state.psyReveal)return state.psyReveal.seat;
  if(state.jeanBurnRoll&&!state.cardRoll&&(!forCards||!state.retry))return state.jeanBurnRoll.seat;
  if(state.jeanTask&&state.stage==='jeanChoices'&&!state.cardRoll&&!state.retry)return state.jeanTask.seat;
  if(state.iceFreezeChoice)return state.iceFreezeChoice.seat;
  if(state.iceTask&&state.stage==='iceChoices'&&!state.cardRoll&&!state.retry)return state.iceTask.seat;
  if(state.gambitRoll&&!state.cardRoll&&!state.retry)return state.gambitRoll.seat;
  if(state.gambitTask&&state.stage==='gambitSequence'&&!state.cardRoll&&!state.retry)return state.gambitTask.seat;
  if(state.cyclopsTask&&state.stage==='cyclopsSequence'&&!state.cardRoll&&!state.retry)return state.cyclopsTask.seat;
  if(state.thorOverflow)return state.thorOverflow.seat;
  if(state.thorTask&&state.stage==='thorSequence')return state.thorTask.seat;
  if(state.conjureTask)return 1-state.conjureTask.seat;
  if(state.scarletJinx&&!state.cardRoll&&!state.retry)return state.scarletJinx.seat;
  const lokiSeat = lokiActor(state);
  if (lokiSeat !== undefined) return lokiSeat;
  if(state.premonitionTask)return state.premonitionTask.seat;
  if(state.strangeTask&&state.stage!=='sideDamage')return state.strangeTask.seat;
  if(state.cosmicRayRoll)return state.cosmicRayRoll.seat;
  if(state.cosmicRayOverflow)return state.cosmicRayOverflow.seat;
  if(state.widowTask)return state.widowTask.seat;
  if(state.widowReveal)return state.widowReveal.seat;
  if(state.widowAgility)return state.widowAgility.seat;
  if(state.widowBombRoll)return state.active;
}


function actor(state) {
  const seat = pendingActionSeat(state);
  if (seat !== undefined) return seat;
  if(state.stage==='sunMarked'&&!state.pending.ultimate)return 1-state.active;
  if(state.forgeTask)return state.forgeTask.seat;
  if(['forgeMasterwork','forgeArmor'].includes(state.stage))return 1-state.active;
  if(state.stage==='duelMove')return state.duelMovement.seat;
  if(legal(state).collectShapeShift)return state.shapeOverflow.seat;
  if(legal(state).collectFeathers)return state.ravenFeathers.seat;
  if(state.stage==='ravenActivate')return state.ravenActivation.owner;
  if(state.stage==='ravenNevermoreRoll'||state.stage==='ravenDiscard')return state.active;
  if(state.stage==='ravenAttackChoice')return state.ravenAttackChoice.owner;
  if(state.grimOverflow)return state.grimOverflow.seat;
  if(state.stage==='undeadRoll')return state.undeadRoll.seat;
  if(state.stage==='horseRoll')return state.horseRoll.seat;
  if(state.growth)return state.growth.seat;
  if(state.retry)return state.retry.seat;
  if(state.petulant)return 1-state.petulant.seat;
  if(state.mainChoice)return state.mainChoice.seat;
  if(state.pirateChoice)return state.pirateChoice.seat;
  if(state.monkChoice)return state.monkChoice.seat;
  if(state.tacticalOverflow)return state.tacticalOverflow.seat;
  if(state.tacticalRemoval)return state.tacticalRemoval.seat;
  if(state.honorOverflow)return state.honorOverflow.seat;
  if(state.bloodOverflow)return state.bloodOverflow.seat;
  if(state.mesmerizeRoll)return state.mesmerizeRoll.seat;
  if(state.bleedRoll&&!state.cardRoll)return state.active;
  if(state.cardRoll)return state.cardRoll.seat;
  if(state.stage==='samuraiRoll')return state.samuraiRoll.seat;
  if(state.stage==='gunReload')return state.gunReload.seat;
  if(state.stage==='gunContest')return state.gunContest.seat;
  if(state.stage==='gunDuelChoice')return 1-state.active;
  if(state.seraphRoll)return state.seraphRoll.seat;
  if(state.artRoll)return state.artRoll.seat;
  if(state.mainAction)return 1-state.mainAction.seat;
  if(state.stage==='evasion')return state.evasionSeat??1-state.active;
  if(state.stage==='sideDamage')return state.sideDamage.seat;
  return ['announce','defence','defenceResponse','damage','nyraDamage','preventStatus','dryadResponse','defenceWells'].includes(state.stage) ? 1-state.active : state.active;
}

function cardActor(state) {
  if (state.response?.seat != null) return state.response.seat;
  const pendingSeat = pendingActionSeat(state, true) ?? state.grimOverflow?.seat;
  if (pendingSeat != null) return pendingSeat;
  if (state.stage === 'nyraDamage') return 1 - state.active;
  const overflowSeat = state.tacticalOverflow?.seat ?? state.tacticalRemoval?.seat ??
    state.honorOverflow?.seat ?? state.bloodOverflow?.seat;
  if (overflowSeat != null) return overflowSeat;
  if (state.cards && state.stage === 'damage' && !state.cardRoll && !state.retry &&
      hasResponse(state, state.active)) return state.active;
  return actor(state);
}
