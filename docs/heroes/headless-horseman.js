const headlessHorseman=(()=>{
  const id=16;
  const haunted=(s,seat)=>s.players[seat].hauntedHeadSeat===seat;
  const board={name:'Headless Horseman',symbols:['Axe','Axe','Axe','Horseshoe','Horseshoe','Scare'],defence:'Hallowed Reckoning',abilities:[
    {name:'Cleave',symbols:{Axe:3},damage:c=>c.Axe+(c.Axe===5?2:1),dreadfulMatch:4,text:'3–5 Axes · 4 / 5 / 7 damage. Gain Dreadful on four of a kind.'},
    {name:'Reap',symbols:{Horseshoe:3,Scare:1},dreadful:2,headDraw:true,damage:()=>3,type:'undefendable',text:'3 Horseshoes + Scare · gain 2 Dreadful, deal 3 undefendable damage and draw a card if holding the Head'},
    {name:'Ride Down',symbols:{Axe:3,Horseshoe:2},grim:2,damage:()=>6,text:'3 Axes + 2 Horseshoes · gain 2 Grim Pursuit and deal 6 damage'},
    {name:'Sow Despair',straight:4,dreadful:1,damage:()=>7,text:'Small straight · gain Dreadful and deal 7 damage'},
    {name:'Sow Despair (large straight)',upgradeSlot:'Sow Despair',variant:'large',straight:5,dreadful:2,damage:()=>9,text:'Large straight · gain 2 Dreadful and deal 9 damage'},
    {name:'Spectral Assault',symbols:{Axe:3,Scare:2},spectral:true,effect:'spectralAssault',damage:()=>8,text:'3 Axes + 2 Scare · gain Dreadful, deal 8 damage and roll for additional effects'},
    {name:'Horrify',symbols:{Scare:4},horrify:true,damage:()=>6,type:'undefendable',text:'4 Scare · choose 3 Dreadful or Grim Pursuit, or gain both while holding the Head. Deal 6 undefendable damage.'},
    {name:'Dreadful Charge!',symbols:{Scare:5},dreadful:4,damage:()=>14,type:'ultimate',text:'5 Scare · gain 4 Dreadful and deal 14 Ultimate damage'}
  ]};
  const upgrades=[
    ['Cleave II',2,'Cleave',{damage:c=>c.Axe+(c.Axe===5?3:2),dreadfulMatch:3,text:'3–5 Axes · 5 / 6 / 8 damage. Gain Dreadful on three of a kind.'},2,
      {name:'Ghostly Charge',symbols:{Axe:2,Horseshoe:1,Scare:1},grim:2,damage:()=>2,type:'pure',text:'2 Axes + Horseshoe + Scare · gain 2 Grim Pursuit and deal 2 pure damage'}],
    ['Reap II',2,'Reap',{damage:()=>4,text:'3 Horseshoes + Scare · gain 2 Dreadful, deal 4 undefendable damage and draw a card if holding the Head'},2,
      {name:'The Reaper',symbols:{Horseshoe:3,Scare:2},draw:1,dreadful:3,damage:()=>4,type:'undefendable',text:'3 Horseshoes + 2 Scare · draw 1, gain 3 Dreadful and deal 4 undefendable damage'}],
    ['Sow Despair II',2,'Sow Despair',{dreadful:2,text:'Small straight · gain 2 Dreadful and deal 7 damage',
      variants:{large:{dreadful:3,damage:()=>10,label:'Sow Despair II (large straight)',text:'Large straight · gain 3 Dreadful and deal 10 damage'}}}],
    ['Horrify II',2,'Horrify',{horrify:false,dreadful:3,grim:2,text:'4 Scare · gain 3 Dreadful and 2 Grim Pursuit, then deal 6 undefendable damage'},2,
      {name:'Spooky',symbols:{Scare:3},grim:2,damage:()=>7,text:'3 Scare · gain 2 Grim Pursuit and deal 7 damage'}],
    ['Ride Down II',2,'Ride Down',{grim:3,text:'3 Axes + 2 Horseshoes · gain 3 Grim Pursuit and deal 6 damage'},2,
      {name:'Cursed Gallop',symbols:{Horseshoe:3},grim:1,damage:()=>1,type:'undefendable',text:'3 Horseshoes · gain Grim Pursuit and deal 1 undefendable damage'}],
    ['Spectral Assault II',2,'Spectral Assault',{damage:()=>9,text:'3 Axes + 2 Scare · gain Dreadful, deal 9 damage and roll for additional effects'},2,
      {name:'Haunted Strike',symbols:{Axe:2,Scare:2},damage:()=>4,type:'undefendable',text:'2 Axes + 2 Scare · deal 4 undefendable damage'}],
    ['Hallowed Reckoning II',2,'defence',{}]
  ];
  const cards=[['Dancing Pumpkin!',2,'main'],['Cranial Assist!',1,'roll'],['Unescapable!',1,'roll'],['Spirited Reprisal!',1,'roll'],
    ['Thundering Hooves!',0,'roll'],['Rolling Pumpkin!',0,'instant'],['Dark Surprise!',2,'instant'],['Get Ahead!',0,'main']];
  return {
    turnStartUpkeep: 'every-turn',
    leafletPositives: {
    dreadful: true,
    grim: (state, seat) => gainGrim(state, seat, 1)
   },
    id,board,upgrades,cards,promoId:33,haunted,
    initialize(s,seat){
      s.players[seat].hauntedHeadSeat=seat;
      if(seat!==s.active)grantStatus(s.players[seat],'dreadful');
    },
    effects:{spectralAssault(hit,c){
      hit.damage+=c.Axe??0;
      hit.undefendable||=(c.Horseshoe??0)>=2;
      hit.grim=c.Scare??0;
    }},
    cardChoices(card,{s,seat,one}){
      const p=s.players[seat], hit=s.pending;
      if(card===31)return heroNames(s).map((label,target)=>({label,target})).filter(x=>x.target!==p.hauntedHeadSeat);
      if(card===30)return Array.from({length:Math.min(3,p.cp)+1},(_,amount)=>({amount,label:`Spend ${amount} CP`}));
      if(card===27||card===28){
        const attack=seat===s.active&&hit?.attack&&!hit.pure&&!hit.evaded&&!hit.parlayBlocked;
        if(card===27)return attack&&p.hauntedHeadSeat===1-seat&&['defence','defenceResponse','damage','locked'].includes(s.stage)?one:[];
        return attack&&p.grim&&!hit.undefendable&&!hit.ultimate&&s.stage==='defence'?one:[];
      }
      if(card===29)return seat!==s.active&&hit?.attack&&!hit.ultimate&&!hit.stun&&!hit.parlayBlocked&&haunted(s,seat)&&
        ['defence','defenceResponse','damage'].includes(s.stage)?one:[];
      return one;
    },
    applyCard({id:card,s,seat,p,choice,grantStatus,gainGrim,updateDamage}){
      const hit=s.pending;
      switch(card){
        case 26: if(haunted(s,seat))grantStatus(p,'dreadful',2);else gainGrim(s,seat,2);break;
        case 27: hit.grossDamage+=3;updateDamage(hit);break;
        case 28: p.grim--;hit.undefendable=true;hit.shadowSkippedDefence=false;s.stage='damage';break;
        case 29: hit.prevention=(hit.prevention??0)+3;updateDamage(hit);break;
        case 30: p.cp-=choice.amount;gainGrim(s,seat,choice.amount);break;
        case 31: p.hauntedHeadSeat=choice.target;break;
        case 32: grantStatus(p,'dreadful',2);break;
        default:return false;
      }
      return true;
    },
    cardRollSize(card){return card===33?1:0;},
    resolveCardRoll({id:card,counts,s,seat,p,gainGrim,drawCards,random}){
      if(card!==33)return;
      if(counts.Scare)gainGrim(s,seat,3);
      else drawCards(p,1,random,card);
    },
    complexity: 4,
    defenceEffect: p => 'Return 1 damage per Axe. Prevent 1 per pair of Horseshoes. Gain 1 Dreadful per Scare.' + (p.upgrades?.defence ? ' On 2 Scares, also gain Grim Pursuit.' : ''),
    defenceDiceCount(p){return Math.min(5,(p.upgrades?.defence?2:1)+(p.dreadful??0));},
    resolveDefence({state,seat,defender,counts,grantStatus,gainGrim,updateDamage}){
      const hit=state.pending;
      hit.returnDamage=counts.Axe??0;
      hit.prevention=(hit.prevention??0)+Math.floor((counts.Horseshoe??0)/2);
      if(counts.Scare)grantStatus(defender,'dreadful',counts.Scare);
      if(defender.upgrades?.defence&&counts.Scare>=2)gainGrim(state,seat,1);
      updateDamage(hit);
    }
  };
})();
