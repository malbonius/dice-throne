const vampireLord = (() => {
  const id = 11;
  const gouge = {Claw:3}, glamour = {Gaze:3}, rend = {Claw:3,Droplet:2};
  const board = {name:'Vampire Lord',symbols:['Claw','Claw','Claw','Gaze','Gaze','Droplet'],defence:'Immortal Flesh',abilities:[
    {name:'Gouge',symbols:gouge,damage:c=>2*c.Claw-3,bloodMatch:4,text:'3–5 Claws · 3 / 5 / 7 damage. Gain Blood Power on four of a kind.'},
    {name:'Glamour',symbols:glamour,cpGain:1,mesmerize:true,damage:()=>4,type:'undefendable',text:'3 Gazes · gain 1 CP and Mesmerize. Deal 4 undefendable damage.'},
    {name:'Sanguimancy',symbols:{Gaze:3,Droplet:1},heal:()=>2,bloodGain:3,text:'3 Gazes + Droplet · heal 2 and gain 3 Blood Power.'},
    {name:'Rend',symbols:rend,damage:()=>6,effect:'vampireRend',effectCount:3,text:'3 Claws + 2 Droplets · 6 damage, then roll 3 for bonus damage, a card or Blood Power.'},
    {name:'Possess',straight:4,damage:()=>7,effect:'vampirePossess',effectCount:1,text:'Small straight · 7 damage. Roll 1 for Bleed or Mesmerize.'},
    {name:'Blood Magic',straight:5,damage:()=>8,bloodGain:1,bleed:1,bloodMagic:true,text:'Large straight · gain Blood Power, inflict Bleed and deal 8 damage. May spend Mesmerize to make it undefendable.'},
    {name:'Blood Thirst',symbols:{Droplet:4},damage:()=>5,bloodGain:2,type:'undefendable',text:'4 Droplets · gain 2 Blood Power and deal 5 undefendable damage.'},
    {name:'Exsanguinate!',symbols:{Droplet:5},damage:()=>10,bloodGain:2,search:true,type:'ultimate',text:'5 Droplets · search your deck for a card, gain 2 Blood Power and deal 10 Ultimate damage.'}
  ]};
  const upgrades = [
    ['Gouge II',1,'Gouge',{bloodMatch:3,text:'3–5 Claws · 3 / 5 / 7 damage. Gain Blood Power on three of a kind.'}],
    ['Gouge III',2,'Gouge',{damage:c=>2*c.Claw-2,bloodMatch:3,text:'3–5 Claws · 4 / 6 / 8 damage. Gain Blood Power on three of a kind.'},3],
    ['Glamour II',2,'Glamour',{damage:()=>5,text:'3 Gazes · gain 1 CP and Mesmerize. Deal 5 undefendable damage.'},2,
      {name:'Influence',symbols:{Claw:1,Gaze:2},mesmerize:true,bleed:2,text:'Claw + 2 Gazes · gain Mesmerize and inflict 2 Bleed.'}],
    ['Possess II',2,'Possess',{damage:()=>8,effect:null,possessChoice:true,text:'Small straight · 8 damage. Choose to inflict Bleed or gain Mesmerize.'},2,
      {name:'Draw Blood',symbols:{Claw:2,Droplet:1},bloodGain:2,text:'2 Claws + Droplet · gain 2 Blood Power.'}],
    ['Blood Thirst II',2,'Blood Thirst',{damage:()=>6,bloodGain:3,text:'4 Droplets · gain 3 Blood Power and deal 6 undefendable damage.'},2,
      {name:'Hemorrhage',symbols:{Droplet:3},bleed:2,collateral:2,text:'3 Droplets · inflict 2 Bleed and deal 2 collateral damage.'}],
    ['Sanguimancy II',2,'Sanguimancy',{heal:()=>3,text:'3 Gazes + Droplet · heal 3 and gain 3 Blood Power.'},2,
      {name:'Presence',symbols:{Claw:1,Gaze:1,Droplet:2},bloodGain:2,draw:1,text:'Claw + Gaze + 2 Droplets · gain 2 Blood Power and draw a card.'}],
    ['Rend II',2,'Rend',{effectCount:5,text:'3 Claws + 2 Droplets · 6 damage, then roll 5 for bonus damage, a card or Blood Power.'}],
    ['Blood Magic II',2,'Blood Magic',{type:'undefendable',bloodMagic:false,text:'Large straight · gain Blood Power, inflict Bleed and deal 8 undefendable damage.'},2,
      {name:'Gash',symbols:{Claw:2,Droplet:2},damage:()=>5,type:'undefendable',text:'2 Claws + 2 Droplets · deal 5 undefendable damage.'}],
    ['Immortal Flesh II',2,'defence',{}]
  ];
  const cards = [['Dark Omen!',4,'main'],['Consume Blood!',0,'main'],['Blood Letting!',0,'main'],
    ['Blood Flow!',1,'instant'],['Blood Boil!',0,'roll'],['Limb from Limb!',1,'roll'],['Blood Tide!',0,'main']];
  const usage = (s,seat)=>s.players[seat].bloodSpent?.turn===s.turn?s.players[seat].bloodSpent:{turn:s.turn};
  return {
    leafletPositives: {
    bloodPower: (state, seat) => gainBloodPower(state, seat, 1),
    mesmerize: true
   },
    id,board,upgrades,cards,promoId:34,usage,
    effects:{
      vampireRend(hit,counts) {
        hit.damage+=counts.Claw??0;
        hit.draw=Number(!!counts.Gaze);
        hit.bloodGain=Number(!!counts.Droplet);
      },
      vampirePossess(hit,counts) {
        hit.bleed=Number(!!counts.Claw);
        hit.mesmerize=!!(counts.Gaze||counts.Droplet);
      }
    },
    cardChoices(card,{s,seat,one}) {
      if(card===29)return Array.from({length:1+Math.min(2,s.players[seat].bloodPower??0)},(_,amount)=>({amount,label:`Spend ${amount} Blood Power`}));
      if(card===32||card===33){
        const hit=s.pending;
        return seat===s.active&&hit?.attack&&!hit.pure&&!hit.evaded&&!hit.parlayBlocked&&
          ['defence','defenceResponse','damage','locked'].includes(s.stage)?one:[];
      }
      return one;
    },
    applyCard({id:card,s,seat,p,opponent,choice,bounded,grantStatus,gainBloodPower,updateDamage}) {
      if(card===28){
        grantStatus(p,'mesmerize');
        gainBloodPower(s,seat,2);
        grantStatus(opponent,'bleed');
      } else if(card===29){
        if(choice.amount)p.bloodPower-=choice.amount;
        gainCP(p,2*choice.amount);
      } else if(card===30){
        gainCP(p,1);
        gainBloodPower(s,seat,1);
      } else if(card===32){
        s.pending.grossDamage+=1+(opponent.bleed??0);
        updateDamage(s.pending);
      } else return false;
      return true;
    },
    cardRollSize(card) { return card===33?5:[31,34].includes(card)?1:0; },
    resolveCardRoll({id:card,dice,p,opponent,counts,hit,s,seat,gainBloodPower,grantAttackStatus,updateDamage,drawCards,random}) {
      if(card===31)gainBloodPower(s,seat,Math.ceil(dice[0]/2));
      if(card===33){
        const extra=counts.Claw??0;
        hit.grossDamage+=extra;
        if(extra>=3)grantAttackStatus(s,opponent,'bleed');
        updateDamage(hit);
      }
      if(card===34){
        if(counts.Droplet)gainBloodPower(s,seat,3);
        else drawCards(p,1,random,card);
      }
    },
    complexity: 4,
    defenceDiceCount(p) { return p.upgrades?.defence?4:3; },
    resolveDefence({state,seat,attacker,defender,counts,bounded,grantStatus,removeStatus,gainBloodPower,add}) {
      if(counts.Claw>=2)grantStatus(attacker,'bleed');
      if(counts.Gaze>=2)gainBloodPower(state,seat,1);
      if(!counts.Droplet)return;
      const stolen=Math.min(attacker.hp,counts.Droplet), names=heroNames(state);
      attacker.hp-=stolen;
      defender.hp=bounded(defender.hp+stolen,60);
      add(`${names[seat]} steals ${stolen} Health with Immortal Flesh.`);
      if(!attacker.hp&&attacker.blessing){
        removeStatus(attacker,'blessing');
        attacker.hp=1;
        add(`${names[1-seat]} survives through Blessing of Divinity.`);
      }
      reviveNecromancer(attacker);
      if(!attacker.hp){
        delete state.bloodOverflow;
        state.winner=`${names[seat]} wins`;
        add(state.winner);
        return 'finished';
      }
    }
  };
})();
