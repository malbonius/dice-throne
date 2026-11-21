const duelist=(()=>{
  const id=21;
  const symbols=['Blade','Blade','Blade','Boot','Boot','Pierce'];
  const board={name:'Duelist',symbols,defence:'Retreat',abilities:[
    {name:'Blade Flurry',symbols:{Blade:3},damage:c=>c.Blade+1,stepMatch:4,text:'3–5 Blades · deal 4 / 5 / 6 damage. Four matching numbers let you take 1 Step.'},
    {name:'Feint Attack',symbols:{Blade:2,Pierce:2},guardGain:1,steps:1,type:'undefendable',damage:()=>2,text:'2 Blades + 2 Pierce · gain Guard Break, take up to 1 Step and deal 2 undefendable damage.'},
    {name:'Balestra',symbols:{Blade:2,Boot:3},steps:2,damage:()=>6,text:'2 Blades + 3 Boots · take up to 2 Steps and deal 6 damage.'},
    {name:'Strike',straight:4,strike:true,damage:c=>c.largeStraight?10:7,text:'Small / large straight · deal 7 / 10 damage. Large also lets you take 1 Step.'},
    {name:'En Garde',symbols:{Boot:3,Pierce:1},effect:'duelEnGarde',effectCount:4,damage:()=>8,text:'3 Boots + Pierce · deal 8 damage and roll four dice. On Pierce, inflict Disarm.'},
    {name:'Bladestorm',symbols:{Pierce:4},guardGain:1,disarm:true,steps:2,damage:()=>8,text:'4 Pierce · gain Guard Break, inflict Disarm, take up to 2 Steps and deal 8 damage.'},
    {name:'Master of the Blade!',symbols:{Pierce:5},guardGain:2,disarm:true,steps:4,type:'ultimate',damage:()=>11,text:'5 Pierce · gain 2 Guard Break, inflict Disarm, take up to 4 Steps and deal 11 Ultimate damage.'}
  ]};
  const upgrades=[
    ['Blade Flurry II',2,'Blade Flurry',{damage:c=>c.Blade+2,stepMatch:3,text:'3–5 Blades · deal 5 / 6 / 7 damage. Three matching numbers let you take 1 Step.'}],
    ['Feint Attack II',2,'Feint Attack',{guardGain:2,damage:()=>3,text:'2 Blades + 2 Pierce · gain 2 Guard Break, take up to 1 Step and deal 3 undefendable damage.'}],
    ['Bladestorm II',2,'Bladestorm',{guardGain:2,damage:()=>9,text:'4 Pierce · gain 2 Guard Break, inflict Disarm, take up to 2 Steps and deal 9 damage.'},2,
      {name:'Bladewind',symbols:{Pierce:3},collateral:3,text:'3 Pierce · deal 3 collateral damage.'}],
    ['Balestra II',2,'Balestra',{damage:()=>8,text:'2 Blades + 3 Boots · take up to 2 Steps and deal 8 damage.'},2,
      {name:'Fancy Feet',symbols:{Boot:3},guardGain:1,steps:3,text:'3 Boots · gain Guard Break and take up to 3 Steps.'}],
    ['Retreat II',2,'defence',{}]
  ];
  const cards=[
    ['Sashay!',2,'main'],['Confident Footing!',1,'main'],['Courageous Advance!',2,'main'],['All in the Wrists!',1,'main'],
    ['Blade Barrage!',1,'roll'],['Burst Forward!',1,'roll'],['Pick It Up!',0,'roll'],['Anticipate!',1,'roll'],
    ['Quick Footwork!',1,'roll'],['True Swordsman!',0,'main']
  ];
  const positions=['Prevent 3 damage','Draw 1 card','Neutral','+1 attack damage','+3 attack damage'];
  function move(p,steps){p.footwork=Math.min(2,Math.max(-2,p.footwork+steps));}
  function steps(p,max,min=0,dir=0){
    return Array.from({length:2*max+1},(_,i)=>i-max)
      .filter(n=>Math.abs(n)>=min&&(!dir||!n||Math.sign(n)===dir)&&p.footwork+n>=-2&&p.footwork+n<=2)
      .map(n=>({steps:n,label:n===0?'Stay in place':`Take ${Math.abs(n)} ${Math.abs(n)===1?'Step':'Steps'} ${n>0?'forward':'backward'}`}));
  }
  function offerSteps(s,seat,max){
    s.duelMovement={seat,max,resume:s.stage};
    s.stage='duelMove';
  }
  function bonus(s,seat){
    const hit=s.pending,p=s.players[seat];
    if(p.footwork===undefined||p.footworkTurn===s.turn||!hit?.attack||hit.pure||hit.parlayBlocked)return '';
    if(seat===s.active)return p.footwork>0?'attack':'';
    if(hit.ultimate||hit.undefendable)return '';
    return p.footwork===-1?'draw':p.footwork===-2?'prevent':'';
  }
  return {
    turnStartUpkeep: 'every-turn',
    leafletPositives: {guardBreak: true},
   id,board,upgrades,cards,promoId:33,positions,move,steps,offerSteps,bonus,
    initialize(s,seat){s.players[seat].footwork=0;},
    complexity: 3,
    defenceEffect: p => `Return 1 damage ${p.upgrades?.defence ? 'per Blade' : 'per pair of Blades'}. Move back one position per Boot or Pierce.`,
    defenceDiceCount(){return 4;},
    resolveDefence({state,defender,counts}){
      const blades=counts.Blade??0;
      state.pending.returnDamage+=defender.upgrades?.defence?blades:Math.floor(blades/2);
      move(defender,-((counts.Boot??0)+(counts.Pierce??0)));
      return 'damage';
    },
    cardChoices(card,{s,seat,one,pos,d}){
      const p=s.players[seat],opponent=s.players[1-seat],hit=s.pending;
      if(card===24)return [{steps:1,label:'Step forward and deal 2 damage'},{steps:-1,label:'Step backward and heal 2'}].filter(x=>Math.abs(p.footwork+x.steps)<=2);
      if(card===25)return p.footwork===0?one:[];
      if(card===26)return steps(p,2,0,1);
      if(card===27)return [{apply:true,label:'Inflict Disarm'},{apply:false,label:'Choose no opponent'}];
      const attack=seat===s.active&&hit?.attack&&!hit.pure&&!hit.evaded&&!hit.parlayBlocked&&['defence','defenceResponse','damage','locked'].includes(s.stage);
      if(card===28)return attack?one:[];
      if(card===29)return attack&&p.footwork<2?one:[];
      if(card===30)return attack&&opponent.disarm?one:[];
      if(card===31)return seat!==s.active&&hit?.attack&&!hit.ultimate&&!hit.stun&&!hit.parlayBlocked&&['defence','defenceResponse','damage'].includes(s.stage)?steps(p,2,0,-1):[];
      if(card===32)return pos.filter(({i})=>dieOwner(d,i)===seat).flatMap(({i,value,label})=>[4,5].filter(v=>v!==value).map(v=>({i,v,label:`${label} → ${v}`})));
      return one;
    },
    applyCard({id:card,s,seat,p,opponent,choice,grantStatus,updateDamage,startSideDamage}){
      switch(card){
        case 24:
          move(p,choice.steps);
          if(choice.steps>0)startSideDamage(s,1-seat,2,'Sashay!');
          else p.hp=Math.min(60,p.hp+2);
          break;
        case 25:grantStatus(p,'guardBreak',2);break;
        case 26:case 31:move(p,choice.steps);break;
        case 27:if(choice.apply)grantStatus(opponent,'disarm');break;
        case 29:move(p,1);break;
        case 30:
          removeStatus(opponent,'disarm');
          s.pending.grossDamage+=3;
          updateDamage(s.pending);
          break;
        default:return false;
      }
      return true;
    },
    cardRollSize(card){return card===28?5:card===33?1:0;},
    resolveCardRoll({id:card,s,seat,p,hit,counts,updateDamage,grantStatus,drawCards,random}){
      if(card===28){
        hit.grossDamage+=counts.Blade??0;
        updateDamage(hit);
        if(counts.Boot>=2)offerSteps(s,seat,1);
      }
      if(card===33){
        if(counts.Pierce){grantStatus(p,'guardBreak',2);offerSteps(s,seat,4);}
        else drawCards(p,1,random,card);
      }
    }
  };
})();
