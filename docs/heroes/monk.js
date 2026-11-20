const monk = (() => {
  const board = {name:'Monk',symbols:['Fist','Fist','Palm','Zen','Zen','Lotus'],defence:'Serenity',
    abilities:[
     {name:'Fist Strike',text:'3–5 Fists · 6 / 7 / 8 damage',symbols:{Fist:3},damage:c=>c.Fist+3},
     {name:'Meditate',text:'3 Zen · gain 5 Chi and choose Evasive or Cleanse',symbols:{Zen:3},chiGain:5,monkRewards:1},
     {name:'Fist of Harmony',text:'Small straight · 6 damage, then gain 2 Chi',straight:4,damage:()=>6,afterChi:2},
     {name:'Lotus Strike',text:'4 Lotus · 5 undefendable damage, then raise Chi limit and gain 5 Chi',symbols:{Lotus:4},damage:()=>5,type:'undefendable',afterChi:5,afterChiCap:1},
     {name:'Combo Strike',text:'3 Fists + Palm · 6 damage, then roll one effect die',symbols:{Fist:3,Palm:1},damage:()=>6,effect:'combo'},
     {name:'Tempest Rush',text:'3 Palms · roll three dice for damage; 13+ inflicts Knockdown',symbols:{Palm:3},effect:'tempest',threshold:13},
     {name:'Fist of Tranquility',text:'Large straight · 7 damage, then gain Evasive and 3 Chi',straight:5,damage:()=>7,afterChi:3,afterEvasive:1},
     {name:'Transcendence!',text:'5 Lotus · gain Evasive and Cleanse, Knockdown and 10 Ultimate damage; then raise Chi limit and gain 6 Chi',symbols:{Lotus:5},evasive:1,cleanseGain:1,knockdown:true,damage:()=>10,afterChi:6,afterChiCap:1,type:'ultimate'}
    ]};
  const upgrades = [
    ['Fist Strike II',1,'Fist Strike',{damage:c=>c.Fist+4,text:'3–5 Fists · 7 / 8 / 9 damage'}],
    ['Fist Strike III',2,'Fist Strike',{damage:c=>c.Fist+4,matchKnockdown:4,text:'3–5 Fists · 7 / 8 / 9 damage; four matching numbers inflict Knockdown'},3],
    ['Meditate II',2,'Meditate',{monkRewards:0,chiGain:6,evasive:1,cleanseGain:1,text:'3 Zen · gain 6 Chi, Evasive and Cleanse'},2,{name:'Zen Strike',text:'2 Fists + 2 Zen · 6 damage, then gain 2 Chi',symbols:{Fist:2,Zen:2},damage:()=>6,afterChi:2}],
    ['Fist of Harmony II',1,'Fist of Harmony',{afterChi:3,text:'Small straight · 6 damage, then gain 3 Chi'}],
    ['Lotus Strike II',2,'Lotus Strike',{damage:()=>6,afterChi:6,text:'4 Lotus · 6 undefendable damage, then raise Chi limit and gain 6 Chi'},2,{name:'Way of the Lotus',text:'3 Lotus · 2 undefendable damage, then gain Evasive and 2 Chi',symbols:{Lotus:3},damage:()=>2,type:'undefendable',afterChi:2,afterEvasive:1}],
    ['Combo Strike II',2,'Combo Strike',{effectCount:2,damage:()=>5,text:'3 Fists + Palm · 5 damage, then roll two effect dice'}],
    ['Tempest Rush II',1,'Tempest Rush',{tempestChi:true,threshold:12,text:'3 Palms · roll three dice; spend 1 Chi to reroll one; 12+ inflicts Knockdown'}],
    ['Fist of Tranquility II',2,'Fist of Tranquility',{knockdown:true,text:'Large straight · 7 damage and Knockdown, then gain Evasive and 3 Chi'},2,{name:'Way of the Monk',text:'One of each symbol · gain 2 Evasive and deal 3 undefendable damage',symbols:{Fist:1,Palm:1,Zen:1,Lotus:1},evasive:2,damage:()=>3,type:'undefendable'}],
    ['Serenity II',2,'defence',{}],
    ['Serenity III',3,'defence',{},3]
  ];
  const cards = [['Palm Strike!',0,'main'],['Mystic Mantra!',3,'main'],['Ruminate!',3,'instant'],['Contemplate!',0,'instant'],['Enlightenment!',0,'main']];

  const effects = {
    tempest(p) {
        p.damage=p.effectDice.reduce((sum,value)=>sum+value,0);
        p.knockdown=p.damage>=p.threshold;
    },
    combo(p, counts) {
        const c=counts;
        p.damage+=2*(c.Fist??0)+3*(c.Palm??0);
        p.chiGain=2*(c.Zen??0);
        p.monkRewards=c.Lotus??0;
    },
  };

  return {
    leafletPositives: {chi: true, evasive: true, cleanse: true},
    board,
    upgrades,
    cards,
    effects,
    effectDiceCount: {tempest: 3, combo: 1},

    resolvePromo({p, grantStatus}) {
      grantStatus(p,'chi',2);
      grantStatus(p,'evasive');
      grantStatus(p,'cleanse');
    },

    applyCard({id, p, opponent, grantStatus}) {
      if(id===29||id===30){
       grantStatus(opponent,'knockdown');
       if(id===30){grantStatus(p,'chi');grantStatus(p,'evasive');grantStatus(p,'cleanse');}
       return true;
      }
      if(id===31||id===32){grantStatus(p,'chi',id===31?5:2);return true;}
    },

    cardRollSize(id) {
      return ({31: 5})[id] ?? 0;
    },

    defenceDiceCount(defender) {
      return defender.upgrades?.defence ? 5 : 4;
    },

    resolveDefence({state, seat, defender, counts, grantStatus}) {
      if(counts.Zen)grantStatus(defender,'chi',counts.Zen);
      state.pending.returnDamage=counts.Fist??0;
      if(defender.upgrades?.defence===28&&counts.Zen&&counts.Lotus){
        state.monkChoice={seat,left:1,afterDefence:true};
        return 'monkChoice';
      }
    }
  };
})();
