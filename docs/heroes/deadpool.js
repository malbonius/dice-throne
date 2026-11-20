const deadpool=(()=>{
 const id=44,hands=['rock','paper','scissors'];
 const board={name:'Deadpool',symbols:['Pew','Pew','Pew','Knife','Joke','Mask'],defence:'Mutant Healing',abilities:[
  {name:'Finger Guns',symbols:{Pew:4},damage:c=>c.Pew>=5?7:6,dSpokenCP:true,text:'4 / 5 Pew · deal 6 / 7 damage. Say “Pew, Pew” while pointing finger guns to gain 1 CP.'},
  {name:'Donut Hole',symbols:{Joke:3},dDraw:1,dDonut:1,damage:()=>4,type:'pure',text:'Draw 1. Gain Donut. Deal 4 pure damage.'},
  {name:'Knife Fight',symbols:{Pew:2,Knife:2},dRps:1,dOnom:1,damage:()=>3,type:'pure',text:'Gain RPS and Onomatopoeia. Deal 3 pure damage.'},
  {name:'Besmirched',symbols:{Pew:1,Knife:1,Joke:1,Mask:1},damage:()=>6,effect:'deadpoolBesmirched',effectCount:2,text:'Deal 6 damage and roll 2: any Pew adds 2; any Knife adds 3; any Joke gains Onomatopoeia; any Mask gains RPS.'},
  {name:'Taco Truck',straight:4,dTaco:true,damage:()=>8,text:'Small straight · deal 8 damage. If the straight uses a 1 or 6, you may shout “Taco Tuesday!” to add 1 damage.'},
  {name:'Fiesta',straight:5,dRps:1,dDonut:1,dSix:true,damage:()=>8,text:'Gain RPS and Donut. Deal 8 damage; add 1 if the straight uses a 6.'},
  {name:'Merc With a Mouth',symbols:{Mask:4},dRps:1,dOnom:1,dDonut:1,damage:()=>6,type:'undefendable',text:'Gain Donut, RPS and Onomatopoeia. Then deal 6 undefendable damage.'},
  {name:'Fourth Wall!',symbols:{Mask:5},dFourth:true,damage:()=>14,type:'ultimate',text:'Gain a Positive status from another player’s leaflet, or gain Donut. Reactivate an inactive Shoot card. Deal 14 Ultimate damage.'}
 ]};
 const upgrades=[
  ['Merc With a Mouth Dos',2,'Merc With a Mouth',{dDonut:2,text:'Gain RPS, Onomatopoeia and 2 Donut. Then deal 6 undefendable damage.'},2,{name:'Oh Look, a Safety Net',symbols:{Mask:3},dRps:1,dDonut:2,text:'Gain RPS and 2 Donut.'}],
  ['Fiesta Dos',2,'Fiesta',{dSix:false,damage:()=>10,text:'Gain RPS and Donut. Then deal 10 damage.'},2,{name:'Baker’s Dozen',symbols:{Joke:5},dDraw:3,dDonut:2,damage:()=>4,type:'pure',text:'Draw 3. Gain 2 Donut. Deal 4 pure damage.'}],
  ['Besmirched Dos',2,'Besmirched',{effectCount:3,text:'Deal 6 damage and roll 3: any Pew adds 2; any Knife adds 3; any Joke gains Onomatopoeia; any Mask gains RPS.'},2,{name:'Fallback Ability',symbols:{Knife:2,Joke:2},dRps:1,damage:()=>6,type:'undefendable',text:'Gain RPS. Deal 6 undefendable damage.'}],
  ['Knife Fight Dos',2,'Knife Fight',{damage:()=>4,text:'Gain RPS and Onomatopoeia. Deal 4 pure damage.'},2,{name:'Stabby, Stabby',symbols:{Knife:5},damage:()=>11,type:'undefendable',text:'Deal 11 undefendable damage.'}],
  ['Mutant Healing Dos',3,'defence',{}],
  ['Finger Guns Dos',0,'Finger Guns',{symbols:{Pew:3},damage:c=>c.Pew>=5?7:c.Pew===4?6:5,dSpokenCP:false,dCP:1,text:'3 / 4 / 5 Pew · deal 5 / 6 / 7 damage. Gain 1 CP.'},2,{name:'????',symbols:{Pew:2,Mask:2},dDonut:1,damage:()=>4,type:'undefendable',text:'Gain Donut. Deal 4 undefendable damage.'}]
 ];
 const cards=[['Whatsamata Pea Ya?!',1,'instant'],['Finger Gun Reload!',1,'main'],['Ro-Sham-Bo!',1,'instant'],['Chimichanga!',0,'main'],['He Who Smelt It…',1,'roll'],['…Dealt It!',1,'roll'],['Buffet!',2,'main'],['Do You Feel Lucky?!',1,'main'],['The Sound of an Eclaire!',0,'main']];
 function view(s){let v=s;for(let i=0;i<20&&v.stage==='deadpoolChoices'&&v.deadpoolTask;i++)v={...v,stage:v.deadpoolTask.resume,deadpoolTask:v.deadpoolTask.parent??null};return v;}
 function busy(s){return !!(s.deadpoolRps||s.deadpoolLucky||s.deadpoolDonutRoll||s.deadpoolRemoval||s.santaGift||s.santaRemoval?.choosing||s.mysticTask&&s.stage==='mysticChoices'||s.krampusTask&&s.stage==='krampusChoices'||s.krampusActivation||s.krampusOverflow!==undefined||s.alchemistTask&&s.stage==='alchemistChoices'||s.psyReveal||s.widowTask||s.widowReveal||s.conjureTask||s.growth||s.mainChoice||s.deadpoolTask&&s.stage==='deadpoolChoices'&&!s.deadpoolTask.queue[0]?.window);}
 function onomChoices(s,seat){const p=s.players[seat],v=view(s);if(!s.cards||!p.onomatopoeia||busy(s)||s.retry||!rollPhase(v)||attackLocked(s)||s.stage==='finished')return [];const d=rollContext(v);if(!d)return [];return d.dice.flatMap((value,index)=>dieOwner(d,index)===seat&&!iceman.contextLocked(s,d,index)?[4,5].filter(to=>to!==value).map(to=>({index,to,label:`${p.curmudgeon?'Spend Onomatopoeia':'Say a sound · spend Onomatopoeia'} · die ${index+1} → ${to===4?'Knife (4)':'Joke (5)'}`})):[]);}
 function attack(s,seat){const v=view(s),h=s.pending;return !!(seat===s.active&&h&&(h.attack??h.damage>0)&&!h.nonAttack&&!h.pure&&!h.evaded&&!h.parlayBlocked&&!s.sideDamage&&['deadpoolAbility','deadpoolPrepared','deadpoolResolved','targeting','defence','defenceResponse','damage','locked'].includes(v.stage));}
 function canRps(s,seat){const h=s.pending,v=view(s);return !!(s.cards&&s.players[seat].rps&&s.players[seat].rpsUsedTurn!==s.turn&&!busy(s)&&!s.cardRoll&&!s.retry&&!s.sideDamage&&(!s.response||s.response.seat===seat)&&h&&!h.pure&&(attack(s,seat)||seat!==s.active&&h.attack&&!h.ultimate&&['defence','defenceResponse','damage'].includes(v.stage)&&incomingDamage(s)>0));}
 function canDonut(s,seat){return !!(s.cards&&seat===s.active&&s.players[seat].donut&&s.stage==='upkeep'&&!s.deadpoolDonutRoll&&!s.retry&&!s.cardRoll&&!s.response&&!s.sideDamage&&!s.deadpoolTask&&!s.deadpoolRps&&!s.deadpoolLucky&&!s.santaNogRoll);}
 function begin(s,seat,queue,resume=s.stage,random=Math.random,offensive=false){const parent=s.deadpoolTask;s.deadpoolTask={seat,queue,resume,locked:!!attackLocked(s),...(parent?{parent}:{}),...(offensive?{offensiveSource:s.active}:{})};s.stage='deadpoolChoices';pump(s,random);}
 function gainDonuts(s,seat,n=1,random=Math.random){begin(s,seat,[{kind:'donuts',left:n,allocation:[0,0]}],s.stage,random);}
 function fourthChoices(s,seat){return [{key:'donut',label:'Gain Donut'},...(scarletWitch.leafletPositives[heroId(s,1-seat)]??[]).filter(k=>k!=='donut').map(key=>({key,label:`Gain ${statusLabel(key)} from ${heroNames(s)[1-seat]}’s leaflet`}))];}
 function externalBusy(s){return !!(s.jeanTask||s.iceTask||s.iceFreezeChoice||s.gambitTask||s.cyclopsTask||s.thorTask||s.thorOverflow||s.lokiTask||s.lokiBag||s.wolverineGain||s.rogueGain||s.stormTask||s.bloodOverflow||s.tacticalOverflow||s.grimOverflow||s.honorOverflow||s.ravenFeathers||s.santaTask||s.conjureTask||s.sideDamage);}
 function pump(s,random=Math.random){if(s.deadpoolFourthResume&&!s.deadpoolTask&&!externalBusy(s)){s.deadpoolTask=s.deadpoolFourthResume;delete s.deadpoolFourthResume;s.stage='deadpoolChoices';}const t=s.deadpoolTask;if(!t||s.stage!=='deadpoolChoices'||s.sideDamage||s.deadpoolRps||s.deadpoolDonutRoll)return;
  const body=()=>{for(let i=0;i<40;i++){
   const h=t.queue[0],p=s.players[t.seat];if(!h){s.stage=t.resume;if(t.parent)s.deadpoolTask=t.parent;else delete s.deadpoolTask;if(s.stage==='deadpoolChoices'||s.deadpoolFourthResume)pump(s,random);return;}
   if(h.kind==='donuts'){if(!h.checked){h.checked=true;if(psylocke.block(s,p,'donut',h.left)){t.queue.shift();continue;}}if(h.left)return;h.allocation.forEach((n,seat)=>{if(n)psylocke.withoutAbility(s,()=>grantStatus(s.players[seat],'donut',n));});t.queue.shift();continue;}
   if(h.kind==='gain'){if(!h.checked){h.checked=true;if(psylocke.block(s,p,h.key,h.amount)){t.queue.shift();continue;}if((p[h.key]??0)+h.amount>statusCap(p,h.key)){h.window=true;if(h.key==='rps'?canRps(s,t.seat):onomChoices(s,t.seat).length)return;h.window=false;}}if(h.window)return;t.queue.shift();psylocke.withoutAbility(s,()=>grantStatus(p,h.key,h.amount));continue;}
   if(['speechCP','speechTaco','fourth'].includes(h.kind))return;
   t.queue.shift();if(h.kind==='cp')gainCP(p,h.amount);if(h.kind==='draw')drawCards(p,h.amount,random,h.exclude);if(h.kind==='shoot')p.shootActive=true;
  }};if(t.offensiveSource!==undefined)psylocke.withAbility(s,body);else psylocke.withoutAbility(s,body);
 }
 function ability(s){const h=s.pending;if(!h.deadpool||h.deadpool.ready)return false;h.deadpool.ready=true;s.stage='deadpoolAbility';return true;}
 function printed(s,random){const r=s.pending.deadpool;if(r.printed)return;r.printed=true;const q=[];if(r.draw)q.push({kind:'draw',amount:r.draw});if(r.donut)q.push({kind:'donuts',left:r.donut,allocation:[0,0]});if(r.rps)q.push({kind:'gain',key:'rps',amount:r.rps});if(r.onom)q.push({kind:'gain',key:'onomatopoeia',amount:r.onom});if(r.cp)q.push({kind:'cp',amount:r.cp});if(r.spokenCP)q.push({kind:s.players[s.active].curmudgeon?'cp':'speechCP',amount:1});if(r.taco){if(s.players[s.active].curmudgeon)s.pending.damage++;else q.push({kind:'speechTaco'});}if(r.fourth)q.push({kind:'fourth'},{kind:'shoot'});begin(s,s.active,q,'deadpoolPrepared',random,true);}
 function effect(s,c,random){if(c.Pew)s.pending.damage+=2;if(c.Knife)s.pending.damage+=3;const q=[];if(c.Joke)q.push({kind:'gain',key:'onomatopoeia',amount:1});if(c.Mask)q.push({kind:'gain',key:'rps',amount:1});begin(s,s.active,q,'deadpoolResolved',random,true);}
 function damage(s,n){const h=s.pending;if(h.grossDamage===undefined){h.damage+=n;h.deadpoolModifiers=(h.deadpoolModifiers??0)+n;}else{h.grossDamage+=n;updateDamage(h);}}
 function synergy(s,seat){const h=s.pending;if(h.deadpoolSmelt&&h.deadpoolDealt&&!h.deadpoolCombo){h.deadpoolCombo=true;damage(s,1);gainCP(s.players[seat],1);}}
 function finishRps(s,win){const r=s.deadpoolRps,p=s.players[r.seat];s.stage=r.resume;delete s.deadpoolRps;if(win){if(r.attacking)damage(s,p.shootActive?3:2);else{s.pending.prevention=(s.pending.prevention??0)+2;updateDamage(s.pending);}}}
 function revealRps(s){const r=s.deadpoolRps,[a,b]=r.picks;r.winner=a===b?null:(hands.indexOf(a)-hands.indexOf(b)+3)%3===1?r.seat:1-r.seat;r.step='reveal';}
 return {id,board,upgrades,cards,promoId:33,hands,view,busy,onomChoices,attack,canRps,canDonut,begin,gainDonuts,fourthChoices,pump,ability,printed,effect,damage,
  rpsActor(s){const r=s.deadpoolRps;return r.step==='second'?1-r.seat:r.step==='shoot'?1-r.winner:r.seat;},
  initialize(s,seat){Object.assign(s.players[seat],{donut:0,onomatopoeia:0,rps:0,shootActive:true,curmudgeon:false});},
  defenceDiceCount:()=>4,
  resolveDefence({state:s,seat,defender:p,counts:c,random}){p.hp=bounded(p.hp+(p.upgrades?.defence?2:1),60);s.pending.returnDamage+=c.Knife??0;if(c.Joke)begin(s,seat,[{kind:'gain',key:'onomatopoeia',amount:p.upgrades?.defence?c.Joke:1}],'damage',random);return s.stage==='deadpoolChoices'?s.stage:'damage';},
  cardChoices(card,{s,seat,one}){const p=s.players[seat];if(card===28)return p.hand.length===1?['donut','rps','onomatopoeia'].map(key=>({key,label:`Gain ${statusLabel(key)}`})):[];if([29,30].includes(card))return attack(s,seat)?one:[];return one;},
  applyCard({id:card,s,seat,p,choice,random}){
   if(card===25){begin(s,seat,[{kind:'gain',key:'onomatopoeia',amount:1}],s.stage,random);return true;}
   if(card===26){p.shootActive=true;return true;}
   if(card===27){begin(s,seat,[{kind:'gain',key:'rps',amount:1}],s.stage,random);return true;}
   if(card===28){if(choice.key==='donut')gainDonuts(s,seat,1,random);else begin(s,seat,[{kind:'gain',key:choice.key,amount:1}],s.stage,random);return true;}
   if(card===29){s.pending.deadpoolSmelt=true;synergy(s,seat);return false;}
   if(card===30){damage(s,2);s.pending.deadpoolDealt=true;synergy(s,seat);return true;}
   if(card===31){gainDonuts(s,seat,2,random);return true;}
   if(card===32){s.deadpoolLucky={seat,target:1-seat,hope:6,step:'hope',resume:s.stage};s.stage='deadpoolLucky';return true;}return false;
  },
  cardRollSize:card=>({29:4,33:1})[card]??0,
  resolveCardRoll({id:card,s,seat,p,counts:c,random}){if(card===29){damage(s,c.Pew??0);return true;}if(card===33){if(c.Mask)begin(s,seat,[{kind:'donuts',left:2,allocation:[0,0]},{kind:'gain',key:'onomatopoeia',amount:2}],s.stage,random);else drawCards(p,1,random,card);return true;}return false;},
  handle(previous,a,roll,random,bypassResponse){
   if(!['deadpoolDonutTarget','deadpoolCollect','deadpoolSpeech','deadpoolFourth','spendOnomatopoeia','spendRps','deadpoolRpsPick','deadpoolRpsRandom','deadpoolRpsReveal','deadpoolShoot','spendDonut','resolveDonut','deadpoolLuckyHope','deadpoolLuckyRoll','deadpoolLuckyResolve','toggleCurmudgeon'].includes(a.type))return undefined;
   const seat=cardActor(previous),t=previous.deadpoolTask,h=t?.queue[0],r=previous.deadpoolRps;let c;
   if(a.type==='deadpoolDonutTarget'&&(previous.stage!=='deadpoolChoices'||h?.kind!=='donuts'||!h.left||![0,1].includes(a.target)))return previous;
   if(a.type==='deadpoolCollect'&&(previous.stage!=='deadpoolChoices'||h?.kind!=='gain'||!h.window))return previous;
   if(a.type==='deadpoolSpeech'&&(previous.stage!=='deadpoolChoices'||!['speechCP','speechTaco'].includes(h?.kind)||!['yes','no'].includes(a.status)))return previous;
   if(a.type==='deadpoolFourth'){c=fourthChoices(previous,seat)[a.choice];if(previous.stage!=='deadpoolChoices'||h?.kind!=='fourth'||!c)return previous;}
   if(a.type==='spendOnomatopoeia'){c=onomChoices(previous,seat)[a.choice];if(!c)return previous;}
   if(a.type==='spendRps'&&!canRps(previous,seat))return previous;
   if(a.type==='spendDonut'&&!canDonut(previous,seat))return previous;
   if(a.type==='resolveDonut'&&(!previous.deadpoolDonutRoll||previous.response||previous.retry))return previous;
   if(a.type==='deadpoolRpsPick'&&(!r||!['first','second'].includes(r.step)||!hands.includes(a.status)))return previous;
   if(a.type==='deadpoolRpsRandom'&&(!r||r.step!=='second'))return previous;
   if(a.type==='deadpoolRpsReveal'&&(!r||r.step!=='reveal'))return previous;
   if(a.type==='deadpoolShoot'&&(!r||r.step!=='shoot'||!['yes','no'].includes(a.status)))return previous;
   if(a.type==='deadpoolLuckyHope'&&(!previous.deadpoolLucky||previous.deadpoolLucky.step!=='hope'||!Number.isInteger(a.amount)||a.amount<1||a.amount>6))return previous;
   if(a.type==='deadpoolLuckyRoll'&&(!previous.deadpoolLucky||previous.deadpoolLucky.step!=='ready'))return previous;
   if(a.type==='deadpoolLuckyResolve'&&(!previous.deadpoolLucky?.dice||previous.response||previous.retry||previous.cardRoll))return previous;
   if(a.type==='toggleCurmudgeon'&&(heroId(previous,seat)!==id||seat!==previous.active||!isMain(previous)||previous.cardRoll||previous.mainAction))return previous;
   if(['resolveDonut','deadpoolLuckyRoll','deadpoolLuckyResolve'].includes(a.type)&&!bypassResponse&&!attackLocked(previous)&&hasResponse(previous,1-seat))return {...previous,response:{seat:1-seat,action:a}};
   const s=structuredClone(previous),p=s.players[seat];psylocke.setState(s);s.response=null;
   if(a.type==='deadpoolDonutTarget'){const q=s.deadpoolTask.queue[0];q.left--;q.allocation[a.target]++;}
   if(a.type==='deadpoolCollect'){const q=s.deadpoolTask.queue.shift();psylocke.withoutAbility(s,()=>grantStatus(p,q.key,q.amount));}
   if(a.type==='deadpoolSpeech'){s.deadpoolTask.queue.shift();if(a.status==='yes'||p.curmudgeon){if(h.kind==='speechCP')gainCP(p,1);else s.pending.damage++;}}
   if(a.type==='deadpoolFourth'){s.deadpoolTask.queue.shift();if(c.key==='donut')s.deadpoolTask.queue.unshift({kind:'donuts',left:1,allocation:[0,0]});else{const task=s.deadpoolTask;delete s.deadpoolTask;s.deadpoolFourthResume=task;s.stage=task.resume;scarletWitch.gain(s,seat,c.key,1-seat);}}
   if(a.type==='spendOnomatopoeia'){p.onomatopoeia--;const d=rollContext(view(s)),before=d.dice.slice();d.dice[c.index]=c.to;if(d.scalar)s.effectDie=c.to;releaseChangedAnnouncement(s,d,before);}
   if(a.type==='spendRps'){removeStatus(p,'rps');p.rpsUsedTurn=s.turn;if(s.pending.ultimate){damage(s,p.shootActive?3:2);}else{s.deadpoolRps={seat,attacking:seat===s.active,resume:s.stage,step:'first',picks:[null,null]};s.stage='deadpoolRps';}}
   if(a.type==='deadpoolRpsPick'){const q=s.deadpoolRps;q.picks[q.step==='first'?0:1]=a.status;if(q.step==='first')q.step='second';else revealRps(s);}
   if(a.type==='deadpoolRpsRandom'){s.deadpoolRps.picks[1]=hands[Math.min(2,Math.floor(random()*3))];revealRps(s);}
   if(a.type==='deadpoolRpsReveal'){const q=s.deadpoolRps;if(q.winner===null){q.picks=[null,null];q.step='first';}else if(s.players[1-q.winner].shootActive)q.step='shoot';else finishRps(s,q.winner===q.seat);}
   if(a.type==='deadpoolShoot'){const q=s.deadpoolRps;if(a.status==='yes'){s.players[seat].shootActive=false;q.winner=seat;}finishRps(s,q.winner===q.seat);}
   if(a.type==='spendDonut'){removeStatus(p,'donut');s.deadpoolDonutRoll={seat,dice:[roll()]};}
   if(a.type==='resolveDonut'){const q=s.deadpoolDonutRoll;s.upkeepDonutHeal=(s.upkeepDonutHeal??0)+Math.ceil(dieValue(q.dice[0],s.players[q.seat])/2);delete s.deadpoolDonutRoll;}
   if(a.type==='deadpoolLuckyHope'){s.deadpoolLucky.hope=a.amount;s.deadpoolLucky.step='ready';}
   if(a.type==='deadpoolLuckyRoll'){s.deadpoolLucky.dice=[roll()];s.deadpoolLucky.step='roll';}
   if(a.type==='deadpoolLuckyResolve'){const q=s.deadpoolLucky,win=dieValue(q.dice[0],s.players[q.target])===q.hope;s.stage=q.resume;delete s.deadpoolLucky;if(win)s.players[q.target].hp=bounded(s.players[q.target].hp+3,60);else startSideDamage(s,q.target,3,'Do You Feel Lucky?!',false,{keepPending:true});}
   if(a.type==='toggleCurmudgeon')p.curmudgeon=!p.curmudgeon;
   pump(s,random);return s;
  }
 };
})();
