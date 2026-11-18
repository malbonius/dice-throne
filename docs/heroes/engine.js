const sharedCards = [
 ['Transference!',2,'main'],['What Status Effects?',2,'main'],['Vegas Baby!',0,'main'],['Get That Outta Here!',1,'main'],
 ['Triple Up!',2,'instant'],['Double Up!',1,'instant'],['Buh, Bye!',2,'instant'],['Tip It!',1,'instant'],['Getting Paid!',0,'instant'],
 ['Not This Time!',1,'roll'],['Twice as Wild!',3,'roll'],['Try, Try Again!',1,'roll'],['So Wild!',2,'roll'],['Samesies!',1,'roll'],
 ['One More Time!',1,'roll'],['Helping Hand!',1,'roll'],['Better D!',0,'roll'],['Six-It!',1,'roll']
];
const heroRoster = [barbarian, moonElf, pyromancer, shadowThief, monk, paladin, ninja, treant, cursedPirate, artificer, seraph, vampireLord, gunslinger, samurai, tactician, huntress, headlessHorseman, necromancer, paleLady, raveness, druid, duelist, forgemaster];
const HEROES = heroRoster.map(hero => hero.board);
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
 return {name,cost,phase};
};
const newStatuses=['powderKeg','wither','parlay','synth','nanite','flight','blindingLight','holyPresence','bloodPower','bleed','mesmerize','bounty','reload','honor','shame','backStrike','tactical','constrict','nyraBond','dreadful','grim','decrepify','prey','feather','hex','wound','regenerate','regenerate1','guardBreak','disarm'];
const statusKeys=['blind','entangle','evasive','targeted','concussion','burn','knockdown','fireMastery','poison','shadows','sneak','chi','cleanse','crit','accuracy','protect','retribution','delayedPoison','smoke','ninjutsu','wellspring','barbed',...newStatuses];
const negativeStatuses=['entangle','blind','concussion','targeted','burn','knockdown','poison','delayedPoison','barbed','powderKeg','wither','parlay','nanite','blindingLight','bleed','bounty','shame','constrict','decrepify','prey','hex','wound','disarm'];
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
const statusLabel = s=>s==='guardBreak'?'Guard Break':s==='regenerate1'?'Regenerate (1)':s==='regenerate'?'Regenerate (2)':s==='decrepify'?'Decrep-ify':s==='grim'?'Grim Pursuit':s==='nyraBond'?'Nyra’s Bond':s==='tactical'?'Tactical Advantage':s==='backStrike'?'Back Strike':s==='bloodPower'?'Blood Power':s==='mesmerize'?'Mesmerize':s==='blindingLight'?'Blinding Light':s==='holyPresence'?'Holy Presence':s==='powderKeg'?'Powder Keg':s==='doubloon'?'Cursed Doubloon':s==='barbed'?'Barbed Vine':s==='smoke'?'Smoke Bomb':s==='delayedPoison'?'Delayed Poison':s==='blessing'?'Blessing of Divinity':s==='fireMastery'?'Fire Mastery':s==='sneak'?'Sneak Attack':s[0].toUpperCase()+s.slice(1);
const statusCap=(p,key)=>key==='feather'?(p.featherCap??5):key==='dreadful'?5:key==='synth'?7:key==='tactical'?(p.tacticalCap??5):key==='bloodPower'?5:key==='chi'?(p.chiCap??5):key==='fireMastery'?(p.masteryCap??5):['delayedPoison','wither','holyPresence','bleed','reload','honor','shame','prey','wound','regenerate','regenerate1','guardBreak'].includes(key)?2:['evasive','poison','cleanse','ninjutsu','nanite','flight','grim'].includes(key)?3:1;
const grantStatus = (p,key,amount=1)=>{
 if(key==='regenerate'){druid.regenerate(p,amount);return;}
 if(key==='regenerate1'){p.regenerate1=(p.regenerate1??0)+Math.min(amount,2-druid.regenTotal(p));return;}
 const prior=p[key]||0, cap=statusCap(p,key);
 p[key]=cap>1?bounded(prior+amount,cap):true;
 if(key==='chi')p.chiFresh=(p.chiFresh??0)+p.chi-prior;
};
const removeStatus = (p,key)=>{p[key]=statusCap(p,key)>1?Math.max(0,(p[key]||0)-1):false;if(key==='shadows')p.shadowsStarted=false;if(key==='chi')p.chiFresh=Math.max(0,(p.chiFresh??0)-1);};

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
 p.deck=shuffle(Array.from({length:includePromo?promoId:promoId-1},(_,i)=>i+1),random);
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
const shadowAvoids=(s)=>!!s.players[1-s.active].shadows&&!s.pending?.ultimate;
const incomingDamage=s=>shadowAvoids(s)?0:(s.pending?.damage??0);
const upkeepDamage=(p,seat)=>(p.burn?2:0)+(p.poison??0)+(p.pirateCoins?.[1-seat]??0);
const reducedDamage=(amount,halves=0)=>Math.max(0,amount-halves*Math.ceil(amount/2));
const upkeepIncoming=s=>reducedDamage(upkeepDamage(s.players[s.active],s.active)-(s.upkeepPrevention??0),s.upkeepProtect);
function reviveNecromancer(p){
 if(!p.resurrect||p.hp>0)return false;
 p.hp=5;
 p.resurrect=false;
 p.resurrected=true;
 p.cp=0;
 if(Array.isArray(p.hand)){p.discard.push(...p.hand);p.hand=[];}
 return true;
}
function takeDamage(player,damage) {
 const saved=damage>=player.hp&&player.blessing;
 player.hp=saved?1:bounded(player.hp-damage,60);
 if(saved)removeStatus(player,'blessing');
 else reviveNecromancer(player);
 return saved;
}
function stealNecroHealth(s,seat,amount){
 if(!amount)return false;
 const victim=s.players[1-seat], thief=s.players[seat], names=heroNames(s);
 const stolen=Math.min(victim.hp,amount);
 takeDamage(victim,stolen);
 thief.hp=bounded(thief.hp+stolen,60);
 s.log.unshift(`${names[seat]} steals ${stolen} Health.`);
 if(victim.hp)return false;
 s.stage='finished';
 s.winner=`${names[seat]} wins`;
 s.log.unshift(s.winner);
 return true;
}
const attackLocked=s=>s.pending?.ultimate&&['forgeSearch','forgeAbility'].includes(s.stage)||s.pending?.ultimate&&s.stage==='duelMove'||s.ravenActivation?.locked||s.pending?.ultimate&&['ravenAbility','prey','druidReady'].includes(s.stage)||s.undeadRoll?.resume==='locked'||s.stage==='undeadRemove'&&s.undeadResume==='locked'||s.stage==='locked'||s.horseRoll?.resume==='locked'||s.gunReload?.resume==='locked'||s.artRoll?.resume==='locked'||s.seraphRoll?.resume==='locked'||s.stage==='sideDamage'&&s.sideDamage.resume==='locked'||s.ninjutsuReturnStage==='locked'||s.pending?.ultimate&&['sneakOffer','growSpirits','evasion'].includes(s.stage);
const rollPhase=s=>s.mesmerizeRoll?.resume!=='upkeep'&&s.artRoll?.resume!=='upkeep'&&s.evasionReturnStage!=='upkeep'&&(s.evasionReturnStage!=='sideDamage'||s.sideDamage?.source==='Barbed Vine')&&['offence','announce','blind','effect','effectResponse','defence','defenceResponse','damage','evasion','postHit','targeting','combustion','pickpocket','sneakOffer','sneakRoll','monkChoice','ninjaGain','ninjutsuRoll','ninjutsuChoice','pirateKegRoll','artRoll','seraphRoll','mesmerizeRoll','gunContest','gunReload','gunDuelChoice','horseRoll','undeadRoll','necroChoice','horrifyChoice','samuraiRoll','vampireChoice','seraphTarget','purify','dryadResponse','spiritPayment','overgrowthWells','prey','druidReady','guardBreakRoll','guardOffer'].includes(s.stage);
function rollContext(s) {
 if(s.mesmerizeRoll&&!s.mesmerizeRoll.choosing)return {dice:s.mesmerizeRoll.dice,seat:s.mesmerizeRoll.seat};
 if(s.guardBreakRoll&&!s.cardRoll)return {dice:s.guardBreakRoll,seat:s.active};
 if(s.woundRoll&&!s.cardRoll)return {dice:s.woundRoll,seat:s.active};
 if(s.nevermoreRoll&&!s.cardRoll)return {dice:s.nevermoreRoll.dice,seat:s.nevermoreRoll.target};
 if(s.preyRoll&&!s.cardRoll)return {dice:s.preyRoll,seat:s.active};
 if(s.bleedRoll&&!s.cardRoll)return {dice:s.bleedRoll,seat:s.active};
 if(s.cardRoll) return {dice:s.cardRoll.dice,seat:s.cardRoll.seat};
 if(s.stage==='gunReload')return {dice:s.gunReload.dice,seat:s.gunReload.seat};
 if(s.stage==='gunContest')return {dice:s.gunContest.dice,seat:s.gunContest.seat,owners:[s.gunContest.seat,1-s.gunContest.seat]};
 if(s.stage==='undeadRoll')return {dice:s.undeadRoll.dice,seat:s.undeadRoll.seat};
 if(s.stage==='horseRoll')return {dice:s.horseRoll.dice,seat:s.horseRoll.seat};
 if(s.stage==='samuraiRoll')return {dice:s.samuraiRoll.dice,seat:s.samuraiRoll.seat};
 if(s.seraphRoll)return {dice:s.seraphRoll.dice,seat:s.seraphRoll.seat};
 if(s.artRoll) return {dice:s.artRoll.dice,seat:s.artRoll.seat};
 if(['offence','announce'].includes(s.stage) && s.dice.length) return {dice:s.dice,seat:s.active};
 if(['blind','pirateKegRoll'].includes(s.stage)) return {dice:[s.effectDie],seat:s.active,scalar:true};
 if(s.stage==='sneakRoll'||s.stage==='ninjutsuRoll') return {dice:[s.effectDie],seat:s.active,scalar:true};
 if(s.stage==='evasion') return {dice:[s.effectDie],seat:s.evasionSeat??1-s.active,scalar:true};
 if(s.stage==='effectResponse') return {dice:s.pending.effectDice,seat:s.active};
 if(s.stage==='defenceResponse') return {dice:s.defenceDice,seat:1-s.active};
 return null;
}
const dieOwner=(ctx,index)=>ctx?.owners?.[index]??ctx?.seat;
function diceOwnedBy(ctx,seat){
 if(!ctx)return [];
 if(!ctx.owners)return ctx.seat===seat?ctx.dice:[];
 const dice=[];
 ctx.dice.forEach((value,index)=>{if(dieOwner(ctx,index)===seat)dice[index]=value;});
 return dice;
}
function cardChoices(s,seat,id) {
 const p=s.players[seat], hero=heroId(s,seat), names=heroNames(s);
 if(!s.cards || s.forgeTask || s.retry || s.growth || s.mainChoice || s.pirateChoice || s.bloodOverflow || s.honorOverflow || s.grimOverflow || s.tacticalOverflow || s.tacticalRemoval || s.mesmerizeRoll?.choosing || ['artSpanner','artBuild','artFreeBots'].includes(s.stage) || !p.hand.includes(id) ||['finished','discard','nyraDamage','petulant','paleMoonChoice'].includes(s.stage)) return [];
 const c=seatCard(s,seat,id), d=rollContext(s);
 if(c.phase==='ore')return [];
 if(s.sideDamage?.endTurn&&c.phase!=='instant')return [];
 if(price(s,seat,id)>p.cp) return [];
 if(s.mesmerizeRoll&&![5,6,8,9,11,12,13,14,16,18].includes(id))return [];
 if(s.cardRoll && !(hero===headlessHorseman.id&&[31,32].includes(id))&&!(hero===huntress.id&&id===28)&&!(hero===tactician.id&&id===32)&&!(hero===artificer.id&&[28,29].includes(id)) && !([8,9].includes(id) || (c.phase==='roll' && rollPhase(s) && ([11,12,13,14,16,18].includes(id)||hero===3&&id===29||hero===cursedPirate.id&&id===29)))) return [];
 if(attackLocked(s) && (seat!==s.active || s.pending.ultimate && ![5,6,9,30,31].includes(id)&&!(hero===vampireLord.id&&[32,33].includes(id))&&!(hero===gunslinger.id&&id===27)&&!(hero===samurai.id&&id===28)&&!(hero===tactician.id&&id===32)&&!(hero===huntress.id&&[28,29].includes(id))&&!(hero===headlessHorseman.id&&[27,31,32].includes(id))&&!(hero===necromancer.id&&[32,33].includes(id))&&!(hero===paleLady.id&&[19,20,21,23].includes(id))&&!(hero===raveness.id&&[29,30,31].includes(id))&&!(hero===druid.id&&[27,32].includes(id))&&!(hero===duelist.id&&[28,29,30].includes(id)) && !(hero===2&&id===32) && !(hero===6&&id===28&&s.stage==='locked')&&!(hero===7&&id===31&&s.stage==='locked')&&!(hero===cursedPirate.id&&[30,31,32,33].includes(id)&&s.stage==='locked')&&!(id===10&&vineDamage(s)))) return [];
 if(c.phase==='roll' && !rollPhase(s) && !((s.stage==='locked'||s.gunReload)&&seat===s.active) && !(id===10&&s.stage==='sideDamage'&&['Barbed Vine','Powder Keg','Swashbuckle!','Scurvy!','Cursed Cards!','Nanobot','Ravage!','Absorb Vitality'].includes(s.sideDamage.source))) return [];
 if(['main','upgrade'].includes(c.phase) && (!isMain(s)||seat!==s.active||s.cardRoll||s.mainAction||s.ravenFeathers||s.shapeOverflow)) return [];
 if(c.phase==='upgrade' && p.upgrades[c.slot] && seatCard(s,seat,p.upgrades[c.slot]).level>=c.level)return [];
 const one=[{label:'Play'}];
 const heroes=names.map((name,target)=>({label:name,target}));
 const statuses=heroes.flatMap(({target,label})=>statusKeys.filter(key=>s.players[target][key]).map(status=>({label:`${label} · ${statusLabel(status)}`,target,status})));
 const pos=d?.dice.map((value,i)=>({value,i,label:d.owners?`${names[dieOwner(d,i)]}’s die (${value})`:`die ${i+1} (${value})`}))??[];
 const ownDice=pos.filter(die=>dieOwner(d,die.i)===seat);
 const flips=pos.flatMap(({i,label,value})=>[1,2,3,4,5,6].filter(v=>v!==value).map(v=>({label:`${label} → ${v}`,i,v})));
 if(id===1)return statuses.filter(x=>!['holyPresence','hex'].includes(x.status))
   .filter(x=>!x.status.startsWith('regenerate')||druid.regenTotal(s.players[1-x.target])<2).filter(x=>statusCap(s.players[1-x.target],x.status)===1||!s.players[1-x.target][x.status]||s.players[1-x.target][x.status]<statusCap(s.players[1-x.target],x.status)).map(x=>({...x,label:`${x.label} → ${names[1-x.target]}`}));
 if(id===2)return heroes.filter(x=>statusKeys.some(k=>s.players[x.target][k]));
 if(id===4||id===7)return statuses.flatMap(choice=>{
   if(choice.status!=='prey'||choice.target===s.active||!s.pending?.preyBonuses?.length)return [choice];
   const bonuses=[...s.pending.preyBonuses,...Array(Math.max(0,s.players[choice.target].prey-s.pending.preyBonuses.length)).fill(0)];
   return bonuses.flatMap((bonus,index)=>bonuses.indexOf(bonus)===index?
     [{...choice,preyIndex:index,label:`${choice.label} · ${bonus?'+ '+bonus+' damage':'no bonus'}`}]:[]);
 });
 if(id===8)return flips.filter(f=>dieValue(pos[f.i].value,s.players[dieOwner(d,f.i)])&&Math.abs(f.v-pos[f.i].value)===1);
 if(id===10){
  if(s.stage==='sideDamage'&&['Barbed Vine','Powder Keg','Swashbuckle!','Scurvy!','Cursed Cards!','Nanobot','Ravage!','Absorb Vitality'].includes(s.sideDamage.source))return heroes.filter(x=>x.target===s.sideDamage.seat&&sideIncoming(s.sideDamage)>0);
  if(s.stage==='locked'&&vineDamage(s))return heroes.filter(x=>x.target===s.active&&returnDamageFor(s)>0);
  return s.stage==='damage'?heroes.filter(x=>(x.target===s.active?returnDamageFor(s):incomingDamage(s))>0):[];
 }
 if(id===11||hero===3&&id===29&&p.shadows)return [...flips,...flips.flatMap(first=>flips.filter(second=>second.i>first.i).map(second=>({label:`${first.label}, ${second.label}`,i:first.i,v:first.v,j:second.i,w:second.v})))];
 if(id===12)return ownDice.flatMap(first=>[{label:`Reroll ${first.label} first`,i:first.i},...ownDice.filter(second=>second.i>first.i).map(second=>({label:`Reroll ${first.label} and ${second.label} together`,i:first.i,j:second.i}))]);
 if(id===13||hero===3&&id===29)return flips;
 if(id===14)return ownDice.flatMap(first=>ownDice.filter(second=>first.value!==second.value&&dieValue(second.value,p)).map(second=>({label:`Set ${first.label} to ${second.label}`,i:first.i,v:second.value})));
 if(id===15)return ['offence','announce'].includes(s.stage)?[{label:names[s.active]}]:[];
 if(id===16)return pos.filter(die=>dieOwner(d,die.i)!==seat);
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
 return heroRoster[hero].cardChoices?.(id,{s,seat,pos,d,one,heroTargets:heroes})??one;
}

