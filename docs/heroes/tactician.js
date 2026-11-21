const tactician = (() => {
  const id = 14;
  const board = {name:'Tactician',symbols:['Saber','Saber','Saber','Flag','Flag','Medal'],defence:'Countermeasures',abilities:[
    {name:'Saber Strike',symbols:{Saber:3},damage:c=>c.Saber+1,text:'3–5 Sabers · 4 / 5 / 6 damage'},
    {name:'Carpet Bomb',symbols:{Saber:2,Medal:2},tacticalGain:1,collateral:2,text:'2 Sabers + 2 Medals · gain Tactical Advantage and deal 2 collateral damage to each of up to two opponents'},
    {name:'Profiteer',symbols:{Flag:3,Saber:1},effect:'profiteer',effectCount:1,profiteer:[1,5,4],text:'3 Flags + Saber · gain Tactical Advantage and roll one die for damage, more Tactical Advantage or an additional Offensive Roll Phase'},
    {name:'Strategic Approach',symbols:{Saber:3,Medal:2},constrict:true,damage:()=>7,text:'3 Sabers + 2 Medals · inflict Constrict and deal 7 damage'},
    {name:'Flank',straight:4,tacticalGain:1,damage:()=>6,text:'Small straight · gain Tactical Advantage and deal 6 damage'},
    {name:'Exploit',straight:5,tacticalGain:2,constrict:true,damage:()=>9,text:'Large straight · gain 2 Tactical Advantage, inflict Constrict and deal 9 damage'},
    {name:'Maneuver',symbols:{Medal:4},tacticalGain:5,damage:()=>5,type:'undefendable',text:'4 Medals · gain 5 Tactical Advantage and deal 5 undefendable damage'},
    {name:'Higher Ground!',symbols:{Medal:5},constrict:true,targeted:true,tacticalCap:true,damage:()=>12,type:'ultimate',
      text:'5 Medals · inflict Targeted and Constrict, increase your Tactical Advantage cap by one and fill the stack, then deal 12 Ultimate damage'}
  ]};
  const upgrades = [
    ['Saber Strike II',1,'Saber Strike',{damage:c=>c.Saber+2,constrictMatch:3,text:'3–5 Sabers · 5 / 6 / 7 damage. Inflict Constrict on three of a kind.'}],
    ['Profiteer II',2,'Profiteer',{profiteer:[2,6,3],text:'3 Flags + Saber · gain 2 Tactical Advantage and roll one die for 6 damage, 3 more Tactical Advantage or an additional Offensive Roll Phase'}],
    ['Carpet Bomb II',2,'Carpet Bomb',{tacticalGain:2,text:'2 Sabers + 2 Medals · gain 2 Tactical Advantage and deal 2 collateral damage to each of up to two opponents'},2,
      {name:'Strategize',symbols:{Flag:4},tacticalGain:3,draw:2,text:'4 Flags · gain 3 Tactical Advantage and draw 2 cards'}],
    ['Strategic Approach II',2,'Strategic Approach',{tacticalGain:1,text:'3 Sabers + 2 Medals · gain Tactical Advantage, inflict Constrict and deal 7 damage'},2,
      {name:'Indirect Approach',symbols:{Saber:3,Flag:1},tacticalGain:2,damage:()=>2,type:'undefendable',text:'3 Sabers + Flag · gain 2 Tactical Advantage and deal 2 undefendable damage'}],
    ['Flank II',2,'Flank',{tacticalGain:2,text:'Small straight · gain 2 Tactical Advantage and deal 6 damage'}],
    ['Exploit II',2,'Exploit',{tacticalGain:3,text:'Large straight · gain 3 Tactical Advantage, inflict Constrict and deal 9 damage'},2,
      {name:'Interdiction',symbols:{Saber:1,Flag:2,Medal:1},draw:2,constrict:true,text:'Saber + 2 Flags + Medal · draw 2 cards and inflict Constrict'}],
    ['Maneuver II',2,'Maneuver',{constrict:true,text:'4 Medals · gain 5 Tactical Advantage, inflict Constrict and deal 5 undefendable damage'},2,
      {name:'Reconnaissance',symbols:{Medal:3},tacticalGain:5,text:'3 Medals · gain 5 Tactical Advantage'}],
    ['Countermeasures II',3,'defence',{}],
    ['Countermeasures III',5,'defence',{},3]
  ];
  const cards = [['Bunker Up!',2,'main'],['War Room!',1,'main'],['Feigned Retreat!',2,'roll'],
    ['Disengage!',0,'roll'],['Ambush!',1,'instant'],['Upper Hand!',0,'main']];
  return {
    leafletPositives: {
    tactical: (state, seat) => gainTactical(state, seat, 1),
    protect: true
   },
    id,board,upgrades,cards,promoId:33,
    initialize(s,seat){s.players[seat].tactical=2;},
    cardChoices(card,{s,seat,one}) {
      if(card===28)return heroNames(s).map((label,target)=>({label,target}));
      if(card===30||card===31){
        const hit=s.pending;
        return seat!==s.active&&hit?.attack&&!hit.ultimate&&!hit.stun&&!hit.parlayBlocked&&
          ['defence','defenceResponse','damage','gunContest','gunDuelChoice','purify'].includes(s.stage)?one:[];
      }
      return one;
    },
    applyCard({id:card,s,seat,opponent,choice,grantStatus,gainTactical,updateDamage}) {
      if(card===28)grantStatus(s.players[choice.target],'protect');
      else if(card===30){
        grantStatus(opponent,'constrict');
        s.pending.prevention=(s.pending.prevention??0)+3;
        updateDamage(s.pending);
      } else if(card===32)gainTactical(s,seat,2);
      else return false;
      return true;
    },
    cardRollSize(card) { return [29,31,33].includes(card)?1:0; },
    resolveCardRoll({id:card,p,s,seat,dice,counts,hit,grantStatus,gainTactical,updateDamage,drawCards,random}) {
      if(card===29)gainTactical(s,seat,Math.ceil(dice[0]/2));
      else if(card===31){
        if(counts.Saber)hit.disengageDamage=(hit.disengageDamage??0)+2;
        if(counts.Flag){hit.prevention=(hit.prevention??0)+3;updateDamage(hit);}
        if(counts.Medal)grantStatus(p,'protect');
      } else if(card===33){
        if(counts.Medal)gainTactical(s,seat,4);
        else drawCards(p,1,random,card);
      }
    },
    complexity: 5,
    defenceEffect: p => `Return ${p.upgrades?.defence === 27 ? 2 : 1} damage per pair of Sabers. Prevent 1 per Flag. Gain 1 Tactical Advantage per Medal.`,
    defenceDiceCount(p) { return p.upgrades?.defence?5:4; },
    resolveDefence({state,seat,defender,counts,gainTactical,updateDamage}) {
      const hit=state.pending, multiplier=defender.upgrades?.defence===27?2:1;
      hit.returnDamage=Math.floor((counts.Saber??0)/2)*multiplier;
      hit.prevention=(hit.prevention??0)+(counts.Flag??0);
      gainTactical(state,seat,counts.Medal??0);
      updateDamage(hit);
    }
  };
})();
