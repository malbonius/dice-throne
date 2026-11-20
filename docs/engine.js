const sharedCards = [
 ['Transference!',2,'main'],['What Status Effects?',2,'main'],['Vegas Baby!',0,'main'],['Get That Outta Here!',1,'main'],
 ['Triple Up!',2,'instant'],['Double Up!',1,'instant'],['Buh, Bye!',2,'instant'],['Tip It!',1,'instant'],['Getting Paid!',0,'instant'],
 ['Not This Time!',1,'roll'],['Twice as Wild!',3,'roll'],['Try, Try Again!',1,'roll'],['So Wild!',2,'roll'],['Samesies!',1,'roll'],
 ['One More Time!',1,'roll'],['Helping Hand!',1,'roll'],['Better D!',0,'roll'],['Six-It!',1,'roll']
];
const heroRoster = [barbarian, moonElf, pyromancer, shadowThief, monk, paladin, ninja, treant, cursedPirate, artificer, seraph, vampireLord, gunslinger, samurai, tactician, huntress, headlessHorseman, necromancer, paleLady, raveness, druid, duelist, forgemaster, sunElf, blackPanther, blackWidow, captainMarvel, doctorStrange, loki, scarletWitch, spiderMan, thor, cyclops, gambit, iceman, jeanGrey, psylocke, rogue, storm, wolverine, alchemist, krampus, mysticBrawler, santa, deadpool];
const HEROES = heroRoster.map(hero => hero.board);
// Leaflet entries use true for ordinary gains and a function for hero-specific gains.
const positiveStatusGains = Object.assign(Object.create(null), ...heroRoster.map(hero => hero.leafletPositives));
const positiveStatusKeys = Object.keys(positiveStatusGains);

function leafletPositiveStatuses(state, seat) {
 return Object.keys(heroRoster[heroId(state, seat)]?.leafletPositives ?? {});
}

function gainCopiedStatus(state, seat, key, source = seat) {
 const gain = positiveStatusGains[key];
 if (typeof gain === 'function') gain(state, seat, source);
 else grantStatus(state.players[seat], key);
}

const abilityEffects = Object.assign({}, ...heroRoster.map(hero => hero.effects));
const abilityEffectDice = Object.assign(
  {}, ...heroRoster.map(hero => hero.effectDiceCount)
);
const cardInfo = (seat,id) => {
 const hero=heroRoster[seat], firstAction=19+hero.upgrades.length;
 const upgrade=hero.extraUpgrades?.[id]??(id>=19&&id<firstAction?hero.upgrades[id-19]:null);
 if(upgrade) {
  const [name,cost,slot,ability,level=2,extra]=upgrade;
  return {name,cost,slot,ability,level,extra,phase:'upgrade'};
 }
 const [name,cost,phase]=id<=18?sharedCards[id-1]:heroRoster[seat].cards[id-firstAction];
 return hero.leadershipIds?.includes(id)?{name,cost,phase,leadership:true}:{name,cost,phase};
};
const newStatuses=['powderKeg','wither','parlay','synth','nanite','flight','blindingLight','holyPresence','bloodPower','bleed','mesmerize','bounty','reload','honor','shame','backStrike','tactical','constrict','nyraBond','dreadful','grim','decrepify','prey','feather','hex','wound','regenerate','regenerate1','guardBreak','disarm','chargedGem','sunMarked','kineticEnergy','vibraniumSuit','covertOps','agility','timeBomb','cosmicRay','cosmicFlare','radiance','premonition','dejaVu','crimsonBands','illusion','bagOfTricks','spellbound','probabilityManipulation','realityWarp','conjure','crackle','combo','invisibility','webbed','electrokinesis','support','battlePlan','focusFire','dissolution','disruption','iceShard','diceCube','glide','forceField','acuity','flameBlast','phoenixBurn','paralyze','infiltration','influence','ionicEnergy','ionicEnergy2','skyward','tornado','windShear','rage','alpha','punchify','bolsterate','cleansitude','toxification','gift','coal','strengthOcean','strengthMountain','strengthSky','cheer','eggNog','donut','onomatopoeia','rps'];
const statusKeys=['blind','entangle','evasive','targeted','concussion','burn','knockdown','fireMastery','poison','shadows','sneak','chi','cleanse','crit','accuracy','protect','retribution','delayedPoison','smoke','ninjutsu','wellspring','barbed',...newStatuses.filter(key=>!['covertOps','cosmicRay','glide'].includes(key))];
const negativeStatuses=['entangle','blind','concussion','targeted','burn','knockdown','poison','delayedPoison','barbed','powderKeg','wither','parlay','nanite','blindingLight','bleed','bounty','shame','constrict','decrepify','prey','hex','wound','disarm','sunMarked','timeBomb','crimsonBands','realityWarp','webbed','focusFire','disruption','diceCube','phoenixBurn','paralyze','influence','coal'];
const nonTransferableStatuses = new Set([
 'holyPresence', 'hex', 'vibraniumSuit', 'illusion', 'spellbound', 'combo',
 'invisibility', 'alpha', 'gift', 'onomatopoeia', ...mysticBrawler.keys, ...alchemist.types
]);
const spiritTypes=['seedling','sapling','dryad'];
const spiritCaps={seedling:3,sapling:2,dryad:1};
const spiritTotal=p=>spiritTypes.reduce((total,key)=>total+(p[key]??0),0);
const canSpendSpirit=(p,kind)=>p[kind]>0&&!p.spentSpirits?.includes(kind);
function spendSpirit(p,kind){
 p[kind]--;
 (p.spentSpirits??=[]).push(kind);
}
function growthChoices(s){
 const g=s.growth,p=s.players[g.seat];
 return spiritTypes.filter((key,index)=>{
   if(!index)return !g.original&&(p.seedling??0)<3;
   const from=spiritTypes[index-1];
   return (p[from]??0)>0&&(!g.original||g.original[from]>0)&&(p[key]??0)<spiritCaps[key];
 });
}
function queueGrowth(s,seat,left,source,after='resume',extra={}){
 if(!left)return false;
 s.growth={seat,left,source,after,resume:s.stage,...extra};
 if(!growthChoices(s).length){s.growth=null;return false;}
 s.stage='growSpirits';
 return true;
}
function spiritDiscards(p,max){
 const choices=[];
 for(let seedling=0;seedling<=Math.min(p.seedling??0,max);seedling++)
  for(let sapling=0;sapling<=Math.min(p.sapling??0,max-seedling);sapling++)
   for(let dryad=0;dryad<=Math.min(p.dryad??0,max-seedling-sapling);dryad++)
    choices.push({seedling,sapling,dryad});
 return choices.sort((a,b)=>spiritTotal(a)-spiritTotal(b));
}
const discardLabel=choice=>spiritTypes.filter(k=>choice[k]).map(k=>`${choice[k]} ${statusLabel(k)}`).join(' + ')||'Keep Spirits';
function discardSpirits(player,choice){
 for(const key of spiritTypes)player[key]=(player[key]??0)-choice[key];
 return spiritTotal(choice);
}
const paladinBuffs=['protect','retribution','crit','accuracy'];
const statusLabel = s=>s==='rps'?'RPS':s==='donut'?'Donut':s==='onomatopoeia'?'Onomatopoeia':s==='cheer'?'Cheer':s==='eggNog'?'Egg Nog':s==='strengthOcean'?'Strength of the Ocean':s==='strengthMountain'?'Strength of the Mountain':s==='strengthSky'?'Strength of the Sky':s==='windShear'?'Wind Shear':s==='ionicEnergy'?'Ionic Energy (1)':s==='ionicEnergy2'?'Ionic Energy (2)':s==='forceField'?'Force Field':s==='flameBlast'?'Flame Blast':s==='phoenixBurn'?'Phoenix Burn':s==='iceShard'?'Ice Shard':s==='diceCube'?'Dice Cube':s==='battlePlan'?'Battle Plan':s==='focusFire'?'Focus Fire':s==='probabilityManipulation'?'Probability Manipulation':s==='realityWarp'?'Reality Warp':s==='bagOfTricks'?'Bag of Tricks':s==='dejaVu'?'Déjà Vu':s==='crimsonBands'?'Crimson Bands':s==='cosmicRay'?'Cosmic Ray':s==='cosmicFlare'?'Cosmic Flare':s==='covertOps'?'Covert Ops':s==='timeBomb'?'Time Bomb':s==='kineticEnergy'?'Kinetic Energy':s==='vibraniumSuit'?'Vibranium Suit':s==='chargedGem'?'Charged Gem':s==='sunMarked'?'Sun Marked':s==='guardBreak'?'Guard Break':s==='regenerate1'?'Regenerate (1)':s==='regenerate'?'Regenerate (2)':s==='decrepify'?'Decrep-ify':s==='grim'?'Grim Pursuit':s==='nyraBond'?'Nyra’s Bond':s==='tactical'?'Tactical Advantage':s==='backStrike'?'Back Strike':s==='bloodPower'?'Blood Power':s==='mesmerize'?'Mesmerize':s==='blindingLight'?'Blinding Light':s==='holyPresence'?'Holy Presence':s==='powderKeg'?'Powder Keg':s==='doubloon'?'Cursed Doubloon':s==='barbed'?'Barbed Vine':s==='smoke'?'Smoke Bomb':s==='delayedPoison'?'Delayed Poison':s==='blessing'?'Blessing of Divinity':s==='fireMastery'?'Fire Mastery':s==='sneak'?'Sneak Attack':s[0].toUpperCase()+s.slice(1);
const statusCap=(p,key)=>['donut','onomatopoeia'].includes(key)?2:key==='rps'?1:key==='cheer'?3:key==='eggNog'?5:mysticBrawler.keys.includes(key)?mysticBrawler.caps[key]:key==='coal'?4:key==='gift'?3:alchemist.types.includes(key)?alchemist.limits[key]:key==='rage'?3:key==='tornado'?4:key==='influence'?3:key==='skyward'?2:['ionicEnergy','ionicEnergy2'].includes(key)?rogue.cap(p):key==='infiltration'?2:key==='acuity'?4:key==='flameBlast'?5:key==='iceShard'?5:key==='diceCube'?2:key==='dissolution'?2:key==='battlePlan'?4:key==='support'?3:key==='focusFire'?2:key==='electrokinesis'?4:key==='probabilityManipulation'?2:key==='crackle'?3:key==='spellbound'?3:['illusion','bagOfTricks'].includes(key)?2:key==='premonition'?3:key==='cosmicRay'||key==='radiance'?2:key==='cosmicFlare'?3:key==='covertOps'?3:['agility','timeBomb'].includes(key)?2:key==='kineticEnergy'?(p.upgrades?.['Energy Absorption']?7:8):key==='feather'?(p.featherCap??5):key==='dreadful'?5:key==='synth'?7:key==='tactical'?(p.tacticalCap??5):key==='bloodPower'?5:key==='chi'?(p.chiCap??5):key==='fireMastery'?(p.masteryCap??5):['delayedPoison','wither','holyPresence','bleed','reload','honor','shame','prey','wound','regenerate','regenerate1','guardBreak'].includes(key)?2:['evasive','poison','cleanse','ninjutsu','nanite','flight','grim'].includes(key)?3:1;
const grantStatus = (p,key,amount=1)=>{
 if(alchemist.types.includes(key))return;
 if(psylocke.blockDirect(p,key,amount))return;
 if(['ionicEnergy','ionicEnergy2'].includes(key)){rogue.rawGain(p,key,amount);return;}
 if(key==='phoenixBurn'&&!p.phoenixBurn)p.phoenixBurnEpoch=(p.phoenixBurnEpoch??0)+1;
 if(key==='timeBomb'){p.timeBombTimers??=[];if(p.timeBombTimers.length<2)p.timeBombTimers.push({id:Math.random(),ticks:2});blackWidow.sync(p);return;}
 if(key==='kineticEnergy'){blackPanther.gain(p,amount);return;}
 if(key==='regenerate'){druid.regenerate(p,amount);return;}
 if(key==='regenerate1'){p.regenerate1=(p.regenerate1??0)+Math.min(amount,2-druid.regenTotal(p));return;}
 const prior=p[key]||0, cap=statusCap(p,key);
 p[key]=cap>1?bounded(prior+amount,cap):true;
 if(key==='chi')p.chiFresh=(p.chiFresh??0)+p.chi-prior;
};
const removeStatus = (p,key,tokenId)=>{if(alchemist.types.includes(key)){alchemist.remove(p,key,tokenId);return;}if(key==='spellbound'){loki.removeBound(p,tokenId);return;}if(key==='bagOfTricks'){loki.removeBag(p,tokenId);return;}if(key==='covertOps'||key==='cosmicRay')return;if(key==='timeBomb'){blackWidow.removeBomb(p,tokenId);return;}p[key]=statusCap(p,key)>1?Math.max(0,(p[key]||0)-1):false;if(key==='shadows')p.shadowsStarted=false;if(key==='chi')p.chiFresh=Math.max(0,(p.chiFresh??0)-1);};

function shuffle(cards,random) {
 const result=cards.slice();
 for(let i=result.length-1;i>0;i--){
  const j=Math.floor(random()*(i+1));
  [result[i],result[j]]=[result[j],result[i]];
 }
 return result;
}
function drawCards(p,count,random,excluded) {
 if(p.resurrected)return;
 while(count-->0){
  if(!p.deck.length) {
   const refill=p.discard.filter(id=>id!==excluded);
   if(!refill.length) break;
   p.deck=shuffle(refill,random);
   p.discard=p.discard.filter(id=>id===excluded);
  }
  p.hand.push(p.deck.pop());
 }
}
function cardsFor(seat,p,includePromo,random){
 const promoId=heroRoster[p.hero??seat].promoId??33;
 p.deck=shuffle(Array.from({length:includePromo?promoId:promoId-1},(_,i)=>i+1).filter(id=>id!==heroRoster[p.hero??seat].startingSpell),random);
 p.hand=[];p.upgrades={};p.discard=[];
 drawCards(p,4,random);
}
function abilitiesFor(state,seat){
 const equipped=state.players[seat].upgrades??{};
 return boardFor(state,seat).abilities.flatMap(base=>{
  if((base.upgradeSlot??base.name)===state.players[seat].covered)return [];
  const id=equipped[base.upgradeSlot??base.name];
  if(!id)return [base];
  const c=seatCard(state,seat,id);
  return [{...base,...c.ability,label:c.name,...c.ability?.variants?.[base.variant]},...(c.extra?[c.extra]:[])];
 });
}
function price(state,seat,id) {
 const c=seatCard(state,seat,id);
 const previous=state.players[seat].upgrades[c.slot];
 return previous?Math.max(0,c.cost-seatCard(state,seat,previous).cost):c.cost;
}
const isMain=s=>s.stage==='main1'||s.stage==='main';
function discardRandom(p,random){
 if(p.hand.length)p.discard.push(p.hand.splice(Math.floor(random()*p.hand.length),1)[0]);
}
const attackLocked=s=>s.deadpoolTask?.locked||s.deadpoolFourthResume?.locked||s.santaTask?.locked||s.santaNogRoll?.locked||s.mysticTask?.locked||s.krampusTask?.locked||s.krampusActivation?.locked||s.jeanTask?.locked||s.pending?.ultimate&&['jeanAbility','jeanResolved','psyAbility','paralyzeAfter','rogueAbility','rogueInfluence','rogueSkyward','stormCharge','stormAbility','stormResolved','stormChoices','deadpoolAbility','deadpoolPrepared','deadpoolResolved','santaAbility','santaTarget','santaRoll','santaPrepared','mysticAbility','mysticStrongTarget','mysticContest','mysticPrepared','mysticResolved','krampusAbility','krampusPrepared','krampusResolved','alchemistAbility','alchemistChoices','alchemistPotions','alchemistDefence','wolverineAbility','wolverineResolved','wolverineBarrage','wolverineRemove','wolverineSevere','alphaRoll'].includes(s.stage)||s.iceTask?.locked||s.pending?.ultimate&&['iceAbility','iceResolved'].includes(s.stage)||s.gambitTask?.locked||s.pending?.ultimate&&s.stage==='gambitAbility'||s.cyclopsTask?.locked||s.pending?.ultimate&&s.stage==='cyclopsAbility'||s.thorTask?.locked||s.pending?.ultimate&&s.stage==='thorAbility'||s.lokiBag?.locked||s.pending?.ultimate&&['lokiChoices','lokiAbility'].includes(s.stage)||s.pending?.ultimate&&['strangeSpells','strangeAbility'].includes(s.stage)||s.cosmicRayRoll?.locked||s.pending?.ultimate&&['widowAbility','widowSearch'].includes(s.stage)||s.sideDamage?.pantherLocked||s.pending?.ultimate&&s.stage==='pantherAbility'||s.pending?.ultimate&&s.stage==='sunMarked'||s.pending?.ultimate&&['forgeSearch','forgeAbility'].includes(s.stage)||s.pending?.ultimate&&s.stage==='duelMove'||s.ravenActivation?.locked||s.pending?.ultimate&&['ravenAbility','prey','druidReady'].includes(s.stage)||s.undeadRoll?.resume==='locked'||s.stage==='undeadRemove'&&s.undeadResume==='locked'||s.stage==='locked'||s.horseRoll?.resume==='locked'||s.gunReload?.resume==='locked'||s.artRoll?.resume==='locked'||s.seraphRoll?.resume==='locked'||s.stage==='sideDamage'&&s.sideDamage.resume==='locked'||s.ninjutsuReturnStage==='locked'||s.pending?.ultimate&&['sneakOffer','growSpirits','evasion'].includes(s.stage);
function canPlayFromHand(state, seat) {
  return [0,1].includes(seat) && (!state.response || state.response.seat === seat);
}

function cardChoices(s,seat,id) {
 if(s.deadpoolRps||s.deadpoolRemoval||s.deadpoolTask&&s.stage==='deadpoolChoices')return [];
 if((s.deadpoolDonutRoll||s.deadpoolLucky)&&![8,9,11,12,13,14,16,18].includes(id))return [];
 if(s.santaGift||s.santaRemoval&&!s.santaNogRoll&&!s.deadpoolDonutRoll||s.santaTask&&s.stage==='santaChoices')return [];
 if(s.santaNogRoll&&![8,9,11,12,13,14,16,18].includes(id))return [];
 if(s.santaRoll&&![8,9,11,12,13,14,16,18].includes(id)&&!(heroId(s,seat)===santa.id&&[27,32].includes(id)))return [];
 const p=s.players[seat], hero=heroId(s,seat), names=heroNames(s);
 if(s.mysticTask&&s.stage==='mysticChoices')return [];
 if(s.krampusTask&&s.stage==='krampusChoices'||s.krampusOverflow!==undefined)return [];
 if(s.krampusActivation&&!(hero===krampus.id&&seat===s.krampusActivation.seat&&[28,29,30,31].includes(id)))return [];
 if(!s.cards || s.alchemistTask&&s.stage==='alchemistChoices' || s.alchemistSpend&&s.stage==='alchemistPotions'&&seat!==s.alchemistSpend.seat || s.wolverineIntimidate || s.wolverineGain&&!s.wolverineRageRoll || s.stormTask&&s.stage==='stormChoices' || s.rogueGain || s.psyReveal || s.iceFreezeChoice || s.conjureTask || s.lokiTask || s.lokiIllusion || s.lokiBag?.kind==='choose' || s.widowTask || s.widowReveal || s.forgeTask || s.retry || s.growth || s.mainChoice || s.pirateChoice || s.bloodOverflow || s.honorOverflow || s.grimOverflow || s.tacticalOverflow || s.tacticalRemoval || s.mesmerizeRoll?.choosing || ['artSpanner','artBuild','artFreeBots'].includes(s.stage) || !p.hand.includes(id) ||['finished','discard','nyraDamage','petulant','paleMoonChoice'].includes(s.stage)) return [];
 const c=seatCard(s,seat,id), d=rollContext(s);
 if(s.mysticContest&&![8,9,11,12,13,14,16,18].includes(id)&&!(hero===mysticBrawler.id&&[31,32,33].includes(id)))return [];
 if(s.alchemistRoll&&![8,9,11,12,13,14,16,18].includes(id))return [];
 if(s.wolverineRageRoll&&![8,9,11,12,13,14,16,18].includes(id))return [];
 if(s.alphaRoll&&![8,9,11,12,13,14,16,18].includes(id))return [];
 if(s.rogueRoll&&![8,9,11,12,13,14,16,18].includes(id)&&!(hero===rogue.id&&id===32))return [];
 if(s.thorOverflow||cyclops.choosing(s)||gambit.forced(s))return [];
 if(s.jeanTask&&s.stage==='jeanChoices'&&!['roll','instant'].includes(c.phase))return [];
 if(s.iceTask&&s.stage==='iceChoices'&&!['roll','instant'].includes(c.phase))return [];
 if(s.sideDamage&&hero===iceman.id&&id>18)return [];
 if(s.gambitTask&&s.stage==='gambitSequence'&&!['roll','instant'].includes(c.phase))return [];
 if(s.sideDamage&&hero===gambit.id&&id>18)return [];
 if(s.cyclopsTask&&s.stage==='cyclopsSequence'&&!['roll','instant'].includes(c.phase))return [];
 if(s.sideDamage&&hero===cyclops.id&&[29,30,31,32,33].includes(id))return [];
 if(s.sideDamage&&hero===thor.id&&[30,31,33].includes(id))return [];
 if(thor.isolated(s)&&!thor.isolatedCard(s,seat,id))return [];
 if(s.thorTask&&s.stage==='thorSequence'&&c.phase!=='instant')return [];
 if(['ore','spell','rage'].includes(c.phase))return [];
 if(s.premonitionTask||s.strangeTask&&s.stage!=='sideDamage'||doctorStrange.bandsBlocks(s,seat))return [];
 if(s.lokiBag&&(!['instant','roll'].includes(c.phase)||c.phase==='roll'&&!s.lokiBag.outwit&&!rollPhase(s)))return [];
 if(s.cosmicRayRoll&&(s.cosmicRayRoll.locked||![8,9,11,12,13,14,16,18].includes(id)))return [];
 if(s.cosmicRayOverflow&&!s.cosmicRayRoll)return [];
 if((s.widowAgility||s.widowBombRoll)&&![8,9,11,12,13,14,16,18].includes(id)&&!(hero===blackWidow.id&&id===29&&s.widowAgility)&&!(hero===thor.id&&id===28)&&!(hero===cyclops.id&&id===27)&&!(hero===gambit.id&&id===29))return [];
 if((s.widowAgility||s.widowBombRoll)&&s.cardRoll)return [];
 if(s.sideDamage?.endTurn&&c.phase!=='instant'&&!(hero===thor.id&&id===29)&&!(hero===cyclops.id&&id===28))return [];
 if(price(s,seat,id)>p.cp) return [];
 if(s.mesmerizeRoll&&![5,6,8,9,11,12,13,14,16,18].includes(id))return [];
 if(s.cardRoll && !(hero===deadpool.id&&id===30&&s.cardRoll.id===29)&& !(hero===santa.id&&id===32)&& !(hero===mysticBrawler.id&&[31,32,33].includes(id))&& !(hero===blackWidow.id&&c.phase==='upgrade'&&rollPhase(s))&&!(hero===headlessHorseman.id&&[31,32].includes(id))&&!(hero===huntress.id&&id===28)&&!(hero===tactician.id&&id===32)&&!(hero===artificer.id&&[28,29].includes(id)) && !([8,9].includes(id) || (hero===sunElf.id&&([32,33].includes(id)||id===31&&rollPhase(s))) || (c.phase==='roll' && rollPhase(s) && ([11,12,13,14,16,18].includes(id)||hero===3&&id===29||hero===cursedPirate.id&&id===29||hero===thor.id&&id===28||hero===cyclops.id&&id===27||hero===gambit.id&&id===29)))) return [];
 if(attackLocked(s) && (seat!==s.active || s.pending.ultimate && ![5,6,9,30,31].includes(id)&&!(hero===vampireLord.id&&[32,33].includes(id))&&!(hero===gunslinger.id&&id===27)&&!(hero===samurai.id&&id===28)&&!(hero===tactician.id&&id===32)&&!(hero===huntress.id&&[28,29].includes(id))&&!(hero===headlessHorseman.id&&[27,31,32].includes(id))&&!(hero===necromancer.id&&[32,33].includes(id))&&!(hero===paleLady.id&&[19,20,21,23].includes(id))&&!(hero===raveness.id&&[29,30,31].includes(id))&&!(hero===druid.id&&[27,32].includes(id))&&!(hero===duelist.id&&[28,29,30].includes(id))&&!(hero===sunElf.id&&[32,33].includes(id))&&!(hero===deadpool.id&&[25,27,29,30].includes(id))&&!(hero===santa.id&&[26,27,29,30,32].includes(id))&&!(hero===mysticBrawler.id&&[28,29,30,32,33].includes(id))&&!(hero===krampus.id&&[28,29,30,31].includes(id))&&!(hero===alchemist.id&&id===32)&&!(hero===wolverine.id&&id===26)&&!(hero===storm.id&&[27,28,30].includes(id))&&!(hero===rogue.id&&[29,30,32].includes(id))&&!(hero===psylocke.id&&[27,28,30,32].includes(id))&&!(hero===jeanGrey.id&&[29,31,32].includes(id))&&!(hero===iceman.id&&[28,30,31,32].includes(id))&&!(hero===gambit.id&&[30,31].includes(id))&&!(hero===cyclops.id&&[25,26,27,28,29,30,31,32,33].includes(id))&&!(hero===thor.id&&[29,30,31,33].includes(id))&&!(hero===spiderMan.id&&[26,28,31].includes(id))&&!(hero===scarletWitch.id&&id===29)&&!(hero===loki.id&&[29,30].includes(id))&&!(hero===doctorStrange.id&&[29,30,32].includes(id))&&!(hero===captainMarvel.id&&[29,32].includes(id))&&!(hero===blackWidow.id&&(c.phase==='upgrade'||[30,32].includes(id)))&&!(hero===blackPanther.id&&[30,31,32].includes(id)) && !(hero===2&&id===32) && !(hero===6&&id===28&&s.stage==='locked')&&!(hero===7&&id===31&&s.stage==='locked')&&!(hero===cursedPirate.id&&[30,31,32,33].includes(id)&&s.stage==='locked')&&!(id===10&&vineDamage(s)))) return [];
 if(c.phase==='roll' && !(hero===cyclops.id&&id===28&&[0,1].some(target=>blackPanther.incoming(s,target))) && !(thor.isolated(s)&&thor.isolatedCard(s,seat,id)) && !(hero===thor.id&&id===29&&thor.incoming(s,seat)) && !(s.widowAgility||s.widowBombRoll||s.santaNogRoll||s.deadpoolDonutRoll||s.deadpoolLucky) && !rollPhase(s) && !((s.stage==='locked'||s.gunReload)&&seat===s.active) && !(id===10&&s.stage==='sideDamage'&&['Barbed Vine','Powder Keg','Swashbuckle!','Scurvy!','Cursed Cards!','Nanobot','Ravage!','Absorb Vitality','Kinetic Energy','Time Bomb','Outwit!','Webbed','Mjölnir','Chain Lightning','Freeze the Day!','Phoenix Burn','Shattered!','Lightning','Wind Shear','Intimidate!','Fastball Special!','Potion Explosion!','Tonic!','Give a Little!','Explosive Flex!','Egg Nog','Santa’s Helper!','Extremely Naughty!','Do You Feel Lucky?!'].includes(s.sideDamage.source))) return [];
 if(['main','upgrade'].includes(c.phase) && !(hero===blackWidow.id&&c.phase==='upgrade'&&rollPhase(s)&&!s.mainAction&&!s.widowAgility&&!s.widowBombRoll) && (!isMain(s)||seat!==s.active||s.cardRoll||s.mainAction||s.ravenFeathers||s.shapeOverflow)) return [];
 if(c.phase==='upgrade' && p.upgrades[c.slot] && seatCard(s,seat,p.upgrades[c.slot]).level>=c.level)return [];
 const one=[{label:'Play'}];
 const heroes=names.map((name,target)=>({label:name,target}));
 const statuses=heroes.flatMap(({target,label})=>statusKeys.filter(key=>s.players[target][key]&&key!=='covertOps').flatMap(status=>alchemist.types.includes(status)?alchemist.tokens(s,target,status).map(t=>({label:`${label} · ${alchemist.tokenLabel(t)}`,target,status,tokenId:t.id})):status==='timeBomb'?(s.players[target].timeBombTimers??[]).map(b=>({label:`${label} · Time Bomb 0:0${b.ticks}`,target,status,bombId:b.id})):status==='spellbound'?(s.players[target].boundAbilities??[]).map(b=>({label:`${label} · Spellbound: ${b.key}`,target,status,tokenId:b.id})):status==='bagOfTricks'?(s.players[target].trickBags??[]).map(b=>({label:`${label} · Bag of Tricks from ${names[b.owner]}`,target,status,tokenId:b.id})):[{label:`${label} · ${statusLabel(status)}`,target,status}]));
 const pos=d?.dice.map((value,i)=>({value,i,label:d.owners?`${names[dieOwner(d,i)]}’s die (${value})`:`die ${i+1} (${value})`}))??[];
 const ownDice=pos.filter(die=>dieOwner(d,die.i)===seat),writable=pos.filter(die=>!iceman.contextLocked(s,d,die.i)),writableOwn=ownDice.filter(die=>!iceman.contextLocked(s,d,die.i));
 const flips=writable.flatMap(({i,label,value})=>[1,2,3,4,5,6].filter(v=>v!==value).map(v=>({label:`${label} → ${v}`,i,v})));
 if(id===1)return statuses.filter(x=>!nonTransferableStatuses.has(x.status))
   .filter(x=>!['ionicEnergy','ionicEnergy2'].includes(x.status)||rogue.total(s.players[1-x.target])<rogue.cap(s.players[1-x.target])).filter(x=>!x.status.startsWith('regenerate')||druid.regenTotal(s.players[1-x.target])<2).filter(x=>statusCap(s.players[1-x.target],x.status)===1||!s.players[1-x.target][x.status]||s.players[1-x.target][x.status]<statusCap(s.players[1-x.target],x.status)).map(x=>({...x,label:`${x.label} → ${names[1-x.target]}`}));
 if(id===2)return heroes.filter(x=>statusKeys.some(k=>k!=='covertOps'&&s.players[x.target][k]));
 if(id===4||id===7)return statuses.flatMap(choice=>{
   if(choice.status!=='prey'||choice.target===s.active||!s.pending?.preyBonuses?.length)return [choice];
   const bonuses=[...s.pending.preyBonuses,...Array(Math.max(0,s.players[choice.target].prey-s.pending.preyBonuses.length)).fill(0)];
   return bonuses.flatMap((bonus,index)=>bonuses.indexOf(bonus)===index?
     [{...choice,preyIndex:index,label:`${choice.label} · ${bonus?'+ '+bonus+' damage':'no bonus'}`}]:[]);
 });
 if(id===8)return flips.filter(f=>dieValue(pos[f.i].value,s.players[dieOwner(d,f.i)])&&Math.abs(f.v-pos[f.i].value)===1);
 if(id===10){
  if(s.stage==='sideDamage'&&['Barbed Vine','Powder Keg','Swashbuckle!','Scurvy!','Cursed Cards!','Nanobot','Ravage!','Absorb Vitality','Kinetic Energy','Time Bomb','Outwit!','Webbed','Mjölnir','Chain Lightning','Freeze the Day!','Phoenix Burn','Shattered!','Lightning','Wind Shear','Intimidate!','Fastball Special!','Potion Explosion!','Tonic!','Give a Little!','Explosive Flex!','Egg Nog','Santa’s Helper!','Extremely Naughty!','Do You Feel Lucky?!'].includes(s.sideDamage.source))return heroes.filter(x=>x.target===s.sideDamage.seat&&sideIncoming(s.sideDamage)>0);
  if(s.stage==='locked'&&vineDamage(s))return heroes.filter(x=>x.target===s.active&&returnDamageFor(s)>0);
  return s.stage==='damage'?heroes.filter(x=>(x.target===s.active?returnDamageFor(s):incomingDamage(s))>0):[];
 }
 if(id===11||hero===3&&id===29&&p.shadows)return [...flips,...flips.flatMap(first=>flips.filter(second=>second.i>first.i).map(second=>({label:`${first.label}, ${second.label}`,i:first.i,v:first.v,j:second.i,w:second.v})))];
 if(id===12)return writableOwn.flatMap(first=>[{label:`Reroll ${first.label} first`,i:first.i},...writableOwn.filter(second=>second.i>first.i).map(second=>({label:`Reroll ${first.label} and ${second.label} together`,i:first.i,j:second.i}))]);
 if(id===13||hero===3&&id===29)return flips;
 if(id===14)return writableOwn.flatMap(first=>ownDice.filter(second=>first.value!==second.value&&dieValue(second.value,p)).map(second=>({label:`Set ${first.label} to ${second.label}`,i:first.i,v:second.value})));
 if(id===15)return ['offence','announce'].includes(s.stage)?[{label:names[s.active]}]:[];
 if(id===16)return writable.filter(die=>dieOwner(d,die.i)!==seat);
 if(id===17)return (s.stage==='defenceResponse'||s.gunContest?.kind==='duel')?[{label:names[1-s.active]}]:[];
 if(id===18)return flips.filter(f=>dieOwner(d,f.i)===seat&&f.v===6);
 if(hero===2&&id===29)return Array.from({length:1+Math.min(p.cp,Math.max(0,statusCap(p,'fireMastery')-(p.fireMastery??0)-1))},(_,spend)=>({label:`Spend ${spend} extra CP`,spend}));
 if(hero===barbarian.id&&id===barbarian.headBashId)return barbarian.canPlayHeadBash(s,seat)?one:[];
 const attackModifier=hero===barbarian.id?id===barbarian.attackModifierId:
  (id===31&&hero<3)||(id===30&&hero===1)||(id===32&&hero===2);
 if(attackModifier&&(s.pending?.pure||!(seat===s.active&&(s.pending?.attack??((s.pending?.grossDamage??s.pending?.damage)>0))&&!s.pending.evaded&&['damage','defence','defenceResponse','locked'].includes(s.stage))))return [];
 if(hero===3&&id===31&&p.shadows)return [];
 if(hero===3&&id===28&&s.players[1-seat].poison>=3)return [];
 if(hero===7){
  if(id===27)return spiritDiscards(p,3).map(spirits=>({label:discardLabel(spirits),spirits}));
  if(id===31)return seat===s.active&&s.pending?.attack&&!s.pending.pure&&!s.pending.evaded&&['defence','defenceResponse','damage','locked'].includes(s.stage)?one:[];
  if(id===32)return heroes;
 }
 if(hero===6){
  if(id===28)return seat===s.active&&s.pending?.attack&&!s.pending.pure&&!s.pending.evaded&&['defence','defenceResponse','damage','locked'].includes(s.stage)?one:[];
  if(id===30)return heroes.flatMap(({label,target})=>p.hand.filter(other=>other!==id)
    .map(discard=>({label:`Give Smoke Bomb to ${label} · discard ${seatCard(s,seat,discard).name}`,target,discard})));
 }
 if(hero===5&&[29,30].includes(id))return heroes;
 if((hero===5||hero===6)&&id===32)return seat!==s.active&&s.pending?.attack&&!s.pending.ultimate&&!s.pending.stun&&['defence','defenceResponse','damage'].includes(s.stage)?one:[];
 if(id===32&&hero===1)return heroes.filter(x=>s.players[x.target].evasive<3);
 if(d?.owners&&hero===cursedPirate.id&&id===29)return pos.filter(die=>dieOwner(d,die.i)!==seat);
 return heroRoster[hero].cardChoices?.(id,{s,seat,pos:writable,d,one,heroTargets:heroes})??one;
}

