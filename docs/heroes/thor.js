const thor=(()=>{
 const id=31;
 const board={name:'Thor',symbols:['Hammer','Hammer','Hammer','Worthy','Worthy','Thunder'],defence:'Thunder Wheel',abilities:[
  {name:'Hammered',symbols:{Hammer:3},damage:c=>c.Hammer===5?7:c.Hammer+1,hammer:'throw',text:'3 / 4 / 5 Hammer · deal 4 / 5 / 7 damage. Throw Mjölnir.'},
  {name:'Mighty Summon',symbols:{Hammer:1,Worthy:2,Thunder:1},summon:3,heal:()=>2,guard:2,text:'Gain 2 Guard Break and heal 2. Holding Mjölnir: gain 3 Electrokinesis. Otherwise retrieve it and deal 3 collateral damage to its previous holder.'},
  {name:'Odinforce',symbols:{Hammer:2,Worthy:3},damage:()=>5,effect:'thorOdin',effectCount:5,text:'Deal 5 damage. Roll 5: on 2 Hammer throw or retrieve Mjölnir; on 2 Worthy gain 1 CP; gain Electrokinesis per Thunder. Then add damage per Electrokinesis.'},
  {name:'Chain Lightning',symbols:{Hammer:3,Thunder:2},effect:'thorChain',effectCount:3,chain:2,text:'Roll 3 dice. Choose any 2 and deal their total as damage. Deal 2 isolated collateral damage.'},
  {name:'Lightning Rod',straight:4,damage:()=>7,rod:true,text:'Small straight · deal 7 damage, or 9 if the opponent holds your Mjölnir. Otherwise gain 1 Electrokinesis.'},
  {name:'Thunder Bolt',straight:5,damage:()=>10,hammer:'toggle',electro:2,text:'Large straight · throw or retrieve Mjölnir. Gain 2 Electrokinesis. Deal 10 damage.'},
  {name:'Bottled Lightning',symbols:{Thunder:4},damage:()=>7,throws:2,guard:2,electroBonus:true,text:'Throw or retrieve Mjölnir up to twice. Gain 2 Guard Break. Deal 7 damage plus 1 per Electrokinesis.'},
  {name:'For Asgard!',symbols:{Thunder:5},damage:()=>14,guard:1,throws:4,type:'ultimate',text:'Gain Guard Break. Throw or retrieve Mjölnir up to four times. Deal 14 Ultimate damage.'}
 ]};
 const upgrades=[
  ['Hammered II',0,'Hammered',{damage:c=>c.Hammer===5?7:c.Hammer+2,hammer:'toggle',electroMatch:4,text:'3 / 4 / 5 Hammer · deal 5 / 6 / 7 damage. Throw or retrieve Mjölnir. Four matching numbers gain Electrokinesis.'}],
  ['Hammered III',2,'Hammered',{damage:c=>c.Hammer===5?8:c.Hammer+2,hammer:'toggle',electroMatch:3,text:'3 / 4 / 5 Hammer · deal 5 / 6 / 8 damage. Throw or retrieve Mjölnir. Three matching numbers gain Electrokinesis.'},3],
  ['Mighty Summon II',2,'Mighty Summon',{heal:()=>3,summon:4,text:'Gain 2 Guard Break and heal 3. Holding Mjölnir: gain 3 Electrokinesis. Otherwise retrieve it and deal 4 collateral damage.'},2,{name:'Boom Boom!',symbols:{Hammer:2,Thunder:2},electro:2,damage:()=>6,text:'Gain 2 Electrokinesis. Deal 6 damage.'}],
  ['Chain Lightning II',2,'Chain Lightning',{effectCount:4,chain:3,text:'Roll 4 dice; choose any 2 and deal their total as damage. Deal 3 isolated collateral damage.'}],
  ['Odinforce II',2,'Odinforce',{damage:()=>6,ninjaRerolls:5,text:'Deal 6 damage. Roll 5 dice, optionally reroll any once before resolving: on 2 Hammer throw or retrieve Mjölnir; on 2 Worthy gain 1 CP; gain Electrokinesis per Thunder. Then add damage per Electrokinesis.'}],
  ['Lightning Rod II',2,'Lightning Rod',{rod:false,hammer:'toggle',electro:1,damage:()=>9,text:'Small straight · throw or retrieve Mjölnir. Gain 1 Electrokinesis. Deal 9 damage.'}],
  ['Thunder Bolt II',2,'Thunder Bolt',{damage:()=>12,text:'Large straight · throw or retrieve Mjölnir. Gain 2 Electrokinesis. Deal 12 damage.'},2,{name:'Asgardian Brawn',symbols:{Worthy:3},heal:()=>4,text:'Heal 4.'}],
  ['Bottled Lightning II',2,'Bottled Lightning',{damage:()=>8,throws:3,text:'Throw or retrieve Mjölnir up to three times. Gain 2 Guard Break. Deal 8 damage plus 1 per Electrokinesis.'},2,{name:'Ricochet!',symbols:{Thunder:3},throws:6,text:'Throw or retrieve Mjölnir up to six times.'}],
  ['Thunder Wheel II',2,'defence',null]
 ];
 const cards=[['He Is Worthy!',1,'roll'],['Invulnerability!',2,'roll'],['Time to Hammer!',0,'instant'],['Power Trip!',1,'instant'],['Indomitable Will!',2,'roll'],['Stormbreak!',0,'instant'],['Bifrost!',0,'main']];
 const isolated=s=>!!(s.stage==='sideDamage'&&['Mjölnir','Chain Lightning'].includes(s.sideDamage?.source)&&!s.cardRoll&&!s.widowAgility&&!s.retry);
 const isolatedCard=(s,seat,card)=>heroId(s,seat)===cyclops.id&&card===28||card===10||heroId(s,seat)===id&&card===29||heroId(s,seat)===blackPanther.id&&card===32||heroId(s,seat)===captainMarvel.id&&card===31||heroId(s,seat)===sunElf.id&&card===33||heroId(s,seat)===3&&card===31&&s.sideDamage?.source==='Chain Lightning'&&s.sideDamage.seat===seat;
 const holder=(s,seat)=>s.players[seat].mjolnirSeat??seat;
 function begin(s,seat,queue,resume=s.stage,extra={}){
  const parent=s.thorTask;
  s.thorTask={seat,queue,resume,...extra};psylocke.tag(s,s.thorTask);if(parent)s.thorTask.parent=parent;
  s.stage='thorSequence';
 }
 function mainWindow(s){let t=s.thorTask;while(t?.parent)t=t.parent;return t?.resume??s.thorOverflow?.resume??s.stage;}
 function canDraw(s,seat){const p=s.players[seat];return !!(s.cards&&seat===s.active&&['main','main1'].includes(mainWindow(s))&&p.electrokinesis>=4&&p.electroDrawTurn!==s.turn&&!s.cardRoll&&!s.mainAction&&!s.response&&!s.sideDamage&&!s.conjureTask);}
 function gain(s,seat,amount=1,exclude){if(psylocke.block(s,s.players[seat],'electrokinesis',amount))return;
  const p=s.players[seat];
  while(amount-->0){
   if((p.electrokinesis??0)<4)grantStatus(p,'electrokinesis');
   else if(canDraw(s,seat)){
    s.thorOverflow={seat,amount:amount+1,resume:s.stage,exclude};s.stage='thorOverflow';return;
   }
  }
 }
 function move(s,seat,mode='toggle',exclude){
  const p=s.players[seat],away=holder(s,seat)!==seat;
  if(mode==='throw'&&away||mode==='retrieve'&&!away)return;
  if(away){p.mjolnirSeat=seat;s.log.unshift(`${heroNames(s)[seat]} retrieves Mjölnir.`);psylocke.withoutAbility(s,()=>gain(s,seat,1,exclude));}
  else {
   p.mjolnirSeat=1-seat;p.hammerThrows=p.hammerThrowTurn===s.turn?(p.hammerThrows??0)+1:1;p.hammerThrowTurn=s.turn;
   const locked=!!(attackLocked(s)||s.thorTask?.locked);
   s.log.unshift(`${heroNames(s)[seat]} throws Mjölnir.`);
   startSideDamage(s,1-seat,1,'Mjölnir',false,{keepPending:true,pantherLocked:locked,suppressPassives:locked});
  }
 }
 function pump(s){
  if(s.stage==='finished'){
   s.players.forEach((p,seat)=>{if(p.mjolnirSeat!==undefined&&!s.players[holder(s,seat)].hp){p.mjolnirSeat=seat;grantStatus(p,'electrokinesis');}});return;
  }
  if(s.response||s.sideDamage||s.cardRoll||s.retry||s.thorOverflow)return;
  while(s.thorTask){
   const t=s.thorTask,p=s.players[t.seat],step=t.queue[0];
   if(!step){s.thorTask=t.parent??null;s.stage=t.resume;continue;}
   if(step.kind==='repeat'){
    if(!step.left){t.queue.shift();continue;}s.stage='thorSequence';return;
   }
   t.queue.shift();s.stage='thorSequence';
   if(step.kind==='move')move(s,t.seat,step.mode,t.exclude);
   if(step.kind==='electro')gain(s,t.seat,step.amount,t.exclude);
   if(step.kind==='guard')grantStatus(p,'guardBreak',step.amount);
   if(step.kind==='cp')p.cp=bounded(p.cp+step.amount,15);
   if(step.kind==='bonus')s.pending.damage+=p.electrokinesis??0;
   if(step.kind==='collateral')s.pending.collateral=step.amount;
   if(step.kind==='isolated')startSideDamage(s,1-t.seat,step.amount,'Chain Lightning',false,{keepPending:true,thorAbilityDamage:true,thorOwner:t.seat});
   if(s.sideDamage||s.thorOverflow)return;
  }
 }
 function ability(s){
  const h=s.pending;if(!h.thor||h.thorPrepared)return false;
  h.thorPrepared=true;const t=h.thor,seat=s.active,p=s.players[seat],q=[];
  if(t.guard&&h.ultimate)q.push({kind:'guard',amount:t.guard});
  if(t.summon){
   if(holder(s,seat)===seat)q.push({kind:'electro',amount:3});
   else q.push({kind:'move',mode:'retrieve'},{kind:'collateral',amount:t.summon});
  }
  if(t.rod){if(holder(s,seat)===1-seat)h.damage=9;else q.push({kind:'electro',amount:1});}
  if(t.hammer)q.push({kind:'move',mode:t.hammer});
  if(t.throws)q.push({kind:'repeat',left:t.throws});
  if(t.electro)q.push({kind:'electro',amount:t.electro});
  if(t.guard&&!h.ultimate)q.push({kind:'guard',amount:t.guard});
  if(t.electroBonus)q.push({kind:'bonus'});
  if(!q.length)return false;
  begin(s,seat,q,'thorAbility',{locked:!!h.ultimate});return true;
 }
 function odin(s,counts){const q=[];if(counts.Hammer>=2)q.push({kind:'move',mode:'toggle'});if(counts.Worthy>=2)q.push({kind:'cp',amount:1});if(counts.Thunder)q.push({kind:'electro',amount:counts.Thunder});q.push({kind:'bonus'});begin(s,s.active,q,'thorAbility');}
 function refresh(s){const e=s.sideDamage;if(e?.thorAbilityDamage){e.shadowBlocked=!!s.players[e.seat].shadows;e.parlayBlocked=!!s.players[e.thorOwner].parlay;}}
 function busy(s){return !!(s.thorOverflow||s.cardRoll||s.retry||s.conjureTask||s.scarletJinx||s.lokiTask||s.lokiIllusion||s.lokiBag||s.strangeTask||s.premonitionTask||s.widowTask||s.widowReveal||s.widowAgility||s.widowBombRoll||s.cosmicRayRoll||s.growth||s.mainChoice||s.mainAction||s.sideDamage||s.forgeTask||s.shapeOverflow||s.ravenFeathers||s.grimOverflow||s.tacticalOverflow||s.tacticalRemoval||s.honorOverflow||s.bloodOverflow||s.mesmerizeRoll);}
 function canMove(s,seat){return !!(s.cards&&heroId(s,seat)===id&&s.players[seat].hand.length&&!busy(s)&&s.stage!=='finished'&&(!s.thorTask||s.thorTask.queue[0]?.kind==='repeat')&&(!attackLocked(s)||seat===s.active));}
 function incoming(s,seat){if(seat!==s.active&&attackLocked(s))return null;return blackPanther.incoming(s,seat);}
 function will(s,seat){return !!(seat!==s.active&&!s.sideDamage&&s.pending?.attack&&!s.pending.ultimate&&!s.pending.stun&&['defence','defenceResponse','damage'].includes(s.stage)&&incomingDamage(s)>=s.players[seat].hp&&s.players[seat].hp>0);}
 return {id,board,upgrades,cards,promoId:34,isolated,isolatedCard,holder,begin,gain,move,pump,ability,odin,refresh,canDraw,canMove,incoming,
  initialize(s,seat){Object.assign(s.players[seat],{mjolnirSeat:seat,electrokinesis:0});},
  defenceDiceCount:p=>p.upgrades?.defence?4:3,
  resolveDefence({state:s,seat,defender:p,counts:c}){
   const h=s.pending;h.prevention=(h.prevention??0)+2*(c.Worthy??0);updateDamage(h);
   const q=Array.from({length:p.upgrades?.defence?Math.floor((c.Hammer??0)/2):Number(c.Hammer>=2)},()=>({kind:'move',mode:'toggle'}));
   const n=p.upgrades?.defence?c.Thunder:Number(!!c.Thunder);if(n)q.push({kind:'electro',amount:n});
   if(q.length){begin(s,seat,q,'damage');return 'thorSequence';}return 'damage';
  },
  cardChoices(card,{s,seat,pos,d,one}){
   const p=s.players[seat];
   if(card===28)return pos.filter(x=>dieOwner(d,x.i)===seat).flatMap(x=>[4,5].filter(v=>v!==x.value).map(v=>({i:x.i,v,label:`Die ${x.i+1} (${x.value}) → ${v}`})));
   if(card===29)return p.electrokinesis>=2&&incoming(s,seat)?one:[];
   if(card===32)return will(s,seat)?one:[];
   if(card===33)return p.hammerThrowTurn===s.turn&&p.hammerThrows>=2?one:[];
   return one;
  },
  applyCard({id:card,s,seat,p,choice,random}){
   if(card===28){const ctx=rollContext(s),before=ctx.dice.slice();ctx.dice[choice.i]=choice.v;if(ctx.scalar)s.effectDie=choice.v;releaseChangedAnnouncement(s,ctx,before);return true;}
   if(card===29){p.electrokinesis-=2;const kind=incoming(s,seat);if(kind==='side')s.sideDamage.invulnerabilityAll=true;else if(kind==='upkeep')s.upkeepInvulnerability=true;else if(kind==='return')s.pending.returnInvulnerable=true;else {s.pending.invulnerabilityAll=true;updateDamage(s.pending);}return true;}
   if(card===30){begin(s,seat,[{kind:'move',mode:'retrieve'},{kind:'cp',amount:1},{kind:'electro',amount:1}],s.stage,{exclude:card,locked:!!attackLocked(s)});return true;}
   if(card===31){drawCards(p,1,random,card);begin(s,seat,[{kind:'electro',amount:2}],s.stage,{exclude:card,locked:!!attackLocked(s)});return true;}
   if(card===33){drawCards(p,1,random,card);p.cp=bounded(p.cp+1,15);grantStatus(p,'guardBreak');begin(s,seat,[{kind:'electro',amount:1}],s.stage,{exclude:card,locked:!!attackLocked(s)});return true;}
   return false;
  },
  cardRollSize:card=>[32,34].includes(card)?1:0,
  resolveCardRoll({id:card,s,seat,p,counts,drawCards,random}){
   if(card===32){if(counts.Worthy)s.pending.thorWill=true;}
   else if(card===34){drawCards(p,1,random,card);if(counts.Thunder){grantStatus(p,'guardBreak');begin(s,seat,[{kind:'electro',amount:2}],s.stage,{exclude:card});}}
   else return false;return true;
  },
  handle(previous,a,roll,random,bypass){
   const types=['thorPassive','thorDraw','thorOverflowDraw','thorOverflowKeep','thorHammerChoice','thorHammerStop','chooseThorChain'];if(!types.includes(a.type))return undefined;
   const seat=cardActor(previous),t=previous.thorTask,o=previous.thorOverflow;
   if(a.type==='thorPassive'&&(!canMove(previous,seat)||!Number.isInteger(a.index)||a.index<0||a.index>=previous.players[seat].hand.length))return previous;
   if(a.type==='thorDraw'&&!canDraw(previous,seat))return previous;
   if(a.type.startsWith('thorOverflow')&&(!o||o.seat!==seat||a.type==='thorOverflowDraw'&&!canDraw({...previous,stage:o.resume,thorOverflow:null},seat)))return previous;
   if(['thorHammerChoice','thorHammerStop'].includes(a.type)&&(!t||previous.sideDamage||previous.response||t.queue[0]?.kind!=='repeat'))return previous;
   if(['thorHammerChoice','thorHammerStop'].includes(a.type)&&!bypass&&!attackLocked(previous)&&hasResponse(previous,1-t.seat))return {...previous,response:{seat:1-t.seat,action:a}};
   if(a.type==='chooseThorChain'){
    if(previous.stage!=='effectResponse'||previous.pending?.effect!=='thorChain'||previous.response)return previous;
    const n=previous.pending.effectDice.length,pairs=[];for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)pairs.push([i,j]);if(!pairs[a.choice])return previous;
    if(!bypass&&!attackLocked(previous)&&hasResponse(previous,1-previous.active))return {...previous,response:{seat:1-previous.active,action:a}};
   }
   const s=structuredClone(previous);s.response=null;
   if(a.type==='thorPassive'){const p=s.players[seat],card=p.hand.splice(a.index,1)[0];p.discard.push(card);s.log.unshift(`${heroNames(s)[seat]} discards ${seatCard(s,seat,card).name} for Mjölnir.`);move(s,seat,'toggle',card);}
   if(a.type==='thorDraw'||a.type==='thorOverflowDraw'){const p=s.players[seat];p.electrokinesis-=4;p.electroDrawTurn=s.turn;drawCards(p,1,random,o?.exclude);s.log.unshift(`${heroNames(s)[seat]} spends 4 Electrokinesis to draw a card.`);}
   if(a.type.startsWith('thorOverflow')){delete s.thorOverflow;s.stage=o.resume;if(a.type==='thorOverflowDraw')gain(s,seat,o.amount,o.exclude);}
   if(a.type==='thorHammerStop')s.thorTask.queue.shift();
   if(a.type==='thorHammerChoice'){s.thorTask.queue[0].left--;move(s,t.seat,'toggle',t.exclude);}
   if(a.type==='chooseThorChain'){
    const dice=effectiveDice(s.pending.effectDice,s.players[s.active]),pairs=[];for(let i=0;i<dice.length;i++)for(let j=i+1;j<dice.length;j++)pairs.push([i,j]);
    const pair=pairs[a.choice];s.pending.damage=dice[pair[0]]+dice[pair[1]];s.log.unshift(`Chain Lightning chooses dice ${pair[0]+1} and ${pair[1]+1} for ${s.pending.damage} damage.`);
    begin(s,s.active,[{kind:'isolated',amount:s.pending.thor.chain}],'thorAbility');
   }
   return s;
  }
 };
})();
