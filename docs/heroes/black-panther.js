const blackPanther=(()=>{
  const id=24;
  const board={name:'Black Panther',symbols:['Slash','Slash','Slash','Vibranium','Vibranium','Panther'],defence:'Bashenga’s Honor',abilities:[
    {name:'Vibranium Claws',symbols:{Slash:3},damage:c=>c.Slash+1,text:'3–5 Slashes · deal 4 / 5 / 6 damage.'},
    {name:'Stealth Strike',symbols:{Slash:2,Panther:2},damage:()=>3,type:'undefendable',text:'2 Slashes + 2 Panthers · deal 3 undefendable damage.'},
    {name:'Heart-Shaped Herb',symbols:{Vibranium:3},suit:true,kinetic:3,text:'3 Vibranium · gain Vibranium Suit and 3 Kinetic Energy.'},
    {name:'Meteoric Punch',straight:4,kinetic:1,damage:()=>6,text:'Small straight · gain 1 Kinetic Energy and deal 6 damage.'},
    {name:'Meteoric Punch (large straight)',upgradeSlot:'Meteoric Punch',variant:'large',straight:5,kinetic:2,damage:()=>8,text:'Large straight · gain 2 Kinetic Energy and deal 8 damage.'},
    {name:'Triple Threat',symbols:{Slash:2,Vibranium:2,Panther:1},damage:()=>6,effect:'pantherTriple',effectCount:2,text:'2 Slashes + 2 Vibranium + Panther · deal 6 damage and roll two dice for damage, Energy or a card.'},
    {name:'Ancestral Power',symbols:{Panther:4},suit:true,kinetic:2,damage:()=>4,type:'undefendable',text:'4 Panthers · gain Vibranium Suit and 2 Kinetic Energy, then deal 4 undefendable damage.'},
    {name:'Wakanda Forever!',symbols:{Panther:5},suit:true,kinetic:3,damage:()=>11,type:'ultimate',text:'5 Panthers · gain Vibranium Suit and 3 Kinetic Energy, then deal 11 Ultimate damage.'}
  ]};
  const upgrades=[
    ['Vibranium Claws II',1,'Vibranium Claws',{damage:c=>c.Slash+2,kineticMatch:3,text:'3–5 Slashes · deal 5 / 6 / 7 damage. Three matching numbers gain Kinetic Energy.'}],
    ['Stealth Strike II',1,'Stealth Strike',{damage:()=>4,text:'2 Slashes + 2 Panthers · deal 4 undefendable damage.'}],
    ['Heart-Shaped Herb II',2,'Heart-Shaped Herb',{kineticFromVibranium:true,text:'3 Vibranium · gain Kinetic Energy equal to Vibranium rolled and gain Vibranium Suit.'}],
    ['Meteoric Punch II',2,'Meteoric Punch',{damage:()=>7,text:'Small straight · gain 1 Kinetic Energy and deal 7 damage.',variants:{large:{damage:()=>9,label:'Meteoric Punch II (large straight)',text:'Large straight · gain 2 Kinetic Energy and deal 9 damage.'}}}],
    ['Ancestral Power II',2,'Ancestral Power',{damage:()=>6,text:'4 Panthers · gain Vibranium Suit and 2 Kinetic Energy, then deal 6 undefendable damage.'},2,
      {name:'Panther Reflexes',symbols:{Panther:3},kinetic:4,text:'3 Panthers · gain 4 Kinetic Energy.'}],
    ['Triple Threat II',2,'Triple Threat',{effectCount:3,text:'2 Slashes + 2 Vibranium + Panther · deal 6 damage and roll three dice for damage, Energy or a card.'}],
    ['Bashenga’s Honor II',2,'defence',{}],
    ['Energy Absorption II',0,'Energy Absorption',{}]
  ];
  const cards=[
    ['Stop at Nothing!',0,'main'],['Energize!',1,'main'],['Warrior of Wakanda!',2,'roll'],['Strength of Will!',1,'roll'],
    ['Yibambe!',0,'instant'],['Vibin’!',1,'instant'],['Bast’s Blessing!',0,'main']
  ];
  function gain(p,n){if(psylocke.blockDirect(p,'kineticEnergy',n))return;
    const cap=p.upgrades?.['Energy Absorption']?7:8;
    p.kineticEnergy=Math.min(cap,(p.kineticEnergy??0)+n);
    if(p.kineticEnergy>=cap){p.kineticEnergy=0;p.kineticBursts=(p.kineticBursts??0)+1;}
  }
  function incoming(s,seat){
    if(seat!==s.active&&attackLocked(s))return null;
    if(s.stage==='upkeep'&&seat===s.active&&upkeepIncoming(s)>0)return 'upkeep';
    if(s.stage==='sideDamage'&&s.sideDamage.seat===seat&&sideIncoming(s.sideDamage)>0)return 'side';
    if(['defence','defenceResponse','damage','locked'].includes(s.stage)){
      if(seat===s.active&&returnDamageFor(s)>0)return 'return';
      if(seat!==s.active&&incomingDamage(s)>0)return 'attack';
    }
    return null;
  }
  function prevent(s,seat,amount,kind){
    if(kind==='side')s.sideDamage.prevention=(s.sideDamage.prevention??0)+amount;
    else if(kind==='upkeep')s.upkeepPrevention=(s.upkeepPrevention??0)+amount;
    else {
      const key=kind==='return'?'returnPrevention':'prevention';
      s.pending[key]=(s.pending[key]??0)+amount;
      updateDamage(s.pending);
    }
  }
  return {
    leafletPositives: {kineticEnergy: true},
   id,board,upgrades,cards,promoId:33,gain,incoming,prevent,
    initialize(s,seat){s.players[seat].kineticEnergy=0;},
    complexity: 2,
    defenceEffect: () => 'Return 1 damage per Slash.',
    defenceDiceCount(p){return p.upgrades?.defence?4:3;},
    resolveDefence({state,counts}){state.pending.returnDamage+=counts.Slash??0;return 'damage';},
    cardChoices(card,{s,seat,one}){
      const p=s.players[seat],hit=s.pending;
      if(card===27||card===31)return p.kineticEnergy>=2?one:[];
      if(card===32)return p.vibraniumSuit&&incoming(s,seat)?one:[];
      const attack=seat===s.active&&hit?.attack&&!hit.pure&&!hit.evaded&&!hit.parlayBlocked&&['defence','defenceResponse','damage','locked'].includes(s.stage);
      if(card===29)return attack&&!hit.undefendable&&!hit.ultimate&&!s.defenceDice.length?one:[];
      if(card===30)return attack?one:[];
      return one;
    },
    applyCard({id:card,s,p,seat,grantStatus,bounded}){
      switch(card){
        case 27:p.kineticEnergy-=2;gainCP(p,3);break;
        case 29:
          s.pending.undefendable=true;
          if(s.stage==='defence')s.stage='damage';
          break;
        case 31:p.kineticEnergy-=2;grantStatus(p,'vibraniumSuit');break;
        case 32:removeStatus(p,'vibraniumSuit');prevent(s,seat,6,incoming(s,seat));break;
        default:return false;
      }
      return true;
    },
    cardRollSize(card){return card===30?5:[28,33].includes(card)?1:0;},
    resolveCardRoll({id:card,dice,counts,p,hit,updateDamage,drawCards,random}){
      if(card===28)gain(p,Math.ceil(dice[0]/2));
      if(card===30){hit.grossDamage+=counts.Slash??0;updateDamage(hit);}
      if(card===33){
        if(counts.Panther)gain(p,4);
        else drawCards(p,1,random,card);
      }
    }
  };
})();
