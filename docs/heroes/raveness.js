const raveness = (() => {
  const id = 19;
  const symbols = ['Talon','Talon','Talon','Wing','Wing','Raven Eye'];
  const fowl = {Wing:4}, sight = {Talon:2,'Raven Eye':2}, chamber = {'Raven Eye':4};
  const board = {name:'Raveness',symbols,defence:'Nothing More',abilities:[
    {name:'Peck',symbols:{Talon:3},damage:c=>c.Talon+2,ravenMatch:4,text:'3–5 Talons · deal 5 / 6 / 7 damage. Four matching numbers activate Nevermore.'},
    {name:'Fowl Friend',symbols:fowl,draw:1,feathers:4,ravenActivate:2,text:'4 Wings · draw 1, gain 4 Feathers, and activate Nevermore twice.'},
    {name:'Craven',straight:4,damage:()=>8,feathers:1,text:'Small straight · gain 1 Feather and deal 8 damage.'},
    {name:'Chamber',symbols:chamber,damage:()=>7,type:'undefendable',ravenActivate:2,text:'4 Raven Eyes · activate Nevermore twice and deal 7 undefendable damage.'},
    {name:'Murder of Crows',symbols:{Talon:2,Wing:3},damage:()=>5,effect:'ravenMurder',effectCount:4,text:'2 Talons + 3 Wings · deal 5 damage and roll four dice for damage, Feathers and Nevermore.'},
    {name:'Raven Sight',symbols:sight,damage:()=>3,type:'undefendable',ravenActivate:1,text:'2 Talons + 2 Raven Eyes · activate Nevermore and deal 3 undefendable damage.'},
    {name:'Beguile',straight:5,damage:()=>9,feathers:2,ravenActivate:1,text:'Large straight · gain 2 Feathers, activate Nevermore and deal 9 damage.'},
    {name:'Fantastic Terrors!',symbols:{'Raven Eye':5},damage:()=>13,type:'ultimate',ravenActivate:3,hex:true,text:'5 Raven Eyes · activate Nevermore three times, inflict Hex and deal 13 Ultimate damage.'}
  ]};
  const friendUpgrade = {symbols:{Wing:3},feathers:'max',ravenActivate:3,text:'3 Wings · draw 1, fill your Feather supply and activate Nevermore three times.'};
  const upgrades = [
    ['Peck II',2,'Peck',{damage:c=>c.Talon+3,ravenMatch:3,text:'3–5 Talons · deal 6 / 7 / 8 damage. Three matching numbers activate Nevermore.'}],
    ['Fowl Friend II',3,'Fowl Friend',friendUpgrade,2,{name:'Birds of a Feather',...friendUpgrade,symbols:{Wing:5},draw:1,featherCap:1,text:'5 Wings · increase the Feather stack limit by 1, then activate Fowl Friend II.'}],
    ['Craven II',2,'Craven',{damage:()=>9,feathers:2,text:'Small straight · gain 2 Feathers and deal 9 damage.'}],
    ['Chamber II',2,'Chamber',{ravenActivate:3,text:'4 Raven Eyes · activate Nevermore three times and deal 7 undefendable damage.'},2,{name:'Aviary',symbols:{'Raven Eye':3},damage:()=>2,type:'undefendable',feathers:4,text:'3 Raven Eyes · gain 4 Feathers and deal 2 undefendable damage.'}],
    ['Murder of Crows II',2,'Murder of Crows',{damage:()=>6,effectCount:5,text:'2 Talons + 3 Wings · deal 6 damage and roll five dice for damage, Feathers and Nevermore.'}],
    ['Raven Sight II',1,'Raven Sight',{ravenActivate:2,text:'2 Talons + 2 Raven Eyes · activate Nevermore twice and deal 3 undefendable damage.'}],
    ['Beguile II',2,'Beguile',{feathers:3,ravenActivate:2,text:'Large straight · gain 3 Feathers, activate Nevermore twice and deal 9 damage.'},2,{name:'Pluck',symbols:{Wing:3,'Raven Eye':2},hex:true,damage:()=>9,text:'3 Wings + 2 Raven Eyes · inflict Hex, then deal 9 damage.'}],
    ['Nothing More II',2,'defence',{}]
  ];
  const cards = [
    ['Midnight Dreary!',1,'main'],['Nevermore Attack!',2,'main'],['Talon Strike!',1,'roll'],
    ['Stone Beak!',2,'roll'],['Broken Stillness!',1,'instant'],['Cull!',1,'instant'],['Fiend or Fowl!',0,'main']
  ];
  function move(s,owner,target){
    const p=s.players[owner];
    if(p.nevermoreSeat===target)return;
    p.nevermoreSeat=target;
    if(owner===target){
      p.hp=Math.min(60,p.hp+p.nevermoreVitality);
      p.nevermoreVitality=0;
    }
  }
  function activate(s,owner,left,after){
    s.ravenActivation={owner,left,after,resume:s.stage,locked:!!attackLocked(s),parent:s.ravenActivation??null};
    s.stage='ravenActivate';
  }
  function feathers(s,seat,amount){
    const p=s.players[seat], cap=p.featherCap??5;
    if(!amount)return;
    const incoming=amount==='max'?cap:amount;
    if((p.feather??0)+incoming>cap&&(p.feather??0)>=3){
      s.ravenFeathers={seat,amount:incoming};
    } else p.feather=Math.min(cap,(p.feather??0)+incoming);
  }
  function featherChoices(s,seat){
    const p=s.players[seat], n=p.feather??0, r=s.nevermoreRoll;
    if(!n||s.stage==='finished'||s.stage==='discard'&&seat!==s.active||s.retry||seat!==s.active&&attackLocked(s))return [];
    if(r){
      if(r.owner!==seat&&(heroId(s,seat)===id||r.target!==seat))return [];
      return [{cost:1,kind:'reroll',label:'Reroll the Nevermore die'},
        ...(n>=2&&dieValue(r.dice[0],s.players[r.target])?[{kind:'down',cost:2,label:'Decrease the Nevermore die by 1'},{kind:'up',cost:2,label:'Increase the Nevermore die by 1'}]
          .filter(({kind})=>kind==='down'?r.dice[0]>1:r.dice[0]<6):[])];
    }
    if(heroId(s,seat)!==id||n<3||s.cardRoll?.seat===seat&&s.cardRoll.id===28||s.stage==='sideDamage')return [];
    if(s.ravenFeathers&&(s.ravenFeathers.spending||s.ravenFeathers.seat!==seat))return [];
    return [{cost:3,kind:'activate',label:'Activate Nevermore'}];
  }
  return {id,board,upgrades,cards,promoId:33,move,activate,feathers,featherChoices,
    initialize(s,seat){Object.assign(s.players[seat],{nevermoreSeat:seat,nevermoreVitality:0,feather:0,featherCap:5});},
    defenceDiceCount(){return 5;},
    resolveDefence({state,seat,defender,counts,updateDamage}){
      const hit=state.pending, talons=counts.Talon??0;
      hit.returnDamage+=defender.upgrades?.defence?talons:2*Number(talons>=2);
      if(counts.Wing>=2){
        hit.prevention=(hit.prevention??0)+2;
        updateDamage(hit);
      }
      if(counts['Raven Eye']>=2){
        state.stage='damage';
        activate(state,seat,1);
        return state.stage;
      }
      return 'damage';
    },
    cardChoices(card,{s,seat,one}){
      const p=s.players[seat], hit=s.pending;
      if(card===32){
        if(!s.nevermoreRoll)return [];
        return [1,2,3,4,5,6].filter(value=>value!==s.nevermoreRoll.dice[0]).map(value=>({value,label:`Set Nevermore die to ${value}`}));
      }
      if(card===31)return s.nevermoreRoll||s.stage==='sideDamage'?[]:one;
      const attack=seat===s.active&&hit?.attack&&!hit.pure&&!hit.evaded&&!hit.parlayBlocked&&['defence','defenceResponse','damage','locked'].includes(s.stage);
      if(card===29)return attack?one:[];
      if(card===30)return attack&&p.nevermoreSeat!==seat?one:[];
      return one;
    },
    applyCard({id:card,s,seat,choice,updateDamage}){
      if(card===28||card===31){activate(s,seat,1,card===28?'nevermoreAttack':undefined);return true;}
      if(card===32){s.nevermoreRoll.dice[0]=choice.value;return true;}
      if(card===30){
        s.pending.grossDamage++;
        if(!s.pending.ultimate)s.pending.undefendable=true;
        if(s.stage==='defence'||s.stage==='defenceResponse')s.stage='damage';
        updateDamage(s.pending);
        return true;
      }
      return false;
    },
    cardRollSize(card){return ({27:5,29:5,33:1})[card]??0;},
    resolveCardRoll({id:card,counts,s,p,opponent,seat,hit,updateDamage,grantStatus,drawCards,random}){
      if(card===27){
        feathers(s,seat,counts.Wing??0);
        if(counts['Raven Eye'])activate(s,seat,1);
      }
      if(card===29){
        hit.grossDamage+=counts.Talon??0;
        updateDamage(hit);
        feathers(s,seat,1);
      }
      if(card===33){
        if(counts['Raven Eye']){feathers(s,seat,2);grantStatus(opponent,'hex');}
        else drawCards(p,1,random,card);
      }
    }
  };
})();
