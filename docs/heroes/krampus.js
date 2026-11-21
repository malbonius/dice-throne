const krampus=(()=>{
 const id=41,names=['Dotty','Squishy','Sproingy','Sargey','Bitey','Wormy'];
 const board={name:'Krampus',symbols:['Switch','Switch','Switch','Jingle','Present','Horns'],defence:'Deviled Eggs',abilities:[
  {name:'Swat',symbols:{Switch:3},damage:c=>Math.min(c.Switch,5)+2,text:'3 / 4 / 5 Switch · deal 5 / 6 / 7 damage.'},
  {name:'Scavenge',symbols:{Present:3},gifts:3,kCP:2,kDraw:1,text:'Gain 3 Gifts. Gain 2 CP and draw 1.'},
  {name:'Bad Tidings',symbols:{Switch:1,Jingle:1,Present:1,Horns:1},coal:3,badTidings:true,type:'collateral',text:'Distribute 3 Coal among opponents. Then deal 2 collateral damage to each opponent per Coal on their board.'},
  {name:'Rotter',symbols:{Switch:2,Jingle:2},coal:1,damage:()=>8,effect:'krampusRotter',effectCount:1,text:'Inflict Coal. Deal 8 damage. Roll 1: Switch inflicts Coal, Present gains Gift, Horns draws a Reject.'},
  {name:'Misbehaving',straight:4,gifts:1,damage:()=>7,text:'Small straight · gain Gift. Deal 7 damage.'},
  {name:'Rejection',straight:5,rejection:true,damage:()=>9,text:'Draw a Reject or activate one Reject without discarding it. Deal 9 damage.'},
  {name:'Spoils',symbols:{Horns:4},gifts:1,rejectDraw:1,coal:2,damage:()=>9,text:'Gain Gift. Draw 1 Reject. Inflict 2 Coal. Deal 9 damage.'},
  {name:'Discomfort and Pain!',symbols:{Horns:5},gifts:1,rejectDraw:2,freeReject:true,damage:()=>10,type:'ultimate',text:'Gain Gift. Draw 2 Rejects. Deal 10 Ultimate damage. You may activate one Reject without discarding it.'}
 ]};
 const upgrades=[
  ['Swat II',1,'Swat',{giftTriple:true,text:'Deal 5 / 6 / 7 damage. On three matching numbers, gain Gift.'}],
  ['Scavenge II',0,'Scavenge',{symbols:{Present:2},text:'Gain 3 Gifts. Then gain 2 CP and draw 1.'}],
  ['Misbehaving II',1,'Misbehaving',{damage:()=>8,text:'Small straight · gain Gift. Deal 8 damage.'}],
  ['Spoils II',2,'Spoils',{rejectDraw:2,text:'Gain Gift. Draw 2 Rejects. Inflict 2 Coal. Deal 9 damage.'},2,{name:'Unholy Presents',symbols:{Horns:3},gifts:1,damage:()=>4,type:'undefendable',text:'Gain Gift. Deal 4 undefendable damage.'}],
  ['Rotter II',1,'Rotter',{coal:0,effectCount:2,rotterUp:true,text:'Deal 8 damage. Roll 2: Coal per Switch, heal per Jingle, Gift per Present, Reject per Horns.'}],
  ['Rejection II',2,'Rejection',{rejection:false,rejectDraw:1,freeReject:true,text:'Draw 1 Reject. You may activate one Reject without discarding it. Deal 9 damage.'},2,{name:'Charcoal Surprise',symbols:{Switch:3,Present:1},gifts:1,coal:1,damage:()=>2,type:'undefendable',text:'Gain Gift. Inflict Coal. Deal 2 undefendable damage.'}],
  ['Deviled Eggs II',3,'defence',{}]
 ];
 const cards=[["Krampus’ Helper!",3,'main'],['Give a Little!',0,'main'],["Bitey’s Bite!",2,'roll'],["Sproingy’s Surprise!",2,'roll'],["Dotty’s Diversion!",0,'roll'],['Regift!',1,'instant'],['Krusty Krampus!',0,'main']];
 function attack(s,seat){const h=s.pending;return !!(seat===s.active&&h&&(h.attack??h.damage>0)&&!h.nonAttack&&!h.pure&&!h.evaded&&!h.parlayBlocked&&!s.sideDamage&&['krampusAbility','krampusPrepared','krampusResolved','krampusChoices','krampusActivation','targeting','defence','defenceResponse','damage','locked'].includes(s.stage));}
 function incoming(s,seat){const h=s.pending;return !!(seat!==s.active&&h?.attack&&!h.ultimate&&!s.sideDamage&&['defence','defenceResponse','damage','krampusActivation'].includes(s.stage)&&incomingDamage(s)>0);}
 function context(s){let v=s;if(v.stage==='krampusActivation')v={...v,stage:v.krampusActivation.resume};for(let i=0;i<20&&v.stage==='krampusChoices'&&v.krampusTask;i++)v={...v,stage:v.krampusTask.resume,krampusTask:v.krampusTask.parent??null};return v;}
 function options(s,seat,free=false){const p=s.players[seat],v=context(s),h=s.krampusTask?.queue[0];if(!s.cards||p.hero!==id||s.krampusActivation||s.krampusTask&&s.stage==='krampusChoices'&&!['draw','free','gift'].includes(h?.kind)||s.krampusTask&&s.stage==='krampusChoices'&&h?.kind==='draw'&&!h.window||s.krampusTask&&s.stage==='krampusChoices'&&h?.kind==='gift'&&!h.window||s.cardRoll||s.retry||s.psyReveal||s.iceFreezeChoice||s.sideDamage||s.krampusOverflow!==undefined||['finished','discard'].includes(s.stage)||seat!==s.active&&attackLocked(s))return [];
  return (p.rejects??[]).filter(r=>p.rejectUsed?.[r]!==s.turn).filter(r=>r===5?seat===s.active&&['offence','announce'].includes(v.stage):r===1?incoming(v,seat):attack(v,seat)&&(r!==3||!s.pending.undefendable&&!s.pending.ultimate)).map(reject=>({reject,free,label:`${free?'Activate without discarding':'Activate'} ${names[reject]}`}));
 }
 function canGift(s,seat){const t=s.krampusTask,h=t?.queue[0],main=isMain(s)||s.stage==='krampusChoices'&&t.seat===seat&&h?.kind==='gift'&&h.window&&['main','main1'].includes(t.resume);return !!(s.cards&&s.players[seat].hero===id&&s.players[seat].gift&&seat===s.active&&main&&!s.krampusActivation&&s.krampusOverflow===undefined&&!s.cardRoll&&!s.retry&&!s.response&&!s.sideDamage);}
 function begin(s,seat,queue,resume=s.stage,random=Math.random,offensive=false){const parent=s.krampusTask;s.krampusTask={seat,queue,resume,locked:!!attackLocked(s),...(parent?{parent}:{}),...(offensive?{offensiveSource:s.active}:{})};s.stage='krampusChoices';pump(s,random);}
 function rawDraw(s,seat,n,random){const p=s.players[seat];for(let i=0;i<n;i++){if(!p.rejectDeck.length){if(!p.rejectDiscard.length)break;p.rejectDeck=shuffle(p.rejectDiscard,random);p.rejectDiscard=[];}p.rejects.push(p.rejectDeck.pop());}if(p.rejects.length>3)s.krampusOverflow=seat;}
 function pump(s,random=Math.random){const t=s.krampusTask;if(!t||s.stage!=='krampusChoices'||s.krampusOverflow!==undefined||s.krampusActivation||s.cardRoll||s.retry||s.sideDamage)return;
  const body=()=>{for(let i=0;i<40;i++){
   const h=t.queue[0],p=s.players[t.seat];
   if(!h){s.stage=t.resume;if(t.parent)s.krampusTask=t.parent;else delete s.krampusTask;if(s.stage==='krampusChoices')pump(s,random);return;}
   if(h.kind==='draw'){
    if(h.window)return;
    if(p.rejects.length+h.amount>3){h.window=true;if(options(s,t.seat).length)return;h.window=false;}
    t.queue.shift();rawDraw(s,t.seat,h.amount,random);if(s.krampusOverflow!==undefined)return;continue;
   }
   if(h.kind==='gift'){
    if(!h.checked){h.checked=true;if(psylocke.block(s,p,'gift',h.amount)){t.queue.shift();continue;}}
    if(h.window)return;
    if((p.gift??0)+h.amount>3&&['main','main1'].includes(t.resume)&&p.gift){h.window=true;return;}
    t.queue.shift();psylocke.withoutAbility(s,()=>grantStatus(p,'gift',h.amount));continue;
   }
   if(h.kind==='free'){if(options(s,t.seat,true).length)return;t.queue.shift();continue;}
   if(h.kind==='rejection')return;
   t.queue.shift();
   if(h.kind==='coal'){
    const target=1-t.seat;if(h.board){const hit=s.pending;hit.coal=(hit.coal??0)+h.amount;if(!hit.krampusCoalApplied){hit.krampusCoalApplied=true;hit.krampusCoalPrior=s.players[target].coal??0;}}
    grantStatus(s.players[target],'coal',h.amount);
   }
   if(h.kind==='cp')gainCP(p,h.amount);
   if(h.kind==='cards')drawCards(p,h.amount,random);
   if(h.kind==='heal')p.hp=bounded(p.hp+h.amount,60);
   if(h.kind==='bad')s.pending.damage=2*(s.players[1-t.seat].coal??0);
  }};
  if(t.offensiveSource!==undefined)psylocke.withAbility(s,body);else psylocke.withoutAbility(s,body);
 }
 function ability(s){const h=s.pending;if(!h.krampus||h.krampus.ready)return false;h.krampus.ready=true;s.stage='krampusAbility';return true;}
 function printed(s,random){const h=s.pending,r=h.krampus;if(r.printed)return;r.printed=true;const q=[];if(r.gifts)q.push({kind:'gift',amount:r.gifts});if(r.draw)q.push({kind:'draw',amount:r.draw});if(r.coal)q.push({kind:'coal',amount:r.coal,board:true});if(r.cp)q.push({kind:'cp',amount:r.cp});if(r.cards)q.push({kind:'cards',amount:r.cards});if(r.bad)q.push({kind:'bad'});if(r.rejection)q.push({kind:'rejection'});if(r.free)q.push({kind:'free'});begin(s,s.active,q,'krampusPrepared',random,true);}
 function effect(s,c,random){const up=s.pending.krampus.rotterUp,q=[];if(c.Switch)q.push({kind:'coal',amount:up?c.Switch:1,board:true});if(up&&c.Jingle)q.push({kind:'heal',amount:c.Jingle});if(c.Present)q.push({kind:'gift',amount:up?c.Present:1});if(c.Horns)q.push({kind:'draw',amount:up?c.Horns:1});begin(s,s.active,q,'krampusResolved',random,true);}
 function damage(s,n){const h=s.pending;if(h.grossDamage===undefined){h.damage+=n;h.krampusModifiers=(h.krampusModifiers??0)+n;}else{h.grossDamage+=n;updateDamage(h);}}
 function activate(s,seat,reject,free=false){const p=s.players[seat];(p.rejectUsed??={})[reject]=s.turn;const resume=s.stage;s.krampusActivation={seat,reject,free,resume,multiplier:1,bonus:0,locked:!!attackLocked(s)};s.stage='krampusActivation';if(reject===2)psylocke.withoutAbility(s,()=>grantStatus(s.players[1-seat],'coal',2));}
 function finish(s){const a=s.krampusActivation,p=s.players[a.seat],h=s.pending;s.stage=a.resume;
  if(a.reject===0)damage(s,3);
  if(a.reject===1){h.prevention=(h.prevention??0)+3;updateDamage(h);}
  if(a.reject===2)damage(s,1+a.bonus);
  if(a.reject===3){h.undefendable=true;if(s.stage==='defence')s.stage='damage';}
  if(a.reject===4){p.hp=bounded(p.hp+2*a.multiplier,60);damage(s,2*a.multiplier);}
  if(a.reject===5){s.budget++;if(s.stage==='announce'){s.pending=null;s.stage='offence';}}
  if(!a.free){p.rejects.splice(p.rejects.indexOf(a.reject),1);p.rejectDiscard.push(a.reject);}delete s.krampusActivation;
 }
 return {id,board,upgrades,cards,promoId:32,names,options,canGift,begin,pump,ability,printed,effect,damage,activate,finish,rawDraw,
  initialize(s,seat,random=Math.random){const p=s.players[seat];Object.assign(p,{gift:0,coal:0,rejectDeck:shuffle([0,1,2,3,4,5],random),rejectDiscard:[],rejects:[],rejectUsed:{}});rawDraw(s,seat,1,random);},
  complexity: 4,
  defenceEffect: p => 'On 2 Switch, inflict Coal. Any Present grants 1 Gift. Any Horns returns 1 damage per Reject in play.' + (p.upgrades?.defence ? ' Any Jingle heals 1.' : ''),
  defenceDiceCount:p=>p.upgrades?.defence?4:3,
  resolveDefence({state:s,seat,defender:p,counts:c}){if((c.Switch??0)>=2)grantStatus(s.players[1-seat],'coal');if(p.upgrades?.defence&&c.Jingle)p.hp=bounded(p.hp+1,60);if(c.Horns)s.pending.returnDamage+=p.rejects.length;if(c.Present)grantStatus(p,'gift');return 'damage';},
  cardChoices(card,{s,seat,one}){const a=s.krampusActivation;if(card===27)return s.players[seat].gift?one:[];
   if([28,29,30,31].includes(card)){if(!a||a.seat!==seat)return [];if(card===28)return a.reject===4?one:[];if(card===29)return a.reject===2?one:[];if(card===30)return a.reject===0&&(s.players[1-seat].coal??0)>=2?one:[];return !a.free?one:[];}return one;
  },
  applyCard({id:card,s,seat,p,random}){if(card===26){begin(s,seat,[{kind:'draw',amount:2}],s.stage,random);return true;}
   if(card===27){removeStatus(p,'gift');startSideDamage(s,1-seat,3,'Give a Little!',false,{keepPending:true});return true;}
   if(card===28){s.krampusActivation.multiplier*=2;return true;}
   if(card===29){s.krampusActivation.bonus+=Math.min(4,s.players[1-seat].coal??0);return true;}
   if(card===30){const n=s.players[1-seat].coal??0;if(n>=2)gainCP(p,2);if(n>=4)drawCards(p,1,random,card);return true;}
   if(card===31){s.krampusActivation.free=true;return true;}return false;
  },
  cardRollSize:card=>card===32?1:0,
  resolveCardRoll({id:card,s,seat,p,counts:c,random}){if(card!==32)return false;if(c.Horns)begin(s,seat,[{kind:'gift',amount:3}],s.stage,random);else drawCards(p,1,random,card);return true;},
  handle(previous,a,roll,random){
   if(!['spendGift','activateReject','finishReject','collectRejects','discardReject','krampusFree','krampusFreeSkip','krampusRejection','collectGifts'].includes(a.type))return undefined;
   const seat=cardActor(previous),t=previous.krampusTask,h=t?.queue[0];let c;
   if(a.type==='spendGift'&&!canGift(previous,seat))return previous;
   if(a.type==='activateReject'){c=options(previous,seat)[a.choice];if(!c)return previous;}
   if(a.type==='krampusFree'){c=options(previous,seat,true)[a.choice];if(!c||previous.stage!=='krampusChoices'||h?.kind!=='free')return previous;}
   if(a.type==='krampusFreeSkip'&&(previous.stage!=='krampusChoices'||h?.kind!=='free'))return previous;
   if(a.type==='krampusRejection'&&(previous.stage!=='krampusChoices'||h?.kind!=='rejection'||!['draw','free'].includes(a.status)))return previous;
   if(a.type==='finishReject'&&(!previous.krampusActivation||previous.cardRoll||previous.retry||previous.response))return previous;
   if(a.type==='collectRejects'&&(previous.stage!=='krampusChoices'||h?.kind!=='draw'||!h.window||seat!==t.seat||previous.krampusOverflow!==undefined))return previous;
   if(a.type==='collectGifts'&&(previous.stage!=='krampusChoices'||h?.kind!=='gift'||!h.window||seat!==t.seat))return previous;
   if(a.type==='discardReject'&&(previous.krampusOverflow!==seat||!previous.players[seat].rejects.includes(a.index)))return previous;
   const s=structuredClone(previous),p=s.players[seat];psylocke.setState(s);s.response=null;
   if(a.type==='spendGift'){removeStatus(p,'gift');begin(s,seat,[{kind:'draw',amount:1}],s.stage,random);}
   if(a.type==='activateReject')activate(s,seat,c.reject);
   if(a.type==='krampusFree'){s.krampusTask.queue.shift();activate(s,seat,c.reject,true);}
   if(a.type==='krampusFreeSkip')s.krampusTask.queue.shift();
   if(a.type==='krampusRejection')s.krampusTask.queue.splice(0,1,{kind:a.status,amount:1});
   if(a.type==='finishReject')psylocke.withoutAbility(s,()=>finish(s));
   if(a.type==='collectRejects'){s.krampusTask.queue.shift();rawDraw(s,seat,h.amount,random);}
   if(a.type==='collectGifts'){s.krampusTask.queue.shift();psylocke.withoutAbility(s,()=>grantStatus(p,'gift',h.amount));}
   if(a.type==='discardReject'){p.rejects.splice(p.rejects.indexOf(a.index),1);p.rejectDiscard.push(a.index);if(p.rejects.length<=3)delete s.krampusOverflow;}
   pump(s,random);return s;
  }
 };
})();
