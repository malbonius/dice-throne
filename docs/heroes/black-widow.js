const blackWidow=(()=>{
  const id=25;
  const board={name:'Black Widow',symbols:['Espionage','Espionage','Batons','Batons','Batons','Widow'],defence:'Sabotage',abilities:[
    {name:'Baton Strike',symbols:{Batons:3},damage:c=>c.Batons+2,text:'3–5 Batons · deal 5 / 6 / 7 damage.'},
    {name:'Infiltrate',symbols:{Espionage:2,Batons:1,Widow:1},agility:1,advanceBombs:'before',bomb:true,text:'Gain Agility. Advance all Time Bombs, then inflict Time Bomb.'},
    {name:'Widow’s Gauntlets',symbols:{Espionage:3,Batons:2},damage:()=>6,cpGain:1,upgradeDamage:true,text:'Gain 1 CP. Deal 6 damage +1 per upgrade in play.'},
    {name:'Hacked',straight:4,damage:()=>5,thresholdDamage:7,bomb:true,text:'Inflict Time Bomb. Deal 5 damage, or 7 with at least 3 upgrades.'},
    {name:'Vengeance',straight:5,damage:()=>7,agility:1,effect:'widowVengeance',effectCount:4,text:'Gain Agility. Deal 7 damage and roll 4 dice: Batons add damage, Espionage inflicts Time Bomb, 2 Widows gain Covert Ops.'},
    {name:'Grapple',symbols:{Widow:4},damage:()=>6,type:'undefendable',agility:1,upgradeDamage:true,grappleCP:true,text:'Gain Agility. Deal 6 undefendable damage +1 per upgrade. With at least 2 upgrades, gain 1 CP.'},
    {name:'Widow’s Bite!',symbols:{Widow:5},damage:()=>10,type:'ultimate',searchUpgrades:2,bomb:true,text:'Search your deck for up to 2 upgrades and put them into play. Shuffle, inflict Time Bomb and deal 10 Ultimate damage.'}
  ]};
  const upgrades=[
    ['Baton Strike II',1,'Baton Strike',{damage:c=>c.Batons+3,text:'3–5 Batons · deal 6 / 7 / 8 damage. On play, reveal an opponent’s hand.'}],
    ['Infiltrate II',2,'Infiltrate',{advanceBombs:'after',text:'Gain Agility. Inflict Time Bomb, then advance all Time Bombs.'},2,{name:'Spy Game',symbols:{Espionage:2,Batons:1,Widow:2},damage:()=>6,type:'undefendable',agility:1,covertOps:1,text:'Gain Covert Ops and Agility. Deal 6 undefendable damage.'}],
    ['Widow’s Gauntlets II',2,'Widow’s Gauntlets',{damage:()=>7,text:'Gain 1 CP. Deal 7 damage +1 per upgrade in play.'},2,{name:'Covert Mission',symbols:{Espionage:2,Batons:2},bomb:true,text:'Inflict Time Bomb on the opponent.'}],
    ['Hacked II',1,'Hacked',{damage:()=>6,thresholdDamage:8,text:'Inflict Time Bomb. Deal 6 damage, or 8 with at least 3 upgrades.'}],
    ['Vengeance II',2,'Vengeance',{effectCount:5,text:'Gain Agility. Deal 7 damage and roll 5 dice for damage, Time Bomb and Covert Ops.'},2,{name:'Subvert',symbols:{Espionage:1,Batons:3},agility:1,covertOps:1,text:'Gain Covert Ops and Agility.'}],
    ['Grapple II',2,'Grapple',{damage:()=>7,cpGain:1,grappleCP:false,text:'Gain 1 CP and Agility. Deal 7 undefendable damage +1 per upgrade.'},2,{name:'Recon',symbols:{Widow:3},agility:1,searchUpgrades:1,text:'Gain Agility. Search your deck for an upgrade and put it into play, then shuffle.'}],
    ['Sabotage II',2,'defence',{}],
    ['Red Room Training II',1,'Red Room Training',{}]
  ];
  const cards=[['Cunning!',2,'main'],['Undercover Mission!',2,'main'],['Elude!',1,'roll'],['Subversion!',1,'roll'],['Recoil!',0,'roll'],['Assemblé!',1,'instant'],['Smoke Screen!',0,'main']];
  const count=p=>Object.keys(p.upgrades??{}).length;
  function sync(p){p.timeBomb=(p.timeBombTimers??[]).length;}
  function inflict(s,seat,source=s.active,ticks){if(psylocke.block(s,s.players[seat],'timeBomb'))return;
    const p=s.players[seat];p.timeBombTimers??=[];
    if(p.timeBombTimers.length<2)p.timeBombTimers.push({id:(s.widowBombSerial=(s.widowBombSerial??0)+1),ticks:ticks??(count(s.players[source])>=6?1:2)});
    sync(p);
  }
  function removeBomb(p,bombId){
    const bombs=p.timeBombTimers??[], index=bombId===undefined?0:bombs.findIndex(b=>b.id===bombId);
    if(index<0)return null;
    const bomb=bombs.splice(index,1)[0];sync(p);return bomb;
  }
  function advance(s,seat,bombId){
    const p=s.players[seat], bomb=p.timeBombTimers?.find(b=>b.id===bombId);
    if(!bomb)return;
    if(--bomb.ticks===0){removeBomb(p,bombId);(s.widowExplosions??=[]).push({seat,locked:!!s.pending?.ultimate});}
  }
  function advanceAll(s){for(const [seat,p] of s.players.entries())for(const b of [...(p.timeBombTimers??[])])advance(s,seat,b.id);}
  function upgradeChoices(s,seat,zone='deck'){
    if(doctorStrange.bandsBlocks(s,seat))return [];
    const p=s.players[seat];
    return p[zone].filter(card=>{const c=seatCard(s,seat,card);return c.phase==='upgrade'&&!p.upgrades[c.slot];});
  }
  function install(s,seat,card,random,deferDraw=false){
    const p=s.players[seat],c=seatCard(s,seat,card),draw=!!p.upgrades['Red Room Training'];
    p.upgrades[c.slot]=card;
    p.widowUpgradesPlayed=(p.widowUpgradeTurn===s.turn?p.widowUpgradesPlayed??0:0)+1;p.widowUpgradeTurn=s.turn;
    if(card===19)s.widowReveal={seat,target:1-seat,cards:s.players[1-seat].hand.slice(),resume:s.stage};
    if(draw&&!deferDraw)drawCards(p,1,random);
    return draw?1:0;
  }
  function refresh(s){
    const hit=s.pending,p=s.players[s.active];
    if(!hit?.widow||hit.grossDamage===undefined||['main','main1','discard','postHit','finished'].includes(s.stage))return;
    const n=count(p), bonus=(hit.upgradeDamage?n:0)+(n>=5&&hit.attack&&!hit.pure?1:0);
    hit.grossDamage+=bonus-(hit.widowBonus??0);hit.widowBonus=bonus;updateDamage(hit);
  }
  function incoming(s,seat){
    if(s.widowTask||s.widowAgility||s.widowReveal||s.retry||s.growth||s.mainChoice||s.mainAction||s.stage==='finished'||s.cardRoll)return null;
    if(seat!==s.active&&attackLocked(s))return null;
    return blackPanther.incoming(s,seat);
  }
  function half(s,kind){
    if(kind==='upkeep')s.upkeepProtect=(s.upkeepProtect??0)+1;
    else if(kind==='side')s.sideDamage.protect=(s.sideDamage.protect??0)+1;
    else {const key=kind==='return'?'returnProtect':'protect';s.pending[key]=(s.pending[key]??0)+1;updateDamage(s.pending);}
  }
  function canCovert(s,seat){
    const p=s.players[seat];return s.cards&&p.covertOps>0&&seat===s.active&&isMain(s)&&p.covertTurn!==s.turn&&!s.response&&!s.cardRoll&&!s.mainAction&&!s.widowTask&&!s.widowReveal;
  }
  function task(s,seat,kind,cards,extra={}){s.widowTask={seat,kind,cards,resume:s.stage,...extra};}
  return {
    leafletPositives: {agility: true},
   id,board,upgrades,cards,promoId:33,count,sync,inflict,removeBomb,advance,advanceAll,upgradeChoices,install,refresh,incoming,half,canCovert,
    initialize(s,seat){Object.assign(s.players[seat],{covertOps:3,agility:0});},
    defenceDiceCount(p){return p.upgrades?.defence?4:3;},
    resolveDefence({state,seat,defender,counts,updateDamage}){
      state.pending.returnDamage+=counts.Batons??0;
      state.pending.prevention=(state.pending.prevention??0)+(counts.Espionage??0);
      if((counts.Widow??0)>=(defender.upgrades.defence?2:1))inflict(state,1-seat,seat);
      updateDamage(state.pending);return 'damage';
    },
    effects:{widowVengeance(p,c,{attacker,grantStatus}){p.damage+=c.Batons??0;if(c.Espionage)p.timeBomb=true;if(c.Widow>=2)grantStatus(attacker,'covertOps');}},
    cardChoices(card,{s,seat,one}){
      const hit=s.pending;
      if(card===29)return s.widowAgility?.seat===seat&&[5,6].includes(s.widowAgility.dice[0])?one:[];
      if(card===30)return seat===s.active&&hit?.attack&&!hit.pure&&!hit.evaded&&!hit.parlayBlocked&&['defence','defenceResponse','damage','locked'].includes(s.stage)?one:[];
      if(card===31)return incoming(s,seat)&&hit?.attack&&seat!==s.active&&!hit.ultimate?one:[];
      return one;
    },
    applyCard({id:card,s,p,seat,random,grantStatus,updateDamage}){
      if(card===27){
        const top=p.deck.splice(-5).reverse(),found=top.filter(c=>seatCard(s,seat,c).phase==='upgrade'),rest=top.filter(c=>!found.includes(c));
        p.hand.push(...found);task(s,seat,'order',rest,{revealed:found});return true;
      }
      if(card===28){inflict(s,1-seat,seat);if(count(p)>=4)grantStatus(p,'agility');return true;}
      if(card===29){
        s.widowAgility.eludePlayed=true;return true;
      }
      if(card===30){s.pending.grossDamage+=2+(p.widowUpgradeTurn===s.turn?p.widowUpgradesPlayed:0);updateDamage(s.pending);return true;}
      if(card===32){grantStatus(p,'agility',2);return true;}
      return false;
    },
    cardRollSize(card){return card===31?2:card===33?1:0;},
    resolveCardRoll({id:card,s,seat,p,counts,drawCards,random}){
      if(card===31){gainCP(p,(counts.Espionage??0));for(let i=0;i<(counts.Widow??0);i++)half(s,'attack');}
      if(card===33){if(counts.Widow){grantStatus(p,'covertOps');inflict(s,1-seat,seat);}else drawCards(p,1,random,card);}
    },
    task,
    handle(previous,action,roll,random){
      const type=action.type;
      if(!['spendCovertOps','widowOrder','widowSearch','widowSearchDone','widowHandUpgrade','widowPeek','widowKeep','spendAgility','resolveAgility','widowBombRoll','widowBombResolve','widowRevealDone','widowDefenceReroll'].includes(type))return undefined;
      const s=structuredClone(previous),seat=cardActor(previous),p=s.players[seat],t=s.widowTask;
      const invalid=()=>previous;
      if(previous.response&&type!=='spendAgility')return previous;
      if(type==='spendCovertOps'){
        if(!canCovert(previous,seat))return invalid();p.covertOps--;p.covertTurn=s.turn;task(s,seat,'covert',[]);
      } else if(type==='widowHandUpgrade'){
        if(t?.kind!=='covert'||!upgradeChoices(s,seat,'hand').includes(action.index))return invalid();
        p.hand.splice(p.hand.indexOf(action.index),1);s.widowTask=null;install(s,seat,action.index,random);
      } else if(type==='widowPeek'){
        if(t?.kind!=='covert')return invalid();
        const top=p.deck.splice(-3).reverse();
        if(!top.some(c=>seatCard(s,seat,c).phase==='upgrade')){
          p.deck.push(...top.reverse());task(s,seat,'covertSearch',upgradeChoices(s,seat),{revealed:top.reverse()});
        } else task(s,seat,'order',top);
      } else if(type==='widowOrder'){
        if(t?.kind!=='order'||!t.cards.includes(action.index))return invalid();
        (t.ordered??=[]).push(action.index);t.cards.splice(t.cards.indexOf(action.index),1);
        if(!t.cards.length){p.deck.push(...t.ordered.reverse());s.widowTask=null;}
      } else if(type==='widowKeep'){
        if(!t||!['order','covertSearch'].includes(t.kind))return invalid();
        if(t.kind==='order')p.deck.push(...[...(t.ordered??[]),...t.cards].reverse());s.widowTask=null;
      } else if(type==='widowSearch'){
        if(!t||!['search','covertSearch'].includes(t.kind)||t.kind==='search'&&!t.left||!upgradeChoices(s,seat).includes(action.index))return invalid();
        p.deck.splice(p.deck.indexOf(action.index),1);
        if(t.kind==='covertSearch'){p.hand.push(action.index);p.deck=shuffle(p.deck,random);s.widowTask=null;}
        else {const reveal=s.widowReveal; install(s,seat,action.index,random,true);t.draws=(t.draws??0)+Number(t.passiveAtStart);delete s.widowReveal;if(action.index===19)t.reveal=s.players[1-seat].hand.slice();if(reveal)s.widowReveal=reveal;t.left--;t.cards=upgradeChoices(s,seat);}
      } else if(type==='widowSearchDone'){
        if(t?.kind!=='search')return invalid();
        p.deck=shuffle(p.deck,random);drawCards(p,t.draws??0,random);s.widowTask=null;s.stage='widowAbility';
        if(t.reveal)s.widowReveal={seat,target:1-seat,cards:t.reveal,resume:s.stage};
      } else if(type==='spendAgility'){
        const kind=incoming(previous,seat);if(!p.agility||!kind)return invalid();
        p.agility--;s.response=null;s.widowAgility={seat,kind,dice:[roll()]};
      } else if(type==='resolveAgility'){
        const a=s.widowAgility;if(!a||s.cardRoll||s.retry||s.response)return invalid();
        const result=dieValue(a.dice[0],p),eluded=a.eludePlayed&&[5,6].includes(result);
        if(eluded){
          if(a.kind==='side')s.sideDamage.evaded=true;
          else if(a.kind==='upkeep')s.upkeepEvaded=true;
          else if(a.kind==='return')s.pending.returnEvaded=true;
          else {s.pending.evaded=true;updateDamage(s.pending);}
        } else if(result>=1&&result<=3)half(s,a.kind);
        s.log.unshift(`Agility rolls ${a.dice[0]}: ${eluded?'Elude avoids all damage':result>=1&&result<=3?'prevent half incoming damage':'no prevention'}.`);s.widowAgility=null;
      } else if(type==='widowBombRoll'){
        if(s.stage!=='upkeep'||s.widowBombRoll||seat!==s.active)return invalid();
        const bombs=p.timeBombTimers??[],remaining=bombs.filter(b=>!(s.widowBombChecked??[]).includes(b.id));
        const b=remaining.find(b=>b.id===action.index);if(!b)return invalid();s.widowBombRoll={id:b.id,dice:[roll()]};
      } else if(type==='widowBombResolve'){
        const b=s.widowBombRoll;if(!b||s.cardRoll||s.retry||s.response)return invalid();
        if(dieValue(b.dice[0],p)===6)removeBomb(p,b.id);else advance(s,seat,b.id);
        (s.widowBombChecked??=[]).push(b.id);s.log.unshift(`Time Bomb rolls ${b.dice[0]}: ${b.dice[0]===6?'defused':'countdown advanced'}.`);s.widowBombRoll=null;
      } else if(type==='widowRevealDone'){
        if(!s.widowReveal)return invalid();s.widowReveal=null;
      } else if(type==='widowDefenceReroll'){
        if(s.stage!=='defenceResponse'||heroId(s,seat)!==id||count(p)<4||s.pending.widowDefenceRerolled||s.cardRoll)return invalid();
        const indices=action.indices;if(!Array.isArray(indices)||!indices.length||new Set(indices).size!==indices.length||!indices.every(i=>Number.isInteger(i)&&i>=0&&i<s.defenceDice.length))return invalid();
        for(const i of indices)s.defenceDice[i]=roll();s.pending.widowDefenceRerolled=true;
      }
      s.response=null;return s;
    }
  };
})();
