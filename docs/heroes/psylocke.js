const psylocke=(()=>{
 const id=36;
 const board={name:'Psylocke',symbols:['Blade','Blade','Psi','Psi','Mind','Starlight'],defence:'Clandestine',abilities:[
  {name:'Lunge',symbols:{Blade:3},damage:c=>c.Blade+2,text:'3 / 4 / 5 Blade · deal 5 / 6 / 7 damage.'},
  {name:'Devise',symbols:{Blade:1,Psi:1,Mind:1,Starlight:1},damage:()=>3,devise:true,type:'undefendable',text:'Deal 3 undefendable damage. If Manifest was not used to activate this ability, gain 1 CP.'},
  {name:'Parry',symbols:{Blade:2,Psi:2,Starlight:1},agility:1,damage:()=>7,text:'Gain Agility. Deal 7 damage.'},
  {name:'Stealth',straight:4,infiltration:1,damage:()=>6,text:'Small straight · gain Infiltration. Deal 6 damage.'},
  {name:'Stealth (large straight)',straight:5,upgradeSlot:'Stealth',variant:'large',paralyze:true,damage:()=>8,text:'Large straight · inflict Paralyze. Deal 8 damage.'},
  {name:'Paralysis',symbols:{Blade:2,Mind:2},paralyze:true,damage:()=>6,text:'Inflict Paralyze. Deal 6 damage.'},
  {name:'Blade Dance',symbols:{Starlight:4},agility:1,infiltration:1,damage:()=>6,type:'undefendable',text:'Gain Agility and Infiltration. Deal 6 undefendable damage.'},
  {name:'Otherworlder!',symbols:{Starlight:5},agility:1,paralyze:true,damage:()=>11,type:'ultimate',text:'Gain Agility. Inflict Paralyze. Deal 11 Ultimate damage.'}
 ]};
 const upgrades=[
  ['Parry II',2,'Parry',{agility:2,text:'Gain 2 Agility. Deal 7 damage.'}],
  ['Stealth II',2,'Stealth',{infiltration:2,text:'Small straight · gain 2 Infiltration. Deal 6 damage.',variants:{large:{infiltration:0,paralyze:true,damage:()=>9,label:'Stealth II (large straight)',text:'Large straight · inflict Paralyze. Deal 9 damage.'}}}],
  ['Devise II',2,'Devise',{damage:()=>4,text:'Deal 4 undefendable damage. If Manifest was not used to activate this ability, gain 1 CP.'},2,{name:'Strong Shield',symbols:{Psi:3},infiltration:2,agility:2,text:'Gain 2 Infiltration and 2 Agility.'}],
  ['Paralysis II',2,'Paralysis',{damage:()=>7,text:'Inflict Paralyze. Deal 7 damage.'},2,{name:'Immobile',symbols:{Psi:1,Mind:2},agility:1,infiltration:1,damage:()=>4,text:'Gain Agility and Infiltration. Deal 4 damage.'}],
  ['Blade Dance II',2,'Blade Dance',{agility:2,infiltration:2,text:'Gain 2 Agility and 2 Infiltration. Deal 6 undefendable damage.'},2,{name:'Girded',symbols:{Starlight:3},agility:1,damage:()=>2,type:'undefendable',text:'Gain Agility. Deal 2 undefendable damage.'}],
  ['Clandestine II',2,'defence',null]
 ];
 const cards=[['Shattered!',1,'main'],['Deft Maneuver!',0,'main'],['Construct!',0,'roll'],['Barrage!',1,'roll'],['Strong Will!',1,'roll'],['Mind Altering!',1,'roll'],['Forced!',1,'roll'],['Backflip!',1,'instant'],['Depths of the Mind!',0,'main']];
 // Transient provenance is never saved. Only queues actually created by a suppressed
 // Offensive Ability need a serialisable source marker across subsequent choices.
 let runtime=null;
 const exemptTypes=new Set(['playCard','finishCardRoll','retryDie','finishRetry','useCleanse','boostChi','preventChi','flight','protect','crit','accuracy','retribution','smoke','seedling','sapling','saplingDraw','dryad','dryadPrevent','wellspring','bloodPower','titheDraw','titheReroll','gambitExplode','gambitResolveRoll','resolveTrickBag','resolveAgility','resolveCosmicRay','iceConvert','iceFreezerConvert','iceTransfer','jeanPassive','resolveNinjutsu','spendCombo','spendGlide']);
 function enter(s,a){const old=runtime;runtime={state:s,ability:false,exempt:a.type.startsWith('spend')||exemptTypes.has(a.type),events:[]};return old;}
 function leave(old){runtime=old;}
 function setState(s,reset=false){if(runtime){runtime.state=s;if(reset){runtime.ability=false;runtime.exempt=false;}}}
 function withAbility(s,fn){const old=runtime;runtime={state:s,ability:true,exempt:false,events:old?.events??[]};try{return fn();}finally{runtime=old;}}
 function withoutAbility(s,fn){const old=runtime;runtime={state:s,ability:false,exempt:true,events:old?.events??[]};try{return fn();}finally{runtime=old;}}
 function useAbility(s){if(runtime){runtime.state=s;runtime.ability=true;runtime.exempt=false;}}
 function task(s){return s.stage==='deadpoolChoices'?s.deadpoolTask:s.stage==='santaChoices'?s.santaTask:s.stage==='mysticChoices'?s.mysticTask:s.stage==='krampusChoices'?s.krampusTask:s.stage==='iceChoices'?s.iceTask:s.stage==='jeanChoices'?s.jeanTask:s.stage==='gambitSequence'?s.gambitTask:s.stage==='cyclopsSequence'?s.cyclopsTask:s.stage==='thorSequence'?s.thorTask:s.stage==='lokiChoices'?s.lokiTask:s.stage==='strangeSpells'?s.strangeTask:null;}
 function source(s){if(!runtime||runtime.exempt)return undefined;return runtime.ability?s.active:task(s)?.offensiveSource;}
 function suppressed(s){const seat=source(s);return seat!==undefined&&!!s.players[seat].paralyze&&!s.pending?.ultimate;}
 function tag(s,t){if(t&&suppressed(s))t.offensiveSource=source(s);}
 function block(s,p,key,amount=1){
  if(!amount||!suppressed(s))return false;
  const seat=source(s),target=s.players.indexOf(p);
  if((target===seat||target<0&&p.hero===s.players[seat].hero)&&positiveStatusKeys.includes(key))runtime.events.push({key,amount});
  return true;
 }
 function blockDirect(p,key,amount=1){return !!(runtime&&block(runtime.state,p,key,amount));}
 function flush(s){if(!runtime||!s.pending||!runtime.events.length)return;const keys=s.pending.paralyzePrevented??=[];for(const {key} of runtime.events)if(!keys.includes(key))keys.push(key);runtime.events.length=0;}
 function pendingPositives(){return runtime?.events.length>0;}
 function pauseEnd(s){if(!s.pending||s.pending.paralyzeOfferDone||s.pending.forcedUsed||!(pendingPositives()||s.pending.paralyzePrevented?.length))return false;s.pending.paralyzeOfferDone=true;s.stage='paralyzeAfter';return true;}
 function initialRoll(s,roll){const p=s.players[s.active];if(p.hero!==id)return;p.manifestDie=roll();p.manifestReady=true;}
 function start(s){const p=s.players[s.active];if(p.hero===id){p.manifestReady=false;p.manifestSwapped=false;delete p.manifestIndex;}}
 function available(s,seat){const p=s.players[seat];return !!(s.cards&&p.hero===id&&seat===s.active&&p.manifestReady&&p.manifestDie>0&&p.manifestUsedTurn!==s.turn&&!s.cardRoll&&!s.retry&&!s.sideDamage&&!s.iceFreezeChoice&&!s.psyReveal);}
 function swaps(s,seat){return available(s,seat)&&!attackLocked(s)&&['offence','announce'].includes(s.stage)?s.dice.map((value,index)=>({index,label:`Replace die ${index+1} (${value}) with Manifest ${s.players[seat].manifestDie}`})):[];}
 function canBoost(s,seat){const h=s.pending;return !!(available(s,seat)&&h&&(h.attack??h.damage>0)&&!h.pure&&!h.evaded&&!h.parlayBlocked&&['psyAbility','targeting','defence','defenceResponse','damage','locked'].includes(s.stage));}
 function infiltrationChoices(s,seat){
  if(!s.cards||!s.players[seat].infiltration||s.cardRoll||s.retry||s.widowAgility||s.widowBombRoll||s.cosmicRayRoll||s.psyReveal||attackLocked(s))return [];
  const defensive=s.stage==='defenceResponse',duel=s.stage==='gunContest'&&s.gunContest?.kind==='duel';if(!defensive&&!duel)return [];
  const c=rollContext(s);return c?c.dice.flatMap((v,index)=>defensive||dieOwner(c,index)===1-s.active?[{index,label:`Spend Infiltration · reroll ${heroNames(s)[dieOwner(c,index)]}’s defence die ${index+1} (${v})`}]:[]):[];
 }
 function forcedChoices(s,seat){return seat!==s.active&&!s.pending?.forcedUsed?(s.pending?.paralyzePrevented??[]).map(key=>({key,label:`Gain 1 ${statusLabel(key)} prevented by Paralyze`})):[];}
 function damage(s,n){const h=s.pending;if(h.grossDamage===undefined){h.damage+=n;h.psyModifiers=(h.psyModifiers??0)+n;}else {h.grossDamage+=n;updateDamage(h);}}
 function ability(s){const h=s.pending;if(!h.psy||h.psyPrepared)return false;h.psyPrepared=true;const p=s.players[s.active],i=h.psy;if(i.devise&&!i.swapped)gainCP(p,1);if(i.agility)grantStatus(p,'agility',i.agility);if(i.infiltration)grantStatus(p,'infiltration',i.infiltration);if(!i.agility&&!i.infiltration&&!i.devise)return false;s.stage='psyAbility';return true;}
 return {
  leafletPositives: {agility: true, infiltration: true},
  id,board,upgrades,cards,promoId:33,enter,leave,setState,withAbility,withoutAbility,useAbility,suppressed,tag,block,blockDirect,flush,pendingPositives,pauseEnd,initialRoll,start,swaps,canBoost,infiltrationChoices,forcedChoices,ability,
  initialize(s,seat){Object.assign(s.players[seat],{agility:0,infiltration:0,manifestDie:0,manifestReady:false,manifestSwapped:false});},
  complexity: 3,
  defenceDiceCount:()=>3,
  resolveDefence({state:s,defender:p,counts:c,random}){s.pending.returnDamage+=(p.upgrades?.defence?2:1)*(c.Blade??0);if(c.Blade&&c.Mind)drawCards(p,1,random);if(c.Blade&&c.Starlight)grantStatus(p,'agility');return 'damage';},
  cardChoices(card,{s,seat,one}){
   const p=s.players[seat],h=s.pending,attack=seat===s.active&&h&&(h.attack??h.damage>0)&&!h.pure&&!h.evaded&&!h.parlayBlocked&&['psyAbility','targeting','defence','defenceResponse','damage','locked'].includes(s.stage);
   if(card===25)return s.players[1-seat].paralyze?one:[];
   if(card===27)return p.manifestDie&&p.manifestUsedTurn!==s.turn?one:[];
   if(card===28)return attack?one:[];
   if(card===29)return p.agility&&seat!==s.active&&h?.attack&&!h.ultimate&&!h.stun&&!h.parlayBlocked&&['defence','defenceResponse','damage'].includes(s.stage)?one:[];
   if(card===30)return attack&&(canBoost(s,seat)||h.manifestBonus)?one:[];
   if(card===31)return forcedChoices(s,seat);return one;
  },
  applyCard({id:card,s,seat,p,choice,roll}){
   if(card===25){startSideDamage(s,1-seat,2,'Shattered!',false,{keepPending:true});return true;}
   if(card===26){s.psyReveal={seat,cards:s.players[1-seat].hand.slice()};return true;}
   if(card===27){p.manifestDie=rerollDie(roll,[p.manifestDie],0);return true;}
   if(card===29){removeStatus(p,'agility');blackWidow.half(s,'attack');return true;}
   if(card===30){if(s.pending.manifestBonus)p.hp=bounded(p.hp+s.pending.manifestBonus,60);else s.pending.manifestHeal=true;return true;}
   if(card===31){s.pending.forcedUsed=true;gainCopiedStatus(s,seat,choice.key,s.active);return true;}
   if(card===32){grantStatus(p,'agility');return false;}return false;
  },
  cardRollSize:card=>({28:3,32:1,33:1})[card]??0,
  resolveCardRoll({id:card,s,seat,p,counts,drawCards,random}){
   if(card===28){damage(s,2*(counts.Blade??0));return true;}
   if(card===32){if(counts.Psi)gainCP(p,1);if(counts.Mind)drawCards(p,1,random,card);if(counts.Starlight)grantStatus(p,'agility');return true;}
   if(card===33){if(counts.Starlight){grantStatus(p,'infiltration',2);grantStatus(p,'agility',2);}else drawCards(p,1,random,card);return true;}return false;
  },
  handle(previous,a,roll){
   const seat=cardActor(previous),p0=previous.players[seat];if(!['manifestSwap','manifestBoost','spendInfiltration','psyRevealDone'].includes(a.type))return undefined;
   if(a.type==='manifestSwap'&&!swaps(previous,seat).some(c=>c.index===a.index)||a.type==='manifestBoost'&&!canBoost(previous,seat)||a.type==='psyRevealDone'&&previous.psyReveal?.seat!==seat)return previous;
   const choice=a.type==='spendInfiltration'?infiltrationChoices(previous,seat)[a.choice]:null;if(a.type==='spendInfiltration'&&!choice)return previous;
   const s=structuredClone(previous),p=s.players[seat];s.response=null;
   if(a.type==='manifestSwap'){
    const before=s.dice.slice(),old=s.dice[a.index],value=p.manifestDie;s.dice[a.index]=value;if(s.stormDice)s.stormDice.indices=s.stormDice.indices.filter(i=>i!==a.index);p.manifestDie=old;p.manifestReady=false;p.manifestUsedTurn=s.turn;p.manifestSwapped=true;p.manifestIndex=a.index;
    if(s.realityDie?.seat===seat&&s.realityDie.index===a.index)delete s.realityDie;
    if(s.iceFirstRoll){s.iceFirstRoll.values[a.index]=value;s.iceFirstRoll.selected=[];delete s.iceFreezeChoice;}
    releaseChangedAnnouncement(s,rollContext(s),before);
   }
   if(a.type==='manifestBoost'){const n=Math.ceil(dieValue(p.manifestDie,p)/2);p.manifestUsedTurn=s.turn;p.manifestReady=false;s.pending.manifestBonus=n;damage(s,n);if(s.pending.manifestHeal)p.hp=bounded(p.hp+n,60);}
   if(a.type==='spendInfiltration'){p.infiltration--;const c=rollContext(s);c.dice[choice.index]=rerollDie(roll,c.dice,choice.index,c.scalar);}
   if(a.type==='psyRevealDone')s.psyReveal=null;
   return s;
  }
 };
})();