function removeBountyBonus(s,seat){
 const hit=s.pending;
 if(seat===s.active||!hit?.bountyBonus||s.players[seat].bounty||['postHit','main','main1','discard','finished'].includes(s.stage))return;
 hit.bountyBonus=false;
 hit.grossDamage--;
 updateDamage(hit);
}
function transferTrackedStatus(state, from, key, tokenId, source) {
 if (key === 'bagOfTricks') {
  const bag = loki.removeBag(state.players[from], tokenId);
  if (bag) loki.give(state, 1-from, bag.owner, 1, bag);
  return true;
 }
 if (key === 'timeBomb') {
  const bomb = blackWidow.removeBomb(state.players[from], tokenId);
  if (bomb) blackWidow.inflict(state, 1-from, source, bomb.ticks);
  return true;
 }
 return false;
}

function removeMatchStatus(s,seat,key,tokenId){
 const player=s.players[seat], hit=s.pending;
 if(!statusKeys.includes(key)||!player[key])return;
 removeStatus(player,key,tokenId);
 if(key==='constrict'&&seat===s.active)delete s.wasConstricted;
 if(key==='decrepify'&&seat===s.active)delete s.wasDecrepified;
 if(key==='bounty')removeBountyBonus(s,seat);
 if(key==='prey')removePreyBonus(s,seat);
 if(key==='barbed'&&seat===s.active)s.vineAttempts=0;
 if(key==='shadows'&&seat!==s.active&&s.stage==='damage'&&hit?.shadowSkippedDefence&&!hit.parlayBlocked&&!hit.undefendable){
   hit.shadowSkippedDefence=false;s.stage='defence';
 }
 if(key==='targeted'&&hit?.targetBonus&&seat!==s.active&&s.stage!=='postHit'){
   hit.targetBonus=false;
   hit.grossDamage-=2;
   updateDamage(hit);
 }
}
const flightMode=(s,seat)=>{
 const hit=s.pending;
 if(hit?.nonAttack||!s.players[seat].flight||s.seraphRoll||hit?.ultimate||hit?.parlayBlocked)return null;
 if(seat===s.active&&!s.offenceFlight&&!hit?.undefendable&&
    (s.stage==='offence'||s.stage==='announce'||s.stage==='targeting'||
     s.stage==='effect'||s.stage==='effectResponse'||s.stage==='defence'&&hit.attack))return 'attack';
 if(!hit)return null;
 if(seat!==s.active&&['defence','defenceResponse','damage','purify'].includes(s.stage)&&incomingDamage(s)>0)return 'defence';
 return null;
};
function flushPowderKegs(state) {
 if(state.sideDamage || state.stage==='finished' || !state.powderExplosions?.length) return state;
 startSideDamage(state,state.powderExplosions.shift(),3,'Powder Keg',false,{keepPending:true});
 return state;
}
function grantPirateStatus(state,seat,status,afterRoll=false) {
 if(psylocke.block(state,state.players[seat],status))return;
 if(['support','battlePlan'].includes(status)){cyclops.gain(state,seat,status);return;}
 if(['acuity','flameBlast'].includes(status)){jeanGrey.gain(state,seat,status);return;}
 if(status==='rage'){wolverine.gain(state,seat);return;}
 if(status==='iceShard'){iceman.gain(state,seat);return;}
 if(status==='dissolution'){gambit.gainDissolution(state,seat);return;}
 if(status==='electrokinesis'){thor.gain(state,seat);return;}
 if(status==='webbed'){spiderMan.inflict(state,seat);return;}
 const player=state.players[seat];
 if(status==='powderKeg' && player.powderKeg) {
  if(afterRoll)(state.rollPowderExplosions??=[]).push(seat);
  else (state.powderExplosions??=[]).push(seat);
 }
 if(afterRoll&&['defence','defenceResponse'].includes(state.stage))
  grantAttackStatus(state,player,status);
 else grantStatus(player,status);
}
const titheDrawCost=p=>p.upgrades?.Tithe?2:3;
function titheChoices(s,seat) {
 const p=s.players[seat];
 if(s.bloodOverflow||s.honorOverflow||s.tacticalOverflow||s.tacticalRemoval||s.mesmerizeRoll?.choosing)return {};
 if(!s.cards||heroId(s,seat)!==5||s.retry||s.growth||s.mainChoice||s.pirateChoice||s.mainAction||s.stage==='finished'||
    (seat!==s.active&&attackLocked(s)))return {};
 const ctx=rollContext(s);
 return {draw:p.cp>=titheDrawCost(p)&&(p.deck.length||p.discard.some(id=>id!==s.cardRoll?.id)),
   dice:p.cp>0?diceOwnedBy(ctx,seat,s):[]};
}
function bloodPowerChoices(s,seat){
 const p=s.players[seat], hit=s.pending, used=vampireLord.usage(s,seat), total=p.bloodPower??0;
 const options=[];
 if(!s.cards||!total||s.honorOverflow||s.retry||s.mesmerizeRoll||s.mainAction||s.mainChoice||s.pirateChoice||
    ['finished','discard','vampireSearch'].includes(s.stage)||s.bloodOverflow&&s.bloodOverflow.seat!==seat||
    seat!==s.active&&attackLocked(s))return options;
 const attack=seat===s.active&&hit?.attack&&!hit.pure&&!hit.evaded&&!hit.parlayBlocked&&
   ['defence','defenceResponse','damage','locked'].includes(s.stage);
 if(!used[1]&&attack&&s.stage!=='vampireSearch')options.push({cost:1,label:'Add 3 attack damage'});
 if(total>=2&&!used[2]&&seat===s.active&&isMain(s))s.players.forEach((player,target)=>{
   for(const status of statusKeys.filter(key=>player[key])){
     if(target!==seat||status!=='bloodPower'||total>2){
      if(alchemist.types.includes(status)){for(const t of alchemist.tokens(s,target,status))options.push({cost:2,target,status,tokenId:t.id,label:`Remove ${alchemist.tokenLabel(t)} from ${heroNames(s)[target]}`});}
      else if(['spellbound','bagOfTricks'].includes(status)){const list=status==='spellbound'?player.boundAbilities:player.trickBags;for(const b of list??[])options.push({cost:2,target,status,tokenId:b.id,label:`Remove ${statusLabel(status)} ${b.key??('from '+heroNames(s)[b.owner])} on ${heroNames(s)[target]}`});}
      else options.push({cost:2,target,status,label:`Remove ${statusLabel(status)} from ${heroNames(s)[target]}`});
     }
   }
 });
 if(total>=3&&!used[3]&&(p.deck.length||p.discard.some(card=>card!==s.cardRoll?.id)))options.push({cost:3,label:'Draw 2 cards'});
 if(total>=4&&!used[4]&&seat===s.active&&(rollPhase(s)||s.stage==='locked')&&s.stage!=='postHit')
   options.push({cost:4,label:'Heal equal to damage dealt by your attack'});
 return options;
}
function gainBloodPower(s,seat,amount){
 if(psylocke.block(s,s.players[seat],'bloodPower',amount))return;
 if(!amount)return;
 const p=s.players[seat], cap=statusCap(p,'bloodPower');
 if(s.cards&&(p.bloodPower??0)+amount>cap&&bloodPowerChoices(s,seat).length){
   s.bloodOverflow={seat,amount};
 } else grantStatus(p,'bloodPower',amount);
}
const canMesmerize=(s,seat)=>s.cards&&!s.retry&&!s.mesmerizeRoll&&!s.bloodOverflow&&!s.honorOverflow&&
 s.players[seat].mesmerize&&(seat===s.active||!attackLocked(s))&&diceOwnedBy(rollContext(s),1-seat,s).some(Boolean);
const handPlays=(s,seat)=>!s.cards?[]:s.players[seat].hand.filter(id=>cardChoices(s,seat,id).length);
function tokenChoices(s,seat) {
 const p=s.players[seat], hit=s.pending;
 const active=seat===s.active;
 const options={flight:null,cleanse:[],boost:0,prevent:0,crit:false,accuracy:false,protect:false,retribution:false,smoke:false,ninjutsu:false,evadeSide:false,seedling:[],sapling:false,saplingDraw:false,dryad:false,dryadPrevent:[],wellspring:false};
 if(!s.cards||s.thorOverflow||s.thorTask&&s.stage==='thorSequence'||s.conjureTask||s.premonitionTask||s.strangeTask&&s.stage!=='sideDamage'||s.cosmicRayOverflow&&!s.cosmicRayRoll||s.widowTask||s.widowReveal||s.widowAgility||s.widowBombRoll||s.retry||s.growth||s.mainChoice||s.pirateChoice||s.bloodOverflow||s.honorOverflow||s.mesmerizeRoll?.choosing||
    ['finished','discard'].includes(s.stage)||
    (seat!==s.active&&attackLocked(s)))return options;
 const ctx=rollContext(s);
 if(canSpendSpirit(p,'seedling')&&!attackLocked(s))options.seedling=diceOwnedBy(ctx,seat,s);
 options.sapling=canSpendSpirit(p,'sapling');
 options.saplingDraw=!!(options.sapling&&p.cp&&(p.deck.length||p.discard.some(id=>id!==s.cardRoll?.id)));
 if(s.cardRoll||s.cosmicRayRoll)return options;
 options.wellspring=!!(p.wellspring&&active&&isMain(s)&&!s.mainAction);
 options.dryad=canSpendSpirit(p,'dryad')&&active&&hit&&!hit.pure&&!hit.evaded&&
   (hit.attack??(hit.abilityDamage>0))&&['targeting','spiritPayment','overgrowthWells','defence','defenceResponse','damage','locked'].includes(s.stage);
 if(canSpendSpirit(p,'dryad')&&!active&&s.stage==='dryadResponse')
  options.dryadPrevent=negativeStatuses.filter(key=>key!=='hex'&&hit[key]&&!hit.dryadBlocked?.includes(key));
 options.flight=flightMode(s,seat);
 if(p.cleanse&&!thor.isolated(s))options.cleanse=statusKeys.filter(key=>key!=='covertOps'&&key!=='cleanse'&&p[key]);
 if(thor.isolated(s)){options.sapling=false;options.saplingDraw=false;}
 const damageWindow=(['defence','defenceResponse','damage'].includes(s.stage)||s.stage==='purify'&&hit.attack);
 options.accuracy=!!(p.accuracy&&active&&!hit?.nonAttack&&s.stage==='targeting'&&hit.damage>0&&!hit.pure&&!hit.undefendable);
 options.crit=!!(p.crit&&active&&hit&&!hit.nonAttack&&!hit.pure&&!hit.evaded&&hit.abilityDamage>=5&&
   (s.stage==='targeting'||s.stage==='locked'||damageWindow));
 const incoming=s.stage==='upkeep'&&active&&!s.upkeepEvaded?upkeepIncoming(s):
   s.stage==='sideDamage'&&seat===s.sideDamage.seat?sideIncoming(s.sideDamage):
   s.stage==='locked'&&active&&vineDamage(s)?returnDamageFor(s):
   damageWindow&&!hit.ultimate?(active?returnDamageFor(s):incomingDamage(s)):0;
 options.protect=!!(p.protect&&incoming>0);
 options.smoke=!!(p.smoke&&incoming>0);
 options.evadeSide=!!(p.evasive&&(s.stage==='sideDamage'||s.stage==='locked'&&active)&&incoming>0);
 options.ninjutsu=!!(p.ninjutsu&&active&&hit&&!hit.pure&&!hit.evaded&&
   (hit.attack??(hit.abilityDamage>0))&&['ninjaGain','targeting','sneakOffer','defence','defenceResponse','damage','locked'].includes(s.stage));
 options.retribution=!!(p.retribution&&!active&&damageWindow&&hit.attack&&!hit.ultimate&&!hit.evaded&&!shadowAvoids(s)&&damageSubtotal(hit)>0);
 if(!p.chi)return options;
 const oldChi=p.chi-(p.chiFresh??0);
 const boostWindow=['effect','effectResponse','targeting','defence','defenceResponse','damage','locked','sneakOffer'].includes(s.stage);
 if(seat===s.active&&oldChi>0&&hit&&!hit.pure&&!hit.evaded&&boostWindow&&
    (hit.attack??(hit.damage>0||hit.masteryDamage>0||['tempest','overpower'].includes(hit.effect))))options.boost=oldChi;
 options.prevent=Math.min(p.chi,incoming);
 return options;
}
const artificerActions=(s,seat)=>heroId(s,seat)===artificer.id&&!s.bloodOverflow&&!s.honorOverflow&&!s.mesmerizeRoll?.choosing ?
 artificer.actions(s,seat,{isMain,attackLocked,modifiedAttackDamage}) : [];
function nyraRerolls(s,seat){
 const p=s.players[seat];
 if(!s.cards||seat!==s.active||!huntress.active(p)||p.nyra.rerollTurn===s.turn||s.retry||s.cardRoll||
    s.tacticalOverflow||s.tacticalRemoval||s.bloodOverflow||s.honorOverflow||s.mesmerizeRoll?.choosing||
    !['offence','announce','blind','effectResponse','sneakRoll','ninjutsuRoll','mesmerizeRoll'].includes(s.stage)&&
    !(s.stage==='seraphRoll'&&s.seraphRoll.kind==='blinding'))return [];
 return diceOwnedBy(rollContext(s),seat,s);
}
const canHealNyra=(s,seat)=>s.cards&&s.players[seat].nyraBond&&s.players[seat].nyra?.hp<7&&
 !s.retry&&!s.mainChoice&&!s.pirateChoice&&!s.tacticalOverflow&&!s.tacticalRemoval&&!s.honorOverflow&&!s.bloodOverflow&&
 !s.mesmerizeRoll?.choosing&&![1,2,4].includes(s.mainAction?.id)&&
 !['finished','discard','nyraDamage'].includes(s.stage)&&(seat===s.active||!attackLocked(s));
