const storm=(()=>{
 const id=38,slots=['Lightning Field','Light It Up','Thunderstorm','Opposites Attract','Gust','Blizzard','Maelstrom','Tempest!'];
 const board={name:'Storm',symbols:['Wind','Wind','Wind','Rain','Rain','Cyclone'],defence:'Tempestuous',abilities:[
  {name:'Lightning Field',symbols:{Wind:3},damage:c=>Math.min(5,c.Wind)+2,charge:'field',text:'3 / 4 / 5 Wind · deal 5 / 6 / 7 damage. Charged: add 3 damage.'},
  {name:'Light It Up',symbols:{Wind:1,Rain:2,Cyclone:1},effect:'stormLight',effectCount:5,charge:'light',text:'Roll 5: each Wind and Cyclone gains Lightning; each pair of Rain gains Tornado. Charged: gain Wind Shear.'},
  {name:'Thunderstorm',symbols:{Wind:2,Rain:3},lightning:2,damage:()=>7,charge:'thunder',text:'Gain 2 Lightning. Deal 7 damage. Charged: gain 2 Tornado.'},
  {name:'Opposites Attract',symbols:{Wind:3,Cyclone:2},tornado:3,effect:'stormOpposites',effectCount:2,charge:'opposites',text:'Gain 3 Tornado. Roll 2 and deal their total value as damage. Charged: after rolling, optionally reroll one or both once.'},
  {name:'Gust',straight:4,windShear:true,damage:()=>6,charge:'gust',text:'Small straight · gain Wind Shear. Deal 6 damage. Charged: gain Tornado.'},
  {name:'Gust (large straight)',upgradeSlot:'Gust',variant:'large',straight:5,windShear:true,damage:()=>8,charge:'gustLarge',text:'Large straight · gain Wind Shear. Deal 8 damage. Charged: gain 2 Tornado.'},
  {name:'Blizzard',symbols:{Cyclone:4},tornado:3,damage:()=>8,charge:'blizzard',text:'Gain 3 Tornado. Deal 8 damage. Charged: this Attack becomes undefendable.'},
  {name:'Maelstrom',straight:6,damage:()=>10,charge:'maelstrom',maelstrom:true,text:'Six-number straight · deal 10 damage. Place Lightning on up to four different other Offensive Abilities. Charged: gain 1 CP and draw 1.'},
  {name:'Tempest!',symbols:{Cyclone:5},tornado:2,windShear:true,damage:()=>12,type:'ultimate',charge:'tempest',text:'Gain 2 Tornado and Wind Shear. Deal 12 Ultimate damage. Charged: gain 2 additional Tornado and add 2 damage.'}
 ]};
 const upgrades=[
  ['Light It Up II',2,'Light It Up',{lightning:1,tornado:1,text:'Gain Lightning and Tornado, then roll 5: each Wind and Cyclone gains Lightning; each pair of Rain gains Tornado. Charged: gain Wind Shear.'}],
  ['Thunderstorm II',2,'Thunderstorm',{lightning:3,charge:'thunderUp',text:'Gain 3 Lightning. Deal 7 damage. Charged: gain 3 Tornado.'},2,{name:'Static',symbols:{Wind:3,Rain:2},lightning:3,tornado:1,windShear:true,text:'Gain Wind Shear, Tornado and 3 Lightning.'}],
  ['Gust II',2,'Gust',{damage:()=>7,text:'Small straight · gain Wind Shear. Deal 7 damage. Charged: gain Tornado.',variants:{large:{tornado:1,damage:()=>9,label:'Gust II (large straight)',text:'Large straight · gain Tornado and Wind Shear. Deal 9 damage. Charged: gain 2 Tornado.'}}}],
  ['Opposites Attract II',2,'Opposites Attract',{tornado:4,text:'Gain 4 Tornado. Roll 2 and deal their total value as damage. Charged: optionally reroll one or both dice once.'},2,{name:'Forceful',symbols:{Wind:2,Cyclone:2},tornado:1,damage:()=>4,type:'undefendable',text:'Gain Tornado. Deal 4 undefendable damage.'}],
  ['Blizzard II',2,'Blizzard',{damage:()=>7,type:'undefendable',charge:'blizzardUp',text:'Gain 3 Tornado. Deal 7 undefendable damage. Charged: add 3 damage.'},2,{name:'Drizzle',symbols:{Cyclone:3},tornado:3,lightning:3,text:'Gain 3 Tornado and 3 Lightning.'}]
 ];
 const cards=[['Uncanny!',1,'main'],['Dynamic Nature!',0,'main'],['Twister!',1,'main'],['Gale Force!',1,'roll'],['Lightning Strike!',0,'roll'],['Super Tornado!',1,'roll'],['Raging Winds!',2,'roll'],['My Tip-It!',1,'roll'],['Tsunami!',1,'roll'],['Atmokinesis!',0,'main']];
 function borrowed(s,seat,index){return !!(seat===s.active&&s.stormDice?.indices.includes(index));}
 function dieHero(s,seat,index){return borrowed(s,seat,index)?s.stormDice.hero:heroId(s,seat);}
 function symbols(s,seat,dice){return s.stormDice&&seat===s.active&&s.stormDice.hero!==heroId(s,seat)?dice.map((v,i)=>borrowed(s,seat,i)?0:v):dice;}
 function busy(s){return !!(s.psyReveal||s.rogueGain||s.stormTask||s.iceFreezeChoice||s.cardRoll||s.retry||s.sideDamage||s.rogueRoll||s.jeanBurnRoll||s.widowAgility||s.widowBombRoll||s.cosmicRayRoll||s.growth||s.mainChoice||s.mainAction||s.strangeTask||s.lokiTask||s.lokiIllusion||s.conjureTask);}
 function canTornado(s,seat){return !!(s.cards&&seat===s.active&&!busy(s)&&!s.attempts&&!s.players[seat].knockdown&&['offence'].includes(s.stage)&&(s.stormDice?.count??0)<5&&s.players[seat].tornado);}
 function borrow(s,n){const count=(s.stormDice?.count??0)+n;s.stormDice={count,hero:heroId(s,1-s.active),indices:Array.from({length:count},(_,i)=>5+i)};}
 function canWind(s,seat){return !!(s.cards&&seat!==s.active&&s.players[seat].windShear&&!busy(s)&&s.pending?.attack&&!s.pending.ultimate&&!s.pending.stun&&['defence','defenceResponse','damage'].includes(s.stage));}
 function begin(s,seat,queue,resume=s.stage){s.stormTask={seat,queue,resume,locked:!!attackLocked(s)};s.stage='stormChoices';pump(s);}
 function pump(s){const t=s.stormTask;if(!t||s.stage!=='stormChoices'||s.sideDamage)return;while(t.queue[0]?.left===0)t.queue.shift();if(!t.queue.length){s.stage=t.resume;delete s.stormTask;}}
 function places(s){const t=s.stormTask,h=t?.queue[0];return h?slots.filter(k=>(!h.only||h.only===k)&&!h.used?.includes(k)&&k!==h.exclude):[];}
 function chargeEffect(s,random){const h=s.pending,r=h.storm,p=s.players[s.active];r.charged=true;(p.stormChargeUsed??={})[r.key]=s.turn;
  if(['field','blizzardUp'].includes(r.charge))h.damage+=3;
  if(r.charge==='light')grantStatus(p,'windShear');
  if(r.charge==='thunder')grantStatus(p,'tornado',2);if(r.charge==='thunderUp')grantStatus(p,'tornado',3);
  if(r.charge==='gust')grantStatus(p,'tornado');if(r.charge==='gustLarge')grantStatus(p,'tornado',2);
  if(r.charge==='blizzard')h.undefendable=true;
  if(r.charge==='maelstrom'){gainCP(p,1);drawCards(p,1,random);}
  if(r.charge==='tempest'){grantStatus(p,'tornado',2);h.damage+=2;}
 }
 function ability(s){const h=s.pending;if(!h.storm||h.stormReady)return false;h.stormReady=true;s.stage=h.storm.eligible?'stormCharge':'stormAbility';return true;}
 function printed(s){const h=s.pending,r=h.storm;if(r.printed)return false;r.printed=true;const p=s.players[s.active];if(r.tornado)grantStatus(p,'tornado',r.tornado);if(r.windShear)grantStatus(p,'windShear');
  if(r.maelstrom){begin(s,s.active,[{kind:'place',left:4,exclude:'Maelstrom',used:[],optional:true}],'stormAbility');return true;}
  if(r.lightning){begin(s,s.active,[{kind:'place',left:r.lightning}],'stormAbility');return true;}return false;
 }
 function strike(s,seat){const r=s.pending?.storm,p=s.players[seat];return !!(seat===s.active&&r?.key&&!r.wasCharged&&!r.charged&&p.stormChargeUsed?.[r.key]!==s.turn&&!busy(s)&&s.stage==='stormAbility'&&!r.printed);}
 function oppReroll(s,seat){return !!(seat===s.active&&s.stage==='effectResponse'&&s.pending?.effect==='stormOpposites'&&s.pending.storm.charged&&!s.pending.storm.oppRerolled&&!s.cardRoll&&!s.retry&&!s.response);}
 function light(s,c,resume){const n=(c.Wind??0)+(c.Cyclone??0);grantStatus(s.players[s.active],'tornado',Math.floor((c.Rain??0)/2));if(n){begin(s,s.active,[{kind:'place',left:n}],resume);return true;}return false;}
 return {
  leafletPositives: {tornado: true, windShear: true},
  id,board,upgrades,cards,promoId:33,slots,borrowed,dieHero,symbols,canTornado,canWind,begin,pump,places,chargeEffect,ability,printed,strike,oppReroll,light,
  initialize(s,seat){Object.assign(s.players[seat],{tornado:0,windShear:false,lightningCharges:Object.fromEntries(slots.map(k=>[k,false]))});},
  complexity: 4,
  defenceEffect: () => 'On 3 Wind, gain Tornado. On 2 Rain, prevent 2 damage. Any Cyclone lets you place 1 Lightning.',
  defenceDiceCount:()=>5,
  resolveDefence({state:s,seat,defender:p,counts:c}){if((c.Wind??0)>=3)grantStatus(p,'tornado');if((c.Rain??0)>=2)s.pending.prevention=(s.pending.prevention??0)+2;updateDamage(s.pending);if(c.Cyclone){begin(s,seat,[{kind:'place',left:1}],'damage');return 'stormChoices';}return 'damage';},
  cardChoices(card,{s,seat,one,pos,d}){
   const p=s.players[seat];if(card===25)return slots.filter(k=>p.lightningCharges?.[k]).map(key=>({key,label:`Remove Lightning from ${key}`}));
   if(card===27)return seat===s.active&&s.pending&&(s.pending.attack??s.pending.effect==='stormOpposites')&&!s.pending.pure&&!s.pending.evaded&&!s.pending.parlayBlocked&&!busy(s)&&['stormAbility','targeting','defence','defenceResponse','damage','locked'].includes(s.stage)?one:[];
   if(card===28)return strike(s,seat)?one:[];
   if(card===29)return canTornado({...s,players:s.players.map((p,i)=>i===seat?{...p,tornado:Math.max(1,p.tornado)}:p)},seat)&&p.tornado>=3&&!s.stormDice?one:[];
   if(card===30)return p.tornado>0?one:[];
   if(card===31)return (pos??[]).filter(c=>dieOwner(d,c.i)===seat).flatMap(c=>[c.value-1,c.value+1].filter(v=>v>=1&&v<=5).map(v=>({i:c.i,v,label:`Die ${c.i+1}: ${c.value} → ${v}`})));
   if(card===32)return (pos??[]).filter(c=>dieOwner(d,c.i)===seat).map(c=>({i:c.i,label:`First reroll die ${c.i+1} (${c.value}); up to two more rerolls follow`}));return one;
  },
  applyCard({id:card,s,seat,p,choice,roll,random}){
   if(card===24){begin(s,seat,[{kind:'place',left:1,only:'Maelstrom'},{kind:'place',left:1,only:'Tempest!'}]);return true;}
   if(card===25){p.lightningCharges[choice.key]=false;return false;}
   if(card===26){grantStatus(p,'tornado',3);return true;}
   if(card===28){chargeEffect(s,random);return true;}
   if(card===29){p.tornado-=3;borrow(s,5);return true;}
   if(card===30){removeStatus(p,'tornado');p.ragingWindsTurn=s.turn;return true;}
   if(card===31||card===32){const c=rollContext(s),before=c.dice.slice();c.dice[choice.i]=card===31?choice.v:roll();if(c.scalar)s.effectDie=c.dice[0];if(card===32)s.retry={seat,before,remaining:2};else releaseChangedAnnouncement(s,c,before);return true;}return false;
  },
  cardRollSize:card=>({25:3,27:4,33:1})[card]??0,
  resolveCardRoll({id:card,s,seat,p,counts:c,hit,random}){
   if(card===25){gainCP(p,(c.Wind??0));if(c.Rain)drawCards(p,1,random,card);if(c.Cyclone)grantStatus(p,'windShear');return true;}
   if(card===27){const n=c.Wind??0;if(hit.grossDamage===undefined){hit.damage+=n;hit.stormModifiers=(hit.stormModifiers??0)+n;}else{hit.grossDamage+=n;updateDamage(hit);}if(c.Cyclone)grantStatus(p,'tornado');return true;}
   if(card===33){if(c.Cyclone){grantStatus(p,'tornado');begin(s,seat,[{kind:'place',left:3}]);}else drawCards(p,1,random,card);return true;}return false;
  },
  handle(previous,a,roll,random){
   if(!['spendTornado','spendWindShear','stormPlace','stormPlaceDone','stormUseCharge','stormKeepCharge','stormOppReroll'].includes(a.type))return undefined;
   const seat=cardActor(previous),t=previous.stormTask,r=previous.pending?.storm;
   if(a.type==='spendTornado'&&!canTornado(previous,seat)||a.type==='spendWindShear'&&!canWind(previous,seat))return previous;
   if(['stormUseCharge','stormKeepCharge'].includes(a.type)&&(previous.stage!=='stormCharge'||seat!==previous.active||previous.response||!r.eligible))return previous;
   if(['stormPlace','stormPlaceDone'].includes(a.type)&&(!t||previous.stage!=='stormChoices'||t.seat!==seat||previous.response||previous.sideDamage))return previous;
   if(a.type==='stormPlace'&&!places(previous).includes(a.status)||a.type==='stormPlaceDone'&&!t.queue[0]?.optional)return previous;
   if(a.type==='stormOppReroll'&&(!oppReroll(previous,seat)||!Array.isArray(a.indices)||!a.indices.length||a.indices.length>2||new Set(a.indices).size!==a.indices.length||!a.indices.every(i=>i===0||i===1)))return previous;
   const s=structuredClone(previous),p=s.players[seat];psylocke.setState(s);s.response=null;
   if(a.type==='spendTornado'){p.tornado--;borrow(s,1);}
   if(a.type==='spendWindShear'){removeStatus(p,'windShear');const amount=p.ragingWindsTurn===s.turn?4:2;delete p.ragingWindsTurn;s.pending.prevention=(s.pending.prevention??0)+amount;updateDamage(s.pending);startSideDamage(s,1-seat,amount,'Wind Shear',false,{keepPending:true});}
   if(a.type==='stormUseCharge'){p.lightningCharges[r.key]=false;psylocke.withoutAbility(s,()=>chargeEffect(s,random));s.stage='stormAbility';}
   if(a.type==='stormKeepCharge')s.stage='stormAbility';
   if(a.type==='stormPlaceDone')s.stormTask.queue.shift();
   if(a.type==='stormPlace'){
    const h=s.stormTask.queue[0],key=a.status;h.left--;if(h.used)h.used.push(key);p.lightningCharges??=Object.fromEntries(slots.map(k=>[k,false]));
    if(p.lightningCharges[key]){p.lightningCharges[key]=false;startSideDamage(s,1-seat,2,'Lightning',false,{keepPending:true,pantherLocked:t.locked});}else p.lightningCharges[key]=true;
   }
   if(a.type==='stormOppReroll'){for(const i of a.indices)s.pending.effectDice[i]=roll();s.pending.storm.oppRerolled=true;}
   return s;
  }
 };
})();
