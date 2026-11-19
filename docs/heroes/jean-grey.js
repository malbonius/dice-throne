const jeanGrey=(()=>{
 const id=35;
 const board={name:'Jean Grey',symbols:['Astral','Astral','Astral','Control','Control','Phoenix'],defence:'Psionic Shield',abilities:[
  {name:'Mind Attack',symbols:{Astral:3},damage:c=>c.Astral+1,acuity:1,text:'3 / 4 / 5 Astral · deal 4 / 5 / 6 damage. Gain Acuity.'},
  {name:'Psychic Multiplier',symbols:{Control:3},acuity:3,effect:'jeanMultiplier',effectCount:1,damage:()=>2,type:'pure',text:'Gain 3 Acuity. Roll 1: gain half its value as Flame Blast, rounded up. Deal 2 pure damage.'},
  {name:'Occlusion',symbols:{Astral:1,Control:2,Phoenix:1},field:true,occlusion:1,damage:()=>5,text:'Gain Force Field. If Jean Grey, gain Flame Blast; if Dark Phoenix, gain 2 Acuity. Then deal 5 damage.'},
  {name:'Astral Combat',straight:4,acuity:2,astralCombat:true,damage:()=>5,text:'Small straight · gain 2 Acuity. Deal 5 damage, undefendable if Dark Phoenix.'},
  {name:'Astral Combat (large straight)',straight:5,upgradeSlot:'Astral Combat',variant:'large',acuity:2,astralCombat:true,damage:()=>8,text:'Large straight · gain 2 Acuity. Deal 8 damage, undefendable if Dark Phoenix.'},
  {name:'Telekinetic Blast',symbols:{Astral:3,Phoenix:2},flame:2,acuity:2,damage:()=>7,text:'Gain 2 Flame Blast and 2 Acuity. Then deal 7 damage.'},
  {name:'Firebird',symbols:{Phoenix:4},field:true,flame:2,damage:()=>5,type:'undefendable',text:'Gain Force Field and 2 Flame Blast. Then deal 5 undefendable damage.'},
  {name:'One True Phoenix!',symbols:{Phoenix:5},field:true,acuity:1,damage:()=>12,type:'ultimate',text:'Gain Force Field and Acuity. Deal 12 Ultimate damage.'}
 ]};
 const upgrades=[
  ['Mind Attack II',2,'Mind Attack',{damage:c=>c.Astral+2,text:'3 / 4 / 5 Astral · deal 5 / 6 / 7 damage. Gain Acuity.'},2,{name:'Psionic Jolt',symbols:{Astral:2,Phoenix:2},damage:()=>5,type:'pure',text:'Deal 5 pure damage.'}],
  ['Occlusion II',2,'Occlusion',{occlusion:2,text:'Gain Force Field. If Jean Grey, gain 2 Flame Blast; if Dark Phoenix, gain 2 Acuity. Then deal 5 damage.'},2,{name:'Super Occlusion',symbols:{Astral:1,Control:3,Phoenix:1},flame:2,acuity:2,field:true,fieldLast:true,damage:()=>5,text:'Gain 2 Flame Blast, 2 Acuity and Force Field. Then deal 5 damage.'}],
  ['Telekinetic Blast II',2,'Telekinetic Blast',{damage:()=>8,text:'Gain 2 Flame Blast and 2 Acuity. Then deal 8 damage.'},2,{name:'Psychic Multiplicity',symbols:{Control:5},acuity:3,flame:4,acuityFirst:true,damage:()=>3,type:'pure',text:'Gain 3 Acuity and 4 Flame Blast. Deal 3 pure damage.'}],
  ['Firebird II',2,'Firebird',{flame:3,text:'Gain Force Field and 3 Flame Blast. Then deal 5 undefendable damage.'},2,{name:'Essence',symbols:{Phoenix:3},essence:true,damage:()=>1,type:'undefendable',text:'Gain 2 Flame Blast or 4 Acuity. Then deal 1 undefendable damage.'}],
  ['Psionic Shield II',2,'defence',null]
 ];
 const cards=[['Force Barrier!',2,'main'],['Pyrokinesis!',1,'main'],['Phoenix Call!',1,'main'],['Incendiary!',2,'main'],['Synthesis!',1,'main'],['Psychic Attack!',1,'roll'],['Psychic Shield!',1,'roll'],['Mind Change!',1,'roll'],['Mind Walk!',0,'instant'],['Psionic Nexus!',0,'main']];
 function startTurn(s,seat){const p=s.players[seat];if(p.hero!==id)return;p.jeanOwnTurns=(p.jeanOwnTurns??0)+1;if(p.jeanOwnTurns===1){p.darkPhoenix=false;p.jeanFormTurn=s.turn;}}
 function main1(s,random){const p=s.players[s.active];if(p.hero!==id||p.darkPhoenix||p.jeanDrawTurn===s.turn)return;p.jeanDrawTurn=s.turn;drawCards(p,1,random);s.log.unshift(`${heroNames(s)[s.active]} draws 1 from Jean Grey at the beginning of Main Phase 1.`);}
 function needsSwitch(s){const p=s.players[s.active];return p.hero===id&&p.jeanOwnTurns>1&&p.jeanFormTurn!==s.turn;}
 function needsBurn(s){const p=s.players[s.active];return !!(p.phoenixBurn&&s.jeanBurnChecked!==(p.phoenixBurnEpoch??0));}
 function phase(s){return s.jeanTask&&s.stage==='jeanChoices'?phase({...s,jeanTask:s.jeanTask.parent??null,stage:s.jeanTask.resume}):s.stage;}
 function begin(s,seat,queue,resume=s.stage,extra={}){const parent=s.jeanTask;s.jeanTask={seat,queue,resume,locked:!!attackLocked(s),...extra};if(parent)s.jeanTask.parent=parent;s.stage='jeanChoices';}
 function gain(s,seat,key,amount=1,exclude){begin(s,seat,[{kind:'gain',key,amount}],s.stage,{exclude});}
 function busy(s){return !!(s.iceFreezeChoice||s.retry||s.jeanBurnRoll||s.gambitRoll||gambit.forced(s)||s.conjureTask||s.lokiTask||s.lokiIllusion||s.lokiBag?.kind==='choose'||s.strangeTask||s.premonitionTask||s.widowTask||s.widowReveal||s.forgeTask||s.growth||s.mainAction||s.mainChoice||s.pirateChoice||s.mesmerizeRoll?.choosing||s.tacticalOverflow||s.tacticalRemoval||s.honorOverflow||s.bloodOverflow||cyclops.choosing(s));}
 function window(s,seat){return !!(s.cards&&!['finished','discard','nyraDamage'].includes(s.stage)&&(!attackLocked(s)||seat===s.active));}
 function acuityChoices(s,seat){
  const p=s.players[seat],out=[];if(!p.acuity||!window(s,seat)||busy(s)&&!s.jeanBurnRoll&&!s.gambitRoll)return out;
  const ctx=rollContext(s);if(ctx&&!attackLocked(s))ctx.dice.forEach((value,index)=>{if(dieOwner(ctx,index)===seat&&!iceman.contextLocked(s,ctx,index))out.push({kind:'reroll',index,label:`Spend 1 Acuity · reroll die ${index+1} (${value})`});});
  if(p.acuity>=2)out.push({kind:'cp',label:'Spend 2 Acuity · gain 1 CP'});
  if(p.acuity>=4)out.push({kind:'burn',label:`Spend 4 Acuity · inflict Phoenix Burn on ${heroNames(s)[1-seat]}`});return out;
 }
 function flameChoices(s,seat){
  const p=s.players[seat],h=s.pending;if(!window(s,seat)||busy(s)||s.cardRoll||s.sideDamage||p.hero!==id||!(p.darkPhoenix||p.flameTurn===s.turn)||seat!==s.active||!h||!(h.attack??h.damage>0)||h.pure||h.evaded||h.parlayBlocked||!['jeanChoices','jeanAbility','jeanResolved','targeting','defence','defenceResponse','damage','locked'].includes(s.stage))return [];
  return [{cost:1,damage:1},{cost:3,damage:4}].filter(c=>p.flameBlast>=c.cost).map(c=>({...c,label:`Spend ${c.cost} Flame Blast · add ${c.damage} attack damage`}));
 }
 function fieldChoices(s,seat){
  const p=s.players[seat];if(!p.forceField||!window(s,seat)||busy(s)||s.cardRoll)return [];
  const keys=[...new Set([...scarletWitch.positives,'regenerate1'])].filter(k=>k!=='forceField'&&p[k]);
  const costs=keys.flatMap(key=>key==='bagOfTricks'?(p.trickBags??[]).map(b=>({key,tokenId:b.id,label:`Bag of Tricks from ${heroNames(s)[b.owner]}`})):[{key,label:statusLabel(key)}]);
  return [0,1].flatMap(target=>{const kind=blackPanther.incoming({...s,stage:phase(s)},target);return kind?costs.map(c=>({...c,target,kind,label:`Remove Force Field and 1 ${c.label} · prevent half ${heroNames(s)[target]}’s incoming damage`})):[];});
 }
 function changeDamage(s,amount,modifier=true){const h=s.pending;if(h.grossDamage===undefined){h.damage+=amount;if(modifier)h.jeanModifiers=(h.jeanModifiers??0)+amount;}else{h.grossDamage+=amount;updateDamage(h);}}
 function ability(s){
  const h=s.pending;if(!h.jean||h.jeanPrepared)return false;h.jeanPrepared=true;const j=h.jean,q=[];
  if(j.triple){if(j.dark)q.push({kind:'passive'});else q.push({kind:'draw',amount:1});}
  if(j.field&&!j.fieldLast)q.push({kind:'field'});
  if(j.acuityFirst&&j.acuity)q.push({kind:'gain',key:'acuity',amount:j.acuity});
  if(j.flame)q.push({kind:'gain',key:'flameBlast',amount:j.flame});
  if(!j.acuityFirst&&j.acuity)q.push({kind:'gain',key:'acuity',amount:j.acuity});
  if(j.fieldLast)q.push({kind:'field'});
  if(j.occlusion)q.push({kind:'gain',key:j.dark?'acuity':'flameBlast',amount:j.dark?2:j.occlusion});
  if(j.essence)q.push({kind:'essence'});
  if(!q.length)return false;begin(s,s.active,q,'jeanAbility',{locked:!!h.ultimate});return true;
 }
 function multiplier(s,dice){begin(s,s.active,[{kind:'gain',key:'flameBlast',amount:Math.ceil(dice[0]/2)}],'jeanResolved');}
 function pump(s,random){
  if(s.stage!=='jeanChoices'||s.response||s.cardRoll||s.retry||s.sideDamage)return;
  while(s.jeanTask){const t=s.jeanTask,p=s.players[t.seat],h=t.queue[0];if(!h){s.jeanTask=t.parent??null;s.stage=t.resume;if(s.stage!=='jeanChoices')return;continue;}
   if(['passive','essence'].includes(h.kind))return;
   if(h.kind==='gain'){if(!h.collect&&(h.overflow||(p[h.key]??0)+h.amount>statusCap(p,h.key))){h.overflow=true;return;}grantStatus(p,h.key,h.amount);}
   if(h.kind==='field')grantStatus(p,'forceField');
   if(h.kind==='draw')drawCards(p,h.amount,random,t.exclude);
   t.queue.shift();
  }
 }
 return {id,board,upgrades,cards,promoId:33,startTurn,main1,needsSwitch,needsBurn,phase,begin,gain,busy,acuityChoices,flameChoices,fieldChoices,ability,multiplier,pump,
  initialize(s,seat){Object.assign(s.players[seat],{darkPhoenix:false,jeanOwnTurns:0,acuity:0,flameBlast:0,forceField:false});},
  defenceDiceCount:p=>(p.upgrades?.defence?3:2)+(p.darkPhoenix?2:0),
  resolveDefence({state:s,seat,defender:p,counts:c}){
   s.pending.returnDamage+=c.Astral??0;
   if(!p.darkPhoenix)s.pending.prevention=(s.pending.prevention??0)+2*(p.upgrades?.defence?(c.Phoenix??0):Number(!!c.Phoenix));updateDamage(s.pending);
   if(c.Control){begin(s,seat,[{kind:'gain',key:'flameBlast',amount:1}],'damage');return 'jeanChoices';}return 'damage';
  },
  cardChoices(card,{s,seat,one,pos,d}){
   const p=s.players[seat],h=s.pending;
   if(card===24)return !p.darkPhoenix?one:[];
   if(card===25)return p.darkPhoenix?one:[];
   if(card===29)return seat===s.active&&h&&(h.attack??h.damage>0)&&!h.pure&&!h.evaded&&!h.parlayBlocked&&['jeanChoices','jeanAbility','targeting','defence','defenceResponse','damage','locked'].includes(s.stage)?one:[];
   if(card===30)return p.darkPhoenix&&seat!==s.active&&h?.attack&&!h.ultimate&&!h.stun&&!h.parlayBlocked&&['defence','defenceResponse','damage'].includes(s.stage)?one:[];
   if(card===31)return d?pos.filter(x=>dieOwner(d,x.i)===seat&&dieValue(x.value,p)).map(x=>({i:x.i,v:7-x.value,label:`Flip die ${x.i+1}: ${x.value} → ${7-x.value}`})):[];
   if(card===32)return p.acuity>=2?one:[];return one;
  },
  applyCard({id:card,s,seat,p,choice}){
   if(card===24){grantStatus(p,'forceField');return true;}
   if(card===26){p.darkPhoenix=true;return true;}
   if(card===27){grantStatus(s.players[1-seat],'phoenixBurn');return true;}
   if(card===28){p.flameTurn=s.turn;if(!p.darkPhoenix)gain(s,seat,'flameBlast',1,card);return true;}
   if(card===31){const ctx=rollContext(s),before=ctx.dice.slice();ctx.dice[choice.i]=choice.v;if(ctx.scalar)s.effectDie=choice.v;releaseChangedAnnouncement(s,ctx,before);return true;}
   if(card===32){p.acuity-=2;p.cp=bounded(p.cp+3,15);return true;}return false;
  },
  cardRollSize:card=>({25:1,29:4,30:5,33:1})[card]??0,
  resolveCardRoll({id:card,s,seat,p,counts,dice,drawCards,random}){
   if(card===25){gain(s,seat,'flameBlast',Math.ceil(dice[0]/2),card);return true;}
   if(card===29){changeDamage(s,counts.Astral??0);if(counts.Phoenix)grantAttackStatus(s,s.players[1-seat],'phoenixBurn');return true;}
   if(card===30){s.pending.prevention=(s.pending.prevention??0)+(counts.Astral??0);updateDamage(s.pending);return true;}
   if(card===33){if(counts.Phoenix)gain(s,seat,'flameBlast',4,card);else drawCards(p,1,random,card);return true;}return false;
  },
  handle(previous,a,roll,random){
   const types=['spendAcuity','spendFlameBlast','spendForceField','jeanCollect','jeanPassive','jeanEssence'];if(!types.includes(a.type))return undefined;
   const seat=cardActor(previous),t=previous.jeanTask,h=t?.queue[0];
   const option=a.type==='spendAcuity'?acuityChoices(previous,seat)[a.choice]:a.type==='spendFlameBlast'?flameChoices(previous,seat)[a.choice]:a.type==='spendForceField'?fieldChoices(previous,seat)[a.choice]:null;
   if(a.type.startsWith('spend')&&!option)return previous;
   if(['jeanCollect','jeanPassive','jeanEssence'].includes(a.type)&&(!t||previous.stage!=='jeanChoices'||seat!==t.seat||previous.response||previous.cardRoll||previous.retry))return previous;
   if(a.type==='jeanCollect'&&(h.kind!=='gain'||!h.overflow)||a.type==='jeanPassive'&&(h.kind!=='passive'||!['damage','burn'].includes(a.status)||a.status==='damage'&&previous.pending.pure)||a.type==='jeanEssence'&&(h.kind!=='essence'||!['acuity','flameBlast'].includes(a.status)))return previous;
   const s=structuredClone(previous),p=s.players[seat];s.response=null;
   if(a.type==='spendAcuity'){
    if(option.kind==='reroll'){p.acuity--;const ctx=rollContext(s),before=ctx.dice.slice();ctx.dice[option.index]=roll();if(ctx.scalar)s.effectDie=ctx.dice[option.index];releaseChangedAnnouncement(s,ctx,before);}
    if(option.kind==='cp'){p.acuity-=2;p.cp=bounded(p.cp+1,15);}
    if(option.kind==='burn'){p.acuity-=4;grantStatus(s.players[1-seat],'phoenixBurn');}
   }
   if(a.type==='spendFlameBlast'){p.flameBlast-=option.cost;changeDamage(s,option.damage);}
   if(a.type==='spendForceField'){
    removeStatus(p,'forceField');removeStatus(p,option.key,option.tokenId);
    if(option.kind==='side')s.sideDamage.protect=(s.sideDamage.protect??0)+1;
    else if(option.kind==='upkeep')s.upkeepProtect=(s.upkeepProtect??0)+1;
    else if(option.kind==='return')s.pending.returnProtect=(s.pending.returnProtect??0)+1;
    else {s.pending.protect=(s.pending.protect??0)+1;updateDamage(s.pending);}
   }
   if(a.type==='jeanCollect')s.jeanTask.queue[0].collect=true;
   if(a.type==='jeanPassive'){if(a.status==='damage')changeDamage(s,2);else s.pending.phoenixBurn=true;s.jeanTask.queue.shift();}
   if(a.type==='jeanEssence')s.jeanTask.queue.splice(0,1,{kind:'gain',key:a.status,amount:a.status==='acuity'?4:2});
   return s;
  }
 };
})();
