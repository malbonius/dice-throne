const cyclops=(()=>{
 const id=32;
 const board={name:'Cyclops',symbols:['Fist','Fist','Fist','Pouch','Pouch','Blast'],defence:'Recourse',abilities:[
  {name:'Hand to Hand',symbols:{Fist:3},damage:c=>c.Fist===5?7:c.Fist+1,choiceMatch:4,text:'3 / 4 / 5 Fist · deal 4 / 5 / 7 damage. Four matching numbers gain Battle Plan or Support.'},
  {name:'Target Acquired',symbols:{Fist:4,Blast:1},damage:()=>5,focus:1,then:true,text:'Inflict Focus Fire. Then deal 5 damage.'},
  {name:'Teamwork',symbols:{Fist:1,Pouch:3},support:2,damage:()=>5,then:true,leadDamage:2,text:'Gain 2 Support. Then deal 5 damage; add 2 if a Leadership card was previously played this turn.'},
  {name:'Never Back Down',symbols:{Fist:3,Blast:2},battle:1,support:1,damage:()=>8,then:true,text:'Gain Battle Plan and Support. Then deal 8 damage.'},
  {name:'Regroup',straight:4,battle:2,damage:()=>6,then:true,leadSupport:1,text:'Gain 2 Battle Plan. Then deal 6 damage. If a Leadership card was previously played this turn, gain Support.'},
  {name:'Assault',straight:5,battle:3,damage:()=>8,then:true,leadDamage:2,text:'Gain 3 Battle Plan. Then deal 8 damage; add 2 if a Leadership card was previously played this turn.'},
  {name:'Strafe',symbols:{Blast:4},battle:3,focus:1,damage:()=>5,then:true,type:'undefendable',text:'Gain 3 Battle Plan. Inflict Focus Fire. Then deal 5 undefendable damage.'},
  {name:'Optic Blast!',symbols:{Blast:5},battle:3,support:1,focus:2,damage:()=>11,then:true,type:'ultimate',text:'Gain 3 Battle Plan and Support. Inflict 2 Focus Fire. Then deal 11 Ultimate damage.'}
 ]};
 const upgrades=[
  ['Target Acquired II',2,'Target Acquired',{symbols:{Fist:3,Blast:1},leadFocus:1,text:'Inflict Focus Fire. Then deal 5 damage. A previously played Leadership card inflicts an additional Focus Fire.'},2,{name:'Uppercut',symbols:{Fist:2,Blast:2},damage:()=>5,type:'undefendable',text:'Deal 5 undefendable damage.'}],
  ['Regroup II',1,'Regroup',{battle:3,leadSupport:0,leadDamage:1,text:'Gain 3 Battle Plan. Then deal 6 damage; add 1 after a previously played Leadership card.'}],
  ['Assault II',2,'Assault',{battle:4,damage:()=>9,text:'Gain 4 Battle Plan. Then deal 9 damage; add 2 after a previously played Leadership card.'},2,{name:'In Sight',symbols:{Fist:2,Pouch:2},focus:2,text:'Inflict 2 Focus Fire.'}],
  ['Never Back Down II',1,'Never Back Down',{damage:()=>9,leadBoth:true,text:'Gain Battle Plan and Support. Then deal 9 damage. A previously played Leadership card gains an additional Battle Plan and Support.'}],
  ['Strafe II',2,'Strafe',{focus:2,damage:()=>6,text:'Gain 3 Battle Plan. Inflict 2 Focus Fire. Then deal 6 undefendable damage.'},2,{name:'Check Your Pockets',symbols:{Blast:3},battle:3,support:3,text:'Gain 3 Battle Plan and 3 Support.'}],
  ['Recourse II',3,'defence',null]
 ];
 const cards=[['No Matter What!',1,'roll'],['Attack Now!',1,'roll'],['Never Let Go!',1,'roll'],['Selfless!',1,'roll'],['Locked In!',1,'instant'],['Need a Hand?!',1,'instant'],['Never Surrender!',1,'instant'],['Pouch Power!',0,'instant'],['Hold!',1,'instant'],['No Train, No Gain!',0,'main']];
 const leadershipIds=[25,26,27,28,29,30,31,32,33];
 const isLeadership=(s,seat,card)=>heroId(s,seat)===id&&leadershipIds.includes(card);
 const count=(s,seat)=>s.players[seat].leadershipTurn===s.turn?s.players[seat].leadershipPlayed??0:0;
 function onCardPlayed(s,seat,card){if(!leadershipIds.includes(card))return;const p=s.players[seat];p.leadershipPlayed=count(s,seat)+1;p.leadershipTurn=s.turn;}
 const other=(s,seat)=>Math.max(0,count(s,seat)-1);
 const stage=s=>s.cyclopsTask&&s.stage==='cyclopsSequence'?stage({...s,cyclopsTask:s.cyclopsTask.parent??null,stage:s.cyclopsTask.resume}):s.stage;
 function begin(s,seat,queue,resume=s.stage,extra={}){const parent=s.cyclopsTask;s.cyclopsTask={seat,queue,resume,locked:!!attackLocked(s),...extra};psylocke.tag(s,s.cyclopsTask);if(parent)s.cyclopsTask.parent=parent;s.stage='cyclopsSequence';}
 function gain(s,seat,key,amount=1,exclude){begin(s,seat,[{kind:'gain',key,amount}],s.stage,{exclude});}
 function changeDamage(s,amount,modifier=true){const h=s.pending;if(h.grossDamage===undefined){h.damage+=amount;if(modifier)h.cyclopsModifiers=(h.cyclopsModifiers??0)+amount;}else {h.grossDamage+=amount;updateDamage(h);}}
 function focus(s,target,n=1,attack=false){if(attack)grantAttackStatus(s,s.players[target],'focusFire',n);else grantStatus(s.players[target],'focusFire',n);}
 function busy(s){return !!(s.cardRoll||s.retry||s.conjureTask||s.scarletJinx||s.lokiTask||s.lokiIllusion||s.lokiBag||s.strangeTask||s.premonitionTask||s.widowTask||s.widowReveal||s.widowAgility||s.widowBombRoll||s.cosmicRayRoll||s.growth||s.mainChoice||s.mainAction||s.forgeTask||s.shapeOverflow||s.ravenFeathers||s.grimOverflow||s.tacticalOverflow||s.tacticalRemoval||s.honorOverflow||s.bloodOverflow||s.mesmerizeRoll);}
 function choosing(s){return !!(s.cyclopsTask&&s.stage==='cyclopsSequence'&&['hand','scout','defence'].includes(s.cyclopsTask.queue[0]?.kind));}
 function canSpend(s,seat){return !!(s.cards&&!busy(s)&&!choosing(s)&&s.stage!=='finished'&&s.stage!=='discard'&&!s.sideDamage&&(!attackLocked(s)||seat===s.active));}
 function supportChoices(s,seat){
  const p=s.players[seat];if(!s.cards||!p.support||s.stage==='finished'||s.stage==='discard'||choosing(s)||seat!==s.active&&attackLocked(s)||s.sideDamage&&!(s.widowAgility||s.stage==='evasion'))return [];
  if(busy(s)&&!s.cardRoll&&!s.widowAgility&&!s.widowBombRoll&&!s.cosmicRayRoll&&!s.scarletJinx&&!s.lokiBag)return [];
  const ctx=rollContext(s),locked=!!attackLocked(s),result=[];
  if(!busy(s)&&!s.sideDamage)for(let target=0;target<2;target++)result.push({kind:'cp',target,label:`Gain 1 CP · ${heroNames(s)[target]}`});
  if(ctx&&!locked)ctx.dice.forEach((value,index)=>{if(!iceman.contextLocked(s,ctx,index))result.push({kind:'reroll',index,target:dieOwner(ctx,index),label:`Reroll ${heroNames(s)[dieOwner(ctx,index)]}’s die ${index+1} (${value})`});});
  if(p.support>=3&&!busy(s)&&!s.sideDamage)for(let target=0;target<2;target++)result.push({kind:'draw',target,label:`Spend 3 Support · ${heroNames(s)[target]} draws 1`});
  return result;
 }
 function battleChoices(s,seat){
  const p=s.players[seat];if(!p.battlePlan||!canSpend(s,seat))return [];
  const used=p.battlePlanTurn===s.turn?p.battlePlanUsed??[]:[],out=[];
  if(!used.includes('hand'))out.push({kind:'hand',cost:1,label:`Examine ${heroNames(s)[1-seat]}’s hand`});
  if(p.battlePlan>=3&&!used.includes('scout'))out.push({kind:'scout',cost:3,label:'Look at your top 3 cards · take up to 1 Leadership card; discard or order the rest'});
  if(p.battlePlan>=3&&!used.includes('focus'))out.push({kind:'focus',cost:3,label:`Inflict Focus Fire on ${heroNames(s)[1-seat]}`});
  return out;
 }
 function canRecourse(s,seat){const h=s.pending,p=s.players[seat];return !!(s.cards&&heroId(s,seat)===id&&p.upgrades?.defence&&p.battlePlan>=2&&seat!==s.active&&s.stage==='damage'&&h?.attack&&h.undefendable&&!h.pure&&!h.ultimate&&!h.stun&&!h.parlayBlocked&&!h.cyclopsDefenceUsed&&!s.sideDamage&&!busy(s)&&!shadowAvoids(s));}
 function pump(s,random){
  if(s.stage==='finished'||s.response||s.cardRoll||s.retry||s.sideDamage||s.stage!=='cyclopsSequence')return;
  while(s.cyclopsTask){
   const t=s.cyclopsTask,p=s.players[t.seat],step=t.queue[0];
   if(!step){s.cyclopsTask=t.parent??null;s.stage=t.resume;if(s.stage!=='cyclopsSequence')return;continue;}
   if(['then','choice','hand','scout','defence'].includes(step.kind))return;
   if(step.kind==='gain'){if(psylocke.block(s,p,step.key,step.amount)){t.queue.shift();continue;}
    if(!step.collect&&(step.overflow||(p[step.key]??0)+step.amount>statusCap(p,step.key))){step.overflow=true;return;}
    grantStatus(p,step.key,step.amount);
   }
   if(step.kind==='draw')drawCards(p,step.amount,random,t.exclude);
   if(step.kind==='noMatterBonus')changeDamage(s,2*Math.min(2,other(s,t.seat)));
   if(step.kind==='holdBonus')drawCards(p,Math.min(2,other(s,t.seat)),random,t.exclude);
   if(step.kind==='needHandBonus'&&other(s,t.seat)>0)drawCards(p,1,random,t.exclude);
   if(step.kind==='abilityBonus'&&count(s,t.seat)>0){
    if(step.damage)changeDamage(s,step.damage,false);
    if(step.focus)s.pending.focusFire=(s.pending.focusFire??0)+step.focus;
    const q=[];if(step.battle)q.push({kind:'gain',key:'battlePlan',amount:step.battle});if(step.support)q.push({kind:'gain',key:'support',amount:step.support});
    t.queue.splice(1,0,...q);
   }
   t.queue.shift();
  }
 }
 function ability(s){
  const h=s.pending;if(!h.cyclops||h.cyclopsPrepared)return false;h.cyclopsPrepared=true;
  const c=h.cyclops,q=[];
  if(c.choice)q.push({kind:'choice'});
  if(c.battle)q.push({kind:'gain',key:'battlePlan',amount:c.battle});
  if(c.support)q.push({kind:'gain',key:'support',amount:c.support});
  if(c.then)q.push({kind:'then',label:'Continue after “then” · resolve the remaining ability effects'});
  if(c.leadDamage||c.leadFocus||c.leadSupport||c.leadBoth)q.push({kind:'abilityBonus',damage:c.leadDamage,focus:c.leadFocus,support:c.leadBoth?1:c.leadSupport,battle:c.leadBoth?1:0});
  if(!q.length)return false;begin(s,s.active,q,'cyclopsAbility',{locked:!!h.ultimate});return true;
 }
 function refresh(s){
  const h=s.pending;if(!h||h.grossDamage===undefined||h.focusSettled||['main','main1','discard','postHit','finished'].includes(s.stage))return;
  if(h.focusBonus===undefined&&!s.players[1-s.active].focusFire)return;
  const bonus=h.attack&&!h.pure&&!h.parlayBlocked?s.players[1-s.active].focusFire??0:0;
  h.grossDamage+=bonus-(h.focusBonus??0);h.focusBonus=bonus;updateDamage(h);
 }
 function incoming(s,target){return blackPanther.incoming(s,target);}
 const attack=(s,seat)=>seat===s.active&&s.pending&&(s.pending.attack??s.pending.damage>0)&&!s.pending.pure&&!s.pending.evaded&&!s.pending.parlayBlocked&&['targeting','defence','defenceResponse','damage','locked','cyclopsAbility','cyclopsSequence','thorAbility'].includes(s.stage);
 return {
  leafletPositives: {
   battlePlan: (state, seat) => gain(state, seat, 'battlePlan'),
   support: (state, seat) => gain(state, seat, 'support')
  },
  id,board,upgrades,cards,promoId:34,leadershipIds,isLeadership,count,other,onCardPlayed,stage,begin,gain,focus,pump,ability,refresh,supportChoices,battleChoices,canRecourse,choosing,
  initialize(s,seat){Object.assign(s.players[seat],{support:0,battlePlan:0});},
  complexity: 4,
  defenceDiceCount:()=>3,
  resolveDefence({state:s,seat,defender:p,counts:c}){
   const h=s.pending;h.prevention=(h.prevention??0)+(c.Pouch??0);if(p.upgrades?.defence)h.returnDamage+=c.Fist??0;updateDamage(h);
   if(c.Blast){begin(s,seat,[{kind:'defence',optional:!p.upgrades?.defence}],'damage');return 'cyclopsSequence';}return 'damage';
  },
  cardChoices(card,{s,seat,one,pos,d}){
   if([25,26].includes(card))return attack(s,seat)?one:[];
   if(card===27){
    if(attackLocked(s))return one;
    const p=s.players[seat],changes=p.support&&p.battlePlan?pos.filter(x=>dieOwner(d,x.i)===seat).flatMap(x=>[1,2,3,4,5,6].filter(v=>v!==x.value).map(v=>({i:x.i,v,label:`Spend Support and Battle Plan · die ${x.i+1}: ${x.value} → ${v}`}))):[];
    return [...changes,{label:'Play without changing a die (still counts as Leadership)'}];
   }
   if(card===28)return [0,1].filter(target=>incoming(s,target)).map(target=>({target,label:`Prevent 3 incoming damage · ${heroNames(s)[target]}`}));
   return one;
  },
  applyCard({id:card,s,seat,p,choice,random}){
   if(card===25){changeDamage(s,2);begin(s,seat,[{kind:'then',label:'Resolve No Matter What! additional damage'},{kind:'noMatterBonus'}],s.stage,{exclude:card});return true;}
   if(card===27){if(Number.isInteger(choice.i)){removeStatus(p,'support');removeStatus(p,'battlePlan');const ctx=rollContext(s),before=ctx.dice.slice();ctx.dice[choice.i]=choice.v;if(ctx.scalar)s.effectDie=choice.v;releaseChangedAnnouncement(s,ctx,before);}return true;}
   if(card===28){blackPanther.prevent(s,choice.target,3,incoming(s,choice.target));return true;}
   if(card===29){focus(s,1-seat);if(count(s,seat)===1)gain(s,seat,'support',1,card);return true;}
   if(card===30){begin(s,seat,[{kind:'gain',key:'support',amount:3},{kind:'needHandBonus'}],s.stage,{exclude:card});return true;}
   if(card===31){gain(s,seat,'battlePlan',other(s,seat)>0?3:1,card);return true;}
   if(card===33){drawCards(p,1,random,card);begin(s,seat,[{kind:'then',label:'Resolve Hold! additional draws'},{kind:'holdBonus'}],s.stage,{exclude:card});return true;}
   return false;
  },
  cardRollSize(card,{s,seat}={}){return card===26?5:card===32?1+other(s,seat):card===34?1:0;},
  resolveCardRoll({id:card,s,seat,counts,p,drawCards,random}){
   if(card===26){changeDamage(s,counts.Fist??0);if(counts.Blast)focus(s,1-seat,1,true);return true;}
   if(card===32){const q=[];if(counts.Fist)q.push({kind:'gain',key:'support',amount:counts.Fist});if(counts.Pouch)q.push({kind:'gain',key:'battlePlan',amount:counts.Pouch});if(counts.Blast)q.push({kind:'draw',amount:counts.Blast});if(q.length)begin(s,seat,q,s.stage,{exclude:card});return true;}
   if(card===34){if(counts.Blast)begin(s,seat,[{kind:'gain',key:'support',amount:2},{kind:'gain',key:'battlePlan',amount:3}],s.stage,{exclude:card});else drawCards(p,1,random,card);return true;}
   return false;
  },
  handle(previous,a,roll,random,bypass){
   const types=['spendSupport','spendBattlePlan','cyclopsRecourse','cyclopsContinue','cyclopsCollect','cyclopsTokenChoice','cyclopsHandDone','cyclopsScoutTake','cyclopsScoutSkip','cyclopsScoutDiscard','cyclopsScoutTop','cyclopsDefenceChoice'];if(!types.includes(a.type))return undefined;
   const seat=cardActor(previous),t=previous.cyclopsTask,head=t?.queue[0];
   const option=a.type==='spendSupport'?supportChoices(previous,seat)[a.choice]:a.type==='spendBattlePlan'?battleChoices(previous,seat)[a.choice]:null;
   if(['spendSupport','spendBattlePlan'].includes(a.type)&&!option)return previous;
   if(a.type==='cyclopsRecourse'&&!canRecourse(previous,seat))return previous;
   const taskAction=a.type.startsWith('cyclops')&&a.type!=='cyclopsRecourse';
   if(taskAction&&(!t||previous.stage!=='cyclopsSequence'||previous.response||seat!==t.seat))return previous;
   if(a.type==='cyclopsContinue'&&head?.kind!=='then'||a.type==='cyclopsCollect'&&(head?.kind!=='gain'||!head.overflow)||a.type==='cyclopsTokenChoice'&&(head?.kind!=='choice'||!['battlePlan','support'].includes(a.status))||a.type==='cyclopsHandDone'&&head?.kind!=='hand'||a.type==='cyclopsDefenceChoice'&&(head?.kind!=='defence'||!['damage','prevent',...(head.optional?['skip']:[])].includes(a.status)))return previous;
   if(a.type.startsWith('cyclopsScout')&&(head?.kind!=='scout'||['cyclopsScoutTake','cyclopsScoutSkip'].includes(a.type)&&head.picking===false||!['cyclopsScoutTake','cyclopsScoutSkip'].includes(a.type)&&head.picking!==false))return previous;
   if(a.type==='cyclopsScoutTake'&&(!Number.isInteger(a.index)||!head.cards[a.index]||!isLeadership(previous,seat,head.cards[a.index])))return previous;
   if(['cyclopsScoutDiscard','cyclopsScoutTop'].includes(a.type)&&(!Number.isInteger(a.index)||!head.cards[a.index]))return previous;
   if(a.type==='cyclopsContinue'&&!bypass&&!attackLocked(previous)&&hasResponse(previous,1-t.seat))return {...previous,response:{seat:1-t.seat,action:a}};
   const s=structuredClone(previous),p=s.players[seat];s.response=null;
   if(a.type==='spendSupport'){
    p.support-=option.kind==='draw'?3:1;
    if(option.kind==='cp')gainCP(s.players[option.target],1);
    if(option.kind==='draw'){
     const {target}=option, task=s.cyclopsTask;
     const taskCard=task?.seat===target?task.exclude:undefined;
     drawCards(s.players[target],1,random,taskCard??pendingRollCard(s,target));
    }
    if(option.kind==='reroll'){const ctx=rollContext(s),before=ctx.dice.slice();ctx.dice[option.index]=rerollDie(roll,ctx.dice,option.index,ctx.scalar);if(ctx.scalar)s.effectDie=ctx.dice[0];releaseChangedAnnouncement(s,ctx,before);}
    s.log.unshift(`${heroNames(s)[seat]} spends Support: ${option.label}.`);
   }
   if(a.type==='spendBattlePlan'){
    p.battlePlan-=option.cost;if(p.battlePlanTurn!==s.turn){p.battlePlanTurn=s.turn;p.battlePlanUsed=[];}p.battlePlanUsed.push(option.kind);
    if(option.kind==='focus')focus(s,1-seat);
    if(option.kind==='hand')begin(s,seat,[{kind:'hand',target:1-seat,cards:s.players[1-seat].hand.slice()}],s.stage);
    if(option.kind==='scout')begin(s,seat,[{kind:'scout',cards:p.deck.splice(-3).reverse(),order:[],picking:true}],s.stage);
    s.log.unshift(`${heroNames(s)[seat]} spends Battle Plan: ${option.label}.`);
   }
   if(a.type==='cyclopsRecourse'){p.battlePlan-=2;s.pending.cyclopsSpecialDefence=true;s.stage='defence';}
   if(['cyclopsContinue','cyclopsHandDone'].includes(a.type))s.cyclopsTask.queue.shift();
   if(a.type==='cyclopsCollect')s.cyclopsTask.queue[0].collect=true;
   if(a.type==='cyclopsTokenChoice')s.cyclopsTask.queue[0]={kind:'gain',key:a.status,amount:1};
   if(a.type.startsWith('cyclopsScout')){
    const h=s.cyclopsTask.queue[0];
    if(a.type==='cyclopsScoutTake'){const card=h.cards.splice(a.index,1)[0];p.hand.push(card);s.log.unshift(`${heroNames(s)[seat]} reveals ${seatCard(s,seat,card).name} and adds it to hand.`);h.picking=false;}
    if(a.type==='cyclopsScoutSkip')h.picking=false;
    if(a.type==='cyclopsScoutDiscard')p.discard.push(h.cards.splice(a.index,1)[0]);
    if(a.type==='cyclopsScoutTop')h.order.push(h.cards.splice(a.index,1)[0]);
    if(!h.picking&&!h.cards.length){p.deck.push(...h.order.reverse());s.cyclopsTask.queue.shift();}
   }
   if(a.type==='cyclopsDefenceChoice'){
    if(a.status==='damage')s.pending.returnDamage+=3;
    if(a.status==='prevent'){s.pending.prevention=(s.pending.prevention??0)+2;updateDamage(s.pending);}
    s.cyclopsTask.queue.shift();
   }
   return s;
  }
 };
})();
