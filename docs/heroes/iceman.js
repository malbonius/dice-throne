const iceman=(()=>{
 const id=34;
 const paths={'Frostbite':'Everybody Chill','Everybody Chill':'Cold Treat','Cold Treat':'Ice to Meet You','Hoarfrost':'Thawsome','Hail the King':'Thawsome'};
 const board={name:'Iceman',symbols:['Ice','Ice','Ice','Slide','Slide','Frost'],defence:'Rime',abilities:[
  {name:'Frostbite',symbols:{Ice:3},damage:c=>c.Ice+2,storeMatch:4,transferAfter:true,text:'3 / 4 / 5 Ice · deal 5 / 6 / 7 damage. Four matching numbers store 1 Ice Shard. After damage, you may transfer tokens from The Freezer.'},
  {name:'Everybody Chill',symbols:{Ice:1,Frost:3},shards:1,damage:()=>5,chill:true,text:'Gain Ice Shard. Deal 5 damage. Choose: add damage per board Ice Shard, or gain 2 Ice Shards and draw 1.'},
  {name:'Ice to Meet You',symbols:{Slide:4},shards:1,cubes:1,effect:'icemanMeet',effectCount:5,type:'undefendable',text:'Gain Ice Shard. Inflict Dice Cube. Roll 5: deal 1 undefendable per Ice; store 1 per Slide; each Frost chooses Glide or draw 1.'},
  {name:'Cold Treat',symbols:{Ice:2,Slide:3},iceCP:1,store:1,damage:()=>7,text:'Gain 1 CP. Store 1 Ice Shard. Deal 7 damage.'},
  {name:'Thawsome',straight:4,store:2,cubes:1,damage:()=>6,text:'Small straight · store 2 Ice Shards. Inflict Dice Cube. Deal 6 damage.'},
  {name:'Hoarfrost',straight:5,store:3,transferBefore:true,damage:()=>8,text:'Large straight · store 3 Ice Shards, then you may transfer Freezer tokens to your board. Deal 8 damage.'},
  {name:'Hail the King',symbols:{Frost:4},shards:3,cubes:1,damage:()=>5,collateral:2,type:'undefendable',text:'Gain 3 Ice Shards. Inflict Dice Cube. Deal 5 undefendable and 2 collateral damage.'},
  {name:'Ice Storm!',symbols:{Frost:5},store:5,cubes:2,damage:()=>13,type:'ultimate',text:'Store 5 Ice Shards. Inflict 2 Dice Cube. Deal 13 Ultimate damage.'}
 ]};
 const upgrades=[
  ['Cold Treat II',2,'Cold Treat',{store:2,damage:()=>8,text:'Gain 1 CP. Store 2 Ice Shards. Deal 8 damage.'},2,{name:'Frosting',symbols:{Ice:2,Slide:2},shards:2,cubes:2,text:'Gain 2 Ice Shards. Inflict 2 Dice Cube.'}],
  ['Thawsome II',1,'Thawsome',{damage:()=>7,text:'Store 2 Ice Shards. Inflict Dice Cube. Deal 7 damage.'}],
  ['Hoarfrost II',2,'Hoarfrost',{damage:()=>10,text:'Store 3 Ice Shards, then you may transfer Freezer tokens. Deal 10 damage.'},2,{name:'Icy Come, Icy Go',symbols:{Slide:5},iceGlide:true,cubes:2,damage:()=>5,type:'undefendable',text:'Gain Glide. Inflict 2 Dice Cube. Deal 5 undefendable damage.'}],
  ['Everybody Chill II',2,'Everybody Chill',{shards:2,text:'Gain 2 Ice Shards. Deal 5 damage. Choose: add damage per board Ice Shard, or gain 2 Ice Shards and draw 1.'},2,{name:'Subzero',symbols:{Ice:2,Frost:2},damage:()=>5,type:'undefendable',text:'Deal 5 undefendable damage.'}],
  ['Hail the King II',2,'Hail the King',{damage:()=>7,text:'Gain 3 Ice Shards. Inflict Dice Cube. Deal 7 undefendable and 2 collateral damage.'},2,{name:'Snow Cone',symbols:{Frost:3},store:8,text:'Store 8 Ice Shards.'}],
  ['Rime II',2,'defence',null]
 ];
 const cards=[['Skiing Is Believing!',1,'main'],['Froze and Cons!',0,'main'],['Freeze the Day!',1,'main'],['Ice Cool!',1,'instant'],['Gliding on Thin Ice!',2,'main'],['I Only Have Ice for You!',2,'roll'],['Winter Punderland!',3,'instant'],['Icesight!',1,'instant'],['I Thaw, I Conquered!',0,'main']];
 const phase=s=>s.iceTask&&s.stage==='iceChoices'?phase({...s,iceTask:s.iceTask.parent??null,stage:s.iceTask.resume}):s.stage;
 function begin(s,seat,queue,resume=s.stage,extra={}){const parent=s.iceTask;s.iceTask={seat,queue,resume,locked:!!attackLocked(s),...extra};psylocke.tag(s,s.iceTask);if(parent)s.iceTask.parent=parent;s.stage='iceChoices';}
 function gain(s,seat,amount=1,exclude){begin(s,seat,[{kind:'gain',amount}],s.stage,{exclude});}
 function changeDamage(s,n){const h=s.pending;if(h.grossDamage===undefined){h.damage+=n;h.icemanModifiers=(h.icemanModifiers??0)+n;}else {h.grossDamage+=n;updateDamage(h);}}
 function busy(s){return !!(s.cardRoll||s.retry||s.iceFreezeChoice||s.gambitRoll||gambit.forced(s)||s.conjureTask||s.scarletJinx||s.lokiTask||s.lokiIllusion||s.lokiBag||s.strangeTask||s.premonitionTask||s.widowTask||s.widowReveal||s.widowAgility||s.widowBombRoll||s.cosmicRayRoll||s.growth||s.mainChoice||s.mainAction||s.forgeTask||s.shapeOverflow||s.ravenFeathers||s.grimOverflow||s.tacticalOverflow||s.tacticalRemoval||s.honorOverflow||s.bloodOverflow||s.mesmerizeRoll||cyclops.choosing(s));}
 function canConvert(s,seat){return !!(s.cards&&s.players[seat].iceShard>=5&&!busy(s)&&!s.sideDamage&&!['discard','finished'].includes(s.stage)&&(!attackLocked(s)||seat===s.active));}
 function canFreezerConvert(s,seat){return !!(s.cards&&s.players[seat].freezer?.shards===5&&!busy(s)&&!s.sideDamage&&!['discard','finished'].includes(s.stage)&&(!attackLocked(s)||seat===s.active));}
 function transferOptions(s){const t=s.iceTask,p=s.players[t.seat],out=[];for(let amount=1;amount<=Math.min(p.freezer.shards,5-(p.iceShard??0));amount++)out.push({key:'shards',amount,label:`Transfer ${amount} Ice Shard${amount===1?'':'s'} to your board`});if(p.freezer.glide&&!p.glide)out.push({key:'glide',label:'Transfer stored Glide to your board'});return out;}
 function path(s){const h=s.pending,seat=s.active,p=s.players[seat],name=h?.iceman?.path;if(!name||p.glideTurn===s.turn||!p.hp||!s.players[1-seat].hp)return null;const ability=abilitiesFor(s,seat).find(a=>a.name===name);return ability&&!loki.blocked(s,seat,ability)?name:null;}
 function canGlide(s){return !!(s.stage==='iceGlideOffer'&&path(s)&&s.players[s.active].glide);}
 function ability(s){
  const h=s.pending;if(!h.iceman||h.icePrepared)return false;h.icePrepared=true;const i=h.iceman,q=[];
  if(i.cp)q.push({kind:'cp',amount:i.cp});
  if(i.store)q.push({kind:'store',left:i.store});
  if(i.shards)q.push({kind:'gain',amount:i.shards,snapshot:true});
  if(i.glide)q.push({kind:'glide'});
  if(i.transferBefore)q.push({kind:'transfer'});
  if(i.chill)q.push({kind:'chill'});
  if(!q.length)return false;begin(s,s.active,q,'iceAbility',{locked:!!h.ultimate});return true;
 }
 function meet(s,counts){const q=[];s.pending.damage=counts.Ice??0;if(counts.Slide)q.push({kind:'store',left:counts.Slide});if(counts.Frost)q.push({kind:'frost',left:counts.Frost});if(q.length){begin(s,s.active,q,'iceResolved');return true;}return false;}
 function pump(s,random){
  if(s.stage==='finished'||s.response||s.cardRoll||s.retry||s.sideDamage||s.stage!=='iceChoices')return;
  while(s.iceTask){const t=s.iceTask,p=s.players[t.seat],h=t.queue[0];
   if(!h){s.iceTask=t.parent??null;s.stage=t.resume;if(s.stage!=='iceChoices')return;continue;}
   if(['transfer','chill','frost'].includes(h.kind))return;
   if(h.kind==='gain'){
    if(psylocke.block(s,p,'iceShard',h.amount)){t.queue.shift();continue;}
    if(!h.collect&&(h.overflow||(p.iceShard??0)+h.amount>5)){h.overflow=true;return;}
    grantStatus(p,'iceShard',h.amount);if(h.snapshot&&s.pending?.iceman)s.pending.iceman.shardSnapshot=Math.max(s.pending.iceman.shardSnapshot??0,p.iceShard??0);
   }
   if(h.kind==='store'){
    const n=Math.min(h.left,5-p.freezer.shards);p.freezer.shards+=n;h.left-=n;if(h.left){h.overflow=true;return;}
   }
   if(h.kind==='glide')grantStatus(p,'glide');
   if(h.kind==='cp')gainCP(p,h.amount);
   if(h.kind==='draw')drawCards(p,h.amount,random,t.exclude);
   t.queue.shift();
  }
 }
 // Frozen indices refer only to the first Offensive Roll Attempt, never subsidiary dice.
 function locked(s,seat,index){const f=s.iceFirstRoll;return !!(f&&f.seat===seat&&seat===s.active&&(f.selected??[]).slice(0,s.players[seat].diceCube??0).includes(index));}
 function contextLocked(s,ctx,index){return !!(ctx&&ctx.dice===s.dice&&locked(s,s.active,index));}
 function freeze(s){
  if(s.stage==='finished')return;const f=s.iceFirstRoll;if(!f||f.seat!==s.active)return;
  const p=s.players[f.seat],count=p.diceCube??0;
  if(!count){delete s.iceFreezeChoice;return;}
  if(!['offence','announce'].includes(phase(s)))return;
  f.selected??=[];
  while(f.selected.length<count){
   const rest=f.values.map((v,i)=>({v:dieValue(v,p),i})).filter(x=>x.v&&!f.selected.includes(x.i));if(!rest.length)return;
   const min=Math.min(...rest.map(x=>x.v)),candidates=rest.filter(x=>x.v===min).map(x=>x.i);
   if(candidates.length===1)f.selected.push(candidates[0]);else {s.iceFreezeChoice={seat:f.seat,candidates};return;}
  }
  delete s.iceFreezeChoice;
 }
 function capture(s){if(s.players.some(p=>p.hero===id||p.diceCube)){s.iceFirstRoll={seat:s.active,phase:s.icePhaseSerial??0,values:s.dice.slice(),selected:[]};}}
 function onStart(s){if(s.iceFirstRoll?.seat===s.active&&s.players[s.active].diceCube)s.players[s.active].diceCube=0;delete s.iceFirstRoll;delete s.iceFreezeChoice;if(s.players.some(p=>p.hero===id||p.diceCube))s.icePhaseSerial=(s.icePhaseSerial??0)+1;}
 function clear(s){if(s.players[s.active].diceCube)s.players[s.active].diceCube=0;delete s.iceFirstRoll;delete s.iceFreezeChoice;}
 function permitted(before,after){const f=before.iceFirstRoll,g=after.iceFirstRoll;if(!f||!g||f.seat!==g.seat||f.phase!==g.phase||before.turn!==after.turn)return true;return !before.dice.some((v,i)=>locked(before,before.active,i)&&after.dice[i]!==v);}
 return {
  leafletPositives: {
   iceShard: (state, seat) => gain(state, seat)
  },
  id,board,upgrades,cards,promoId:33,paths,phase,begin,gain,canConvert,canFreezerConvert,transferOptions,path,canGlide,ability,meet,pump,locked,contextLocked,freeze,capture,onStart,clear,permitted,
  initialize(s,seat){Object.assign(s.players[seat],{iceShard:0,glide:false,freezer:{shards:0,glide:false}});},
  complexity: 4,
  defenceEffect: p => `Any Ice returns 1 damage. Any Frost returns 2. Any Slide prevents 2 damage. On two matching numbers, store up to ${p.upgrades?.defence ? 2 : 1} Ice ${p.upgrades?.defence ? 'Shards' : 'Shard'} in the Freezer.`,
  defenceDiceCount:p=>p.upgrades?.defence?4:3,
  resolveDefence({state:s,seat,defender:p,counts:c}){
   const h=s.pending;h.returnDamage+=Number(!!c.Ice)+2*Number(!!c.Frost);h.prevention=(h.prevention??0)+2*Number(!!c.Slide);updateDamage(h);
   if(matchingNumbers(effectiveDice(s.defenceDice,p))>=2){begin(s,seat,[{kind:'store',left:p.upgrades?.defence?2:1}],'damage');return 'iceChoices';}return 'damage';
  },
  cardChoices(card,{s,seat,one}){
   const p=s.players[seat],h=s.pending;
   if(card===26)return p.freezer.shards>0?one:[];
   if(card===27)return p.iceShard>0?one:[];
   if(card===30)return seat===s.active&&h&&(h.attack??h.damage>0)&&!h.pure&&!h.evaded&&!h.parlayBlocked&&['iceChoices','iceAbility','iceResolved','targeting','defence','defenceResponse','damage','locked'].includes(s.stage)?one:[];
   return one;
  },
  applyCard({id:card,s,seat,p}){
   if(card===26){p.freezer.shards--;return false;}
   if(card===27){removeStatus(p,'iceShard');startSideDamage(s,1-seat,3,'Freeze the Day!',false,{keepPending:true});return true;}
   if(card===28){begin(s,seat,[{kind:'transfer'}],s.stage,{exclude:card});return true;}
   if(card===30){changeDamage(s,p.iceShard??0);return true;}
   if(card===31){grantStatus(p,'glide');return true;}
   if(card===32){gain(s,seat,2,card);return true;}
   return false;
  },
  cardRollSize:card=>[25,26,29,33].includes(card)?1:0,
  resolveCardRoll({id:card,s,seat,p,dice,counts,drawCards,random}){
   if(card===25){gain(s,seat,Math.ceil(dice[0]/2),card);return true;}
   if(card===26){if(counts.Ice)grantStatus(s.players[1-seat],'diceCube',2);if(counts.Slide)gainCP(p,3);if(counts.Frost)drawCards(p,2,random,card);return true;}
   if(card===29){const n=counts.Ice?3:counts.Slide?4:counts.Frost?5:0;if(n)begin(s,seat,[{kind:'store',left:n}],s.stage,{exclude:card});return true;}
   if(card===33){if(counts.Frost)grantStatus(p,'glide');else drawCards(p,1,random,card);return true;}
   return false;
  },
  handle(previous,a,roll,random,bypass){
   const types=['iceConvert','iceFreezerConvert','iceCollect','iceStoreDone','iceTransfer','iceTransferDone','iceChill','iceFrost','iceChooseFrozen'];if(!types.includes(a.type))return undefined;
   const seat=cardActor(previous),t=previous.iceTask,h=t?.queue[0];
   if(a.type==='iceConvert'&&!canConvert(previous,seat)||a.type==='iceFreezerConvert'&&!canFreezerConvert(previous,seat))return previous;
   if(a.type==='iceChooseFrozen'&&(!previous.iceFreezeChoice||!previous.iceFreezeChoice.candidates.includes(a.index)))return previous;
   if(['iceCollect','iceStoreDone','iceTransfer','iceTransferDone','iceChill','iceFrost'].includes(a.type)&&(!t||previous.stage!=='iceChoices'||previous.response||previous.cardRoll||previous.retry||seat!==t.seat))return previous;
   if(a.type==='iceCollect'&&(h.kind!=='gain'||!h.overflow)||a.type==='iceStoreDone'&&(h.kind!=='store'||!h.overflow)||a.type==='iceTransferDone'&&h.kind!=='transfer'||a.type==='iceChill'&&(h.kind!=='chill'||!['damage','draw'].includes(a.status))||a.type==='iceFrost'&&(h.kind!=='frost'||!['glide','draw'].includes(a.status)))return previous;
   const transfer=a.type==='iceTransfer'&&h?.kind==='transfer'?transferOptions(previous)[a.choice]:null;if(a.type==='iceTransfer'&&!transfer)return previous;
   const s=structuredClone(previous),p=s.players[seat];s.response=null;
   if(a.type==='iceConvert'){p.iceShard-=5;grantStatus(p,'glide');}
   if(a.type==='iceFreezerConvert'){p.freezer.shards-=5;p.freezer.glide=true;}
   if(a.type==='iceCollect')s.iceTask.queue[0].collect=true;
   if(a.type==='iceStoreDone')s.iceTask.queue.shift();
   if(a.type==='iceTransfer'){if(transfer.key==='shards'){p.freezer.shards-=transfer.amount;grantStatus(p,'iceShard',transfer.amount);}else {p.freezer.glide=false;grantStatus(p,'glide');}}
   if(a.type==='iceTransferDone')s.iceTask.queue.shift();
   if(a.type==='iceChill'){
    if(a.status==='damage')s.pending.damage+=Math.max(s.pending.iceman.shardSnapshot??0,p.iceShard??0);
    else s.iceTask.queue.splice(1,0,{kind:'gain',amount:2},{kind:'draw',amount:1});s.iceTask.queue.shift();
   }
   if(a.type==='iceFrost'){if(a.status==='glide')grantStatus(p,'glide');else drawCards(p,1,random,s.iceTask.exclude);if(!--s.iceTask.queue[0].left)s.iceTask.queue.shift();}
   if(a.type==='iceChooseFrozen'){s.iceFirstRoll.selected.push(a.index);delete s.iceFreezeChoice;}
   return s;
  }
 };
})();
