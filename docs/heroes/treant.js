const treant = (() => {
  const board = {name:'Treant',symbols:['Branch','Branch','Branch','Leaf','Leaf','Spirit'],defence:'Rooted',
    abilities:[
     {name:'Splinter',text:'3–5 Branches · 5 / 6 / 7 damage; optionally discard a Spirit to inflict Barbed Vine',symbols:{Branch:3},damage:c=>c.Branch+2,spiritCost:1},
     {name:'Tend',text:'2 Leaves + 2 Spirits · draw one, grow three Spirits, give Wellspring and inflict Barbed Vine',symbols:{Leaf:2,Spirit:2},draw:1,grow:3,wellsTarget:true,barbed:true},
     {name:'Overgrowth',text:'2 Branches + 3 Leaves · 2 damage, discard up to two Spirits for +4 each, discard Wellspring for undefendable',symbols:{Branch:2,Leaf:3},damage:()=>2,spiritCost:2,overgrowth:true},
     {name:'Vengeful Vines',text:'Small straight · inflict Barbed Vine and deal 7 damage',straight:4,barbed:true,damage:()=>7},
     {name:'Nature’s Grasp',text:'4 Spirits · grow two, then deal 5 + current Spirits as undefendable damage',symbols:{Spirit:4},grow:2,spiritDamage:true,damage:()=>5,type:'undefendable'},
     {name:'Call of the Wild',text:'Large straight · 8 damage plus Branches, Leaves grant Wellspring and Spirits grow',straight:5,damage:()=>8,effect:'callWild',effectCount:4},
     {name:'Wake the Forest!',text:'5 Spirits · gain Wellspring, grow five Spirits, inflict Barbed Vine and deal 10 Ultimate damage',symbols:{Spirit:5},grow:5,wellsSelf:true,barbed:true,damage:()=>10,type:'ultimate'}
    ]};
  const upgrades = [
    ['Splinter II',1,'Splinter',{spiritCost:0,barbed:true,text:'3–5 Branches · 5 / 6 / 7 damage and Barbed Vine'}],
    ['Splinter III',2,'Splinter',{spiritCost:0,barbed:true,growMatch:3,text:'3–5 Branches · 5 / 6 / 7 damage and Barbed Vine; three matching numbers grow a Spirit'},3],
    ['Tend II',2,'Tend',{grow:4,text:'2 Leaves + 2 Spirits · draw one, grow four Spirits, give Wellspring and inflict Barbed Vine'},2,
      {name:'Cultivate',text:'2 Branches + 2 Spirits · grow six Spirits',symbols:{Branch:2,Spirit:2},grow:6}],
    ['Overgrowth II',2,'Overgrowth',{damage:()=>4,text:'2 Branches + 3 Leaves · 4 damage, discard up to two Spirits for +4 each, discard Wellspring for undefendable'},2,
      {name:'Plant',text:'Branch + 2 Leaves · grow three Spirits',symbols:{Branch:1,Leaf:2},grow:3}],
    ['Vengeful Vines II',2,'Vengeful Vines',{damage:()=>8,text:'Small straight · inflict Barbed Vine and deal 8 damage'},2,
      {name:'Bitterroot',text:'3 Leaves · deal 1 pure damage per Spirit',symbols:{Leaf:3},spiritDamage:true,type:'pure'}],
    ['Call of the Wild II',2,'Call of the Wild',{effectCount:5,text:'Large straight · 8 damage plus Branches, Leaves grant Wellspring and Spirits grow'} ,2,
      {name:'Enrapture',text:'2 Branches + 2 Spirits · inflict Barbed Vine and deal 4 undefendable damage',symbols:{Branch:2,Spirit:2},barbed:true,damage:()=>4,type:'undefendable'}],
    ['Nature’s Grasp II',2,'Nature’s Grasp',{damage:()=>6,text:'4 Spirits · grow two, then deal 6 + current Spirits as undefendable damage'},2,
      {name:'Nature’s Blessing',text:'3 Spirits · heal one, gain 1 CP, draw one and grow a Spirit',symbols:{Spirit:3},heal:()=>1,cpGain:1,draw:1,grow:1}],
    ['Rooted II',3,'defence',{}]
  ];
  const cards = [['Harvest!',0,'main'],['Cultivate!',3,'main'],['Will o’ Wisp!',1,'main'],['Down Pour!',2,'main'],['Stomp!',1,'roll'],['Drink Deep!',1,'instant'],['Mother Tree!',0,'main']];

  const effects = {
    callWild(p, counts) {
        const {Branch=0,Leaf=0,Spirit=0}=counts;
        p.damage+=Branch;
        p.wellsSelf=Leaf>0;
        p.grow=Spirit;
    },
  };

  return {
    turnStartUpkeep: 'every-turn',
    leafletPositives: {wellspring: true},
    board,
    upgrades,
    cards,
    effects,

    resolveCardRoll({id, p, opponent, counts, hit, s, seat, updateDamage, grantStatus, grantAttackStatus, queueGrowth, startSideDamage}) {
      if(id===29){
       if(counts.Leaf)grantStatus(p,'wellspring');
       const damage=Number(!!counts.Branch);
       if(counts.Spirit&&queueGrowth(s,seat,1,'Will o’ Wisp!','resume',{collateral:damage}))return true;
       if(damage)startSideDamage(s,1-seat,damage,'Will o’ Wisp!');
      }
      if(id===31){
       const damage=counts.Branch??0;
       hit.grossDamage+=damage;
       updateDamage(hit);
       if(damage>=3)grantAttackStatus(s,opponent,'barbed');
      }
    },

    resolvePromo({s, seat, queueGrowth}) {
      queueGrowth(s,seat,4,'Mother Tree!');
    },

    applyCard({id, s, seat, p, c, choice, bounded, grantStatus, discardSpirits, spiritTypes, spiritTotal, queueGrowth}) {
      if(id===27){
       const discarded=discardSpirits(p,choice.spirits);
       gainCP(p,discarded);
       if(discarded>=2){
        s.harvestResume=s.stage;
        s.stage='harvestWells';
       }
       return true;
      }
      if(id===28){queueGrowth(s,seat,3,c.name);return true;}
      if(id===30){
       const original=Object.fromEntries(spiritTypes.map(k=>[k,p[k]??0]));
       queueGrowth(s,seat,spiritTotal(p),c.name,'resume',{original});
       return true;
      }
      if(id===32){grantStatus(s.players[choice.target],'wellspring');return true;}
    },

    cardRollSize(id) {
      return ({29: 3, 31: 5})[id] ?? 0;
    },

    complexity: 6,
    defenceDiceCount(defender) {
      return defender.upgrades?.defence ? 4 : 3;
    },

    resolveDefence({state, seat, defender, counts, updateDamage, queueGrowth}) {
      const {Branch=0,Leaf=0,Spirit=0}=counts,p=state.pending;
      p.prevention=(p.prevention??0)+Branch+Spirit;
      updateDamage(p);
      state.stage=defender.upgrades?.defence&&Spirit>=2?'defenceWells':'damage';
      if(Leaf>=2)queueGrowth(state,seat,1,'Rooted');
      return state.stage;
    }
  };
})();
