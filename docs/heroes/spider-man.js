const spiderMan=(()=>{
 const id=30;
 const board={name:'Spider-Man',symbols:['Thwip','Thwip','Thwip','Web','Web','Spider'],defence:'Counterpunch / Spider-Sense',abilities:[
  {name:'Punch',symbols:{Thwip:3},damage:c=>c.Thwip+1,text:'3–5 Thwip · deal 4 / 5 / 6 damage.'},
  {name:'C-C-C-Combo',symbols:{Thwip:2,Spider:2},damage:()=>5,combo:true,text:'Deal 5 damage. Gain Combo.'},
  {name:'Wall Crawler',symbols:{Thwip:2,Web:3},invisibility:true,damage:()=>7,text:'Gain Invisibility. Deal 7 damage.'},
  {name:'Spider-Reflexes',symbols:{Thwip:1,Web:2,Spider:1},effect:'spiderReflexes',effectCount:2,text:'Roll 2 dice and deal their total as damage. Gain Combo if the total is 5 or less.'},
  {name:'Ensnare',straight:4,damage:()=>5,webAfter:true,text:'Small straight · deal 5 damage, then inflict Webbed after damage calculation.'},
  {name:'Ensnare (large straight)',upgradeSlot:'Ensnare',variant:'large',straight:5,draw:1,damage:()=>8,webAfter:true,text:'Large straight · draw 1, deal 8 damage, then inflict Webbed after damage calculation.'},
  {name:'Venom Punch',symbols:{Spider:4},invisibility:true,damage:()=>7,type:'undefendable',text:'Gain Invisibility. Deal 7 undefendable damage.'},
  {name:'Venom Shockwave!',symbols:{Spider:5},invisibility:true,webbed:true,damage:()=>13,type:'ultimate',text:'Gain Invisibility. Inflict Webbed, including its isolated damage if newly inflicted. Deal 13 Ultimate damage.'}
 ]};
 const upgrades=[
  ['Punch II',2,'Punch',{damage:c=>c.Thwip+2,comboMatch:4,text:'3–5 Thwip · deal 5 / 6 / 7 damage. Four matching numbers gain Combo.'}],
  ['C-C-C-Combo II',2,'C-C-C-Combo',{damage:()=>6,text:'Deal 6 damage. Gain Combo.'},2,{name:'Web Shot',symbols:{Web:2,Spider:1},invisibility:true,webbed:true,text:'Gain Invisibility. Inflict Webbed.'}],
  ['Ensnare II',2,'Ensnare',{damage:()=>6,text:'Small straight · deal 6 damage, then inflict Webbed.',variants:{large:{damage:()=>9,label:'Ensnare II (large straight)',text:'Large straight · draw 1, deal 9 damage, then inflict Webbed.'}}}],
  ['Venom Punch II',2,'Venom Punch',{damage:()=>8,text:'Gain Invisibility. Deal 8 undefendable damage.'},2,{name:'Combo Up',symbols:{Spider:3},combo:true,damage:()=>2,type:'undefendable',text:'Gain Combo. Deal 2 undefendable damage.'}]
 ];
 const cards=[['Milkshake Me!',1,'main'],['Cha-Ching!',0,'main'],['Web Shooters!',1,'main'],['Radioactive Blood!',3,'instant'],['Swing Escape!',1,'roll'],['Ambush!',0,'roll'],['Invisible Punch!',1,'roll'],['Nice Try!',0,'roll'],['Yikes!',1,'instant'],['Booyah!',1,'main'],['Tingling!',0,'main']];
 function inflict(s,target,source=s.active,locked=!!attackLocked(s)){if(psylocke.block(s,s.players[target],'webbed'))return false;
  if(s.players[target].webbed)return false;
  grantStatus(s.players[target],'webbed');
  (s.spiderWebHits??=[]).push({target,source,locked});
  s.log.unshift(`${heroNames(s)[target]} becomes Webbed.`);return true;
 }
 function convert(s){
  const h=s.pending,p=s.players[1-s.active];
  if(h?.attack&&!h.pure&&!h.ultimate&&!h.undefendable&&p.webbed){removeStatus(p,'webbed');h.undefendable=true;h.webbedConverted=true;s.log.unshift('Webbed makes the normal attack undefendable, then is removed.');}
 }
 function busy(s){return !!(s.cardRoll||s.retry||s.conjureTask||s.scarletJinx||s.lokiTask||s.lokiIllusion||s.lokiBag||s.strangeTask||s.premonitionTask||s.widowTask||s.widowReveal||s.widowAgility||s.widowBombRoll||s.cosmicRayRoll||s.growth||s.mainChoice||s.mainAction||s.sideDamage||s.forgeTask||s.shapeOverflow||s.ravenFeathers||s.grimOverflow||s.tacticalOverflow||s.tacticalRemoval||s.honorOverflow||s.bloodOverflow||s.mesmerizeRoll);}
 function canInvisibility(s,seat){const h=s.pending;return !!(s.cards&&!busy(s)&&seat!==s.active&&s.players[seat].invisibility&&s.stage==='damage'&&h?.attack&&(h.undefendable||h.pure)&&!h.ultimate&&!h.stun&&!h.parlayBlocked&&!h.spiderDefenceUsed&&!attackLocked(s)&&!shadowAvoids(s));}
 function canSenseReroll(s,seat){return !!(s.cards&&!busy(s)&&seat!==s.active&&heroId(s,seat)===id&&s.stage==='defenceResponse'&&s.defenceKind==='spiderSense'&&s.players[seat].invisibility&&!s.pending.spiderSenseRerolled&&!attackLocked(s));}
 function canCombo(s){const p=s.players[s.active];return !!(s.stage==='spiderCombo'&&p.combo&&p.comboTurn!==s.turn&&p.hp&&s.players[1-s.active].hp);}
 function refresh(s){
  const h=s.pending;if(!h?.spiderInvisiblePunch||h.spiderSettled)return;
  const bonus=h.spiderSenseSucceeded&&!h.evaded&&!h.parlayBlocked&&!shadowAvoids(s)&&damageSubtotal(h)>0?3:0;
  h.returnDamage+=bonus-(h.spiderPunchBonus??0);h.spiderPunchBonus=bonus;
 }
 const defending=(s,seat)=>seat!==s.active&&s.pending?.attack&&!s.pending.ultimate&&!s.sideDamage&&['defence','defenceResponse','damage'].includes(s.stage);
 return {id,board,upgrades,cards,promoId:33,inflict,convert,canInvisibility,canSenseReroll,canCombo,refresh,
  initialize(s,seat){Object.assign(s.players[seat],{combo:false,invisibility:false});},
  defenceName(kind){return kind==='spiderSense'?'Spider-Sense':'Counterpunch';},
  defenceDiceCount(p,kind){return kind==='spiderSense'?2:3;},
  resolveDefence({state,counts,updateDamage}){
   const h=state.pending;
   if(state.defenceKind==='spiderSense'){
    h.spiderSenseSucceeded=!!counts[h.spiderSwing?'Web':'Spider'];h.halfDefence=h.spiderSenseSucceeded;h.spiderSenseResolved=true;updateDamage(h);
   }else h.returnDamage+=counts.Thwip??0;
   return 'damage';
  },
  cardChoices(card,{s,seat,one}){
   const p=s.players[seat],h=s.pending,defend=defending(s,seat);
   if(card===27)return defend&&['defence','defenceResponse'].includes(s.stage)&&(s.stage==='defence'||s.defenceKind==='spiderSense')?one:[];
   if(card===28)return p.invisibility&&seat===s.active&&h?.attack&&!h.pure&&!h.evaded&&!h.parlayBlocked&&['defence','defenceResponse','damage','locked'].includes(s.stage)?one:[];
   if(card===29)return defend&&(s.stage==='defence'||s.defenceKind==='spiderSense')&&(!h.spiderSenseResolved||h.spiderSenseSucceeded)?one:[];
   if(card===30)return defend&&p.invisibility&&incomingDamage(s)>0?one:[];
   return one;
  },
  applyCard({id:card,s,seat,p}){
   if(card===23){p.hp=bounded(p.hp+3,60);return true;}
   if(card===24){p.cp=bounded(p.cp+2,15);return true;}
   if(card===25){inflict(s,1-seat,seat);return true;}
   if(card===26){grantStatus(p,'combo');return true;}
   if(card===27){s.pending.spiderSwing=true;return true;}
   if(card===28){removeStatus(p,'invisibility');s.pending.grossDamage+=3;updateDamage(s.pending);return true;}
   if(card===29){s.pending.spiderInvisiblePunch=true;return true;}
   if(card===30){removeStatus(p,'invisibility');blackPanther.prevent(s,seat,3,'attack');return true;}
   if(card===31){grantStatus(p,'invisibility');return true;}
   return false;
  },
  cardRollSize(card){return [32,33].includes(card)?1:0;},
  resolveCardRoll({id:card,s,seat,p,counts,drawCards,random}){
   if(card===32){if(counts.Thwip)grantStatus(p,'invisibility');if(counts.Web)inflict(s,1-seat,seat);if(counts.Spider)grantStatus(p,'combo');}
   if(card===33){if(counts.Spider){grantStatus(p,'combo');grantStatus(p,'invisibility');}else drawCards(p,1,random,card);}
   return true;
  },
  handle(previous,action,roll){
   const type=action.type;if(!['spendInvisibility','spiderSenseReroll'].includes(type))return undefined;
   const seat=cardActor(previous);
   if(type==='spendInvisibility'&&!canInvisibility(previous,seat))return previous;
   if(type==='spiderSenseReroll'&&(!canSenseReroll(previous,seat)||!Array.isArray(action.indices)||!action.indices.length||new Set(action.indices).size!==action.indices.length||!action.indices.every(i=>Number.isInteger(i)&&i>=0&&i<previous.defenceDice.length)))return previous;
   const s=structuredClone(previous);s.response=null;removeStatus(s.players[seat],'invisibility');
   if(type==='spendInvisibility'){s.pending.spiderInvisibleDefence=true;s.stage='defence';s.log.unshift(`${heroNames(s)[seat]} spends Invisibility to activate a defence.`);}
   if(type==='spiderSenseReroll'){s.pending.spiderSenseRerolled=true;for(const i of action.indices)s.defenceDice[i]=roll();s.log.unshift(`Spider-Sense additional Roll Attempt: ${s.defenceDice.join(', ')}.`);}
   return s;
  }
 };
})();
