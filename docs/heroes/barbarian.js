// Classic script so the same hero module loads from the Pages cache and local files.
const barbarian = (() => {
  const concussId = 29;
  const headBashId = 30;
  const getSomeId = 31;
  const feelinGoodId = 32;
  const headBashDamage = 8;
  const overpowerThreshold = 14;

  const board = { name: 'Barbarian', symbols: ['Sword','Sword','Sword','Life','Life','POW'], defence: 'Thick Skin',
    abilities: [
      { name: 'Smack', text: '3–5 Swords · 4 / 6 / 8 damage', symbols: {Sword:3}, damage: count => 2 * count.Sword - 2 },
      { name: 'Sturdy Blow', text: '2 Swords + 2 POW · 4 undefendable', symbols: {Sword:2, POW:2}, damage: () => 4, type:'undefendable' },
      { name: 'Fortitude', text: '3–5 Life · heal 4 / 5 / 6', symbols: {Life:3}, heal: count => count.Life + 1 },
      { name: 'Mighty Blow', text: 'Small straight · 9 damage', straight:4, damage: () => 9 },
      { name: 'Overpower', text: '3 Swords + 2 POW · roll 3 dice for damage', symbols:{Sword:3, POW:2}, effect:'overpower', threshold:overpowerThreshold },
      { name: 'Crit Bash', text: '4 POW · Stun and 5 undefendable damage', symbols:{POW:4}, damage:() => 5, type:'undefendable', stun:true },
      { name: 'Reckless', text: 'Large straight · 15 damage, take 4 if it hits', straight:5, damage:() => 15, recoil:4 },
      { name: 'Rage!', text: '5 POW · Stun and 15 Ultimate damage', symbols:{POW:5}, damage:() => 15, type:'ultimate', stun:true }
    ] };
  const upgrades = [
    ['Smack II',2,'Smack',{damage:c=>2*c.Sword-1,matchUndefendable:4,text:'3–5 Swords · 5 / 7 / 9 damage, undefendable on four matching numbers'}],
    ['Smack III',3,'Smack',{damage:c=>2*c.Sword,matchUndefendable:4,text:'3–5 Swords · 6 / 8 / 10 damage, undefendable on four matching numbers'},3],
    ['Sturdy Blow II',1,'Sturdy Blow',{damage:()=>5,text:'2 Swords + 2 POW · 5 undefendable'}],
    ['Sturdy Blow III',2,'Sturdy Blow',{damage:()=>6,text:'2 Swords + 2 POW · 6 undefendable'},3],
    ['Mighty Blow II',2,'Mighty Blow',{damage:()=>8,type:'undefendable',text:'Small straight · 8 undefendable'}],
    ['Crit Bash II',2,'Crit Bash',{damage:()=>7,text:'4 POW · Stun and 7 undefendable'},2,{name:'Crit Smash',text:'3 POW · Concussion and 2 undefendable',symbols:{POW:3},damage:()=>2,type:'undefendable',concussion:true}],
    ['Fortitude II',2,'Fortitude',{heal:c=>c.Life+2,cleanseMatch:3,text:'3–5 Life · heal 5 / 6 / 7, remove one status on three matching numbers'}],
    ['Overpower II',2,'Overpower',{threshold:10,text:'3 Swords + 2 POW · roll 3 dice, Concussion on 10+'},2,{name:'War Cry',text:'2 Swords + 2 Life · heal 2 and deal 2 undefendable',symbols:{Sword:2,Life:2},heal:()=>2,damage:()=>2,type:'undefendable'}],
    ['Reckless II',2,'Reckless',{damage:()=>20,recoil:5,text:'Large straight · 20 damage, take 5 if it hits'}],
    ['Thick Skin II',3,'defence',{}]
  ];
  const cards = [['Concuss!',1,'main'],['Head Bash!',0,'roll'],['Get Some!',2,'roll'],["Feelin’ Good!",0,'instant'],['Adrenaline Surge!',0,'main']];

  return {
    id: 0,
    board,
    upgrades,
    cards,
    headBashId,
    attackModifierId: getSomeId,

    canPlayHeadBash(state, seat) {
      return state.stage === 'postHit' && seat === state.active &&
        state.pending.successful >= headBashDamage;
    },

    offersHeadBash(pending, attacker, damage) {
      return !pending.stun && !pending.ultimate && damage >= headBashDamage &&
        attacker.hand.includes(headBashId);
    },

    applyCardAfterShared({id, opponent, grantStatus}) {
      if (id !== concussId && id !== headBashId) return false;
      grantStatus(opponent, 'concussion');
      return true;
    },

    cardRollSize(id) {
      if (id === getSomeId) return 5;
      if (id === feelinGoodId) return 3;
      return 0;
    },

    resolveCardRoll({id, p, opponent, counts, hit, s, bounded, updateDamage, grantAttackStatus}) {
      if (id === getSomeId) {
        hit.grossDamage += counts.Sword ?? 0;
        updateDamage(hit);
        grantAttackStatus(s, opponent, 'concussion');
      }
      if (id === feelinGoodId) p.hp = bounded(p.hp + 1 + 2 * (counts.Life ?? 0), 60);
    },

    resolvePromo({p, opponent, bounded, grantStatus}) {
      p.hp = bounded(p.hp + 2, 60);
      grantStatus(opponent, 'concussion');
    },

    effects: {
      overpower(pending) {
        pending.damage = pending.effectDice.reduce((sum, value) => sum + value, 0);
        pending.concussion = pending.damage >= pending.threshold;
      }
    },
    effectDiceCount: {overpower: 3},

    defenceDiceCount(defender) {
      return defender.upgrades?.defence ? 4 : 3;
    },

    resolveDefence({state, defender, counts, bounded, add}) {
      const old = defender.hp;
      defender.hp = bounded(old + 2 * (counts.Life ?? 0), 60);
      if (defender.hp > old) add(`Thick Skin heals ${defender.hp - old}.`);
      if (defender.upgrades?.defence && (counts.Life ?? 0) >= 2 &&
          state.pending.incomingStatus?.length) return 'preventStatus';
    }
  };
})();
