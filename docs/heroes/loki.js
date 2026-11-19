const loki=(()=>{
 const id=28;
 const board={name:'Loki',symbols:['Scepter','Scepter','Illusion','Illusion','Lies','Mischief'],defence:'Tip the Scale',abilities:[
  {name:'Mockery',symbols:{Scepter:3},damage:c=>c.Scepter+3,text:'3–5 Scepters · deal 6 / 7 / 8 damage.'},
  {name:'Antics',symbols:{Lies:2},draw:1,illusion:1,bags:1,text:'Draw 1. Gain Illusion and Bag of Tricks.'},
  {name:'Confuddle',symbols:{Scepter:2,Illusion:2},spellbound:2,damage:()=>7,text:'Inflict 2 Spellbound. Deal 7 damage.'},
  {name:'Vilify',symbols:{Scepter:1,Illusion:1,Lies:1,Mischief:1},vilify:true,text:'If the opponent has more Health, gain Illusion and deal 7 damage. Otherwise deal 5 undefendable damage and choose two Bag of Tricks recipients (may repeat).'},
  {name:'Vex',straight:4,bags:1,damage:()=>7,text:'Gain Bag of Tricks. Deal 7 damage.'},
  {name:'Kneel to Me',straight:5,damage:()=>8,effect:'lokiKneel',effectCount:3,text:'Deal 8 damage and roll 3 dice. Add 1 per Scepter; any Illusion gains Bag of Tricks, Lies draws 1, Mischief gains Illusion.'},
  {name:'Double Take',symbols:{Mischief:4},illusion:1,spellbound:2,damage:()=>7,type:'undefendable',text:'Gain Illusion. Inflict 2 Spellbound. Deal 7 undefendable damage.'},
  {name:'Glorious Purpose!',symbols:{Mischief:5},illusion:1,spellbound:3,distribute:4,damage:()=>10,type:'ultimate',text:'Gain Illusion. Inflict 3 Spellbound. Choose four Bag of Tricks recipients (may repeat). Deal 10 Ultimate damage.'}
 ]};
 const upgrades=[
  ['Mockery II',2,'Mockery',{damage:c=>c.Scepter+4,bagMatch:3,text:'3–5 Scepters · deal 7 / 8 / 9 damage. Three matching numbers gain Bag of Tricks.'}],
  ['Antics II',2,'Antics',{bags:2,bagThree:true,text:'Two Lies: draw 1, gain Illusion and 2 Bags of Tricks. Three Lies: draw 1, gain Illusion and distribute up to 3 Bags of Tricks.'}],
  ['Confuddle II',2,'Confuddle',{damage:()=>8,text:'Inflict 2 Spellbound. Deal 8 damage.'},2,{name:'Liar’s Gifts',symbols:{Illusion:3},distribute:3,optionalBags:true,text:'Distribute up to 3 Bags of Tricks in any way desired.'}],
  ['Tip the Scale II',3,'defence',{}],
  ['Vex II',2,'Vex',{damage:()=>9,text:'Gain Bag of Tricks. Deal 9 damage.'}],
  ['Vilify II',2,'Vilify',{spellbound:1,vilifyUpgrade:true,text:'Inflict Spellbound. If the opponent has more Health, gain Illusion and deal 8 damage. Otherwise deal 6 undefendable damage and choose two Bag of Tricks recipients.'}],
  ['Double Take II',2,'Double Take',{damage:()=>8,spellbound:3,text:'Gain Illusion. Inflict 3 Spellbound. Deal 8 undefendable damage.'},2,{name:'Made You Look',symbols:{Mischief:3},illusion:1,damage:()=>3,type:'undefendable',text:'Gain Illusion. Deal 3 undefendable damage.'}],
  ['Kneel to Me II',2,'Kneel to Me',{damage:()=>9,effectCount:4,text:'Deal 9 damage and roll 4 dice. Add 1 per Scepter; any Illusion gains Bag of Tricks, Lies draws 1, Mischief gains Illusion.'},2,{name:'Bewilder',symbols:{Illusion:2,Lies:1},spellbound:2,damage:()=>3,type:'undefendable',text:'Inflict 2 Spellbound. Deal 3 undefendable damage.'}]
 ];
 const cards=[['Loki’n to My Eyes!',1,'main'],['How Lovely!',1,'main'],['Liar Liar!',1,'roll'],['Pantaloons on Fire!',1,'roll'],['Outwit!',0,'instant'],['Take Backsies!',2,'main'],['Dash of Mischief!',0,'main']];
 const illusionNames=['Success! · take the incoming damage; attacker gains Bag of Tricks','Partial Success · prevent half incoming damage','Fail! · prevent all incoming damage'];
 function serial(s){return s.lokiSerial=(s.lokiSerial??0)+1;}
 function sync(p){p.bagOfTricks=(p.trickBags??[]).length;p.spellbound=(p.boundAbilities??[]).length;}
 function give(s,target,owner,amount=1,bag){
  const p=s.players[target];p.trickBags??=[];
  while(amount-->0&&p.trickBags.length<2)p.trickBags.push(bag??{id:serial(s),owner});sync(p);
 }
 function removeBag(p,bagId){const i=bagId===undefined?(p.trickBags?.length??0)-1:p.trickBags?.findIndex(b=>b.id===bagId);if(i===undefined||i<0)return;const b=p.trickBags.splice(i,1)[0];sync(p);return b;}
 function key(a){return a.name.replace(/ \(large straight\)$/,'');}
 function blocked(s,seat,a){return (s.players[seat].boundAbilities??[]).some(b=>b.key===key(a));}
 function bindChoices(s,target){
  if((s.players[target].boundAbilities??[]).length>=3)return [];
  const abilities=abilitiesFor(s,target).filter(a=>a.type!=='ultimate');
  const unique=abilities.filter((a,i)=>abilities.findIndex(b=>key(a)===key(b))===i);
  // The Ultimate counts as the last uncovered Offensive Ability.
  return abilitiesFor(s,target).filter(a=>!blocked(s,target,a)).length<=1?[]:unique.filter(a=>!blocked(s,target,a));
 }
 function removeBound(p,boundId){const i=boundId===undefined?(p.boundAbilities?.length??0)-1:p.boundAbilities?.findIndex(b=>b.id===boundId);if(i===undefined||i<0)return;const b=p.boundAbilities.splice(i,1)[0];sync(p);return b;}
 function begin(s,seat,queue,resume=s.stage){if(queue.length){s.lokiTask={seat,queue,resume};s.stage='lokiChoices';}}
 function options(s){
  const st=s.lokiTask,t=st?.queue[0];if(!t)return [];
  if(t.kind==='bind')return bindChoices(s,t.target).map(a=>({key:key(a),label:a.label??a.name}));
  if(t.kind==='bags')return heroNames(s).map((name,target)=>({target,label:`${name} · Bag of Tricks ${(s.players[target].bagOfTricks??0)}/2`}));
  return [];
 }
 function pump(s){
  const st=s.lokiTask;if(!st||s.stage==='sideDamage'||s.stage==='finished')return;
  while(st.queue.length&&(!st.queue[0].left||!options(s).length))st.queue.shift();
  if(!st.queue.length){s.stage=st.resume;s.lokiTask=null;}
 }
 function ability(s,random){
  const h=s.pending,p=s.players[s.active],a=h.loki;
  if(h.lokiPrepared)return false;h.lokiPrepared=true;
  if(a.vilify){if(s.players[1-s.active].hp>p.hp){a.illusion=1;h.damage=a.upgrade?8:7;}else{h.damage=a.upgrade?6:5;h.undefendable=true;a.distribute=2;}}
  if(a.illusion)grantStatus(p,'illusion',a.illusion);
  if(a.bags)give(s,s.active,s.active,a.bags);
  if(h.draw){drawCards(p,h.draw,random);h.draw=0;}
  const q=[];if(a.bind)q.push({kind:'bind',target:1-s.active,left:a.bind});if(a.distribute)q.push({kind:'bags',left:a.distribute,optional:a.optional});
  begin(s,s.active,q,'lokiAbility');pump(s);return !!s.lokiTask;
 }
 function busy(s){return !!(s.lokiTask||s.lokiBag||s.lokiIllusion||s.cardRoll||s.retry||s.strangeTask||s.premonitionTask||s.widowTask||s.widowReveal||s.widowAgility||s.widowBombRoll||s.cosmicRayRoll||s.growth||s.mainChoice||s.mainAction||s.sideDamage);}
 function canIllusion(s,seat){return !!(s.cards&&!busy(s)&&s.players[seat].illusion&&seat!==s.active&&s.pending?.attack&&!s.pending.ultimate&&!s.pending.pure&&!attackLocked(s)&&['defence','defenceResponse','damage'].includes(s.stage)&&incomingDamage(s)>0);}
 function bagRoll(s,target,owner,roll,outwit=false){s.lokiBag={parent:s.lokiBag??null,locked:!!attackLocked(s),seat:target,owner,dice:[roll()],resume:s.stage,kind:'roll',amount:outwit?3:2,outwit};s.stage='lokiBagRoll';s.response=null;}
 function finishBag(s){const t=s.lokiBag;s.stage=t.resume;s.lokiBag=t.parent??null;}
 return {id,board,upgrades,cards,promoId:33,illusionNames,key,blocked,bindChoices,removeBound,give,removeBag,sync,begin,options,pump,ability,canIllusion,bagRoll,
  initialize(s,seat){Object.assign(s.players[seat],{illusion:0,trickBags:[],bagOfTricks:0,boundAbilities:[],spellbound:0,lokiOwner:seat});},
  defenceDiceCount(p){return p.upgrades?.defence?2:1;},
  resolveDefence({state,seat,defender,counts,grantStatus,random}){
   if(counts.Illusion)give(state,seat,seat);
   if(counts.Lies)drawCards(defender,1,random);
   if(counts.Mischief)grantStatus(defender,'illusion');
   if(counts.Scepter){begin(state,seat,[{kind:'bind',target:1-seat,left:1}],'damage');pump(state);return state.stage;}
   return 'damage';
  },
  cardChoices(card,{s,seat,one,heroTargets}){
   const p=s.players[seat],h=s.pending;
   if(card===28)return [{extra:0,label:'Gain 1 Illusion'},...(p.cp>=3?[{extra:2,label:'Spend 2 additional CP · gain 2 Illusions'}]:[])];
   if([29,30].includes(card))return seat===s.active&&h?.attack&&!h.pure&&!h.evaded&&!h.parlayBlocked&&['defence','defenceResponse','damage','locked'].includes(s.stage)?one:[];
   if(card===31)return heroTargets.flatMap(({target,label})=>(s.players[target].trickBags??[]).map(b=>({target,bagId:b.id,label:`${label} · Bag of Tricks from ${heroNames(s)[b.owner]}`})));
   if(card===32)return p.discard.filter(c=>seatCard(s,seat,c).cost<=2).map(card=>({card,label:seatCard(s,seat,card).name}));
   return one;
  },
  applyCard({id:card,s,seat,p,choice,roll}){
   if(card===27){begin(s,seat,[{kind:'bind',target:1-seat,left:3}]);return true;}
   if(card===28){p.cp-=choice.extra;grantStatus(p,'illusion',choice.extra?2:1);return true;}
   if(card===30){const h=s.pending;h.grossDamage+=h.lokiLiar?4:2;h.lokiPants=true;updateDamage(h);return true;}
   if(card===31){removeBag(s.players[choice.target],choice.bagId);bagRoll(s,choice.target,seat,roll,true);return true;}
   if(card===32){p.discard.splice(p.discard.indexOf(choice.card),1);p.hand.push(choice.card);s.log.unshift(`${heroNames(s)[seat]} takes back ${seatCard(s,seat,choice.card).name}, revealing it to the opponent.`);return true;}
   return false;
  },
  cardRollSize(card){return card===29?4:card===33?1:0;},
  resolveCardRoll({id:card,s,seat,p,counts,hit,drawCards,random}){
   if(card===29){hit.grossDamage+=(counts.Scepter??0)+(hit.lokiPants&&!hit.lokiLiar?2:0);hit.lokiLiar=true;updateDamage(hit);if(counts.Lies)give(s,1-seat,seat);if(counts.Mischief)give(s,seat,seat);}
   if(card===33){if(counts.Mischief){grantStatus(p,'illusion');begin(s,seat,[{kind:'bind',target:1-seat,left:3}]);}else drawCards(p,1,random,card);}
   return true;
  },
  handle(previous,action,roll,random,bypassResponse){
   const type=action.type;
   if(!['lokiChoose','lokiSkip','rollTrickBag','resolveTrickBag','chooseTrickBag','spendIllusion','arrangeIllusion','shuffleIllusion','pickIllusion','finishIllusion'].includes(type))return undefined;
   if(previous.response&&type!=='spendIllusion')return previous;
   const seat=cardActor(previous);
   if(type==='spendIllusion'&&!canIllusion(previous,seat))return previous;
   if(type==='rollTrickBag'&&(previous.stage!=='upkeep'||!previous.players[previous.active].bagOfTricks))return previous;
   if(type==='resolveTrickBag'&&(!previous.lokiBag||previous.lokiBag.kind!=='roll'||previous.cardRoll||previous.retry))return previous;
   if(['lokiChoose','lokiSkip'].includes(type)&&!previous.lokiTask)return previous;
   if(type==='chooseTrickBag'&&previous.lokiBag?.kind!=='choose')return previous;
   if(['arrangeIllusion','shuffleIllusion'].includes(type)&&previous.lokiIllusion?.kind!=='arrange')return previous;
   if(type==='pickIllusion'&&previous.lokiIllusion?.kind!=='pick')return previous;
   if(type==='finishIllusion'&&previous.lokiIllusion?.kind!=='reveal')return previous;
   if(type==='resolveTrickBag'&&!bypassResponse&&!previous.lokiBag.locked&&hasResponse(previous,1-previous.lokiBag.seat))return {...previous,response:{seat:1-previous.lokiBag.seat,action}};
   const s=structuredClone(previous);s.response=null;
   if(type==='lokiChoose'||type==='lokiSkip'){
    const st=s.lokiTask,t=st.queue[0],choice=options(s)[action.choice];
    if(type==='lokiSkip'){if(!t.optional)return previous;st.queue.shift();}
    else {if(!choice)return previous;if(t.kind==='bags'){give(s,choice.target,st.seat);s.log.unshift(`${heroNames(s)[st.seat]} chooses ${heroNames(s)[choice.target]} to gain Bag of Tricks.`);}else{const p=s.players[t.target];(p.boundAbilities??=[]).push({id:serial(s),key:choice.key});sync(p);s.log.unshift(`${heroNames(s)[st.seat]} makes ${choice.key} Spellbound on ${heroNames(s)[t.target]}.`);}t.left--;}
    pump(s);
   }
   if(type==='rollTrickBag'){
    const target=s.active,p=s.players[target],bag=(p.trickBags??[]).find(b=>b.id===action.index)??p.trickBags?.[0];if(!bag)return previous;
    removeBag(p,bag.id);bagRoll(s,target,bag.owner,roll);
   }
   if(type==='resolveTrickBag'){
    const t=s.lokiBag,p=s.players[t.seat],value=dieValue(t.dice[0],p);
    s.log.unshift(`${heroNames(s)[t.seat]} rolls ${value} for ${t.outwit?'Outwit!':'Bag of Tricks'}.`);
    if(value===6){p.cp=bounded(p.cp+(t.outwit?4:2),15);finishBag(s);}
    else if(!t.outwit&&value===1){p.cp=Math.max(0,p.cp-1);finishBag(s);}
    else if(!value)finishBag(s);
    else t.kind='choose';
   }
   if(type==='chooseTrickBag'){
    if(!['heal','cp','damage'].includes(action.status))return previous;
    const t=s.lokiBag,p=s.players[t.seat];
    s.log.unshift(`${heroNames(s)[t.owner]} chooses ${action.status==='cp'?`gain ${t.outwit?3:1} CP`:action.status==='heal'?`heal ${t.amount}`:`receive ${t.amount} damage`} for ${heroNames(s)[t.seat]}.`);
    if(action.status==='cp')p.cp=bounded(p.cp+(t.outwit?3:1),15);
    if(!t.outwit){if(action.status==='heal')s.upkeepBagHeal=(s.upkeepBagHeal??0)+t.amount;if(action.status==='damage')s.upkeepBagDamage=(s.upkeepBagDamage??0)+t.amount;finishBag(s);}
    else {if(action.status==='heal')p.hp=bounded(p.hp+t.amount,60);finishBag(s);if(action.status==='damage'){const parent=s.lokiBag;s.lokiBag=null;startSideDamage(s,t.seat,t.amount,'Outwit!',false,{keepPending:true,lokiBagResume:parent,pantherLocked:t.locked});}}
   }
   if(type==='spendIllusion'){s.players[seat].illusion--;s.lokiIllusion={seat,kind:'arrange',order:[],resume:s.stage};s.stage='lokiIllusion';}
   if(type==='arrangeIllusion'){
    const t=s.lokiIllusion;if(![0,1,2].includes(action.index)||t.order.includes(action.index))return previous;
    t.order.push(action.index);if(t.order.length===2){t.order.push([0,1,2].find(i=>!t.order.includes(i)));t.kind='pick';}
   }
   if(type==='shuffleIllusion'){s.lokiIllusion.order=shuffle([0,1,2],random);s.lokiIllusion.kind='pick';}
   if(type==='pickIllusion'){
    if(![0,1,2].includes(action.index))return previous;
    const t=s.lokiIllusion,result=t.order[action.index],h=s.pending;t.result=result;t.kind='reveal';
    if(result===0)give(s,s.active,t.seat);if(result===1)h.illusionHalves=(h.illusionHalves??0)+1;if(result===2)h.illusionPreventAll=true;
    updateDamage(h);s.log.unshift(`Illusion: ${illusionNames[result]}.`);
   }
   if(type==='finishIllusion'){s.stage=s.lokiIllusion.resume;s.lokiIllusion=null;}
   return s;
  }
 };
})();
