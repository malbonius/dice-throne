const alchemist=(()=>{
 const id=40,types=['punchify','bolsterate','cleansitude','toxification'],limits={punchify:6,bolsterate:2,cleansitude:3,toxification:1};
 const board={name:'Alchemist',symbols:['Solution','Solution','Solution','Composition','Composition','Crucible'],defence:'Passivation',abilities:[
  {name:'Transmute',symbols:{Solution:3,Composition:2},aCP:1,damage:()=>6,text:'Gain 1 CP. Deal 6 damage.'},
  {name:'Hermetics',symbols:{Composition:3},attach:3,aHeal:2,text:'Attach 3 Potions. Heal 2.'},
  {name:'Potion Overload',symbols:{Solution:1,Crucible:3},attach:2,damage:()=>7,text:'Attach 2 Potions. Deal 7 damage.'},
  {name:'Diffusion',straight:4,attach:1,damage:()=>7,text:'Small straight · attach 1 Potion. Deal 7 damage.'},
  {name:'Diffusion (large straight)',straight:5,upgradeSlot:'Diffusion',variant:'large',attach:2,aDraw:1,damage:()=>8,text:'Large straight · attach 2 Potions. Draw 1. Deal 8 damage.'},
  {name:'Catalyst',symbols:{Crucible:4},eachPotion:true,damage:()=>6,type:'undefendable',text:'Attach 1 of each type of Potion. Deal 6 undefendable damage.'},
  {name:'Chain Reaction',symbols:{Solution:4,Crucible:1},extraPotions:1,damage:()=>6,text:'Deal 6 damage. You may also spend 1 Potion attached to another Offensive Ability.'},
  {name:'Chemical Trip!',symbols:{Crucible:5},attach:4,extraPotions:3,damage:()=>10,type:'ultimate',text:'Attach 4 Potions. Deal 10 Ultimate damage. You may spend up to 3 Potions attached to your Offensive Abilities.'}
 ]};
 const upgrades=[
  ['Transmute II',1,'Transmute',{aCP:2,text:'Gain 2 CP. Deal 6 damage. Two Potion slots.'}],
  ['Hermetics II',1,'Hermetics',{aHeal:3,text:'Attach 3 Potions. Heal 3.'},2,{name:'Inspired Chemist',symbols:{Composition:5},attach:4,aHeal:4,text:'Attach 4 Potions. Heal 4.'}],
  ['Potion Overload II',1,'Potion Overload',{attach:3,text:'Attach 3 Potions. Deal 7 damage. Three Potion slots.'}],
  ['Chain Reaction II',0,'Chain Reaction',{damage:()=>7,text:'Deal 7 damage. You may also spend 1 Potion attached to another Offensive Ability. Two Potion slots.'}],
  ['The Lab II',2,'The Lab',{}]
 ];
 const cards=[['Transmogrify!',1,'main'],['Potion Master!',2,'main'],['Potion Explosion!',1,'roll'],['Mutation!',0,'main'],['Girded!',1,'roll'],['Tonic!',1,'main'],['Concoction!',1,'main'],['Noxious!',1,'main'],['Life Extraction!',2,'roll'],['Chemistry!',2,'main'],['Refill!',0,'main']];
 function slots(p){return {'Transmute':p.upgrades?.Transmute?2:1,'Hermetics':p.upgrades?.Hermetics?0:1,'Potion Overload':p.upgrades?.['Potion Overload']?3:2,'Diffusion':2,'Catalyst':2,'Chain Reaction':p.upgrades?.['Chain Reaction']?2:1,defence:3};}
 function sync(p){for(const key of types)p[key]=(p.potions??[]).filter(t=>t.key===key).length;}
 function remove(p,key,tokenId){const at=(p.potions??[]).findIndex(t=>t.key===key&&(tokenId===undefined||t.id===tokenId));if(at<0)return;const [t]=p.potions.splice(at,1);sync(p);return t;}
 function tokenLabel(t){return `${statusLabel(t.key)} · ${t.slot==='defence'?'Passivation':t.slot} · slot ${t.index+1}`;}
 function tokens(s,seat,key){return (s.players[seat].potions??[]).filter(t=>!key||t.key===key);}
 function statusOptions(s,seat){return statusKeys.filter(k=>s.players[seat][k]).flatMap(key=>types.includes(key)?tokens(s,seat,key).map(t=>({key,tokenId:t.id,label:tokenLabel(t)})):key==='timeBomb'?(s.players[seat].timeBombTimers??[]).map(t=>({key,tokenId:t.id,label:`Time Bomb 0:0${t.ticks}`})):key==='spellbound'?(s.players[seat].boundAbilities??[]).map(t=>({key,tokenId:t.id,label:`Spellbound · ${t.key}`})):key==='bagOfTricks'?(s.players[seat].trickBags??[]).map(t=>({key,tokenId:t.id,label:`Bag of Tricks from ${heroNames(s)[t.owner]}`})):[{key,label:statusLabel(key)}]);}
 function attachOptions(s,seat,h={}){const p=s.players[seat];return Object.entries(slots(p)).flatMap(([slot,n])=>Array.from({length:n},(_,index)=>({slot,index}))).filter(pos=>!tokens(s,seat).some(t=>t.slot===pos.slot&&t.index===pos.index)).flatMap(pos=>types.filter(key=>(!h.only||h.only===key)&&(!h.types||h.types[key]>0)&&h.exclude!==key&&tokens(s,seat,key).length<limits[key]&&(pos.slot==='defence'?key!=='punchify':key!=='bolsterate')).map(key=>({...pos,key,label:`${statusLabel(key)} → ${pos.slot==='defence'?'Passivation':pos.slot} · slot ${pos.index+1}`})));}
 function attach(s,seat,c){const p=s.players[seat],t={id:(p.potionNext??0)+1,key:c.key,slot:c.slot,index:c.index};p.potionNext=t.id;(p.potions??=[]).push(t);sync(p);return t;}
 function each(){return [{kind:'attach',left:4,types:Object.fromEntries(types.map(key=>[key,1]))}];}
 function begin(s,seat,queue,resume=s.stage,random=Math.random){s.alchemistTask={seat,queue,resume,removed:[],retainSpend:!!s.alchemistSpend};s.stage='alchemistChoices';pump(s,random);}
 function start(s){const p=s.players[s.active];if(p.hero===id)s.alchemistStart={seat:s.active,occupied:tokens(s,s.active).map(t=>({...t}))};else delete s.alchemistStart;}
 function spendable(s,t){const start=s.alchemistStart;if(!start||start.seat!==s.active)return true;return !start.occupied.some(old=>old.slot===t.slot&&old.index===t.index&&old.id!==t.id);}
 function ability(s){const h=s.pending;if(!h.alchemist||h.alchemist.ready)return false;h.alchemist.ready=true;s.stage='alchemistAbility';return true;}
 function prepare(s,random){const h=s.pending,r=h.alchemist,p=s.players[s.active];if(!r.printed){r.printed=true;gainCP(p,(r.cp??0));const queue=r.each?each():[{kind:'attach',left:r.attach??0}];queue.push({kind:'printed',heal:r.heal??0,draw:r.draw??0});begin(s,s.active,queue,'alchemistPotions',random);}else s.stage='alchemistPotions';}
 function beginSpend(s,seat,defensive=false){const h=s.pending,r=h.alchemist;s.alchemistSpend={seat,defensive,slot:defensive?'defence':r.slot,extra:defensive?0:r.extra??0};s.stage=defensive?'alchemistDefence':'alchemistPotions';if(defensive&&hasResponse(s,s.active))s.response={seat:s.active,action:{type:'alchemistDefenceReady'}};else s.stage='alchemistPotions';}
 function spendChoices(s,seat){const r=s.alchemistSpend,h=s.pending;if(!r||r.seat!==seat||s.stage!=='alchemistPotions'||s.response||s.alchemistTask||s.cardRoll||s.retry||s.sideDamage)return [];
  return tokens(s,seat).filter(t=>r.defensive?t.slot==='defence':t.slot!=='defence'&&spendable(s,t)&&(t.slot===r.slot||r.extra>0)).flatMap(t=>{
   const base={tokenId:t.id,key:t.key,extra:t.slot!==r.slot};
   if(t.key==='punchify')return !r.defensive&&h.damage>0&&!h.pure&&!h.evaded&&!h.parlayBlocked?[{...base,effect:'damage',label:`Spend ${tokenLabel(t)} · +2 Attack damage`}]:[];
   if(t.key==='bolsterate')return r.defensive?[{...base,effect:'prevent',label:`Spend ${tokenLabel(t)} · prevent 2 damage`}]:[];
   if(t.key==='toxification')return [0,1].map(target=>({...base,effect:'poison',target,label:`Spend ${tokenLabel(t)} · Poison ${heroNames(s)[target]}`}));
   return [{...base,effect:'heal',label:`Spend ${tokenLabel(t)} · heal 1`},...statusOptions(s,seat).filter(c=>c.key!==t.key||c.tokenId!==t.id).map(c=>({...base,effect:'remove',status:c.key,removeId:c.tokenId,label:`Spend ${tokenLabel(t)} · remove ${c.label}`}))];
  });
 }
 function labChoices(s,seat){const p=s.players[seat],d=rollContext(s);if(!s.cards||p.hero!==id||s.stage==='finished'||s.response&&s.response.seat!==seat||s.alchemistTask||s.iceFreezeChoice||s.retry||s.psyReveal||attackLocked(s)||!d)return [];
  return tokens(s,seat).flatMap(t=>d.dice.flatMap((v,index)=>dieOwner(d,index)===seat&&!iceman.contextLocked(s,d,index)?[{tokenId:t.id,key:t.key,index,label:`The Lab · remove ${tokenLabel(t)} · reroll die ${index+1} (${v})`}]:[]));
 }
 function damage(s,n){const h=s.pending;if(h.grossDamage===undefined){h.damage+=n;h.alchemistModifiers=(h.alchemistModifiers??0)+n;}else {h.grossDamage+=n;updateDamage(h);}}
 function pump(s,random=Math.random){const t=s.alchemistTask;if(!t||s.stage!=='alchemistChoices'||s.sideDamage||s.cardRoll||s.retry)return;
  for(let safety=0;safety<30;safety++){
   const h=t.queue[0],p=s.players[t.seat];
   if(!h){delete s.alchemistTask;s.stage=t.resume;if(t.resume==='alchemistPotions'&&!t.retainSpend)beginSpend(s,t.seat);if(t.resume==='alchemistDefence')beginSpend(s,t.seat,true);return;}
   if(h.kind==='attach'){if(h.left>0&&attachOptions(s,t.seat,h).length)return;t.queue.shift();continue;}
   if(h.kind==='remove'){if(h.left>0&&tokens(s,t.seat,h.only).length)return;t.queue.shift();continue;}
   if(['status','target'].includes(h.kind)){if(h.kind==='status'&&!s.players.some((_,i)=>statusOptions(s,i).length)){t.queue.shift();continue;}return;}
   t.queue.shift();
   if(h.kind==='printed'){p.hp=bounded(p.hp+h.heal,60);drawCards(p,h.draw,random);}
   if(h.kind==='mutation')gainCP(p,2*t.removed.length);
   if(h.kind==='chemistry')t.queue.unshift({kind:'attach',left:3,exclude:t.removed[0]?.key});
   if(h.kind==='explosion'&&t.removed.length){startSideDamage(s,1-t.seat,2*t.removed.length,'Potion Explosion!',false,{keepPending:true});return;}
  }
 }
 function taskChoices(s){const t=s.alchemistTask;if(!t)return [];const h=t.queue[0];if(h?.kind==='attach')return attachOptions(s,t.seat,h);if(h?.kind==='remove')return tokens(s,t.seat,h.only).map(token=>({tokenId:token.id,key:token.key,label:`Remove ${tokenLabel(token)}`}));if(h?.kind==='status')return s.players.flatMap((_,target)=>statusOptions(s,target).map(c=>({...c,target,label:`${heroNames(s)[target]} · ${c.label}`})));if(h?.kind==='target')return s.players.map((_,target)=>({target,label:`Deal 3 damage to ${heroNames(s)[target]}`}));return [];}
 function taskOptional(s){const h=s.alchemistTask?.queue[0];return h?.kind==='remove'&&!h.required;}
 function busy(s){return !!(s.alchemistTask||s.alchemistSpend||s.alchemistRoll);}
 return {id,board,upgrades,cards,promoId:34,types,limits,slots,sync,remove,tokenLabel,tokens,statusOptions,attachOptions,attach,begin,start,ability,prepare,beginSpend,spendChoices,labChoices,damage,pump,taskChoices,taskOptional,busy,
  initialize(s,seat){Object.assign(s.players[seat],{potions:[],potionNext:0,punchify:0,bolsterate:0,cleansitude:0,toxification:0});},
  defenceDiceCount:()=>5,
  resolveDefence({state:s,seat,counts:c}){if(s.pending.alchemistGirded&&!c.Crucible)s.pending.prevention=(s.pending.prevention??0)+2*s.pending.alchemistGirded;begin(s,seat,[{kind:'attach',left:c.Crucible??0}],'alchemistDefence');return s.stage;},
  cardChoices(card,{s,seat,one}){const p=s.players[seat],h=s.pending;
   if(card===24)return tokens(s,seat,'cleansitude').length&&s.players.some((_,i)=>statusOptions(s,i).length)?one:[];
   if(card===29)return tokens(s,seat,'punchify').length?one:[];
   if(card===32)return seat===s.active&&h&&(h.attack??h.damage>0)&&!h.pure&&!h.evaded&&!h.parlayBlocked&&['alchemistAbility','alchemistPotions','targeting','defence','defenceResponse','damage','locked'].includes(s.stage)?one:[];
   if(card===28)return seat!==s.active&&s.stage==='defenceResponse'&&!s.cardRoll?one:[];
   if(card===26)return seat!==s.active&&h?.attack&&!h.ultimate&&['defence','defenceResponse','alchemistPotions','damage'].includes(s.stage)?one:[];
   if(card===33)return tokens(s,seat).length?one:[];
   if(card===31)return attachOptions(s,seat,{only:'toxification'}).length?one:[];
   if(card===25)return attachOptions(s,seat).length?one:[];
   return one;
  },
  applyCard({id:card,s,seat,p}){
   if(card===24){begin(s,seat,[{kind:'remove',left:1,required:true,only:'cleansitude'},{kind:'status'}]);return true;}
   if(card===25){begin(s,seat,each());return true;}
   if(card===26){begin(s,seat,[{kind:'remove',left:2},{kind:'explosion'}]);return true;}
   if(card===27){begin(s,seat,[{kind:'remove',left:2},{kind:'mutation'}]);return true;}
   if(card===28){s.extraDefence=(s.extraDefence??0)+1;s.pending.alchemistGirded=(s.pending.alchemistGirded??0)+1;return true;}
   if(card===29){begin(s,seat,[{kind:'remove',left:1,required:true,only:'punchify'},{kind:'target'}]);return true;}
   if(card===31){begin(s,seat,[{kind:'attach',left:1,only:'toxification'}]);return true;}
   if(card===33){begin(s,seat,[{kind:'remove',left:1,required:true},{kind:'chemistry'}]);return true;}return false;
  },
  cardRollSize:card=>({30:1,32:3,34:1})[card]??0,
  resolveCardRoll({id:card,s,seat,p,counts:c,random}){
   if(card===32){const n=c.Solution??0;damage(s,n);p.hp=bounded(p.hp+n,60);return true;}
   if(card===30){begin(s,seat,[{kind:'attach',left:c.Solution?1:c.Composition||c.Crucible?2:0,same:!!c.Composition},...(c.Crucible?[{kind:'printed',heal:1,draw:0}]:[])]);return true;}
   if(card===34){if(c.Crucible)begin(s,seat,[{kind:'attach',left:4}]);else drawCards(p,1,random,card);return true;}return false;
  },
  handle(previous,a,roll,random,bypassResponse){
   const custom=['alchemistChoice','alchemistDone','alchemistLab','alchemistUpkeep','resolveAlchemistLab','spendPotion','alchemistDefenceReady'];if(!custom.includes(a.type))return undefined;
   const seat=cardActor(previous),t=previous.alchemistTask;let c;
   if(a.type==='alchemistChoice'){c=taskChoices(previous)[a.choice];if(!t||previous.stage!=='alchemistChoices'||seat!==t.seat||!c||previous.response||previous.sideDamage)return previous;}
   if(a.type==='alchemistDone'&&(!t||previous.stage!=='alchemistChoices'||seat!==t.seat||!taskOptional(previous)||previous.sideDamage))return previous;
   if(a.type==='alchemistLab'){c=labChoices(previous,seat)[a.choice];if(!c)return previous;}
   if(a.type==='spendPotion'){c=spendChoices(previous,seat)[a.choice];if(!c)return previous;}
   if(a.type==='alchemistUpkeep'&&(!legal(previous).alchemistUpkeep||previous.stage!=='upkeep'||heroId(previous,seat)!==id||seat!==previous.active||previous.players[seat].labTurn===previous.turn||previous.response))return previous;
   if(a.type==='resolveAlchemistLab'&&(previous.stage!=='upkeep'||!previous.alchemistRoll||previous.cardRoll||previous.retry||previous.response))return previous;
   if(a.type==='resolveAlchemistLab'&&!bypassResponse&&hasResponse(previous,1-seat))return {...previous,response:{seat:1-seat,action:a}};
   if(a.type==='alchemistDefenceReady'&&(previous.stage!=='alchemistDefence'||!previous.alchemistSpend||previous.response))return previous;
   const s=structuredClone(previous),p=s.players[seat];psylocke.setState(s);s.response=null;
   if(a.type==='alchemistChoice'){
    const q=s.alchemistTask,h=q.queue[0];
    if(h.kind==='attach'){attach(s,seat,c);h.left--;if(h.types)h.types[c.key]--;if(h.same)h.only=c.key;}
    if(h.kind==='remove'){q.removed.push(remove(p,c.key,c.tokenId));h.left--;h.required=false;}
    if(h.kind==='status'){removeMatchStatus(s,c.target,c.key,c.tokenId);q.queue.shift();}
    if(h.kind==='target'){q.queue.shift();startSideDamage(s,c.target,3,'Tonic!',false,{keepPending:true});}
   }
   if(a.type==='alchemistDone')s.alchemistTask.queue.shift();
   if(a.type==='alchemistLab'){
    remove(p,c.key,c.tokenId);const d=rollContext(s);if(d.scalar)s.effectDie=roll();else d.dice[c.index]=roll();
    if(['offence','announce'].includes(s.stage))s.held[c.index]=false;
    if(s.stage==='announce'){s.stage='offence';s.pending=null;}
   }
   if(a.type==='spendPotion')psylocke.withoutAbility(s,()=>{
    remove(p,c.key,c.tokenId);if(c.extra)s.alchemistSpend.extra--;
    if(c.effect==='damage')damage(s,2);
    if(c.effect==='prevent')s.pending.prevention=(s.pending.prevention??0)+2;
    if(c.effect==='heal')p.hp=bounded(p.hp+1,60);
    if(c.effect==='poison')grantStatus(s.players[c.target],'poison');
    if(c.effect==='remove')removeMatchStatus(s,seat,c.status,c.removeId);
   });
   if(a.type==='alchemistUpkeep'){p.labTurn=s.turn;if(p.upgrades?.['The Lab'])s.alchemistRoll={seat,dice:[roll()]};else begin(s,seat,[{kind:'attach',left:1}],'upkeep');}
   if(a.type==='resolveAlchemistLab'){const n=dieValue(s.alchemistRoll.dice[0],p);delete s.alchemistRoll;begin(s,seat,[{kind:'attach',left:n>=1&&n<=3?1:n>=4?2:0}],'upkeep');}
   if(a.type==='alchemistDefenceReady')s.stage='alchemistPotions';
   pump(s,random);return s;
  }
 };
})();
