const santa=(()=>{
 const id=43;
 const board={name:'Santa',symbols:['Axe','Axe','Axe','Bell','Bell','Star'],defence:'Egg Noggin’ It',abilities:[
  {name:'Trim Your Tree',symbols:{Axe:3},damage:c=>2*c.Axe-2,text:'3 / 4 / 5 Axe · deal 4 / 6 / 8 damage.'},
  {name:'Festivities',symbols:{Axe:3,Star:2},sNog:2,sFestive:1,damage:()=>7,text:'Gain 2 Egg Nog. All players gain 1 CP. Deal 7 damage plus 1 per player, including Santa.'},
  {name:'Fireside Chat',symbols:{Bell:4},sContest:true,damage:()=>6,text:'After targeting, both roll 1. Equal or greater: deal 6 undefendable damage and gain Cheer. Otherwise deal 8 damage and gain Egg Nog.'},
  {name:'Naughty or Nice',symbols:{Axe:2,Bell:2,Star:1},sNaughty:true,damage:()=>10,text:'After targeting, roll 1: 1–4 opponent gains 1 CP then deal 10 damage; 5–6 opponent gains Cheer then deal 12.'},
  {name:'Rosey Cheeks',straight:4,sCheer:1,sRosey:1,damage:()=>6,text:'Gain Cheer. Then deal 6 damage plus 1 per own Cheer.'},
  {name:'Reindeer Games',straight:5,sCheer:1,sNog:2,sReindeer:1,damage:()=>4,text:'Gain Cheer and 2 Egg Nog. Then deal 4 damage plus 1 per own Egg Nog and Cheer.'},
  {name:'Holly Jolly',symbols:{Star:4},sCheer:2,sNog:3,damage:()=>6,type:'undefendable',text:'Gain 2 Cheer and 3 Egg Nog. Deal 6 undefendable damage.'},
  {name:'Comfort and Joy!',symbols:{Star:5},sNog:4,sExtra:true,damage:()=>10,type:'ultimate',text:'Gain 4 Egg Nog. Deal 10 Ultimate damage. Immediately target the same opponent with an additional Offensive Roll Phase if both survive.'}
 ]};
 const upgrades=[
  ['Naughty or Nice II',2,'Naughty or Nice',{sNaughtyUp:true,damage:()=>11,text:'Roll 1 after targeting: 1–3 opponent gains 1 CP then deal 11 damage; 4–6 opponent gains Cheer then deal 13.'}],
  ['Egg Noggin’ It II',2,'defence',{}],
  ['Festivities II',2,'Festivities',{sNog:3,damage:()=>8,text:'Gain 3 Egg Nog. All players gain 1 CP. Then deal 8 damage plus 1 per player, including Santa.'}],
  ['Reindeer Games II',2,'Reindeer Games',{sReindeer:2,text:'Gain Cheer and 2 Egg Nog. Then deal 4 damage plus 1 per own Egg Nog and 2 per own Cheer.'},2,{name:'Mistletoe',symbols:{Axe:2,Bell:2},sMistletoe:2,damage:()=>2,type:'undefendable',text:'Two chosen players each gain Cheer; the same player may be chosen twice. Deal 2 undefendable damage.'}],
  ['Trim Your Tree II',2,'Trim Your Tree',{damage:c=>2*c.Axe-1,sMatchNog:true,text:'3 / 4 / 5 Axe · deal 5 / 7 / 9 damage. Four matching numbers gain Egg Nog.'}],
  ['Holly Jolly II',2,'Holly Jolly',{sCheer:3,damage:()=>7,text:'Gain 3 Cheer and 3 Egg Nog. Deal 7 undefendable damage.'},2,{name:'Tannenboom',symbols:{Star:3},sCheer:1,sNog:5,text:'Gain Cheer and 5 Egg Nog.'}],
  ['Rosey Cheeks II',2,'Rosey Cheeks',{sNog:1,damage:()=>7,text:'Gain Cheer and Egg Nog. Then deal 7 damage plus 1 per own Cheer.'}]
 ];
 const cards=[['Rude-olph!',1,'roll'],['Ho, Ho, Ho!',1,'instant'],["Santa’s Helper!",0,'main'],['Extremely Naughty!',0,'roll'],['Gang-deer!',1,'roll'],['White Elephant Gift!',0,'main'],['Nogtastic!',1,'instant'],['Rebel Without a Claus!',0,'main']];
 function view(s){let v=s;for(let i=0;i<20&&v.stage==='santaChoices'&&v.santaTask;i++)v={...v,stage:v.santaTask.resume,santaTask:v.santaTask.parent??null};return v;}
 function contexts(s){const v=view(s),out=[],d=rollContext(v);if(d)out.push({kind:'current',ctx:d});if(v.cardRoll&&!v.santaNogRoll&&['offence','announce','defenceResponse'].includes(v.stage)){const d=rollContext({...v,cardRoll:null});if(d)out.push({kind:'board',ctx:d});}return out;}
 function busy(s){return !!(s.santaRemoval?.choosing||s.santaGift||s.santaTask&&s.stage==='santaChoices'&&!s.santaTask.queue[0]?.window||s.mysticTask&&s.stage==='mysticChoices'||s.krampusOverflow!==undefined||s.krampusTask&&s.stage==='krampusChoices'||s.krampusActivation||s.alchemistTask&&s.stage==='alchemistChoices'||s.psyReveal||s.widowTask||s.widowReveal||s.conjureTask||s.growth||s.mainChoice||s.santaTask?.queue[0]?.kind==='apology');}
 function cheerChoices(s,seat){const p=s.players[seat];if(!s.cards||!p.cheer||busy(s)||attackLocked(s)||s.stage==='finished'||s.retry||s.response&&s.response.seat!==seat)return [];return contexts(s).flatMap(({kind,ctx})=>ctx.dice.flatMap((v,index)=>dieOwner(ctx,index)===seat&&!iceman.contextLocked(s,ctx,index)?[{kind,index,cost:1,value:0,label:`Spend Cheer · reroll ${kind==='board'?'board ':''}die ${index+1} (${v})`},...(p.cheer>=3&&v!==6?[{kind,index,cost:3,value:6,label:`Spend 3 Cheer · ${kind==='board'?'board ':''}die ${index+1} → 6`}]:[])]:[]));}
 function canNog(s,seat){return !!(s.cards&&(s.players[seat].eggNog??0)>=3&&!busy(s)&&!s.santaNogRoll&&!s.retry&&!s.sideDamage&&s.stage!=='finished'&&(!s.response||s.response.seat===seat)&&(!attackLocked(s)||seat===s.active));}
 function begin(s,seat,queue,resume=s.stage,random=Math.random,offensive=false){const parent=s.santaTask;s.santaTask={seat,queue,resume,locked:!!attackLocked(s),...(parent?{parent}:{}),...(offensive?{offensiveSource:s.active}:{})};s.stage='santaChoices';pump(s,random);}
 function gain(s,seat,key,amount=1,random=Math.random){begin(s,seat,[{kind:'gain',key,amount}],s.stage,random);}
 function pump(s,random=Math.random){const t=s.santaTask;if(!t||s.stage!=='santaChoices'||s.santaNogRoll||s.sideDamage)return;
  const body=()=>{for(let i=0;i<40;i++){
   const h=t.queue[0];if(!h){s.stage=t.resume;if(t.parent)s.santaTask=t.parent;else delete s.santaTask;if(s.stage==='santaChoices')pump(s,random);return;}
   const seat=h.target??t.seat,p=s.players[seat];
   if(h.kind==='gain'){
    if(!h.checked){h.checked=true;if(psylocke.block(s,p,h.key,h.amount)){t.queue.shift();continue;}if((p[h.key]??0)+h.amount>statusCap(p,h.key)){h.window=true;if(h.key==='eggNog'?canNog(s,seat):cheerChoices(s,seat).length)return;h.window=false;}}
    if(h.window)return;t.queue.shift();psylocke.withoutAbility(s,()=>grantStatus(p,h.key,h.amount));continue;
   }
   if(h.kind==='mistletoe'||h.kind==='apology')return;
   t.queue.shift();
   if(h.kind==='cp')gainCP(p,h.amount);
   if(h.kind==='allCP')s.players.forEach(p=>gainCP(p,h.amount));
   if(h.kind==='cards')drawCards(p,h.amount,random,h.exclude);
   if(h.kind==='heal')p.hp=bounded(p.hp+h.amount,60);
   if(h.kind==='calculate'){const r=s.pending.santa;let n=0;if(r.festive)n=s.players.length;if(r.rosey)n=p.cheer??0;if(r.reindeer)n=(p.eggNog??0)+r.reindeer*(p.cheer??0);s.pending.damage+=n;}
   if(h.kind==='side'){startSideDamage(s,1-t.seat,h.amount,h.source,false,{keepPending:true,pantherLocked:!!attackLocked(s)});return;}
  }};if(t.offensiveSource!==undefined)psylocke.withAbility(s,body);else psylocke.withoutAbility(s,body);
 }
 function ability(s){const h=s.pending;if(!h.santa||h.santa.ready)return false;h.santa.ready=true;s.stage='santaAbility';return true;}
 function printed(s,random){const h=s.pending,r=h.santa;if((r.contest||r.naughty)&&!r.rolled){s.stage='santaTarget';return;}if(r.printed)return;r.printed=true;const q=[];if(r.cheer)q.push({kind:'gain',key:'cheer',amount:r.cheer});if(r.nog)q.push({kind:'gain',key:'eggNog',amount:r.nog});if(r.festive)q.push({kind:'allCP',amount:1});if(r.nice)q.push({kind:'cp',amount:1,target:1-s.active});if(r.bad)q.push({kind:'gain',key:'cheer',amount:1,target:1-s.active});if(r.mistletoe)q.push({kind:'mistletoe',left:r.mistletoe,targets:[]});if(r.extreme&&r.bad&&!r.apologyQueued){r.apologyQueued=true;h.undefendable=true;q.push({kind:'apology'});}q.push({kind:'calculate'});begin(s,s.active,q,'santaPrepared',random,true);}
 function damage(s,n){const h=s.pending;if(h.grossDamage===undefined){h.damage+=n;h.santaModifiers=(h.santaModifiers??0)+n;}else{h.grossDamage+=n;updateDamage(h);}}
 function attack(s,seat){const h=s.pending;return !!(seat===s.active&&h&&(h.attack??h.damage>0)&&!h.nonAttack&&!h.pure&&!h.evaded&&!h.parlayBlocked&&!s.sideDamage&&['santaAbility','santaTarget','santaRoll','santaPrepared','targeting','defence','defenceResponse','damage','locked'].includes(s.stage));}
 return {
  leafletPositives: {
   cheer: (state, seat) => gain(state, seat, 'cheer'),
   eggNog: (state, seat) => gain(state, seat, 'eggNog')
  },
  id,board,upgrades,cards,promoId:33,removalChoices(s){const r=s.santaRemoval;return s.players[r.choice.target][r.choice.status]?[r.choice]:mainTargets({...s,santaRemoval:null},r.source,7);},begin,pump,gain,ability,printed,cheerChoices,canNog,contexts,view,damage,attack,
  initialize(s,seat){Object.assign(s.players[seat],{cheer:0,eggNog:0});},
  complexity: 3,
  defenceDiceCount:p=>p.upgrades?.defence?5:4,
  resolveDefence({state:s,seat,counts:c,random}){const q=[];if(c.Bell)q.push({kind:'gain',key:'eggNog',amount:c.Bell});if(c.Star)q.push({kind:'gain',key:'cheer',amount:1});begin(s,seat,q,'damage',random);return s.stage;},
  cardChoices(card,{s,seat,one}){const p=s.players[seat],r=s.pending?.santa;
   if(card===26||card===30)return attack(s,seat)?one:[];
   if(card===28)return p.eggNog>=5?one:[];
   if(card===29)return attack(s,seat)&&r?.naughty&&!r.extreme?one:[];return one;
  },
  applyCard({id:card,s,seat,p,random}){
   if(card===26){damage(s,p.cheer??0);return true;}
   if(card===28){p.eggNog-=5;begin(s,seat,[{kind:'heal',amount:2},{kind:'cards',amount:1,exclude:card},{kind:'gain',key:'cheer',amount:1},{kind:'side',amount:2,source:'Santa’s Helper!'}],s.stage,random);return true;}
   if(card===29){const r=s.pending.santa;r.extreme=true;if(r.bad){r.apologyQueued=true;s.pending.undefendable=true;if(s.stage==='defence')s.stage='damage';begin(s,seat,[{kind:'apology'}],s.stage,random);}return true;}
   if(card===31){s.santaGift={seat,stage:'hide',resume:s.stage};s.stage='santaGift';return true;}
   if(card===32){gain(s,seat,'eggNog',5,random);return true;}return false;
  },
  cardRollSize:card=>({27:1,30:5,33:1})[card]??0,
  resolveCardRoll({id:card,s,seat,p,counts:c,dice,random}){
   if(card===27){gain(s,seat,'cheer',Math.ceil(dice[0]/2),random);return true;}
   if(card===30){damage(s,c.Axe??0);if((c.Bell??0)>=2)gain(s,seat,'cheer',1,random);return true;}
   if(card===33){if(c.Star)begin(s,seat,[{kind:'gain',key:'cheer',amount:2},{kind:'gain',key:'eggNog',amount:4}],s.stage,random);else drawCards(p,1,random,card);return true;}return false;
  },
  handle(previous,a,roll,random,bypassResponse){
   if(!['spendCheer','spendEggNog','resolveEggNog','collectSantaTokens','santaMistletoe','santaApology','rollSantaAbility','resolveSantaRoll','santaGiftHide','santaGiftGuess','santaRemovalReady'].includes(a.type))return undefined;
   const seat=cardActor(previous),t=previous.santaTask,h=t?.queue[0];let c;
   if(a.type==='santaRemovalReady'&&(!previous.santaRemoval||previous.santaRemoval.choosing||previous.santaNogRoll||previous.deadpoolDonutRoll||previous.retry))return previous;
   if(a.type==='spendCheer'){c=cheerChoices(previous,seat)[a.choice];if(!c)return previous;}
   if(a.type==='spendEggNog'&&!canNog(previous,seat))return previous;
   if(a.type==='resolveEggNog'&&(!previous.santaNogRoll||previous.stage!=='santaNogRoll'||previous.response||previous.retry))return previous;
   if(a.type==='collectSantaTokens'&&(previous.stage!=='santaChoices'||h?.kind!=='gain'||!h.window||previous.santaNogRoll||previous.response||previous.retry))return previous;
   if(a.type==='santaMistletoe'&&(previous.stage!=='santaChoices'||h?.kind!=='mistletoe'||![0,1].includes(a.target)))return previous;
   if(a.type==='santaApology'&&(previous.stage!=='santaChoices'||h?.kind!=='apology'||!['yes','no'].includes(a.status)))return previous;
   if(a.type==='rollSantaAbility'&&(previous.stage!=='santaTarget'||previous.response||previous.cardRoll||previous.retry))return previous;
   if(a.type==='resolveSantaRoll'&&(previous.stage!=='santaRoll'||!previous.santaRoll||previous.response||previous.cardRoll||previous.retry))return previous;
   if(a.type==='santaGiftHide'&&(!previous.santaGift||previous.santaGift.stage!=='hide'||!['left','right'].includes(a.status)))return previous;
   if(a.type==='santaGiftGuess'&&(!previous.santaGift||previous.santaGift.stage!=='guess'||!['left','right'].includes(a.status)))return previous;
   if(['rollSantaAbility','resolveSantaRoll','resolveEggNog'].includes(a.type)&&!bypassResponse&&!attackLocked(previous)&&hasResponse(previous,1-seat))return {...previous,response:{seat:1-seat,action:a}};
   const s=structuredClone(previous),p=s.players[seat];psylocke.setState(s);s.response=null;
   if(a.type==='santaRemovalReady')s.santaRemoval.choosing=true;
   if(a.type==='spendCheer'){p.cheer-=c.cost;const d=contexts(s).find(v=>v.kind===c.kind).ctx,before=d.dice.slice();d.dice[c.index]=c.value||rerollDie(roll,d.dice,c.index,d.scalar);if(d.scalar)s.effectDie=d.dice[c.index];releaseChangedAnnouncement(s,d,before);}
   if(a.type==='spendEggNog'){p.eggNog-=3;s.santaNogRoll={seat,dice:[roll()],resume:s.stage,locked:!!attackLocked(s)};s.stage='santaNogRoll';}
   if(a.type==='resolveEggNog'){const r=s.santaNogRoll,n=dieValue(r.dice[0],s.players[r.seat]);delete s.santaNogRoll;s.stage=r.resume;const player=s.players[r.seat];if(n>=1&&n<=3)startSideDamage(s,1-r.seat,2,'Egg Nog',false,{keepPending:true,pantherLocked:r.locked});if(n>=4){player.hp=bounded(player.hp+2,60);if(n<=5)gainCP(player,1);else drawCards(player,1,random);}}
   if(a.type==='collectSantaTokens'){const q=s.santaTask.queue.shift();psylocke.withoutAbility(s,()=>grantStatus(s.players[q.target??s.santaTask.seat],q.key,q.amount));}
   if(a.type==='santaMistletoe'){const q=s.santaTask.queue[0];q.targets.push(a.target);q.left--;if(!q.left){s.santaTask.queue.shift();const targets=[0,1].map(target=>({kind:'gain',key:'cheer',amount:q.targets.filter(n=>n===target).length,target})).filter(x=>x.amount);s.santaTask.queue.unshift(...targets);}}
   if(a.type==='santaApology'){s.santaTask.queue.shift();if(a.status==='no')s.santaTask.queue.unshift({kind:'side',amount:2,source:'Extremely Naughty!'});s.log.unshift(`${heroNames(s)[seat]} ${a.status==='yes'?'apologises for being naughty.':'declines to apologise and receives 2 isolated damage.'}`);}
   if(a.type==='rollSantaAbility'){s.pending.santaTargeted=true;s.santaRoll={seat,dice:s.pending.santa.contest?rollBatch(roll,2,[seat,1-seat]):[roll()]};s.stage='santaRoll';}
   if(a.type==='resolveSantaRoll'){const r=s.santaRoll,i=s.pending.santa,n=dieValue(r.dice[0],s.players[r.seat]);i.rolled=true;if(i.contest){const win=n>=dieValue(r.dice[1],s.players[1-r.seat]);s.pending.damage+=win?0:2;s.pending.undefendable=win;i.cheer=win?1:0;i.nog=win?0:1;}else{const bad=n>=(i.naughtyUp?4:5);i.bad=bad;i.nice=n>0&&!bad;if(!n){s.pending.damage=0;s.pending.abilityDamage=0;s.pending.santaModifiers=0;s.pending.nonAttack=true;}else s.pending.damage+=bad?2:0;}delete s.santaRoll;s.stage='santaAbility';}
   if(a.type==='santaGiftHide'){s.santaGift.hand=a.status;s.santaGift.stage='guess';}
   if(a.type==='santaGiftGuess'){const g=s.santaGift,win=a.status!==g.hand;delete s.santaGift;s.stage=g.resume;s.log.unshift(`White Elephant Gift: the ${g.hand} hand held the gift; the ${a.status} hand was chosen. ${win?'Santa gains the gift.':'No tokens gained.'}`);if(win)begin(s,g.seat,[{kind:'gain',key:'cheer',amount:1},{kind:'gain',key:'eggNog',amount:3}],s.stage,random);}
   pump(s,random);return s;
  }
 };
})();
