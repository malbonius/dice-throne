const pyromancer = (() => {
  const board = {name:'Pyromancer',symbols:['Flame','Flame','Flame','Blaze','Soul','Meteor'],defence:'Molten Armor',
    abilities:[
     {name:'Fireball',text:'3–5 Flames · 4 / 6 / 8 damage, gain 1 Fire Mastery',symbols:{Flame:3},damage:c=>2*c.Flame-2,mastery:1},
     {name:'Burning Soul',text:'2+ Fiery Souls · gain 2 Mastery and deal 1 collateral per Soul',symbols:{Soul:2},damage:()=>0,souls:true},
     {name:'Hot Streak',text:'Small straight · gain 2 Mastery, deal 5 + Mastery damage',straight:4,damage:()=>5,mastery:2,masteryDamage:1},
     {name:'Meteorite',text:'4 Meteors · gain 2 Mastery, Stun, deal Mastery as undefendable and 2 collateral',symbols:{Meteor:4},damage:()=>0,mastery:2,masteryDamage:1,stun:true,collateral:2,type:'undefendable'},
     {name:'Pyroblast',text:'3 Flames + Meteor · 6 damage, then roll an effect die',symbols:{Flame:3,Meteor:1},damage:()=>6,effect:'pyroblast'},
     {name:'Combustion',text:'One of each symbol · gain 1 Mastery, spend up to 4 for 3 undefendable each',symbols:{Flame:1,Blaze:1,Soul:1,Meteor:1},mastery:1,combustRate:3,type:'undefendable'},
     {name:'Ignite',text:'Large straight · gain 2 Mastery, deal 4 + twice Mastery',straight:5,damage:()=>4,mastery:2,masteryDamage:2},
     {name:'Scorch the Earth!',text:'5 Meteors · gain 3 Mastery, Knockdown, Burn and 14 damage including collateral',symbols:{Meteor:5},mastery:3,knockdown:true,burn:true,damage:()=>12,collateral:2,type:'ultimate'}
    ]};
  const upgrades = [
    ['Fireball II',1,'Fireball',{mastery:2,text:'3–5 Flames · 4 / 6 / 8 damage, gain 2 Fire Mastery'}],
    ['Pyroblast II',2,'Pyroblast',{effectCount:2,text:'3 Flames + Meteor · 6 damage, then roll two effect dice'}],
    ['Pyroblast III',3,'Pyroblast',{effectCount:2,effectRetry:true,text:'3 Flames + Meteor · 6 damage, roll two effect dice, optionally reroll one'},3],
    ['Burning Soul II',1,'Burning Soul',{soulUpgrade:true,text:'2+ Fiery Souls · gain Mastery and deal collateral; on 3+ inflict Burn, on 4+ increase cap'}],
    ['Combustion II',2,'Combustion',{combustRate:4,text:'One of each symbol · gain 1 Mastery, spend up to 4 for 4 undefendable each'}],
    ['Hot Streak II',2,'Hot Streak',{damage:()=>6,text:'Small straight · gain 2 Mastery, deal 6 + Mastery damage'},2,{name:'Scorch',text:'2 Flames + 2 Blazes · gain 2 Mastery, inflict Burn and deal 6 damage',symbols:{Flame:2,Blaze:2},mastery:2,burn:true,damage:()=>6}],
    ['Ignite II',2,'Ignite',{burn:true,text:'Large straight · gain 2 Mastery, inflict Burn, deal 4 + twice Mastery'},2,{name:'Blazing Soul',text:'2 Blazes + 2 Fiery Souls · increase Mastery cap, gain 5 Mastery, inflict Knockdown',symbols:{Blaze:2,Soul:2},masteryCap:1,mastery:5,knockdown:true}],
    ['Meteorite II',2,'Meteorite',{collateral:3,text:'4 Meteors · gain 2 Mastery, Stun, deal Mastery as undefendable and 3 collateral'},2,{name:'Meteoroid',text:'3 Meteors · Knockdown, Burn and Stun',symbols:{Meteor:3},knockdown:true,burn:true,stun:true}],
    ['Molten Armor II',1,'defence',{}],
    ['Molten Armor III',3,'defence',{},3]
  ];
  const cards = [['Warm Up!',0,'main'],['Fire Up!',3,'main'],['Red Hot!',1,'roll'],['Huzzah!',1,'roll'],['Infernal Infusion!',0,'main']];

  const effects = {
    pyroblast(p, counts) {
        const c=counts;
        p.damage+=3*(c.Flame??0);
        p.mastery=2*(c.Soul??0);
        p.burn=!!c.Blaze;p.knockdown=!!c.Meteor;
    },
  };

  return {
    board,
    upgrades,
    cards,
    effects,
    effectDiceCount: {pyroblast: 1},

    resolveCardRoll({id, p, opponent, counts, hit, s, updateDamage, grantStatus, grantAttackStatus}) {
      if(id===32){
       hit.grossDamage+=3*(counts.Flame??0);updateDamage(hit);
       if(counts.Blaze)grantAttackStatus(s,opponent,'burn');
       if(counts.Soul)grantStatus(p,'fireMastery',2*counts.Soul);
       if(counts.Meteor)grantAttackStatus(s,opponent,'knockdown');
      }
    },

    resolvePromo({p, statusCap}) {
      p.fireMastery=statusCap(p,'fireMastery');
    },

    applyCard({id, s, p, choice, grantStatus, statusCap, updateDamage}) {
      if(id===29){p.cp-=Math.min(p.cp,choice.spend);grantStatus(p,'fireMastery',1+choice.spend);return true;}
      if(id===30){p.masteryCap=statusCap(p,'fireMastery')+1;grantStatus(p,'fireMastery',2);return true;}
      if(id===31){s.pending.grossDamage+=p.fireMastery??0;updateDamage(s.pending);return true;}
    },

    cardRollSize(id) {
      return ({31: 5, 32: 1})[id] ?? 0;
    },

    defenceDiceCount() {
      return 5;
    },

    resolveDefence({state, defender, attacker, counts, grantStatus}) {
      const level=defender.upgrades?.defence;
      const meteors=level===28?(counts.Meteor??0):0;
      const mastery=(counts.Soul??0)+meteors;
      if(mastery)grantStatus(defender,'fireMastery',mastery);
      if(level && counts.Flame && counts.Blaze)grantStatus(attacker,'burn');
      state.pending.returnDamage=(counts.Flame??0)+meteors;
    }
  };
})();
