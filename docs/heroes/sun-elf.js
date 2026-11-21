const sunElf=(()=>{
  const id=23, power='Sun Power';
  const symbols=['Stave','Stave','Stave','Charge','Charge',power];
  const board={name:'Sun Elf',symbols,defence:'Harness the Light',abilities:[
    {name:'Light Staff',symbols:{Stave:3},damage:c=>c.Stave===5?7:c.Stave+1,sunMatch:4,text:'3–5 Staves · deal 4 / 5 / 7 damage. Four matching numbers increase Sun Dial by 1.'},
    {name:'Ray Absorption',symbols:{Charge:4},sunGain:3,heal:()=>2,chargedGem:true,text:'4 Charges · increase Sun Dial by 3, heal 2 and gain Charged Gem.'},
    {name:'Scorching Staff',symbols:{Stave:1,Charge:3},damage:()=>5,effect:'sunScorch',effectCount:1,text:'Stave + 3 Charges · deal 5 damage and roll 1 die for damage, Sun Dial or Charged Gem.'},
    {name:'Radiant Energy',symbols:{Stave:3,[power]:2},damage:()=>6,sunMarked:true,text:'3 Staves + 2 Sun Power · inflict Sun Marked, then deal 6 damage.'},
    {name:'Ray of Light',straight:4,sunGain:1,damage:()=>7,text:'Small straight · increase Sun Dial by 1 and deal 7 damage.'},
    {name:'Sunbeam',straight:5,sunGain:2,damage:()=>9,text:'Large straight · increase Sun Dial by 2 and deal 9 damage.'},
    {name:'Solar Burst',symbols:{[power]:4},sunGain:2,sunChoice:true,damage:()=>8,text:'4 Sun Power · increase Sun Dial by 2, gain Charged Gem or inflict Sun Marked, then deal 8 damage.'},
    {name:'Solar Flare!',symbols:{[power]:5},sunGain:3,chargedGem:true,sunMarked:true,damage:()=>10,type:'ultimate',text:'5 Sun Power · increase Sun Dial by 3, gain Charged Gem, inflict Sun Marked, then deal 10 Ultimate damage.'}
  ]};
  const upgrades=[
    ['Light Staff II',1,'Light Staff',{damage:c=>c.Stave+2,sunMatch:3,text:'3–5 Staves · deal 5 / 6 / 7 damage. Three matching numbers increase Sun Dial by 1.'}],
    ['Solar Burst II',2,'Solar Burst',{sunChoice:false,chargedGem:true,sunMarked:true,damage:()=>7,type:'undefendable',text:'4 Sun Power · increase Sun Dial by 2, gain Charged Gem, inflict Sun Marked and deal 7 undefendable damage.'},2,
      {name:'Bestow Your Light',symbols:{[power]:3},sunGain:4,sunMarked:true,text:'3 Sun Power · increase Sun Dial by 4 and inflict Sun Marked.'}],
    ['Scorching Staff II',2,'Scorching Staff',{effectCount:2,sunScorchUpgrade:true,text:'Stave + 3 Charges · deal 5 damage and roll 2 dice for damage, Sun Dial or Charged Gem.'}],
    ['Radiant Energy II',2,'Radiant Energy',{symbols:{Stave:2,[power]:2},text:'2 Staves + 2 Sun Power · inflict Sun Marked, then deal 6 damage.'},2,
      {name:'Praise the Sun',symbols:{Stave:3,[power]:1},chargedGem:true,damage:()=>5,text:'3 Staves + Sun Power · gain Charged Gem and deal 5 damage.'}],
    ['Sunbeam II',2,'Sunbeam',{sunGain:3,text:'Large straight · increase Sun Dial by 3 and deal 9 damage.'},2,
      {name:'Soaking Up the Sun',symbols:{Charge:1,[power]:3},chargedGem:true,damage:()=>9,text:'Charge + 3 Sun Power · gain Charged Gem and deal 9 damage.'}],
    ['Harness the Light II',3,'defence',{}]
  ];
  const cards=[
    ['First Light!',2,'main'],['Clouds Parting!',1,'main'],['It Gives Life!',1,'main'],['Solstice!',2,'main'],
    ['The Glorious Sun!',0,'main'],['The Sun’s Blessing!',1,'main'],['Radiant Exchange!',2,'roll'],['Here Comes the Sun!',1,'instant'],
    ['Sun Shield!',0,'instant'],['Shine Upon Us!',0,'main']
  ];
  function setDial(p,value){
    p.sunDial=bounded(value,5);
    if(p.sunDial===5)p.sunDawn=true;
    if(p.sunDial===0)p.sunDawn=false;
  }
  function heal(p,amount){p.hp=bounded(p.hp+amount,60);}
  function increase(p,amount){
    const value=p.sunDial+amount;
    heal(p,Math.max(0,value-5));
    setDial(p,value);
  }
  function canDawn(s,seat){
    const hit=s.pending, p=s.players[seat];
    return !s.retry&&!s.forgeTask&&seat===s.active&&p.sunDawn&&p.sunDial>0&&hit?.attack&&!hit.pure&&!hit.parlayBlocked&&!hit.dawnUsed&&
      ['sunMarked','defence','defenceResponse','damage','locked','guardOffer','prey','forgeArmor','forgeMasterwork'].includes(s.stage);
  }
  function canGem(s,seat){
    return seat===s.active&&s.players[seat].chargedGem&&isMain(s)&&!s.cardRoll&&!s.mainAction&&!s.mainChoice&&!s.sunGemRoll;
  }
  function shieldChoices(s,seat){
    if(s.stage==='sideDamage'&&s.sideDamage.seat===seat&&sideIncoming(s.sideDamage)>0)return [{kind:'side',label:'Prevent 3 damage'}];
    if(s.stage==='upkeep'&&s.active===seat&&upkeepIncoming(s)>0)return [{kind:'upkeep',label:'Prevent 3 upkeep damage'}];
    if(!['defence','defenceResponse','damage','locked'].includes(s.stage))return [];
    return (seat===s.active?returnDamageFor(s):incomingDamage(s))>0?[{kind:seat===s.active?'return':'attack',label:'Prevent 3 damage'}]:[];
  }
  return {
    turnStartUpkeep: 'every-turn',
    leafletPositives: {chargedGem: true},
   id,board,upgrades,cards,promoId:34,initialize(s,seat){Object.assign(s.players[seat],{sunDial:0,sunDawn:false});},
    heal,increase,setDial,canDawn,canGem,
    complexity: 3,
    defenceEffect: p => `Heal 1 per Stave. Advance the Sun Dial ${p.upgrades?.defence ? 'once on any Charge and once per Sun Power. Stave + Charge + Sun Power grants a Charged Gem' : 'once on 2 Charges and once on any Sun Power'}. Dial overflow heals 1 per excess step.`,
    defenceDiceCount(){return 3;},
    resolveDefence({defender,counts,grantStatus}){
      heal(defender,counts.Stave??0);
      const charge=counts.Charge??0, sun=counts[power]??0, upgraded=!!defender.upgrades?.defence;
      increase(defender,Number(charge>=(upgraded?1:2))+(upgraded?sun:Number(sun>0)));
      if(upgraded&&counts.Stave&&charge&&sun)grantStatus(defender,'chargedGem');
      return 'damage';
    },
    cardChoices(card,{s,seat,one,pos,d,heroTargets}){
      const p=s.players[seat];
      if(card===25)return p.sunDial===0?one:[];
      if(card===27)return p.sunDial?heroTargets:[];
      if(card===28)return [{damage:true,label:'Deal 2 damage'},{damage:false,label:'Heal 2'}];
      if(card===29)return one;
      if(card===31)return p.sunDial?pos.filter(({i,value})=>dieOwner(d,i)===seat&&value!==6).map(({i,label})=>({i,v:6,label:`${label} → 6`})):[];
      if(card===32)return !p.sunDawn?one:[];
      if(card===33)return p.chargedGem?shieldChoices(s,seat):[];
      if(card===34)return heroTargets;
      return one;
    },
    applyCard({id:card,s,seat,p,opponent,choice,grantStatus,updateDamage,startSideDamage}){
      switch(card){
        case 25:increase(p,2);grantStatus(opponent,'sunMarked');break;
        case 27:heal(s.players[choice.target],p.sunDial);setDial(p,0);break;
        case 28:if(choice.damage)startSideDamage(s,1-seat,2,'Solstice!');else heal(p,2);break;
        case 29:p.sunDawn=!p.sunDawn;setDial(p,p.sunDial);break;
        case 31:setDial(p,0);return false;
        case 32:increase(p,2);break;
        case 33:
          removeStatus(p,'chargedGem');
          if(choice.kind==='side')s.sideDamage.prevention=(s.sideDamage.prevention??0)+3;
          else if(choice.kind==='upkeep')s.upkeepPrevention=(s.upkeepPrevention??0)+3;
          else {
            const key=choice.kind==='return'?'returnPrevention':'prevention';
            s.pending[key]=(s.pending[key]??0)+3;
            updateDamage(s.pending);
          }
          break;
        default:return false;
      }
      return true;
    },
    cardRollSize(card){return [26,30,34].includes(card)?1:0;},
    resolveCardRoll({id:card,dice,p,counts,s,target,seat,grantStatus,drawCards,random}){
      if(card===26)increase(p,Math.ceil(dice[0]/2));
      if(card===30){
        if(counts.Stave)grantStatus(p,'chargedGem');
        if(counts.Charge)drawCards(p,2,random,card);
        if(counts[power])setDial(p,5);
      }
      if(card===34){
        if(counts[power]){increase(p,3);grantStatus(s.players[target??1-seat],'sunMarked');}
        else drawCards(p,1,random,card);
      }
    }
  };
})();
