const doctorStrange=(()=>{
 const id=27;
 const board={name:'Doctor Strange',symbols:['Mandala','Mandala','Tome','Tome','Mantle','Amulet'],defence:'Cloak of Levitation',abilities:[
  {name:'Augury',symbols:{Tome:2,Amulet:2},damage:()=>8,dejaVu:true,text:'Gain Déjà Vu. Deal 8 damage.'},
  {name:'Universal Awareness',symbols:{Tome:4},draw:1,dejaVu:true,premonition:2,prepareDiscard:true,text:'Draw 1. Gain Déjà Vu and 2 Premonition. Prepare a Spell from your discard pile.'},
  {name:'Astral Incursion',symbols:{Mandala:1,Tome:1,Mantle:1,Amulet:1},damage:()=>6,effect:'strangeAstral',effectCount:2,text:'Deal 6 damage and roll 2 dice: Mandala adds 3 damage; Tome gains Premonition; Mantle inflicts Crimson Bands; Amulet casts a Spell. Each outcome triggers once.'},
  {name:'Mystic Bolts',straight:4,damage:()=>6,castSpells:1,text:'Small straight · deal 6 damage and Cast a Spell.'},
  {name:'Mystic Bolts (large straight)',upgradeSlot:'Mystic Bolts',straight:5,damage:()=>9,castSpells:1,text:'Large straight · deal 9 damage and Cast a Spell.'},
  {name:'Binding',symbols:{Mandala:2,Mantle:2},crimsonBands:true,damage:()=>9,text:'Inflict Crimson Bands. Deal 9 damage.'},
  {name:'Wand of Watoomb',symbols:{Amulet:4},crimsonBands:true,damage:()=>5,type:'undefendable',prepareDiscard:true,castSpells:2,text:'Inflict Crimson Bands. Deal 5 undefendable damage. Prepare a Spell from your discard pile, then Cast up to two Spells.'},
  {name:'All-Seeing Eye!',symbols:{Amulet:5},damage:()=>10,type:'ultimate',strangeUltimate:true,text:'Look at your top 5 cards. Prepare up to 2 Spells from them and reorder the rest. Deal 10 Ultimate damage and Cast up to 2 Spells.'}
 ]};
 const spellNames=['Vapors of Valtorr','Winds of Watoomb','Images of Ikonn','Rings of Raggadorr','Chains of Krakkan','Fangs of Farallah','Bolts of Balthakk','Mists of Morpheus','Flames of Faltine'];
 const spells=Object.fromEntries(spellNames.map((name,i)=>[19+i,name]));
 const cards=[...spellNames.map(name=>[name,0,'spell']),['Foresight!',0,'main'],['Cast Away!',0,'roll'],['Icy Tendrils!',1,'roll'],['Shields of Seraphim!',1,'roll'],['Time After Time!',2,'instant'],['Hosts of Hoggoth!',0,'main']];
 const isSpell=card=>Object.hasOwn(spells,card);
 function busy(s){return !!(s.strangeTask||s.premonitionTask||s.cardRoll||s.retry||s.widowTask||s.widowReveal||s.widowAgility||s.widowBombRoll||s.cosmicRayRoll||s.cosmicRayOverflow||s.growth||s.mainChoice||s.mainAction||s.sideDamage);}
 function bandsBlocks(s,seat){return !!(s.players[seat].crimsonBands&&seat===s.active&&s.bandsTurn===s.turn&&!['main','main1','upkeep','incomePremonition','discard','finished'].includes(s.stage)&&!(s.pending?.ultimate&&attackLocked(s)));}
 function canPrepare(s,seat){return !!(s.cards&&heroId(s,seat)===id&&seat===s.active&&isMain(s)&&!busy(s)&&!s.response&&s.players[seat].strangePrepareTurn!==s.turn&&s.players[seat].hand.some(isSpell));}
 function canDeja(s,seat){return !!(s.cards&&seat===s.active&&s.players[seat].dejaVu&&['offence','announce','rogueInfluence'].includes(s.stage)&&!busy(s));}
 function begin(s,seat,queue,resume=s.stage){s.strangeTask={seat,queue,resume,active:[]};s.stage='strangeSpells';}
 function options(s){
  const st=s.strangeTask;if(!st)return [];
  const t=st.queue[0],p=s.players[st.seat];if(!t)return [];
  if(t.kind==='prepare'||t.kind==='cast'){
   const zone=t.zone==='book'?p.spellBook:t.zone==='peek'?st.peek:p[t.zone];
   return (zone??[]).filter(card=>isSpell(card)&&!st.active.includes(card)&&!(t.used??[]).includes(card)).map(card=>({card,label:spells[card]}));
  }
  if(t.kind==='heal'||t.kind==='dejaTarget')return heroNames(s).map((name,target)=>({target,label:`${name}${t.kind==='heal'?` · heal ${t.amount}`:' · gain Déjà Vu'}`}));
  if(t.kind==='remove')return s.players.flatMap((p,target)=>statusKeys.filter(key=>p[key]).flatMap(status=>alchemist.types.includes(status)?alchemist.tokens(s,target,status).map(t=>({target,status,tokenId:t.id,label:`${heroNames(s)[target]} · ${alchemist.tokenLabel(t)}`})):status==='spellbound'?(p.boundAbilities??[]).map(b=>({target,status,tokenId:b.id,label:`${heroNames(s)[target]} · Spellbound: ${b.key}`})):status==='bagOfTricks'?(p.trickBags??[]).map(b=>({target,status,tokenId:b.id,label:`${heroNames(s)[target]} · Bag of Tricks from ${heroNames(s)[b.owner]}`})):status==='timeBomb'?(p.timeBombTimers??[]).map(b=>({target,status,bombId:b.id,label:`${heroNames(s)[target]} · Time Bomb 0:0${b.ticks}`})):[{target,status,label:`${heroNames(s)[target]} · ${statusLabel(status)}`} ]));
  if(t.kind==='order')return (st.peek??[]).map(card=>({card,label:seatCard(s,st.seat,card).name}));
  return [];
 }
 function bonus(s,amount){
  const h=s.pending;
  if(!h||!['strangeSpells','strangeAbility','effectResponse','targeting','defence','defenceResponse','damage','locked'].includes(s.stage)||h.pure||h.evaded||h.parlayBlocked||!(h.attack??(h.damage>0)))return;
  if(h.grossDamage===undefined)h.damage+=amount;else {h.grossDamage+=amount;updateDamage(h);}
 }
 function prepare(s,card,zone){
  const st=s.strangeTask,p=s.players[st.seat],from=zone==='peek'?st.peek:p[zone];
  from.splice(from.indexOf(card),1);p.spellBook.push(card);
  s.log.unshift(`${heroNames(s)[st.seat]} prepares ${spells[card]}.`);
  const tasks={19:[{kind:'heal',amount:1}],20:[{kind:'remove',optional:true}],21:[],22:[{kind:'gain',status:'premonition',amount:1}],23:[{kind:'bands'}],24:[{kind:'loseCP'}],25:[{kind:'cp',amount:1}],26:[{kind:'dejaTarget'}],27:[{kind:'isolated',amount:1,source:spells[card]}]}[card];
  st.queue.unshift(...tasks);
 }
 function cast(s,card,zone){
  const st=s.strangeTask,p=s.players[st.seat];
  if(zone==='book')p.spellBook.splice(p.spellBook.indexOf(card),1);
  st.active.push(card);s.log.unshift(`${heroNames(s)[st.seat]} casts ${spells[card]}.`);
  const tasks={19:[{kind:'gain',status:'premonition',amount:3}],20:[{kind:'prepare',zone:'discard',left:1}],21:[{kind:'bonus',amount:Math.min(4,p.hand.length)}],22:[{kind:'cast',zone:'discard',left:2,used:[],optional:true}],23:[{kind:'undefendable'}],24:[{kind:'bonus',amount:3}],25:[{kind:'isolated',amount:3,source:spells[card]}],26:[{kind:'heal',amount:3}],27:[{kind:'bonus',amount:1}]}[card];
  st.queue.unshift(...tasks,{kind:'finishCast',card,zone});
 }
 function pump(s){
  const st=s.strangeTask;if(!st||s.stage==='sideDamage'||s.stage==='finished')return;
  const p=s.players[st.seat];s.stage='strangeSpells';
  while(st.queue.length){
   const t=st.queue[0];
   if(['prepare','cast','heal','dejaTarget','remove','order'].includes(t.kind)){
    if((t.left===0||!options(s).length)&&['prepare','cast','order','remove'].includes(t.kind)){
     st.queue.shift();if(t.kind==='order')p.deck.push(...(t.ordered??[]).reverse());continue;
    }
    return;
   }
   st.queue.shift();
   if(t.kind==='gain')grantStatus(p,t.status,t.amount);
   if(t.kind==='bands')grantStatus(s.players[1-st.seat],'crimsonBands');
   if(t.kind==='loseCP')s.players[1-st.seat].cp=Math.max(0,s.players[1-st.seat].cp-1);
   if(t.kind==='cp')p.cp=bounded(p.cp+t.amount,15);
   if(t.kind==='bonus')bonus(s,t.amount);
   if(t.kind==='undefendable'){
    const h=s.pending;
    if(h&&!h.pure&&(h.attack??(h.damage>0))){h.undefendable=true;if(st.resume==='defence')st.resume='damage';}
   }
   if(t.kind==='finishCast'){
    st.active.splice(st.active.lastIndexOf(t.card),1);
    if(t.card===27){const i=p.discard.indexOf(t.card);if(i>=0)p.discard.splice(i,1);p.hand.push(t.card);}
    else if(t.zone==='book')p.discard.push(t.card);
   }
   if(t.kind==='isolated'){
    startSideDamage(s,1-st.seat,t.amount,t.source,false,{keepPending:true,strangeSpell:true,pantherLocked:!!s.pending?.ultimate});return;
   }
  }
  s.strangeTask=null;s.stage=st.resume;
 }
 function earlyBands(s){const h=s.pending;if(!h.strangeBandsApplied){h.strangeBandsPrior=!!s.players[1-s.active].crimsonBands;h.strangeBandsApplied=true;grantStatus(s.players[1-s.active],'crimsonBands');}}
 return {id,board,upgrades:[],cards,promoId:33,startingSpell:27,spells,isSpell,earlyBands,canPrepare,canDeja,bandsBlocks,begin,options,pump,
  initialize(s,seat){Object.assign(s.players[seat],{spellBook:[27],premonition:0,dejaVu:false});},
  defenceDiceCount(){return 2;},
  resolveDefence({state,defender,counts,grantStatus,updateDamage}){
   state.pending.returnDamage+=Number(!!counts.Mandala)+3*Number(!!counts.Amulet);
   state.pending.prevention=(state.pending.prevention??0)+2*Number(!!counts.Mantle);
   if(counts.Tome)grantStatus(defender,'premonition');updateDamage(state.pending);return 'damage';
  },
  cardChoices(card,{s,seat,one,heroTargets}){
   const h=s.pending,attack=seat===s.active&&h?.attack&&!h.pure&&!h.evaded&&!h.parlayBlocked&&['defence','defenceResponse','damage','locked'].includes(s.stage);
   if(card===29)return attack&&s.players[seat].spellBook.length?one:[];
   if(card===30)return attack?one:[];
   if(card===31)return seat!==s.active&&h?.attack&&!h.ultimate&&blackPanther.incoming(s,seat)?one:[];
   if(card===32)return heroTargets;
   return one;
  },
  applyCard({id:card,s,p,seat,choice,grantStatus}){
   if(card===28){grantStatus(p,'premonition',2);return true;}
   if(card===29){begin(s,seat,[{kind:'cast',zone:'book',left:1}]);return true;}
   if(card===32){grantStatus(s.players[choice.target],'dejaVu');return true;}
   return false;
  },
  cardRollSize(card){return card===33?1:[30,31].includes(card)?2:0;},
  resolveCardRoll({id:card,s,seat,p,counts,hit,updateDamage,grantStatus,drawCards,random}){
   if(card===30){
    hit.grossDamage+=Number(!!counts.Mandala)+2*Number(!!counts.Mantle);
    if(counts.Amulet)grantAttackStatus(s,s.players[1-seat],'crimsonBands');updateDamage(hit);
    if(counts.Tome)begin(s,seat,[{kind:'cast',zone:'book',left:1}]);
   }
   if(card===31){
    blackPanther.prevent(s,seat,Number(!!counts.Mandala)+2*Number(!!counts.Tome)+3*Number(!!counts.Mantle),blackPanther.incoming(s,seat));
    if(counts.Amulet)grantStatus(p,'premonition');
   }
   if(card===33){if(counts.Amulet){grantStatus(p,'dejaVu');grantStatus(p,'premonition',2);}else drawCards(p,1,random,card);}
  },
  handle(previous,action,random){
   const type=action.type;
   if(!['prepareSpell','strangeChoose','strangeSkip','choosePremonition','returnPremonition'].includes(type))return undefined;
   const seat=previous.premonitionTask?.seat??previous.strangeTask?.seat??previous.active;
   if(type==='prepareSpell'&&(!canPrepare(previous,seat)||!previous.players[seat].hand.includes(action.index)||!isSpell(action.index)))return previous;
   if(['strangeChoose','strangeSkip'].includes(type)&&(!previous.strangeTask||previous.stage==='sideDamage'||previous.response))return previous;
   if(type==='choosePremonition'&&previous.premonitionTask?.kind!=='choose')return previous;
   if(type==='returnPremonition'&&previous.premonitionTask?.kind!=='return')return previous;
   const s=structuredClone(previous),p=s.players[seat];s.response=null;
   if(type==='prepareSpell'){
    p.strangePrepareTurn=s.turn;begin(s,seat,[]);prepare(s,action.index,'hand');
   }
   if(type==='strangeChoose'||type==='strangeSkip'){
    const st=s.strangeTask,t=st.queue[0],choices=options(s),choice=choices[action.choice];
    if(type==='strangeSkip'){
     if(!t.optional&&choices.length)return previous;
     st.queue.shift();
    } else {
     if(!choice)return previous;
     if(t.kind==='prepare'||t.kind==='cast'){
      t.left--;if(t.kind==='cast')(t.used??=[]).push(choice.card);
      if(!t.left)st.queue.shift();
      if(t.kind==='prepare')prepare(s,choice.card,t.zone);else cast(s,choice.card,t.zone);
     } else if(t.kind==='order'){
      (t.ordered??=[]).push(choice.card);st.peek.splice(st.peek.indexOf(choice.card),1);
     } else {
      st.queue.shift();
      if(t.kind==='heal')s.players[choice.target].hp=bounded(s.players[choice.target].hp+t.amount,60);
      if(t.kind==='dejaTarget')grantStatus(s.players[choice.target],'dejaVu');
      if(t.kind==='remove'){
       if(choice.status==='timeBomb')blackWidow.removeBomb(s.players[choice.target],choice.bombId);
       else removeMatchStatus(s,choice.target,choice.status,choice.tokenId);
       if(choice.status==='crimsonBands'&&choice.target!==s.active&&s.pending?.strangeBandsApplied)s.pending.crimsonBands=false;
      }
     }
    }
   }
   if(type==='choosePremonition'){
    const amount=action.amount;if(![0,1,3].includes(amount)||p.premonition<amount)return previous;
    const task=s.premonitionTask,priorCP=p.cp,priorHand=p.hand.length;
    p.premonition-=amount;if(!p.resurrected)p.cp=bounded(p.cp+1,15);
    drawCards(p,amount===3?3:amount===1?2:1,random);
    task.drawn=p.hand.slice(priorHand);task.kind=amount&&task.drawn.length?'return':'done';
    s.income={cp:p.cp-priorCP,drawn:task.drawn.length,premonition:amount};
   }
   if(type==='returnPremonition'){
    const task=s.premonitionTask;
    if(!task.drawn.includes(action.index)||!p.hand.includes(action.index)||!['top','bottom'].includes(action.status))return previous;
    p.hand.splice(p.hand.indexOf(action.index),1);
    if(action.status==='top')p.deck.push(action.index);else p.deck.unshift(action.index);
    s.income.drawn--;task.kind='done';
   }
   pump(s);return s;
  }
 };
})();
