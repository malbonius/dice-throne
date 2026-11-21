const druid=(()=>{
  const id=20;
  const symbols=['Claw','Claw','Claw','Paw','Paw','Nature'];
  const maul={effect:'druidMaul',effectCount:2};
  const board={name:'Druid',symbols,defence:'Thick Hide',abilities:[
    {name:'Ferocity',symbols:{Claw:3},damage:c=>c.Claw+1,woundMatch:4,text:'3–5 Claws · deal 4 / 5 / 6 damage. Four matching numbers inflict Wound.'},
    {name:'Nature’s Cure',symbols:{Claw:2,Nature:2},damage:()=>5,regenerate:1,text:'2 Claws + 2 Nature · gain Regenerate and deal 5 damage.'},
    {name:'Wild Realignment',symbols:{Claw:1,Paw:2,Nature:1},cpGain:1,shifts:2,wildDraw:true,text:'Claw + 2 Paws + Nature · gain 1 CP and 2 Shape Shift. Draw 1 in Druid Form.'},
    {name:'Maul',symbols:{Paw:4},...maul,text:'4 Paws · roll two dice and deal their total in damage. Bear Form can reroll one.'},
    {name:'Forest’s Call',straight:4,damage:()=>6,shifts:1,text:'Small straight · gain Shape Shift and deal 6 damage.'},
    {name:'Forest’s Answer',straight:5,damage:()=>7,shifts:1,effect:'druidForest',effectCount:1,text:'Large straight · gain Shape Shift and deal 7 damage. Roll for damage, Shape Shift or Regenerate.'},
    {name:'Protect the Forest',symbols:{Nature:4},damage:()=>6,type:'undefendable',shifts:1,regenerate:1,text:'4 Nature · gain Regenerate and Shape Shift, then deal 6 undefendable damage.'},
    {name:'Wrath of Nature!',symbols:{Nature:5},damage:()=>12,type:'ultimate',shifts:2,regenerate:1,text:'5 Nature · gain Regenerate and 2 Shape Shift, then deal 12 Ultimate damage.'}
  ]};
  const upgrades=[
    ['Ferocity II',2,'Ferocity',{damage:c=>c.Claw+2,woundMatch:3,text:'3–5 Claws · deal 5 / 6 / 7 damage. Three matching numbers inflict Wound.'}],
    ['Maul II',1,'Maul',{},2,{name:'Savage Maul',symbols:{Paw:5},...maul,shifts:1,text:'5 Paws · gain Shape Shift, then activate Maul II.'}],
    ['Protect the Forest II',2,'Protect the Forest',{damage:()=>8,text:'4 Nature · gain Regenerate and Shape Shift, then deal 8 undefendable damage.'},2,
      {name:'Rainfall',symbols:{Nature:3},rainfall:true,text:'3 Nature · a chosen hero gains 1 CP and 2 Regenerate.'}]
  ];
  const cards=[
    ['Hibernate!',2,'main'],['Ready to Pounce!',2,'main'],['Nature’s Rest!',2,'main'],['Fey Lure!',1,'main'],
    ['Surprise Bite!',2,'roll'],['Lethal Swipe!',2,'roll'],['Shrug Off!',0,'roll'],['Don’t Poke the Bear!',0,'roll'],
    ['Strength of the Woods!',1,'main'],['Nature’s Cycle!',0,'main'],['Quick Morph!',2,'instant'],['One with Nature!',0,'main']
  ];
  const formName=form=>({druid:'Druid',bear:'Bear',cat:'Cat'})[form];
  const regenTotal=p=>(p.regenerate??0)+(p.regenerate1??0);
  const heal=(p,amount)=>{p.hp=Math.min(60,p.hp+amount);};
  function regenerate(p,amount=1){if(psylocke.blockDirect(p,'regenerate',amount))return;
    for(let i=0;i<amount;i++){
      if(regenTotal(p)<2)p.regenerate=(p.regenerate??0)+1;
      else if(p.regenerate1){p.regenerate1--;p.regenerate=(p.regenerate??0)+1;}
    }
  }
  function gainShifts(s,seat,amount){if(psylocke.block(s,s.players[seat],'shapeShift',amount))return;
    if(!amount)return;
    const p=s.players[seat];
    if(p.shapeShift+amount>2&&p.shapeShift)s.shapeOverflow={seat,amount};
    else p.shapeShift=Math.min(2,p.shapeShift+amount);
  }
  function shiftChoices(s,seat){
    const p=s.players[seat];
    if(!p.shapeShift||s.retry||s.stage==='finished'||s.stage==='nyraDamage'||seat!==s.active&&attackLocked(s)||
       s.shapeOverflow&&s.shapeOverflow.seat!==seat||s.response&&s.response.seat!==seat)return [];
    if(seat!==s.active&&s.pending&&!['offence','announce','defenceResponse','preventStatus','damage','main1','main','discard'].includes(s.stage))return [];
    return ['druid','bear','cat'].filter(form=>p.druidForm!==form);
  }
  return {
    leafletPositives: {regenerate: true},
   id,board,upgrades,cards,promoId:33,formName,regenTotal,heal,regenerate,gainShifts,shiftChoices,
    initialize(s,seat){Object.assign(s.players[seat],{druidForm:'druid',shapeShift:0});},
    complexity: 4,
    defenceDiceCount(p){return p.druidForm==='bear'?4:2;},
    resolveDefence({state,defender,counts,updateDamage}){
      const hit=state.pending;
      hit.returnDamage+=counts.Claw??0;
      if(defender.druidForm==='bear'){
        hit.prevention=(hit.prevention??0)+(counts.Paw??0)+(counts.Nature??0);
        updateDamage(hit);
      }
      return 'damage';
    },
    cardChoices(card,{s,seat,one,heroTargets}){
      const p=s.players[seat],hit=s.pending;
      if(card===23||card===25)return heroTargets;
      const attack=seat===s.active&&hit?.attack&&!hit.pure&&!hit.evaded&&!hit.parlayBlocked&&['defence','defenceResponse','damage','locked'].includes(s.stage);
      if(card===26)return attack&&p.druidForm==='cat'&&!hit.undefendable&&!hit.ultimate&&!s.defenceDice.length?one:[];
      if(card===27)return attack&&p.druidForm==='cat'?one:[];
      if(card===28||card===29)return seat!==s.active&&p.druidForm==='bear'&&hit?.attack&&!hit.ultimate&&!hit.stun&&!hit.parlayBlocked&&['defence','defenceResponse','damage'].includes(s.stage)?one:[];
      if(card===30)return p.druidForm==='druid'?one:[];
      if(card===31)return heroTargets.filter(({target})=>s.players[target].regenerate1);
      return one;
    },
    applyCard({id:card,s,seat,p,choice,grantStatus,drawCards,random,updateDamage}){
      switch(card){
        case 22:p.druidForm='bear';regenerate(p);break;
        case 23:p.druidForm='cat';grantStatus(s.players[choice.target],'wound');break;
        case 24:p.druidForm='druid';drawCards(p,1,random,card);break;
        case 25:regenerate(s.players[choice.target]);break;
        case 26:
          s.pending.undefendable=true;
          if(s.stage==='defence')s.stage='damage';
          break;
        case 28:
          s.pending.prevention=(s.pending.prevention??0)+2;
          updateDamage(s.pending);break;
        case 29:s.pending.returnDamage+=2;break;
        case 31:s.players[choice.target].regenerate1--;regenerate(s.players[choice.target]);break;
        case 32:gainShifts(s,seat,1);break;
        default:return false;
      }
      return true;
    },
    cardRollSize(card){return ({27:5,30:1,33:1})[card]??0;},
    resolveCardRoll({id:card,s,seat,p,hit,counts,opponent,updateDamage,grantAttackStatus,startSideDamage,drawCards,random}){
      if(card===27){
        hit.grossDamage+=counts.Claw??0;
        updateDamage(hit);
        if(counts.Paw>=2)grantAttackStatus(s,opponent,'wound');
      }
      if(card===30){
        if(counts.Claw)startSideDamage(s,1-seat,2,'Strength of the Woods!');
        if(counts.Paw)gainShifts(s,seat,1);
        if(counts.Nature)heal(p,3);
      }
      if(card===33){
        if(counts.Nature){regenerate(p);gainShifts(s,seat,2);}
        else drawCards(p,1,random,card);
      }
    }
  };
})();
