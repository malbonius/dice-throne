const mysticBrawler=(()=>{
 const id=42,keys=['strengthOcean','strengthMountain','strengthSky'],caps={strengthOcean:3,strengthMountain:2,strengthSky:2};
 const board={name:'Mystic Brawler',symbols:['Fist','Fist','Fist','Spirit','Spirit','Peak'],defence:'Wrassle',abilities:[
  {name:'Clobber',symbols:{Fist:4},damage:c=>c.Fist>=5?7:5,mysticConcussion:4,text:'4 / 5 Fist · deal 5 / 7 damage. Four matching numbers inflict Concussion.'},
  {name:'Healing Wind',symbols:{Spirit:3,Peak:1},mHeal:3,strengths:2,text:'Heal 3. Gain 2 Strengths.'},
  {name:'Strong Arm',symbols:{Fist:3,Peak:1},strongArm:true,damage:()=>6,text:'After targeting, both roll 1. Equal or greater gains 1 Strength and deals 6 damage; otherwise deal 7.'},
  {name:'Tidal Blow',symbols:{Fist:3,Spirit:2},ocean:1,damage:()=>6,effect:'mysticTidal',effectCount:1,text:'Gain Strength of the Ocean. Deal 6 damage. Roll 1: Fist adds 2 damage; Spirit draws 1; Peak inflicts Concussion.'},
  {name:'Spirit Strike',straight:4,strengths:1,damage:()=>7,text:'Small straight · gain 1 Strength. Then deal 7 damage.'},
  {name:'Tectonic Punch',straight:5,tectonic:true,damage:()=>10,text:'Choose to gain Strength of the Mountain, or remove one to add 3 damage. Then deal 10 damage.'},
  {name:'Ancestral Strength',symbols:{Peak:4},strengths:2,damage:()=>7,type:'undefendable',text:'Gain 2 Strengths. Then deal 7 undefendable damage.'},
  {name:'Power of the Ancients!',symbols:{Peak:5},strengths:2,concussion:true,damage:()=>12,type:'ultimate',text:'Gain 2 Strengths. Inflict Concussion. Then deal 12 Ultimate damage.'}
 ]};
 const upgrades=[
  ['Clobber II',2,'Clobber',{damage:c=>c.Fist>=5?7:6,skyTriple:true,text:'4 / 5 Fist · deal 6 / 7 damage. Three matching numbers gain Strength of the Sky; four also inflict Concussion.'}],
  ['Spirit Strike II',2,'Spirit Strike',{damage:()=>8,sixHeal:true,text:'Small straight · gain 1 Strength. Deal 8 damage. Heal 1 if the straight uses a 6.'}],
  ['Ancestral Strength II',2,'Ancestral Strength',{damage:()=>9,text:'Gain 2 Strengths. Then deal 9 undefendable damage.'},2,{name:'Spirit Call',symbols:{Peak:3},strengths:2,concussion:true,text:'Gain 2 Strengths. Inflict Concussion.'}],
  ['Tidal Blow II',2,'Tidal Blow',{effectCount:2,tidalUp:true,text:'Gain Strength of the Ocean. Deal 6 damage. Roll 2: +2 per Fist, draw 1 on any Spirit, inflict Concussion on any Peak.'}],
  ['Tectonic Punch II',2,'Tectonic Punch',{tectonic:false,mountain:1,damage:()=>12,text:'Gain Strength of the Mountain. Then deal 12 damage.'},2,{name:'Knock Out',symbols:{Fist:1,Spirit:2,Peak:1},damage:()=>3,type:'undefendable',text:'Deal 3 undefendable damage.'}],
  ['Wrassle II',3,'defence',{}]
 ];
 const cards=[['Spirit Chant!',1,'main'],['Explosive Flex!',1,'main'],['Enjoy the View!',1,'main'],['Wild Strength!',2,'roll'],['Flying Punch!',1,'roll'],['Kapu!',1,'roll'],['Heavy Hand!',1,'roll'],['Haka!',1,'instant'],['Sea Song!',0,'instant'],['Elemental Calling!',0,'main']];
 function total(p){return keys.reduce((n,key)=>n+(p[key]??0),0);}
 function gainOptions(s){const t=s.mysticTask,h=t?.queue[0];if(h?.kind!=='strengths')return [];return keys.filter(key=>(s.players[t.seat][key]??0)+(h.allocation?.[key]??0)<caps[key]);}
 function begin(s,seat,queue,resume=s.stage,random=Math.random,offensive=false){const parent=s.mysticTask;s.mysticTask={seat,queue,resume,locked:!!attackLocked(s),...(parent?{parent}:{}),...(offensive?{offensiveSource:s.active}:{})};s.stage='mysticChoices';pump(s,random);}
 function pump(s,random=Math.random){const t=s.mysticTask;if(!t||s.stage!=='mysticChoices'||s.sideDamage)return;
  const body=()=>{for(let i=0;i<30;i++){
   const h=t.queue[0],p=s.players[t.seat];
   if(!h){s.stage=t.resume;if(t.parent)s.mysticTask=t.parent;else delete s.mysticTask;if(s.stage==='mysticChoices')pump(s,random);return;}
   if(h.kind==='strengths'){
    if(!h.checked){h.checked=true;h.allocation={};if(psylocke.block(s,p,'strengthOcean',h.left)){t.queue.shift();continue;}}
    if(h.left&&gainOptions(s).length)return;
    for(const key of keys)if(h.allocation[key])psylocke.withoutAbility(s,()=>grantStatus(p,key,h.allocation[key]));
    t.queue.shift();continue;
   }
   if(h.kind==='tectonic')return;
   t.queue.shift();
   if(h.kind==='gain')grantStatus(p,h.key,h.amount);
   if(h.kind==='heal')p.hp=bounded(p.hp+h.amount,60);
   if(h.kind==='cards')drawCards(p,h.amount,random,h.exclude);
  }};
  if(t.offensiveSource!==undefined)psylocke.withAbility(s,body);else psylocke.withoutAbility(s,body);
 }
 function ability(s){const h=s.pending;if(!h.mystic||h.mystic.ready)return false;h.mystic.ready=true;s.stage='mysticAbility';return true;}
 function printed(s,random){const h=s.pending,r=h.mystic;if(r.strong&&!r.contestDone){s.stage='mysticStrongTarget';return;}if(r.printed)return;r.printed=true;const q=[];if(r.heal)q.push({kind:'heal',amount:r.heal});if(r.strengths)q.push({kind:'strengths',left:r.strengths});if(r.ocean)q.push({kind:'gain',key:'strengthOcean',amount:r.ocean});if(r.mountain)q.push({kind:'gain',key:'strengthMountain',amount:r.mountain});if(r.sky)q.push({kind:'gain',key:'strengthSky',amount:r.sky});if(r.tectonic)q.push({kind:'tectonic'});begin(s,s.active,q,'mysticPrepared',random,true);}
 function tidal(s,c,random){const r=s.pending.mystic;s.pending.damage+=2*(r.tidalUp?(c.Fist??0):Number(!!c.Fist));if(c.Peak)s.pending.concussion=true;const q=c.Spirit?[{kind:'cards',amount:1}]:[];begin(s,s.active,q,'mysticResolved',random,true);}
 function oceanChoices(s,seat){const p=s.players[seat];return s.cards&&seat===s.active&&s.stage==='upkeep'&&p.strengthOcean&&p.oceanUsedTurn!==s.turn&&!s.response&&!s.cardRoll&&!s.retry&&!s.mysticTask&&!s.alchemistRoll&&!s.widowBombRoll&&!s.lokiBag?[1,2].filter(n=>p.strengthOcean>=n):[];}
 function attack(s,seat){const h=s.pending;return !!(seat===s.active&&h&&(h.attack??h.damage>0)&&!h.nonAttack&&!h.pure&&!h.evaded&&!h.parlayBlocked&&!s.sideDamage&&['mysticAbility','mysticStrongTarget','mysticContest','mysticPrepared','mysticResolved','targeting','defence','defenceResponse','damage','locked'].includes(s.stage));}
 function damage(s,n){const h=s.pending;if(h.grossDamage===undefined){h.damage+=n;h.mysticModifiers=(h.mysticModifiers??0)+n;}else{h.grossDamage+=n;updateDamage(h);}}
 function refresh(s){const h=s.pending;if(!h||h.grossDamage===undefined||h.mountainSettled||['main','main1','discard','postHit','finished'].includes(s.stage))return;const n=h.attack&&!h.pure&&!h.evaded&&!h.parlayBlocked?s.players[s.active].strengthMountain??0:0;if(!n&&h.mountainBonus===undefined)return;h.grossDamage+=n-(h.mountainBonus??0);h.mountainBonus=n;updateDamage(h);}
 function wildLimit(s){return Math.min(5,total(s.players[s.cardRoll.seat]));}
 return {id,board,upgrades,cards,promoId:34,keys,caps,total,gainOptions,begin,pump,ability,printed,tidal,oceanChoices,attack,damage,refresh,wildLimit,
  initialize(s,seat){Object.assign(s.players[seat],{strengthOcean:0,strengthMountain:0,strengthSky:0});},
  defenceDiceCount:p=>(p.upgrades?.defence?3:2)+(p.strengthSky??0),
  resolveDefence({state:s,seat,defender:p,counts:c,random}){s.pending.returnDamage+=c.Fist??0;p.hp=bounded(p.hp+(c.Spirit??0),60);if(c.Peak)begin(s,seat,[{kind:'strengths',left:1}],'damage',random);return s.stage==='mysticChoices'?s.stage:'damage';},
  cardChoices(card,{s,seat,one}){const p=s.players[seat],h=s.pending,d=rollContext(s);
   if(card===26)return [{kind:'mountain',label:'Gain Strength of the Mountain'},{kind:'damage',label:'Deal 2 isolated damage to the opponent'}];
   if(card===27)return [{kind:'sky',label:'Gain Strength of the Sky'},{kind:'heal',label:'Heal 2'}];
   if(card===28)return attack(s,seat)?one:[];
   if(card===29)return attack(s,seat)&&p.strengthSky&&!h.ultimate&&!h.undefendable?one:[];
   if(card===30)return seat!==s.active&&p.strengthMountain&&h?.attack&&!h.ultimate&&['defence','defenceResponse','damage'].includes(s.stage)&&incomingDamage(s)>0?one:[];
   if(card===31)return d&&!attackLocked(s)?d.dice.flatMap((v,i)=>dieOwner(d,i)===seat&&!iceman.contextLocked(s,d,i)?[1,2,3].filter(n=>n!==v).map(v=>({i,v,label:`Own die ${i+1} → ${v}`})):[]):[];
   if(card===32)return [{extra:0,label:'Gain 1 Strength'},...(p.cp>=3?[{extra:2,label:'Pay 2 additional CP · gain 2 Strengths instead'}]:[])];
   if(card===33)return p.strengthOcean?one:[];return one;
  },
  applyCard({id:card,s,seat,p,choice,random}){
   if(card===26){if(choice.kind==='mountain')grantStatus(p,'strengthMountain');else startSideDamage(s,1-seat,2,'Explosive Flex!',false,{keepPending:true});return true;}
   if(card===27){if(choice.kind==='sky')grantStatus(p,'strengthSky');else p.hp=bounded(p.hp+2,60);return true;}
   if(card===29){removeStatus(p,'strengthSky');s.pending.undefendable=true;if(s.stage==='defence')s.stage='damage';return true;}
   if(card===30){removeStatus(p,'strengthMountain');s.pending.prevention=(s.pending.prevention??0)+4;updateDamage(s.pending);return true;}
   if(card===31){const d=rollContext(s),before=d.dice.slice();d.dice[choice.i]=choice.v;if(d.scalar)s.effectDie=choice.v;releaseChangedAnnouncement(s,d,before);return true;}
   if(card===32){p.cp-=choice.extra;begin(s,seat,[{kind:'strengths',left:choice.extra?2:1}],s.stage,random);return true;}
   if(card===33){removeStatus(p,'strengthOcean');gainCP(p,2);return true;}return false;
  },
  cardRollSize:card=>({25:1,28:5,34:1})[card]??0,
  resolveCardRoll({id:card,s,seat,p,counts:c,random}){
   if(card===25){if(c.Fist)grantStatus(s.players[1-seat],'concussion');if(c.Spirit)drawCards(p,2,random,card);if(c.Peak)begin(s,seat,[{kind:'strengths',left:2}],s.stage,random);return true;}
   if(card===28){damage(s,2*Math.floor((c.Fist??0)/2));return true;}
   if(card===34){if(c.Peak)begin(s,seat,[{kind:'strengths',left:3}],s.stage,random);else drawCards(p,1,random,card);return true;}return false;
  },
  handle(previous,a,roll,random,bypassResponse){
   if(!['mysticStrength','mysticTectonic','spendOcean','rollMysticContest','resolveMysticContest','mysticWildReroll'].includes(a.type))return undefined;
   const seat=cardActor(previous),t=previous.mysticTask,h=t?.queue[0];
   if(a.type==='mysticStrength'&&(previous.stage!=='mysticChoices'||seat!==t?.seat||h?.kind!=='strengths'||!gainOptions(previous).includes(a.status)))return previous;
   if(a.type==='mysticTectonic'&&(previous.stage!=='mysticChoices'||h?.kind!=='tectonic'||seat!==t?.seat||!['gain','remove'].includes(a.status)||a.status==='remove'&&!previous.players[seat].strengthMountain))return previous;
   if(a.type==='spendOcean'&&!oceanChoices(previous,seat).includes(a.amount))return previous;
   if(a.type==='rollMysticContest'&&(previous.stage!=='mysticStrongTarget'||seat!==previous.active||previous.response||previous.cardRoll||previous.retry))return previous;
   if(a.type==='resolveMysticContest'&&(previous.stage!=='mysticContest'||!previous.mysticContest||previous.cardRoll||previous.retry||previous.response))return previous;
   if(['rollMysticContest','resolveMysticContest'].includes(a.type)&&!bypassResponse&&!hasLockedContest(previous)&&hasResponse(previous,1-seat))return {...previous,response:{seat:1-seat,action:a}};
   if(a.type==='mysticWildReroll'){const r=previous.cardRoll,idx=a.indices;if(!r||heroId(previous,r.seat)!==id||r.id!==28||r.mysticWildUsed||seat!==r.seat||previous.response||previous.retry||previous.mysticTask||!Array.isArray(idx)||!idx.length||idx.length>wildLimit(previous)||new Set(idx).size!==idx.length||idx.some(i=>!Number.isInteger(i)||i<0||i>=5))return previous;}
   const s=structuredClone(previous),p=s.players[seat];psylocke.setState(s);s.response=null;
   if(a.type==='mysticStrength'){const q=s.mysticTask.queue[0];q.left--;q.allocation[a.status]=(q.allocation[a.status]??0)+1;}
   if(a.type==='mysticTectonic'){s.mysticTask.queue.shift();if(a.status==='gain')psylocke.withAbility(s,()=>grantStatus(p,'strengthMountain'));else{removeStatus(p,'strengthMountain');s.pending.damage+=3;}}
   if(a.type==='spendOcean'){p.strengthOcean-=a.amount;p.oceanUsedTurn=s.turn;gainCP(p,1);if(a.amount===2)s.upkeepOceanHeal=(s.upkeepOceanHeal??0)+2;}
   if(a.type==='rollMysticContest'){s.pending.mysticTargeted=true;s.mysticContest={seat,dice:[roll(),roll()]};s.stage='mysticContest';}
   if(a.type==='resolveMysticContest'){const r=s.mysticContest,win=dieValue(r.dice[0],s.players[r.seat])>=dieValue(r.dice[1],s.players[1-r.seat]);s.pending.damage+=win?0:1;s.pending.mystic.strengths=win?1:0;s.pending.mystic.contestDone=true;delete s.mysticContest;s.stage='mysticAbility';}
   if(a.type==='mysticWildReroll'){for(const i of a.indices)s.cardRoll.dice[i]=roll();s.cardRoll.mysticWildUsed=true;}
   pump(s,random);return s;
  }
 };
 function hasLockedContest(s){return !!attackLocked(s);}
})();