function nyraIncoming(s){
 const hit=s.pending, defender=s.players[1-s.active];
 return hit?.attack&&!hit.ultimate&&!hit.stun&&huntress.active(defender)?incomingDamage(s):0;
}
function tacticalChoices(s,seat){
 const p=s.players[seat], context=rollContext(s), other=1-seat, names=heroNames(s), options=[];
 if(!s.cards||!p.tactical||s.retry||s.mainChoice||s.pirateChoice||s.bloodOverflow||s.honorOverflow||
    s.mesmerizeRoll?.choosing||['finished','discard','vampireSearch'].includes(s.stage)||
    seat!==s.active&&attackLocked(s)||s.tacticalOverflow&&s.tacticalOverflow.seat!==seat||
    s.tacticalRemoval&&s.tacticalRemoval.seat!==seat||
    [1,2,4].includes(s.mainAction?.id))return options;
 if(p.cp<15&&!p.resurrected)options.push({kind:'cp',cost:1,label:'Gain 1 CP'});
 diceOwnedBy(context,seat,s).forEach((value,index)=>options.push({kind:'reroll',cost:1,index,label:`Reroll die ${index+1} (${value})`}));
 if(p.tactical>=3){
   if(p.deck.length||p.discard.some(card=>card!==s.cardRoll?.id))options.push({kind:'draw',cost:3,label:'Draw 1 card'});
   if(!s.players[other].targeted)options.push({kind:'targeted',cost:3,target:other,label:`Inflict Targeted on ${names[other]}`});
 }
 if(p.tactical>=4){
   s.players.forEach((player,target)=>{
     if(!player.protect)options.push({kind:'protect',cost:4,target,label:`Give Protect to ${names[target]}`});
   });
   if(seat===s.active&&isMain(s)&&!s.mainAction&&!s.cardRoll)s.players.forEach((player,from)=>{
     const receiver=s.players[1-from];
     for(const status of statusKeys){
       const balance=Number(receiver[status]??0)-(status==='tactical'&&from!==seat?4:0);
       if(nonTransferableStatuses.has(status)||status.startsWith('regenerate')&&druid.regenTotal(receiver)>=2||!player[status]||balance>=statusCap(receiver,status))continue;
       if(status==='tactical'&&from===seat&&p.tactical===4)continue;
       if(status==='bagOfTricks'){for(const b of player.trickBags??[])options.push({kind:'transfer',cost:4,from,status,bagId:b.id,label:`Transfer Bag of Tricks from ${names[from]} to ${names[1-from]} · created by ${names[b.owner]}`});continue;}
       if(status==='timeBomb'){for(const b of player.timeBombTimers??[])options.push({kind:'transfer',cost:4,from,status,bombId:b.id,label:`Transfer Time Bomb 0:0${b.ticks} from ${names[from]} to ${names[1-from]}`});continue;}
       options.push({kind:'transfer',cost:4,from,status,label:`Transfer ${statusLabel(status)} from ${names[from]} to ${names[1-from]}`});
     }
   });
 }
 return options;
}
function gainTactical(s,seat,amount){
 if(psylocke.block(s,s.players[seat],'tactical',amount))return;
 if(!amount)return;
 const p=s.players[seat];
 if(s.cards&&(p.tactical??0)+amount>statusCap(p,'tactical')&&tacticalChoices(s,seat).length)
   s.tacticalOverflow={seat,amount};
 else grantStatus(p,'tactical',amount);
}
function applyTactical(s,seat,option,roll,random){
 const p=s.players[seat], names=heroNames(s);
 p.tactical-=option.cost;
 s.response=null;
 switch(option.kind){
   case 'cp': gainCP(p,1);break;
   case 'reroll': {
     const ctx=rollContext(s), before=ctx.dice.slice();
     ctx.dice[option.index]=roll();
     if(ctx.scalar)s.effectDie=ctx.dice[0];
     releaseChangedAnnouncement(s,ctx,before);
     s.log.unshift(`${names[seat]} rerolls die ${option.index+1} to ${ctx.dice[option.index]}.`);
     break;
   }
   case 'draw': drawCards(p,1,random,s.cardRoll?.id);break;
   case 'targeted': {
     const target=s.players[option.target], hit=s.pending;
     if(seat===s.active&&hit?.attack&&['defence','defenceResponse','damage','locked','gunContest','gunDuelChoice','purify'].includes(s.stage)){
       grantAttackStatus(s,target,'targeted');
       if(!hit.pure&&!hit.targetBonus&&!hit.parlayBlocked){
         hit.targetBonus=true;
         hit.grossDamage+=2;
         updateDamage(hit);
       }
     } else grantStatus(target,'targeted');
     break;
   }
   case 'protect': grantStatus(s.players[option.target],'protect');break;
   case 'transfer':
     if(option.status==='webbed'){removeMatchStatus(s,option.from,'webbed');spiderMan.inflict(s,1-option.from,seat);break;}
     if(transferTrackedStatus(s,option.from,option.status,option.status==='timeBomb'?option.bombId:option.bagId,seat))break;
     removeMatchStatus(s,option.from,option.status);
     grantStatus(s.players[1-option.from],option.status);
     break;
 }
 s.log.unshift(`${names[seat]} spends ${option.cost} Tactical Advantage. ${option.label}.`);
}
const constrictCost=s=>s.attempts>0&&s.players[s.active].constrict?1:0;
function honorChoices(s,seat){
 const hit=s.pending, p=s.players[seat];
 return s.cards&&p.honor&&seat===s.active&&hit?.attack&&!hit.pure&&!hit.evaded&&!hit.parlayBlocked&&
   !s.cardRoll&&!s.retry&&!s.bloodOverflow&&!s.mesmerizeRoll&&
   ['defence','defenceResponse','damage','locked','gunContest','gunDuelChoice','purify'].includes(s.stage)?p.honor:0;
}
function canBackStrike(s,seat){
 const hit=s.pending;
 return s.cards&&s.players[seat].backStrike&&seat!==s.active&&hit&&!attackLocked(s)&&
   !s.cardRoll&&!s.retry&&!s.honorOverflow&&!s.bloodOverflow&&!s.mesmerizeRoll&&!s.samuraiRoll&&
   ['defence','defenceResponse','damage','gunContest','gunDuelChoice','purify'].includes(s.stage)&&incomingDamage(s)>0;
}
function canReload(s,seat){
 const hit=s.pending;
 return s.cards&&s.players[seat].reload&&seat===s.active&&hit?.attack&&!hit.pure&&!hit.evaded&&!hit.parlayBlocked&&
   !s.cardRoll&&!s.retry&&!s.bloodOverflow&&!s.honorOverflow&&!s.gunReload&&['defence','defenceResponse','damage','locked'].includes(s.stage);
}
function reloadRerolls(s){
 const reload=s.gunReload, hit=s.pending, player=s.players[reload.seat];
 return [
   ['quickDraw','Quick Draw II',!!player.upgrades?.['Quick Draw']],
   ['ultimate','Ultimate',hit.reloadReroll],
   ['wildWest','Wild West!',hit.wildWest]
 ].filter(([key,,available])=>available&&!reload.used.includes(key));
}
function grimChoices(s,seat){
 const p=s.players[seat],hit=s.pending;
 if(!s.cards||seat!==s.active||!p.grim||s.retry||s.cardRoll||s.honorOverflow||s.bloodOverflow||s.tacticalOverflow||
    s.tacticalRemoval||s.mesmerizeRoll||s.horseRoll||s.response&&s.response.seat!==seat)return [];
 const choices=[];
 if(p.grimAttemptTurn!==s.turn&&['offence','announce'].includes(s.stage))choices.push('attempt');
 if(p.grimDamageTurn!==s.turn&&heroId(s,seat)===headlessHorseman.id&&hit?.attack&&!hit.pure&&!hit.evaded&&!hit.parlayBlocked&&
    ['defence','defenceResponse','damage','locked'].includes(s.stage))choices.push('damage');
 return choices;
}
function gainGrim(s,seat,amount){
 if(psylocke.block(s,s.players[seat],'grim',amount))return;
 if(!amount)return;
 if((s.players[seat].grim??0)+amount>3&&grimChoices(s,seat).length)s.grimOverflow={seat,amount};
 else grantStatus(s.players[seat],'grim',amount);
}
function undeadUsed(s,seat){
 const used=s.players[seat].undeadUsed;
 return used?.turn===s.turn?used:{turn:s.turn,warrior:0,mage:0,golem:0};
}
function necroActions(s,seat){
 const p=s.players[seat],hit=s.pending,active=seat===s.active;
 if(!s.cards||heroId(s,seat)!==necromancer.id||s.retry||s.cardRoll||s.grimOverflow||s.tacticalOverflow||s.tacticalRemoval||
    s.bloodOverflow||s.honorOverflow||s.mainAction||s.mainChoice||s.pirateChoice||s.response&&s.response.seat!==seat)return [];
 const choices=[];
 if(active&&(isMain(s)||s.stage==='necroChoice'&&hit?.reanimate)){
   const discount=s.stage==='necroChoice'?1:0;
   for(const kind of necromancer.types(p)){
     const minion=necromancer.undead[kind],cost=minion.cost-discount;
     if(p.corpses>=cost)choices.push({kind,cost,label:`Summon ${minion.name} · ${cost} Corpses`});
   }
   if(p.corpses===10&&!p.resurrect)choices.push({kind:'resurrect',cost:10,label:'Gain Resurrect · 10 Corpses'});
 }
 if(!hit?.attack||hit.parlayBlocked||hit.undeadSettled)return choices;
 const window=['defence','defenceResponse','damage','locked'].includes(s.stage);
 if(!window)return choices;
 const used=undeadUsed(s,seat);
 if(!active){
   if(!hit.ultimate&&!hit.stun&&necromancer.count(p,'golem'))
     choices.push({kind:'spikes',label:'Bone Spikes · remove Golem to deal 2 and prevent 2 damage'});
   return choices;
 }
 if(hit.pure)return choices;
 if(necromancer.count(p,'warrior')>used.warrior)choices.push({kind:'spear',label:'Bone Spear · +1 damage'});
 if(necromancer.count(p,'golem')&&!used.golem)choices.push({kind:'spur',label:'Bone Spur · +2 damage'});
 if(necromancer.count(p,'mage')&&!used.mage){
   if(!s.players[1-seat].decrepify)choices.push({kind:'withering',label:'Withering · inflict Decrep-ify'});
   if(used.warrior>=3)choices.push({kind:'scything',label:'Scything Touch · steal 1 Health'});
 }
 return choices;
}
const unearthChoices=p=>Object.keys(necromancer.unearth).filter(name=>name!==p.covered);
const decrepCanRoll=s=>!s.players[s.active].decrepify||!s.attempts||s.held.filter(Boolean).length>=3;
const hasEffectResponse=(s,seat)=>{
 const tokens=tokenChoices(s,seat);
 const tithe=titheChoices(s,seat);
 return !!(deadpool.onomChoices(s,seat).length||deadpool.canRps(s,seat)||deadpool.canDonut(s,seat)||santa.cheerChoices(s,seat).length||santa.canNog(s,seat)||mysticBrawler.oceanChoices(s,seat).length||krampus.options(s,seat).length||krampus.canGift(s,seat)||alchemist.labChoices(s,seat).length||wolverine.rageChoices(s,seat).length||storm.canTornado(s,seat)||storm.canWind(s,seat)||rogue.ionicChoices(s,seat).length||rogue.canExpand(s,seat)||rogue.canSkyward(s,seat)||psylocke.swaps(s,seat).length||psylocke.canBoost(s,seat)||psylocke.infiltrationChoices(s,seat).length||jeanGrey.acuityChoices(s,seat).length||jeanGrey.flameChoices(s,seat).length||jeanGrey.fieldChoices(s,seat).length||iceman.canConvert(s,seat)||iceman.canFreezerConvert(s,seat)||gambit.canExplode(s,seat).length||gambit.dissolveChoices(s,seat).length||cyclops.supportChoices(s,seat).length||cyclops.battleChoices(s,seat).length||cyclops.canRecourse(s,seat)||thor.canMove(s,seat)||spiderMan.canInvisibility(s,seat)||spiderMan.canSenseReroll(s,seat)||scarletWitch.probabilityChoices(s,seat).length||scarletWitch.defenceChanges(s,seat).length||scarletWitch.canCrackle(s,seat)||loki.canIllusion(s,seat)||doctorStrange.canDeja(s,seat)||captainMarvel.canRay(s,seat)||captainMarvel.radianceDice(s,seat).length||s.players[seat].agility&&blackWidow.incoming(s,seat)||s.players[seat].vibraniumSuit&&blackPanther.incoming(s,seat)||sunElf.canDawn(s,seat)||forgemaster.choices(s,seat).some(option=>!['craft','deposit'].includes(option.kind))||druid.shiftChoices(s,seat).length||necroActions(s,seat).length||grimChoices(s,seat).length||raveness.featherChoices(s,seat).some(option=>option.kind==='activate')||canHealNyra(s,seat)||nyraRerolls(s,seat).length||tacticalChoices(s,seat).length||honorChoices(s,seat)||canBackStrike(s,seat)||canReload(s,seat)||canMesmerize(s,seat)||bloodPowerChoices(s,seat).length||artificerActions(s,seat).length||tokens.flight||tokens.cleanse.length||tokens.boost||tokens.prevent||tokens.crit||
   tokens.accuracy||tokens.protect||tokens.retribution||tokens.smoke||tokens.ninjutsu||tokens.evadeSide||tokens.seedling.length||tokens.sapling||tokens.dryad||tokens.dryadPrevent.length||tokens.wellspring||tithe.draw||tithe.dice?.length||
   s.stage==='damage'&&s.players[seat].evasive&&(seat===s.active?returnDamageFor(s):incomingDamage(s))>0&&!s.cardRoll);
};
const hasResponse=(s,seat)=>hasEffectResponse(s,seat)||!!handPlays(s,seat).length;
const isSelling=s=>s.cards&&!s.deadpoolTask&&!s.deadpoolRps&&!s.deadpoolDonutRoll&&!s.deadpoolLucky&&!s.santaRemoval&&!s.santaTask&&!s.santaRoll&&!s.santaNogRoll&&!s.santaGift&&!s.mysticTask&&!s.mysticContest&&!s.krampusTask&&!s.krampusActivation&&s.krampusOverflow===undefined&&!alchemist.busy(s)&&!s.wolverineGain&&!s.wolverineRageRoll&&!s.alphaRoll&&!s.wolverineIntimidate&&!s.stormTask&&!s.rogueGain&&!s.rogueRoll&&!s.psyReveal&&!s.jeanTask&&!s.jeanBurnRoll&&!s.iceTask&&!s.iceFreezeChoice&&!s.gambitTask&&!s.gambitRoll&&!s.cyclopsTask&&!s.thorTask&&!s.thorOverflow&&!s.conjureTask&&!s.scarletJinx&&!s.lokiTask&&!s.lokiBag&&!s.lokiIllusion&&!s.strangeTask&&!s.premonitionTask&&!s.cosmicRayRoll&&!s.cosmicRayOverflow&&!s.widowTask&&!s.widowReveal&&!s.widowAgility&&!s.widowBombRoll&&!s.forgeTask&&!s.shapeOverflow&&!s.ravenFeathers && (isMain(s)||s.stage==='discard')&&!s.mainAction&&!s.mainChoice&&!s.cardRoll&&!s.artRoll&&!s.bloodOverflow&&!s.honorOverflow&&!s.tacticalOverflow&&!s.tacticalRemoval&&!s.retry&&!s.response;
function grantAttackStatus(s,defender,key,amount=1){
 if(psylocke.block(s,defender,key,amount))return;
 const p=s.pending;
 if(['defence','defenceResponse'].includes(s.stage) && !p.incomingStatus.includes(key)){
  p.incomingStatus.push(key);
  p.priorStatus[key]=defender[key]||0;
 }
 grantStatus(defender,key,amount);
}
function completeCardRoll(s,roll,random,add){
 const {id,seat,dice:rawDice,target,roller}=s.cardRoll;
 const hero=heroId(s,seat),p=s.players[seat],opponent=s.players[1-seat],dice=effectiveDice(rawDice,s.players[roller??seat]),counts=tally(dice,hero),hit=s.pending;
 s.cardRoll=null;
 if(id===null){
  const heal=Math.ceil(dice[0]/2);
  p.hp=bounded(p.hp+heal,60);
  add(`Wellspring rolls ${dice[0]} and heals ${heal}.`);
  return;
 }
 const rules = heroRoster[hero];
 if (id === 3) gainCP(p,Math.ceil(dice[0] / 2));
 if (rules.resolveCardRoll?.({id,dice,p,opponent,counts,hit,s,seat,target,bounded,updateDamage,grantStatus,gainBloodPower,gainTactical,gainGrim,stealNecroHealth,grantAttackStatus,queueGrowth,startSideDamage,grantPirateStatus,drawCards,discardRandom,random})) return;
 if (id === (rules.promoId??33) &&hero!==cursedPirate.id&&hero!==artificer.id&&hero!==seraph.id&&hero!==vampireLord.id&&hero!==gunslinger.id&&hero!==samurai.id&&hero!==tactician.id&&hero!==huntress.id&&hero!==headlessHorseman.id&&hero!==necromancer.id&&hero!==paleLady.id&&hero!==raveness.id&&hero!==druid.id&&hero!==duelist.id&&hero!==forgemaster.id&&hero!==sunElf.id&&hero!==blackPanther.id&&hero!==blackWidow.id&&hero!==captainMarvel.id&&hero!==doctorStrange.id&&hero!==loki.id&&hero!==scarletWitch.id&&hero!==spiderMan.id&&hero!==thor.id&&hero!==cyclops.id&&hero!==gambit.id&&hero!==iceman.id&&hero!==jeanGrey.id&&hero!==psylocke.id&&hero!==rogue.id&&hero!==storm.id&&hero!==wolverine.id&&hero!==alchemist.id&&hero!==krampus.id&&hero!==mysticBrawler.id&&hero!==santa.id&&hero!==deadpool.id) {
  if (dice[0] !== 6) drawCards(p,1,random,id);
  else rules.resolvePromo({p,opponent,s,seat,bounded,grantStatus,statusCap,queueGrowth});
 }
 add(`${seatCard(s,seat,id).name} resolves with ${dice.join(', ')}.`);
}
function removePreyBonus(s,seat,index,count=1){
 const hit=s.pending;
 if(seat===s.active||!hit?.preyBonuses?.length||['main','main1','discard','finished'].includes(s.stage))return;
 const lost=hit.preyBonuses.splice(index??Math.max(0,(s.players[seat].prey??0)),count);
 hit.grossDamage-=lost.reduce((total,bonus)=>total+bonus,0);
 updateDamage(hit);
}
function applyCard(s,seat,id,choice,roll,random,add,bypassSanta=false) {
 const hero=heroId(s,seat),names=heroNames(s),p=s.players[seat],c=seatCard(s,seat,id),opponent=s.players[1-seat];
 if(c.phase==='upgrade'){
  if(hero===blackWidow.id){blackWidow.install(s,seat,id,random);return;}
  if(p.upgrades[c.slot]){
   p.coveredUpgrades??=[];
   p.coveredUpgrades.push(p.upgrades[c.slot]);
  }
  p.upgrades[c.slot]=id;
  if(hero===blackPanther.id&&c.slot==='Energy Absorption')blackPanther.gain(p,0);
  return;
 }
 if(id===1&&transferTrackedStatus(s,choice.target,choice.status,choice.status==='timeBomb'?choice.bombId:choice.tokenId,seat))return;
 if([4,7].includes(id)&&choice.status==='timeBomb'){
  blackWidow.removeBomb(s.players[choice.target],choice.bombId);
  return;
 }
 if(id===7&&!bypassSanta&&choice.target!==seat&&['cheer','eggNog','donut','rps','onomatopoeia'].includes(choice.status)&&(santa.cheerChoices(s,choice.target).length||santa.canNog(s,choice.target)||deadpool.onomChoices(s,choice.target).length||deadpool.canRps(s,choice.target)||deadpool.canDonut(s,choice.target))){s.santaRemoval={seat:choice.target,source:seat,choice};return;}
 if([1,4,7].includes(id)){
  if(!s.players[choice.target][choice.status])return;
  if(id===7&&choice.status==='tactical'&&seat!==s.active&&choice.target===s.active&&tacticalChoices(s,choice.target).length){
   s.tacticalRemoval={seat:choice.target};
   return;
  }
  if(choice.status==='constrict'&&choice.target===s.active)delete s.wasConstricted;
  if(choice.status==='decrepify'&&choice.target===s.active)delete s.wasDecrepified;
  removeStatus(s.players[choice.target],choice.status,choice.tokenId);
  if(choice.status==='prey')removePreyBonus(s,choice.target,choice.preyIndex);
  if(choice.status==='barbed'&&choice.target===s.active)s.vineAttempts=0;
  if(id===1)grantPirateStatus(s,1-choice.target,choice.status);
  if(choice.status==='bounty')removeBountyBonus(s,choice.target);
  if(choice.status==='shadows'&&choice.target!==s.active&&s.stage==='damage'&&s.pending?.shadowSkippedDefence&&!s.pending.parlayBlocked&&!s.players[choice.target].shadows){
   s.pending.shadowSkippedDefence=false;s.stage='defence';
  }
  if(choice.status==='targeted'&&s.pending?.targetBonus&&choice.target!==s.active&&s.stage!=='postHit'){
   s.pending.targetBonus=false;
   s.pending.grossDamage-=2;
   updateDamage(s.pending);
  }
  return;
 }
 if(id===2){
  for(const key of statusKeys){
   if(key==='covertOps')continue;
   const player=s.players[choice.target];
   if(alchemist.types.includes(key)&&player.potions)player.potions=player.potions.filter(t=>t.key!==key);
   if(key==='timeBomb'&&player.timeBombTimers)player.timeBombTimers=[];
   if(key==='spellbound'&&player.boundAbilities)player.boundAbilities=[];if(key==='bagOfTricks'&&player.trickBags)player.trickBags=[];
   if(!newStatuses.includes(key)||player[key])player[key]=statusCap(player,key)>1?0:false;
  }
  removePreyBonus(s,choice.target,0,2);
  removeBountyBonus(s,choice.target);
  s.players[choice.target].shadowsStarted=false;
  s.players[choice.target].chiFresh=0;
  if(choice.target===s.active){s.vineAttempts=0;delete s.wasConstricted;delete s.wasDecrepified;}
  return;
 }
 const rules = heroRoster[hero];
 const card = {id,s,names,seat,p,opponent,c,choice,bounded,grantStatus,gainBloodPower,gainTactical,gainGrim,statusCap,updateDamage,discardRandom,drawCards,random,paladinBuffs,discardSpirits,spiritTypes,spiritTotal,queueGrowth,startSideDamage,grantPirateStatus,grantAttackStatus,add,seatCard,roll};
 if (rules.applyCard?.(card)) return;
 const rollSize = id === 3 || id === 33 && hero!==cursedPirate.id && hero!==artificer.id && hero!==seraph.id && hero!==vampireLord.id && hero!==gunslinger.id && hero!==samurai.id && hero!==tactician.id && hero!==huntress.id && hero!==headlessHorseman.id && hero!==necromancer.id&&hero!==paleLady.id&&hero!==raveness.id&&hero!==druid.id&&hero!==duelist.id&&hero!==forgemaster.id&&hero!==sunElf.id&&hero!==blackPanther.id&&hero!==blackWidow.id&&hero!==captainMarvel.id&&hero!==doctorStrange.id&&hero!==loki.id&&hero!==scarletWitch.id&&hero!==spiderMan.id&&hero!==thor.id&&hero!==cyclops.id&&hero!==gambit.id&&hero!==iceman.id&&hero!==jeanGrey.id&&hero!==psylocke.id&&hero!==rogue.id&&hero!==storm.id&&hero!==wolverine.id&&hero!==alchemist.id&&hero!==krampus.id&&hero!==mysticBrawler.id&&hero!==santa.id&&hero!==deadpool.id ? 1 : rules.cardRollSize?.(id,{s,seat}) ?? 0;
 if(rollSize){
  s.cardRoll={seat,id,dice:rollBatch(roll,rollSize),ninjaRerolls:hero===6&&id===28||hero===paleLady.id&&id===20?5:0};
  if(hero===gunslinger.id&&id===30||hero===huntress.id&&id===32||hero===sunElf.id&&id===34)s.cardRoll.target=choice.target;
  // During an Ultimate, the ability's dice and subsidiary rolls are final.
  if((s.stage==='locked'||[jeanGrey.id,psylocke.id,rogue.id,storm.id,wolverine.id,alchemist.id,krampus.id,mysticBrawler.id,deadpool.id].includes(hero)&&attackLocked(s))&&s.pending.ultimate&&!(hero===6&&id===28)&&!(hero===paleLady.id&&id===20)&&!(hero===mysticBrawler.id&&id===28))completeCardRoll(s,roll,random,add);
  return;
 }
 if(id===5||id===6){drawCards(p,id===5?3:2,random,id);return;}
 if(id===9){gainCP(p,2);return;}
 if(id===10){
  if(s.stage==='sideDamage'){s.sideDamage.prevention=(s.sideDamage.prevention??0)+6;return;}
  const key=choice.target===s.active?'returnPrevention':'prevention';
  s.pending[key]=(s.pending[key]??0)+6;
  updateDamage(s.pending);
  return;
 }
 if(id===15){
  s.budget++;
  if(s.stage==='announce'){s.pending=null;s.stage='offence';}
  return;
 }
 if(id===17){s.extraDefence=(s.extraDefence??0)+1;return;}
 if (rules.applyCardAfterShared?.(card)) return;
 if (id === 29) {
  grantStatus(opponent,'concussion');
  return;
 }
 const ctx=rollContext(s);
 if(!ctx)return;
 const {dice}=ctx, before=dice.slice();
 if(id===12||id===16){
  dice[choice.i]=roll();
  if(Number.isInteger(choice.j))dice[choice.j]=roll();
  else if(id===12)s.retry={seat,before};
 } else {
  dice[choice.i]=choice.v;
  if(Number.isInteger(choice.j))dice[choice.j]=choice.w;
 }
 if(ctx.scalar)s.effectDie=dice[0];
 add(`${names[seat]} changes the roll to ${dice.join(', ')}.`);
 if(!s.retry)releaseChangedAnnouncement(s,ctx,before);
}
function releaseChangedAnnouncement(s,ctx,before){
 if(cyclops.stage(s)==='announce'&&!s.cardRoll&&ctx.dice===s.dice&&ctx.dice.some((value,i)=>value!==before[i])){
  s.pending=null;
  if(s.cyclopsTask&&s.stage==='cyclopsSequence'){let t=s.cyclopsTask;while(t.parent)t=t.parent;t.resume='offence';}else s.stage='offence';
 }
}
function mainTargets(s,seat,id) {
 const probe=structuredClone(s);
 probe.mainAction=null;
 probe.mainChoice=null;
 // The card has already been paid for and committed to play.
 const p=probe.players[seat];
 p.hand.push(id);
 p.cp=seatCard(s,seat,id).cost;
 return cardChoices(probe,seat,id);
}
function playOneCard(s,seat,id,choice,roll,random,add){
 const names=heroNames(s),p=s.players[seat],c=seatCard(s,seat,id);
 p.cp-=price(s,seat,id);
 heroRoster[heroId(s,seat)].onCardPlayed?.(s,seat,id);
 p.hand.splice(p.hand.indexOf(id),1);
 if(c.phase!=='upgrade')p.discard.push(id);
 add(`${names[seat]} plays ${c.name}.`);
 if(c.phase==='main'&&([1,2,3,4,29,33].includes(id)||heroId(s,seat)===deadpool.id&&[28,31,32,33].includes(id)||heroId(s,seat)===santa.id&&[28,31,33].includes(id)||heroId(s,seat)===mysticBrawler.id&&[25,26,27,34].includes(id)||heroId(s,seat)===alchemist.id&&[24,25,27,29,30,31,33,34].includes(id)||heroId(s,seat)===seraph.id&&id===30||heroId(s,seat)===vampireLord.id&&[28,30,34].includes(id)||heroId(s,seat)===gunslinger.id&&[28,30].includes(id)||heroId(s,seat)===samurai.id&&[29,31,32].includes(id)||heroId(s,seat)===tactician.id&&id===28||heroId(s,seat)===huntress.id&&[31,32].includes(id)||heroId(s,seat)===3&&[27,32].includes(id)||heroId(s,seat)===4&&id===30||heroId(s,seat)===5&&[30,31].includes(id)||heroId(s,seat)===6&&id===27||heroId(s,seat)===cursedPirate.id&&[19,20,21,24,25,26,27,28,34].includes(id))&&hasResponse(s,1-seat))
  s.mainAction={seat,id,choice};
 else applyCard(s,seat,id,choice,roll,random,add);
}

const bounded = (v, cap) => Math.min(cap, Math.max(0, v));
function gainCP(player,amount){
 const before=player.cp;
 if(amount>0&&before<15&&player.coal===4&&!player.resurrected){player.coal=0;amount=Math.max(0,amount-1);}
 player.cp=bounded(before+amount,15);
 return player.cp-before;
}
const sets=[{name:'Season One ReRolled',heroes:[0,1,2,3,4,5,6,7]},{name:'Season Two',heroes:[cursedPirate.id,artificer.id,seraph.id,vampireLord.id,gunslinger.id,samurai.id,tactician.id,huntress.id]},{name:'Marvel',heroes:[blackPanther.id,blackWidow.id,captainMarvel.id,doctorStrange.id,loki.id,scarletWitch.id,spiderMan.id,thor.id]},{name:'X-Men',heroes:[cyclops.id,gambit.id,iceman.id,jeanGrey.id,psylocke.id,rogue.id,storm.id,wolverine.id]},{name:'Outcasts',heroes:[headlessHorseman.id,necromancer.id,paleLady.id,raveness.id]},{name:'Vanguard',heroes:[druid.id,duelist.id,forgemaster.id,sunElf.id]},{name:'Singles',heroes:[alchemist.id,krampus.id,mysticBrawler.id,santa.id,deadpool.id]}];
const heroId=(s,seat)=>s.players[seat].hero??seat;
const boardFor=(s,seat)=>{
 const hero=heroRoster[heroId(s,seat)];
 if(s.players[seat].werewolf&&hero.werewolfBoard)return hero.werewolfBoard;
 return s.players[seat].cursed && hero.cursedBoard ? hero.cursedBoard : hero.board;
};
const heroNames=s=>{
 const names=s.players.map((_,seat)=>HEROES[heroId(s,seat)].name);
 return names[0]===names[1]?names.map((name,seat)=>`${name} (P${seat+1})`):names;
};
const seatCard=(s,seat,id)=>cardInfo(heroId(s,seat),id);
function defenceName(s,seat,kind){
 const p=s.players[seat], hero=heroId(s,seat);
 if(hero===spiderMan.id)return spiderMan.defenceName(kind??s.defenceKind);
 const slot=hero===3?(kind??'shadowDefence'):'defence';
 return p.upgrades?.[slot]?seatCard(s,seat,p.upgrades[slot]).name:slot==='counterStrike'?'Counter Strike':boardFor(s,seat).defence;
}

function createMatch(roll, options) {
  let startRolls;
  do { startRolls = [roll(), roll()]; } while (startRolls[0] === startRolls[1]);
  const active = Number(startRolls[1] > startRolls[0]);
  const state={ version:1, active, turn:1, stage:'offence', players:[0,1].map(seat => ({hero:HEROES[options?.heroes?.[seat]]?options.heroes[seat]:seat, hp:50, cp:2, deck:28, hand:4, evasive:0, entangle:false, blind:false, targeted:false, concussion:false})),
    dice:[], held:[], attempts:0, budget:3, pending:null, defenceDice:[], effectDie:null, winner:null,
    log:[] };
  const names=heroNames(state);
  state.log.push(`Start roll: ${names[0]} ${startRolls[0]}, ${names[1]} ${startRolls[1]}. ${names[active]} starts.`);
  if(options){
    state.version=2;
    state.cards=true;
    state.promo=!!options.promo;
    state.stage=needsTurnStartUpkeep(state, true)?'upkeep':'main1';
    state.income={skipped:'first-turn'};
    state.players.forEach((p,i)=>{
      heroRoster[heroId(state,i)].initialize?.(state,i,options.random??Math.random);
      if(heroId(state,i)===samurai.id&&i===active){
        grantStatus(p,'honor');
        state.log.unshift(`${names[i]} gains Honor for starting the match.`);
      }
      cardsFor(i,p,state.promo,options.random??Math.random);
    });
  }
  if(options){jeanGrey.startTurn(state,active);if(state.stage==='main1')jeanGrey.main1(state,options.random??Math.random);}
  return state;
}
const dieValue=(value,player)=>value===6&&player.hex?0:value;
const effectiveDice=(dice,player)=>player.hex?dice.map(value=>dieValue(value,player)):dice;
const nevermoreOwner=s=>{
 const other=1-s.active;
 return s.players[other].nevermoreSeat===s.active?other:null;
};
const tally = (dice, seat) => dice.reduce((count, n) => {
  if(!n)return count;
  const symbol = HEROES[seat].symbols[n - 1];
  count[symbol] = (count[symbol] ?? 0) + 1;
  return count;
}, {});
const effectDiceCount=(p,player)=>p.spectral&&player?Math.min(5,player.dreadful??0):p.effectCount??(abilityEffectDice[p.effect]??5);
function matchingNumbers(dice) {
  return Math.max(0,...dice.filter(Boolean).map(value=>dice.filter(v=>v===value).length));
}
function hasStraight(dice,length,starts=[1,2,3]) {
  return starts.some(start=>Array.from({length},(_,i)=>start+i).every(value=>dice.includes(value)));
}
function qualifies(ability, dice, seat, symbolDice=dice) {
  if (ability.straight) return hasStraight(dice,ability.straight);
  const counts = tally(symbolDice, seat);
  return Object.entries(ability.symbols).every(([symbol, needed]) => (counts[symbol] ?? 0) >= needed);
}
const ninjutsuLabel=outcome=>({one:'+1 damage',two:'+2 damage',delayedPoison:'Inflict Delayed Poison',undefendable:'Make attack undefendable'}[outcome]);
const ninjutsuOutcomes=s=>['two','delayedPoison',...(!s.pending.undefendable&&!s.pending.ultimate&&!s.defenceDice.length&&
  ['ninjaGain','targeting','sneakOffer','defence'].includes(s.ninjutsuReturnStage)?['undefendable']:[])];
