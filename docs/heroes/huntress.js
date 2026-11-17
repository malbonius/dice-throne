const huntress = (() => {
  const id=15;
  const board={name:'Huntress',symbols:['Spear','Spear','Claw','Claw','Bonded Soul','Saber Tooth'],defence:'Maternal Bond',abilities:[
    {name:'Animalistic',symbols:{Spear:3},damage:c=>c.Spear,text:'3–5 Spears · 3 / 4 / 5 damage'},
    {name:'Savage',symbols:{Claw:3,'Saber Tooth':1},damage:()=>4,effect:'savage',effectCount:1,text:'3 Claws + Saber Tooth · 4 damage. Roll for extra damage, Nyra’s Bond or Bleed.'},
    {name:'Resuscitate',symbols:{'Bonded Soul':2},nyraBond:true,nyraHeal:()=>3,text:'2 Bonded Souls · gain Nyra’s Bond and heal Nyra 3'},
    {name:'Feral Instincts',symbols:{Spear:3,'Bonded Soul':1},nyraBond:true,damage:()=>2,type:'undefendable',text:'3 Spears + Bonded Soul · gain Nyra’s Bond and deal 2 undefendable damage'},
    {name:'Predatory Advance',symbols:{Spear:2,Claw:2,'Bonded Soul':1},nyraHeal:()=>1,damage:()=>5,text:'2 Spears + 2 Claws + Bonded Soul · heal Nyra 1 and deal 5 damage'},
    {name:'Onslaught',straight:4,bleed:1,damage:()=>4,text:'Small straight · inflict Bleed and deal 4 damage'},
    {name:'Onslaught (large straight)',upgradeSlot:'Onslaught',variant:'large',straight:5,bleed:2,damage:()=>7,text:'Large straight · inflict 2 Bleed and deal 7 damage'},
    {name:'Feral',symbols:{'Saber Tooth':4},nyraHeal:()=>1,damage:()=>5,type:'undefendable',text:'4 Saber Teeth · heal Nyra 1 and deal 5 undefendable damage'},
    {name:'Jungle Fury!',symbols:{'Saber Tooth':5},nyraBond:true,bleed:2,damage:()=>12,type:'ultimate',text:'5 Saber Teeth · gain Nyra’s Bond, inflict 2 Bleed and deal 12 Ultimate damage'}
  ]};
  const upgrades=[
    ['Animalistic II',2,'Animalistic',{damage:c=>c.Spear+1,bleedMatch:4,text:'3–5 Spears · 4 / 5 / 6 damage. Inflict Bleed on four of a kind.'}],
    ['Onslaught II',2,'Onslaught',{damage:()=>5,text:'Small straight · inflict Bleed and deal 5 damage',
      variants:{large:{damage:()=>8,text:'Large straight · inflict 2 Bleed and deal 8 damage',label:'Onslaught II (large straight)'}}}],
    ['Savage II',2,'Savage',{damage:()=>5,text:'3 Claws + Saber Tooth · 5 damage. Roll for extra damage, Nyra’s Bond or Bleed.'},2,
      {name:'Hunt',symbols:{Claw:2,'Saber Tooth':1},bleed:1,damage:()=>3,text:'2 Claws + Saber Tooth · inflict Bleed and deal 3 damage'}],
    ['Resuscitate II',2,'Resuscitate',{nyraHeal:c=>2*c['Bonded Soul'],text:'2 Bonded Souls · gain Nyra’s Bond and heal Nyra 2 per Bonded Soul'}],
    ['Predatory Advance II',2,'Predatory Advance',{damage:()=>6,text:'2 Spears + 2 Claws + Bonded Soul · heal Nyra 1 and deal 6 damage'},2,
      {name:'Jugular',symbols:{Spear:1,Claw:1,'Saber Tooth':1},bleed:2,text:'Spear + Claw + Saber Tooth · inflict 2 Bleed'}],
    ['Feral II',2,'Feral',{damage:()=>6,text:'4 Saber Teeth · heal Nyra 1 and deal 6 undefendable damage'},2,
      {name:'Ferocious',symbols:{'Saber Tooth':3},nyraHeal:()=>1,bleed:2,text:'3 Saber Teeth · heal Nyra 1 and inflict 2 Bleed'}],
    ['Maternal Bond II',2,'defence',{}],
    ['Feral Instincts II',2,'Feral Instincts',{damage:()=>3,text:'3 Spears + Bonded Soul · gain Nyra’s Bond and deal 3 undefendable damage'},2,
      {name:'Swipe',symbols:{Spear:2,'Saber Tooth':1},bleed:1,text:'2 Spears + Saber Tooth · inflict Bleed'}],
    ['Maternal Bond III',4,'defence',{},3]
  ];
  const cards=[['Resilient!',1,'instant'],['Pounce!',0,'roll'],['Prowl!',0,'roll'],
    ['Blood Bond!',1,'main'],['Savage Slash!',1,'main'],['Primal Roar!',0,'main']];
  const active=p=>!!p.nyra&&!p.nyra.downed;
  function changeHealth(p,change){
    const nyra=p.nyra;
    if(!nyra||!change)return 0;
    const before=nyra.hp;
    nyra.hp=bounded(before+change,7);
    if(!nyra.hp)nyra.downed=true;
    return nyra.hp-before;
  }
  function upkeep(p){
    if(!p.nyra?.downed)return;
    if(p.nyra.hp>=5){p.nyra.downed=false;return 'Nyra becomes Active.';}
    changeHealth(p,1);
    return 'Nyra heals 1 and remains Downed.';
  }
  return {
    id,board,upgrades,cards,promoId:33,active,upkeep,changeHealth,
    initialize(s,seat){s.players[seat].nyra={hp:5,downed:false};},
    effects:{
      savage(hit,counts){
        hit.damage+=counts.Spear?1:counts.Claw?2:0;
        hit.nyraBond=!!counts['Bonded Soul'];
        hit.bleed=Number(!!counts['Saber Tooth']);
      }
    },
    cardChoices(card,{s,seat,one}){
      if(card===32)return heroNames(s).map((label,target)=>({label,target}));
      if(card===29||card===30){
        const hit=s.pending;
        return seat===s.active&&hit?.attack&&!hit.pure&&!hit.evaded&&!hit.parlayBlocked&&
          ['defence','defenceResponse','damage','locked'].includes(s.stage)?one:[];
      }
      return one;
    },
    applyCard({id:card,p,grantStatus}){
      if(card!==28)return false;
      grantStatus(p,'nyraBond');
      return true;
    },
    cardRollSize(card){return ({29:5,30:1,31:3,32:1,33:1})[card]??0;},
    resolveCardRoll({id:card,p,opponent,s,counts,hit,target,grantStatus,grantAttackStatus,updateDamage,drawCards,random}){
      if(card===29){
        hit.grossDamage+=counts.Spear??0;
        if(counts.Claw)grantAttackStatus(s,opponent,'bleed');
        updateDamage(hit);
      } else if(card===30){
        hit.grossDamage+=counts.Spear?1:counts.Claw?2:counts['Saber Tooth']?3:0;
        if(counts['Bonded Soul'])changeHealth(p,1);
        updateDamage(hit);
      } else if(card===31)changeHealth(p,1+(counts['Bonded Soul']??0)+2*(counts['Saber Tooth']??0));
      else if(card===32)grantStatus(s.players[target],'bleed',counts.Claw||counts['Saber Tooth']?2:1);
      else if(card===33){
        if(counts['Saber Tooth'])changeHealth(p,4);
        else drawCards(p,1,random,card);
      }
    },
    defenceDiceCount(p){return p.upgrades?.defence?4:3;},
    resolveDefence({state,defender,counts}){
      const hit=state.pending;
      hit.returnDamage=defender.upgrades?.defence===27?(counts.Spear??0)+(counts['Saber Tooth']??0):Number(!!counts.Spear);
      if(active(defender)&&counts.Claw)hit.returnDamage+=2;
      hit.nyraDefenceHeal=counts['Bonded Soul']??0;
    }
  };
})();