const attackReduction=p=>Math.min((p.witherReduction??0)+(p.shameReduction??0)+(p.decrepReduction??0),
 Math.max(0,p.grossDamage-(p.collateral??0)));
const modifiedAttackDamage=p=>Math.max(0,p.grossDamage-(p.collateral??0)-attackReduction(p));
const damageSubtotal=p=>Math.max(0,p.grossDamage-(p.prevention??0)-attackReduction(p));
function updateDamage(p) {
 p.damage=p.evaded||p.parlayBlocked?0:reducedDamage(damageSubtotal(p),Number(!!p.halfDefence)+Number(!!p.blindingHalf)+(p.protect??0));
}
function removeBountyBonus(s,seat){
 const hit=s.pending;
 if(seat===s.active||!hit?.bountyBonus||s.players[seat].bounty||['postHit','main','main1','discard','finished'].includes(s.stage))return;
 hit.bountyBonus=false;
 hit.grossDamage--;
 updateDamage(hit);
}
function removeMatchStatus(s,seat,key){
 const player=s.players[seat], hit=s.pending;
 if(!statusKeys.includes(key)||!player[key])return;
 removeStatus(player,key);
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
 if(!s.players[seat].flight||s.seraphRoll||hit?.ultimate||hit?.parlayBlocked)return null;
 if(seat===s.active&&!s.offenceFlight&&!hit?.undefendable&&
    (s.stage==='offence'||s.stage==='announce'||s.stage==='targeting'||
     s.stage==='effect'||s.stage==='effectResponse'||s.stage==='defence'&&hit.attack))return 'attack';
 if(!hit)return null;
 if(seat!==s.active&&['defence','defenceResponse','damage','purify'].includes(s.stage)&&incomingDamage(s)>0)return 'defence';
 return null;
};
const retributionDamage=p=>p.retribution&&!p.evaded&&!p.shadowAvoided?Math.ceil(damageSubtotal(p)/2):0;
const returnIncoming=p=>p.returnEvaded?0:reducedDamage(
 p.returnDamage+(p.necroReturn??0)+(p.disengageDamage??0)+(p.backStrikeDamage??0)+(p.artSelfDamage??0)+(p.vineDamage??0)+(p.absolutionReturn??0)+retributionDamage(p)+(p.damage>0?(p.recoil??0):0)-(p.returnPrevention??0),p.returnProtect);
