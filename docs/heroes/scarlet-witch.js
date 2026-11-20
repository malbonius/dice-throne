const scarletWitch=(()=>{
 const id=29;
 const board={name:'Scarlet Witch',symbols:['Warp','Warp','Warp','Chaos','Spell','Crown'],defence:'Double Trouble',abilities:[
  {name:'Hex Bolt',symbols:{Warp:3},damage:c=>2*c.Warp-2,text:'3–5 Warp · deal 4 / 6 / 8 damage.'},
  {name:'Darkhold',symbols:{Spell:2},draw:1,cpGain:1,crackle:1,probability:1,text:'Draw 1. Gain 1 CP, Crackle and Probability Manipulation.'},
  {name:'Jinx',symbols:{Warp:2,Chaos:2},damage:()=>6,effect:'scarletJinx',effectCount:2,text:'Deal 6 damage and roll 2 dice. On Warp add 2; Chaos gains Probability Manipulation; Spell inflicts Reality Warp; Crown adds 1 and rolls that die again. Each On outcome occurs once across all rolls.'},
  {name:'Mind Blast',symbols:{Warp:1,Chaos:1,Spell:1,Crown:1},crackle:1,damage:()=>5,type:'pure',effect:'scarletMind',effectCount:1,mindOdd:8,text:'Gain Crackle. Deal 5 pure damage and roll 1 die: even gains Probability Manipulation; odd deals 8 pure instead.'},
  {name:'Spellcraft',straight:4,probability:1,damage:()=>7,text:'Small straight · gain Probability Manipulation and deal 7 damage.'},
  {name:'Spellcraft (large straight)',upgradeSlot:'Spellcraft',variant:'large',straight:5,realityWarp:true,damage:()=>9,text:'Large straight · inflict Reality Warp and deal 9 damage.'},
  {name:'Bewitch',symbols:{Warp:1,Crown:3},conjure:true,damage:()=>9,text:'Gain Conjure. Deal 9 damage.'},
  {name:'Pure Chaos',symbols:{Crown:4},conjure:true,realityWarp:true,damage:()=>6,type:'undefendable',text:'Gain Conjure. Inflict Reality Warp. Deal 6 undefendable damage.'},
  {name:'Sealed Your Fate!',symbols:{Crown:5},conjure:true,probability:1,realityWarp:true,damage:()=>12,type:'ultimate',text:'Gain Conjure and Probability Manipulation. Inflict Reality Warp. Deal 12 Ultimate damage.'}
 ]};
 const upgrades=[
  ['Hex Bolt II',2,'Hex Bolt',{damage:c=>2*c.Warp-1,warpMatch:4,text:'3–5 Warp · deal 5 / 7 / 9 damage. Four matching numbers inflict Reality Warp.'},2,{name:'Conjuration',symbols:{Warp:2,Spell:1},conjure:true,damage:()=>2,type:'pure',text:'Gain Conjure. Deal 2 pure damage.'}],
  ['Jinx II',2,'Jinx',{jinxUpgrade:true,text:'Deal 6 damage and roll 2 dice. Each Warp adds 2; each Chaos gains Probability Manipulation; any Spell inflicts Reality Warp; each Crown adds 1 and rolls that die again.'}],
  ['Darkhold II',2,'Darkhold',{cpGain:2,crackle:2,probability:2,text:'Draw 1. Gain 2 CP, 2 Crackle and 2 Probability Manipulation.'}],
  ['Spellcraft II',2,'Spellcraft',{damage:()=>8,text:'Small straight · gain Probability Manipulation and deal 8 damage.',variants:{large:{probability:0,realityWarp:true,damage:()=>10,label:'Spellcraft II (large straight)',text:'Large straight · inflict Reality Warp and deal 10 damage.'}}}],
  ['Pure Chaos II',2,'Pure Chaos',{damage:()=>7,text:'Gain Conjure. Inflict Reality Warp. Deal 7 undefendable damage.'},2,{name:'Chaos',symbols:{Crown:3},conjure:true,probability:1,crackle:2,text:'Gain Conjure, Probability Manipulation and 2 Crackle.'}],
  ['Bewitch II',1,'Bewitch',{damage:()=>10,text:'Gain Conjure. Deal 10 damage.'},2,{name:'Energy Drain',symbols:{Chaos:2,Spell:1},stealHealth:3,text:'Steal 3 Health. No Defensive Ability is activated.'}],
  ['Mind Blast II',2,'Mind Blast',{crackle:2,mindOdd:9,text:'Gain 2 Crackle. Deal 5 pure damage and roll 1 die: even gains Probability Manipulation; odd deals 9 pure instead.'}],
  ['Double Trouble II',2,'defence',{}]
 ];
 const cards=[['Incantation!',1,'main'],['Hex Shield!',1,'roll'],['Warped!',1,'roll'],['No Dice!',1,'roll'],['Chaos Manipulation!',1,'roll'],['Snap Crackle!',1,'main'],['Hexellent!',0,'main']];
 function countedStatuses(p){const keys=[...new Set([...positiveStatusKeys,...negativeStatuses.filter(k=>k!=='hex'),'stun','regenerate1'])];return keys.reduce((n,k)=>n+Number(p[k]??0),0);}
 function busy(s){return !!(s.conjureTask||s.lokiTask||s.lokiIllusion||s.lokiBag?.kind==='choose'||s.strangeTask||s.premonitionTask||s.widowTask||s.widowReveal||s.growth||s.mainChoice||s.mainAction||s.retry);}
 function probabilityChoices(s,seat){
  if(!s.cards||!s.players[seat].probabilityManipulation||busy(s)||attackLocked(s)||s.stage==='finished')return [];
  const ctx=rollContext(s);if(!ctx)return [];
  return ctx.dice.flatMap((value,index)=>!iceman.contextLocked(s,ctx,index)&&dieOwner(ctx,index)===seat&&value%2===0&&dieValue(value,s.players[seat])?[value-1,...(value<6?[value+1]:[])].map(to=>({index,to,label:`Die ${index+1}: ${value} → ${to}`})):[]);
 }
 function defenceChanges(s,seat){
  if(!s.cards||busy(s)||s.cardRoll||s.scarletJinx||s.response&&s.response.seat!==seat||attackLocked(s)||s.stage!=='defenceResponse'||seat===s.active||heroId(s,seat)!==id||!s.players[seat].upgrades?.defence||!s.players[seat].probabilityManipulation||s.pending.scarletDefenceChanged)return [];
  return s.defenceDice.flatMap((value,index)=>[1,2,3,4,5,6].filter(to=>to!==value).map(to=>({index,to,label:`Defence die ${index+1}: ${value} → ${to}`})));
 }
 function canCrackle(s,seat){const p=s.players[seat],h=s.pending;return !!(s.cards&&!busy(s)&&!s.cardRoll&&!s.scarletJinx&&!s.lokiBag&&p.crackle&&seat===s.active&&(p.crackleTurn===s.turn?p.crackleSpent??0:0)<2&&h?.attack&&!h.pure&&!h.evaded&&!h.parlayBlocked&&['targeting','defence','defenceResponse','damage','locked'].includes(s.stage));}
 function canConjure(s,seat){return !!(s.cards&&!busy(s)&&!s.cardRoll&&!s.scarletJinx&&!s.lokiBag&&!s.sideDamage&&!s.response&&seat===s.active&&isMain(s)&&s.players[seat].conjure&&s.players[seat].conjureTurn!==s.turn);}
 function conjureChoices(s,seat){
  if(!canConjure(s,seat))return [];
  return [{kind:'warp',target:1-seat,label:`Inflict Reality Warp on ${heroNames(s)[1-seat]}`},...s.players.flatMap((p,source)=>leafletPositiveStatuses(s,source).map(status=>({kind:'copy',source,status,label:`Gain ${statusLabel(status)} from ${heroNames(s)[source]}’s leaflet`})))];
 }
 function symbols(s,seat,dice){dice=storm.symbols(s,seat,dice);return s.realityDie?.seat===seat&&heroId(s,seat)!==id?dice.map((v,i)=>i===s.realityDie.index?0:v):dice;}
 function start(s,seat,enter){
  if(!enter||s.players[seat].knockdown){delete s.realityDie;return;}
  if(s.realityDie?.seat===seat)return;
  delete s.realityDie;
  if(enter&&s.players[seat].realityWarp){removeStatus(s.players[seat],'realityWarp');s.realityDie={seat,index:4};s.log.unshift(`${heroNames(s)[seat]} replaces die 5 with a Scarlet Witch die for this Offensive Roll Phase.`);}
 }
 function resolveJinx(s,dice,roll){
  const h=s.pending,p=s.players[s.active],c=tally(effectiveDice(dice,p),id),up=!!h.scarlet.jinxUpgrade,seen=h.scarletSeen??={};
  const once=(key)=>{if(seen[key])return false;seen[key]=true;return true;};
  if(c.Warp&&(up||once('Warp')))h.damage+=2*(up?c.Warp:1);
  if(c.Chaos&&(up||once('Chaos')))grantStatus(p,'probabilityManipulation',up?c.Chaos:1);
  if(c.Spell&&once('Spell')){h.realityWarp=true;h.scarletWarpPrior=!!s.players[1-s.active].realityWarp;h.scarletWarpApplied=true;grantStatus(s.players[1-s.active],'realityWarp');}
  const crowns=c.Crown&&(up||once('Crown'))?(up?c.Crown:1):0;
  h.damage+=crowns;
  const left=(s.scarletJinx?.left??0)+crowns;
  if(left){s.scarletJinx={seat:s.active,left,dice:[roll()]};s.stage='scarletJinx';return true;}
  s.scarletJinx=null;return false;
 }
 return {
  leafletPositives: {probabilityManipulation: true, conjure: true, crackle: true},
  id,board,upgrades,cards,promoId:33,countedStatuses,probabilityChoices,defenceChanges,canCrackle,canConjure,conjureChoices,symbols,start,resolveJinx,
  initialize(s,seat){Object.assign(s.players[seat],{probabilityManipulation:0,conjure:false,crackle:0});},
  defenceDiceCount(){return 5;},
  resolveDefence({state,defender,counts,grantStatus}){
   const up=!!defender.upgrades?.defence;
   if((counts.Warp??0)>=2)grantStatus(defender,'crackle',up&&(counts.Warp??0)>=3?2:1);
   if((counts.Chaos??0)>=2)grantStatus(defender,'probabilityManipulation');
   if((counts.Spell??0)>=2)grantStatus(defender,'conjure');
   if((counts.Crown??0)>=2)state.pending.returnDamage+=4;
   return 'damage';
  },
  cardChoices(card,{s,seat,one,pos,d}){
   const p=s.players[seat];
   if(card===28)return seat!==s.active&&s.pending?.attack&&!s.pending.ultimate&&!s.sideDamage&&['defence','defenceResponse','damage'].includes(s.stage)?one:[];
   if([29,30,31].includes(card)){
    if(card===30&&!p.probabilityManipulation||card===31&&(p.probabilityManipulation??0)<2)return [];
    return pos.filter(die=>card===29?dieOwner(d,die.i)===seat:card===30?dieOwner(d,die.i)!==seat:true).flatMap(die=>(card===29?[1,2,3]:card===30?[1]:[1,2,3,4,5,6]).filter(v=>v!==die.value).map(v=>({i:die.i,v,label:`${die.label} → ${v}`})));
   }
   return one;
  },
  applyCard({id:card,s,seat,p,choice}){
   if(card===27){grantStatus(p,'conjure');return true;}
   if([29,30,31].includes(card)){
    if(card!==29)p.probabilityManipulation-=card===30?1:2;
    const ctx=rollContext(s),before=ctx.dice.slice();ctx.dice[choice.i]=choice.v;if(ctx.scalar)s.effectDie=choice.v;releaseChangedAnnouncement(s,ctx,before);return true;
   }
   return false;
  },
  cardRollSize(card){return card===28?5:[32,33].includes(card)?1:0;},
  resolveCardRoll({id:card,s,seat,p,dice,counts,drawCards,random}){
   if(card===28){blackPanther.prevent(s,seat,counts.Warp??0,blackPanther.incoming(s,seat));if((counts.Crown??0)>=2)grantStatus(s.players[1-seat],'realityWarp');}
   if(card===32&&dice[0])grantStatus(p,'crackle',dice[0]%2?2:1);
   if(card===33){if(counts.Crown){grantStatus(p,'conjure');grantStatus(p,'probabilityManipulation');grantStatus(p,'crackle');}else drawCards(p,1,random,card);}
   return true;
  },
  handle(previous,action,roll,random,bypassResponse){
   const type=action.type;
   if(!['spendProbability','scarletDefenceChange','spendCrackle','spendConjure','conjureAllow','conjureDiscard','resolveScarletJinx'].includes(type))return undefined;
   const seat=cardActor(previous);
   if(type==='resolveScarletJinx'&&(!previous.scarletJinx||previous.cardRoll||previous.retry||previous.response))return previous;
   if(type==='resolveScarletJinx'&&!bypassResponse&&hasResponse(previous,1-previous.scarletJinx.seat))return {...previous,response:{seat:1-previous.scarletJinx.seat,action}};
   const option=type==='spendProbability'?probabilityChoices(previous,seat)[action.choice]:type==='scarletDefenceChange'?defenceChanges(previous,seat)[action.choice]:type==='spendConjure'?conjureChoices(previous,seat)[action.choice]:null;
   if(['spendProbability','scarletDefenceChange','spendConjure'].includes(type)&&!option)return previous;
   if(type==='spendCrackle'&&!canCrackle(previous,seat))return previous;
   if(['conjureAllow','conjureDiscard'].includes(type)&&!previous.conjureTask)return previous;
   const s=structuredClone(previous),p=s.players[seat];s.response=null;
   if(type==='spendProbability'||type==='scarletDefenceChange'){
    p.probabilityManipulation--;const ctx=rollContext(s),before=ctx.dice.slice();ctx.dice[option.index]=option.to;if(ctx.scalar)s.effectDie=option.to;
    if(type==='scarletDefenceChange')s.pending.scarletDefenceChanged=true;
    releaseChangedAnnouncement(s,ctx,before);s.log.unshift(`${heroNames(s)[seat]} spends Probability Manipulation: ${option.label}.`);
   }
   if(type==='spendCrackle'){
    p.crackle--;if(p.crackleTurn!==s.turn){p.crackleTurn=s.turn;p.crackleSpent=0;}p.crackleSpent++;
    const bonus=Math.min(3,countedStatuses(p));s.pending.grossDamage+=bonus;updateDamage(s.pending);s.log.unshift(`${heroNames(s)[seat]} spends Crackle for +${bonus} damage.`);
   }
   if(type==='spendConjure'){
    p.conjure=false;p.conjureTurn=s.turn;
    if(option.kind==='warp'){grantStatus(s.players[option.target],'realityWarp');s.log.unshift(`${heroNames(s)[seat]} spends Conjure to inflict Reality Warp.`);}
    else if(s.players[1-seat].hand.length){s.conjureTask={seat,choice:option,resume:s.stage};s.stage='conjureResponse';}
    else gainCopiedStatus(s,seat,option.status,option.source);
   }
   if(type==='conjureAllow'||type==='conjureDiscard'){
    const task=s.conjureTask,opponent=s.players[1-task.seat];
    if(type==='conjureDiscard'){
     const index=opponent.hand.indexOf(action.index);if(index<0)return previous;
     opponent.discard.push(opponent.hand.splice(index,1)[0]);s.log.unshift(`${heroNames(s)[1-task.seat]} discards ${seatCard(s,1-task.seat,action.index).name} to block Conjure.`);
    }
    s.conjureTask=null;s.stage=task.resume;
    if(type==='conjureAllow')gainCopiedStatus(s,task.seat,task.choice.status,task.choice.source);
   }
   if(type==='resolveScarletJinx'){
    const dice=s.scarletJinx.dice.slice();s.scarletJinx.left--;
    s.log.unshift(`Jinx reroll resolves: ${dice.join(', ')}.`);
    if(!resolveJinx(s,dice,roll))s.stage='scarletAbility';
   }
   return s;
  }
 };
})();
