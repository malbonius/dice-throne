const sharedCards = [
 ['Transference!',2,'main'],['What Status Effects?',2,'main'],['Vegas Baby!',0,'main'],['Get That Outta Here!',1,'main'],
 ['Triple Up!',2,'instant'],['Double Up!',1,'instant'],['Buh, Bye!',2,'instant'],['Tip It!',1,'instant'],['Getting Paid!',0,'instant'],
 ['Not This Time!',1,'roll'],['Twice as Wild!',3,'roll'],['Try, Try Again!',1,'roll'],['So Wild!',2,'roll'],['Samesies!',1,'roll'],
 ['One More Time!',1,'roll'],['Helping Hand!',1,'roll'],['Better D!',0,'roll'],['Six-It!',1,'roll']
];
const heroRoster = [barbarian, moonElf, pyromancer, shadowThief, monk, paladin, ninja, treant, cursedPirate];
const HEROES = heroRoster.map(hero => hero.board);
const abilityEffects = Object.assign({}, ...heroRoster.map(hero => hero.effects));
const abilityEffectDice = Object.assign(
  {}, ...heroRoster.map(hero => hero.effectDiceCount)
);
const cardInfo = (seat,id) => {
 const firstAction=19+heroRoster[seat].upgrades.length;
 if(id>=19 && id<firstAction) {
  const [name,cost,slot,ability,level=2,extra]=heroRoster[seat].upgrades[id-19];
  return {name,cost,slot,ability,level,extra,phase:'upgrade'};
 }
 const [name,cost,phase]=id<=18?sharedCards[id-1]:heroRoster[seat].cards[id-firstAction];
 return {name,cost,phase};
};
const pirateStatuses=['powderKeg','wither','parlay'];
const statusKeys=['blind','entangle','evasive','targeted','concussion','burn','knockdown','fireMastery','poison','shadows','sneak','chi','cleanse','crit','accuracy','protect','retribution','delayedPoison','smoke','ninjutsu','wellspring','barbed',...pirateStatuses];
const negativeStatuses=['entangle','blind','concussion','targeted','burn','knockdown','poison','delayedPoison','barbed',...pirateStatuses];
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
const statusLabel = s=>s==='powderKeg'?'Powder Keg':s==='doubloon'?'Cursed Doubloon':s==='barbed'?'Barbed Vine':s==='smoke'?'Smoke Bomb':s==='delayedPoison'?'Delayed Poison':s==='blessing'?'Blessing of Divinity':s==='fireMastery'?'Fire Mastery':s==='sneak'?'Sneak Attack':s[0].toUpperCase()+s.slice(1);
const statusCap=(p,key)=>key==='chi'?(p.chiCap??5):key==='fireMastery'?(p.masteryCap??5):['delayedPoison','wither'].includes(key)?2:['evasive','poison','cleanse','ninjutsu'].includes(key)?3:1;
const grantStatus = (p,key,amount=1)=>{
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
  const id=equipped[base.name];
  if(!id)return [base];
  const c=seatCard(state,seat,id);
  return [{...base,...c.ability,label:c.name},...(c.extra?[c.extra]:[])];
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
function takeDamage(player,damage) {
 const saved=damage>=player.hp&&player.blessing;
 player.hp=saved?1:bounded(player.hp-damage,60);
 if(saved)removeStatus(player,'blessing');
 return saved;
}
const attackLocked=s=>s.stage==='locked'||s.stage==='sideDamage'&&s.sideDamage.resume==='locked'||s.ninjutsuReturnStage==='locked'||s.pending?.ultimate&&['sneakOffer','growSpirits','evasion'].includes(s.stage);
const rollPhase=s=>s.evasionReturnStage!=='upkeep'&&(s.evasionReturnStage!=='sideDamage'||s.sideDamage?.source==='Barbed Vine')&&['offence','announce','blind','effect','effectResponse','defence','defenceResponse','damage','evasion','postHit','targeting','combustion','pickpocket','sneakOffer','sneakRoll','monkChoice','ninjaGain','ninjutsuRoll','ninjutsuChoice','pirateKegRoll','dryadResponse','spiritPayment','overgrowthWells'].includes(s.stage);
function rollContext(s) {
 if(s.cardRoll) return {dice:s.cardRoll.dice,seat:s.cardRoll.seat};
 if(['offence','announce'].includes(s.stage) && s.dice.length) return {dice:s.dice,seat:s.active};
 if(['blind','pirateKegRoll'].includes(s.stage)) return {dice:[s.effectDie],seat:s.active,scalar:true};
 if(s.stage==='sneakRoll'||s.stage==='ninjutsuRoll') return {dice:[s.effectDie],seat:s.active,scalar:true};
 if(s.stage==='evasion') return {dice:[s.effectDie],seat:s.evasionSeat??1-s.active,scalar:true};
 if(s.stage==='effectResponse') return {dice:s.pending.effectDice,seat:s.active};
 if(s.stage==='defenceResponse') return {dice:s.defenceDice,seat:1-s.active};
 return null;
}
function cardChoices(s,seat,id) {
 const p=s.players[seat], hero=heroId(s,seat), names=heroNames(s);
 if(!s.cards || s.retry || s.growth || s.mainChoice || s.pirateChoice || !p.hand.includes(id) || s.stage==='finished'||s.stage==='discard') return [];
 const c=seatCard(s,seat,id), d=rollContext(s);
 if(s.sideDamage?.endTurn&&c.phase!=='instant')return [];
 if(price(s,seat,id)>p.cp) return [];
 if(s.cardRoll && !([8,9].includes(id) || (c.phase==='roll' && rollPhase(s) && ([11,12,13,14,16,18].includes(id)||hero===3&&id===29||hero===cursedPirate.id&&id===29)))) return [];
 if(attackLocked(s) && (seat!==s.active || s.pending.ultimate && ![5,6,9,30,31].includes(id) && !(hero===2&&id===32) && !(hero===6&&id===28&&s.stage==='locked')&&!(hero===7&&id===31&&s.stage==='locked')&&!(hero===cursedPirate.id&&[30,31,32,33].includes(id)&&s.stage==='locked')&&!(id===10&&vineDamage(s)))) return [];
 if(c.phase==='roll' && !rollPhase(s) && !(s.stage==='locked' && seat===s.active) && !(id===10&&s.stage==='sideDamage'&&['Barbed Vine','Powder Keg','Swashbuckle!','Scurvy!','Cursed Cards!'].includes(s.sideDamage.source))) return [];
 if(['main','upgrade'].includes(c.phase) && (!isMain(s)||seat!==s.active||s.cardRoll||s.mainAction)) return [];
 if(c.phase==='upgrade' && p.upgrades[c.slot] && seatCard(s,seat,p.upgrades[c.slot]).level>=c.level)return [];
 const one=[{label:'Play'}];
 const heroes=names.map((name,target)=>({label:name,target}));
 const statuses=heroes.flatMap(({target,label})=>statusKeys.filter(key=>s.players[target][key]).map(status=>({label:`${label} · ${statusLabel(status)}`,target,status})));
 const pos=d?.dice.map((value,i)=>({value,i,label:`die ${i+1} (${value})`}))??[];
 const ownDice=d?.seat===seat;
 const flips=pos.flatMap(({i,label,value})=>[1,2,3,4,5,6].filter(v=>v!==value).map(v=>({label:`${label} → ${v}`,i,v})));
 if(id===1)return statuses.filter(x=>statusCap(s.players[1-x.target],x.status)===1||!s.players[1-x.target][x.status]||s.players[1-x.target][x.status]<statusCap(s.players[1-x.target],x.status)).map(x=>({...x,label:`${x.label} → ${names[1-x.target]}`}));
 if(id===2)return heroes.filter(x=>statusKeys.some(k=>s.players[x.target][k]));
 if(id===4||id===7)return statuses;
 if(id===8)return flips.filter(f=>Math.abs(f.v-pos[f.i].value)===1);
 if(id===10){
  if(s.stage==='sideDamage'&&['Barbed Vine','Powder Keg','Swashbuckle!','Scurvy!','Cursed Cards!'].includes(s.sideDamage.source))return heroes.filter(x=>x.target===s.sideDamage.seat&&sideIncoming(s.sideDamage)>0);
  if(s.stage==='locked'&&vineDamage(s))return heroes.filter(x=>x.target===s.active&&returnDamageFor(s)>0);
  return s.stage==='damage'?heroes.filter(x=>(x.target===s.active?returnDamageFor(s):incomingDamage(s))>0):[];
 }
 if(id===11||hero===3&&id===29&&p.shadows)return [...flips,...flips.flatMap(first=>flips.filter(second=>second.i>first.i).map(second=>({label:`${first.label}, ${second.label}`,i:first.i,v:first.v,j:second.i,w:second.v})))];
 if(id===12)return ownDice?pos.flatMap(first=>[{label:`Reroll ${first.label} first`,i:first.i},...pos.filter(second=>second.i>first.i).map(second=>({label:`Reroll ${first.label} and ${second.label} together`,i:first.i,j:second.i}))]):[];
 if(id===13||hero===3&&id===29)return flips;
 if(id===14)return ownDice?pos.flatMap(first=>pos.filter(second=>first.value!==second.value).map(second=>({label:`Set ${first.label} to ${second.label}`,i:first.i,v:second.value}))):[];
 if(id===15)return ['offence','announce'].includes(s.stage)?[{label:names[s.active]}]:[];
 if(id===16)return d&&!ownDice?pos:[];
 if(id===17)return s.stage==='defenceResponse'?[{label:names[1-s.active]}]:[];
 if(id===18)return ownDice?flips.filter(f=>f.v===6):[];
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
 return heroRoster[hero].cardChoices?.(id,{s,seat,pos,d,one})??one;
}

const damageSubtotal=p=>{
 const wither=Math.min(p.witherReduction??0,Math.max(0,p.grossDamage-(p.collateral??0)));
 return Math.max(0,p.grossDamage-(p.prevention??0)-wither);
};
function updateDamage(p) {
 p.damage=p.evaded||p.parlayBlocked?0:reducedDamage(damageSubtotal(p),Number(!!p.halfDefence)+(p.protect??0));
}
const retributionDamage=p=>p.retribution&&!p.evaded&&!p.shadowAvoided?Math.ceil(damageSubtotal(p)/2):0;
const returnIncoming=p=>p.returnEvaded?0:reducedDamage(
 p.returnDamage+(p.vineDamage??0)+(p.absolutionReturn??0)+retributionDamage(p)+(p.damage>0?(p.recoil??0):0)-(p.returnPrevention??0),p.returnProtect);
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
 if(!s.cards||heroId(s,seat)!==5||s.retry||s.growth||s.mainChoice||s.pirateChoice||s.mainAction||s.stage==='finished'||
    (seat!==s.active&&attackLocked(s)))return {};
 const ctx=rollContext(s);
 return {draw:p.cp>=titheDrawCost(p)&&(p.deck.length||p.discard.some(id=>id!==s.cardRoll?.id)),
   dice:p.cp>0&&ctx?.seat===seat?ctx.dice:[]};
}
const handPlays=(s,seat)=>!s.cards?[]:s.players[seat].hand.filter(id=>cardChoices(s,seat,id).length);
function tokenChoices(s,seat) {
 const p=s.players[seat], hit=s.pending;
 const active=seat===s.active;
 const options={cleanse:[],boost:0,prevent:0,crit:false,accuracy:false,protect:false,retribution:false,smoke:false,ninjutsu:false,evadeSide:false,seedling:[],sapling:false,saplingDraw:false,dryad:false,dryadPrevent:[],wellspring:false};
 if(!s.cards||s.retry||s.growth||s.mainChoice||s.pirateChoice||
    ['finished','discard'].includes(s.stage)||
    (seat!==s.active&&attackLocked(s)))return options;
 const ctx=rollContext(s);
 if(canSpendSpirit(p,'seedling')&&ctx?.seat===seat&&!attackLocked(s))options.seedling=ctx.dice;
 options.sapling=canSpendSpirit(p,'sapling');
 options.saplingDraw=!!(options.sapling&&p.cp&&(p.deck.length||p.discard.some(id=>id!==s.cardRoll?.id)));
 if(s.cardRoll)return options;
 options.wellspring=!!(p.wellspring&&active&&isMain(s)&&!s.mainAction);
 options.dryad=canSpendSpirit(p,'dryad')&&active&&hit&&!hit.pure&&!hit.evaded&&
   (hit.attack??(hit.abilityDamage>0))&&['targeting','spiritPayment','overgrowthWells','defence','defenceResponse','damage','locked'].includes(s.stage);
 if(canSpendSpirit(p,'dryad')&&!active&&s.stage==='dryadResponse')
  options.dryadPrevent=negativeStatuses.filter(key=>hit[key]&&!hit.dryadBlocked?.includes(key));
 if(p.cleanse)options.cleanse=statusKeys.filter(key=>key!=='cleanse'&&p[key]);
 const damageWindow=['defence','defenceResponse','damage'].includes(s.stage);
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
const hasResponse=(s,seat)=>{
 const tokens=tokenChoices(s,seat);
 const tithe=titheChoices(s,seat);
 return !!(handPlays(s,seat).length||tokens.cleanse.length||tokens.boost||tokens.prevent||tokens.crit||
   tokens.accuracy||tokens.protect||tokens.retribution||tokens.smoke||tokens.ninjutsu||tokens.evadeSide||tokens.seedling.length||tokens.sapling||tokens.dryad||tokens.dryadPrevent.length||tokens.wellspring||tithe.draw||tithe.dice?.length||
   s.stage==='damage'&&s.players[seat].evasive&&(seat===s.active?returnDamageFor(s):incomingDamage(s))>0&&!s.cardRoll);
};
const cardActor=s=>s.response?.seat??(s.cards&&s.stage==='damage'&&!s.cardRoll&&!s.retry&&hasResponse(s,s.active)?s.active:actor(s));
const isSelling=s=>s.cards && (isMain(s)||s.stage==='discard')&&!s.mainAction&&!s.mainChoice&&!s.cardRoll&&!s.retry&&!s.response;
function grantAttackStatus(s,defender,key,amount=1){
 const p=s.pending;
 if(['defence','defenceResponse'].includes(s.stage) && !p.incomingStatus.includes(key)){
  p.incomingStatus.push(key);
  p.priorStatus[key]=defender[key]||0;
 }
 grantStatus(defender,key,amount);
}
function completeCardRoll(s,roll,random,add){
 const {id,seat,dice}=s.cardRoll;
 const hero=heroId(s,seat),p=s.players[seat],opponent=s.players[1-seat],counts=tally(dice,hero),hit=s.pending;
 s.cardRoll=null;
 if(id===null){
  const heal=Math.ceil(dice[0]/2);
  p.hp=bounded(p.hp+heal,60);
  add(`Wellspring rolls ${dice[0]} and heals ${heal}.`);
  return;
 }
 const rules = heroRoster[hero];
 if (id === 3) p.cp = bounded(p.cp + Math.ceil(dice[0] / 2), 15);
 if (rules.resolveCardRoll?.({id,p,opponent,counts,hit,s,seat,bounded,updateDamage,grantStatus,grantAttackStatus,queueGrowth,startSideDamage,grantPirateStatus,drawCards,discardRandom,random})) return;
 if (id === (rules.promoId??33) && hero!==cursedPirate.id) {
  if (dice[0] !== 6) drawCards(p,1,random,id);
  else rules.resolvePromo({p,opponent,s,seat,bounded,grantStatus,statusCap,queueGrowth});
 }
 add(`${seatCard(s,seat,id).name} resolves with ${dice.join(', ')}.`);
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
  removeStatus(s.players[choice.target],choice.status);
  if(choice.status==='barbed'&&choice.target===s.active)s.vineAttempts=0;
  if(id===1)grantPirateStatus(s,1-choice.target,choice.status);
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
   if(!pirateStatuses.includes(key)||player[key])player[key]=statusCap(player,key)>1?0:false;
  }
  s.players[choice.target].shadowsStarted=false;
  s.players[choice.target].chiFresh=0;
  if(choice.target===s.active)s.vineAttempts=0;
  return;
 }
 const rules = heroRoster[hero];
 const card = {id,s,names,seat,p,opponent,c,choice,bounded,grantStatus,statusCap,updateDamage,discardRandom,drawCards,random,paladinBuffs,discardSpirits,spiritTypes,spiritTotal,queueGrowth,startSideDamage,grantPirateStatus,add,seatCard};
 if (rules.applyCard?.(card)) return;
 const rollSize = id === 3 || id === 33 && hero!==cursedPirate.id ? 1 : rules.cardRollSize?.(id) ?? 0;
 if(rollSize){
  s.cardRoll={seat,id,dice:Array.from({length:rollSize},()=>roll()),ninjaRerolls:hero===6&&id===28?5:0};
  // During an Ultimate, the ability's dice and subsidiary rolls are final.
  if(s.stage==='locked'&&s.pending.ultimate&&!(hero===6&&id===28))completeCardRoll(s,roll,random,add);
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
 if(c.phase==='main'&&([1,2,3,4,29,33].includes(id)||heroId(s,seat)===3&&[27,32].includes(id)||heroId(s,seat)===4&&id===30||heroId(s,seat)===5&&[30,31].includes(id)||heroId(s,seat)===6&&id===27||heroId(s,seat)===cursedPirate.id&&[19,20,21,24,25,26,27,28,34].includes(id))&&hasResponse(s,1-seat))
  s.mainAction={seat,id,choice};
 else applyCard(s,seat,id,choice,roll,random,add);
}

