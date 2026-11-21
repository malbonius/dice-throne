const gambit=(()=>{
 const id=33,red='Heart/Diamond',black='Spade/Club',superCharge='Super Charge';
 const suits=['diamond','heart','spade','club'],caps={diamond:3,heart:4,spade:4,club:2};
 const board={name:'Gambit',symbols:['Staff','Staff','Staff',red,black,superCharge],defence:'Creole Crusader',abilities:[
  {name:'Bo Staff',symbols:{Staff:3},damage:c=>c.Staff+2,disruptMatch:3,text:'3 / 4 / 5 Staff · deal 5 / 6 / 7 damage. Three matching numbers inflict Disruption.'},
  {name:'Poker Face',symbols:{Staff:1,[red]:2},accelerate:3,dissolution:1,gambitCP:1,gambitDraw:1,disruption:true,text:'Accelerate three times. Gain Dissolution and 1 CP. Draw 1. Inflict Disruption.'},
  {name:'Bojutsu',symbols:{Staff:2,[black]:2},dissolution:1,damage:()=>2,type:'undefendable',extraAce:1,text:'Gain Dissolution. Deal 2 undefendable damage. You may explode one additional Ace this turn.'},
  {name:'Sleight of Hand',symbols:{Staff:2,[red]:1,[superCharge]:1},sleight:1,damage:()=>7,text:'Choose: accelerate twice, or regain an Ace and inflict Disruption. Then deal 7 damage.'},
  {name:'Card Shark',straight:4,accelerate:1,damage:()=>7,text:'Small straight · accelerate once. Then deal 7 damage.'},
  {name:'Card Shark (large straight)',upgradeSlot:'Card Shark',variant:'large',straight:5,accelerate:2,damage:()=>9,text:'Large straight · accelerate twice. Then deal 9 damage.'},
  {name:'Ragin’ Cajun',symbols:{[superCharge]:4},accelerate:3,disruption:true,damage:()=>6,type:'undefendable',text:'Accelerate three times. Inflict Disruption. Then deal 6 undefendable damage.'},
  {name:'Le Diable Blanc!',symbols:{[superCharge]:5},accelerate:4,dissolution:1,disruption:true,regainAfter:1,damage:()=>11,type:'ultimate',text:'Accelerate four times. Gain Dissolution. Inflict Disruption. Then regain an Ace and deal 11 Ultimate damage.'}
 ]};
 const upgrades=[
  ['Bo Staff II',2,'Bo Staff',{disruptMatch:0,disruption:true,text:'3 / 4 / 5 Staff · deal 5 / 6 / 7 damage. Inflict Disruption.'},2,{name:'Bo Staff Mastery',symbols:{Staff:3,[superCharge]:1},accelerate:1,damage:()=>5,effect:'gambitMastery',effectCount:5,text:'Accelerate once. Then deal 5 damage and roll 5 dice, adding 1 per Staff.'}],
  ['Sleight of Hand II',2,'Sleight of Hand',{sleight:2,disruption:true,text:'Choose: accelerate twice, or regain up to two Aces. Inflict Disruption. Then deal 7 damage.'},2,{name:'All-In',symbols:{Staff:1,[red]:1,[black]:1,[superCharge]:1},damage:()=>2,doubleAce:true,text:'Deal 2 damage. Each Ace exploded on this attack activates its Explode Effect twice.'}],
  ['Poker Face II',1,'Poker Face',{accelerate:4,text:'Accelerate four times. Gain Dissolution and 1 CP. Draw 1. Inflict Disruption.'},2,{name:'Mon Chère',symbols:{[red]:3},dissolution:1,gambitCP:2,gambitDraw:1,regainBefore:2,accelerate:4,text:'Gain Dissolution and 2 CP. Draw 1. Regain up to two Aces. Then accelerate four times.'}],
  ['Bojutsu II',2,'Bojutsu',{damage:()=>3,text:'Gain Dissolution. Deal 3 undefendable damage. You may explode one additional Ace this turn.'},2,{name:'Streetwise',symbols:{[red]:2,[black]:2},dissolution:1,disruption:true,damage:()=>6,text:'Gain Dissolution. Inflict Disruption. Deal 6 damage.'}],
  ['Ragin’ Cajun II',2,'Ragin’ Cajun',{accelerate:4,damage:()=>7,text:'Accelerate four times. Inflict Disruption. Then deal 7 undefendable damage.'},2,{name:'Cajun Fury',symbols:{[superCharge]:3},accelerate:2,dissolution:2,text:'Accelerate twice. Gain 2 Dissolution.'}],
  ['Creole Crusader II',2,'defence',null]
 ];
 const cards=[['X-Treme Remy!',2,'main'],['Gumbo!',1,'main'],['3 Card Monte!',2,'main'],['Call Your Bluff!',0,'main'],['Rogue’s Kiss!',1,'roll'],['Cajun Kick!',1,'roll'],['Gambit’s Gambit!',1,'roll'],['Card Magic!',1,'instant'],['Charged Up!',0,'main']];
 const phase=s=>s.gambitTask&&s.stage==='gambitSequence'?phase({...s,gambitTask:s.gambitTask.parent??null,stage:s.gambitTask.resume}):s.stage;
 function begin(s,seat,queue,resume=s.stage,extra={}){const parent=s.gambitTask;s.gambitTask={seat,queue,resume,locked:!!attackLocked(s),...extra};psylocke.tag(s,s.gambitTask);if(parent)s.gambitTask.parent=parent;s.stage='gambitSequence';}
 function accel(n,allowed=suits){return {kind:'accelerate',left:n,allowed,allocation:{}};}
 function available(s,seat,step){const p=s.players[seat];return (step.allowed??suits).filter(k=>p.aces?.[k].up&&p.aces[k].charge+(step.allocation?.[k]??0)<caps[k]);}
 function regainChoices(s,seat,step={}){return suits.filter(k=>!s.players[seat].aces?.[k].up&&k!==step.exclude);}
 function bump(s,seat,n=1){const p=s.players[seat];if(p.aceTurn!==s.turn){p.aceTurn=s.turn;p.aceExploded=0;p.aceExtra=0;}p.aceExtra=(p.aceExtra??0)+n;}
 function changeDamage(s,n){const h=s.pending;if(h.grossDamage===undefined){h.damage+=n;h.gambitModifiers=(h.gambitModifiers??0)+n;}else {h.grossDamage+=n;updateDamage(h);}}
 function busy(s){return !!(s.cardRoll||s.retry||s.conjureTask||s.scarletJinx||s.lokiTask||s.lokiIllusion||s.lokiBag||s.strangeTask||s.premonitionTask||s.widowTask||s.widowReveal||s.widowAgility||s.widowBombRoll||s.cosmicRayRoll||s.growth||s.mainChoice||s.mainAction||s.forgeTask||s.shapeOverflow||s.ravenFeathers||s.grimOverflow||s.tacticalOverflow||s.tacticalRemoval||s.honorOverflow||s.bloodOverflow||s.mesmerizeRoll||cyclops.choosing(s));}
 function forced(s){return !!(s.gambitTask&&s.stage==='gambitSequence'&&s.gambitTask.queue[0]?.kind!=='window'&&!(s.gambitTask.queue[0]?.kind==='dissolution'&&s.gambitTask.queue[0]?.overflow));}
 function canExplode(s,seat){
  const p=s.players[seat],h=s.pending,n=p.aceTurn===s.turn?p.aceExploded??0:0,extra=p.aceTurn===s.turn?p.aceExtra??0:0;
  if(!s.cards||heroId(s,seat)!==id||seat!==s.active||busy(s)||s.gambitRoll||s.sideDamage||forced(s)||s.gambitTask?.exploding||!h||!(h.attack??h.damage>0)||h.pure||h.evaded||h.parlayBlocked||n>=1+extra)return [];
  if(!['gambitSequence','gambitAbility','effect','effectResponse','targeting','defence','defenceResponse','damage','locked','sneakOffer'].includes(s.stage))return [];
  return suits.filter(k=>p.aces[k].up&&p.aces[k].charge===caps[k]);
 }
 function dissolveChoices(s,seat){
  const p=s.players[seat];if(!s.cards||!p.dissolution||seat!==s.active||!['main','main1'].includes(phase(s))||busy(s)||s.response||s.gambitRoll||s.sideDamage||forced(s)&&s.gambitTask.queue[0]?.kind!=='dissolution')return [];
  const out=[];
  s.players.forEach((player,target)=>{
   out.push({kind:'heal',target,label:`Heal ${heroNames(s)[target]} 2`});
   for(const key of negativeStatuses.filter(k=>player[k])){
    if(key==='timeBomb')for(const b of player.timeBombTimers??[])out.push({kind:'remove',target,key,bombId:b.id,label:`Remove ${heroNames(s)[target]}’s Time Bomb 0:0${b.ticks}`});
    else out.push({kind:'remove',target,key,label:`Remove ${heroNames(s)[target]}’s ${statusLabel(key)}`});
   }
  });return out;
 }
 function gainDissolution(s,seat,n=1,exclude){begin(s,seat,[{kind:'dissolution',amount:n}],s.stage,{exclude});}
 function rollEffect(s,step,roll){
  const t=s.gambitTask;s.gambitRoll={seat:t.seat,kind:step.kind,dice:[roll()],resume:'gambitSequence'};s.stage='gambitRoll';
 }
 function resolveRoll(s,roll,random){
  const r=s.gambitRoll,p=s.players[r.seat],dice=effectiveDice(r.dice,p),counts=tally(dice,heroId(s,r.seat));delete s.gambitRoll;s.stage=r.resume;
  if(r.kind==='high'){
   if(r.dice.length===5&&dice.includes(1)){s.log.unshift('High Stakes busts: no acceleration is gained.');begin(s,r.seat,[{kind:'loseCharge'}],r.resume);}
   else {const q=[];if(counts[superCharge])q.push(accel(counts[superCharge]));if(counts[black])q.push(accel(counts[black],['club','spade']));if(counts[red])q.push(accel(counts[red],['heart','diamond']));if(q.length)begin(s,r.seat,q,r.resume);}
  }
  if(r.kind==='heartRoll')p.hp=bounded(p.hp+Math.ceil(dice[0]/2),60);
  if(r.kind==='clubRoll')changeDamage(s,Math.ceil(dice[0]/2));
 }
 function pump(s,roll,random){
  if(s.stage==='finished'||s.response||s.cardRoll||s.retry||s.sideDamage||s.gambitRoll||s.stage!=='gambitSequence')return;
  while(s.gambitTask){
   const t=s.gambitTask,p=s.players[t.seat],h=t.queue[0];
   if(!h){s.gambitTask=t.parent??null;s.stage=t.resume;if(s.stage!=='gambitSequence')return;continue;}
   if(h.kind==='window'||h.kind==='sleight'||h.kind==='hand')return;
   if(h.kind==='accelerate'){
    if(h.left&&available(s,t.seat,h).length)return;
    for(const[k,n]of Object.entries(h.allocation))p.aces[k].charge+=n;
   }
   if(h.kind==='regain'&&h.left&&regainChoices(s,t.seat,h).length)return;
   if(h.kind==='loseCharge'&&suits.some(k=>p.aces[k].charge))return;
   if(h.kind==='dissolution'){if(psylocke.block(s,p,'dissolution',h.amount)){t.queue.shift();continue;}
    const canSpend=t.seat===s.active&&['main','main1'].includes(phase(s));
    if(!h.collect&&canSpend&&(h.overflow||(p.dissolution??0)+h.amount>2)){h.overflow=true;return;}
    grantStatus(p,'dissolution',h.amount);
   }
   if(h.kind==='cp')gainCP(p,h.amount);
   if(h.kind==='draw')drawCards(p,h.amount,random,t.exclude);
   if(h.kind==='extra')bump(s,t.seat,h.amount);
   if(h.kind==='damage')changeDamage(s,h.amount);
   if(h.kind==='flip'){p.aces[h.suit]={up:false,charge:0};s.log.unshift(`${heroNames(s)[t.seat]} finishes exploding the ${h.suit} Ace and flips it face down.`);}
   if(h.kind==='heartRoll'||h.kind==='clubRoll'){
    t.queue.shift();rollEffect(s,h,roll);
    if(attackLocked(s)&&s.pending?.ultimate){resolveRoll(s,roll,random);continue;}return;
   }
   t.queue.shift();
  }
 }
 function ability(s){
  const h=s.pending;if(!h.gambit||h.gambitPrepared)return false;h.gambitPrepared=true;const g=h.gambit,q=[];
  const allowed=[...(g.usesRed?['heart','diamond']:[]),...(g.usesBlack?['club','spade']:[])];
  if(allowed.length)q.push(accel(1,allowed),{kind:'window',label:'Activation acceleration is complete. Continue with the ability effects.'});
  if(g.regainBefore){if(g.dissolution)q.push({kind:'dissolution',amount:g.dissolution});if(g.cp)q.push({kind:'cp',amount:g.cp});if(g.draw)q.push({kind:'draw',amount:g.draw});q.push({kind:'regain',left:g.regainBefore},{kind:'window',label:'Continue after regaining · accelerate four times.'});}
  if(g.sleight)q.push({kind:'sleight',upgraded:g.sleight===2});
  else if(g.accelerate)q.push(accel(g.accelerate));
  if(!g.regainBefore){if(g.dissolution)q.push({kind:'dissolution',amount:g.dissolution});if(g.cp)q.push({kind:'cp',amount:g.cp});if(g.draw)q.push({kind:'draw',amount:g.draw});}
  if(g.extra)q.push({kind:'extra',amount:g.extra});
  if(g.regainAfter)q.push({kind:'window',label:'Before “then” · you may explode a charged Ace before regaining.'},{kind:'regain',left:g.regainAfter,optional:false});
  if(!q.length)return false;if(!allowed.length&&h.damage>0)q.unshift({kind:'window',label:'You may explode a charged Ace before resolving these ability effects.'});begin(s,s.active,q,'gambitAbility',{locked:!!h.ultimate});return true;
 }
 function explode(s,seat,suit){
  const h=s.pending,p=s.players[seat],uses=h.gambit??{},q=[];bump(s,seat,0);p.aceExploded++;
  for(let repeat=0;repeat<(uses.double?2:1);repeat++){
   if(suit==='diamond')q.push({kind:'damage',amount:2},{kind:'regain',left:2,exclude:'diamond'});
   if(suit==='heart')q.push({kind:'damage',amount:2},{kind:'heartRoll'});
   if(suit==='spade')q.push({kind:'damage',amount:3+(uses.usesSuper?2:0)});
   if(suit==='club'){q.push({kind:'damage',amount:1});if(uses.usesBlack)q.push({kind:'clubRoll'});}
  }
  q.push({kind:'flip',suit});begin(s,seat,q,s.stage,{exploding:suit});
 }
 return {
  turnStartUpkeep: 'every-turn',
  leafletPositives: {
   dissolution: (state, seat) => gainDissolution(state, seat)
  },
  id,board,upgrades,cards,promoId:33,suits,caps,red,black,superCharge,phase,available,regainChoices,forced,canExplode,dissolveChoices,gainDissolution,pump,ability,
  initialize(s,seat){s.players[seat].aces=Object.fromEntries(suits.map(k=>[k,{up:true,charge:0}]));s.players[seat].dissolution=0;},
  complexity: 5,
  defenceEffect: () => 'Return 1 damage per Staff. Any Heart/Diamond heals 2. Any Super Charge lets you Accelerate once.',
  defenceDiceCount:p=>p.upgrades?.defence?4:3,
  resolveDefence({state:s,seat,defender:p,counts:c}){
   s.pending.returnDamage+=c.Staff??0;if(c[red])p.hp=bounded(p.hp+2,60);
   if(c[superCharge]){begin(s,seat,[accel(1)],'damage');return 'gambitSequence';}return 'damage';
  },
  cardChoices(card,{s,seat,one,pos,d}){
   if(card===29)return pos.filter(x=>dieOwner(d,x.i)===seat).flatMap(x=>[4,5].filter(v=>v!==x.value).map(v=>({i:x.i,v,label:`Die ${x.i+1} (${x.value}) → ${v}`})));
   if(card===30){const h=s.pending;return seat===s.active&&h&&(h.attack??h.damage>0)&&!h.pure&&!h.evaded&&!h.parlayBlocked&&['gambitAbility','gambitSequence','effect','effectResponse','targeting','defence','defenceResponse','damage','locked'].includes(s.stage)?one:[];}
   if(card===32)return s.gambitRoll?.kind==='high'&&s.gambitRoll.seat===seat?one:[];
   return one;
  },
  applyCard({id:card,s,seat,p,opponent,choice,random}){
   if(card===25){for(const k of suits)if(p.aces[k].up&&p.aces[k].charge<caps[k])p.aces[k].charge++;return true;}
   if(card===27){begin(s,seat,[{kind:'regain',left:3}],s.stage,{exclude:card});return true;}
   if(card===28){const hand=opponent.hand.slice(),q=[{kind:'hand',target:1-seat,cards:hand}];if(hand.some(c=>seatCard(s,1-seat,c).phase==='roll'))q.push(accel(1));begin(s,seat,q,s.stage,{exclude:card});return true;}
   if(card===29){const ctx=rollContext(s),before=ctx.dice.slice();ctx.dice[choice.i]=choice.v;if(ctx.scalar)s.effectDie=ctx.dice[0];releaseChangedAnnouncement(s,ctx,before);return true;}
   if(card===31){bump(s,seat,1);return true;}
   if(card===32){s.gambitRoll.magicLeft=(s.gambitRoll.magicLeft??0)+2;return true;}
   return false;
  },
  cardRollSize:card=>card===26?5:card===30?4:card===33?1:0,
  resolveCardRoll({id:card,s,seat,p,counts,drawCards,random}){
   if(card===26){p.hp=bounded(p.hp+(counts[red]??0),60);if(counts[superCharge])gainDissolution(s,seat,1,card);return true;}
   if(card===30){changeDamage(s,counts.Staff??0);if(counts[superCharge])grantAttackStatus(s,s.players[1-seat],'disruption');return true;}
   if(card===33){if(counts[superCharge])begin(s,seat,[{kind:'dissolution',amount:2},accel(2)],s.stage,{exclude:card});else drawCards(p,1,random,card);return true;}
   return false;
  },
  handle(previous,a,roll,random,bypass){
   const types=['gambitExplode','spendDissolution','gambitCharge','gambitChargeSkip','gambitRegain','gambitRegainSkip','gambitContinue','gambitSleight','gambitHandDone','gambitCollect','gambitLoseCharge','gambitHighStakes','gambitResolveRoll','gambitMagicReroll','gambitPayDisruption','gambitTakeDisruption'];if(!types.includes(a.type))return undefined;
   const seat=cardActor(previous),t=previous.gambitTask,h=t?.queue[0],r=previous.gambitRoll;
   const option=a.type==='spendDissolution'?dissolveChoices(previous,seat)[a.choice]:null;
   if(a.type==='gambitExplode'&&!canExplode(previous,seat).includes(a.status)||a.type==='spendDissolution'&&!option)return previous;
   if(a.type==='gambitHighStakes'&&(previous.stage!=='upkeep'||heroId(previous,previous.active)!==id||previous.players[previous.active].highStakesTurn===previous.turn||![2,5].includes(a.amount)||previous.gambitRoll||previous.gambitTask||previous.cardRoll||previous.retry||previous.response))return previous;
   if(['gambitPayDisruption','gambitTakeDisruption'].includes(a.type)&&(previous.stage!=='upkeep'||!previous.players[previous.active].disruption||previous.cardRoll||previous.retry||previous.gambitRoll||previous.gambitTask||previous.response||a.type==='gambitPayDisruption'&&!previous.players[previous.active].cp))return previous;
   if(['gambitResolveRoll','gambitMagicReroll'].includes(a.type)&&(!r||previous.cardRoll||previous.retry||previous.response||a.type==='gambitMagicReroll'&&(r.kind!=='high'||!r.magicLeft||!Number.isInteger(a.index)||a.index<0||a.index>=r.dice.length)))return previous;
   const taskActions=['gambitCharge','gambitChargeSkip','gambitRegain','gambitRegainSkip','gambitContinue','gambitSleight','gambitHandDone','gambitCollect','gambitLoseCharge'];
   if(taskActions.includes(a.type)&&(!t||previous.stage!=='gambitSequence'||seat!==t.seat||previous.response||previous.cardRoll||previous.retry))return previous;
   if(a.type==='gambitCharge'&&(h.kind!=='accelerate'||!available(previous,seat,h).includes(a.status))||a.type==='gambitChargeSkip'&&h.kind!=='accelerate'||a.type==='gambitRegain'&&(h.kind!=='regain'||!regainChoices(previous,seat,h).includes(a.status))||a.type==='gambitRegainSkip'&&(h.kind!=='regain'||h.optional===false)||a.type==='gambitContinue'&&h.kind!=='window'||a.type==='gambitSleight'&&(h.kind!=='sleight'||!['accelerate','regain'].includes(a.status))||a.type==='gambitHandDone'&&h.kind!=='hand'||a.type==='gambitCollect'&&(h.kind!=='dissolution'||!h.overflow)||a.type==='gambitLoseCharge'&&(h.kind!=='loseCharge'||!suits.includes(a.status)||!previous.players[seat].aces[a.status].charge))return previous;
   if(['gambitContinue','gambitResolveRoll'].includes(a.type)&&!bypass&&!attackLocked(previous)&&hasResponse(previous,1-seat))return {...previous,response:{seat:1-seat,action:a}};
   const s=structuredClone(previous),p=s.players[seat];s.response=null;
   if(a.type==='gambitExplode')explode(s,seat,a.status);
   if(a.type==='spendDissolution'){removeStatus(p,'dissolution');if(option.kind==='heal')s.players[option.target].hp=bounded(s.players[option.target].hp+2,60);else if(option.key==='timeBomb')blackWidow.removeBomb(s.players[option.target],option.bombId);else removeMatchStatus(s,option.target,option.key);}
   if(a.type==='gambitCharge'){const head=s.gambitTask.queue[0];head.allocation[a.status]=(head.allocation[a.status]??0)+1;head.left--;}
   if(a.type==='gambitChargeSkip')s.gambitTask.queue[0].left=0;
   if(a.type==='gambitRegain'){p.aces[a.status]={up:true,charge:0};s.gambitTask.queue[0].left--;}
   if(['gambitRegainSkip','gambitContinue','gambitHandDone'].includes(a.type))s.gambitTask.queue.shift();
   if(a.type==='gambitSleight'){
    const n=h.upgraded?2:1;s.gambitTask.queue[0]=a.status==='accelerate'?accel(2):{kind:'regain',left:n,optional:h.upgraded};
    if(!h.upgraded&&a.status==='regain')s.pending.disruption=true;
   }
   if(a.type==='gambitCollect')s.gambitTask.queue[0].collect=true;
   if(a.type==='gambitLoseCharge'){p.aces[a.status].charge--;s.gambitTask.queue.shift();}
   if(a.type==='gambitHighStakes'){const owner=s.active;s.players[owner].highStakesTurn=s.turn;s.gambitRoll={seat:owner,kind:'high',dice:rollBatch(roll,a.amount),resume:'upkeep'};s.stage='gambitRoll';}
   if(a.type==='gambitResolveRoll')resolveRoll(s,roll,random);
   if(a.type==='gambitMagicReroll'){s.gambitRoll.dice[a.index]=roll();s.gambitRoll.magicLeft--;}
   if(a.type==='gambitPayDisruption'||a.type==='gambitTakeDisruption'){const owner=s.players[s.active];if(a.type==='gambitPayDisruption')owner.cp--;else s.upkeepDisruptionDamage=2;removeStatus(owner,'disruption');}
   return s;
  }
 };
})();