const sideIncoming=p=>p.evaded?0:reducedDamage(p.amount-(p.prevention??0),p.protect);
function startSideDamage(s,seat,amount,source,endTurn=false,extra={}){
 const parent=s.sideDamage;
 if(!extra.keepPending&&!parent)s.pending=null;
 s.sideDamage={seat,amount,source,endTurn,resume:s.stage,...extra};
 if(parent)s.sideDamage.parent=parent;
 s.stage='sideDamage';
}
function flushPowderKegs(state) {
 if(state.sideDamage || state.stage==='finished' || !state.powderExplosions?.length) return state;
 startSideDamage(state,state.powderExplosions.shift(),3,'Powder Keg',false,{keepPending:true});
 return state;
}
function grantPirateStatus(state,seat,status,afterRoll=false) {
 const player=state.players[seat];
 if(status==='powderKeg' && player.powderKeg) {
  if(afterRoll)(state.rollPowderExplosions??=[]).push(seat);
  else (state.powderExplosions??=[]).push(seat);
 }
 if(afterRoll&&['defence','defenceResponse'].includes(state.stage))
  grantAttackStatus(state,player,status);
 else grantStatus(player,status);
}
const vineDamage=s=>s.players[s.active].barbed?(s.vineAttempts??0):0;
const returnDamageFor=s=>returnIncoming({...s.pending,damage:incomingDamage(s),shadowAvoided:shadowAvoids(s),vineDamage:vineDamage(s)});
const titheDrawCost=p=>p.upgrades?.Tithe?2:3;
function titheChoices(s,seat) {
 const p=s.players[seat];
 if(s.bloodOverflow||s.honorOverflow||s.tacticalOverflow||s.tacticalRemoval||s.mesmerizeRoll?.choosing)return {};
 if(!s.cards||heroId(s,seat)!==5||s.retry||s.growth||s.mainChoice||s.pirateChoice||s.mainAction||s.stage==='finished'||
    (seat!==s.active&&attackLocked(s)))return {};
 const ctx=rollContext(s);
 return {draw:p.cp>=titheDrawCost(p)&&(p.deck.length||p.discard.some(id=>id!==s.cardRoll?.id)),
   dice:p.cp>0?diceOwnedBy(ctx,seat):[]};
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
     if(target!==seat||status!=='bloodPower'||total>2)options.push({cost:2,target,status,label:`Remove ${statusLabel(status)} from ${heroNames(s)[target]}`});
   }
 });
 if(total>=3&&!used[3]&&(p.deck.length||p.discard.some(card=>card!==s.cardRoll?.id)))options.push({cost:3,label:'Draw 2 cards'});
 if(total>=4&&!used[4]&&seat===s.active&&(rollPhase(s)||s.stage==='locked')&&s.stage!=='postHit')
   options.push({cost:4,label:'Heal equal to damage dealt by your attack'});
 return options;
}
function gainBloodPower(s,seat,amount){
 if(!amount)return;
 const p=s.players[seat], cap=statusCap(p,'bloodPower');
 if(s.cards&&(p.bloodPower??0)+amount>cap&&bloodPowerChoices(s,seat).length){
   s.bloodOverflow={seat,amount};
 } else grantStatus(p,'bloodPower',amount);
}
const canMesmerize=(s,seat)=>s.cards&&!s.retry&&!s.mesmerizeRoll&&!s.bloodOverflow&&!s.honorOverflow&&
 s.players[seat].mesmerize&&(seat===s.active||!attackLocked(s))&&diceOwnedBy(rollContext(s),1-seat).length>0;