const bounded = (v, cap) => Math.min(cap, Math.max(0, v));
const sets=[{name:'Season One ReRolled',heroes:[0,1,2,3,4,5,6,7]},{name:'Season Two',heroes:[cursedPirate.id]}];
const heroId=(s,seat)=>s.players[seat].hero??seat;
const boardFor=(s,seat)=>{
 const hero=heroRoster[heroId(s,seat)];
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
    state.stage=heroId(state,active)===7?'upkeep':'main1';
    state.income={skipped:'first-turn'};
    state.players.forEach((p,i)=>{
      heroRoster[heroId(state,i)].initialize?.(state,i);
      cardsFor(i,p,state.promo,options.random??Math.random);
    });
  }
  return state;
}
const tally = (dice, seat) => dice.reduce((count, n) => {
  const symbol = HEROES[seat].symbols[n - 1];
  count[symbol] = (count[symbol] ?? 0) + 1;
  return count;
}, {});
const effectDiceCount=p=>p.effectCount??(abilityEffectDice[p.effect]??5);
function matchingNumbers(dice) {
  return Math.max(0,...dice.map(value=>dice.filter(v=>v===value).length));
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
function legal(state) {
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
  if(state.cardRoll)return {finishCardRoll:true,abilityReroll:!!state.cardRoll.ninjaRerolls};
  if(state.mainAction)return {finishMainCard:true};
  const defender = state.players[1-state.active];
  switch (state.stage) {
    case 'offence': return {
      roll: state.attempts < state.budget && (!state.dice.length || state.held.some(v => !v)),
      hold: state.attempts < state.budget && state.dice.length > 0,
      declare: abilitiesFor(state,state.active).filter(a => qualifies(a,state.dice,heroId(state,state.active))).map(a=>a.name),
      end:state.dice.length > 0
    };
    case 'announce': return {accept:true};
    case 'blind': return {resolveBlind:true};
    case 'effect': return {rollEffect:true};
    case 'effectResponse': return {resolveEffect:true,abilityReroll:!!state.pending.ninjaRerolls,effectRetry:!!state.pending.effectRetry||!!state.pending.tempestChi&&state.players[state.active].chi>0};
    case 'combustion': return {chooseMastery:true};
    case 'pirateKegRoll': return {resolvePirateKeg:true};
    case 'upkeep': return {resolveUpkeep:true,evadeUpkeep:upkeepIncoming(state)>0&&state.players[state.active].evasive>0&&!state.upkeepEvaded};
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
    case 'defenceResponse': return {resolveDefence:true,extraDefence:!!state.extraDefence,abilityReroll:!!state.pending.ninjaDefenceRerolls,
      evade:state.cards&&defender.evasive>0&&incomingDamage(state)>0};
    case 'postHit': return {continueHit:true};
    case 'paladinReward': return {choosePaladinReward:true};
    case 'monkChoice': return {chooseMonkReward:true};
    case 'choice': return {chooseEffect:true};
    case 'preventStatus': return {preventStatus:true};
    case 'main1': return {begin:true};
    case 'discard': return {next:state.players[state.active].hand.length<=6};
    case 'locked': return {settle:true};
    case 'defence': return {defend:!state.pending.parlayBlocked&&!shadowAvoids(state), skipDefence:true};
    case 'damage': return {settle:true, evade: defender.evasive > 0 && state.pending.damage > 0,
      evadeReturn:state.cards&&state.players[state.active].evasive>0&&returnDamageFor(state)>0};
    case 'evasion': return {resolveEvade:true};
    case 'main': return state.cards?{endMain:true}:{next:true};
    default: return {};
  }
}
function actor(state) {
  if(state.growth)return state.growth.seat;
  if(state.retry)return state.retry.seat;
  if(state.mainChoice)return state.mainChoice.seat;
  if(state.pirateChoice)return state.pirateChoice.seat;
  if(state.monkChoice)return state.monkChoice.seat;
  if(state.cardRoll)return state.cardRoll.seat;
  if(state.mainAction)return 1-state.mainAction.seat;
  if(state.stage==='evasion')return state.evasionSeat??1-state.active;
  if(state.stage==='sideDamage')return state.sideDamage.seat;
  return ['announce','defence','defenceResponse','damage','preventStatus','dryadResponse','defenceWells'].includes(state.stage) ? 1-state.active : state.active;
}
function transition(previous, action, roll, random=Math.random, bypassResponse=false) {
  if(previous.cards){
    const seat=cardActor(previous);
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
        if(action.status==='barbed'&&seat===s.active)s.vineAttempts=0;
        if(action.status==='targeted'&&hit?.targetBonus&&seat!==s.active&&s.stage!=='postHit'){
          hit.targetBonus=false;hit.grossDamage-=2;updateDamage(hit);
        }
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
      return transition({...previous,response:null},action,roll,random,true);
    }
    if(action.type==='passResponse'&&previous.response){
      const state=structuredClone(previous),deferred=state.response.action;
      state.response=null;
      return transition(state,deferred,roll,random,true);
    }
    const responseActions=['begin','endMain','accept','resolveBlind','resolveEffect','resolveTarget','resolveDefence','settle','resolveEvade','finishCardRoll','continueHit','defend','skipDefence','resolveUpkeep','resolvePirateKeg','chooseMastery','payKnockdown','skipKnockdown','resolveSneak','chooseStolenCP','skipSneak','next','resolveNinjutsu','resolveSideDamage','end' ];
    if(!bypassResponse && action.type==='evade' && legal(previous).evade && hasResponse(previous,previous.active)){
      return {...previous,response:{seat:previous.active,action}};
    }
    if(!bypassResponse && legal(previous)[action.type] && responseActions.includes(action.type) &&
       (action.type!=='end'||vineDamage(previous)>0)&&!attackLocked(previous) && hasResponse(previous,1-seat)){
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
    state.stage = 'main';
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
       (p.damage>0||p.masteryDamage*(attacker.fireMastery??0)>0)&&negativeStatuses.some(key=>p[key])){
      state.stage='dryadResponse';
      return;
    }
    for(const key of p.paladinGain??[])grantStatus(attacker,key);
    if (p.evasive) grantStatus(state.players[p.grantSeat??state.active],'evasive',p.evasive);
    if(p.chiGain)grantStatus(attacker,'chi',p.chiGain);
    if(p.cleanseGain)grantStatus(attacker,'cleanse',p.cleanseGain);
    gainMastery(p);
    if(p.masteryDamage)p.damage+=p.masteryDamage*(attacker.fireMastery??0);
    p.abilityDamage??=p.damage;
    p.damage+=p.chiBoost??0;
    p.attack=p.damage>0;
    p.incomingStatus=negativeStatuses.filter(k=>p[k]&&!p.dryadBlocked?.includes(k));
    p.priorStatus=Object.fromEntries(p.incomingStatus.map(k=>[k,defender[k]||0]));
    for(const k of p.incomingStatus){
      if(k==='powderKeg')grantPirateStatus(state,1-state.active,k,true);
      else grantStatus(defender,k,k==='delayedPoison'?p.delayedPoison:1);
    }
    if(p.pirateInflict)cursedPirate.inflictCoins(state,state.active,p.pirateInflict);
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
    if(p.attack&&!p.pure&&!p.ultimate&&attacker.wither)p.witherReduction=attacker.wither;
    const parlayBlocked=!!attacker.parlay;
    p.damage+=(p.collateral??0);
    if(parlayBlocked){p.damage=0;p.parlayBlocked=true;}
    if(state.cards){
      p.grossDamage=p.damage;
      if(p.witherReduction)updateDamage(p);
    }
    if (p.heal) {
      const health = attacker.hp;
      attacker.hp = bounded(attacker.hp + p.heal,60);
      add(`${names[state.active]} heals ${attacker.hp-health}.`);
    }
    p.shadowSkippedDefence=shadowAvoids(state)&&p.attack&&!p.undefendable&&!p.pure&&!p.stun;
    if (p.damage||p.stun||p.attack&&(parlayBlocked||attacker.wither)) state.stage = p.stun || p.ultimate ? 'locked' : p.undefendable||p.pure||!p.attack||p.shadowSkippedDefence||parlayBlocked ? 'damage' : 'defence';
    else finishRoll();
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
    else if(state.cards&&!p.stun&&!p.ultimate&&(p.damage||p.burn||p.knockdown||p.collateral||p.poison||p.delayedPoison||p.barbed||p.powderKeg||p.wither||p.parlay||p.pirateInflict))enterTargeting(p);
    else activate();
  }
  function resolveAbility() {
    const p=state.pending;
    if(p.cpGain)attacker.cp=bounded(attacker.cp+p.cpGain,15);
    if(p.cpDamage)p.damage+=Math.ceil(attacker.cp*p.cpDamage);
    if (p.effect) state.stage='effect';
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
  function income(player) {
    if (player.concussion) {
      player.concussion=false;
      state.income={skipped:'concussion'};
      add(`Turn ${state.turn}. ${names[state.active]} skips income due to Concussion.`);
    } else {
      const previousCP=player.cp;
      player.cp=bounded(player.cp+1,15);
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
    if(upkeepDamage(player,state.active)||player.fireMastery||heroId(state,state.active)===7||player.cursed||player.powderKeg){
      state.pending=null;
      state.stage='upkeep';
      state.upkeepEvaded=false;state.upkeepPrevention=0;state.upkeepProtect=0;
    } else income(player);
  }
  function finishUpkeep(){
    if(attacker.cursed){
      attacker.hp=Math.max(0,attacker.hp-4);
      add(`${names[state.active]} takes 4 unpreventable damage from Cursed.`);
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
  function completeGrowth(){
    const g=state.growth;
    state.growth=null;
    state.stage=g.resume;
    if(g.after==='offence')continueOffence(state.pending);
    else if(g.after==='upkeep')finishUpkeep();
    else if(g.collateral)startSideDamage(state,1-g.seat,g.collateral,g.source);
  }
  switch (action.type) {
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
        state.pending.damage+=state.effectDie;state.effectDie=null;activate();
      }
      break;
    case 'resolveSneak':
      state.pending.damage+=state.effectDie;
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
    case 'resolvePirateChoice': {
      if(!cursedPirate.choices(state)[action.choice])return previous;
      const after=cursedPirate.resolveChoice(state,action.choice,{roll,bounded,grantPirateStatus,rollContext,releaseChangedAnnouncement,add});
      if(after==='offence')continueOffence(state.pending);
      if(after==='damage')state.stage='damage';
      if(after==='finishRoll')finishRoll();
      break;
    }
    case 'resolvePirateKeg': {
      const die=state.effectDie;
      state.effectDie=null;
      state.stage='upkeep';
      if(!attacker.powderKeg)break;
      if(die<=2){
        attacker.powderKeg=false;
        startSideDamage(state,state.active,3,'Powder Keg');
      } else if(die===6)cursedPirate.choose(state,state.active,'passKeg');
      break;
    }
    case 'resolveUpkeep':
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
        if(!Number.isInteger(action.index)||action.index<0||action.index>=ctx.dice.length)return previous;
        ctx.dice[action.index]=roll();
        if(ctx.scalar)state.effectDie=ctx.dice[0];
        add(`${names[seat]} uses the second reroll: ${ctx.dice.join(', ')}.`);
      }
      state.retry=null;
      releaseChangedAnnouncement(state,ctx,before);
      break;
    }
    case 'finishCardRoll': completeCardRoll(state,roll,random,add);break;
    case 'finishMainCard': {
      const {seat,id,choice}=state.mainAction;
      state.mainAction=null;
      if([1,2,4].includes(id)&&mainTargets(state,seat,id).length)state.mainChoice={seat,id};
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
    case 'resolveTarget': activate();break;
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
      const counts = tally(state.dice,heroId(state,state.active));
      const matching=matchingNumbers(state.dice);
      if(ability.straight)counts.largeStraight=hasStraight(state.dice,5);
      const usesPrayer=ability.straight?
        hasStraight(state.dice,counts.largeStraight?5:ability.straight,[counts.largeStraight?2:3]):!!ability.symbols?.Prayer;
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
        undefendable:ability.type==='undefendable'||matching>=ability.matchUndefendable, ultimate:ability.type==='ultimate', returnDamage:0,
        stun:!!ability.stun, targeted:!!ability.targeted, effect:ability.effect, recoil:ability.recoil ?? 0};
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
      add(`${names[state.active]} ends the roll without an ability.`);
      finishRoll();
      break;
    case 'accept':
      if (attacker.blind) {
        attacker.blind = false;
        state.effectDie = roll();
        state.stage = 'blind';
      } else resolveAbility();
      break;
    case 'resolveBlind':
      if (state.effectDie <= 2) {
        add(`Blind roll ${state.effectDie}. ${state.pending.name} fails.`);
        const ability=state.pending;
        const wouldAttack=ability.damage>0||ability.cpDamage||ability.combustRate||ability.spiritDamage||
          ability.masteryDamage||['exploding','overpower','tempest','shadowDance','pirateBooty','walkLine','deathBlossom'].includes(ability.effect);
        state.pending = null;
        finishRoll(Boolean(wouldAttack));
      } else {
        add(`Blind roll ${state.effectDie}. ${state.pending.name} resolves.`);
        resolveAbility();
      }
      state.effectDie = null;
      break;
    case 'rollEffect': {
      const p=state.pending;
      p.effectDice=Array.from({length:effectDiceCount(p)},()=>roll());
      add(`${p.name} rolls ${p.effectDice.join(', ')} for its effect.`);
      if(state.cards){state.stage='effectResponse';break;}
      // The card-free scenarios resolve effect rolls immediately.
    }
    case 'resolveEffect': {
      const p=state.pending;
      const counts = tally(p.effectDice,heroId(state,state.active));
      const resolve = abilityEffects[p.effect] ?? abilityEffects.exploding;
      resolve(p,counts,{attacker,bounded,grantStatus,drawCards,random});
      continueOffence(p);
      break;
    }
    case 'defend': {
      const seat = 1-state.active;
      const hero=heroId(state,seat);
      if(hero===3&&action.defence&& !['shadowDefence','counterStrike'].includes(action.defence))return previous;
      state.defenceKind=hero===3?(action.defence??'shadowDefence'):'defence';
      const diceCount = heroRoster[hero].defenceDiceCount(defender,state.defenceKind);
      state.defenceDice = Array.from({length:diceCount},()=>roll());
      if(hero===6)state.pending.ninjaDefenceRerolls=defender.upgrades?.defence?2:1;
      if(state.cards){state.stage='defenceResponse';break;}
    }
    case 'resolveDefence': {
      const seat=1-state.active;
      const counts = tally(state.defenceDice,heroId(state,seat));
      add(`${names[seat]} rolls ${defenceName(state,seat,state.defenceKind)}: ${state.defenceDice.join(', ')}.`);
      const hero = heroRoster[heroId(state,seat)];
      state.stage = hero.resolveDefence({state,seat,defender,attacker,counts,bounded,grantStatus,updateDamage,queueGrowth,add}) ?? 'damage';
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
        if(action.status==='targeted'&&p.targetBonus){
          p.grossDamage-=2;p.targetBonus=false;updateDamage(p);
        }
      }
      state.stage='damage';break;
    }
    case 'abilityReroll': {
      const ctx=rollContext(state),p=state.pending,card=state.cardRoll;
      const key=state.stage==='defenceResponse'&&!card?'ninjaDefenceRerolls':'ninjaRerolls';
      const source=card??p,indices=action.indices;
      if(!Array.isArray(indices)||!indices.length||indices.length>source[key]||new Set(indices).size!==indices.length||
        !indices.every(i=>Number.isInteger(i)&&i>=0&&i<ctx.dice.length&&(!card||![4,5].includes(ctx.dice[i]))))return previous;
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
      if (state.effectDie <= (token==='smoke'?3:2)) {
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
      if(state.effectDie===6){state.stage='ninjutsuChoice';break;}
      applyNinjutsu(state.effectDie<=3?'one':'two');
      break;
    case 'chooseNinjutsu':
      if(!ninjutsuOutcomes(state).includes(action.status))return previous;
      applyNinjutsu(action.status);
      break;
    case 'settle': {
      const p = state.pending;
      const damage=incomingDamage(state);
      if(!damage&&p.damage&&shadowAvoids(state))add(`${names[1-state.active]} avoids the offensive damage with Shadows.`);
      const defenderSaved=takeDamage(defender,damage);
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
      add(`${names[1-state.active]} takes ${damage} damage${returnDamage ? ` and ${names[state.active]} takes ${returnDamage}` : ''}.`);
      if(defenderSaved)add(`${names[1-state.active]} survives through Blessing of Divinity.`);
      if(attackerSaved)add(`${names[state.active]} survives through Blessing of Divinity.`);
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
  return flushPowderKegs(state);
}
if (typeof module !== 'undefined' && module.exports) module.exports={createMatch,transition,legal,actor,qualifies,cardChoices,cardActor,cardInfo,abilitiesFor,mainTargets,tokenChoices};
