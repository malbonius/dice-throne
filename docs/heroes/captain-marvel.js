const captainMarvel=(()=>{
  const id=26,star='Hala Star';
  const board={name:'Captain Marvel',symbols:['Photon','Photon','Photon','Ascend','Ascend',star],defence:'Energy Refraction',abilities:[
    {name:'Photon Punch',symbols:{Photon:3},damage:c=>c.Photon+2,flareMatch:4,text:'3–5 Photons · deal 5 / 6 / 7 damage. Four matching numbers gain Cosmic Flare.'},
    {name:'Inner Light',symbols:{Photon:2,[star]:2},damage:()=>4,type:'pure',radiance:1,text:'Gain Radiance. Deal 4 pure damage.'},
    {name:'Barrel Roll',symbols:{Photon:1,Ascend:3},damage:()=>6,effect:'marvelBarrel',effectCount:2,text:'Deal 6 damage and roll 2 dice: each Photon adds 2 damage, each Ascend gains Cosmic Flare, any Hala Star gains Cosmic Ray.'},
    {name:'Aurora Wave',symbols:{Photon:2,Ascend:1,[star]:2},cosmicRay:1,effect:'marvelAurora',effectCount:2,text:'Gain Cosmic Ray. Roll 2 dice and deal their total value as damage.'},
    {name:'Photonic',straight:4,radiance:1,damage:()=>7,text:'Gain Radiance. Deal 7 damage.'},
    {name:'Light Torpedo',straight:5,cosmicRay:1,damage:()=>7,type:'undefendable',text:'Gain Cosmic Ray. Deal 7 undefendable damage.'},
    {name:'Supernova',symbols:{[star]:4},cosmicRay:1,radiance:1,cosmicFlare:2,damage:()=>5,type:'undefendable',text:'Gain Cosmic Ray, Radiance and 2 Cosmic Flare. Deal 5 undefendable damage.'},
    {name:'Binary Blast!',symbols:{[star]:5},cosmicRay:1,radiance:1,cosmicFlare:2,damage:()=>12,type:'ultimate',text:'Gain Cosmic Ray, Radiance and 2 Cosmic Flare. Deal 12 Ultimate damage.'}
  ]};
  const upgrades=[
    ['Photon Punch II',2,'Photon Punch',{damage:c=>c.Photon+3,flareMatch:3,text:'3–5 Photons · deal 6 / 7 / 8 damage. Three matching numbers gain Cosmic Flare.'}],
    ['Inner Light II',2,'Inner Light',{damage:()=>5,text:'Gain Radiance. Deal 5 pure damage.'},2,{name:'Cosmic Recharge',symbols:{Ascend:3,[star]:1},radiance:2,cosmicFlare:3,text:'Gain 2 Radiance and 3 Cosmic Flare.'}],
    ['Supernova II',2,'Supernova',{damage:()=>7,text:'Gain Cosmic Ray, Radiance and 2 Cosmic Flare. Deal 7 undefendable damage.'},2,{name:'Interstellar',symbols:{[star]:3},cosmicFlare:3,text:'Gain 3 Cosmic Flare.'}],
    ['Aurora Wave II',2,'Aurora Wave',{radiance:1,text:'Gain Radiance and Cosmic Ray. Roll 2 dice and deal their total value as damage.'},2,{name:'Binary Recharge',symbols:{Ascend:1,[star]:2},radiance:1,cosmicFlare:2,text:'Gain Radiance and 2 Cosmic Flare.'}],
    ['Photonic II',2,'Photonic',{damage:()=>9,text:'Gain Radiance. Deal 9 damage.'}],
    ['Light Torpedo II',2,'Light Torpedo',{rayReady:true,text:'Deal 7 undefendable damage. Gain Cosmic Ray that may be spent this turn.'},2,{name:'Skyward',symbols:{Photon:2,Ascend:2},radiance:2,text:'Gain 2 Radiance.'}],
    ['Energy Refraction II',2,'defence',{}]
  ];
  const cards=[['Refuel!',1,'main'],['Shine Bright!',0,'main'],['Inner Strength!',2,'main'],['Supersonic!',1,'roll'],['Cosmic Shield!',0,'roll'],['Scintillate!',0,'instant'],['Flickering!',0,'instant'],['Ace Pilot!',0,'main']];
  const readyRay=(ray,turn)=>ray.ready||ray.gainedTurn!==turn;
  function sync(p){p.cosmicRay=(p.cosmicRays??[]).length;}
  function attack(s,seat){
    const hit=s.pending;
    return ['announce','blind','effect','effectResponse','targeting','defence','defenceResponse','damage','locked','cosmicRayRoll'].includes(s.stage)&&seat===s.active&&hit&&!hit.pure&&!hit.evaded&&!hit.parlayBlocked&&(hit.attack??(hit.damage>0||hit.effect==='marvelAurora'));
  }
  function canRay(s,seat,fresh=false){
    const p=s.players[seat];
    return !!(s.cards&&attack(s,seat)&&p.cosmicRayUsedTurn!==s.turn&&
      (p.cosmicRays??[]).some(ray=>fresh?ray.gainedTurn===s.turn:readyRay(ray,s.turn))&&
      !s.cardRoll&&!s.retry&&!s.cosmicRayRoll&&!s.widowTask&&!s.widowAgility&&!s.widowBombRoll&&!s.widowReveal&&!s.growth&&!s.mainChoice&&!s.mainAction&&
      (['targeting','effect','effectResponse','defence','defenceResponse','damage','locked'].includes(s.stage)||s.cosmicRayOverflow?.seat===seat));
  }
  function gainRay(s,seat,amount=1,ready=false){if(psylocke.block(s,s.players[seat],'cosmicRay',amount))return;
    const p=s.players[seat];p.cosmicRays??=[];
    while(amount-->0){
      if(p.cosmicRays.length<2)p.cosmicRays.push({gainedTurn:s.turn,ready});
      else if(attack(s,seat)&&p.cosmicRayUsedTurn!==s.turn&&p.cosmicRays.some(ray=>readyRay(ray,s.turn))){
        s.cosmicRayOverflow={seat,amount:amount+1,ready};break;
      }
    }
    sync(p);
  }
  function spendRay(s,seat,roll,fresh=false){
    const p=s.players[seat],index=p.cosmicRays.findIndex(ray=>fresh?ray.gainedTurn===s.turn:readyRay(ray,s.turn));
    if(index<0)return false;
    p.cosmicRays.splice(index,1);sync(p);p.cosmicRayUsedTurn=s.turn;
    const locked=!!attackLocked(s);
    s.cosmicRayRoll={seat,dice:rollBatch(roll,2),resume:s.stage,locked};s.stage='cosmicRayRoll';
    s.response=null;
    return true;
  }
  function radianceDice(s,seat){
    if(!s.cards||!s.players[seat].radiance||seat===s.active||s.cardRoll||s.retry||s.cosmicRayRoll||s.widowAgility||s.widowBombRoll||s.widowReveal||s.widowTask||attackLocked(s))return [];
    const defensive=s.stage==='defenceResponse'||s.gunContest?.kind==='duel'&&s.stage==='gunContest';
    if(!defensive)return [];
    const ctx=rollContext(s);
    return ctx?ctx.dice.flatMap((value,index)=>dieOwner(ctx,index)===seat&&value!==6?[{index,value}]:[]):[];
  }
  function incoming(s,seat){
    if(s.cardRoll||s.retry||s.cosmicRayRoll||s.widowTask||s.widowReveal||s.widowAgility||s.widowBombRoll||s.growth||s.mainChoice||s.mainAction||s.stage==='finished')return null;
    return blackPanther.incoming(s,seat);
  }
  function prevent(s,seat,amount){blackPanther.prevent(s,seat,amount,incoming(s,seat));}
  return {
    leafletPositives: {cosmicFlare: true, radiance: true},
   id,board,upgrades,cards,promoId:33,star,sync,gainRay,spendRay,canRay,radianceDice,incoming,prevent,readyRay,
    initialize(s,seat){Object.assign(s.players[seat],{cosmicRay:0,cosmicRays:[],cosmicFlare:0,radiance:0});},
    complexity: 2,
    defenceEffect: () => 'Return 1 damage and prevent 1 per Hala Star. Gain 1 Cosmic Flare per pair of Ascend symbols.',
    defenceDiceCount(p){return p.upgrades?.defence?5:4;},
    resolveDefence({state,defender,counts,grantStatus,updateDamage}){
      const stars=counts[star]??0;
      state.pending.returnDamage+=stars;
      state.pending.prevention=(state.pending.prevention??0)+stars;
      grantStatus(defender,'cosmicFlare',Math.floor((counts.Ascend??0)/2));
      updateDamage(state.pending);return 'damage';
    },
    cardChoices(card,{s,seat,one}){
      const p=s.players[seat];
      if(card===27)return Array.from({length:Math.min(3,p.cp)+1},(_,spend)=>({spend,label:`Spend ${spend} CP · gain ${Math.min(spend,3-(p.cosmicFlare??0))} Cosmic Flare`}));
      if(card===29)return canRay(s,seat,true)?one:[];
      if(card===30)return incoming(s,seat)&&seat!==s.active&&s.pending?.attack&&!s.pending.ultimate?one:[];
      if(card===31)return incoming(s,seat)?Array.from({length:p.radiance??0},(_,i)=>({amount:i+1,label:`Discard ${i+1} Radiance · prevent ${3*(i+1)} damage`})):[];
      return one;
    },
    applyCard({id:card,s,seat,p,choice,grantStatus,roll}){
      if(card===27){p.cp-=choice.spend;grantStatus(p,'cosmicFlare',choice.spend);return true;}
      if(card===28){gainRay(s,seat);return true;}
      if(card===29){spendRay(s,seat,roll,true);return true;}
      if(card===31){p.radiance-=choice.amount;prevent(s,seat,choice.amount*3);return true;}
      if(card===32){grantStatus(p,'radiance');return true;}
      return false;
    },
    cardRollSize(card){return [26,30,33].includes(card)?1:0;},
    resolveCardRoll({id:card,s,seat,p,counts,grantStatus,drawCards,random}){
      if(card===26){
        if(counts.Photon){grantStatus(p,'cosmicFlare');drawCards(p,1,random,card);}
        if(counts.Ascend){grantStatus(p,'radiance');drawCards(p,1,random,card);}
        if(counts[star])gainRay(s,seat);
      }
      if(card===30){
        if(counts.Photon)prevent(s,seat,2);
        if(counts.Ascend)grantStatus(p,'cosmicFlare');
        if(counts[star])gainRay(s,seat);
      }
      if(card===33){
        if(counts[star]){grantStatus(p,'cosmicFlare');gainRay(s,seat);}
        else drawCards(p,1,random,card);
      }
    },
    handle(previous,action,roll){
      const type=action.type;
      if(!['spendCosmicRay','chooseCosmicRay','collectCosmicRay','spendRadiance'].includes(type))return undefined;
      const seat=cardActor(previous);
      if(type==='spendCosmicRay'&&!canRay(previous,seat))return previous;
      if(type==='spendRadiance'&&!radianceDice(previous,seat).some(d=>d.index===action.index))return previous;
      if(type==='chooseCosmicRay'&&(!previous.cosmicRayRoll||previous.response||previous.cardRoll||previous.retry||!Number.isInteger(action.index)||action.index<0||action.index>1))return previous;
      if(type==='collectCosmicRay'&&(!previous.cosmicRayOverflow||previous.cosmicRayRoll||previous.response))return previous;
      const s=structuredClone(previous),p=s.players[seat];s.response=null;
      if(type==='spendCosmicRay')spendRay(s,seat,roll);
      if(type==='spendRadiance'){
        p.radiance--;rollContext(s).dice[action.index]=6;
        s.log.unshift(`${heroNames(s)[seat]} spends Radiance to change defence die ${action.index+1} to 6.`);
      }
      if(type==='chooseCosmicRay'){
        const task=s.cosmicRayRoll,hit=s.pending,value=dieValue(task.dice[action.index],p);
        if(hit.grossDamage===undefined){hit.damage+=value;hit.cosmicRayBonus=(hit.cosmicRayBonus??0)+value;}
        else {hit.grossDamage+=value;updateDamage(hit);}
        s.stage=task.resume;s.cosmicRayRoll=null;
        s.log.unshift(`Cosmic Ray rolls ${task.dice.join(', ')}; ${heroNames(s)[seat]} chooses +${value} damage.`);
      }
      if(type==='collectCosmicRay'){
        const task=s.cosmicRayOverflow;s.cosmicRayOverflow=null;
        for(let i=0;i<task.amount&&p.cosmicRays.length<2;i++)p.cosmicRays.push({gainedTurn:s.turn,ready:task.ready});sync(p);
      }
      return s;
    }
  };
})();
