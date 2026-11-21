const artificer = (() => {
  const id = 9;
  const bots = {nanobot:'Nanobot',shockbot:'Shock Bot',healbot:'Heal Bot'};
  const buildChoices = p => Object.keys(bots).filter(bot=>(p.bots?.[bot]??0)<2);
  const cost = (p,bot) => p.bots?.[bot]===2?1:2;
  const naniteDamage = count => count ? 2*count-1 : 0;
  const gearCombo = {Gear:3,Bolt:1}, eurekaCombo = {Wrench:2,Gear:3};
  const board = {name:'Artificer',symbols:['Wrench','Wrench','Wrench','Gear','Gear','Bolt'],defence:'Ratchet Up',abilities:[
    {name:'Spanner Strike',text:'3–5 Wrenches · 3 / 4 / 5 damage, then roll one die or spend 1 Synth to roll three',symbols:{Wrench:3},damage:c=>c.Wrench,effect:'spanner',effectCount:1},
    {name:'Schematics',text:'3 Gears + Bolt · draw 2, heal 2 and gain 4 Synth',symbols:gearCombo,draw:2,heal:()=>2,synth:4},
    {name:'Eureka',text:'2 Wrenches + 3 Gears · gain 3 Synth and deal 7 damage',symbols:eurekaCombo,synth:3,damage:()=>7},
    {name:'Jolt',text:'Small straight · gain 1 Synth, inflict Nanite and deal 7 damage',straight:4,synth:1,nanite:1,damage:()=>7},
    {name:'Zapppp!',text:'Large straight · inflict Nanite, deal 9 damage and activate one built Bot for free',straight:5,nanite:1,damage:()=>9,freeBots:1,freeRequired:true},
    {name:'Overclock',text:'4 Bolts · 6 undefendable damage and activate up to two different built Bots for free',symbols:{Bolt:4},damage:()=>6,type:'undefendable',freeBots:2},
    {name:'Maximum Power!',text:'5 Bolts · gain 2 Synth, inflict Nanite, deal 10 Ultimate damage and activate up to two different built Bots for free',symbols:{Bolt:5},synth:2,nanite:1,damage:()=>10,type:'ultimate',freeBots:2}
  ]};
  const upgrades = [
    ['Spanner Strike II',1,'Spanner Strike',{damage:c=>c.Wrench+1,text:'3–5 Wrenches · 4 / 5 / 6 damage, then roll one die or spend 1 Synth to roll three'}],
    ['Schematics II',1,'Schematics',{cpGain:2,text:'3 Gears + Bolt · gain 2 CP, draw 2, heal 2 and gain 4 Synth'}],
    ['Jolt II',2,'Jolt',{nanite:2,text:'Small straight · gain 1 Synth, inflict 2 Nanites and deal 7 damage'},2,{name:'Nuts N’ Bolts',symbols:{Wrench:3,Bolt:1},synth:5,text:'3 Wrenches + Bolt · gain 5 Synth'}],
    ['Overclock II',2,'Overclock',{nanite:1,text:'4 Bolts · inflict Nanite, deal 6 undefendable damage and activate up to two different built Bots for free'},2,{name:'Power Up',symbols:{Bolt:3},nanite:3,text:'3 Bolts · inflict 3 Nanites'}],
    ['Scrap Collector II',2,'Scrap Collector',{}],
    ['Eureka II',2,'Eureka',{damage:()=>8,text:'2 Wrenches + 3 Gears · gain 3 Synth and deal 8 damage'},2,{name:'Scratch Built',symbols:{Wrench:2,Gear:2},scratchBuilt:true,text:'2 Wrenches + 2 Gears · build or upgrade an Advanced Bot for free'}],
    ['Zapppp! II',2,'Zapppp!',{synth:2,text:'Large straight · gain 2 Synth, inflict Nanite, deal 9 damage and activate one built Bot for free'},2,{name:'Swarming Bots',symbols:{Wrench:1,Gear:2,Bolt:1},damage:()=>5,swarming:true,text:'Wrench + 2 Gears + Bolt · deal 5 damage plus 1 per built Bot'}],
    ['Ratchet Up II',3,'defence',{}],
  ];
  const cards = [['Arcing Shield',0,'roll'],['High Voltage!',1,'instant'],['Nanite Assault!',1,'instant'],['Conductivity!',0,'instant'],
    ['Oooh Shiny!',0,'instant'],['Robo Revenge!',1,'roll'],['Synthesize!',0,'main']];

  function detonate(state) {
    return state.players.map(player=>{
      const damage=naniteDamage(player.nanite);
      if(damage)player.nanite=0;
      return damage;
    });
  }

  function freeChoices(state) {
    const player=state.players[state.active], hit=state.pending;
    return Object.keys(bots).filter(bot=>player.bots?.[bot]&&!hit.freeUsed?.includes(bot)&&
      (bot!=='shockbot'||player.shockTurn!==state.turn));
  }

  function upkeep(state) {
    if(state.artUpkeep?.turn!==state.turn)state.artUpkeep={turn:state.turn};
    return state.artUpkeep;
  }

  return {
    turnStartUpkeep: 'every-turn',
    leafletPositives: {synth: true},
    id, board, upgrades, cards, promoId:33, bots, buildChoices, cost, detonate, freeChoices, upkeep,
    initialize(state,seat) {
      state.players[seat].synth=3;
      state.players[seat].bots={};
    },
    actions(s,seat,{isMain,attackLocked,modifiedAttackDamage}) {
      const p=s.players[seat], hit=s.pending, active=s.active===seat;
      if(!s.cards||s.retry||s.growth||s.mainChoice||s.pirateChoice||s.artRoll||s.cardRoll||
         ['finished','discard','artBuild','artSpanner'].includes(s.stage)||
         (!active&&attackLocked(s)))return [];
      const options=[];
      if(p.synth>=4&&s.players[1-seat].nanite!==3)options.push({key:'nanite',label:'Inflict Nanite · 4 Synth'});
      if(s.stage==='artFreeBots')return active?options:[];
      if(active&&isMain(s)&&!s.mainAction)for(const bot of buildChoices(p)){
        const built=p.bots?.[bot], price=built?3:2;
        if(p.synth>=price)options.push({key:bot,label:`${built?'Upgrade':'Build'} ${bots[bot]} · ${price} Synth`});
      }
      const attackWindow=['defence','defenceResponse','damage'].includes(s.stage);
      if(p.bots?.nanobot&&active&&s.stage==='upkeep'&&s.artUpkeep?.nanoTurn!==s.turn&&s.players.some(p=>p.nanite)&&p.synth>=cost(p,'nanobot'))
        options.push({key:'nano',label:`Detonate Nanites · ${cost(p,'nanobot')} Synth`});
      if(p.bots?.shockbot&&active&&(attackWindow||s.stage==='locked')&&hit?.attack&&!hit.pure&&!hit.evaded&&!hit.parlayBlocked&&
         p.shockTurn!==s.turn&&p.synth>=cost(p,'shockbot'))
        options.push({key:'shock',label:`Shock Bot · +3 damage · ${cost(p,'shockbot')} Synth`});
      if(p.bots?.healbot&&!active&&s.stage==='damage'&&hit?.attack&&!hit.ultimate&&!hit.stun&&!hit.pure&&!hit.parlayBlocked&&modifiedAttackDamage(hit)>=6&&
         (hit.healBotUses??0)<2&&p.synth>=cost(p,'healbot'))
        options.push({key:'heal',label:`Heal Bot · ${cost(p,'healbot')} Synth`});
      return options;
    },
    effects: {
      spanner(hit, counts, {attacker, grantStatus}) {
        hit.damage+=Number(!!counts.Wrench)+2*Number(!!counts.Gear);
        if(counts.Bolt)grantStatus(attacker,'synth',counts.Bolt);
      }
    },
    cardRollSize(card) { return [30,31,33].includes(card)?1:0; },
    cardChoices(card,{s,seat,one}) {
      if(![27,32].includes(card))return one;
      const hit=s.pending;
      if(seat===s.active||!hit?.attack||hit.ultimate||hit.pure||hit.parlayBlocked||
         !['defence','defenceResponse','damage'].includes(s.stage))return [];
      if(card===27&&s.players[seat].synth>0)return [{label:'Prevent 2 damage',amount:2},{label:'Spend 1 Synth to prevent 3 damage',amount:3}];
      return one;
    },
    applyCard({id:card,s,seat,p,opponent,choice,grantStatus,grantAttackStatus,updateDamage}) {
      switch(card){
        case 27:
        case 32:
          if(choice.amount===3)p.synth--;
          s.pending.prevention=(s.pending.prevention??0)+(choice.amount??2);
          if(card===32)grantStatus(opponent,'nanite');
          updateDamage(s.pending);
          return true;
        case 28: grantStatus(p,'synth',2); return true;
        case 29:
          if(seat===s.active&&s.pending?.incomingStatus&&['defence','defenceResponse'].includes(s.stage))
            grantAttackStatus(s,opponent,'nanite');
          else grantStatus(opponent,'nanite');
          return true;
        default: return false;
      }
    },
    resolveCardRoll({id:card,dice,p,opponent,counts,bounded,grantStatus,drawCards,random}) {
      if(card===30){
        if(counts.Wrench)gainCP(p,2);
        if(counts.Gear)grantStatus(p,'synth');
        if(counts.Bolt)grantStatus(opponent,'nanite');
      }
      if(card===31)grantStatus(p,'synth',Math.ceil(dice[0]/2));
      if(card===33){
        if(counts.Bolt)grantStatus(p,'synth',5);
        else drawCards(p,1,random,card);
      }
    },
    complexity: 6,
    defenceDiceCount(p) { return p.upgrades?.defence?5:4; },
    resolveDefence({defender,attacker,counts,state,grantStatus}){
      if(counts.Gear)grantStatus(defender,'synth',counts.Gear);
      if(counts.Bolt)grantStatus(attacker,'nanite',defender.upgrades?.defence?counts.Bolt:1);
      if(defender.upgrades?.defence&&(counts.Wrench??0)>=2)state.pending.returnDamage=1;
    }
  };
})();