const canRerollMaul=s=>s.pending?.effect==='druidMaul'&&!s.pending.maulRerolled&&s.players[s.active].druidForm==='bear';
function legal(state) {
 if(state.deadpoolRps){const r=state.deadpoolRps;return {deadpoolRpsPick:['first','second'].includes(r.step),deadpoolRpsRandom:r.step==='second',deadpoolRpsReveal:r.step==='reveal',deadpoolShoot:r.step==='shoot'};}
 if(state.deadpoolTask&&state.stage==='deadpoolChoices'){const h=state.deadpoolTask.queue[0];return {deadpoolDonutTarget:h?.kind==='donuts',deadpoolCollect:h?.kind==='gain'&&h.window,deadpoolSpeech:['speechCP','speechTaco'].includes(h?.kind),deadpoolFourth:h?.kind==='fourth'};}
 if(state.santaRemoval&&!state.santaNogRoll&&!state.deadpoolDonutRoll&&!state.sideDamage&&!state.retry)return {santaRemovalReady:!state.santaRemoval.choosing,resolveSantaRemoval:!!state.santaRemoval.choosing};
 if(state.santaGift)return {santaGiftHide:state.santaGift.stage==='hide',santaGiftGuess:state.santaGift.stage==='guess'};
 if(state.santaTask&&state.stage==='santaChoices'){const h=state.santaTask.queue[0];return {collectSantaTokens:h?.kind==='gain'&&h.window,santaMistletoe:h?.kind==='mistletoe',santaApology:h?.kind==='apology'};}
 if(state.mysticTask&&state.stage==='mysticChoices'){const h=state.mysticTask.queue[0];return {mysticStrength:h?.kind==='strengths',mysticTectonic:h?.kind==='tectonic'};}
 if(state.krampusOverflow!==undefined)return {discardReject:true};
 if(state.krampusActivation)return {finishReject:true};
 if(state.krampusTask&&state.stage==='krampusChoices'){const h=state.krampusTask.queue[0];return {collectRejects:h?.kind==='draw'&&h.window,collectGifts:h?.kind==='gift'&&h.window,krampusFree:h?.kind==='free',krampusFreeSkip:h?.kind==='free',krampusRejection:h?.kind==='rejection'};}

 if(state.alchemistTask&&state.stage==='alchemistChoices')return {alchemistChoice:true,alchemistDone:alchemist.taskOptional(state)};
 if(state.wolverineIntimidate)return {wolverineIntimidate:true};
 if(state.wolverineGain&&!state.wolverineRageRoll)return {collectRage:true};
 if(state.stormTask&&state.stage==='stormChoices'&&!state.response)return {stormPlace:true,stormPlaceDone:!!state.stormTask.queue[0]?.optional};
 if(state.rogueGain)return {rogueCollect:true};
 if(state.psyReveal)return {psyRevealDone:true};
 if(state.jeanTask&&state.stage==='jeanChoices'&&!state.response&&!state.cardRoll&&!state.retry){const h=state.jeanTask.queue[0];return {jeanCollect:h?.kind==='gain'&&h.overflow,jeanPassive:h?.kind==='passive',jeanEssence:h?.kind==='essence'};}
 if(state.iceFreezeChoice)return {iceChooseFrozen:true};
 if(state.iceTask&&state.stage==='iceChoices'&&!state.response&&!state.cardRoll&&!state.retry){const h=state.iceTask.queue[0];return {iceCollect:h?.kind==='gain'&&h.overflow,iceStoreDone:h?.kind==='store'&&h.overflow,iceTransfer:h?.kind==='transfer',iceTransferDone:h?.kind==='transfer',iceChill:h?.kind==='chill',iceFrost:h?.kind==='frost'};}
 if(state.gambitRoll&&!state.response&&!state.cardRoll&&!state.retry)return {gambitResolveRoll:true,gambitMagicReroll:!!state.gambitRoll.magicLeft};
 if(state.gambitTask&&state.stage==='gambitSequence'&&!state.response&&!state.cardRoll&&!state.retry){const h=state.gambitTask.queue[0];return {gambitContinue:h?.kind==='window',gambitCharge:h?.kind==='accelerate',gambitChargeSkip:h?.kind==='accelerate',gambitRegain:h?.kind==='regain',gambitRegainSkip:h?.kind==='regain'&&h.optional!==false,gambitSleight:h?.kind==='sleight',gambitHandDone:h?.kind==='hand',gambitCollect:h?.kind==='dissolution'&&h.overflow,gambitLoseCharge:h?.kind==='loseCharge'};}
 if(state.cyclopsTask&&state.stage==='cyclopsSequence'&&!state.response&&!state.cardRoll&&!state.retry){
  const h=state.cyclopsTask.queue[0];return {cyclopsContinue:h?.kind==='then',cyclopsCollect:h?.kind==='gain'&&h.overflow,cyclopsTokenChoice:h?.kind==='choice',cyclopsHandDone:h?.kind==='hand',cyclopsScoutTake:h?.kind==='scout'&&h.picking,cyclopsScoutSkip:h?.kind==='scout'&&h.picking,cyclopsScoutDiscard:h?.kind==='scout'&&!h.picking,cyclopsScoutTop:h?.kind==='scout'&&!h.picking,cyclopsDefenceChoice:h?.kind==='defence'};
 }
 if(state.thorOverflow)return {thorOverflowDraw:true,thorOverflowKeep:true};
 if(state.thorTask&&state.stage==='thorSequence'&&!state.response&&!state.cardRoll)return {thorHammerChoice:true,thorHammerStop:true};
 if(state.conjureTask)return {conjureResponse:true};
 if(state.lokiTask)return {lokiTask:true};
 if(state.lokiIllusion)return {lokiIllusion:true};
 if(state.premonitionTask)return {completePremonition:state.premonitionTask.kind==='done'};
 if(state.strangeTask&&state.stage!=='sideDamage')return {strangeTask:true};
 if(state.widowReveal)return {widowRevealDone:true};
 if(state.widowTask)return {widowTask:true};
  if(state.grimOverflow)return {collectGrim:true};
  if(state.tacticalOverflow)return {collectTactical:true};
  if(state.tacticalRemoval)return {resolveTacticalRemoval:true};
  if(state.honorOverflow)return {collectHonor:true};
  if(state.bloodOverflow)return {collectBloodPower:true};
  if(state.response){
    const seat=state.response.seat;
    const canSpend=state.stage==='damage'&&!state.cardRoll&&state.players[seat].evasive>0;
    return {passResponse:true,evade:canSpend&&seat!==state.active&&incomingDamage(state)>0,
      evadeReturn:canSpend&&seat===state.active&&returnDamageFor(state)>0};
  }
  if(state.deadpoolDonutRoll&&!state.retry)return {resolveDonut:true};
  if(state.deadpoolLucky&&!state.retry){const r=state.deadpoolLucky;return {deadpoolLuckyHope:r.step==='hope',deadpoolLuckyRoll:r.step==='ready',deadpoolLuckyResolve:r.step==='roll'};}
  if(state.santaNogRoll&&!state.retry)return {resolveEggNog:true};
  if(state.santaRoll&&!state.cardRoll&&!state.retry)return {resolveSantaRoll:true};
  if(state.alchemistRoll&&!state.cardRoll&&!state.retry)return {resolveAlchemistLab:true};
  if(state.mysticContest&&!state.cardRoll&&!state.retry)return {resolveMysticContest:true};
  if(state.rogueRoll&&!state.cardRoll&&!state.retry)return {resolveRogueRoll:true,rerollSkyward:state.rogueRoll.kind==='skyward'&&state.players[state.rogueRoll.seat].cp>0};
  if(state.wolverineRageRoll&&!state.cardRoll&&!state.retry)return {resolveRageRecovery:true};
  if(state.alphaRoll&&!state.cardRoll&&!state.retry)return {resolveAlpha:true};
  if(state.scarletJinx&&!state.cardRoll&&!state.retry)return {resolveScarletJinx:true};
  if(state.lokiBag&&!state.cardRoll&&!state.retry)return state.lokiBag.kind==='roll'?{resolveTrickBag:true}:{chooseTrickBag:true};
  if(state.cosmicRayRoll&&!state.cardRoll&&!state.retry)return {chooseCosmicRay:true};
  if(state.cosmicRayOverflow&&!state.cosmicRayRoll)return {collectCosmicRay:true};
  if(state.widowAgility&&!state.cardRoll&&!state.retry)return {resolveAgility:true};
  if(state.widowBombRoll&&!state.cardRoll&&!state.retry)return {widowBombResolve:true};
  if(state.growth)return {growSpirit:true,finishGrowth:!!state.growth.original};
  if(state.retry)return {retryDie:true,finishRetry:true};
  if(state.mainChoice)return {resolveMainChoice:true};
  if(state.pirateChoice)return {resolvePirateChoice:true};
  if(state.mesmerizeRoll)return state.mesmerizeRoll.choosing?{rerollMesmerized:true}:{resolveMesmerize:true};
  if(state.bleedRoll&&!state.cardRoll)return {resolveBleed:true};
  if(state.seraphRoll&&!state.cardRoll)return {resolveSeraphRoll:true};
  if(state.artRoll&&!state.cardRoll)return {resolveArtRoll:true};
  if(state.cardRoll)return {finishCardRoll:true,abilityReroll:!!state.cardRoll.ninjaRerolls,mysticWildReroll:heroId(state,state.cardRoll.seat)===mysticBrawler.id&&state.cardRoll.id===28&&!state.cardRoll.mysticWildUsed&&mysticBrawler.wildLimit(state)>0};
  if(state.mainAction)return {finishMainCard:true};
  if(state.stage==='gunContest')return {resolveGunContest:true,rerollDuel:state.gunContest.kind==='duel'&&!!state.extraDefence};
  if(state.stage==='samuraiRoll')return {resolveBackStrike:true};
  if(state.stage==='gunReload')return {resolveReload:true,rerollReload:!!reloadRerolls(state).length};
  const defender = state.players[1-state.active];
  const prey = state.pending?.preyBonuses?.length<(defender.prey??0)?{reopenPrey:true}:{};
  if(state.shapeOverflow&&state.stage!=='finished')return {collectShapeShift:true};
  if(state.ravenFeathers&&!state.ravenFeathers.spending&&state.stage!=='finished')return {collectFeathers:true};
  switch (state.stage) {
    case 'spiderAfter': return {finishSpiderAfter:true};
    case 'spiderCombo': return {spendCombo:spiderMan.canCombo(state),skipCombo:true};
    case 'scarletAbility': return {finishScarletAbility:true};
    case 'lokiAbility': return {finishLokiAbility:true};
    case 'strangeAbility': return {finishStrangeAbility:true};
    case 'widowAbility': return {finishWidowAbility:true};
    case 'pantherAbility': return {finishPantherAbility:true};
    case 'sunGemRoll': return {resolveChargedGem:true};
    case 'finishPantherAbility':
      continueOffence(state.pending);
      break;
    case 'sunBurstChoice': return {sunBurstChoice:true};
    case 'sunMarked': return {resolveSunMarked:true};
    case 'forgeMine': return {forgeMineChoice:true};
    case 'forgeOrder': return {forgeOrder:true};
    case 'forgeSearch': return {forgeSearch:true};
    case 'forgeAbility': return {finishForgeAbility:true};
    case 'forgeMasterwork': return {forgeMasterwork:true};
    case 'forgeArmor': return {forgeArmor:true};
    case 'duelMove': return {duelMove:true};
    case 'duelAbility': return {finishDuelAbility:true};
    case 'guardOffer': return {spendGuardBreak:!!state.players[state.active].guardBreak,skipGuardBreak:true};
    case 'guardBreakRoll': return {resolveGuardBreak:true};
    case 'druidReady': return {finishDruidAbility:true};
    case 'druidRainfall': return {druidRainfall:true};
    case 'woundRoll': return {resolveWound:true};
    case 'ravenActivate': return {activateNevermore:true};
    case 'ravenNevermoreRoll': return {resolveNevermore:true};
    case 'ravenDiscard': return {ravenDiscard:true};
    case 'ravenAttackChoice': return {ravenAttackChoice:true};
    case 'ravenAbility': return {finishRavenAbility:true};
    case 'petulant': return {resolvePetulant:true};
    case 'paleMoonChoice': return {paleMoonChoice:true};
    case 'prey': return state.preyRoll?{resolvePrey:true}:{rollPrey:state.pending.preyBonuses.length<(defender.prey??0),skipPrey:true};
    case 'undeadRoll': return {resolveUndead:true,rerollUndead:!!state.undeadRoll.rerolls};
    case 'undeadRemove': return {removeUndead:true};
    case 'necroChoice': return {necroChoice:true};
    case 'horseRoll': return {resolveGrimRoll:true};
    case 'horrifyChoice': return {chooseHorrify:true};
    case 'nyraDamage': return {settle:true};
    case 'tacticalRestart': return {restartTacticalOffence:true};
    case 'offence': return {
      roll: decrepCanRoll(state)&&state.players[state.active].cp>=constrictCost(state)&&state.attempts < state.budget && (!state.dice.length || state.held.some((v,i) => !v&&!iceman.locked(state,state.active,i))),
      hold: state.attempts < state.budget && state.dice.length > 0,
      declare: abilitiesFor(state,state.active).filter(a=>!loki.blocked(state,state.active,a)).filter(a => qualifies(a,effectiveDice(state.dice,state.players[state.active]),heroId(state,state.active),scarletWitch.symbols(state,state.active,effectiveDice(state.dice,state.players[state.active])))).map(a=>a.name),
      end:state.dice.length > 0||state.budget===0
    };
    case 'announce': return {accept:true};
    case 'gunDuelChoice': return {chooseDuel:true};
    case 'vampireSearch': return {searchVampireDeck:true};
    case 'vampireChoice': return {chooseVampireBenefit:true};
    case 'seraphTarget': return {chooseSeraphTarget:true};
    case 'purify': return {resolvePurify:true};
    case 'blind': return {resolveBlind:true};
    case 'effect': return {rollEffect:true};
    case 'deadpoolAbility': return {finishDeadpoolAbility:true};
    case 'deadpoolPrepared': return {finishDeadpoolPrepared:true};
    case 'deadpoolResolved': return {finishDeadpoolResolved:true};
    case 'santaAbility': return {finishSantaAbility:true};
    case 'santaTarget': return {rollSantaAbility:true};
    case 'santaPrepared': return {finishSantaPrepared:true};
    case 'santaExtraRoll': return {startSantaRoll:true};
    case 'mysticAbility': return {finishMysticAbility:true};
    case 'mysticStrongTarget': return {rollMysticContest:true};
    case 'mysticPrepared': return {finishMysticPrepared:true};
    case 'mysticResolved': return {finishMysticResolved:true};
    case 'krampusAbility': return {finishKrampusAbility:true};
    case 'krampusPrepared': return {finishKrampusPrepared:true};
    case 'krampusResolved': return {finishKrampusResolved:true};
    case 'alchemistDefence': return {alchemistDefenceReady:true};
    case 'alchemistAbility': return {finishAlchemistAbility:true};
    case 'alchemistPotions': return {finishAlchemistPotions:true};
    case 'wolverineAbility': return {finishWolverineAbility:true};
    case 'wolverineResolved': return {finishWolverineResolved:true};
    case 'wolverineBarrage': return {wolverineBarrage:true};
    case 'wolverineRemove': return {wolverineRemove:true};
    case 'wolverineSevere': return {wolverineSevere:true};
    case 'stormCharge': return {stormUseCharge:true,stormKeepCharge:true};
    case 'stormAbility': return {finishStormAbility:true};
    case 'stormResolved': return {finishStormResolved:true};
    case 'rogueAbility': return {finishRogueAbility:true};
    case 'psyAbility': return {finishPsyAbility:true};
    case 'paralyzeAfter': return {finishParalyze:true};
    case 'jeanAbility': return {finishJeanAbility:true};
    case 'jeanResolved': return {finishJeanResolved:true};
    case 'jeanBurnRoll': return {resolvePhoenixBurn:true};
    case 'iceAbility': return {finishIcemanAbility:true};
    case 'iceResolved': return {finishIcemanResolved:true};
    case 'iceAfter': return {finishIcemanAfter:true};
    case 'iceGlideOffer': return {spendGlide:iceman.canGlide(state),skipGlide:true};
    case 'iceGlideReady': return {activateIcemanGlide:true};
    case 'iceGlideDeclare': return {declare:[state.iceGlideTarget]};
    case 'gambitAbility': return {finishGambitAbility:true};
    case 'cyclopsAbility': return {finishCyclopsAbility:true};
    case 'thorAbility': return {finishThorAbility:true};
    case 'effectResponse': if(state.pending.effect==='thorChain')return {chooseThorChain:true};return {resolveEffect:true,abilityReroll:!!state.pending.ninjaRerolls,effectRetry:canRerollMaul(state)||!!state.pending.effectRetry||!!state.pending.tempestChi&&state.players[state.active].chi>0};
    case 'combustion': return {chooseMastery:true};
    case 'pirateKegRoll': return {resolvePirateKeg:true};
    case 'artSpanner': return {chooseSpanner:true};
    case 'artBuild': return {scratchBuild:true};
    case 'artFreeBots': return {chooseFreeBot:true};
    case 'upkeep': {
      const p=state.players[state.active];
      if(jeanGrey.needsSwitch(state))return {jeanSwitch:true};
      if(jeanGrey.needsBurn(state))return {checkPhoenixBurn:true};
      if(p.bagOfTricks)return {rollTrickBag:true};
      if(p.cosmicFlare&&!state.cosmicFlareChecked)return {resolveCosmicFlare:true};
      if((p.timeBombTimers??[]).some(b=>!(state.widowBombChecked??[]).includes(b.id)))return {widowBombRoll:true};
      if(heroId(state,state.active)===gambit.id&&p.highStakesTurn!==state.turn)return {gambitHighStakes:true};
      if(p.disruption)return {gambitPayDisruption:p.cp>0,gambitTakeDisruption:true};
      if(heroId(state,state.active)===alchemist.id&&p.labTurn!==state.turn)return {alchemistUpkeep:true};
      if(p.forgeOre&&!state.minesChecked)return {forgeUpkeep:true};
      if(p.disarm)return {resolveDisarm:true};
      if(p.footwork!==undefined&&!state.repositioned)return {reposition:true};
      if(nevermoreOwner(state)!==null&&!state.nevermoreChecked)return {rollNevermore:true};
      if(heroId(state,state.active)===necromancer.id&&!state.necroUpkeep)return {unearth:true};
      if(heroId(state,state.active)===headlessHorseman.id&&!state.horseUpkeep)
        return {horseUpkeep:true};
      const tracked=state.artUpkeep?.turn===state.turn?state.artUpkeep:{};
      const collectSynth=heroId(state,state.active)===artificer.id&&!tracked.collected;
      const clearNanites=!!p.nanite&&!tracked.cleared;
      const usual={resolveUpkeep:true,evadeUpkeep:upkeepIncoming(state)>0&&p.evasive>0&&!state.upkeepEvaded};
      if(collectSynth||clearNanites)return {...usual,resolveUpkeep:false,collectSynth,clearNanites};
      const wound=!!p.wound&&(state.woundsResolved??0)<Math.min(state.woundsAtStart??p.wound,p.wound+(state.woundsRemoved??0));
      const regenerate=!!druid.regenTotal(p)&&!state.regenerateChecked;
      return wound||regenerate?{...usual,resolveUpkeep:false,...(wound?{checkWound:true}:{}),...(regenerate?{checkRegenerate:true}:{})}:usual;
    }
    case 'knockdown': return state.players[state.active].knockdown?{payKnockdown:state.players[state.active].cp>=2,skipKnockdown:true}:{begin:true};
    case 'pickpocket': return {chooseStolenCP:true};
    case 'sneakOffer': return {spendSneak:!!state.players[state.active].sneak,skipSneak:true};
    case 'sneakRoll': return {resolveSneak:true};
    case 'targeting': return {resolveTarget:true};
    case 'ninjaGain': return {finishNinjaGain:true};
    case 'ninjutsuRoll': return {resolveNinjutsu:true};
    case 'ninjutsuChoice': return {chooseNinjutsu:true};
    case 'sideDamage': return {resolveSideDamage:true};
    case 'dryadResponse': return {acceptStatuses:true};
    case 'spiritPayment': return {paySpirits:true};
    case 'overgrowthWells': return {finishOvergrowth:true};
    case 'attackWells': case 'defenceWells': return {chooseWells:true};
    case 'harvestWells': return {harvestWells:true};
    case 'defenceResponse': return {resolveDefence:true,extraDefence:!!state.extraDefence,abilityReroll:!!(state.pending.ninjaDefenceRerolls||state.pending.seraphDefenceReroll),
      evade:state.cards&&defender.evasive>0&&incomingDamage(state)>0};
    case 'postHit': return {continueHit:true};
    case 'paladinReward': return {choosePaladinReward:true};
    case 'monkChoice': return {chooseMonkReward:true};
    case 'choice': return {chooseEffect:true};
    case 'preventStatus': return {preventStatus:true};
    case 'main1': return {begin:true};
    case 'discard': return {next:state.players[state.active].hand.length<=6};
    case 'locked': return {settle:true,...prey};
    case 'defence': return {defend:!state.pending.parlayBlocked&&!shadowAvoids(state), skipDefence:true};
    case 'damage': return {settle:true,...prey, evade: defender.evasive > 0 && state.pending.damage > 0,
      evadeReturn:state.cards&&state.players[state.active].evasive>0&&returnDamageFor(state)>0};
    case 'evasion': return {resolveEvade:true};
    case 'main': return state.cards?{endMain:true}:{next:true};
    default: return {};
  }
}
function startSeraphRoll(s,seat,kind,count,roll){
 s.seraphRoll={seat,kind,dice:rollBatch(roll,count),resume:s.stage};
 s.stage='seraphRoll';
}
function startArtRoll(s,seat,kind,count,roll) {
 s.artRoll={seat,kind,dice:rollBatch(roll,count),resume:s.stage};
 s.stage='artRoll';
}
function transition(previous, action, roll, random=Math.random, responseMode=false){
 const context=psylocke.enter(previous,action);
 try{return transitionStep(previous,action,roll,random,responseMode);}finally{psylocke.leave(context);}
}
function transitionStep(previous, action, roll, random, responseMode){
 let next=transitionCore(previous,action,roll,random,responseMode===true);
 // Card-only responses are available through both Hands on the current match screen.
 // These response requests are returned before the action consumes dice or randomness.
 if(responseMode==='inlineCards'&&!previous.response&&next.response?.action===action&&
     !hasEffectResponse(previous,next.response.seat)){
   next=transitionCore(previous,action,roll,random,true);
 }
 psylocke.setState(next,true);if(next!==previous)psylocke.flush(next);
 if(next!==previous&&action.type!=='manifestSwap'&&!iceman.permitted(previous,next))return previous;
 if(next!==previous)next.players.forEach((player,seat)=>{
   if(next.stage==='finished'&&player.nevermoreSeat!==undefined){
     if(!player.hp)delete player.nevermoreSeat;
     else if(!next.players[player.nevermoreSeat].hp)raveness.move(next,seat,seat);
   }
   if(!player.resurrected)return;
   player.cp=0;
   if(previous.players[seat].resurrect&&!player.resurrect)next.log.unshift(`${heroNames(next)[seat]} returns with 5 Health through Resurrect.`);
 });
 if(next!==previous){
   blackWidow.refresh(next);spiderMan.refresh(next);
   if(next.stage!=='finished'&&!next.sideDamage&&!next.widowTask&&!next.widowReveal&&next.widowExplosions?.length){
     const event=next.widowExplosions.shift();
     startSideDamage(next,event.seat,4,'Time Bomb',false,{keepPending:true,pantherLocked:event.locked});
   }
   const hit=next.pending, player=next.players[next.active];
   if(hit&&(hit.kineticBonus!==undefined||player.kineticEnergy!==undefined)&&hit.grossDamage!==undefined&&!['main','main1','discard','finished','postHit'].includes(next.stage)&&!hit.kineticSettled){
     const bonus=hit.attack&&!hit.pure&&!hit.parlayBlocked?Math.floor((player.kineticEnergy??0)/2):0;
     hit.grossDamage+=bonus-(hit.kineticBonus??0);
     hit.kineticBonus=bonus;
     updateDamage(hit);
   }
   if(next.stage!=='finished'&&!next.sideDamage){
     const seat=next.players.findIndex(p=>p.kineticBursts>0&&p.hp>0);
     if(seat>=0){
       const p=next.players[seat], locked=!!attackLocked(next);
       p.kineticBursts--;
       gainCP(p,2);
       drawCards(p,2,random);
       next.log.unshift(`${heroNames(next)[seat]} bursts Kinetic Energy, gaining 2 CP and drawing 2 cards.`);
       startSideDamage(next,1-seat,5,'Kinetic Energy',false,{keepPending:true,pantherLocked:locked});
     }
   }
 }
 if(next!==previous){
   next.players.forEach((p,seat)=>{const old=previous.players[seat];if((old.cursed!==p.cursed||old.werewolf!==p.werewolf)&&p.boundAbilities?.length){p.boundAbilities=[];loki.sync(p);}});
   if(next.stage!=='finished'&&!next.sideDamage&&next.spiderWebHits?.length){
     const event=next.spiderWebHits.shift();startSideDamage(next,event.target,2,'Webbed',false,{keepPending:true,pantherLocked:event.locked});
   }
   if(next.pending?.scarletWarpApplied&&!next.players[1-next.active].realityWarp)next.pending.realityWarp=false;
   loki.pump(next);doctorStrange.pump(next);thor.pump(next);thor.refresh(next);cyclops.pump(next,random);cyclops.refresh(next);gambit.pump(next,roll,random);iceman.pump(next,random);jeanGrey.pump(next,random);storm.pump(next);wolverine.pump(next);alchemist.pump(next,random);krampus.pump(next,random);mysticBrawler.pump(next,random);mysticBrawler.refresh(next);santa.pump(next,random);deadpool.pump(next,random);iceman.freeze(next);
   if(next.iceGlideTarget&&next.stage==='offence')next.stage='iceGlideReady';
   if(next.stage==='main1')jeanGrey.main1(next,random);
   psylocke.flush(next);
 }
 return next;
}
function transitionCore(previous, action, roll, random, bypassResponse) {
  if(!previous.psyReveal){const result=deadpool.handle(previous,action,roll,random,bypassResponse);if(result!==undefined)return result;}
  if(previous.deadpoolRps||previous.deadpoolTask&&previous.stage==='deadpoolChoices')return previous;
  if(!previous.psyReveal){const result=santa.handle(previous,action,roll,random,bypassResponse);if(result!==undefined)return result;}
  if(previous.santaGift||previous.santaTask&&previous.stage==='santaChoices')return previous;
  if(!previous.psyReveal){const result=mysticBrawler.handle(previous,action,roll,random,bypassResponse);if(result!==undefined)return result;}
  if(previous.mysticTask&&previous.stage==='mysticChoices')return previous;
  if(!previous.psyReveal){const result=krampus.handle(previous,action,roll,random);if(result!==undefined)return result;}
  if(previous.krampusOverflow!==undefined)return previous;
  if(previous.krampusTask&&previous.stage==='krampusChoices')return previous;
  if(previous.krampusActivation&&action.type!=='playCard')return previous;

  if(!previous.psyReveal){const result=alchemist.handle(previous,action,roll,random,bypassResponse);if(result!==undefined)return result;}
  if(previous.alchemistTask&&previous.stage==='alchemistChoices')return previous;
  if(!previous.psyReveal){const result=wolverine.handle(previous,action,roll,random,bypassResponse);if(result!==undefined)return result;}
  if(previous.wolverineGain&&!previous.wolverineRageRoll||previous.wolverineIntimidate)return previous;
  if(!previous.psyReveal){const result=rogue.handle(previous,action,roll,random,bypassResponse);if(result!==undefined)return result;}
  if(previous.rogueGain)return previous;
  if(!previous.psyReveal){const result=storm.handle(previous,action,roll,random);if(result!==undefined)return result;}
  if(previous.stormTask&&previous.stage==='stormChoices')return previous;
  if(previous.psyReveal&&action.type!=='psyRevealDone')return previous;
  const iceResult=iceman.handle(previous,action,roll,random,bypassResponse);
  if(iceResult!==undefined)return iceResult;
  if(previous.iceFreezeChoice)return previous;
  const psyResult=psylocke.handle(previous,action,roll);
  if(psyResult!==undefined)return psyResult;
  if(previous.psyReveal)return previous;
  const jeanResult=jeanGrey.handle(previous,action,roll,random);
  if(jeanResult!==undefined)return jeanResult;
  const gambitResult=gambit.handle(previous,action,roll,random,bypassResponse);
  if(gambitResult!==undefined)return gambitResult;
  if(gambit.forced(previous))return previous;
  const cyclopsResult=cyclops.handle(previous,action,roll,random,bypassResponse);
  if(cyclopsResult!==undefined)return cyclopsResult;
  if(cyclops.choosing(previous))return previous;
  const thorResult=thor.handle(previous,action,roll,random,bypassResponse);
  if(thorResult!==undefined)return thorResult;
  if(previous.thorOverflow)return previous;
  const spiderResult=spiderMan.handle(previous,action,roll);
  if(spiderResult!==undefined)return spiderResult;
  const scarletResult=scarletWitch.handle(previous,action,roll,random,bypassResponse);
  if(scarletResult!==undefined)return scarletResult;
  if(previous.conjureTask)return previous;
  const lokiResult=loki.handle(previous,action,roll,random,bypassResponse);
  if(lokiResult!==undefined)return lokiResult;
  if(previous.lokiTask||previous.lokiIllusion||previous.lokiBag?.kind==='choose')return previous;
  const strangeResult=doctorStrange.handle(previous,action,random);
  if(strangeResult!==undefined)return strangeResult;
  if(previous.strangeTask&&previous.stage!=='sideDamage'||previous.premonitionTask&&action.type!=='completePremonition')return previous;
  if(action.type==='chooseCosmicRay'&&legal(previous).chooseCosmicRay&&!bypassResponse&&!previous.response&&!previous.cosmicRayRoll.locked&&hasResponse(previous,1-previous.cosmicRayRoll.seat))return {...previous,response:{seat:1-previous.cosmicRayRoll.seat,action}};
  const marvelResult=captainMarvel.handle(previous,action,roll);
  if(marvelResult!==undefined)return marvelResult;
  if(['resolveAgility','widowBombResolve'].includes(action.type)&&!bypassResponse&&!previous.response&&legal(previous)[action.type]){
    const owner=previous.widowAgility?.seat??previous.active;
    if(hasResponse(previous,1-owner))return {...previous,response:{seat:1-owner,action}};
  }
  if(previous.cosmicRayOverflow&&!previous.cosmicRayRoll)return previous;
  const widowResult=blackWidow.handle(previous,action,roll,random);
  if(widowResult!==undefined)return widowResult;
  if(previous.widowTask||previous.widowReveal)return previous;
  if(action.type==='spendVibraniumSuit'){
    const seat=cardActor(previous), kind=blackPanther.incoming(previous,seat);
    if(!previous.players[seat].vibraniumSuit||!kind||previous.cardRoll||previous.retry)return previous;
    const s=structuredClone(previous);
    s.response=null;
    removeStatus(s.players[seat],'vibraniumSuit');
    blackPanther.prevent(s,seat,3,kind);
    s.log.unshift(`${heroNames(s)[seat]} spends Vibranium Suit to prevent 3 damage.`);
    return s;
  }
  if(action.type==='spendSunDawn'||action.type==='spendChargedGem'){
    const seat=previous.active;
    const dawn=action.type==='spendSunDawn';
    if(previous.response&&previous.response.seat!==seat||previous.retry||previous.forgeTask||
       !(dawn?sunElf.canDawn(previous,seat):sunElf.canGem(previous,seat)))return previous;
    const s=structuredClone(previous), p=s.players[seat];
    s.response=null;
    if(dawn){
      s.pending.dawnUsed=true;
      s.pending.grossDamage+=p.sunDial;
      updateDamage(s.pending);
      s.log.unshift(`Dawn adds ${p.sunDial} damage.`);
    } else {
      removeStatus(p,'chargedGem');
      s.sunGemRoll={dice:[roll()],resume:s.stage};
      s.stage='sunGemRoll';
    }
    return s;
  }
  if(action.type==='spendShapeShift'){
    const seat=action.target;
    if(![0,1].includes(seat)||!druid.shiftChoices(previous,seat).includes(action.status))return previous;
    const s=structuredClone(previous);
    s.response=null;
    s.players[seat].shapeShift--;
    s.players[seat].druidForm=action.status;
    s.log.unshift(`${heroNames(s)[seat]} shifts to ${druid.formName(action.status)} Form.`);
    return s;
  }
  if(action.type==='spendFeather'){
    const seat=action.target;
    if(![0,1].includes(seat)||previous.response&&previous.response.seat!==seat)return previous;
    const option=raveness.featherChoices(previous,seat).find(option=>option.kind===action.status);
    if(!option)return previous;
    const s=structuredClone(previous);
    s.response=null;
    s.players[seat].feather-=option.cost;
    if(option.kind==='activate'){
      if(s.ravenFeathers)s.ravenFeathers.spending=true;
      raveness.activate(s,seat,1,s.ravenFeathers?'featherSpent':undefined);
    } else {
      const dice=s.nevermoreRoll.dice;
      dice[0]=option.kind==='reroll'?roll():dice[0]+(option.kind==='up'?1:-1);
    }
    s.log.unshift(`${heroNames(s)[seat]} spends ${option.cost} Feather to ${option.label.toLowerCase()}.`);
    return s;
  }
  if(previous.stage==='undeadRemove'&&action.type!=='removeUndead')return previous;
  if(previous.stage==='nyraDamage'&&action.type!=='settle')return previous;
  if(previous.cards){
    const seat=cardActor(previous);
    if(action.type==='forgemasterAction'){
      const option=forgemaster.choices(previous,seat)[action.choice];
      if(!option)return previous;
      const s=structuredClone(previous), p=s.players[seat];
      s.response=null;
      const {kind,card}=option;
      if(kind==='draw'){
        p.cp-=3;
        p.minesDrawTurn=s.turn;
        drawCards(p,1,random);
      } else if(kind==='deposit'){
        p.hand.splice(p.hand.indexOf(card),1);
        p.forgeOre.push(card);
      } else if(kind==='craft'){
        p.armor[option.slot]=option.tier;
        p.forgeOre=p.forgeOre.filter(id=>!option.ids.includes(id));
        p.deck.unshift(...option.ids);
      } else {
        p.forgeOre.splice(p.forgeOre.indexOf(card),1);
        p.discard.push(card);
        if(kind==='heal')p.hp=bounded(p.hp+1,60);
        if(kind==='cp')gainCP(p,1);
        if(kind==='oreDraw')drawCards(p,2,random,card);
        if(kind==='reroll'||kind==='six'){
          const ctx=rollContext(s), before=ctx.dice.slice();
          ctx.dice[option.index]=kind==='reroll'?roll():6;
          if(ctx.scalar)s.effectDie=ctx.dice[0];
          releaseChangedAnnouncement(s,ctx,before);
        }
      }
      s.log.unshift(`${heroNames(s)[seat]} · ${option.label}.`);
      return s;
    }
    if(action.type==='necroAction'){
      const option=necroActions(previous,seat).find(x=>x.kind===action.status);
      if(!option)return previous;
      const s=structuredClone(previous),p=s.players[seat],hit=s.pending;
      s.response=null;
      const kind=option.kind;
      if(option.cost!==undefined){
        p.corpses-=option.cost;
        if(kind==='resurrect')p.resurrect=true;
        else necromancer.summon(p,kind);
      } else if(kind==='spikes'){
        p.undead.golem--;
        hit.necroReturn=(hit.necroReturn??0)+2;
        hit.prevention=(hit.prevention??0)+2;
        updateDamage(hit);
      } else {
        const used=p.undeadUsed={...undeadUsed(s,seat)};
        if(kind==='spear'||kind==='spur'){
          used[kind==='spear'?'warrior':'golem']++;
          used.rolled=(used.rolled??0)+1;
          hit.grossDamage+=kind==='spear'?1:2;
          updateDamage(hit);
        } else {
          used.mage++;
          used.rolled=(used.rolled??0)+1;
          if(kind==='withering')grantAttackStatus(s,s.players[1-seat],'decrepify');
          else stealNecroHealth(s,seat,1);
        }
      }
      s.log.unshift(option.label);
      return s;
    }
    if(action.type==='spendGrim'){
      if(!grimChoices(previous,seat).includes(action.status))return previous;
      const s=structuredClone(previous), p=s.players[seat];
      s.response=null;
      p.grim--;
      if(action.status==='attempt'){
        p.grimAttemptTurn=s.turn;
        s.budget++;
        if(s.stage==='announce'){s.stage='offence';s.pending=null;}
        s.log.unshift('Grim Pursuit grants an additional Roll Attempt.');
      } else {
        p.grimDamageTurn=s.turn;
        s.horseRoll={seat,dice:rollBatch(roll,5),resume:s.stage};
        s.stage='horseRoll';
      }
      return s;
    }
    if(previous.grimOverflow&&action.type!=='collectGrim')return previous;
    if(action.type==='healNyra'){
      if(!canHealNyra(previous,seat))return previous;
      const s=structuredClone(previous), p=s.players[seat];
      s.response=null;
      removeStatus(p,'nyraBond');
      const healed=huntress.changeHealth(p,2);
      s.log.unshift(`Nyra’s Bond heals Nyra for ${healed}.`);
      return s;
    }
    if(action.type==='nyraReroll'){
      const index=action.index;
      if(!Number.isInteger(index)||!nyraRerolls(previous,seat)[index])return previous;
      const s=structuredClone(previous), p=s.players[seat], ctx=rollContext(s), before=ctx.dice.slice();
      s.response=null;
      p.nyra.rerollTurn=s.turn;
      huntress.changeHealth(p,-1);
      ctx.dice[index]=roll();
      if(ctx.scalar)s.effectDie=ctx.dice[0];
      releaseChangedAnnouncement(s,ctx,before);
      s.log.unshift(`Nyra takes 1 damage. Huntress rerolls die ${index+1} to ${ctx.dice[index]}.`);
      return s;
    }
    if(action.type==='spendTactical'){
      const option=tacticalChoices(previous,seat)[action.choice];
      if(!option)return previous;
      const s=structuredClone(previous);
      applyTactical(s,seat,option,roll,random);
      return s;
    }
    if(previous.tacticalOverflow&&action.type!=='collectTactical'||previous.tacticalRemoval&&action.type!=='resolveTacticalRemoval')return previous;
    if(action.type==='spendHonor'){
      const amount=action.amount;
      if(![1,2].includes(amount)||honorChoices(previous,seat)<amount)return previous;
      const s=structuredClone(previous);
      s.response=null;
      s.players[seat].honor-=amount;
      const bonus=amount===2?3:1;
      s.pending.grossDamage+=bonus;
      updateDamage(s.pending);
      s.log.unshift(`${heroNames(s)[seat]} spends ${amount} Honor for +${bonus} damage.`);
      return s;
    }
    if(previous.honorOverflow&&action.type!=='collectHonor')return previous;
    if(action.type==='backStrike'){
      if(!canBackStrike(previous,seat))return previous;
      const s=structuredClone(previous);
      s.response=null;
      removeStatus(s.players[seat],'backStrike');
      s.samuraiRoll={seat,dice:[roll()],resume:s.stage};
      s.stage='samuraiRoll';
      s.log.unshift(`${heroNames(s)[seat]} spends Back Strike.`);
      return s;
    }
    if(action.type==='spendReload'){
      if(!canReload(previous,seat))return previous;
      const s=structuredClone(previous);
      s.response=null;
      removeStatus(s.players[seat],'reload');
      s.gunReload={seat,dice:[roll()],resume:s.stage,used:[],extra:0};
      s.stage='gunReload';
      s.log.unshift(`${heroNames(s)[seat]} spends Reload.`);
      return s;
    }
    if(action.type==='bloodPower'){
      const option=bloodPowerChoices(previous,seat)[action.choice];
      if(!option)return previous;
      const s=structuredClone(previous), p=s.players[seat], hit=s.pending;
      s.response=null;
      p.bloodPower-=option.cost;
      p.bloodSpent={...vampireLord.usage(s,seat),[option.cost]:true};
      if(option.cost===1){hit.grossDamage+=3;updateDamage(hit);}
      else if(option.cost===2)removeMatchStatus(s,option.target,option.status,option.tokenId);
      else if(option.cost===3)drawCards(p,2,random,s.cardRoll?.id);
      else s.bloodHealPlanned=true;
      s.log.unshift(`${heroNames(s)[seat]} spends ${option.cost} Blood Power. ${option.label}.`);
      return s;
    }
    if(previous.bloodOverflow&&action.type!=='collectBloodPower')return previous;
    if(action.type==='mesmerize'){
      if(!canMesmerize(previous,seat))return previous;
      const s=structuredClone(previous);
      s.response=null;
      removeStatus(s.players[seat],'mesmerize');
      s.mesmerizeRoll={seat,dice:[roll()],resume:s.stage};
      s.stage='mesmerizeRoll';
      s.log.unshift(`${heroNames(s)[seat]} spends Mesmerize.`);
      return s;
    }
    if(previous.mesmerizeRoll?.choosing&&action.type!=='rerollMesmerized')return previous;
    if(action.type==='flight'){
      const mode=tokenChoices(previous,seat).flight;
      if(!mode)return previous;
      const s=structuredClone(previous);
      s.response=null;
      removeStatus(s.players[seat],'flight');
      startSeraphRoll(s,seat,mode,2,roll);
      s.log.unshift(`${heroNames(s)[seat]} spends Flight.`);
      return s;
    }
    if(action.type==='artificerAction'){
      const selected=artificerActions(previous,seat).find(option=>option.key===action.status);
      if(!selected)return previous;
      const s=structuredClone(previous),p=s.players[seat],hit=s.pending;
      s.response=null;
      const key=selected.key;
      if(key==='nanite'){
        p.synth-=4;
        if(seat===s.active&&hit?.incomingStatus&&['defence','defenceResponse'].includes(s.stage))
          grantAttackStatus(s,s.players[1-seat],'nanite');
        else grantStatus(s.players[1-seat],'nanite');
      } else if(key==='nano'){
        p.synth-=artificer.cost(p,'nanobot');
        artificer.upkeep(s).nanoTurn=s.turn;
        const order=[seat,1-seat], amounts=artificer.detonate(s);
        const targets=order.filter(target=>amounts[target]);
        s.artDetonation={amounts,targets:targets.slice(1),resolved:[0,0]};
        startSideDamage(s,targets[0],amounts[targets[0]],'Nanobot',false,{artDetonation:true});
      } else if(key==='shock'){
        p.synth-=artificer.cost(p,'shockbot');
        p.shockTurn=s.turn;
        hit.grossDamage+=3;
        updateDamage(hit);
      } else if(key==='heal'){
        p.synth-=artificer.cost(p,'healbot');
        hit.healBotUses=(hit.healBotUses??0)+1;
        startArtRoll(s,seat,'heal',1,roll);
      } else {
        const built=p.bots?.[key]??0;
        p.synth-=built?3:2;
        (p.bots??={})[key]=built+1;
      }
      s.log.unshift(`${heroNames(s)[seat]} uses ${selected.label}.`);
      return s;
    }
    if(action.type==='titheDraw'||action.type==='titheReroll'){
      const choices=titheChoices(previous,seat);
      const draw=action.type==='titheDraw';
      if(draw?!choices.draw:!Number.isInteger(action.index)||!choices.dice?.[action.index])return previous;
      const s=structuredClone(previous),p=s.players[seat];
      if(draw){
        p.cp-=titheDrawCost(p);
        drawCards(p,1,random,s.cardRoll?.id);
      } else {
        p.cp--;
        const ctx=rollContext(s),before=ctx.dice.slice();
        ctx.dice[action.index]=roll();
        if(ctx.scalar)s.effectDie=ctx.dice[0];
        releaseChangedAnnouncement(s,ctx,before);
      }
      s.response=null;
      const result=draw?'draw a card':`reroll die ${action.index+1} to ${rollContext(s).dice[action.index]}`;
      s.log.unshift(`${heroNames(s)[seat]} uses Tithe to ${result}.`);
      return s;
    }
    if(['seedling','sapling','saplingDraw','dryad','dryadPrevent','wellspring'].includes(action.type)){
      const options=tokenChoices(previous,seat);
      if(!options[action.type]||
         action.type==='seedling'&&(!Number.isInteger(action.index)||!options.seedling[action.index])||
         action.type==='dryadPrevent'&&!options.dryadPrevent.includes(action.status))return previous;
      const s=structuredClone(previous),p=s.players[seat],hit=s.pending;
      s.response=null;
      if(action.type==='seedling'){
        spendSpirit(p,'seedling');
        const ctx=rollContext(s),before=ctx.dice.slice();
        ctx.dice[action.index]=roll();
        if(ctx.scalar)s.effectDie=ctx.dice[0];
        releaseChangedAnnouncement(s,ctx,before);
      } else if(action.type==='dryadPrevent'){
        spendSpirit(p,'dryad');
        (hit.dryadBlocked??=[]).push(action.status);
      } else if(action.type==='dryad'){
        spendSpirit(p,'dryad');
        hit.damage+=3;
        if(hit.grossDamage!==undefined){hit.grossDamage+=3;updateDamage(hit);}
      } else if(action.type==='wellspring'){
        removeStatus(p,'wellspring');
        s.cardRoll={seat,id:null,dice:[roll()]};
      } else {
        spendSpirit(p,'sapling');
        if(action.type==='saplingDraw'){p.cp--;drawCards(p,1,random,s.cardRoll?.id);}
        else {p.hp=bounded(p.hp+1,60);gainCP(p,1);}
      }
      const label=action.type==='saplingDraw'?'sapling':action.type==='dryadPrevent'?'dryad':action.type;
      s.log.unshift(`${heroNames(s)[seat]} spends ${statusLabel(label)}${action.type==='dryadPrevent'?` to prevent ${statusLabel(action.status)}`:''}.`);
      return s;
    }
    if(['smoke','evadeSide','ninjutsu'].includes(action.type)){
      if(!tokenChoices(previous,seat)[action.type])return previous;
      const s=structuredClone(previous),token=action.type==='evadeSide'?'evasive':action.type;
      removeStatus(s.players[seat],token);
      s.response=null;
      s.effectDie=roll();
      if(token==='ninjutsu'){
        s.ninjutsuReturnStage=s.stage;
        s.stage='ninjutsuRoll';
      } else {
        s.evasionReturnStage=s.stage;
        s.evasionSeat=seat;
        s.evasionToken=token;
        s.stage='evasion';
      }
      s.log.unshift(`${heroNames(s)[seat]} spends ${statusLabel(token)}.`);
      return s;
    }
    if(['crit','accuracy','protect','retribution'].includes(action.type)){
      if(!tokenChoices(previous,seat)[action.type])return previous;
      const s=structuredClone(previous),p=s.players[seat],hit=s.pending;
      s.response=null;
      removeStatus(p,action.type);
      if(action.type==='accuracy')hit.undefendable=true;
      if(action.type==='crit'){
        hit.damage+=4;
        if(hit.grossDamage!==undefined){hit.grossDamage+=4;updateDamage(hit);}
      }
      if(action.type==='retribution')hit.retribution=true;
      if(action.type==='protect'){
        if(s.stage==='upkeep')s.upkeepProtect=(s.upkeepProtect??0)+1;
        else if(s.stage==='sideDamage')s.sideDamage.protect=(s.sideDamage.protect??0)+1;
        else if(seat===s.active)hit.returnProtect=(hit.returnProtect??0)+1;
        else {hit.protect=(hit.protect??0)+1;updateDamage(hit);}
      }
      s.log.unshift(`${heroNames(s)[seat]} spends ${statusLabel(action.type)}.`);
      return s;
    }
    if(['useCleanse','boostChi','preventChi'].includes(action.type)){
      const options=tokenChoices(previous,seat);
      if(action.type==='useCleanse'){
        if(!options.cleanse.includes(action.status))return previous;
      } else {
        const max=action.type==='boostChi'?options.boost:options.prevent;
        if(!Number.isInteger(action.amount)||action.amount<1||action.amount>max)return previous;
      }
      const s=structuredClone(previous),p=s.players[seat],hit=s.pending;
      s.response=null;
      if(action.type==='useCleanse'){
        removeStatus(p,'cleanse');if(action.status==='timeBomb')blackWidow.removeBomb(p,action.index);else removeStatus(p,action.status,action.index);
        if(action.status==='bounty')removeBountyBonus(s,seat);
        if(action.status==='constrict'&&seat===s.active)delete s.wasConstricted;
        if(action.status==='decrepify'&&seat===s.active)delete s.wasDecrepified;
        if(action.status==='barbed'&&seat===s.active)s.vineAttempts=0;
        if(action.status==='targeted'&&hit?.targetBonus&&seat!==s.active&&s.stage!=='postHit'){
          hit.targetBonus=false;hit.grossDamage-=2;updateDamage(hit);
        }
        if(action.status==='prey')removePreyBonus(s,seat,0);
        s.log.unshift(`${heroNames(s)[seat]} cleanses ${statusLabel(action.status)}.`);
      } else {
        const n=action.amount;p.chi-=n;
        if(action.type==='boostChi'){
          if(hit.grossDamage===undefined)hit.chiBoost=(hit.chiBoost??0)+n;
          else {hit.grossDamage+=n;updateDamage(hit);}
        } else {
          p.chiFresh=Math.max(0,(p.chiFresh??0)-n);
          if(s.stage==='upkeep')s.upkeepPrevention=(s.upkeepPrevention??0)+n;
          else if(s.stage==='sideDamage')s.sideDamage.prevention=(s.sideDamage.prevention??0)+n;
          else if(seat===s.active)hit.returnPrevention=(hit.returnPrevention??0)+n;
          else {hit.prevention=(hit.prevention??0)+n;updateDamage(hit);}
        }
        s.log.unshift(`${heroNames(s)[seat]} spends ${n} Chi to ${action.type==='boostChi'?'increase attack damage':'prevent damage'}.`);
      }
      return s;
    }
    if(action.type==='playCard'){
      const player=action.seat ?? seat;
      if(!canPlayFromHand(previous,player))return previous;
      const choice=cardChoices(previous,player,action.id)[action.choice];
      if(!choice)return previous;
      const state=structuredClone(previous);
      state.response=null;
      playOneCard(state,player,action.id,choice,roll,random,message=>state.log.unshift(message));
      return flushPowderKegs(state);
    }
    if(action.type==='sell'){
      if(!isSelling(previous)||!previous.players[previous.active].hand.includes(action.id))return previous;
      const state=structuredClone(previous),p=state.players[state.active];
      p.hand.splice(p.hand.indexOf(action.id),1);p.discard.push(action.id);gainCP(p,1);
      state.log.unshift(`${heroNames(state)[state.active]} sells ${seatCard(state,state.active,action.id).name} for 1 CP.`);
      return state;
    }
    if(previous.response&&['evade','evadeReturn'].includes(action.type)&&legal(previous)[action.type]){
      return transitionCore({...previous,response:null},action,roll,random,true);
    }
    if(action.type==='passResponse'&&previous.response){
      const state=structuredClone(previous),deferred=state.response.action;
      state.response=null;
      return transitionCore(state,deferred,roll,random,true);
    }
    const responseActions=['begin','endMain','accept','resolveBlind','resolveEffect','resolveSunMarked','resolveChargedGem','resolveGuardBreak','resolveDisarm','rollPrey','resolvePrey','resolveTarget','resolveDefence','settle','resolveEvade','finishCardRoll','continueHit','defend','skipDefence','resolveUpkeep','resolveSeraphRoll','resolvePurify','resolveGunContest','resolveReload','resolveGrimRoll','resolveUndead','resolveBackStrike','chooseDuel','resolveMesmerize','resolveBleed','resolveNevermore','checkWound','resolveWound','checkRegenerate','activateNevermore','finishRavenAbility','resolveArtRoll','resolvePirateKeg','chooseMastery','payKnockdown','skipKnockdown','resolveSneak','chooseStolenCP','skipSneak','next','resolveNinjutsu','resolveSideDamage','jeanSwitch','checkPhoenixBurn','resolvePhoenixBurn','finishDeadpoolAbility','finishDeadpoolPrepared','finishDeadpoolResolved','finishSantaAbility','finishSantaPrepared','startSantaRoll','finishMysticAbility','finishMysticPrepared','finishMysticResolved','finishKrampusAbility','finishKrampusPrepared','finishKrampusResolved','finishAlchemistAbility','finishAlchemistPotions','finishWolverineAbility','finishWolverineResolved','finishStormAbility','finishStormResolved','finishRogueAbility','finishPsyAbility','finishParalyze','finishJeanAbility','finishJeanResolved','finishIcemanAbility','finishIcemanResolved','finishIcemanAfter','spendGlide','skipGlide','activateIcemanGlide','finishGambitAbility','finishCyclopsAbility','finishThorAbility','finishWidowAbility','finishSpiderAfter','spendCombo','skipCombo','end' ];
    if(!bypassResponse && action.type==='evade' && legal(previous).evade && hasResponse(previous,previous.active)){
      return {...previous,response:{seat:previous.active,action}};
    }
    const mesmerizeOffence=['roll','end'].includes(action.type)&&canMesmerize(previous,1-seat);
    if(!bypassResponse && previous.stage!=='nyraDamage' && legal(previous)[action.type] && (mesmerizeOffence||responseActions.includes(action.type)) && !(action.type==='finishAlchemistAbility'||action.type==='finishAlchemistPotions') &&
       (action.type!=='end'||vineDamage(previous)>0||mesmerizeOffence)&&!attackLocked(previous) && hasResponse(previous,1-seat)){
      return {...previous,response:{seat:1-seat,action}};
    }
  }
  const allowed = action.type==='spendDejaVu'?doctorStrange.canDeja(previous,previous.active):legal(previous)[action.type];
  if (!allowed || (action.type === 'declare' && !allowed.includes(action.ability)) ||
      (action.type === 'hold' && (iceman.locked(previous,previous.active,action.index)||!Number.isInteger(action.index) || action.index < 0 || action.index >= previous.dice.length))) return previous;
  const state = structuredClone(previous);
  psylocke.setState(state);
  const names=heroNames(state);
  const attacker = state.players[state.active], defender = state.players[1-state.active];
  const add = message => state.log.unshift(message);
  function applyNinjutsu(outcome){
    const p=state.pending;
    state.stage=state.ninjutsuReturnStage;
    if(outcome==='delayedPoison'){
      if(p.grossDamage===undefined)p.delayedPoison=(p.delayedPoison??0)+1;
      else grantAttackStatus(state,defender,'delayedPoison');
    } else if(outcome==='undefendable'){
      p.undefendable=true;
      if(state.stage==='defence')state.stage='damage';
      p.shadowSkippedDefence=false;
    } else {
      const damage=outcome==='one'?1:2;
      if(p.grossDamage===undefined)p.damage+=damage;
      else {p.grossDamage+=damage;updateDamage(p);}
    }
    add(`Ninjutsu rolls ${state.effectDie}: ${ninjutsuLabel(outcome)}.`);
    state.effectDie=null;
    state.ninjutsuReturnStage=null;
  }
  function consumeVine(){
    const damage=vineDamage(state);
    state.vinePaid=(state.vinePaid??0)+damage;
    if(attacker.barbed)removeStatus(attacker,'barbed');
    state.vineAttempts=0;
    return damage;
  }
  function finishRoll(attack=state.pending?.attack) {return psylocke.withoutAbility(state,()=>finishRollBody(attack));}
  function restartOffensiveRoll(attack) {
    finishRoll(attack);
    // Use the existing resume stage so saved side-damage responses remain valid.
    if (state.stage === 'sideDamage') state.sideDamage.resume = 'tacticalRestart';
    else startOffensiveRoll(state, roll);
  }
  function finishRollBody(attack) {
    if(psylocke.pauseEnd(state))return;
    const hit=state.pending;
    if(hit?.iceman?.transferAfter&&hit.icePrepared&&!hit.iceTransferredAfter){hit.iceTransferredAfter=true;iceman.begin(state,state.active,[{kind:'transfer'}],'iceAfter');return;}
    delete state.iceGlideTarget;
    iceman.clear(state);
    if(hit?.spiderSettled&&hit.webAfter&&!hit.spiderAfterWebDone){
      hit.spiderAfterWebDone=true;
      if(!hit.spiderWebBlocked&&!hit.dryadBlocked?.includes('webbed')&&psylocke.withAbility(state,()=>spiderMan.inflict(state,1-state.active,state.active,false))){state.stage='spiderAfter';return;}
    }
    if(attacker.paralyze)removeStatus(attacker,'paralyze');
    delete state.stormDice;
    delete state.realityDie;
    if(attacker.boundAbilities){attacker.boundAbilities=attacker.boundAbilities.filter(b=>!(state.spellboundExpires??[]).includes(b.id));loki.sync(attacker);}delete state.spellboundExpires;
    if(state.bandsTurn===state.turn){if(attacker.crimsonBands)removeStatus(attacker,'crimsonBands');delete state.bandsTurn;}
    if (state.wasEntangled ?? state.budget === 2) attacker.entangle = false;
    if(state.wasDecrepified){
      removeStatus(attacker,'decrepify');
      delete state.wasDecrepified;
    }
    if(state.wasConstricted){
      removeStatus(attacker,'constrict');
      delete state.wasConstricted;
    }
    if(state.offenceFlight)delete state.offenceFlight;
    if(state.bloodHealPlanned)delete state.bloodHealPlanned;
    state.stage = 'main';
    if(heroId(state,state.active)===headlessHorseman.id&&!state.pending?.horseDealtDamage){
      gainGrim(state,state.active,1);
      add('Headless Mayhem grants Grim Pursuit after a roll phase with no damage dealt.');
    }
    const damage=consumeVine();
    if(attacker.parlay)removeStatus(attacker,'parlay');
    if(defender.cursed&&!attack)grantPirateStatus(state,state.active,'powderKeg',true);
    if(state.rollPowderExplosions?.length){
      (state.powderExplosions??=[]).push(...state.rollPowderExplosions);
      state.rollPowderExplosions=[];
    }
    if(state.cards&&attack&&hit?.spiderSettled&&attacker.combo&&attacker.comboTurn!==state.turn&&attacker.hp&&defender.hp)state.stage='spiderCombo';
    if(iceman.path(state))state.stage='iceGlideOffer';
    if(hit?.santaExtra&&!hit.santaExtraDone&&attacker.hp&&defender.hp){hit.santaExtraDone=true;state.stage='santaExtraRoll';}
    if(damage)startSideDamage(state,state.active,damage,'Barbed Vine');
  }
  function gainMastery(p) {
    if(p.masteryCap)attacker.masteryCap=statusCap(attacker,'fireMastery')+p.masteryCap;
    if(p.mastery)grantStatus(attacker,'fireMastery',p.mastery);
    p.mastery=0;p.masteryCap=0;
  }
  function activate() {return psylocke.withAbility(state,()=>activateBody());}
  function activateBody() {
    if(psylocke.suppressed(state)){for(const key of negativeStatuses)if(!(key==='phoenixBurn'&&state.pending.phoenixBurnPassive))state.pending[key]=false;state.pending.stun=false;}
    const p = state.pending;
    if(!p.dryadChecked&&!p.ultimate&&!p.stun&&(!psylocke.suppressed(state)||p.phoenixBurnPassive)&&canSpendSpirit(defender,'dryad')&&
       (p.damage>0||p.masteryDamage*(attacker.fireMastery??0)>0||p.cyclops&&p.focusFire||p.gambit&&p.disruption||p.iceman&&p.diceCube)&&negativeStatuses.some(key=>key!=='hex'&&p[key])){
      state.stage='dryadResponse';
      return;
    }
    if(p.effect==='paleJaws'&&!p.jawsTargeted){
      p.jawsTargeted=true;
      p.jawsPrior=defender.prey??0;
      if(!p.dryadBlocked?.includes('prey')){
        if(p.jawsPrior===2&&!attacker.parlay)p.preyOverflow=1;
        else grantStatus(defender,'prey');
      }
      state.stage='effect';
      return;
    }
    for(const key of p.paladinGain??[])grantStatus(attacker,key);
    if (p.evasive) grantStatus(state.players[p.grantSeat??state.active],'evasive',p.evasive);
    if(p.chiGain)grantStatus(attacker,'chi',p.chiGain);
    if(p.cleanseGain)grantStatus(state.players[p.seraphTarget??state.active],'cleanse',p.cleanseGain);
    if(p.flightGain)grantStatus(state.players[p.seraphTarget??state.active],'flight',p.flightGain);
    if(p.holyGain)grantStatus(attacker,'holyPresence',p.holyGain);
    if(p.blessing)grantStatus(attacker,'blessing');
    gainMastery(p);
    if(p.masteryDamage)p.damage+=p.masteryDamage*(attacker.fireMastery??0);
    p.abilityDamage??=p.damage-(p.cyclopsModifiers??0)-(p.gambitModifiers??0)-(p.icemanModifiers??0)-(p.jeanModifiers??0)-(p.psyModifiers??0)-(p.rogueModifiers??0)-(p.stormModifiers??0)-(p.wolverineModifiers??0)-(p.alchemistModifiers??0)-(p.krampusModifiers??0)-(p.mysticModifiers??0)-(p.santaModifiers??0)-(p.deadpoolModifiers??0);
    p.damage+=p.chiBoost??0;
    p.attack=!p.nonAttack&&p.damage>0;
    if(p.attack&&!p.pure&&attacker.kineticEnergy!==undefined){
      p.kineticBonus=Math.floor(attacker.kineticEnergy/2);
      p.damage+=p.kineticBonus;
    }
    if(psylocke.suppressed(state))for(const key of negativeStatuses)if(!(key==='phoenixBurn'&&p.phoenixBurnPassive))p[key]=false;
    p.incomingStatus=negativeStatuses.filter(k=>p[k]&&!p.dryadBlocked?.includes(k));
    p.priorStatus=Object.fromEntries(p.incomingStatus.map(k=>[k,defender[k]||0]));
    if(p.krampusCoalApplied)p.priorStatus.coal=p.krampusCoalPrior;
    if(p.krampusCoalApplied&&p.dryadBlocked?.includes('coal'))defender.coal=Math.min(defender.coal??0,p.krampusCoalPrior??0);
    if(p.strangeBandsApplied)p.priorStatus.crimsonBands=p.strangeBandsPrior;
    if(p.scarletWarpApplied)p.priorStatus.realityWarp=p.scarletWarpPrior;
    if(p.scarletWarpApplied&&p.dryadBlocked?.includes('realityWarp')&&!p.scarletWarpPrior)removeStatus(defender,'realityWarp');
    if(p.strangeBandsApplied&&p.dryadBlocked?.includes('crimsonBands')&&!p.strangeBandsPrior)removeStatus(defender,'crimsonBands');
    if(p.timeBomb)p.priorBombIds=(defender.timeBombTimers??[]).map(b=>b.id);
    if(p.jawsTargeted&&p.incomingStatus.includes('prey'))p.priorStatus.prey=p.jawsPrior;
    for(const k of p.incomingStatus){
      if(k==='prey'&&p.jawsTargeted)continue;
      if(k==='prey'&&p.damage>0&&!p.pure&&!attacker.parlay&&defender.prey+p.prey>2)
        p.preyOverflow=p.prey;
      else if(k==='powderKeg')grantPirateStatus(state,1-state.active,k,true);
      else if(k==='coal'&&p.krampusCoalApplied)continue;
      else if(k==='crimsonBands'&&p.strangeBandsApplied)continue;
      else if(k==='realityWarp'&&p.scarletWarpApplied)continue;
      else if(k==='webbed'){if(!p.webAfter)spiderMan.inflict(state,1-state.active,state.active,!!(p.ultimate||p.stun));}
      else if(k==='timeBomb')blackWidow.inflict(state,1-state.active);
      else if(k==='phoenixBurn'&&p.phoenixBurnPassive)psylocke.withoutAbility(state,()=>grantStatus(defender,k));
      else grantStatus(defender,k,k==='delayedPoison'||k==='nanite'||k==='bleed'||k==='shame'||k==='prey'||k==='wound'||k==='focusFire'||k==='diceCube'||k==='influence'?p[k]:1);
    }
    if(p.advanceBombs==='after')blackWidow.advanceAll(state);
    if(p.pirateInflict)cursedPirate.inflictCoins(state,state.active,p.pirateInflict);
    if(p.artSynth)grantStatus(attacker,'synth',p.artSynth);
    if(p.resurrect)attacker.resurrect=true;
    if(p.freeUndead)attacker.undeadFreeTurn=state.turn;
    if(p.mesmerize)grantStatus(attacker,'mesmerize');
    if(p.dreadful)grantStatus(attacker,'dreadful',p.dreadful);
    if(p.headDraw&&headlessHorseman.haunted(state,state.active))drawCards(attacker,1,random);
    if(p.nyraBond)grantStatus(attacker,'nyraBond');
    if(p.nyraHeal)huntress.changeHealth(attacker,p.nyraHeal);
    if(p.attack&&!p.pure&&huntress.active(attacker)){
      p.damage+=2;
      add('Active Nyra adds 2 attack damage.');
    }
    if(p.backStrike)grantStatus(attacker,'backStrike');
    if(p.enterShadows)grantStatus(attacker,'shadows');
    if(p.sneak)grantStatus(attacker,'sneak');
    if(p.discardOpponent)discardRandom(defender,random);
    if(p.draw&&!p.afterShadows&&state.cards)drawCards(attacker,p.draw,random);
    if (p.cpLoss) {
      const loss=Math.min(defender.cp,p.cpLoss);
      defender.cp-=loss;
      add(`${names[1-state.active]} loses ${loss} CP.`);
    }
    if (p.attack && !p.pure && defender.targeted) {
      p.damage+=2;
      p.targetBonus=true;
      add('Targeted adds 2 attack damage.');
    }
    if(p.attack&&!p.pure&&defender.focusFire){p.focusBonus=defender.focusFire;p.damage+=p.focusBonus;}
    if(p.attack&&!p.pure&&defender.bounty){
      p.damage++;
      p.bountyBonus=true;
      gainCP(attacker,1);
      add(`${names[state.active]} gains 1 CP and +1 damage from Bounty.`);
    }
    if(p.attack&&!p.pure&&!p.ultimate&&attacker.decrepify)p.decrepReduction=1;
    if(p.attack&&!p.pure&&!p.ultimate&&attacker.wither)p.witherReduction=attacker.wither;
    if(p.attack&&attacker.shame){
      if(!p.pure&&!p.ultimate)p.shameReduction=attacker.shame;
      if(!p.ultimate)attacker.shame=0;
      else p.clearShameOnSettle=true;
      if(p.shameReduction)add(`Shame reduces ${names[state.active]}’s attack by ${p.shameReduction} damage.`);
    }
    const parlayBlocked=!!attacker.parlay;
    p.damage+=(p.collateral??0);
    if(parlayBlocked){p.damage=0;p.parlayBlocked=true;}
    if(state.cards){
      p.grossDamage=p.damage;
      if(p.decrepReduction||p.witherReduction||p.blindingHalf||p.shameReduction)updateDamage(p);
    }
    if (p.heal) {
      const health = attacker.hp;
      attacker.hp = bounded(attacker.hp + p.heal,60);
      add(`${names[state.active]} heals ${attacker.hp-health}.`);
    }
    spiderMan.convert(state);
    p.shadowSkippedDefence=shadowAvoids(state)&&p.attack&&!p.undefendable&&!p.pure&&!p.stun;
    if (p.damage||p.stun||p.attack&&(parlayBlocked||attacker.wither||p.shameReduction||p.decrepReduction)) state.stage = p.stun || p.ultimate ? 'locked' : p.undefendable||p.pure||!p.attack||p.shadowSkippedDefence||parlayBlocked ? 'damage' : 'defence';
    else finishRoll();
    if(state.cards&&p.attack&&!p.pure&&!p.parlayBlocked&&defender.prey){
      p.preyBonuses=[];
      p.preyResume=state.stage;
      state.stage='prey';
    }
    if(state.cards&&p.attack&&!p.ultimate&&!p.pure&&!p.undefendable&&!p.parlayBlocked&&attacker.guardBreak){
      p.guardResume=state.stage;
      state.stage='guardOffer';
    }
    if(p.grim)gainGrim(state,state.active,p.grim);
    if(p.tacticalCap){
      attacker.tacticalCap=statusCap(attacker,'tactical')+1;
      gainTactical(state,state.active,attacker.tacticalCap);
    } else if(p.tacticalGain)gainTactical(state,state.active,p.tacticalGain);
    if(p.honorGain&&!psylocke.block(state,attacker,'honor',p.honorGain)){
      if((attacker.honor??0)+p.honorGain>statusCap(attacker,'honor')&&honorChoices(state,state.active))
        state.honorOverflow={seat:state.active,amount:p.honorGain};
      else grantStatus(attacker,'honor',p.honorGain);
    }
    if(p.bloodGain)gainBloodPower(state,state.active,p.bloodGain);
    if(p.purify&&p.seraphTarget!==state.active&&!p.purifyDone){
      state.stage='purify';
    }
    if(p.freeBots&&artificer.freeChoices(state).length){
      p.freeResume=state.stage;
      state.stage='artFreeBots';
    }
    if(p.attack&&!p.pure&&!p.parlayBlocked&&defender.sunMarked){
      p.sunMarkedResume=state.stage;
      state.stage='sunMarked';
    }
  }
  function enterTargeting(p) {
    gainMastery(p);
    state.stage='targeting';
  }
  function gainTitheCP(p){
    if(!p.titheGain)return;
    p.titheGain=false;
    gainCP(attacker,1);
    add(`${names[state.active]} uses Tithe II to gain 1 CP.`);
  }
  function continueOffence(p) {return psylocke.withAbility(state,()=>continueOffenceBody(p));}
  function continueOffenceBody(p) {
    gainTitheCP(p);
    if(p.duelist?.steps&&!p.duelist.moved){
      p.duelist.moved=true;
      state.stage='duelAbility';
      duelist.offerSteps(state,state.active,p.duelist.steps);
      return;
    }
    if(p.druid&&!p.druid.ready){
      state.stage='druidReady';
      return;
    }
    if(heroId(state,state.active)===cursedPirate.id&&cursedPirate.prepareAbility(state,{bounded}))return;
    if(p.wellsSelf){grantStatus(attacker,'wellspring');p.wellsSelf=false;}
    if(p.grow){
      const amount=p.grow;
      p.grow=0;
      if(queueGrowth(state,state.active,amount,p.name,'offence'))return;
    }
    if(p.spiritDamage){p.damage+=spiritTotal(attacker);p.spiritDamage=false;}
    if(p.wellsTarget){state.stage='attackWells';return;}
    if(p.spiritCost&&spiritTotal(attacker)){state.stage='spiritPayment';return;}
    if(p.overgrowth){state.stage='overgrowthWells';return;}
    if(p.smoke)grantStatus(state.players[p.ninjaSeat??state.active],'smoke');
    p.smoke=false;
    if(p.monkRewards){
      state.monkChoice={seat:state.active,left:p.monkRewards,afterDefence:false};
      p.monkRewards=0;
      state.stage='monkChoice';
      return;
    }
    p.abilityDamage??=p.damage+(p.masteryDamage??0)*(attacker.fireMastery??0)-(p.cyclopsModifiers??0)-(p.gambitModifiers??0)-(p.icemanModifiers??0)-(p.jeanModifiers??0)-(p.psyModifiers??0)-(p.rogueModifiers??0)-(p.stormModifiers??0)-(p.wolverineModifiers??0)-(p.alchemistModifiers??0)-(p.krampusModifiers??0)-(p.mysticModifiers??0)-(p.santaModifiers??0)-(p.deadpoolModifiers??0);
    const attackExpected=!p.nonAttack&&(p.damage>0||p.masteryDamage>0);
    if(p.ninjaTokens&&psylocke.block(state,state.players[p.ninjaSeat??state.active],'ninjutsu',p.ninjaTokens))p.ninjaTokens=0;
    if(p.ninjaTokens){
      const recipient=state.players[p.ninjaSeat??state.active];
      if(attackExpected&&recipient===attacker&&(recipient.ninjutsu??0)+p.ninjaTokens>3){
        state.stage='ninjaGain';
        return;
      }
      grantStatus(recipient,'ninjutsu',p.ninjaTokens);
      p.ninjaTokens=0;
    }
    if(state.cards&&attacker.sneak&&attackExpected&&!p.pure)state.stage='sneakOffer';
    else if(state.cards&&!p.stun&&!p.ultimate&&!p.showdownTargeted&&!p.jawsTargeted&&!p.mysticTargeted&&!p.santaTargeted&&(p.damage||p.burn||p.knockdown||p.collateral||p.poison||p.delayedPoison||p.barbed||p.powderKeg||p.wither||p.parlay||p.pirateInflict||p.nanite||p.blindingLight||p.bleed||p.bounty||p.shame||p.constrict||p.decrepify||p.prey||p.hex||p.wound||p.disarm||p.sunMarked||p.timeBomb||p.crimsonBands||p.realityWarp||p.webbed||p.focusFire||p.disruption||p.diceCube))enterTargeting(p);
    else activate();
  }
  function resolveAbility() {return psylocke.withAbility(state,()=>resolveAbilityBody());}
  function resolveAbilityBody() {
    const p=state.pending;
    if(deadpool.ability(state))return;
    if(santa.ability(state))return;
    if(mysticBrawler.ability(state))return;
    if(krampus.ability(state))return;
    if(alchemist.ability(state))return;
    if(wolverine.ability(state))return;
    if(storm.ability(state))return;
    if(rogue.ability(state))return;
    if(psylocke.ability(state))return;
    if(jeanGrey.ability(state))return;
    if(iceman.ability(state))return;
    if(gambit.ability(state))return;
    if(cyclops.ability(state))return;
    if(thor.ability(state))return;
    if(p.spider&&!p.spiderPrepared){p.spiderPrepared=true;if(p.spider.invisibility)grantStatus(attacker,'invisibility');if(p.spider.combo)grantStatus(attacker,'combo');}
    if(p.scarlet&&!p.scarletPrepared){
      p.scarletPrepared=true;
      if(p.scarlet.probability)grantStatus(attacker,'probabilityManipulation',p.scarlet.probability);
      if(p.scarlet.crackle)grantStatus(attacker,'crackle',p.scarlet.crackle);
      if(p.scarlet.conjure)grantStatus(attacker,'conjure');
      if(p.scarlet.steal&&stealNecroHealth(state,state.active,p.scarlet.steal))return;
    }
    if(p.loki&&loki.ability(state,random))return;
    if(p.strange&&!p.strangePrepared){
      p.strangePrepared=true;
      if(p.strange.deja)grantStatus(attacker,'dejaVu');
      if(p.strange.premonition)grantStatus(attacker,'premonition',p.strange.premonition);
      if(p.draw){drawCards(attacker,p.draw,random);p.draw=0;}
      const queue=[];
      if(p.strange.ultimate)queue.push({kind:'prepare',zone:'peek',left:2,optional:true},{kind:'order'},{kind:'cast',zone:'book',left:2,optional:true});
      else {if(p.strange.prepare)queue.push({kind:'prepare',zone:'discard',left:1});if(p.strange.cast)queue.push({kind:'cast',zone:'book',left:p.strange.cast,optional:p.strange.cast>1});}
      if(queue.length){
        if(p.crimsonBands)doctorStrange.earlyBands(state);
        doctorStrange.begin(state,state.active,queue,'strangeAbility');
        if(p.strange.ultimate)state.strangeTask.peek=attacker.deck.splice(-5).reverse();
        return;
      }
    }
    if(p.marvel&&!p.marvelPrepared){
      p.marvelPrepared=true;
      if(p.marvel.radiance)grantStatus(attacker,'radiance',p.marvel.radiance);
      if(p.marvel.flare)grantStatus(attacker,'cosmicFlare',p.marvel.flare);
      if(p.marvel.ray)captainMarvel.gainRay(state,state.active,p.marvel.ray,p.marvel.ready);
    }
    if(p.widow&&!p.widowPrepared){
      p.widowPrepared=true;
      const n=blackWidow.count(attacker);
      if(p.thresholdDamage&&n>=3)p.damage=p.thresholdDamage;
      if(p.grappleCP&&n>=2)p.cpGain=1;
      if(p.agility)grantStatus(attacker,'agility',p.agility);
      if(p.covertOps)grantStatus(attacker,'covertOps',p.covertOps);
      if(p.advanceBombs==='before')blackWidow.advanceAll(state);
      if(p.searchUpgrades){
        state.stage='widowAbility';
        blackWidow.task(state,state.active,'search',blackWidow.upgradeChoices(state,state.active),{left:p.searchUpgrades,passiveAtStart:!!attacker.upgrades['Red Room Training']});
        return;
      }
    }
    if(p.sunElf){
      if(p.sunElf.gain)sunElf.increase(attacker,p.sunElf.gain);
      if(p.sunElf.gem)grantStatus(attacker,'chargedGem');
      if(p.sunElf.choice){state.stage='sunBurstChoice';return;}
    }
    if(p.pale){
      const {shards,transform,shardDamage,shardHeal,skipShardLoss}=p.pale;
      if(shards)paleLady.gain(attacker,shards);
      if(transform){
        attacker.werewolf=true;
        paleLady.gain(attacker);
      }
      if(skipShardLoss)attacker.keepMoonShard=true;
      if(shardDamage&&p.effect!=='paleJaws')p.damage+=shardDamage*attacker.moonShard;
      if(shardHeal)p.heal+=attacker.moonShard;
    }
    if(p.druid){
      const {shifts,regenerate,rainfall}=p.druid;
      druid.gainShifts(state,state.active,shifts);
      if(regenerate)druid.regenerate(attacker,regenerate);
      if(rainfall){state.stage='druidRainfall';return;}
    }
    if(p.panther){
      if(p.panther.suit)grantStatus(attacker,'vibraniumSuit');
      if(p.panther.kinetic)blackPanther.gain(attacker,p.panther.kinetic);
      if(attacker.kineticBursts){state.stage='pantherAbility';return;}
    }
    if(p.forgemaster){
      if(p.forgemaster.armorBonus&&attacker.armor.helm&&attacker.armor.shield)p.damage+=2;
      if(p.forgemaster.mineAll){
        state.stage='forgeAbility';
        forgemaster.beginMine(state,state.active,true);
        return;
      }
      if(p.forgemaster.oreSearch){
        if(attacker.deck.some(forgemaster.oreType)){state.stage='forgeSearch';return;}
        attacker.deck=shuffle(attacker.deck,random);
      }
    }
    if(p.duelist?.guardGain)grantStatus(attacker,'guardBreak',p.duelist.guardGain);
    if(p.raven){
      if(p.raven.cap)attacker.featherCap+=p.raven.cap;
      if(p.draw){drawCards(attacker,p.draw,random);p.draw=0;}
      raveness.feathers(state,state.active,p.raven.feathers);
      if(p.raven.activations){
        state.stage='ravenAbility';
        raveness.activate(state,state.active,p.raven.activations);
        return;
      }
    }
    if(p.cpGain)gainCP(attacker,p.cpGain);
    if(p.cpDamage)p.damage+=Math.ceil(attacker.cp*p.cpDamage);
    if(p.corpses)necromancer.gain(attacker,p.corpses);
    if(p.harvest){
      necromancer.gain(attacker,1);
      p.effect='necroHarvest';p.effectCount=1;
    }
    if(p.shroud||p.explosion||p.reanimate){state.stage='necroChoice';return;}
    if(p.spectral){
      grantStatus(attacker,'dreadful');
      p.effectCount=Math.min(5,attacker.dreadful);
    }
    if(p.horrify){
      if(!headlessHorseman.haunted(state,state.active)){state.stage='horrifyChoice';return;}
      p.dreadful=3;
      p.grim=1;
    }
    if(p.showdown||p.effect==='paleJaws')enterTargeting(p);
    else if(p.search&&state.cards&&attacker.deck.length)state.stage='vampireSearch';
    else if(p.possessChoice||p.bloodMagic&&attacker.mesmerize&&!state.offenceFlight)state.stage='vampireChoice';
    else if(p.purify||p.flightTarget)state.stage='seraphTarget';
    else if(p.scratchBuilt&&artificer.buildChoices(attacker).length)state.stage='artBuild';
    else if(p.effect==='spanner'&&attacker.synth)state.stage='artSpanner';
    else if (p.effect){
      state.stage='effect';
      if(p.profiteer)gainTactical(state,state.active,p.profiteer[0]);
    }
    else if(p.combustRate){
      grantStatus(attacker,'fireMastery',p.mastery);p.mastery=0;
      state.stage='combustion';
    }
    else if(p.pickLimit&&defender.cp)state.stage='pickpocket';
    else if (p.ninjaTarget || p.retributionTarget || p.grantEvasive || p.cleanse && statusKeys.some(k=>attacker[k])) {
      gainTitheCP(p);
      state.stage='choice';
    }
    else continueOffence(p);
  }
  function checkBlindingLight(){
    if(attacker.blindingLight&&!state.pending.ultimate){
      removeStatus(attacker,'blindingLight');
      startSeraphRoll(state,state.active,'blinding',1,roll);
      return;
    }
    if(attacker.blindingLight)state.pending.spendBlindingOnSettle=true;
    resolveAbility();
  }
  function failOffence(){
    const hit=state.pending;
    const wouldAttack=hit.damage>0||hit.cpDamage||hit.combustRate||hit.spiritDamage||
      hit.masteryDamage||['exploding','overpower','tempest','shadowDance','spanner','pirateBooty','walkLine','deathBlossom','druidMaul'].includes(hit.effect);
    state.pending=null;
    finishRoll(Boolean(wouldAttack)&&!defender.cursed);
  }
  function addOverflowPrey(p){
    if(p.preyOverflow){
      grantStatus(defender,'prey',p.preyOverflow);
      delete p.preyOverflow;
    }
  }
  function finishNevermore(task){
    if(task.left)return;
    state.ravenActivation=task.parent;
    state.stage=task.resume;
    if(task.after==='featherSpent')state.ravenFeathers.spending=false;
    if(task.after==='nevermoreAttack'){
      state.ravenAttackChoice={owner:task.owner,resume:task.resume};
      state.stage='ravenAttackChoice';
    }
  }
  function completeGrowth(){
    const g=state.growth;
    state.growth=null;
    state.stage=g.resume;
    if(g.after==='offence')continueOffence(state.pending);
    else if(g.after==='upkeep')finishUpkeep(state,roll,random);
    else if(g.collateral)startSideDamage(state,1-g.seat,g.collateral,g.source);
  }
  switch (action.type) {
    case 'finishPantherAbility':
      continueOffence(state.pending);
      break;
    case 'sunBurstChoice':
      psylocke.useAbility(state);
      if(!['gem','mark'].includes(action.status))return previous;
      if(action.status==='gem')grantStatus(attacker,'chargedGem');
      else state.pending.sunMarked=true;
      continueOffence(state.pending);
      break;
    case 'resolveSunMarked':
      if(defender.sunMarked){
        sunElf.heal(attacker,2);
        add('Sun Marked heals the attacker for up to 2.');
      }
      state.stage=state.pending.sunMarkedResume;
      break;
    case 'resolveChargedGem': {
      const {dice,resume}=state.sunGemRoll, face=dieValue(dice[0],attacker);
      state.stage=resume;
      delete state.sunGemRoll;
      if([1,2,5,6].includes(face))gainCP(attacker,1);
      if(face>=3)startSideDamage(state,1-state.active,2,'Charged Gem');
      add(`Charged Gem rolls ${face||'a blank'}.`);
      break;
    }
    case 'forgeUpkeep':
      if(!['mine','skip'].includes(action.status))return previous;
      state.minesChecked=true;
      if(action.status==='mine')forgemaster.beginMine(state,state.active);
      break;
    case 'forgeMineChoice': {
      const task=state.forgeTask, miner=state.players[task.seat];
      let revealed;
      if(action.status==='none'){revealed=[];gainCP(miner,1);}
      else if(action.status==='all'&&task.all&&task.cards.some(forgemaster.oreType))revealed=task.cards.filter(forgemaster.oreType);
      else if(action.status==='one'&&task.cards.includes(action.id)&&forgemaster.oreType(action.id))revealed=[action.id];
      else return previous;
      miner.deck.length-=task.cards.length;
      miner.forgeOre.push(...revealed);
      task.cards=task.cards.filter(id=>!revealed.includes(id));
      add(`${names[task.seat]} ${revealed.length?`mines ${revealed.map(id=>seatCard(state,task.seat,id).name).join(', ')}`:'reveals no Ore and gains 1 CP'}.`);
      if(task.cards.length>1)state.stage='forgeOrder';
      else {
        miner.deck.unshift(...task.cards);
        state.stage=task.resume;
        delete state.forgeTask;
      }
      break;
    }
    case 'forgeOrder': {
      const task=state.forgeTask, index=task.cards.indexOf(action.id);
      if(index<0)return previous;
      task.cards.splice(index,1);
      state.players[task.seat].deck.unshift(action.id);
      if(task.cards.length<=1){
        state.players[task.seat].deck.unshift(...task.cards);
        state.stage=task.resume;
        delete state.forgeTask;
      }
      break;
    }
    case 'forgeSearch': {
      const index=attacker.deck.indexOf(action.id);
      if(index<0||!forgemaster.oreType(action.id))return previous;
      attacker.forgeOre.push(attacker.deck.splice(index,1)[0]);
      attacker.deck=shuffle(attacker.deck,random);
      add(`Final Touches puts ${seatCard(state,state.active,action.id).name} on the Forge.`);
      continueOffence(state.pending);
      break;
    }
    case 'finishForgeAbility':
      continueOffence(state.pending);
      break;
    case 'forgeMasterwork': {
      const hit=state.pending;
      const slots=Object.keys(defender.armor).filter(slot=>defender.armor[slot]);
      const choice=forgemaster.selections(slots,hit.armorDoubleLimit===2,hit.armorDoubleLimit===2)[action.choice];
      if(!choice)return previous;
      hit.doubledArmor=choice.slots;
      state.stage='damage';
      break;
    }
    case 'forgeArmor': {
      const hit=state.pending, choice=forgemaster.selections(forgemaster.eligibleArmor(state),true)[action.choice];
      if(!choice)return previous;
      const mult=slot=>hit.doubledArmor?.includes(slot)?2:1;
      if(choice.slots.includes('helm'))hit.returnDamage+=defender.armor.helm*mult('helm');
      if(choice.slots.includes('shield'))hit.prevention=(hit.prevention??0)+Math.min(2,defender.armor.shield)*mult('shield');
      hit.armorResolved=true;
      updateDamage(hit);
      state.stage=hit.armorResume;
      break;
    }
    case 'duelMove': {
      const task=state.duelMovement, player=state.players[task.seat];
      const choice=duelist.steps(player,task.max)[action.choice];
      if(!choice)return previous;
      duelist.move(player,choice.steps);
      state.stage=task.resume;
      delete state.duelMovement;
      if(choice.steps)add(`${names[task.seat]} · ${choice.label}.`);
      break;
    }
    case 'finishDuelAbility':
      continueOffence(state.pending);
      break;
    case 'reposition': {
      const choice=duelist.steps(attacker,2,1)[action.choice];
      if(!choice)return previous;
      duelist.move(attacker,choice.steps);
      if(choice.steps<0)grantStatus(attacker,'guardBreak');
      state.repositioned=true;
      add(`Reposition · ${choice.label}.`);
      break;
    }
    case 'resolveDisarm': {
      if(action.status==='discard'){
        const index=attacker.hand.indexOf(action.id);
        if(index<0)return previous;
        attacker.hand.splice(index,1);
        attacker.discard.push(action.id);
        add(`${names[state.active]} discards ${seatCard(state,state.active,action.id).name} for Disarm.`);
      } else if(action.status==='skip')state.disarmSkip=true;
      else return previous;
      removeStatus(attacker,'disarm');
      break;
    }
    case 'spendGuardBreak':
      removeStatus(attacker,'guardBreak');
      state.guardBreakRoll=[roll()];
      state.stage='guardBreakRoll';
      break;
    case 'skipGuardBreak':
      state.stage=state.pending.guardResume;
      break;
    case 'resolveGuardBreak': {
      const face=dieValue(state.guardBreakRoll[0],attacker), hit=state.pending;
      delete state.guardBreakRoll;
      if(face===4||face===5){
        hit.undefendable=true;
        hit.shadowSkippedDefence=false;
        if(hit.guardResume==='prey')hit.preyResume='damage';
        state.stage=hit.guardResume==='defence'?'damage':hit.guardResume;
        add('Guard Break makes the attack undefendable.');
      } else state.stage=attacker.guardBreak?'guardOffer':hit.guardResume;
      break;
    }
    case 'collectShapeShift': {
      const {seat,amount}=state.shapeOverflow;
      const p=state.players[seat];
      p.shapeShift=Math.min(2,p.shapeShift+amount);
      delete state.shapeOverflow;
      break;
    }
    case 'finishDruidAbility': {
      const p=state.pending;
      p.druid.ready=true;
      if(p.druid.wildDraw&&attacker.druidForm==='druid')drawCards(attacker,1,random);
      if(attacker.druidForm==='cat'&&p.damage>0&&!p.pure&&!attacker.parlay){
        p.damage+=2;p.wound=(p.wound??0)+1;
        add('Cat Form adds 2 damage and inflicts Wound.');
      }
      continueOffence(p);
      break;
    }
    case 'druidRainfall': {
      if(![0,1].includes(action.target))return previous;
      const target=state.players[action.target];
      gainCP(target,1);
      druid.regenerate(target,2);
      finishRoll(false);
      break;
    }
    case 'checkRegenerate': {
      const two=attacker.regenerate??0, one=attacker.regenerate1??0;
      druid.heal(attacker,2*two+one);
      attacker.regenerate=0;
      attacker.regenerate1=two;
      state.regenerateChecked=true;
      add(`Regenerate heals up to ${2*two+one} Health.`);
      break;
    }
    case 'checkWound':
      state.woundsAtStart??=attacker.wound;
      state.woundsResolved=(state.woundsResolved??0)+1;
      startSideDamage(state,state.active,1,'Wound',false,{woundCheck:true});
      break;
    case 'resolveWound': {
      const face=dieValue(state.woundRoll[0],attacker);
      delete state.woundRoll;
      state.stage='upkeep';
      if(face>=4&&attacker.wound){
        removeStatus(attacker,'wound');
        state.woundsRemoved=(state.woundsRemoved??0)+1;
      }
      add(`Wound rolls ${face||'a blank'}.`);
      break;
    }
    case 'collectFeathers': {
      const {seat,amount}=state.ravenFeathers, p=state.players[seat];
      delete state.ravenFeathers;
      grantStatus(p,'feather',amount);
      break;
    }
    case 'rollNevermore':
      state.nevermoreChecked=true;
      state.nevermoreRoll={owner:nevermoreOwner(state),target:state.active,dice:[roll()]};
      state.stage='ravenNevermoreRoll';
      break;
    case 'resolveNevermore': {
      const {owner,dice}=state.nevermoreRoll, p=state.players[owner], face=dieValue(dice[0],attacker);
      delete state.nevermoreRoll;
      state.stage='upkeep';
      add(`Nevermore rolls ${face||'a blank'}.`);
      if(face===1)grantStatus(attacker,'hex');
      if(face===2||face===3)raveness.activate(state,owner,4-face);
      if(face===4&&attacker.hand.length)state.stage='ravenDiscard';
      if(face===5){attacker.cp=Math.max(0,attacker.cp-1);gainCP(p,1);}
      if(face===6){p.nevermoreVitality=0;raveness.move(state,owner,owner);}
      break;
    }
    case 'ravenDiscard': {
      const id=action.id, index=attacker.hand.indexOf(id);
      if(index<0)return previous;
      attacker.hand.splice(index,1);
      attacker.discard.push(id);
      add(`${names[state.active]} discards ${seatCard(state,state.active,id).name} for Nevermore.`);
      state.stage='upkeep';
      break;
    }
    case 'activateNevermore': {
      const task=state.ravenActivation, {owner}=task, p=state.players[owner], target=p.nevermoreSeat;
      if(action.status==='absorb'){
        if(owner===target)return previous;
        p.nevermoreVitality=Math.min(3,p.nevermoreVitality+1);
        startSideDamage(state,target,1,'Absorb Vitality',false,{keepPending:true,ravenActivation:true});
      } else if(action.status==='move'){
        if(![0,1].includes(action.target)||target===action.target)return previous;
        raveness.move(state,owner,action.target);
      } else if(action.status!=='skip')return previous;
      task.left--;
      if(state.stage!=='sideDamage')finishNevermore(task);
      break;
    }
    case 'ravenAttackChoice': {
      const {owner,resume}=state.ravenAttackChoice, target=state.players[owner].nevermoreSeat;
      if(!['heal','damage'].includes(action.status))return previous;
      delete state.ravenAttackChoice;
      state.stage=resume;
      if(action.status==='heal')state.players[target].hp=bounded(state.players[target].hp+2,60);
      else startSideDamage(state,target,2,'Nevermore Attack!',false,{keepPending:true});
      break;
    }
    case 'finishRavenAbility':
      continueOffence(state.pending);
      break;
    case 'growSpirit': {
      const g=state.growth,p=state.players[g.seat],key=action.status;
      if(!growthChoices(state).includes(key))return previous;
      const index=spiritTypes.indexOf(key);
      if(index){
        const from=spiritTypes[index-1];
        p[from]--;
        if(g.original)g.original[from]--;
      }
      p[key]=(p[key]??0)+1;
      add(`${names[g.seat]} grows a ${statusLabel(key)}.`);
      if(--g.left===0||!growthChoices(state).length)completeGrowth();
      break;
    }
    case 'finishGrowth': completeGrowth();break;
    case 'acceptStatuses':
      state.pending.dryadChecked=true;
      activate();
      break;
    case 'paySpirits': {
      const p=state.pending;
      const choice=spiritDiscards(attacker,p.spiritCost)[action.choice];
      if(!choice)return previous;
      const discarded=discardSpirits(attacker,choice);
      if(p.overgrowth)p.damage+=discarded*4;
      else if(discarded)p.barbed=true;
      p.spiritCost=0;
      p.abilityDamage=p.damage;
      continueOffence(p);
      break;
    }
    case 'finishOvergrowth': {
      if(action.choice!==0&&action.choice!==1)return previous;
      if(action.choice===1){
        if(!attacker.wellspring)return previous;
        removeStatus(attacker,'wellspring');
        state.pending.undefendable=true;
      }
      state.pending.overgrowth=false;
      continueOffence(state.pending);
      break;
    }
    case 'chooseWells':
      if(state.stage!=='defenceWells')psylocke.useAbility(state);
      if(![0,1].includes(action.target))return previous;
      grantStatus(state.players[action.target],'wellspring');
      if(state.stage==='defenceWells')state.stage='damage';
      else {
        state.pending.wellsTarget=false;
        continueOffence(state.pending);
      }
      break;
    case 'harvestWells':
      if(![0,1,2,3].includes(action.choice))return previous;
      for(const i of [0,1])if(action.choice&(1<<i))grantStatus(state.players[i],'wellspring');
      state.stage=state.harvestResume;
      state.harvestResume=null;
      break;
    case 'choosePaladinReward':
      psylocke.useAbility(state);
      if(!['crit','accuracy'].includes(action.status))return previous;
      grantStatus(attacker,action.status);
      finishRoll();break;
    case 'chooseMonkReward': {
      if(!state.monkChoice?.afterDefence)psylocke.useAbility(state);
      const choice=state.monkChoice;
      if(!choice||!['evasive','cleanse'].includes(action.status))return previous;
      grantStatus(state.players[choice.seat],action.status);
      if(--choice.left===0){
        state.monkChoice=null;
        if(choice.afterDefence)state.stage='damage';
        else continueOffence(state.pending);
      }
      break;
    }
    case 'chooseStolenCP': {
      const amount=action.amount;
      if(!Number.isInteger(amount)||amount<0||amount>Math.min(state.pending.pickLimit,defender.cp))return previous;
      defender.cp-=amount;
      if(amount)add(`${names[1-state.active]} loses ${amount} CP to Pickpocket.`);
      activate();break;
    }
    case 'spendSneak':
      removeStatus(attacker,'sneak');
      state.effectDie=roll();state.stage='sneakRoll';
      if(state.pending.ultimate){
        state.pending.damage+=dieValue(state.effectDie,attacker);state.effectDie=null;activate();
      }
      break;
    case 'resolveSneak':
      state.pending.damage+=dieValue(state.effectDie,attacker);
      state.effectDie=null;
      enterTargeting(state.pending);
      break;
    case 'skipSneak':
      if(state.pending.ultimate||state.pending.stun)activate();
      else enterTargeting(state.pending);
      break;
    case 'payKnockdown': attacker.cp-=2;attacker.knockdown=false;startOffensiveRoll(state,roll);break;
    case 'skipKnockdown':
      attacker.knockdown=false;
      delete state.iceGlideTarget;
      state.stage='main';
      add(`${names[state.active]} skips the Offensive Roll Phase due to Knockdown.`);
      break;
    case 'collectSynth':
      artificer.upkeep(state).collected=true;
      if(attacker.upgrades?.['Scrap Collector'])startArtRoll(state,state.active,'scrap',1,roll);
      else {grantStatus(attacker,'synth'); add(`${names[state.active]} gains 1 Synth from Scrap Collector.`);}
      break;
    case 'clearNanites':
      artificer.upkeep(state).cleared=true;
      startArtRoll(state,state.active,'nanites',attacker.nanite,roll);
      break;
    case 'resolveArtRoll': {
      const result=state.artRoll, player=state.players[result.seat];
      state.artRoll=null;
      state.stage=result.resume;
      const dice=effectiveDice(result.dice,player), counts=tally(dice,heroId(state,result.seat));
      if(result.kind==='scrap'){
        const amount=!dice[0]?0:counts.Wrench?1:2;
        grantStatus(player,'synth',amount);
        add(`Scrap Collector II rolls ${result.dice[0]} and grants ${amount} Synth.`);
      } else if(result.kind==='nanites'){
        const removed=Math.min(player.nanite??0,dice.filter(value=>value===6).length);
        if(removed)player.nanite-=removed;
        add(`${names[result.seat]} rolls ${result.dice.join(', ')} and clears ${removed} Nanite${removed===1?'':'s'}.`);
      } else {
        const healing=!dice[0]?0:counts.Wrench?1:2;
        const health=player.hp;
        player.hp=bounded(health+healing,60);
        add(`Heal Bot rolls ${result.dice[0]} and heals ${player.hp-health}.`);
      }
      break;
    }
    case 'chooseSpanner':
      if(![0,1].includes(action.choice)||action.choice===1&&!attacker.synth)return previous;
      if(action.choice===1){attacker.synth--;state.pending.effectCount=3;}
      state.stage='effect';
      break;
    case 'scratchBuild':
      if(!artificer.buildChoices(attacker).includes(action.status))return previous;
      (attacker.bots??={})[action.status]=2;
      add(`${names[state.active]} assembles an Advanced ${artificer.bots[action.status]}.`);
      continueOffence(state.pending);
      break;
    case 'chooseFreeBot': {
      const p=state.pending, bot=action.status;
      if(bot==='done'){
        if(p.freeRequired)return previous;
        state.stage=p.freeResume;
        p.freeBots=0;
        break;
      }
      if(!p.freeBots||!artificer.freeChoices(state).includes(bot))return previous;
      (p.freeUsed??=[]).push(bot);
      p.freeBots--;
      add(`${names[state.active]} activates ${artificer.bots[bot]} for free.`);
      if(bot==='shockbot'){
        attacker.shockTurn=state.turn;
        p.grossDamage+=3;
        updateDamage(p);
      } else if(bot==='nanobot'){
        const damage=artificer.detonate(state);
        p.grossDamage+=damage[1-state.active];
        p.artSelfDamage=(p.artSelfDamage??0)+damage[state.active];
        updateDamage(p);
      }
      if(!p.freeBots||!artificer.freeChoices(state).length){
        p.freeBots=0;
        state.stage=p.freeResume;
      }
      if(bot==='healbot'){
        if(p.ultimate){
          const die=dieValue(roll(),attacker),healing=!die?0:die<=3?1:2;
          const health=attacker.hp;
          attacker.hp=bounded(health+healing,60);
          add(`Heal Bot rolls ${die} and heals ${attacker.hp-health}.`);
        } else startArtRoll(state,state.active,'freeHeal',1,roll);
      }
      break;
    }
    case 'resolvePirateChoice': {
      if(!cursedPirate.choices(state)[action.choice])return previous;
      const after=cursedPirate.resolveChoice(state,action.choice,{roll,bounded,grantPirateStatus,rollContext,releaseChangedAnnouncement,add});
      if(after==='offence')continueOffence(state.pending);
      if(after==='damage')state.stage='damage';
      if(after==='finishRoll')finishRoll();
      break;
    }
    case 'resolvePirateKeg': {
      const die=dieValue(state.effectDie,attacker);
      state.effectDie=null;
      state.stage='upkeep';
      if(!attacker.powderKeg)break;
      if(die>0&&die<=2){
        attacker.powderKeg=false;
        startSideDamage(state,state.active,3,'Powder Keg');
      } else if(die===6)cursedPirate.choose(state,state.active,'passKeg');
      break;
    }
    case 'collectTactical': {
      const {seat,amount}=state.tacticalOverflow;
      delete state.tacticalOverflow;
      grantStatus(state.players[seat],'tactical',amount);
      break;
    }
    case 'resolveTacticalRemoval': {
      const {seat}=state.tacticalRemoval;
      delete state.tacticalRemoval;
      removeStatus(state.players[seat],'tactical');
      break;
    }
    case 'restartTacticalOffence':
      startOffensiveRoll(state,roll);
      break;
    case 'collectHonor': {
      const {seat,amount}=state.honorOverflow;
      delete state.honorOverflow;
      grantStatus(state.players[seat],'honor',amount);
      break;
    }
    case 'resolveBackStrike': {
      const {seat,dice,resume}=state.samuraiRoll, damage=Math.ceil(dieValue(dice[0],state.players[seat])/2);
      state.pending.backStrikeDamage=(state.pending.backStrikeDamage??0)+damage;
      state.stage=resume;
      delete state.samuraiRoll;
      add(`${names[seat]} rolls ${dice[0]} and deals ${damage} Back Strike damage.`);
      break;
    }
    case 'collectBloodPower': {
      const {seat,amount}=state.bloodOverflow;
      delete state.bloodOverflow;
      grantStatus(state.players[seat],'bloodPower',amount);
      break;
    }
    case 'searchVampireDeck': {
      const id=action.id;
      if(!attacker.deck.includes(id))return previous;
      attacker.deck=shuffle(attacker.deck.filter(card=>card!==id),random);
      attacker.hand.push(id);
      add(`${names[state.active]} takes ${seatCard(state,state.active,id).name} from the deck and shuffles it.`);
      continueOffence(state.pending);
      break;
    }
    case 'chooseVampireBenefit': {
      const hit=state.pending;
      if(hit.possessChoice){
        if(![0,1].includes(action.choice))return previous;
        if(action.choice===0)hit.bleed=1;
        else hit.mesmerize=true;
      } else if(action.choice===1&&attacker.mesmerize){
        removeStatus(attacker,'mesmerize');
        hit.undefendable=true;
      } else if(action.choice!==0)return previous;
      continueOffence(hit);
      break;
    }
    case 'resolveMesmerize': {
      const result=state.mesmerizeRoll, value=dieValue(result.dice[0],state.players[result.seat]);
      add(`Mesmerize rolls ${value}.`);
      if(value>=5)result.choosing=true;
      else {
        state.stage=result.resume;
        delete state.mesmerizeRoll;
      }
      break;
    }
    case 'rerollMesmerized': {
      const result=state.mesmerizeRoll;
      state.stage=result.resume;
      delete state.mesmerizeRoll;
      const index=action.index;
      if(index===-1)break;
      const context=rollContext(state);
      if(!context||!Number.isInteger(index)||!context.dice[index]||dieOwner(context,index)===result.seat)return previous;
      const before=context.dice.slice();
      context.dice[index]=roll();
      if(context.scalar)state.effectDie=context.dice[0];
      releaseChangedAnnouncement(state,context,before);
      add(`Mesmerize rerolls die ${index+1} to ${context.dice[index]}.`);
      break;
    }
    case 'resolveBleed': {
      const dice=effectiveDice(state.bleedRoll,attacker);
      delete state.bleedRoll;
      const removed=Math.min(attacker.bleed??0,dice.filter(value=>value>=5).length);
      if(removed)attacker.bleed-=removed;
      const amount=Math.min(attacker.bleed??0,dice.filter(value=>value>0&&value<=4).length);
      add(`Bleed rolls ${dice.join(', ')}. Remove ${removed} Bleed.`);
      if(amount)startSideDamage(state,state.active,amount,'Bleed');
      break;
    }
    case 'unearth': {
      if(!unearthChoices(attacker).includes(action.status))return previous;
      attacker.covered=action.status;
      const extra=attacker.upgrades[action.status]?1:0;
      necromancer.gain(attacker,necromancer.unearth[action.status]+extra);
      state.necroUpkeep=true;
      add(`Unearth covers ${action.status} and grants ${necromancer.unearth[action.status]+extra} Corpses.`);
      break;
    }
    case 'necroChoice': {
      const hit=state.pending;
      if(hit.explosion){
        if(!Number.isInteger(action.amount)||action.amount<0||action.amount>Math.min(hit.explosion,attacker.corpses))return previous;
        attacker.corpses-=action.amount;
        if(action.amount){hit.effect='corpseExplosion';hit.effectCount=action.amount;state.stage='effect';break;}
      } else if(hit.shroud){
        const choices=necromancer.types(attacker);
        if(action.status==='corpses'){
          if(hit.shroud==='both'&&choices.length)return previous;
        } else if(choices.includes(action.status))necromancer.summon(attacker,action.status);
        else return previous;
        if(action.status==='corpses'||hit.shroud==='both')necromancer.gain(attacker,3);
      }
      continueOffence(hit);
      break;
    }
    case 'rerollUndead': {
      const d=state.undeadRoll,i=action.index;
      if(!Number.isInteger(i)||!d.dice[i])return previous;
      d.dice[i]=roll();d.rerolls--;
      break;
    }
    case 'resolveUndead': {
      const d=state.undeadRoll;
      const losses=d.dice.filter(die=>die===4||die===5).length;
      state.undeadResume=d.resume;
      state.undeadLosses=losses;
      delete state.undeadRoll;
      if(losses&&Object.values(attacker.undead).some(Boolean))state.stage='undeadRemove';
      else state.stage=d.resume;
      break;
    }
    case 'removeUndead':
      if(!Object.hasOwn(necromancer.undead,action.status)||!attacker.undead[action.status])return previous;
      attacker.undead[action.status]--;
      if(!--state.undeadLosses||!Object.values(attacker.undead).some(Boolean))state.stage=state.undeadResume;
      break;
    case 'horseUpkeep':
      if(!['skip','return','send','terrorize'].includes(action.status))return previous;
      if(action.status==='terrorize'&&(attacker.dreadful??0)<4)return previous;
      if(action.status==='return'&&attacker.hauntedHeadSeat===state.active||action.status==='send'&&attacker.hauntedHeadSeat===1-state.active)return previous;
      state.horseUpkeep=true;
      if(action.status==='return')attacker.hauntedHeadSeat=state.active;
      if(action.status==='send'){
        attacker.hauntedHeadSeat=1-state.active;
        grantStatus(attacker,'dreadful');
      }
      if(action.status==='terrorize'){
        attacker.dreadful-=4;
        attacker.hauntedHeadSeat=state.active;
        startSideDamage(state,1-state.active,3,'Terrorize',false,{terrorize:true});
      }
      break;
    case 'chooseHorrify':
      if(!['dreadful','grim'].includes(action.status))return previous;
      state.pending[action.status]=action.status==='dreadful'?3:1;
      continueOffence(state.pending);
      break;
    case 'collectGrim': {
      const {seat,amount}=state.grimOverflow;
      delete state.grimOverflow;
      grantStatus(state.players[seat],'grim',amount);
      break;
    }
    case 'resolveGrimRoll': {
      const {dice,seat,resume}=state.horseRoll;
      const bonus=tally(effectiveDice(dice,state.players[seat]),heroId(state,seat)).Horseshoe??0;
      state.pending.grossDamage+=bonus;
      updateDamage(state.pending);
      delete state.horseRoll;
      state.stage=resume;
      add(`Grim Pursuit adds ${bonus} damage.`);
      break;
    }
    case 'resolveCosmicFlare':
      startSideDamage(state,1-state.active,attacker.cosmicFlare,'Cosmic Flare',false,{keepPending:true,cosmicFlare:true});break;
    case 'jeanSwitch':
      attacker.darkPhoenix=!attacker.darkPhoenix;attacker.jeanFormTurn=state.turn;add(`${names[state.active]} becomes ${attacker.darkPhoenix?'Dark Phoenix':'Jean Grey'} in Upkeep.`);break;
    case 'checkPhoenixBurn':
      state.jeanBurnChecked=attacker.phoenixBurnEpoch??0;
      startSideDamage(state,state.active,2,'Phoenix Burn',false,{keepPending:true,jeanBurnCheck:state.jeanBurnChecked});break;
    case 'resolvePhoenixBurn': {
      const event=state.jeanBurnRoll,p=state.players[event.seat],face=dieValue(event.dice[0],p);
      if(face>=5&&p.phoenixBurn&&(p.phoenixBurnEpoch??0)===event.epoch)removeStatus(p,'phoenixBurn');
      delete state.jeanBurnRoll;state.stage='upkeep';add(`Phoenix Burn removal rolls ${face||'a blank'}.`);break;
    }
    case 'resolveUpkeep':
      if(attacker.sunDial!==undefined&&!state.sunUpkeep){
        state.sunUpkeep=true;
        if(!attacker.sunDawn)sunElf.increase(attacker,1);
      }
      if(attacker.moonShard===3&&!attacker.werewolf){
        attacker.werewolf=true;
        add('Twilight transforms Pale Lady into Werewolf.');
      }
      if(heroId(state,state.active)===gunslinger.id&&!state.quickDrawChecked){
        state.quickDrawChecked=true;
        const before=attacker.reload??0;
        grantStatus(attacker,'reload');
        if(attacker.reload>before)add(`${names[state.active]} gains Reload from Quick Draw.`);
      }
      if(attacker.bleed&&!state.bleedChecked){
        state.bleedChecked=true;
        state.bleedRoll=rollBatch(roll,attacker.bleed);
        break;
      }
      if(attacker.holyPresence&&!state.holyPresenceChecked){
        state.holyPresenceChecked=true;
        startSideDamage(state,1-state.active,attacker.holyPresence,'Holy Presence');
        break;
      }
      if(attacker.powderKeg&&!state.pirateKegChecked){
        state.pirateKegChecked=true;
        state.effectDie=roll();
        state.stage='pirateKegRoll';
        break;
      }
      if(heroId(state,state.active)===7&&!state.fertilized){
        state.fertilized=true;
        if(queueGrowth(state,state.active,1,'Fertilize','upkeep'))break;
      }
      finishUpkeep(state,roll,random);
      break;
    case 'evadeUpkeep':
      state.evasionSeat=state.active;state.evasionReturnStage='upkeep';
      removeStatus(attacker,'evasive');state.effectDie=roll();state.stage='evasion';break;
    case 'chooseMastery': {
      psylocke.useAbility(state);
      const p=state.pending, tokens=action.amount;
      if(!Number.isInteger(tokens)||tokens<0||tokens>Math.min(4,attacker.fireMastery??0))return previous;
      attacker.fireMastery=(attacker.fireMastery??0)-tokens;
      p.damage=tokens*p.combustRate;
      continueOffence(p);break;
    }
    case 'effectRetry': {
      const p=state.pending,i=action.index;
      if(!Number.isInteger(i)||i<0||i>=p.effectDice.length)return previous;
      if(p.tempestChi){
        removeStatus(attacker,'chi');
        p.tempestChi=false;
      }
      if(canRerollMaul(state))p.maulRerolled=true;
      p.effectDice[i]=roll();p.effectRetry=false;
      add(`${p.name} reroll: ${p.effectDice.join(', ')}.`);
      break;
    }
    case 'begin': startOffensiveRoll(state,roll);break;
    case 'endMain': state.stage='discard';break;
    case 'retryDie':
    case 'finishRetry': {
      const ctx=rollContext(state), {before,seat}=state.retry;
      if(action.type==='retryDie'){
        if(!Number.isInteger(action.index)||action.index<0||action.index>=ctx.dice.length||dieOwner(ctx,action.index)!==seat||iceman.contextLocked(state,ctx,action.index))return previous;
        ctx.dice[action.index]=roll();
        if(ctx.scalar)state.effectDie=ctx.dice[0];
        add(`${names[seat]} uses ${state.retry.remaining?'a Tsunami reroll':'the second reroll'}: ${ctx.dice.join(', ')}.`);
        if(state.retry.remaining>1){state.retry.remaining--;break;}
      }
      state.retry=null;
      releaseChangedAnnouncement(state,ctx,before);
      break;
    }
    case 'resolvePetulant': {
      const {seat,resume}=state.petulant, player=state.players[seat], target=state.players[1-seat];
      if(![0,1].includes(action.choice)||action.choice===1&&target.cp<1)return previous;
      if(action.choice===1){target.cp--;gainCP(player,1);}
      else player.werewolf=true;
      state.stage=resume;
      delete state.petulant;
      break;
    }
    case 'paleMoonChoice':
      if(![0,1].includes(action.choice))return previous;
      if(action.choice===0)gainCP(attacker,1);
      else paleLady.gain(attacker);
      continueOffence(state.pending);
      break;
    case 'reopenPrey':
      state.pending.preyResume=state.stage;
      state.stage='prey';
      break;
    case 'rollPrey':
      state.preyRoll=[roll()];
      break;
    case 'resolvePrey': {
      const face=dieValue(state.preyRoll[0],attacker), p=state.pending;
      delete state.preyRoll;
      if(face===1)removeStatus(defender,'prey');
      else if(p.preyBonuses.length<(defender.prey??0)){
        const bonus=face===6?2:face>1?1:0;
        p.preyBonuses.push(bonus);
        p.grossDamage+=bonus;
        updateDamage(p);
      }
      add(`Prey rolls ${face}.`);
      if(p.preyBonuses.length>=(defender.prey??0)){
        addOverflowPrey(p);
        if(p.preyBonuses.length>=(defender.prey??0))state.stage=p.preyResume;
      }
      break;
    }
    case 'skipPrey':
      addOverflowPrey(state.pending);
      state.stage=state.pending.preyResume;
      break;
    case 'finishCardRoll': completeCardRoll(state,roll,random,add);break;
    case 'finishMainCard': {
      const {seat,id,choice}=state.mainAction;
      state.mainAction=null;
      if(([1,2,4].includes(id)||heroId(state,seat)===seraph.id&&[29,30].includes(id)||heroId(state,seat)===vampireLord.id&&id===29||heroId(state,seat)===gunslinger.id&&id===30||heroId(state,seat)===tactician.id&&id===28||heroId(state,seat)===huntress.id&&id===32)&&mainTargets(state,seat,id).length)state.mainChoice={seat,id};
      else applyCard(state,seat,id,choice,roll,random,add);
      break;
    }
    case 'resolveMainChoice': {
      const {seat,id}=state.mainChoice;
      const choice=mainTargets(state,seat,id)[action.choice];
      if(!choice)return previous;
      state.mainChoice=null;
      applyCard(state,seat,id,choice,roll,random,add);
      break;
    }
    case 'resolveGunContest': {
      const {kind,dice,seat}=state.gunContest, own=dieValue(dice[0],state.players[seat]), other=dieValue(dice[1],state.players[1-seat]), hit=state.pending;
      delete state.gunContest;
      add(`${names[seat]} rolls ${own} against ${names[1-seat]}’s ${other}.`);
      if(kind==='showdown'){
        hit.damage=hit.showdown[own>=other?0:1];
        hit.showdown=null;
        hit.showdownTargeted=true;
        continueOffence(hit);
      } else if(own>other||own===other&&defender.upgrades?.defence){
        state.stage='gunDuelChoice';
      } else {
        hit.returnDamage=1;
        state.stage='damage';
      }
      break;
    }
    case 'rerollDuel':
      state.gunContest.dice[0]=roll();
      state.extraDefence--;
      break;
    case 'chooseDuel':
      if(![0,1].includes(action.choice))return previous;
      if(action.choice===0)state.pending.returnDamage=3;
      else {
        state.pending.halfDefence=true;
        updateDamage(state.pending);
      }
      state.stage='damage';
      break;
    case 'rerollReload': {
      const reload=state.gunReload, hit=state.pending;
      if(!reloadRerolls(state).some(([key])=>key===action.status))return previous;
      reload.used.push(action.status);
      reload.dice[0]=roll();
      if(action.status==='wildWest'){
        hit.wildWestUsed=true;
        reload.extra++;
      }
      break;
    }
    case 'resolveReload': {
      const reload=state.gunReload, hit=state.pending;
      const amount=Math.ceil(dieValue(reload.dice[0],state.players[reload.seat])/2)+reload.extra;
      hit.grossDamage+=amount;
      updateDamage(hit);
      state.stage=reload.resume;
      delete state.gunReload;
      add(`${names[reload.seat]} adds ${amount} damage with Reload.`);
      break;
    }
    case 'resolveTarget':
      if(state.pending.showdown){
        state.gunContest={seat:state.active,kind:'showdown',dice:rollBatch(roll,2,[state.active,1-state.active])};
        state.stage='gunContest';
      } else activate();
      break;
    case 'chooseSeraphTarget': {
      const hit=state.pending;
      if(![0,1].includes(action.target))return previous;
      hit.seraphTarget=action.target;
      if(!hit.purify)continueOffence(hit);
      else if(action.target===state.active)state.stage='purify';
      else {
        hit.damage=hit.purify.damage;
        continueOffence(hit);
      }
      break;
    }
    case 'resolvePurify': {
      const hit=state.pending, target=hit.seraphTarget;
      if(action.status&&(!statusKeys.includes(action.status)||!state.players[target][action.status]))return state;
      if(action.status){
        removeMatchStatus(state,target,action.status);
        add(`Purify removes ${statusLabel(action.status)} from ${names[target]}.`);
      }
      hit.purifyDone=true;
      if(target===state.active){
        hit.heal=hit.purify.heal;
        activate();
      } else state.stage='damage';
      break;
    }
    case 'resolveSeraphRoll': {
      const {kind,dice,resume,seat}=state.seraphRoll, hit=state.pending;
      state.seraphRoll=null;
      state.stage=resume;
      if(kind==='blinding'){
        const die=dieValue(dice[0],state.players[seat]);
        add(`Blinding Light rolls ${die}.`);
        if(die===1){add(`${hit.name} fails.`);failOffence();}
        else {
          hit.blindingHalf=die>0&&die<=3;
          resolveAbility();
        }
      } else {
        const success=effectiveDice(dice,state.players[seat]).includes(6);
        add(`${names[seat]} rolls ${dice.join(', ')} for Flight. ${success?'Flight succeeds.':'Flight fails.'}`);
        if(!success)break;
        if(kind==='attack'){
          state.offenceFlight=true;
          if(hit)hit.undefendable=true;
          if(resume==='defence')state.stage='damage';
        } else {
          hit.evaded=true;
          updateDamage(hit);
        }
      }
      break;
    }
    case 'chooseEffect': {
      psylocke.useAbility(state);
      const p=state.pending;
      if(p.ninjaTarget){
        if(![0,1].includes(action.target))return previous;
        p.ninjaSeat=action.target;
        continueOffence(p);
        break;
      }
      if(p.retributionTarget){
        if(![0,1].includes(action.target))return previous;
        grantStatus(state.players[action.target],'retribution');
      } else if(p.grantEvasive){
        if(![0,1].includes(action.target))return previous;
        p.grantSeat=action.target;
        p.evasive=1;
      } else if(action.status){
        if(!statusKeys.includes(action.status)||!attacker[action.status])return previous;
        removeStatus(attacker,action.status);
      }
      activate();break;
    }
    case 'roll':
      if(constrictCost(state)){
        attacker.cp--;
        add(`${names[state.active]} pays 1 CP to reroll under Constrict.`);
      }
      state.dice = Array.from({length:5+(state.stormDice?.count??0)}, (_,i) => state.held[i]||iceman.locked(state,state.active,i) ? state.dice[i] : roll());
      state.held = state.dice.map((_,i)=>Boolean(state.held[i]));
      state.attempts++;
      if(state.attempts===1){iceman.capture(state);psylocke.initialRoll(state,roll);}
      if(attacker.barbed&&state.attempts>1)
        state.vineAttempts=Math.min(2-(state.vinePaid??0),(state.vineAttempts??0)+1);
      add(`${names[state.active]} rolls ${state.dice.join(', ')}.`);
      break;
    case 'hold':
      state.held[action.index] = !state.held[action.index];
      break;
    case 'declare': {
      const ability = abilitiesFor(state,state.active).find(a=>a.name === action.ability);
      const dice=effectiveDice(state.dice,attacker);
      const counts = tally(scarletWitch.symbols(state,state.active,dice),heroId(state,state.active));
      if(state.stormDice)for(const key of Object.keys(counts))counts[key]=Math.min(counts[key],5);
      const matching=matchingNumbers(dice);
      if(ability.straight)counts.largeStraight=hasStraight(dice,5);
      const usesPrayer=ability.straight?
        hasStraight(dice,counts.largeStraight?5:ability.straight,[counts.largeStraight?2:3]):!!ability.symbols?.Prayer;
      state.pending = {name:ability.label??ability.name, damage:ability.damage?.(counts) ?? 0, heal:ability.heal?.(counts) ?? 0,
        evasive:Number(ability.evasive??0), blind:!!ability.blind, entangle:!!ability.entangle||matching>=ability.matchEntangle,
        cleanse:matching>=ability.cleanseMatch, grantEvasive:ability.grantEvasive, concussion:ability.concussion,
        paladinGain:ability.paladinGain,paladinAfter:ability.paladinAfter,paladinAfterChoice:ability.paladinAfterChoice,
        afterCP:ability.afterCP,retributionTarget:ability.retributionTarget,titheGain:!!attacker.upgrades?.Tithe&&usesPrayer,
        threshold:ability.threshold??14, footDamage:ability.footDamage??1,
        burn:ability.burn||ability.soulUpgrade&&counts.Soul>=3,knockdown:ability.knockdown||matching>=ability.matchKnockdown,
        mastery:ability.souls?2*counts.Soul:ability.mastery,
        masteryCap:ability.soulUpgrade&&counts.Soul>=4?1:ability.masteryCap,
        masteryDamage:ability.masteryDamage,combustRate:ability.combustRate,
        collateral:ability.souls?counts.Soul:ability.collateral,
        grow:matching>=ability.growMatch?1:ability.grow,spiritDamage:ability.spiritDamage,
        spiritCost:ability.spiritCost,overgrowth:ability.overgrowth,barbed:ability.barbed,
        wellsTarget:ability.wellsTarget,wellsSelf:ability.wellsSelf,
        delayedPoison:ability.delayedPoison,smoke:ability.smoke,ninjaTarget:ability.ninjaTarget,
        ninjaTokens:matching>=ability.ninjutsuMatch?1:ability.ninjaTokens,
        ninjaRerolls:ability.ninjaRerolls,ninjaPoisonOnMasks:ability.ninjaPoisonOnMasks,
        effectCount:ability.effectCount,effectRetry:ability.effectRetry,tempestChi:ability.tempestChi,
        chiGain:ability.chiGain,cleanseGain:ability.cleanseGain,monkRewards:ability.monkRewards,
        afterChi:ability.afterChi,afterChiCap:ability.afterChiCap,afterEvasive:ability.afterEvasive,
        cpGain:ability.pickpocket?counts.Bag+(ability.pickUpgrade?1:0):ability.dagger?(ability.daggerUpgrade||counts.Bag?1:0):ability.cardUpgrade&&counts.Bag?1:ability.cpGain,
        cpDamage:ability.cpDamage, pickLimit:ability.pickpocket&&counts.Shadow?(ability.pickUpgrade?2:1):0,
        draw:ability.carducopia?counts.Card:ability.daggerUpgrade&&counts.Card?1:ability.draw,
        discardOpponent:ability.cardUpgrade&&counts.Shadow,
        poison:ability.poison||ability.dagger&&counts.Shadow,sneak:ability.sneak,enterShadows:ability.shadows,afterShadows:ability.afterShadows,pure:ability.type==='pure',
        undefendable:!!state.offenceFlight||ability.type==='undefendable'||matching>=ability.matchUndefendable, ultimate:ability.type==='ultimate', returnDamage:0,
        stun:!!ability.stun, targeted:!!ability.targeted, effect:ability.effect, recoil:ability.recoil ?? 0};
      if(heroId(state,state.active)===deadpool.id){state.pending.deadpool={draw:ability.dDraw,donut:ability.dDonut,rps:ability.dRps,onom:ability.dOnom,cp:ability.dCP,spokenCP:ability.dSpokenCP,taco:!!ability.dTaco&&hasStraight(dice,4,[1,3]),fourth:ability.dFourth};if(ability.dSix&&hasStraight(dice,5,[2]))state.pending.damage++;}
      if(heroId(state,state.active)===santa.id){state.pending.santa={cheer:ability.sCheer??0,nog:(ability.sNog??0)+Number(!!ability.sMatchNog&&matching>=4),festive:ability.sFestive,rosey:ability.sRosey,reindeer:ability.sReindeer,mistletoe:ability.sMistletoe,contest:ability.sContest,naughty:ability.sNaughty,naughtyUp:ability.sNaughtyUp};state.pending.santaExtra=!!ability.sExtra;}
      if(heroId(state,state.active)===mysticBrawler.id){state.pending.mystic={strengths:ability.strengths,heal:(ability.mHeal??0)+Number(!!ability.sixHeal&&hasStraight(dice,4,[3])),ocean:ability.ocean,mountain:ability.mountain,sky:Number(!!ability.skyTriple&&matching>=3),tectonic:ability.tectonic,strong:ability.strongArm,tidalUp:ability.tidalUp};state.pending.concussion=!!ability.concussion||matching>=ability.mysticConcussion;}
      if(heroId(state,state.active)===krampus.id){state.pending.krampus={gifts:ability.gifts??Number(ability.giftTriple&&matching>=3),draw:ability.rejectDraw,coal:ability.coal,cp:ability.kCP,cards:ability.kDraw,bad:ability.badTidings,rejection:ability.rejection,free:ability.freeReject,rotterUp:ability.rotterUp};if(ability.badTidings){state.pending.nonAttack=true;state.pending.attack=false;}}
      if(heroId(state,state.active)===alchemist.id)state.pending.alchemist={slot:ability.upgradeSlot??ability.name,attach:ability.attach,each:ability.eachPotion,heal:ability.aHeal,cp:ability.aCP,draw:ability.aDraw,extra:ability.extraPotions};
      if(heroId(state,state.active)===wolverine.id)state.pending.wolverine={heal:ability.clawHeal?(matching>=3?(ability.clawHealUp?(matching>=4?4:3):2):0):ability.wHeal,draw:ability.wDraw,drawAfter:ability.wDrawAfter,rage:ability.rage,alpha:ability.alpha,remove:ability.removeSelf,choice:ability.barrageChoice,severeChoice:ability.severeChoice};
      if(heroId(state,state.active)===storm.id){const key=storm.slots.includes(ability.upgradeSlot??ability.name)?ability.upgradeSlot??ability.name:undefined;const wasCharged=!!attacker.lightningCharges?.[key];state.pending.storm={key,charge:ability.charge,wasCharged,eligible:wasCharged&&attacker.stormChargeUsed?.[key]!==state.turn,lightning:ability.lightning,tornado:ability.tornado,windShear:ability.windShear,maelstrom:ability.maelstrom};}
      if(heroId(state,state.active)===rogue.id){state.pending.rogue={skyward:ability.skyward,ionic:ability.ionic,ionic2:ability.ionic2,brawl:ability.brawl,cp:ability.brawlUp||matching>=3};state.pending.influence=(ability.influence??0)+Number(!!ability.brawlUp&&matching>=3);}
      if(heroId(state,state.active)===psylocke.id){state.pending.psy={agility:ability.agility,infiltration:ability.infiltration,devise:ability.devise,swapped:!!attacker.manifestSwapped};state.pending.paralyze=ability.paralyze;}
      if(heroId(state,state.active)===jeanGrey.id){state.pending.jean={dark:!!attacker.darkPhoenix,triple:matching>=3,acuity:ability.acuity,flame:ability.flame,field:ability.field,fieldLast:ability.fieldLast,occlusion:ability.occlusion,acuityFirst:ability.acuityFirst,essence:ability.essence};if(ability.astralCombat&&attacker.darkPhoenix)state.pending.undefendable=true;}
      if(heroId(state,state.active)===iceman.id){state.pending.iceman={store:(ability.store??0)+Number(matching>=ability.storeMatch),shards:ability.shards,cp:ability.iceCP,glide:ability.iceGlide,chill:ability.chill,transferBefore:ability.transferBefore,transferAfter:ability.transferAfter,path:iceman.paths[ability.name],shardSnapshot:attacker.iceShard??0};state.pending.diceCube=ability.cubes;}
      delete state.iceGlideTarget;
      if(heroId(state,state.active)===gambit.id){
       const usesRed=!!ability.symbols?.[gambit.red]||!!ability.straight&&!!counts[gambit.red],usesBlack=!!ability.symbols?.[gambit.black]||!!ability.straight&&!!counts[gambit.black];
       const usesSuper=!!ability.symbols?.[gambit.superCharge]||!!ability.straight&&!!counts[gambit.superCharge]&&hasStraight(dice,ability.straight,[7-ability.straight]);
       state.pending.gambit={usesRed,usesBlack,usesSuper,accelerate:ability.accelerate,dissolution:ability.dissolution,cp:ability.gambitCP,draw:ability.gambitDraw,extra:ability.extraAce,sleight:ability.sleight,regainBefore:ability.regainBefore,regainAfter:ability.regainAfter,double:ability.doubleAce};
       state.pending.disruption=ability.disruption||matching>=ability.disruptMatch;
      }
      if(heroId(state,state.active)===cyclops.id){state.pending.cyclops={battle:ability.battle,support:ability.support,choice:matching>=ability.choiceMatch,then:ability.then,leadDamage:ability.leadDamage,leadFocus:ability.leadFocus,leadSupport:ability.leadSupport,leadBoth:ability.leadBoth};state.pending.focusFire=ability.focus;}
      if(heroId(state,state.active)===thor.id)state.pending.thor={hammer:ability.hammer,throws:ability.throws,summon:ability.summon,rod:ability.rod,electro:(ability.electro??0)+Number(matching>=ability.electroMatch),guard:ability.guard,electroBonus:ability.electroBonus,chain:ability.chain};
      if(heroId(state,state.active)===spiderMan.id)Object.assign(state.pending,{spider:{invisibility:ability.invisibility,combo:ability.combo||matching>=ability.comboMatch},webbed:ability.webbed||ability.webAfter,webAfter:ability.webAfter});
      if(heroId(state,state.active)===scarletWitch.id)Object.assign(state.pending,{scarlet:{probability:ability.probability,conjure:ability.conjure,crackle:ability.crackle,jinxUpgrade:ability.jinxUpgrade,mindOdd:ability.mindOdd,steal:ability.stealHealth},realityWarp:ability.realityWarp||matching>=ability.warpMatch});
      if(heroId(state,state.active)===loki.id)Object.assign(state.pending,{loki:{illusion:ability.illusion,bags:ability.bagThree&&(counts.Lies??0)>=3?0:(ability.bags??Number(matching>=ability.bagMatch)),bind:ability.spellbound,distribute:ability.bagThree&&(counts.Lies??0)>=3?3:ability.distribute,optional:ability.optionalBags||ability.bagThree&&(counts.Lies??0)>=3,vilify:ability.vilify,upgrade:ability.vilifyUpgrade}});
      if(heroId(state,state.active)===doctorStrange.id)Object.assign(state.pending,{strange:{deja:ability.dejaVu,premonition:ability.premonition,prepare:ability.prepareDiscard,cast:ability.castSpells,ultimate:ability.strangeUltimate},crimsonBands:ability.crimsonBands});
      if(heroId(state,state.active)===captainMarvel.id)Object.assign(state.pending,{marvel:{radiance:ability.radiance,flare:ability.cosmicFlare??Number(matching>=ability.flareMatch),ray:ability.cosmicRay,ready:ability.rayReady}});
      if(heroId(state,state.active)===blackWidow.id)Object.assign(state.pending,{widow:true,agility:ability.agility,covertOps:ability.covertOps,timeBomb:ability.bomb,advanceBombs:ability.advanceBombs,searchUpgrades:ability.searchUpgrades,thresholdDamage:ability.thresholdDamage,upgradeDamage:ability.upgradeDamage,grappleCP:ability.grappleCP});
      if(heroId(state,state.active)===blackPanther.id)Object.assign(state.pending,{
        panther:{suit:ability.suit,kinetic:ability.kineticFromVibranium?(counts.Vibranium??0):(ability.kinetic??Number(matching>=ability.kineticMatch))}
      });
      if(heroId(state,state.active)===sunElf.id)Object.assign(state.pending,{
        sunElf:{gain:ability.sunGain??Number(matching>=ability.sunMatch),gem:ability.chargedGem,choice:ability.sunChoice,scorchUpgrade:ability.sunScorchUpgrade},
        sunMarked:ability.sunMarked
      });
      if(heroId(state,state.active)===forgemaster.id)Object.assign(state.pending,{
        forgemaster:{armorBonus:ability.armorBonus,mineAll:ability.mineAll,oreSearch:ability.oreSearch},
        cpGain:Number(matching>=ability.forgeCpMatch)
      });
      if(heroId(state,state.active)===duelist.id)Object.assign(state.pending,{
        duelist:{guardGain:ability.guardGain,steps:ability.steps??Number(ability.strike&&counts.largeStraight||matching>=ability.stepMatch)},
        disarm:ability.disarm,collateral:ability.collateral
      });
      if(heroId(state,state.active)===druid.id)Object.assign(state.pending,{
        druid:{shifts:ability.shifts,regenerate:ability.regenerate,wildDraw:ability.wildDraw,rainfall:ability.rainfall},
        wound:Number(matching>=ability.woundMatch)
      });
      if(heroId(state,state.active)===raveness.id)Object.assign(state.pending,{
        raven:{feathers:ability.feathers,cap:ability.featherCap,activations:ability.ravenActivate??Number(matching>=ability.ravenMatch)},
        hex:ability.hex
      });
      if(heroId(state,state.active)===paleLady.id)Object.assign(state.pending,{
        pale:{shards:ability.paleStraight?(counts.largeStraight?2:1):ability.shards,transform:ability.transform,
          shardDamage:ability.sunder&&counts.largeStraight?2:ability.shardDamage,shardHeal:ability.shardHeal,skipShardLoss:ability.skipShardLoss},
        prey:ability.prey,bleed:ability.sunder?(counts.largeStraight?2:1):ability.bleed??Number(matching>=ability.bleedMatch)
      });
      if(heroId(state,state.active)===necromancer.id)Object.assign(state.pending,{
        corpses:(ability.corpses?.(counts)??0)+Number(matching>=ability.corpseMatch),
        reanimate:ability.reanimate,harvest:ability.harvest,explosion:ability.explosion,shroud:ability.shroud,
        decrepify:ability.decrepify,resurrect:ability.resurrect,freeUndead:ability.freeUndead
      });
      if(heroId(state,state.active)===headlessHorseman.id)Object.assign(state.pending,{
        dreadful:ability.dreadful??Number(matching>=ability.dreadfulMatch),grim:ability.grim,
        spectral:ability.spectral,horrify:ability.horrify,headDraw:ability.headDraw
      });
      if(heroId(state,state.active)===huntress.id)Object.assign(state.pending,{
        nyraBond:ability.nyraBond,nyraHeal:ability.nyraHeal?.(counts),
        bleed:ability.bleed??Number(matching>=ability.bleedMatch)
      });
      if(heroId(state,state.active)===tactician.id)Object.assign(state.pending,{
        tacticalGain:ability.tacticalGain,tacticalCap:ability.tacticalCap,profiteer:ability.profiteer,
        constrict:ability.constrict||matching>=ability.constrictMatch
      });
      if(heroId(state,state.active)===samurai.id)Object.assign(state.pending,{
        honorGain:ability.honorGain,backStrike:ability.backStrike,
        shame:ability.shame??Number(matching>=ability.shameMatch)
      });
      if(heroId(state,state.active)===gunslinger.id)Object.assign(state.pending,{
        bounty:ability.bounty,showdown:ability.showdown,reloadReroll:ability.reloadReroll
      });
      if(heroId(state,state.active)===vampireLord.id){
        Object.assign(state.pending,{
          bloodGain:ability.bloodGain??Number(matching>=ability.bloodMatch),bleed:ability.bleed,
          mesmerize:ability.mesmerize,bloodMagic:ability.bloodMagic,possessChoice:ability.possessChoice,search:ability.search
        });
      }
      if(heroId(state,state.active)===seraph.id){
        Object.assign(state.pending,{
          flightGain:ability.flightGain,flightTarget:ability.flightTarget,holyGain:ability.holyGain,
          blessing:ability.blessing,blindingLight:ability.blinding||matching>=ability.blindingMatch,
          purify:ability.purify,smiteUpgrade:ability.smiteUpgrade
        });
      }
      if(heroId(state,state.active)===artificer.id){
        Object.assign(state.pending,{artSynth:ability.synth,nanite:ability.nanite,freeBots:ability.freeBots,freeRequired:ability.freeRequired,scratchBuilt:ability.scratchBuilt});
        if(ability.swarming)state.pending.damage+=Object.values(attacker.bots??{}).filter(Boolean).length;
      }
      if(heroId(state,state.active)===cursedPirate.id)Object.assign(state.pending,{
        powderKeg:ability.powderKeg||matching>=ability.kegMatch,wither:ability.wither,parlay:ability.parlay,
        pirateCoins:ability.pirateCoins,pirateInflict:ability.pirateInflict,
        pirateRemove:ability.pirateRemove,pirateCoinDamage:ability.pirateCoinDamage,piratePlank:ability.piratePlank
      });
      add(`${names[state.active]} announces ${ability.name}.`);
      state.stage = 'announce';
      break;
    }
    case 'end':
      attacker.blind = false;
      if(attacker.blindingLight)removeStatus(attacker,'blindingLight');
      add(`${names[state.active]} ends the roll without an ability.`);
      finishRoll();
      break;
    case 'finishSpiderAfter': finishRoll();break;
    case 'spendCombo':
      removeStatus(attacker,'combo');attacker.comboTurn=state.turn;startOffensiveRoll(state,roll);add('Combo starts an additional Offensive Roll Phase against the same opponent, without Income.');break;
    case 'skipCombo': state.stage='main';break;
    case 'finishScarletAbility':
      continueOffence(state.pending);break;
    case 'finishLokiAbility':
      continueOffence(state.pending);break;
    case 'finishStrangeAbility':
      continueOffence(state.pending);break;
    case 'completePremonition':
      state.premonitionTask=null;prepareMainPhaseOne(state);break;
    case 'spendDejaVu':
      if(state.rogueRoll?.kind==='influence'){attacker.influence=0;delete state.rogueRoll;}
      state.response=null;
      removeStatus(attacker,'dejaVu');attacker.blind=false;if(attacker.blindingLight)removeStatus(attacker,'blindingLight');
      restartOffensiveRoll(false);
      add(`${names[state.active]} spends Déjà Vu to start a new Offensive Roll Phase.`);break;
    case 'resolveSantaRemoval': {const r=state.santaRemoval,options=santa.removalChoices(state),choice=options[action.choice??0];if(options.length&&!choice)return previous;delete state.santaRemoval;if(choice)applyCard(state,r.source,7,choice,roll,random,add,true);break;}
    case 'finishDeadpoolAbility': deadpool.printed(state,random);break;
    case 'finishDeadpoolPrepared': resolveAbility();break;
    case 'finishDeadpoolResolved': continueOffence(state.pending);break;
    case 'finishSantaAbility': santa.printed(state,random);break;
    case 'finishSantaPrepared': resolveAbility();break;
    case 'startSantaRoll': startOffensiveRoll(state,roll);add('Comfort and Joy! starts an additional Offensive Roll Phase against the same opponent, without Income.');break;
    case 'finishMysticAbility': mysticBrawler.printed(state,random);break;
    case 'finishMysticPrepared': resolveAbility();break;
    case 'finishMysticResolved': continueOffence(state.pending);break;
    case 'finishKrampusAbility': krampus.printed(state,random);break;
    case 'finishKrampusPrepared': resolveAbility();break;
    case 'finishKrampusResolved': continueOffence(state.pending);break;
    case 'finishAlchemistAbility': alchemist.prepare(state,random);break;
    case 'finishAlchemistPotions': {const defensive=state.alchemistSpend?.defensive;delete state.alchemistSpend;if(defensive){updateDamage(state.pending);state.stage='damage';}else resolveAbility();break;}
    case 'finishWolverineAbility': psylocke.useAbility(state);if(!wolverine.printed(state,roll,random))resolveAbility();break;
    case 'finishWolverineResolved': psylocke.useAbility(state);if(!wolverine.effectAlpha(state,roll))continueOffence(state.pending);break;
    case 'finishStormAbility': psylocke.useAbility(state);if(!storm.printed(state))resolveAbility();break;
    case 'finishStormResolved': continueOffence(state.pending);break;
    case 'finishRogueAbility': resolveAbility();break;
    case 'finishPsyAbility': resolveAbility();break;
    case 'finishParalyze': finishRoll();break;
    case 'finishJeanAbility': resolveAbility();break;
    case 'finishJeanResolved': continueOffence(state.pending);break;
    case 'finishIcemanAbility': resolveAbility();break;
    case 'finishIcemanResolved': continueOffence(state.pending);break;
    case 'finishIcemanAfter': finishRoll();break;
    case 'skipGlide': state.stage='main';break;
    case 'spendGlide': {const target=iceman.path(state);removeStatus(attacker,'glide');attacker.glideTurn=state.turn;startOffensiveRoll(state,roll);state.iceGlideTarget=target;if(!attacker.knockdown)state.stage='iceGlideReady';break;}
    case 'activateIcemanGlide': return transitionCore({...state,stage:'iceGlideDeclare'},{type:'declare',ability:state.iceGlideTarget},roll,random,true);
    case 'finishGambitAbility':
      resolveAbility();break;
    case 'finishCyclopsAbility':
      continueOffence(state.pending);break;
    case 'finishThorAbility':
      continueOffence(state.pending);break;
    case 'finishWidowAbility':
      resolveAbility();break;
    case 'accept':
      if (attacker.blind) {
        attacker.blind = false;
        state.effectDie = roll();
        state.stage = 'blind';
      } else checkBlindingLight();
      break;
    case 'resolveBlind':
      if (state.effectDie <= 2&&dieValue(state.effectDie,attacker)) {
        add(`Blind roll ${state.effectDie}. ${state.pending.name} fails.`);
        const ability=state.pending;
        const wouldAttack=ability.damage>0||ability.cpDamage||ability.combustRate||ability.spiritDamage||
          ability.masteryDamage||['exploding','overpower','tempest','shadowDance','spanner','pirateBooty','walkLine','deathBlossom','druidMaul'].includes(ability.effect);
        if(attacker.blindingLight)removeStatus(attacker,'blindingLight');
        state.pending = null;
        finishRoll(Boolean(wouldAttack));
      } else {
        add(`Blind roll ${state.effectDie}. ${state.pending.name} resolves.`);
        checkBlindingLight();
      }
      state.effectDie = null;
      break;
    case 'rollEffect': {
      const p=state.pending;
      p.effectDice=rollBatch(roll,effectDiceCount(p,attacker));
      add(`${p.name} rolls ${p.effectDice.join(', ')} for its effect.`);
      if(state.cards){state.stage='effectResponse';break;}
      // The card-free scenarios resolve effect rolls immediately.
    }
    case 'resolveEffect': {
      psylocke.useAbility(state);
      const p=state.pending;
      const counts = tally(effectiveDice(p.effectDice,attacker),heroId(state,state.active));
      if(p.effect==='deadpoolBesmirched'){deadpool.effect(state,counts,random);break;}
      if(p.effect==='mysticTidal'){mysticBrawler.tidal(state,counts,random);break;}
      if(p.effect==='krampusRotter'){krampus.effect(state,counts,random);break;}
      if(p.effect==='jeanMultiplier'){jeanGrey.multiplier(state,effectiveDice(p.effectDice,attacker));break;}
      if(['wolverineHunter','wolverineSevere'].includes(p.effect)){wolverine.effect(state,counts);break;}
      else if(p.effect==='stormLight'){if(storm.light(state,counts,'stormResolved'))break;}
      else if(p.effect==='stormOpposites'){p.damage=effectiveDice(p.effectDice,attacker).reduce((n,v)=>n+v,0)+(p.stormModifiers??0);}
      else if(p.effect==='rogueLeach'){if(rogue.leach(state))break;}
      else if(p.effect==='icemanMeet'){if(iceman.meet(state,counts))break;}
      else if(p.effect==='gambitMastery'){p.damage+=counts.Staff??0;}
      else if(p.effect==='thorOdin'){thor.odin(state,counts);break;}
      else if(p.effect==='spiderReflexes'){p.damage=effectiveDice(p.effectDice,attacker).reduce((sum,v)=>sum+v,0);if(p.damage<=5)grantStatus(attacker,'combo');}
      else if(p.effect==='scarletJinx'){
        if(scarletWitch.resolveJinx(state,p.effectDice,roll))break;
      } else if(p.effect==='scarletMind'){
        const value=dieValue(p.effectDice[0],attacker);if(value&&value%2)p.damage=p.scarlet.mindOdd;else if(value)grantStatus(attacker,'probabilityManipulation');
      } else if(p.effect==='lokiKneel'){
        p.damage+=counts.Scepter??0;if(counts.Illusion)loki.give(state,state.active,state.active);if(counts.Lies)drawCards(attacker,1,random);if(counts.Mischief)grantStatus(attacker,'illusion');
      } else if(p.effect==='pantherTriple'){
        p.damage+=counts.Slash??0;
        if(counts.Vibranium)blackPanther.gain(attacker,2);
        if(counts.Panther)drawCards(attacker,1,random);
        if(attacker.kineticBursts){state.stage='pantherAbility';break;}
      } else if(p.effect==='sunScorch'){
        const power=!!counts['Sun Power'], charges=counts.Charge??0;
        p.damage+=2*(counts.Stave??0);
        sunElf.increase(attacker,2*Number(power)+(p.sunElf.scorchUpgrade?charges:2*charges));
        if(power)grantStatus(attacker,'chargedGem');
      } else if(p.effect==='strangeAstral'){
        if(counts.Mandala)p.damage+=3;
        if(counts.Tome)grantStatus(attacker,'premonition');
        if(counts.Mantle)p.crimsonBands=true;
        if(counts.Amulet){
          if(p.crimsonBands)doctorStrange.earlyBands(state);
          doctorStrange.begin(state,state.active,[{kind:'cast',zone:'book',left:1}],'strangeAbility');break;
        }
      } else if(p.effect==='marvelAurora'){
        p.damage=effectiveDice(p.effectDice,attacker).reduce((total,value)=>total+value,0)+(p.cosmicRayBonus??0);
      } else if(p.effect==='marvelBarrel'){
        p.damage+=2*Number(!!counts.Photon);
        if(counts.Ascend)grantStatus(attacker,'cosmicFlare',counts.Ascend);
        if(counts['Hala Star'])captainMarvel.gainRay(state,state.active);
      } else if(p.effect==='forgeFurnace'){
        p.damage+=dieValue(p.effectDice[0],attacker);
      } else if(p.effect==='duelEnGarde'){
        p.disarm=!!counts.Pierce;
      } else if(p.effect==='druidMaul'){
        p.damage=effectiveDice(p.effectDice,attacker).reduce((total,value)=>total+value,0);
      } else if(p.effect==='druidForest'){
        if(counts.Claw)p.damage+=2;
        if(counts.Paw)druid.gainShifts(state,state.active,1);
        if(counts.Nature)druid.regenerate(attacker);
      } else if(p.effect==='ravenMurder'){
        p.damage+=counts.Talon??0;
        raveness.feathers(state,state.active,counts.Wing??0);
        if(counts['Raven Eye']){
          state.stage='ravenAbility';
          raveness.activate(state,state.active,1);
          break;
        }
      } else if(p.effect==='paleJaws'){
        if(counts['Full Moon'])paleLady.gain(attacker);
        p.damage+=p.pale.shardDamage*attacker.moonShard;
      } else if(p.effect==='paleFullMoon'){
        p.damage+=counts.Slash??0;
        if(counts['Full Moon']){
          paleLady.gain(attacker);
          gainCP(attacker,1);
        }
        if(counts.Crescent){state.stage='paleMoonChoice';break;}
      } else if(p.harvest){
        if(counts.Soul){
          necromancer.gain(attacker,1);
          restartOffensiveRoll(true);
          add('Harvest starts an additional Offensive Roll Phase.');
          break;
        }
        if(counts.Bones){necromancer.gain(attacker,p.harvest[1]);drawCards(attacker,1,random);}
        if(counts.Scythe)p.damage=p.harvest[0];
      } else if(p.profiteer){
        if(counts.Medal){
          if(state.cards)drawCards(attacker,1,random);
          restartOffensiveRoll(true);
          add(`${names[state.active]} starts an additional Offensive Roll Phase from Profiteer.`);
          break;
        }
        if(counts.Saber)p.damage=p.profiteer[1];
        if(counts.Flag){
          gainTactical(state,state.active,p.profiteer[2]);
          p.effectDice=null;
        }
      } else {
        const resolve = abilityEffects[p.effect] ?? abilityEffects.exploding;
        resolve(p,counts,{attacker,bounded,grantStatus,drawCards,random});
      }
      continueOffence(p);
      break;
    }
    case 'defend': {
      const seat = 1-state.active;
      const hero=heroId(state,seat);
      if(hero===cyclops.id)state.pending.cyclopsDefenceUsed=true;
      if(hero===spiderMan.id&&action.defence&&!['counterpunch','spiderSense'].includes(action.defence))return previous;
      if(hero===spiderMan.id||defender.invisibility||state.pending.spiderInvisibleDefence)state.pending.spiderDefenceUsed=true;
      if(hero===3&&action.defence&& !['shadowDefence','counterStrike'].includes(action.defence))return previous;
      if(hero===gunslinger.id){
        state.defenceKind='defence';
        state.gunContest={seat,kind:'duel',dice:rollBatch(roll,2,[seat,1-seat])};
        state.stage='gunContest';
        break;
      }
      state.defenceKind=hero===spiderMan.id?(action.defence??'counterpunch'):hero===3?(action.defence??'shadowDefence'):'defence';
      const diceCount = heroRoster[hero].defenceDiceCount(defender,state.defenceKind);
      state.defenceDice = rollBatch(roll,diceCount);
      if(hero===seraph.id&&defender.upgrades?.defence===28)state.pending.seraphDefenceReroll=1;
      if(hero===6)state.pending.ninjaDefenceRerolls=defender.upgrades?.defence?2:1;
      if(state.cards){state.stage='defenceResponse';break;}
    }
    case 'resolveDefence': {
      const seat=1-state.active;
      const counts = tally(effectiveDice(state.defenceDice,defender),heroId(state,seat));
      add(`${names[seat]} rolls ${defenceName(state,seat,state.defenceKind)}: ${state.defenceDice.join(', ')}.`);
      const hero = heroRoster[heroId(state,seat)];
      state.stage = hero.resolveDefence({state,seat,defender,attacker,counts,bounded,grantStatus,removeStatus,gainBloodPower,gainTactical,gainGrim,stealNecroHealth,updateDamage,queueGrowth,drawCards,random,add}) ?? 'damage';
      break;
    }
    case 'preventStatus': {
      const p=state.pending;
      if(action.status && !p.incomingStatus.includes(action.status))return previous;
      if(action.status==='webbed'&&p.webAfter)p.spiderWebBlocked=true;
      if(action.status==='powderKeg'&&p.incomingStatus.includes('powderKeg')&&p.priorStatus.powderKeg){
        const explosions=state.rollPowderExplosions??[];
        const i=explosions.lastIndexOf(1-state.active);
        if(i>=0)explosions.splice(i,1);
      }
      if(action.status && !(action.status==='webbed'&&p.webAfter) && (defender[action.status]||0)>p.priorStatus[action.status]){
        if(action.status==='timeBomb'){const bomb=(defender.timeBombTimers??[]).find(b=>!p.priorBombIds?.includes(b.id));if(bomb)blackWidow.removeBomb(defender,bomb.id);}
        else removeStatus(defender,action.status);
        if(action.status==='prey')removePreyBonus(state,1-state.active,0);
        if(action.status==='bounty')removeBountyBonus(state,1-state.active);
        if(action.status==='targeted'&&p.targetBonus){
          p.grossDamage-=2;p.targetBonus=false;updateDamage(p);
        }
      }
      state.stage='damage';break;
    }
    case 'abilityReroll': {
      const ctx=rollContext(state),p=state.pending,card=state.cardRoll;
      const key=state.stage==='defenceResponse'&&!card?(p.seraphDefenceReroll?'seraphDefenceReroll':'ninjaDefenceRerolls'):'ninjaRerolls';
      const source=card??p,indices=action.indices;
      if(!Array.isArray(indices)||!indices.length||indices.length>source[key]||new Set(indices).size!==indices.length||
        !indices.every(i=>Number.isInteger(i)&&i>=0&&i<ctx.dice.length&&(!card||heroId(state,card.seat)===paleLady.id||![4,5].includes(ctx.dice[i]))))return previous;
      for(const i of indices)ctx.dice[i]=roll();
      source[key]=0;
      add(`${names[ctx.seat]} rerolls ${indices.length} dice: ${ctx.dice.join(', ')}.`);
      break;
    }
    case 'extraDefence': {
      if(!Array.isArray(action.indices)||!action.indices.length||new Set(action.indices).size!==action.indices.length||
         !action.indices.every(i=>Number.isInteger(i)&&i>=0&&i<state.defenceDice.length)) return previous;
      for(const i of action.indices)state.defenceDice[i]=roll();
      state.extraDefence--;break;
    }
    case 'skipDefence':
      add(`${names[1-state.active]} declines defence.`);
      if(shadowAvoids(state))state.pending.shadowSkippedDefence=true;
      state.stage = 'damage';
      break;
    case 'evade':
    case 'evadeReturn':
      state.evasionReturnStage=state.stage;
      state.evasionSeat=action.type==='evadeReturn'?state.active:1-state.active;
      state.players[state.evasionSeat].evasive--;
      state.effectDie = roll();
      state.stage = 'evasion';
      break;
    case 'resolveEvade': {
      const token=state.evasionToken??'evasive';
      if (state.effectDie <= (token==='smoke'?3:2)&&dieValue(state.effectDie,state.players[state.evasionSeat??1-state.active])) {
        add(`${statusLabel(token)} roll ${state.effectDie}. Incoming damage avoided.`);
        if(state.evasionReturnStage==='upkeep')state.upkeepEvaded=true;
        else if(state.evasionReturnStage==='sideDamage')state.sideDamage.evaded=true;
        else if(state.evasionSeat===state.active)state.pending.returnEvaded=true;
        else {
          state.pending.damage=0;
          state.pending.evaded=true;
        }
      } else add(`${statusLabel(token)} roll ${state.effectDie}. Incoming damage remains.`);
      state.effectDie = null;
      state.stage = state.evasionReturnStage??'damage';
      state.evasionReturnStage=null;
      state.evasionToken=null;
      break;
    }
    case 'finishNinjaGain': {
      psylocke.useAbility(state);
      const p=state.pending;
      grantStatus(attacker,'ninjutsu',p.ninjaTokens);
      p.ninjaTokens=0;
      continueOffence(p);
      break;
    }
    case 'resolveNinjutsu':
      if(!dieValue(state.effectDie,attacker)){
        state.effectDie=null;
        state.stage=state.ninjutsuReturnStage;
        state.ninjutsuReturnStage=null;
        break;
      }
      if(state.effectDie===6){state.stage='ninjutsuChoice';break;}
      applyNinjutsu(state.effectDie<=3?'one':'two');
      break;
    case 'chooseNinjutsu':
      if(!ninjutsuOutcomes(state).includes(action.status))return previous;
      applyNinjutsu(action.status);
      break;
    case 'settle': {
      const p = state.pending;
      if(state.stage!=='nyraDamage'){
        if(forgemaster.eligibleArmor(state).length){
          p.armorResume=state.stage;
          state.stage='forgeArmor';
          break;
        }
        const activeBonus=duelist.bonus(state,state.active);
        const defenceBonus=duelist.bonus(state,1-state.active);
        if(activeBonus||defenceBonus){
          if(activeBonus){
            const amount=attacker.footwork===2?3:1;
            attacker.footworkTurn=state.turn;
            p.grossDamage+=amount;
            add(`Footwork adds ${amount} attack damage.`);
          }
          if(defenceBonus){
            defender.footworkTurn=state.turn;
            if(defenceBonus==='draw'){
              drawCards(defender,1,random);
              add('Footwork draws 1 card.');
            } else {
              p.prevention=(p.prevention??0)+3;
              add('Footwork prevents up to 3 damage.');
            }
          }
          updateDamage(p);
          break;
        }
      }
      if(heroId(state,state.active)===necromancer.id&&!p.undeadSettled){
        p.undeadSettled=true;
        const used=undeadUsed(state,state.active);
        const count=(used.rolled??0)-(used.resolved??0);
        if(count)attacker.undeadUsed={...used,resolved:used.rolled};
        if(count&&attacker.undeadFreeTurn!==state.turn){
          state.undeadRoll={seat:state.active,dice:rollBatch(roll,count),resume:state.stage};
          state.stage='undeadRoll';
          break;
        }
      }
      const eligible=nyraIncoming(state);
      if(state.stage==='damage'&&eligible){
        state.stage='nyraDamage';
        break;
      }
      const toNyra=state.stage==='nyraDamage'?(Number.isInteger(action.amount)?action.amount:0):0;
      if(toNyra<0||toNyra>eligible||toNyra>0&&toNyra<eligible&&!defender.nyraBond)return previous;
      if(toNyra>0&&toNyra<eligible)removeStatus(defender,'nyraBond');
      const nyraHeal=p.nyraDefenceHeal??0;
      if(toNyra||nyraHeal){
        huntress.changeHealth(defender,nyraHeal-toNyra);
        if(toNyra)add(`Nyra takes ${toNyra} damage${nyraHeal?` with ${nyraHeal} defence healing`:''}.`);
        else add(`Maternal Bond heals Nyra for up to ${nyraHeal}.`);
      }
      if(p.clearShameOnSettle)attacker.shame=0;
      if(p.spendBlindingOnSettle&&attacker.blindingLight)removeStatus(attacker,'blindingLight');
      if(p.mountainBonus!==undefined)p.mountainSettled=true;
      const damage=incomingDamage(state);
      if(heroId(state,state.active)===headlessHorseman.id)p.horseDealtDamage=damage>0;
      if(!damage&&p.damage&&shadowAvoids(state))add(`${names[1-state.active]} avoids the offensive damage with Shadows.`);
      const attackDamage=p.attack?Math.max(0,damage-(p.collateral??0)):0;
      if(attackDamage&&defender.bleed===2&&(heroId(state,state.active)===vampireLord.id||attacker.bloodPower))state.bloodReward=true;
      const defenderDamage=damage-toNyra;
      if(p.focusBonus!==undefined)p.focusSettled=true;
      if(p.kineticBonus!==undefined)p.kineticSettled=true;
      const thorSaved=!!(p.thorWill&&p.attack&&defenderDamage>=defender.hp);
      const defenderSaved=thorSaved?false:takeDamage(defender,defenderDamage,!p.ultimate);
      if(thorSaved){defender.hp=1;add(`${names[1-state.active]} survives this attack through Indomitable Will.`);}
      rogue.drive(state,1-state.active,defenderDamage);
      const returnDamage=returnDamageFor(state);
      const vine=consumeVine();
      if(vine)add(`Barbed Vine adds ${vine} to ${names[state.active]}’s incoming damage.`);
      psylocke.useAbility(state);
      for(const key of p.paladinAfter??[])grantStatus(attacker,key);
      if(p.afterCP)gainCP(attacker,p.afterCP);
      if(p.afterChiCap)attacker.chiCap=statusCap(attacker,'chi')+p.afterChiCap;
      if(p.afterChi)grantStatus(attacker,'chi',p.afterChi);
      if(p.afterEvasive)grantStatus(attacker,'evasive',p.afterEvasive);
      if(p.afterShadows){
        grantStatus(attacker,'shadows');grantStatus(attacker,'sneak');
        if(p.draw&&state.cards)drawCards(attacker,p.draw,random);
      }
      const attackerSaved=takeDamage(attacker,returnDamage);
      if(p.webAfter||p.spiderInvisiblePunch||attacker.combo)p.spiderSettled=true;
      if(p.dawnUsed)sunElf.setDial(attacker,attacker.sunDial-4);
      add(`${names[1-state.active]} takes ${defenderDamage} damage${returnDamage ? ` and ${names[state.active]} takes ${returnDamage}` : ''}.`);
      if(defenderSaved)add(`${names[1-state.active]} survives through Blessing of Divinity.`);
      if(attackerSaved)add(`${names[state.active]} survives through Blessing of Divinity.`);
      if(p.quenched&&attacker.hp&&attackDamage)paleLady.heal(attacker,p.quenched*attacker.moonShard);
      if(state.bloodHealPlanned&&attacker.hp&&attackDamage){
        const before=attacker.hp;
        attacker.hp=bounded(attacker.hp+attackDamage,60);
        add(`${names[state.active]} heals ${attacker.hp-before} with Blood Power.`);
      }
      if (!finishMatchIfDefeated(state)) {
        if(p.pirateRemove&&(attacker.pirateCoins?.[state.active]??0)>0){
          cursedPirate.choose(state,state.active,'remove',{after:'finishRoll'});break;
        }
        if(p.paladinAfterChoice){state.stage='paladinReward';break;}
        if(state.cards && heroId(state,state.active)===barbarian.id && barbarian.offersHeadBash(p,attacker,damage)){
          p.successful=damage;state.stage='postHit';break;
        }
        finishRoll();
        if (p.stun) {
          add(`Stun clears. ${names[state.active]} starts another Offensive Roll Phase.`);
          startOffensiveRoll(state,roll);
        }
      }
      break;
    }
    case 'continueHit': finishRoll();break;
    case 'resolveSideDamage': {
      const event=state.sideDamage,receiver=state.players[event.seat],damage=sideIncoming(event);
      if(event.cosmicFlare){
        state.upkeepFlareDamage=damage;state.cosmicFlareChecked=true;
        removeStatus(attacker,'cosmicFlare');
        state.sideDamage=event.parent??null;state.stage=event.resume;
        add(`Cosmic Flare will deal ${damage} damage at the end of Upkeep.`);
        break;
      }
      if(event.artDetonation){
        const batch=state.artDetonation;
        batch.resolved[event.seat]=damage;
        state.sideDamage=null;
        state.stage=event.resume;
        if(batch.targets.length){
          const target=batch.targets.shift();
          startSideDamage(state,target,batch.amounts[target],'Nanobot',false,{artDetonation:true});
          break;
        }
        batch.resolved.forEach((amount,seat)=>{
          if(batch.amounts[seat]){
            const saved=takeDamage(state.players[seat],amount);
            add(`${names[seat]} takes ${amount} damage from Nanobot.`);
            if(saved)add(`${names[seat]} survives through Blessing of Divinity.`);
          }
        });
        state.artDetonation=null;
        finishMatchIfDefeated(state);
        break;
      }
      const saved=takeDamage(receiver,damage,!event.suppressPassives);
      add(`${names[event.seat]} takes ${damage} damage from ${event.source}.`);
      if(saved)add(`${names[event.seat]} survives through Blessing of Divinity.`);
      state.sideDamage=event.parent??null;
      if(!receiver.hp){
        state.stage='finished';
        state.winner=`${names[1-event.seat]} wins`;
        add(state.winner);
      } else if(event.endTurn)advanceTurn(state,roll,random);
      else {
        state.stage=event.resume;
        if(event.lokiBagResume)state.lokiBag=event.lokiBagResume;
        if(event.jeanBurnCheck!==undefined){state.jeanBurnRoll={seat:event.seat,epoch:event.jeanBurnCheck,dice:[roll()]};state.stage='jeanBurnRoll';}
        if(event.woundCheck){state.woundRoll=[roll()];state.stage='woundRoll';}
        if(event.ravenActivation)finishNevermore(state.ravenActivation);
        if(event.ravage){
          state.cardRoll={seat:event.seat,id:20,dice:rollBatch(roll,5),ninjaRerolls:5};
        }
        if(event.terrorize){
          gainGrim(state,state.active,1);
          gainCP(attacker,1);
        }
        if(event.draw)drawCards(receiver,event.draw,random,event.exclude);
        if(event.afterPirateStatus)grantPirateStatus(state,...event.afterPirateStatus);
      }
      break;
    }
    case 'next':
      if(attacker.delayedPoison){
        const amount=3*attacker.delayedPoison;
        attacker.delayedPoison=0;
        startSideDamage(state,state.active,amount,'Delayed Poison',true);
      } else advanceTurn(state,roll,random);
      break;
  }
  if(state.stage==='finished')state.players.forEach((p,seat)=>{
    if(p.hauntedHeadSeat===undefined)return;
    if(!p.hp)delete p.hauntedHeadSeat;
    else if(!state.players[p.hauntedHeadSeat].hp)p.hauntedHeadSeat=seat;
  });
  return flushPowderKegs(state);
}
if (typeof module !== 'undefined' && module.exports) module.exports={createMatch,transition,legal,actor,qualifies,cardChoices,cardActor,cardInfo,abilitiesFor,mainTargets,tokenChoices};
