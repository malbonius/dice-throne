const forgemaster=(()=>{
  const id=22;
  const symbols=['Pick','Pick','Pick','Forge','Forge','Anvil'];
  const board={name:'Forgemaster',symbols,defence:'Masterwork',abilities:[
    {name:'Pick Axe',symbols:{Pick:3},damage:c=>c.Pick+2,forgeCpMatch:4,text:'3–5 Picks · deal 5 / 6 / 7 damage. Four matching numbers gain 1 CP.'},
    {name:'Furnace',symbols:{Forge:4},damage:()=>5,effect:'forgeFurnace',effectCount:1,text:'4 Forges · deal 5 damage plus the value of one die.'},
    {name:'Armored Up',straight:4,damage:c=>c.largeStraight?10:7,armorBonus:true,text:'Small / large straight · deal 7 / 10 damage. Add 2 if both armour pieces are equipped.'},
    {name:'Smelting Time',symbols:{Anvil:4},damage:()=>9,draw:1,type:'undefendable',text:'4 Anvils · draw 1 and deal 9 undefendable damage.'},
    {name:'A Good Haul',symbols:{Pick:1,Forge:1,Anvil:2},damage:()=>8,mineAll:true,text:'Pick + Forge + 2 Anvils · Mine, with the option to reveal all Ore, then deal 8 damage.'},
    {name:'Final Touches!',symbols:{Anvil:5},damage:()=>14,oreSearch:true,type:'ultimate',text:'5 Anvils · search the deck for an Ore to put on the Forge, shuffle and deal 14 Ultimate damage.'}
  ]};
  const materials=['gold','diamond','ultimanium'];
  const oreType=card=>card>=19&&card<=34?materials[card<=27?0:card<=33?1:2]:null;
  const materialName=material=>material[0].toUpperCase()+material.slice(1);
  const armorName=(slot,tier)=>`${materialName(materials[tier-1])} ${slot==='helm'?'Helmet':'Shield'}`;
  const cards=Array.from({length:16},(_,i)=>[`${materialName(oreType(19+i))} Ore`,0,'ore']).concat([['Mine Time!',0,'main']]);
  function beginMine(s,seat,all=false){
    const deck=s.players[seat].deck;
    s.forgeTask={seat,all,kind:'mine',resume:s.stage,cards:deck.slice(-3).reverse()};
    s.stage='forgeMine';
  }
  function craftOptions(p){
    return ['helm','shield'].flatMap(slot=>{
      const tier=p.armor[slot]+1, material=materials[tier-1], count=tier===3?1:2;
      const ids=p.forgeOre.filter(card=>oreType(card)===material).slice(0,count);
      return material&&ids.length===count?[{kind:'craft',slot,tier,ids,label:`Craft ${armorName(slot,tier)}`}]:[];
    });
  }
  function choices(s,seat){
    const p=s.players[seat];
    if(!p.forgeOre||p.resurrected||s.stage==='finished'||['nyraDamage','forgeSearch'].includes(s.stage)||s.forgeTask||s.retry||
       s.response&&s.response.seat!==seat||seat!==s.active&&attackLocked(s))return [];
    const options=[];
    const ctx=rollContext(s), dice=diceOwnedBy(ctx,seat,s);
    if(p.cp>=3&&p.minesDrawTurn!==s.turn&&(p.deck.length||p.discard.length)){
      options.push({kind:'draw',label:'Spend 3 CP · draw 1 card'});
    }
    if(seat===s.active&&isMain(s)&&!s.cardRoll&&!s.mainAction&&!s.mainChoice){
      for(const card of materials.map(material=>p.hand.find(id=>oreType(id)===material)).filter(Boolean))options.push({kind:'deposit',card,label:`Put ${materialName(oreType(card))} Ore on the Forge`});
      options.push(...craftOptions(p));
    }
    for(const card of materials.map(material=>p.forgeOre.find(card=>oreType(card)===material)).filter(Boolean)){
      const ore=oreType(card), label=`Scrap ${materialName(ore)} Ore`;
      if(ore==='gold')options.push({kind:'heal',card,label:label+' · heal 1'});
      if(ore!=='ultimanium')options.push({kind:'cp',card,label:label+' · gain 1 CP'});
      if(ore==='ultimanium')options.push({kind:'oreDraw',card,label:label+' · draw 2 cards'});
      if(ore!=='gold'&&!attackLocked(s))dice.forEach((value,index)=>{
        if(ore==='diamond'||value!==6)options.push({kind:ore==='diamond'?'reroll':'six',card,index,label:`${label} · ${ore==='diamond'?'reroll':'set to 6'} die ${index+1} (${value})`});
      });
    }
    return options;
  }
  function eligibleArmor(s){
    const hit=s.pending, {armor}=s.players[1-s.active];
    if(!armor||!hit?.attack||hit.ultimate||hit.parlayBlocked||hit.armorResolved)return [];
    const normal=!hit.undefendable&&!hit.pure;
    return [normal&&armor.helm?'helm':null,(normal&&armor.shield||armor.shield===3)?'shield':null].filter(Boolean);
  }
  function selections(slots,both,optional=true){
    return [...(optional?[{slots:[],label:'Skip'}]:[]),...slots.map(slot=>({slots:[slot],label:slot==='helm'?'Helmet':'Shield'})),
      ...(both&&slots.length===2?[{slots,label:'Helmet and shield'}]:[])];
  }
  return {
    turnStartUpkeep: 'every-turn',
    id,board,upgrades:[],cards,promoId:35,oreType,materialName,armorName,beginMine,choices,eligibleArmor,selections,
    initialize(s,seat){Object.assign(s.players[seat],{forgeOre:[],armor:{helm:0,shield:0}});},
    complexity: 4,
    defenceEffect: () => 'Pick lets you mine Ore. Forge lets you double one equipped armour effect. Anvil lets you double up to two.',
    defenceDiceCount(){return 1;},
    resolveDefence({state,seat,defender,counts}){
      state.stage='damage';
      if(counts.Pick)beginMine(state,seat);
      if((counts.Forge||counts.Anvil)&&Object.values(defender.armor).some(Boolean)){
        state.pending.armorDoubleLimit=counts.Anvil?2:1;
        state.stage='forgeMasterwork';
      }
      return state.stage;
    },
    cardRollSize(card){return card===35?1:0;},
    resolveCardRoll({id:card,seat,p,s,counts,bounded,drawCards,random}){
      if(card!==35)return;
      if(counts.Anvil){beginMine(s,seat);gainCP(p,3);}
      else drawCards(p,1,random,card);
    }
  };
})();
