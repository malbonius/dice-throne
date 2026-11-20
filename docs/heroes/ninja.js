const ninja = (() => {
  const board = {name:'Ninja',symbols:['Ninjato','Ninjato','Ninjato','Shuriken','Shuriken','Mask'],defence:'Shade Shift',
    abilities:[
     {name:'Slash',text:'3–5 Ninjatō · 5 / 6 / 7 damage',symbols:{Ninjato:3},damage:c=>c.Ninjato+2},
     {name:'Walk the Line',text:'4 Shuriken · sum two effect dice for damage; 6 or less is undefendable',symbols:{Shuriken:4},effect:'walkLine',effectCount:2},
     {name:'Poison Blade',text:'Small straight · inflict Delayed Poison and deal 5 damage',straight:4,delayedPoison:1,damage:()=>5},
     {name:'Shadewalk',text:'4 Masks · gain Smoke Bomb, inflict Delayed Poison and deal 6 undefendable damage',symbols:{Mask:4},smoke:true,delayedPoison:1,damage:()=>6,type:'undefendable'},
     {name:'Death Blossom',text:'3 Ninjatō + 2 Shuriken · roll five effect dice; a Mask makes the damage undefendable',symbols:{Ninjato:3,Shuriken:2},effect:'deathBlossom',effectCount:5},
     {name:'Smoke Screen',text:'Ninjatō + 2 Shuriken + Mask · give Smoke Bomb and 2 Ninjutsu, inflict Delayed Poison',symbols:{Ninjato:1,Shuriken:2,Mask:1},smoke:true,ninjaTokens:2,ninjaTarget:true,delayedPoison:1},
     {name:'Shadow Fang',text:'Large straight · gain 2 Ninjutsu, then deal 8 damage',straight:5,ninjaTokens:2,damage:()=>8},
     {name:'Assassinate!',text:'5 Masks · inflict 2 Delayed Poison in a duel, gain Smoke Bomb and deal 10 Ultimate damage',symbols:{Mask:5},delayedPoison:2,smoke:true,damage:()=>10,type:'ultimate'}
    ]};
  const upgrades = [
    ['Slash II',2,'Slash',{damage:c=>2*c.Ninjato-2,ninjutsuMatch:3,text:'3–5 Ninjatō · 4 / 6 / 8 damage; three matching numbers gain Ninjutsu'}],
    ['Death Blossom II',2,'Death Blossom',{ninjaRerolls:2,ninjaPoisonOnMasks:true,text:'3 Ninjatō + 2 Shuriken · roll five effect dice, reroll up to two; two Masks inflict Delayed Poison'}],
    ['Smokescreen II',2,'Smoke Screen',{ninjaTokens:3,text:'Ninjatō + 2 Shuriken + Mask · give Smoke Bomb and 3 Ninjutsu, inflict Delayed Poison'},2,
      {name:'Kuji-Kiri',text:'3 Shuriken + 2 Masks · deal 8 collateral damage in a duel',symbols:{Shuriken:3,Mask:2},collateral:8}],
    ['Walk the Line II',2,'Walk the Line',{ninjaRerolls:1,text:'4 Shuriken · sum two effect dice for damage, reroll one; 6 or less is undefendable'},2,
      {name:'Tip of the Blade',text:'3 Shuriken · roll one die for pure damage',symbols:{Shuriken:3},effect:'tipBlade',effectCount:1,type:'pure'}],
    ['Poison Blade II',1,'Poison Blade',{delayedPoison:0,effect:'poisonBlade',effectCount:1,text:'Small straight · 5 damage; roll for one or two Delayed Poison'}],
    ['Shadow Fang II',2,'Shadow Fang',{smoke:true,text:'Large straight · gain Smoke Bomb and 2 Ninjutsu, then deal 8 damage'},2,
      {name:'Misdirect',text:'2 Ninjatō + 2 Masks · gain Smoke Bomb and deal 2 undefendable damage',symbols:{Ninjato:2,Mask:2},smoke:true,damage:()=>2,type:'undefendable'}],
    ['Shadewalk II',2,'Shadewalk',{delayedPoison:2,damage:()=>5,text:'4 Masks · gain Smoke Bomb, inflict 2 Delayed Poison and deal 5 undefendable damage'},2,
      {name:'Jugulate',text:'3 Masks · gain 3 Ninjutsu and inflict Delayed Poison',symbols:{Mask:3},ninjaTokens:3,delayedPoison:1}],
    ['Shade Shift II',2,'defence',{}]
  ];
  const cards = [['Poison Dart!',2,'main'],['Throwing Stars!',1,'roll'],['Fan of Knives!',2,'main'],['Smoke Offering!',0,'instant'],['Train!',0,'instant'],['Escape!',0,'roll'],['Dojo!',0,'main']];

  function resolveEffect(p, counts) {
      const {Ninjato=0,Shuriken=0,Mask=0}=counts;
      if(p.effect==='walkLine'){
        p.damage=p.effectDice.reduce((sum,value)=>sum+value,0);
        p.undefendable=p.damage<=6;
      } else if(p.effect==='tipBlade')p.damage=p.effectDice[0];
      else if(p.effect==='deathBlossom'){
        p.damage=Ninjato+2*Shuriken;
        p.undefendable=Mask>0;
        if(p.ninjaPoisonOnMasks&&Mask>=2)p.delayedPoison=1;
      } else p.delayedPoison=Ninjato?1:2;
  }
  const effects = {
    walkLine: resolveEffect,
    tipBlade: resolveEffect,
    deathBlossom: resolveEffect,
    poisonBlade: resolveEffect,
  };

  return {
    leafletPositives: {smoke: true, ninjutsu: true},
    board,
    upgrades,
    cards,
    effects,

    resolveCardRoll({id, p, counts, hit, updateDamage, grantStatus}) {
      if(id===28){
       hit.grossDamage+=counts.Shuriken??0;
       updateDamage(hit);
      }
      if(id===32){
       if(counts.Mask)grantStatus(p,'smoke');
       else {
        hit.prevention=(hit.prevention??0)+(counts.Shuriken?2:1);
        updateDamage(hit);
       }
      }
    },

    resolvePromo({p, grantStatus}) {
      grantStatus(p,'smoke');
      grantStatus(p,'ninjutsu',2);
    },

    applyCard({id, s, names, seat, p, opponent, c, choice, grantStatus, startSideDamage, add, seatCard}) {
      if(id===27){grantStatus(opponent,'delayedPoison');return true;}
      if(id===29){startSideDamage(s,1-seat,3,c.name);return true;}
      if(id===30){
       p.hand.splice(p.hand.indexOf(choice.discard),1);
       p.discard.push(choice.discard);
       grantStatus(s.players[choice.target],'smoke');
       add(`${names[seat]} discards ${seatCard(s,seat,choice.discard).name}.`);
       return true;
      }
      if(id===31){grantStatus(p,'ninjutsu');return true;}
    },

    cardRollSize(id) {
      return ({28: 5, 31: 5, 32: 1})[id] ?? 0;
    },

    defenceDiceCount() {
      return 3;
    },

    resolveDefence({state, defender, counts, grantStatus}) {
      const {Ninjato=0,Shuriken=0,Mask=0}=counts;
      state.pending.returnDamage=(defender.upgrades?.defence?Ninjato:Number(Ninjato>0))+2*Number(Shuriken>0);
      if(Mask>=2)grantStatus(defender,'smoke');
    }
  };
})();