const handPlays=(s,seat)=>!s.cards?[]:s.players[seat].hand.filter(id=>cardChoices(s,seat,id).length);
function tokenChoices(s,seat) {
 const p=s.players[seat], hit=s.pending;
 const active=seat===s.active;
 const options={flight:null,cleanse:[],boost:0,prevent:0,crit:false,accuracy:false,protect:false,retribution:false,smoke:false,ninjutsu:false,evadeSide:false,seedling:[],sapling:false,saplingDraw:false,dryad:false,dryadPrevent:[],wellspring:false};
 if(!s.cards||s.retry||s.growth||s.mainChoice||s.pirateChoice||s.bloodOverflow||s.honorOverflow||s.mesmerizeRoll?.choosing||
    ['finished','discard'].includes(s.stage)||
    (seat!==s.active&&attackLocked(s)))return options;
 const ctx=rollContext(s);
 if(canSpendSpirit(p,'seedling')&&!attackLocked(s))options.seedling=diceOwnedBy(ctx,seat);
 options.sapling=canSpendSpirit(p,'sapling');
 options.saplingDraw=!!(options.sapling&&p.cp&&(p.deck.length||p.discard.some(id=>id!==s.cardRoll?.id)));
 if(s.cardRoll)return options;
 options.wellspring=!!(p.wellspring&&active&&isMain(s)&&!s.mainAction);
 options.dryad=canSpendSpirit(p,'dryad')&&active&&hit&&!hit.pure&&!hit.evaded&&
   (hit.attack??(hit.abilityDamage>0))&&['targeting','spiritPayment','overgrowthWells','defence','defenceResponse','damage','locked'].includes(s.stage);
 if(canSpendSpirit(p,'dryad')&&!active&&s.stage==='dryadResponse')
  options.dryadPrevent=negativeStatuses.filter(key=>key!=='hex'&&hit[key]&&!hit.dryadBlocked?.includes(key));
 options.flight=flightMode(s,seat);
 if(p.cleanse)options.cleanse=statusKeys.filter(key=>key!=='cleanse'&&p[key]);
 const damageWindow=(['defence','defenceResponse','damage'].includes(s.stage)||s.stage==='purify'&&hit.attack);
 options.accuracy=!!(p.accuracy&&active&&s.stage==='targeting'&&hit.damage>0&&!hit.pure&&!hit.undefendable);
 options.crit=!!(p.crit&&active&&hit&&!hit.pure&&!hit.evaded&&hit.abilityDamage>=5&&
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
 return diceOwnedBy(rollContext(s),seat);
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
 diceOwnedBy(context,seat).forEach((value,index)=>options.push({kind:'reroll',cost:1,index,label:`Reroll die ${index+1} (${value})`}));
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
       if(['holyPresence','hex'].includes(status)||status.startsWith('regenerate')&&druid.regenTotal(receiver)>=2||!player[status]||balance>=statusCap(receiver,status))continue;
       if(status==='tactical'&&from===seat&&p.tactical===4)continue;
       options.push({kind:'transfer',cost:4,from,status,label:`Transfer ${statusLabel(status)} from ${names[from]} to ${names[1-from]}`});
     }
   });
 }
 return options;
}
function gainTactical(s,seat,amount){
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
   case 'cp': p.cp=bounded(p.cp+1,15);break;
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
const hasResponse=(s,seat)=>{
 const tokens=tokenChoices(s,seat);
 const tithe=titheChoices(s,seat);
 return !!(forgemaster.choices(s,seat).some(option=>!['craft','deposit'].includes(option.kind))||druid.shiftChoices(s,seat).length||necroActions(s,seat).length||grimChoices(s,seat).length||raveness.featherChoices(s,seat).some(option=>option.kind==='activate')||canHealNyra(s,seat)||nyraRerolls(s,seat).length||tacticalChoices(s,seat).length||honorChoices(s,seat)||canBackStrike(s,seat)||canReload(s,seat)||canMesmerize(s,seat)||bloodPowerChoices(s,seat).length||artificerActions(s,seat).length||handPlays(s,seat).length||tokens.flight||tokens.cleanse.length||tokens.boost||tokens.prevent||tokens.crit||
   tokens.accuracy||tokens.protect||tokens.retribution||tokens.smoke||tokens.ninjutsu||tokens.evadeSide||tokens.seedling.length||tokens.sapling||tokens.dryad||tokens.dryadPrevent.length||tokens.wellspring||tithe.draw||tithe.dice?.length||
   s.stage==='damage'&&s.players[seat].evasive&&(seat===s.active?returnDamageFor(s):incomingDamage(s))>0&&!s.cardRoll);
};
const cardActor=s=>s.grimOverflow?.seat??(s.stage==='nyraDamage'?1-s.active:s.tacticalOverflow?.seat??s.tacticalRemoval?.seat??s.honorOverflow?.seat??s.bloodOverflow?.seat??s.response?.seat??(s.cards&&s.stage==='damage'&&!s.cardRoll&&!s.retry&&hasResponse(s,s.active)?s.active:actor(s)));
const isSelling=s=>s.cards&&!s.forgeTask&&!s.shapeOverflow&&!s.ravenFeathers && (isMain(s)||s.stage==='discard')&&!s.mainAction&&!s.mainChoice&&!s.cardRoll&&!s.artRoll&&!s.bloodOverflow&&!s.honorOverflow&&!s.tacticalOverflow&&!s.tacticalRemoval&&!s.retry&&!s.response;
function grantAttackStatus(s,defender,key,amount=1){
 const p=s.pending;
 if(['defence','defenceResponse'].includes(s.stage) && !p.incomingStatus.includes(key)){
  p.incomingStatus.push(key);
  p.priorStatus[key]=defender[key]||0;
 }
 grantStatus(defender,key,amount);
}
function completeCardRoll(s,roll,random,add){
 const {id,seat,dice:rawDice,target}=s.cardRoll;
 const hero=heroId(s,seat),p=s.players[seat],opponent=s.players[1-seat],dice=effectiveDice(rawDice,p),counts=tally(dice,hero),hit=s.pending;
 s.cardRoll=null;
 if(id===null){
  const heal=Math.ceil(dice[0]/2);
  p.hp=bounded(p.hp+heal,60);
  add(`Wellspring rolls ${dice[0]} and heals ${heal}.`);
  return;
 }
 const rules = heroRoster[hero];
 if (id === 3) p.cp = bounded(p.cp + Math.ceil(dice[0] / 2), 15);
 if (rules.resolveCardRoll?.({id,dice,p,opponent,counts,hit,s,seat,target,bounded,updateDamage,grantStatus,gainBloodPower,gainTactical,gainGrim,stealNecroHealth,grantAttackStatus,queueGrowth,startSideDamage,grantPirateStatus,drawCards,discardRandom,random})) return;
 if (id === (rules.promoId??33) &&hero!==cursedPirate.id&&hero!==artificer.id&&hero!==seraph.id&&hero!==vampireLord.id&&hero!==gunslinger.id&&hero!==samurai.id&&hero!==tactician.id&&hero!==huntress.id&&hero!==headlessHorseman.id&&hero!==necromancer.id&&hero!==paleLady.id&&hero!==raveness.id&&hero!==druid.id&&hero!==duelist.id&&hero!==forgemaster.id) {
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
function applyCard(s,seat,id,choice,roll,random,add) {
 const hero=heroId(s,seat),names=heroNames(s),p=s.players[seat],c=seatCard(s,seat,id),opponent=s.players[1-seat];
 if(c.phase==='upgrade'){
  if(p.upgrades[c.slot]){
   p.coveredUpgrades??=[];
   p.coveredUpgrades.push(p.upgrades[c.slot]);
  }
  p.upgrades[c.slot]=id;
  return;
 }
 if([1,4,7].includes(id)){
  if(!s.players[choice.target][choice.status])return;
  if(id===7&&choice.status==='tactical'&&seat!==s.active&&choice.target===s.active&&tacticalChoices(s,choice.target).length){
   s.tacticalRemoval={seat:choice.target};
   return;
  }
  if(choice.status==='constrict'&&choice.target===s.active)delete s.wasConstricted;
  if(choice.status==='decrepify'&&choice.target===s.active)delete s.wasDecrepified;
  removeStatus(s.players[choice.target],choice.status);
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
   const player=s.players[choice.target];
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
 const rollSize = id === 3 || id === 33 && hero!==cursedPirate.id && hero!==artificer.id && hero!==seraph.id && hero!==vampireLord.id && hero!==gunslinger.id && hero!==samurai.id && hero!==tactician.id && hero!==huntress.id && hero!==headlessHorseman.id && hero!==necromancer.id&&hero!==paleLady.id&&hero!==raveness.id&&hero!==druid.id&&hero!==duelist.id&&hero!==forgemaster.id ? 1 : rules.cardRollSize?.(id) ?? 0;
 if(rollSize){
  s.cardRoll={seat,id,dice:Array.from({length:rollSize},()=>roll()),ninjaRerolls:hero===6&&id===28||hero===paleLady.id&&id===20?5:0};
  if(hero===gunslinger.id&&id===30||hero===huntress.id&&id===32)s.cardRoll.target=choice.target;
  // During an Ultimate, the ability's dice and subsidiary rolls are final.
  if(s.stage==='locked'&&s.pending.ultimate&&!(hero===6&&id===28)&&!(hero===paleLady.id&&id===20))completeCardRoll(s,roll,random,add);
  return;
 }
 if(id===5||id===6){drawCards(p,id===5?3:2,random,id);return;}
 if(id===9){p.cp=bounded(p.cp+2,15);return;}
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
 if(s.stage==='announce'&&!s.cardRoll&&ctx.dice===s.dice&&ctx.dice.some((value,i)=>value!==before[i])){
  s.pending=null;
  s.stage='offence';
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
 p.hand.splice(p.hand.indexOf(id),1);
 if(c.phase!=='upgrade')p.discard.push(id);
 add(`${names[seat]} plays ${c.name}.`);
 if(c.phase==='main'&&([1,2,3,4,29,33].includes(id)||heroId(s,seat)===seraph.id&&id===30||heroId(s,seat)===vampireLord.id&&[28,30,34].includes(id)||heroId(s,seat)===gunslinger.id&&[28,30].includes(id)||heroId(s,seat)===samurai.id&&[29,31,32].includes(id)||heroId(s,seat)===tactician.id&&id===28||heroId(s,seat)===huntress.id&&[31,32].includes(id)||heroId(s,seat)===3&&[27,32].includes(id)||heroId(s,seat)===4&&id===30||heroId(s,seat)===5&&[30,31].includes(id)||heroId(s,seat)===6&&id===27||heroId(s,seat)===cursedPirate.id&&[19,20,21,24,25,26,27,28,34].includes(id))&&hasResponse(s,1-seat))
  s.mainAction={seat,id,choice};
 else applyCard(s,seat,id,choice,roll,random,add);
}

const bounded = (v, cap) => Math.min(cap, Math.max(0, v));
const sets=[{name:'Season One ReRolled',heroes:[0,1,2,3,4,5,6,7]},{name:'Season Two',heroes:[cursedPirate.id,artificer.id,seraph.id,vampireLord.id,gunslinger.id,samurai.id,tactician.id,huntress.id]},{name:'Outcasts',heroes:[headlessHorseman.id,necromancer.id,paleLady.id,raveness.id]},{name:'Vanguard',heroes:[druid.id,duelist.id,forgemaster.id]}];
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
    state.stage=[7,artificer.id,gunslinger.id,headlessHorseman.id,necromancer.id,paleLady.id,duelist.id,forgemaster.id].includes(heroId(state,active))?'upkeep':'main1';
    state.income={skipped:'first-turn'};
    state.players.forEach((p,i)=>{
      heroRoster[heroId(state,i)].initialize?.(state,i);
      if(heroId(state,i)===samurai.id&&i===active){
        grantStatus(p,'honor');
        state.log.unshift(`${names[i]} gains Honor for starting the match.`);
      }
      cardsFor(i,p,state.promo,options.random??Math.random);
    });
  }
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
function qualifies(ability, dice, seat) {
  if (ability.straight) return hasStraight(dice,ability.straight);
  const counts = tally(dice, seat);
  return Object.entries(ability.symbols).every(([symbol, needed]) => (counts[symbol] ?? 0) >= needed);
}
const ninjutsuLabel=outcome=>({one:'+1 damage',two:'+2 damage',delayedPoison:'Inflict Delayed Poison',undefendable:'Make attack undefendable'}[outcome]);
const ninjutsuOutcomes=s=>['two','delayedPoison',...(!s.pending.undefendable&&!s.pending.ultimate&&!s.defenceDice.length&&
  ['ninjaGain','targeting','sneakOffer','defence'].includes(s.ninjutsuReturnStage)?['undefendable']:[])];
const canRerollMaul=s=>s.pending?.effect==='druidMaul'&&!s.pending.maulRerolled&&s.players[s.active].druidForm==='bear';
function legal(state) {
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
  if(state.growth)return {growSpirit:true,finishGrowth:!!state.growth.original};
  if(state.retry)return {retryDie:true,finishRetry:true};
  if(state.mainChoice)return {resolveMainChoice:true};
  if(state.pirateChoice)return {resolvePirateChoice:true};
  if(state.mesmerizeRoll)return state.mesmerizeRoll.choosing?{rerollMesmerized:true}:{resolveMesmerize:true};
  if(state.bleedRoll&&!state.cardRoll)return {resolveBleed:true};
  if(state.seraphRoll&&!state.cardRoll)return {resolveSeraphRoll:true};
  if(state.artRoll&&!state.cardRoll)return {resolveArtRoll:true};
  if(state.cardRoll)return {finishCardRoll:true,abilityReroll:!!state.cardRoll.ninjaRerolls};
  if(state.mainAction)return {finishMainCard:true};
  if(state.stage==='gunContest')return {resolveGunContest:true,rerollDuel:state.gunContest.kind==='duel'&&!!state.extraDefence};
  if(state.stage==='samuraiRoll')return {resolveBackStrike:true};
  if(state.stage==='gunReload')return {resolveReload:true,rerollReload:!!reloadRerolls(state).length};
  const defender = state.players[1-state.active];
  const prey = state.pending?.preyBonuses?.length<(defender.prey??0)?{reopenPrey:true}:{};
  if(state.shapeOverflow&&state.stage!=='finished')return {collectShapeShift:true};
  if(state.ravenFeathers&&!state.ravenFeathers.spending&&state.stage!=='finished')return {collectFeathers:true};
  switch (state.stage) {
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
      roll: decrepCanRoll(state)&&state.players[state.active].cp>=constrictCost(state)&&state.attempts < state.budget && (!state.dice.length || state.held.some(v => !v)),
      hold: state.attempts < state.budget && state.dice.length > 0,
      declare: abilitiesFor(state,state.active).filter(a => qualifies(a,effectiveDice(state.dice,state.players[state.active]),heroId(state,state.active))).map(a=>a.name),
      end:state.dice.length > 0
    };
    case 'announce': return {accept:true};
    case 'gunDuelChoice': return {chooseDuel:true};
    case 'vampireSearch': return {searchVampireDeck:true};
    case 'vampireChoice': return {chooseVampireBenefit:true};
    case 'seraphTarget': return {chooseSeraphTarget:true};
    case 'purify': return {resolvePurify:true};
    case 'blind': return {resolveBlind:true};
    case 'effect': return {rollEffect:true};
    case 'effectResponse': return {resolveEffect:true,abilityReroll:!!state.pending.ninjaRerolls,effectRetry:canRerollMaul(state)||!!state.pending.effectRetry||!!state.pending.tempestChi&&state.players[state.active].chi>0};
    case 'combustion': return {chooseMastery:true};
    case 'pirateKegRoll': return {resolvePirateKeg:true};
    case 'artSpanner': return {chooseSpanner:true};
    case 'artBuild': return {scratchBuild:true};
    case 'artFreeBots': return {chooseFreeBot:true};
    case 'upkeep': {
      const p=state.players[state.active];
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
function actor(state) {
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
function startSeraphRoll(s,seat,kind,count,roll){
 s.seraphRoll={seat,kind,dice:Array.from({length:count},()=>roll()),resume:s.stage};
 s.stage='seraphRoll';
}
function startArtRoll(s,seat,kind,count,roll) {
 s.artRoll={seat,kind,dice:Array.from({length:count},()=>roll()),resume:s.stage};
 s.stage='artRoll';
}
function transition(previous, action, roll, random=Math.random, bypassResponse=false){
 const next=transitionCore(previous,action,roll,random,bypassResponse);
 if(next!==previous)next.players.forEach((player,seat)=>{
   if(next.stage==='finished'&&player.nevermoreSeat!==undefined){
     if(!player.hp)delete player.nevermoreSeat;
     else if(!next.players[player.nevermoreSeat].hp)raveness.move(next,seat,seat);
   }
   if(!player.resurrected)return;
   player.cp=0;
   if(previous.players[seat].resurrect&&!player.resurrect)next.log.unshift(`${heroNames(next)[seat]} returns with 5 Health through Resurrect.`);
 });
 return next;
}
function transitionCore(previous, action, roll, random, bypassResponse) {
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
        if(kind==='cp')p.cp=bounded(p.cp+1,15);
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
        s.horseRoll={seat,dice:Array.from({length:5},()=>roll()),resume:s.stage};
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
      else if(option.cost===2)removeMatchStatus(s,option.target,option.status);
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
        else {p.hp=bounded(p.hp+1,60);p.cp=bounded(p.cp+1,15);}
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
        removeStatus(p,'cleanse');removeStatus(p,action.status);
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
      const choice=cardChoices(previous,seat,action.id)[action.choice];
      if(!choice)return previous;
      const state=structuredClone(previous);
      state.response=null;
      playOneCard(state,seat,action.id,choice,roll,random,message=>state.log.unshift(message));
      return flushPowderKegs(state);
    }
    if(action.type==='sell'){
      if(!isSelling(previous)||!previous.players[previous.active].hand.includes(action.id))return previous;
      const state=structuredClone(previous),p=state.players[state.active];
      p.hand.splice(p.hand.indexOf(action.id),1);p.discard.push(action.id);p.cp=bounded(p.cp+1,15);
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
    const responseActions=['begin','endMain','accept','resolveBlind','resolveEffect','resolveGuardBreak','resolveDisarm','rollPrey','resolvePrey','resolveTarget','resolveDefence','settle','resolveEvade','finishCardRoll','continueHit','defend','skipDefence','resolveUpkeep','resolveSeraphRoll','resolvePurify','resolveGunContest','resolveReload','resolveGrimRoll','resolveUndead','resolveBackStrike','chooseDuel','resolveMesmerize','resolveBleed','resolveNevermore','checkWound','resolveWound','checkRegenerate','activateNevermore','finishRavenAbility','resolveArtRoll','resolvePirateKeg','chooseMastery','payKnockdown','skipKnockdown','resolveSneak','chooseStolenCP','skipSneak','next','resolveNinjutsu','resolveSideDamage','end' ];
    if(!bypassResponse && action.type==='evade' && legal(previous).evade && hasResponse(previous,previous.active)){
      return {...previous,response:{seat:previous.active,action}};
    }
    const mesmerizeOffence=['roll','end'].includes(action.type)&&canMesmerize(previous,1-seat);
    if(!bypassResponse && previous.stage!=='nyraDamage' && legal(previous)[action.type] && (mesmerizeOffence||responseActions.includes(action.type)) &&
       (action.type!=='end'||vineDamage(previous)>0||mesmerizeOffence)&&!attackLocked(previous) && hasResponse(previous,1-seat)){
      return {...previous,response:{seat:1-seat,action}};
    }
  }
  const allowed = legal(previous)[action.type];
  if (!allowed || (action.type === 'declare' && !allowed.includes(action.ability)) ||
      (action.type === 'hold' && (!Number.isInteger(action.index) || action.index < 0 || action.index >= previous.dice.length))) return previous;
  const state = structuredClone(previous);
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
  function startRoll(player) {
    Object.assign(state,{stage:player.knockdown?'knockdown':'offence',dice:[],held:[],defenceDice:[],attempts:0,defenceKind:null,
      budget:player.entangle?2:3,wasEntangled:!!player.entangle,extraDefence:0,pending:null,vineAttempts:0});
    if(player.decrepify)state.wasDecrepified=true;
    else delete state.wasDecrepified;
    if(player.constrict)state.wasConstricted=true;
    else delete state.wasConstricted;
  }
  function consumeVine(){
    const damage=vineDamage(state);
    state.vinePaid=(state.vinePaid??0)+damage;
    if(attacker.barbed)removeStatus(attacker,'barbed');
    state.vineAttempts=0;
    return damage;
  }
  function finishRoll(attack=state.pending?.attack) {
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
    if(damage)startSideDamage(state,state.active,damage,'Barbed Vine');
  }
  function gainMastery(p) {
    if(p.masteryCap)attacker.masteryCap=statusCap(attacker,'fireMastery')+p.masteryCap;
    if(p.mastery)grantStatus(attacker,'fireMastery',p.mastery);
    p.mastery=0;p.masteryCap=0;
  }
  function activate() {
    const p = state.pending;
    if(!p.dryadChecked&&!p.ultimate&&!p.stun&&canSpendSpirit(defender,'dryad')&&
       (p.damage>0||p.masteryDamage*(attacker.fireMastery??0)>0)&&negativeStatuses.some(key=>key!=='hex'&&p[key])){
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
    p.abilityDamage??=p.damage;
    p.damage+=p.chiBoost??0;
    p.attack=p.damage>0;
    p.incomingStatus=negativeStatuses.filter(k=>p[k]&&!p.dryadBlocked?.includes(k));
    p.priorStatus=Object.fromEntries(p.incomingStatus.map(k=>[k,defender[k]||0]));
    if(p.jawsTargeted&&p.incomingStatus.includes('prey'))p.priorStatus.prey=p.jawsPrior;
    for(const k of p.incomingStatus){
      if(k==='prey'&&p.jawsTargeted)continue;
      if(k==='prey'&&p.damage>0&&!p.pure&&!attacker.parlay&&defender.prey+p.prey>2)
        p.preyOverflow=p.prey;
      else if(k==='powderKeg')grantPirateStatus(state,1-state.active,k,true);
      else grantStatus(defender,k,k==='delayedPoison'||k==='nanite'||k==='bleed'||k==='shame'||k==='prey'||k==='wound'?p[k]:1);
    }
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
    if(p.attack&&!p.pure&&defender.bounty){
      p.damage++;
      p.bountyBonus=true;
      attacker.cp=bounded(attacker.cp+1,15);
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
    if(p.honorGain){
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
  }
  function enterTargeting(p) {
    gainMastery(p);
    state.stage='targeting';
  }
  function gainTitheCP(p){
    if(!p.titheGain)return;
    p.titheGain=false;
    attacker.cp=bounded(attacker.cp+1,15);
    add(`${names[state.active]} uses Tithe II to gain 1 CP.`);
  }
  function continueOffence(p) {
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
    p.abilityDamage??=p.damage+(p.masteryDamage??0)*(attacker.fireMastery??0);
    const attackExpected=p.damage>0||p.masteryDamage>0;
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
    else if(state.cards&&!p.stun&&!p.ultimate&&!p.showdownTargeted&&!p.jawsTargeted&&(p.damage||p.burn||p.knockdown||p.collateral||p.poison||p.delayedPoison||p.barbed||p.powderKeg||p.wither||p.parlay||p.pirateInflict||p.nanite||p.blindingLight||p.bleed||p.bounty||p.shame||p.constrict||p.decrepify||p.prey||p.hex||p.wound||p.disarm))enterTargeting(p);
    else activate();
  }
  function resolveAbility() {
    const p=state.pending;
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
    if(p.cpGain)attacker.cp=bounded(attacker.cp+p.cpGain,15);
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
  function income(player) {
    if (player.concussion||state.disarmSkip) {
      player.concussion=false;
      const reason=state.disarmSkip?'Disarm':'Concussion';
      state.income={skipped:reason.toLowerCase()};
      delete state.disarmSkip;
      add(`Turn ${state.turn}. ${names[state.active]} skips income due to ${reason}.`);
    } else {
      const previousCP=player.cp;
      if(!player.resurrected)player.cp=bounded(player.cp+1,15);
      const previousHand=state.cards?player.hand.length:player.hand;
      if(state.cards)drawCards(player,1,random);
      else if(player.deck){player.deck--;player.hand=Math.min(6,player.hand+1);}
      const drawn=(state.cards?player.hand.length:player.hand)-previousHand;
      state.income={cp:player.cp-previousCP,drawn};
      add(`Turn ${state.turn}. ${names[state.active]} gains ${state.income.cp} CP and draws ${drawn} ${drawn===1?'card':'cards'} in the Income Phase.`);
    }
    if(player.entangle)add(`${names[state.active]} has one fewer Roll Attempt due to Entangle.`);
    startRoll(player);
    if(state.cards)state.stage='main1';
  }
  function advanceTurn(){
    if(attacker.werewolf){
      if(!attacker.keepMoonShard)attacker.moonShard=Math.max(0,attacker.moonShard-1);
      if(!attacker.moonShard){attacker.werewolf=false;add('Twilight returns Werewolf to Pale Lady.');}
    }
    delete attacker.keepMoonShard;
    if(attacker.druidForm==='druid')druid.regenerate(attacker);
    delete state.regenerateChecked;
    delete state.repositioned;
    delete state.minesChecked;
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
      if(attacker.honor>before)add(`${names[state.active]} gains Honor from Bushido.`);
    }
    if(state.bloodReward){
      delete state.bloodReward;
      grantStatus(attacker,'bloodPower');
      add(`${names[state.active]} gains Blood Power for damaging an opponent with 2 Bleed.`);
    }
    if(attacker.shadowsStarted)removeStatus(attacker,'shadows');
    for(const player of state.players){player.chiFresh=0;player.spentSpirits=[];}
    state.vineAttempts=0;
    state.vinePaid=0;
    state.fertilized=false;
    if(heroId(state,state.active)===cursedPirate.id)cursedPirate.endTurn(state,state.active,add);
    state.active=1-state.active;
    state.turn++;
    const player=state.players[state.active];
    player.shadowsStarted=!!player.shadows;
    if(state.pirateKegChecked)delete state.pirateKegChecked;
    if(state.holyPresenceChecked)delete state.holyPresenceChecked;
    if(state.bleedChecked)delete state.bleedChecked;
    if(state.quickDrawChecked)delete state.quickDrawChecked;
    if(player.disarm||player.wound||druid.regenTotal(player)||nevermoreOwner(state)!==null||upkeepDamage(player,state.active)||player.fireMastery||heroId(state,state.active)===7||player.cursed||player.powderKeg||player.nanite||player.holyPresence||player.bleed||player.nyra?.downed||[artificer.id,gunslinger.id,headlessHorseman.id,necromancer.id,paleLady.id,duelist.id,forgemaster.id].includes(heroId(state,state.active))){
      state.pending=null;
      state.stage='upkeep';
      state.upkeepEvaded=false;state.upkeepPrevention=0;state.upkeepProtect=0;
    } else income(player);
  }
  function finishUpkeep(){
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
      add(`${names[state.active]} takes ${damage} upkeep damage from ${[attacker.burn?'Burn':'',attacker.poison?'Poison':'',cursedPirate.foreignCoins(state,state.active)?'Cursed Doubloon':''].filter(Boolean).join(' and ')}.`);
    }
    state.upkeepEvaded=false;state.upkeepPrevention=0;state.upkeepProtect=0;
    if(attacker.hp){
      if(state.turn===1&&state.income?.skipped==='first-turn')state.stage='main1';
      else income(attacker);
    }
    else {state.stage='finished';state.winner=`${names[1-state.active]} wins`;add(state.winner);}
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
    else if(g.after==='upkeep')finishUpkeep();
    else if(g.collateral)startSideDamage(state,1-g.seat,g.collateral,g.source);
  }
  switch (action.type) {
    case 'forgeUpkeep':
      if(!['mine','skip'].includes(action.status))return previous;
      state.minesChecked=true;
      if(action.status==='mine')forgemaster.beginMine(state,state.active);
      break;
    case 'forgeMineChoice': {
      const task=state.forgeTask, miner=state.players[task.seat];
      let revealed;
      if(action.status==='none'){revealed=[];miner.cp=bounded(miner.cp+1,15);}
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
      target.cp=bounded(target.cp+1,15);
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
      if(face===5){attacker.cp=Math.max(0,attacker.cp-1);p.cp=bounded(p.cp+1,15);}
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
      if(!['crit','accuracy'].includes(action.status))return previous;
      grantStatus(attacker,action.status);
      finishRoll();break;
    case 'chooseMonkReward': {
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
    case 'payKnockdown': attacker.cp-=2;attacker.knockdown=false;startRoll(attacker);break;
    case 'skipKnockdown':
      attacker.knockdown=false;
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
      startRoll(attacker);
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
    case 'resolveUpkeep':
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
        state.bleedRoll=Array.from({length:attacker.bleed},()=>roll());
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
      finishUpkeep();
      break;
    case 'evadeUpkeep':
      state.evasionSeat=state.active;state.evasionReturnStage='upkeep';
      removeStatus(attacker,'evasive');state.effectDie=roll();state.stage='evasion';break;
    case 'chooseMastery': {
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
    case 'begin': startRoll(attacker);break;
    case 'endMain': state.stage='discard';break;
    case 'retryDie':
    case 'finishRetry': {
      const ctx=rollContext(state), {before,seat}=state.retry;
      if(action.type==='retryDie'){
        if(!Number.isInteger(action.index)||action.index<0||action.index>=ctx.dice.length||dieOwner(ctx,action.index)!==seat)return previous;
        ctx.dice[action.index]=roll();
        if(ctx.scalar)state.effectDie=ctx.dice[0];
        add(`${names[seat]} uses the second reroll: ${ctx.dice.join(', ')}.`);
      }
      state.retry=null;
      releaseChangedAnnouncement(state,ctx,before);
      break;
    }
    case 'resolvePetulant': {
      const {seat,resume}=state.petulant, player=state.players[seat], target=state.players[1-seat];
      if(![0,1].includes(action.choice)||action.choice===1&&target.cp<1)return previous;
      if(action.choice===1){target.cp--;player.cp=bounded(player.cp+1,15);}
      else player.werewolf=true;
      state.stage=resume;
      delete state.petulant;
      break;
    }
    case 'paleMoonChoice':
      if(![0,1].includes(action.choice))return previous;
      if(action.choice===0)attacker.cp=bounded(attacker.cp+1,15);
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
        state.gunContest={seat:state.active,kind:'showdown',dice:[roll(),roll()]};
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
      state.dice = Array.from({length:5}, (_,i) => state.held[i] ? state.dice[i] : roll());
      state.held = state.dice.map((_,i)=>Boolean(state.held[i]));
      state.attempts++;
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
      const counts = tally(dice,heroId(state,state.active));
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
      p.effectDice=Array.from({length:effectDiceCount(p,attacker)},()=>roll());
      add(`${p.name} rolls ${p.effectDice.join(', ')} for its effect.`);
      if(state.cards){state.stage='effectResponse';break;}
      // The card-free scenarios resolve effect rolls immediately.
    }
    case 'resolveEffect': {
      const p=state.pending;
      const counts = tally(effectiveDice(p.effectDice,attacker),heroId(state,state.active));
      if(p.effect==='forgeFurnace'){
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
          attacker.cp=bounded(attacker.cp+1,15);
        }
        if(counts.Crescent){state.stage='paleMoonChoice';break;}
      } else if(p.harvest){
        if(counts.Soul){
          necromancer.gain(attacker,1);
          finishRoll(true);
          if(state.stage==='sideDamage')state.sideDamage.resume='tacticalRestart';
          else startRoll(attacker);
          add('Harvest starts an additional Offensive Roll Phase.');
          break;
        }
        if(counts.Bones){necromancer.gain(attacker,p.harvest[1]);drawCards(attacker,1,random);}
        if(counts.Scythe)p.damage=p.harvest[0];
      } else if(p.profiteer){
        if(counts.Medal){
          if(state.cards)drawCards(attacker,1,random);
          finishRoll(true);
          if(state.stage==='sideDamage')state.sideDamage.resume='tacticalRestart';
          else startRoll(attacker);
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
      if(hero===3&&action.defence&& !['shadowDefence','counterStrike'].includes(action.defence))return previous;
      if(hero===gunslinger.id){
        state.defenceKind='defence';
        state.gunContest={seat,kind:'duel',dice:[roll(),roll()]};
        state.stage='gunContest';
        break;
      }
      state.defenceKind=hero===3?(action.defence??'shadowDefence'):'defence';
      const diceCount = heroRoster[hero].defenceDiceCount(defender,state.defenceKind);
      state.defenceDice = Array.from({length:diceCount},()=>roll());
      if(hero===seraph.id&&defender.upgrades?.defence===28)state.pending.seraphDefenceReroll=1;
      if(hero===6)state.pending.ninjaDefenceRerolls=defender.upgrades?.defence?2:1;
      if(state.cards){state.stage='defenceResponse';break;}
    }
    case 'resolveDefence': {
      const seat=1-state.active;
      const counts = tally(effectiveDice(state.defenceDice,defender),heroId(state,seat));
      add(`${names[seat]} rolls ${defenceName(state,seat,state.defenceKind)}: ${state.defenceDice.join(', ')}.`);
      const hero = heroRoster[heroId(state,seat)];
      state.stage = hero.resolveDefence({state,seat,defender,attacker,counts,bounded,grantStatus,removeStatus,gainBloodPower,gainTactical,gainGrim,stealNecroHealth,updateDamage,queueGrowth,add}) ?? 'damage';
      break;
    }
    case 'preventStatus': {
      const p=state.pending;
      if(action.status && !p.incomingStatus.includes(action.status))return previous;
      if(action.status==='powderKeg'&&p.incomingStatus.includes('powderKeg')&&p.priorStatus.powderKeg){
        const explosions=state.rollPowderExplosions??[];
        const i=explosions.lastIndexOf(1-state.active);
        if(i>=0)explosions.splice(i,1);
      }
      if(action.status && (defender[action.status]||0)>p.priorStatus[action.status]){
        removeStatus(defender,action.status);
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
          state.undeadRoll={seat:state.active,dice:Array.from({length:count},()=>roll()),resume:state.stage};
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
      const damage=incomingDamage(state);
      if(heroId(state,state.active)===headlessHorseman.id)p.horseDealtDamage=damage>0;
      if(!damage&&p.damage&&shadowAvoids(state))add(`${names[1-state.active]} avoids the offensive damage with Shadows.`);
      const attackDamage=p.attack?Math.max(0,damage-(p.collateral??0)):0;
      if(attackDamage&&defender.bleed===2&&(heroId(state,state.active)===vampireLord.id||attacker.bloodPower))state.bloodReward=true;
      const defenderDamage=damage-toNyra;
      const defenderSaved=takeDamage(defender,defenderDamage);
      const returnDamage=returnDamageFor(state);
      const vine=consumeVine();
      if(vine)add(`Barbed Vine adds ${vine} to ${names[state.active]}’s incoming damage.`);
      for(const key of p.paladinAfter??[])grantStatus(attacker,key);
      if(p.afterCP)attacker.cp=bounded(attacker.cp+p.afterCP,15);
      if(p.afterChiCap)attacker.chiCap=statusCap(attacker,'chi')+p.afterChiCap;
      if(p.afterChi)grantStatus(attacker,'chi',p.afterChi);
      if(p.afterEvasive)grantStatus(attacker,'evasive',p.afterEvasive);
      if(p.afterShadows){
        grantStatus(attacker,'shadows');grantStatus(attacker,'sneak');
        if(p.draw&&state.cards)drawCards(attacker,p.draw,random);
      }
      const attackerSaved=takeDamage(attacker,returnDamage);
      add(`${names[1-state.active]} takes ${defenderDamage} damage${returnDamage ? ` and ${names[state.active]} takes ${returnDamage}` : ''}.`);
      if(defenderSaved)add(`${names[1-state.active]} survives through Blessing of Divinity.`);
      if(attackerSaved)add(`${names[state.active]} survives through Blessing of Divinity.`);
      if(p.quenched&&attacker.hp&&attackDamage)paleLady.heal(attacker,p.quenched*attacker.moonShard);
      if(state.bloodHealPlanned&&attacker.hp&&attackDamage){
        const before=attacker.hp;
        attacker.hp=bounded(attacker.hp+attackDamage,60);
        add(`${names[state.active]} heals ${attacker.hp-before} with Blood Power.`);
      }
      if (!attacker.hp || !defender.hp) {
        state.stage='finished';
        state.winner=!attacker.hp && !defender.hp ? 'Draw' : `${names[attacker.hp ? state.active : 1-state.active]} wins`;
        add(state.winner);
      } else {
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
          startRoll(attacker);
        }
      }
      break;
    }
    case 'continueHit': finishRoll();break;
    case 'resolveSideDamage': {
      const event=state.sideDamage,receiver=state.players[event.seat],damage=sideIncoming(event);
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
        if(!attacker.hp||!defender.hp){
          state.stage='finished';
          state.winner=!attacker.hp&&!defender.hp?'Draw':`${names[attacker.hp?state.active:1-state.active]} wins`;
          add(state.winner);
        }
        break;
      }
      const saved=takeDamage(receiver,damage);
      add(`${names[event.seat]} takes ${damage} damage from ${event.source}.`);
      if(saved)add(`${names[event.seat]} survives through Blessing of Divinity.`);
      state.sideDamage=event.parent??null;
      if(!receiver.hp){
        state.stage='finished';
        state.winner=`${names[1-event.seat]} wins`;
        add(state.winner);
      } else if(event.endTurn)advanceTurn();
      else {
        state.stage=event.resume;
        if(event.woundCheck){state.woundRoll=[roll()];state.stage='woundRoll';}
        if(event.ravenActivation)finishNevermore(state.ravenActivation);
        if(event.ravage){
          state.cardRoll={seat:event.seat,id:20,dice:Array.from({length:5},()=>roll()),ninjaRerolls:5};
        }
        if(event.terrorize){
          gainGrim(state,state.active,1);
          attacker.cp=bounded(attacker.cp+1,15);
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
      } else advanceTurn();
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
