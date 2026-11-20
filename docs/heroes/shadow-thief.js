const shadowThief = (() => {
  const board = {name:'Shadow Thief',symbols:['Dagger','Dagger','Bag','Bag','Card','Shadow'],defence:'Shadow Defense',
    abilities:[
     {name:'Dagger Strike',text:'3–5 Daggers · 4 / 6 / 8 damage; Bag grants 1 CP, Shadow inflicts Poison',symbols:{Dagger:3},damage:c=>2*c.Dagger-2,dagger:true},
     {name:'Shifty Strike',text:'Small straight · gain 3 CP, then deal half your CP, rounded up',straight:4,cpGain:3,cpDamage:0.5},
     {name:'Shadow Dance',text:'3 Shadows · roll for pure damage, then gain Shadows and Sneak Attack',symbols:{Shadow:3},effect:'shadowDance',type:'pure',afterShadows:true},
     {name:'Pickpocket',text:'2–4 Bags · gain 2–4 CP, a Shadow can cost the opponent 1 CP',symbols:{Bag:2},pickpocket:true},
     {name:'Insidious Strike',text:'Large straight · gain 3 CP, then deal your CP',straight:5,cpGain:3,cpDamage:1},
     {name:'Carducopia',text:'2+ Cards · draw 1 per Card',symbols:{Card:2},carducopia:true},
     {name:'Shadow Shank!',text:'5 Shadows · gain 3 CP and Shadows, then deal your CP +5 Ultimate damage',symbols:{Shadow:5},cpGain:3,cpDamage:1,damage:()=>5,shadows:true,type:'ultimate'}
    ]};
  const upgrades = [
    ['Dagger Strike II',0,'Dagger Strike',{daggerUpgrade:true,text:'3–5 Daggers · 4 / 6 / 8 damage, gain 1 CP, Shadow poisons, Card draws'}],
    ['Pickpocket II',1,'Pickpocket',{pickUpgrade:true,text:'2–5 Bags · gain 3–6 CP, a Shadow can cost the opponent up to 2 CP'}],
    ['Shifty Strike II',2,'Shifty Strike',{cpGain:4,text:'Small straight · gain 4 CP, then deal half your CP'},2,{name:'Shadow Strike',text:'2 Daggers + 2 Shadows · deal half your CP and inflict Poison',symbols:{Dagger:2,Shadow:2},cpDamage:0.5,poison:1}],
    ['Insidious Strike II',2,'Insidious Strike',{cpGain:4,text:'Large straight · gain 4 CP, then deal your CP'},2,{name:'Shank Attack',text:'One of each symbol · gain 1 CP and Sneak Attack, draw 1 and inflict Poison',symbols:{Dagger:1,Bag:1,Card:1,Shadow:1},cpGain:1,sneak:true,draw:1,poison:1}],
    ['Shadow Dance II',1,'Shadow Dance',{draw:1,text:'3 Shadows · roll for pure damage, gain Shadows and Sneak Attack, draw 1'}],
    ['Carducopia II',2,'Carducopia',{cardUpgrade:true,text:'2+ Cards · draw per Card; Shadow makes opponent discard, Bag grants 1 CP'}],
    ['Shadow Defense II',3,'shadowDefence',{}],
    ['Counter Strike II',4,'counterStrike',{}]
  ];
  const cards = [['Sneaky!',1,'main'],['Poison Wound!',2,'instant'],['Wild Shadow!',4,'roll'],['Shadow Coin!',0,'instant'],['Enter the Shadows!',4,'instant'],['Card Trick!',2,'main'],['Shadow Meld!',0,'main']];

  const effects = {
    shadowDance(p) {
        p.damage=Math.ceil(p.effectDice[0]/2);
    },
  };

  return {
    leafletPositives: {shadows: true, sneak: true},
    board,
    upgrades,
    cards,
    effects,
    effectDiceCount: {shadowDance: 1},

    resolvePromo({p, bounded, grantStatus}) {
      grantStatus(p,'sneak');
      gainCP(p,2);
    },

    applyCard({id, p, opponent, bounded, grantStatus, discardRandom, drawCards, random}) {
      if(id===27){grantStatus(p,'sneak');return true;}
      if(id===28){grantStatus(opponent,'poison');return true;}
      if(id===30){gainCP(p,(p.shadows?3:2));return true;}
      if(id===31){grantStatus(p,'shadows');return true;}
      if(id===32){discardRandom(opponent,random);drawCards(p,p.shadows?2:1,random,id);return true;}
    },

    defenceDiceCount(defender, kind) {
      return kind === 'shadowDefence' && !defender.upgrades.shadowDefence ? 4 : 5;
    },

    resolveDefence({state, defender, attacker, counts, grantStatus}) {
      if(state.defenceKind==='counterStrike'){
        state.pending.returnDamage=(counts.Dagger??0)*(defender.upgrades.counterStrike?2:1);
        if(counts.Dagger&&counts.Shadow)grantStatus(attacker,'poison');
      } else {
        if((counts.Dagger??0)>=2)grantStatus(attacker,'poison');
        if(counts.Shadow)grantStatus(defender,'sneak');
        if((counts.Shadow??0)>=2)grantStatus(defender,'shadows');
      }
    }
  };
})();
