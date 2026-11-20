const rogue=(()=>{
 const id=37;
 const board={name:'Rogue',symbols:['Touch','Touch','Touch','Soar','Soar','Ion'],defence:'Duplicate',abilities:[
  {name:'Brawl',symbols:{Touch:3},damage:c=>c.Touch+1,brawl:true,text:'3 / 4 / 5 Touch · deal 4 / 5 / 6 damage. On three matching numbers, gain 1 CP.'},
  {name:'Sass',symbols:{Touch:2,Ion:2},cpGain:1,influence:1,damage:()=>3,type:'undefendable',text:'Gain 1 CP. Inflict Influence. Deal 3 undefendable damage.'},
  {name:'Leach',symbols:{Touch:1,Soar:3},ionic:1,effect:'rogueLeach',effectCount:1,text:'Gain Ionic Energy (1). Roll 1: Touch steals 2 Health; Soar steals 3 and gains Ionic Energy (1); Ion steals 4 and gains Ionic Energy (1). Pay 1 CP per +1 to this die.'},
  {name:'Absorption',straight:4,influence:1,damage:()=>7,text:'Small straight · inflict Influence. Deal 7 damage.'},
  {name:'Absorption (large straight)',upgradeSlot:'Absorption',variant:'large',straight:5,influence:2,damage:()=>9,text:'Large straight · inflict 2 Influence. Deal 9 damage.'},
  {name:'Skybound',symbols:{Soar:2,Ion:2},cpGain:1,skyward:1,damage:()=>7,text:'Gain 1 CP and Skyward. Deal 7 damage.'},
  {name:'Influential',symbols:{Ion:4},skyward:1,influence:2,damage:()=>6,type:'undefendable',text:'Gain Skyward. Inflict 2 Influence. Deal 6 undefendable damage.'},
  {name:'High Altitude!',symbols:{Ion:5},cpGain:1,skyward:2,influence:3,damage:()=>11,type:'ultimate',text:'Gain 1 CP and 2 Skyward. Inflict 3 Influence. Deal 11 Ultimate damage.'}
 ]};
 const upgrades=[
  ['Brawl II',2,'Brawl',{brawlUp:true,text:'Deal 4 / 5 / 6 damage. Gain 1 CP. On three matching numbers, inflict Influence.'},2,{name:'Mind over Matter',symbols:{Touch:2,Soar:3},influence:1,damage:()=>7,text:'Inflict Influence. Deal 7 damage.'}],
  ['Sass II',2,'Sass',{damage:()=>4,text:'Gain 1 CP. Inflict Influence. Deal 4 undefendable damage.'},2,{name:'Underdog',symbols:{Touch:3,Ion:2},cpGain:2,influence:1,damage:()=>5,type:'undefendable',text:'Gain 2 CP. Inflict Influence. Deal 5 undefendable damage.'}],
  ['Absorption II',2,'Absorption',{influence:2,text:'Small straight · inflict 2 Influence. Deal 7 damage.',variants:{large:{influence:3,damage:()=>9,label:'Absorption II (large straight)',text:'Large straight · inflict 3 Influence. Deal 9 damage.'}}}],
  ['Skybound II',2,'Skybound',{cpGain:2,damage:()=>8,text:'Gain 2 CP and Skyward. Deal 8 damage.'},2,{name:'To the Clouds',symbols:{Soar:3,Ion:2},cpGain:3,skyward:1,damage:()=>9,text:'Gain 3 CP and Skyward. Deal 9 damage.'}],
  ['Influential II',2,'Influential',{influence:3,text:'Gain Skyward. Inflict 3 Influence. Deal 6 undefendable damage.'},2,{name:'Reciprocate',symbols:{Ion:3},ionic2:1,influence:3,text:'Gain Ionic Energy (2). Inflict 3 Influence.'}],
  ['Duplicate II',3,'defence',{}]
 ];
 const cards=[['Southern Belle!',1,'main'],['Remy’s Kiss!',0,'main'],['Back Off!',1,'main'],['Ionic Intensity!',3,'main'],['Head in the Clouds!',2,'roll'],['Sweet Tea!',1,'roll'],['Cloudy!',2,'roll'],['Sugah!',1,'instant'],['Wind Up!',0,'main']];
 const total=p=>(p.ionicEnergy??0)+(p.ionicEnergy2??0),cap=p=>p.ionicCap??4;
 function rawGain(p,key,n=1){if(psylocke.blockDirect(p,key,n))return;p[key]=(p[key]??0)+Math.min(n,Math.max(0,cap(p)-total(p)));}
 function usage(s,p){return p.ionicTurn===s.turn?p.ionicSpent??0:0;}
 function expanded(s,p){return p.ionicLimitTurn===s.turn;}
 function busy(s){return !!(s.psyReveal||s.rogueRoll||s.cardRoll||s.retry||s.sideDamage||s.jeanBurnRoll||s.widowAgility||s.widowBombRoll||s.cosmicRayRoll||s.growth||s.mainChoice||s.mainAction||s.strangeTask||s.lokiTask||s.lokiIllusion||s.conjureTask||s.iceFreezeChoice);}
 function attack(s,seat){const h=s.pending;return !!(s.cards&&seat===s.active&&h&&(h.attack??h.damage>0)&&!h.pure&&!h.evaded&&!h.parlayBlocked&&!busy(s)&&['rogueAbility','psyAbility','jeanAbility','jeanResolved','iceAbility','iceResolved','gambitAbility','cyclopsAbility','thorAbility','widowAbility','targeting','defence','defenceResponse','damage','locked'].includes(s.stage));}
 function ionicChoices(s,seat){const p=s.players[seat];return attack(s,seat)&&usage(s,p)<(expanded(s,p)?4:2)?['ionicEnergy','ionicEnergy2'].filter(k=>p[k]>0).map(key=>({key,label:`Spend Ionic Energy (${key==='ionicEnergy2'?2:1}) · ${usage(s,p)+1}/${expanded(s,p)?4:2} this turn`})):[];}
 function canExpand(s,seat){const p=s.players[seat];return attack(s,seat)&&total(p)>0&&p.cp>0&&!expanded(s,p);}
 function canSkyward(s,seat){const h=s.pending;return !!(s.cards&&seat!==s.active&&s.players[seat].skyward&&!busy(s)&&!s.rogueGain&&h?.attack&&!h.ultimate&&!h.stun&&!h.parlayBlocked&&['defence','defenceResponse','damage'].includes(s.stage));}
 function gain(s,seat,ones=0,twos=0){
  const p=s.players[seat];if(ones&&psylocke.block(s,p,'ionicEnergy',ones))ones=0;if(twos&&psylocke.block(s,p,'ionicEnergy2',twos))twos=0;
  const free=cap(p)-total(p);if(!ones&&!twos)return;
  if(ones+twos>free&&(ones&&twos&&free>0||ionicChoices(s,seat).length||canExpand(s,seat))){s.rogueGain={seat,ones,twos};return;}
  rawGain(p,'ionicEnergy',ones);rawGain(p,'ionicEnergy2',twos);
 }
 function collectChoices(s){const t=s.rogueGain;if(!t)return [];const room=Math.max(0,cap(s.players[t.seat])-total(s.players[t.seat])),n=Math.min(room,t.ones+t.twos),list=[];
  for(let twos=Math.max(0,n-t.ones);twos<=Math.min(n,t.twos);twos++){const ones=n-twos;list.push({ones,twos,label:`Collect ${ones} Ionic (1) and ${twos} Ionic (2)${t.ones+t.twos>n?' · discard excess':''}`});}return list;
 }
 function start(s,roll){const p=s.players[s.active];delete s.rogueRoll;delete s.rogueGain;if(!p.knockdown&&p.influence){s.rogueRoll={kind:'influence',seat:s.active,count:p.influence,dice:Array.from({length:p.influence},()=>roll())};s.stage='rogueInfluence';}}
 function ability(s){const h=s.pending;if(!h.rogue||h.roguePrepared)return false;h.roguePrepared=true;const p=s.players[s.active],r=h.rogue;if(r.brawl&&r.cp)gainCP(p,1);if(r.skyward)grantStatus(p,'skyward',r.skyward);s.stage='rogueAbility';gain(s,s.active,r.ionic??0,r.ionic2??0);return true;}
 function leach(s){const p=s.players[s.active],c=tally(effectiveDice(s.pending.effectDice,p),id);const n=c.Touch?2:c.Soar?3:c.Ion?4:0;if(c.Soar||c.Ion)gain(s,s.active,1);return stealNecroHealth(s,s.active,n);}
 function cloudy(s,seat){const r=s.pending?.skywardResult;return !!(r&&r.seat===seat&&r.amount&&!r.doubled&&!busy(s)&&['defence','defenceResponse','damage'].includes(s.stage));}
 function sugah(s){const r=s.rogueRoll;return r&&!s.cardRoll&&!s.retry?rollContext(s):null;}
 function boostLeach(s,seat){return seat===s.active&&s.stage==='effectResponse'&&s.pending?.effect==='rogueLeach'&&!s.cardRoll&&!s.retry&&!s.response&&s.players[seat].cp>0&&s.pending.effectDice[0]<6;}
 return {
  leafletPositives: {ionicEnergy: true, ionicEnergy2: true, skyward: true},
  id,board,upgrades,cards,promoId:33,total,cap,rawGain,gain,collectChoices,usage,expanded,ionicChoices,canExpand,canSkyward,start,ability,leach,cloudy,sugah,boostLeach,
  initialize(s,seat){Object.assign(s.players[seat],{ionicEnergy:0,ionicEnergy2:0,skyward:0,influence:0});},
  defenceDiceCount:p=>p.upgrades?.defence?5:4,
  resolveDefence({state:s,defender:p,counts:c}){s.pending.returnDamage+=Math.floor((c.Touch??0)/2);s.pending.prevention=(s.pending.prevention??0)+2*Math.floor((c.Soar??0)/2);const n=Math.floor((c.Ion??0)/2);grantStatus(p,'skyward',n);s.stage='damage';gain(s,1-s.active,n);updateDamage(s.pending);return 'damage';},
  drive(s,seat,amount){if(heroId(s,seat)===id&&s.players[seat].hp>0&&s.pending?.attack&&!s.pending.ultimate&&amount>0)psylocke.withoutAbility(s,()=>rawGain(s.players[seat],amount>=7?'ionicEnergy2':'ionicEnergy'));},
  cardChoices(card,{s,seat,one}){if(card===31)return cloudy(s,seat)?one:[];if(card===32){const c=sugah(s);return c?c.dice.flatMap((v,index)=>[1,2,3,4,5,6].filter(to=>to!==v).map(to=>({index,to,label:`${heroNames(s)[dieOwner(c,index)]}’s die ${index+1}: ${v} → ${to}`}))):[];}return one;},
  applyCard({id:card,s,seat,p,choice,roll,random}){
   if(card===26){grantStatus(s.players[1-seat],'influence');drawCards(p,1,random,card);return true;}
   if(card===27){grantStatus(s.players[1-seat],'influence');s.cardRoll={seat,roller:1-seat,id:card,dice:Array.from({length:s.players[1-seat].influence??0},()=>roll())};return true;}
   if(card===28){p.ionicCap=cap(p)+1;return false;}
   if(card===29){grantStatus(p,'skyward');gain(s,seat,0,1);return true;}
   if(card===30){p.ionicLimitTurn=s.turn;gain(s,seat,0,1);return true;}
   if(card===31){const r=s.pending.skywardResult;r.doubled=true;if(r.outcome==='return')s.pending.returnDamage+=r.amount;else{s.pending.prevention=(s.pending.prevention??0)+r.amount;updateDamage(s.pending);}return true;}
   if(card===32){rollContext(s).dice[choice.index]=choice.to;return true;}return false;
  },
  cardRollSize:card=>({25:2,28:4,33:1})[card]??0,
  resolveCardRoll({id:card,s,seat,p,counts:c,dice,random}){
   if(card===25){gain(s,seat,Number(!!c.Touch)+Number(!!c.Ion),Number(!!c.Soar)+Number(!!c.Ion));return true;}
   if(card===27){stealNecroHealth(s,seat,dice.filter(v=>v>0&&v<=4).length);return true;}
   if(card===28){grantStatus(p,'skyward',c.Ion??0);gain(s,seat,c.Touch??0,c.Soar??0);return true;}
   if(card===33){if(c.Ion){gainCP(p,1);gain(s,seat,0,2);}else drawCards(p,1,random,card);return true;}return false;
  },
  handle(previous,a,roll,random,bypassResponse){
   if(!['spendIonic','expandIonic','spendSkyward','rerollSkyward','resolveRogueRoll','rogueCollect','rogueLeachBoost'].includes(a.type))return undefined;
   const seat=cardActor(previous),r=previous.rogueRoll;
   if(a.type==='spendIonic'&&!ionicChoices(previous,seat).some(c=>c.key===a.status)||a.type==='expandIonic'&&!canExpand(previous,seat)||a.type==='spendSkyward'&&!canSkyward(previous,seat)||a.type==='rogueLeachBoost'&&!boostLeach(previous,seat))return previous;
   if(['resolveRogueRoll','rerollSkyward'].includes(a.type)&&(!r||previous.cardRoll||previous.retry||previous.response))return previous;
   if(a.type==='rerollSkyward'&&(r.kind!=='skyward'||seat!==r.seat||previous.players[seat].cp<1))return previous;
   if(a.type==='resolveRogueRoll'&&!bypassResponse&&hasResponse(previous,1-r.seat))return {...previous,response:{seat:1-r.seat,action:a}};
   const c=a.type==='rogueCollect'?collectChoices(previous)[a.choice]:null;if(a.type==='rogueCollect'&&(!c||seat!==previous.rogueGain.seat||previous.response))return previous;
   const s=structuredClone(previous),p=s.players[seat];psylocke.setState(s);s.response=null;
   if(a.type==='spendIonic'){p[a.status]--;p.ionicSpent=usage(s,p)+1;p.ionicTurn=s.turn;const n=a.status==='ionicEnergy2'?2:1;if(s.pending.grossDamage===undefined){s.pending.damage+=n;s.pending.rogueModifiers=(s.pending.rogueModifiers??0)+n;}else{s.pending.grossDamage+=n;updateDamage(s.pending);}}
   if(a.type==='expandIonic'){p.cp--;p.ionicLimitTurn=s.turn;}
   if(a.type==='rogueCollect'){delete s.rogueGain;psylocke.withoutAbility(s,()=>{rawGain(p,'ionicEnergy',c.ones);rawGain(p,'ionicEnergy2',c.twos);});}
   if(a.type==='rogueLeachBoost'){p.cp--;s.pending.effectDice[0]++;}
   if(a.type==='spendSkyward'){p.skyward--;s.rogueRoll={kind:'skyward',seat,dice:[roll(),roll()],resume:s.stage};s.stage='rogueSkyward';}
   if(a.type==='rerollSkyward'){p.cp--;s.rogueRoll.dice[0]=roll();}
   if(a.type==='resolveRogueRoll'){
    delete s.rogueRoll;
    if(r.kind==='influence'){const lost=effectiveDice(r.dice,s.players[r.seat]).filter(v=>v>0&&v<=3).length;s.budget=Math.max(0,s.budget-lost);s.players[r.seat].influence=0;s.stage='offence';s.log.unshift(`Influence removes ${lost} Roll Attempt${lost===1?'':'s'}; ${s.budget} remain.`);}
    else {const own=dieValue(r.dice[0],s.players[r.seat]),other=dieValue(r.dice[1],s.players[1-r.seat]);s.stage=r.resume;const outcome=own>other?'return':own===other?'prevent':'none',amount=outcome==='return'?3:outcome==='prevent'?4:0;s.pending.skywardResult={seat:r.seat,outcome,amount};if(outcome==='return')s.pending.returnDamage+=3;if(outcome==='prevent'){s.pending.prevention=(s.pending.prevention??0)+4;updateDamage(s.pending);}s.log.unshift(`Skyward rolls ${own} against ${other}: ${outcome==='return'?'return 3 damage':outcome==='prevent'?'prevent 4 damage':'no effect'}.`);}
   }
   return s;
  }
 };
})();
