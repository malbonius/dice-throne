const moonElf = (() => {
  const board = { name: 'Moon Elf', symbols: ['Arrow','Arrow','Arrow','Foot','Foot','Moon'], defence: 'Missed Me',
    abilities: [
      { name: 'Longbow', text: '3–5 Arrows · 4 / 5 / 7 damage', symbols: {Arrow:3}, damage: count => count.Arrow === 3 ? 4 : 2 * count.Arrow - 3 },
      { name: 'Covered Shot', text: '2 Arrows + 3 Feet · 7 damage, gain Evasive', symbols: {Arrow:2, Foot:3}, damage: () => 7, evasive:true },
      { name: 'Entangling Shot', text: 'Small straight · 7 damage, inflict Entangle', straight:4, damage: () => 7, entangle:true },
      { name: 'Blinding Shot', text: 'Large straight · 8 damage, gain Evasive and inflict Blind', straight:5, damage: () => 8, evasive:true, blind:true },
      { name: 'Demising Shot', text: '3 Arrows + 2 Moons · Targeted and 4 damage', symbols:{Arrow:3, Moon:2}, damage:() => 4, targeted:true },
      { name: 'Exploding Arrow', text: '1 Arrow + 3 Moons · roll 5 dice for damage and CP loss, inflict Blind', symbols:{Arrow:1, Moon:3}, effect:'exploding', blind:true },
      { name: 'Eclipse', text: '4 Moons · Blind, Entangle, Targeted and 7 damage', symbols:{Moon:4}, damage:() => 7, blind:true, entangle:true, targeted:true },
      { name: 'Lunar Eclipse!', text: '5 Moons · Evasive, Blind, Entangle, Targeted and 12 Ultimate damage', symbols:{Moon:5}, damage:() => 12, evasive:true, blind:true, entangle:true, targeted:true, type:'ultimate' }
    ]};
  const upgrades = [
    ['Longbow II',2,'Longbow',{damage:c=>2*c.Arrow-2,matchEntangle:4,text:'3–5 Arrows · 4 / 6 / 8 damage, Entangle on four matching numbers'}],
    ['Longbow III',3,'Longbow',{damage:c=>2*c.Arrow-1,matchEntangle:3,text:'3–5 Arrows · 5 / 7 / 9 damage, Entangle on three matching numbers'},3],
    ['Demising Shot II',2,'Demising Shot',{damage:()=>6,text:'3 Arrows + 2 Moons · Targeted and 6 damage'},2,{name:'Focus',text:'2 Arrows + 1 Moon · Targeted and Entangle',symbols:{Arrow:2,Moon:1},targeted:true,entangle:true}],
    ['Covered Shot II',2,'Covered Shot',{damage:()=>9,text:'2 Arrows + 3 Feet · Evasive and 9 damage'},2,{name:'Evasive Action',text:'3 Feet · chosen hero gains Evasive, 2 undefendable',symbols:{Foot:3},damage:()=>2,type:'undefendable',grantEvasive:true}],
    ['Exploding Arrow II',2,'Exploding Arrow',{footDamage:2,text:'1 Arrow + 3 Moons · effect roll, Foot faces deal 2 damage'}],
    ['Exploding Arrow III',3,'Exploding Arrow',{footDamage:2,entangle:true,text:'1 Arrow + 3 Moons · upgraded effect roll, Blind and Entangle'},3],
    ['Entangling Shot II',2,'Entangling Shot',{damage:()=>9,text:'Small straight · Entangle and 9 damage'}],
    ['Blinding Shot II',2,'Blinding Shot',{damage:()=>10,text:'Large straight · Blind, Evasive and 10 damage'},2,{name:'Lunar Blessing',text:'1 Arrow + 2 Feet + 1 Moon · gain 3 Evasive, inflict Entangle',symbols:{Arrow:1,Foot:2,Moon:1},evasive:3,entangle:true}],
    ['Eclipse II',2,'Eclipse',{damage:()=>9,text:'4 Moons · Blind, Entangle, Targeted and 9 damage'},2,{name:'Moon Shadow',text:'3 Moons · gain Evasive, inflict Blind, Entangle and Targeted',symbols:{Moon:3},evasive:true,blind:true,entangle:true,targeted:true}],
    ['Missed Me II',3,'defence',{}]
  ];
  const cards = [['Moon Magic!',4,'main'],['Take That!',0,'roll'],['Volley!',1,'roll'],['Evade!',1,'instant'],['Lunar Umbra!',0,'main']];

  const effects = {
    exploding(p, counts) {
        p.damage=3+(counts.Arrow ?? 0)+p.footDamage*(counts.Foot ?? 0);
        p.cpLoss=counts.Moon ?? 0;
    },
  };

  return {
    leafletPositives: {evasive: true},
    board,
    upgrades,
    cards,
    effects,

    resolveCardRoll({id, opponent, counts, hit, s, updateDamage, grantAttackStatus}) {
      if(id===31){
       hit.grossDamage+=counts.Arrow??0;
       updateDamage(hit);
       grantAttackStatus(s,opponent,'entangle');
      }
      if(id===30){
       if(counts.Arrow){hit.grossDamage+=2;updateDamage(hit);}
       else grantAttackStatus(s,opponent,counts.Foot?'entangle':'blind');
      }
    },

    resolvePromo({opponent, grantStatus}) {
      for(const key of ['blind','entangle','targeted'])grantStatus(opponent,key);
    },

    cardRollSize(id) {
      return ({30: 1, 31: 5})[id] ?? 0;
    },

    applyCardAfterShared({id, s, p, opponent, choice, grantStatus}) {
      if (id === 29) {
        grantStatus(p,'evasive');
        for (const key of ['blind','entangle','targeted']) grantStatus(opponent,key);
        return true;
      }
      if (id === 32) {
        grantStatus(s.players[choice.target],'evasive');
        return true;
      }
    },

    complexity: 2,
    defenceDiceCount() {
      return 5;
    },

    resolveDefence({state, defender, counts, updateDamage, add}) {
      const p = state.pending;
      if ((counts.Foot ?? 0) >= 2) {
        const prevention = Math.ceil(p.damage / 2);
        if(state.cards){p.halfDefence=true;updateDamage(p);}
        else p.damage -= prevention;
        add(`Missed Me prevents ${prevention} damage.`);
      }
      p.returnDamage = defender.upgrades?.defence?(counts.Arrow??0):Math.floor((counts.Arrow ?? 0) / 2);
    }
  };
})();
