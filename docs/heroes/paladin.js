const paladin = (() => {
  const board = {name:'Paladin',symbols:['Sword','Sword','Helmet','Helmet','Heart','Prayer'],defence:'Divine Defense',
    abilities:[
     {name:'Retaliate',text:'3 Helmets + Prayer · give Retribution to a chosen player and gain 3 CP',symbols:{Helmet:3,Prayer:1},cpGain:3,retributionTarget:true},
     {name:'Holy Attack',text:'Small / large straight · heal 1 / 2 and deal 6 / 8 damage',straight:4,heal:c=>c.largeStraight?2:1,damage:c=>c.largeStraight?8:6},
     {name:'Righteous Prayer',text:'4 Prayers · 8 damage, then gain Crit and 2 CP',symbols:{Prayer:4},damage:()=>8,paladinAfter:['crit'],afterCP:2},
     {name:'Righteous Combat',text:'3 Swords + 2 Helmets · 5 damage, then roll 2 effect dice',symbols:{Sword:3,Helmet:2},effect:'righteousCombat',effectCount:2,damage:()=>5},
     {name:'Mighty Prayer',text:'3 Swords + Prayer · 3 undefendable damage, then gain Crit and Accuracy',symbols:{Sword:3,Prayer:1},damage:()=>3,type:'undefendable',paladinAfter:['crit','accuracy']},
     {name:'Holy Light',text:'2+ Hearts · heal 1 per Heart, then roll 2 effect dice for benefits',symbols:{Heart:2},heal:c=>c.Heart,effect:'holyLight',effectCount:2},
     {name:'Resolute Faith!',text:'5 Prayers · gain Blessing of Divinity, heal 5 and deal 10 Ultimate damage',symbols:{Prayer:5},paladinGain:['blessing'],heal:()=>5,damage:()=>10,type:'ultimate'}
    ]};
  const upgrades = [
    ['Tithe II',3,'Tithe',{}],
    ['Retaliate II',1,'Retaliate',{cpGain:4,text:'3 Helmets + Prayer · give Retribution to a chosen player and gain 4 CP'},2,
      {name:'Requital',text:'One of each symbol · gain Retribution, heal 1 and deal 3 undefendable damage',symbols:{Sword:1,Helmet:1,Heart:1,Prayer:1},paladinGain:['retribution'],heal:()=>1,damage:()=>3,type:'undefendable'}],
    ['Holy Attack II',2,'Holy Attack',{damage:c=>c.largeStraight?9:7,text:'Small / large straight · heal 1 / 2 and deal 7 / 9 damage'}],
    ['Righteous Prayer II',2,'Righteous Prayer',{type:'undefendable',text:'4 Prayers · 8 undefendable damage, then gain Crit and 2 CP'},2,
      {name:'Prosperity',text:'3 Prayers · gain 4 CP',symbols:{Prayer:3},cpGain:4}],
    ['Righteous Combat II',2,'Righteous Combat',{effectCount:3,text:'3 Swords + 2 Helmets · 5 damage, then roll 3 effect dice'}],
    ['Righteous Combat III',4,'Righteous Combat',{effectCount:3,damage:()=>6,text:'3 Swords + 2 Helmets · 6 damage, then roll 3 effect dice'},3,
      {name:'Steadfast',text:'2 Swords + Helmet · heal 2 and deal 2 undefendable damage',symbols:{Sword:2,Helmet:1},heal:()=>2,damage:()=>2,type:'undefendable'}],
    ['Mighty Prayer II',2,'Mighty Prayer',{damage:()=>4,text:'3 Swords + Prayer · 4 undefendable damage, then gain Crit and Accuracy'},2,
      {name:'Offensive Stance',text:'2 Swords + Prayer · 2 undefendable damage, then choose Crit or Accuracy',symbols:{Sword:2,Prayer:1},damage:()=>2,type:'undefendable',paladinAfterChoice:true}],
    ['Holy Light II',2,'Holy Light',{effectCount:3,text:'2+ Hearts · heal 1 per Heart, then roll 3 effect dice for benefits'}],
    ['Divine Defense II',3,'defence',{}],
    ['Divine Defense III',4,'defence',{},3]
  ];
  const cards = [['Mighty!',1,'main'],['Consecration!',4,'main'],['Blessed!',1,'main'],['Absolution!',1,'roll'],['Divine Favor!',0,'main']];

  function resolveEffect(p, counts, {attacker, bounded, grantStatus, drawCards, random}) {
      const {Sword=0,Helmet=0,Heart=0,Prayer=0}=counts;
      if(p.effect==='righteousCombat'){
        p.damage+=2*Sword+Helmet;
        p.heal+=2*Heart;
        gainCP(attacker,Prayer);
      } else {
        if(Sword)grantStatus(attacker,'crit');
        if(Helmet)grantStatus(attacker,'protect');
        if(Heart)drawCards(attacker,p.effectCount===3?Heart:1,random);
        gainCP(attacker,2*(p.effectCount===3?Prayer:Number(Prayer>0)));
      }
  }
  const effects = {
    righteousCombat: resolveEffect,
    holyLight: resolveEffect,
  };

  return {
    board,
    upgrades,
    cards,
    effects,

    resolveCardRoll({id, p, counts, hit, bounded, updateDamage, drawCards, random}) {
      if(id===31){
       if(counts.Sword)drawCards(p,2,random,id);
       if(counts.Helmet||counts.Heart)p.hp=bounded(p.hp+(counts.Heart?4:3),60);
       if(counts.Prayer)gainCP(p,3);
      }
      if(id===32){
       if(counts.Sword)hit.absolutionReturn=(hit.absolutionReturn??0)+3;
       else {
        hit.prevention=(hit.prevention??0)+(counts.Helmet?3:counts.Heart?5:2);
        if(counts.Prayer)gainCP(p,2);
        updateDamage(hit);
       }
      }
    },

    resolvePromo({p, bounded}) {
      gainCP(p,4);
    },

    applyCard({id, s, choice, grantStatus, paladinBuffs}) {
      if([29,30].includes(id)){
       for(const key of id===29?['crit']:paladinBuffs)grantStatus(s.players[choice.target],key);
       return true;
      }
    },

    cardRollSize(id) {
      return ({31: 1, 32: 1})[id] ?? 0;
    },

    defenceDiceCount(defender) {
      return defender.upgrades?.defence ? 4 : 3;
    },

    resolveDefence({state, defender, counts, bounded, grantStatus, updateDamage}) {
      const {Sword=0,Helmet=0,Heart=0,Prayer=0}=counts;
      const level=defender.upgrades?.defence,p=state.pending;
      p.returnDamage=level?Sword:Number(Sword>0);
      p.prevention=(p.prevention??0)+Helmet+2*Heart;
      gainCP(defender,Prayer);
      if(level===28&&Helmet>=2&&Prayer)grantStatus(defender,'protect');
      updateDamage(p);
    }
  };
})();
