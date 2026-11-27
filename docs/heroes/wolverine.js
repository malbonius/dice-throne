const wolverine=(()=>{
 const id=39;
 const board={name:'Wolverine',symbols:['Claw','Claw','Claw','Adamantium','Adamantium','Mask'],defence:'Vengeful',abilities:[
  {name:'Adamantium Claws',symbols:{Claw:3},damage:c=>Math.min(c.Claw,5)+1,clawHeal:true,text:'3 / 4 / 5 Claw · deal 4 / 5 / 6 damage. On three matching numbers, heal 2.'},
  {name:'Regenerate',symbols:{Claw:2,Mask:2},wHeal:1,removeSelf:true,damage:()=>3,type:'undefendable',text:'Heal 1. Deal 3 undefendable damage. You may remove one status effect from yourself.'},
  {name:'Healing Factor',symbols:{Adamantium:3,Mask:1},wHeal:4,rage:1,wDraw:1,wDrawAfter:true,text:'Heal 4. Gain Rage. Draw 1.'},
  {name:'Hunter',symbols:{Claw:2,Adamantium:3},wDraw:1,damage:()=>6,effect:'wolverineHunter',effectCount:4,text:'Draw 1. Deal 6 damage. Roll 4 and gain Rage per Mask.'},
  {name:'Barrage',straight:4,wHeal:1,rage:1,damage:()=>5,text:'Small straight · heal 1 and gain Rage. Then deal 5 damage.'},
  {name:'Barrage (large straight)',straight:5,upgradeSlot:'Barrage',variant:'large',wHeal:2,rage:0,barrageChoice:true,damage:()=>7,text:'Large straight · heal 2. Gain Rage or inflict Alpha. Then deal 7 damage.'},
  {name:'Severe Threat',symbols:{Claw:3,Mask:2},damage:()=>7,effect:'wolverineSevere',effectCount:3,text:'Deal 7 damage and roll 3: add damage per Claw; any Adamantium inflicts Alpha; any Mask adds 3 damage.'},
  {name:'Power Level Nine',symbols:{Mask:4},wHeal:1,rage:1,alpha:true,damage:()=>6,type:'undefendable',text:'Heal 1. Gain Rage. Inflict Alpha. Then deal 6 undefendable damage.'},
  {name:'Berserker Rage!',symbols:{Mask:5},wHeal:3,rage:1,damage:()=>12,type:'ultimate',text:'Heal 3. Gain Rage. Then deal 12 Ultimate damage, divided among opponents as desired.'}
 ]};
 const upgrades=[
  ['Adamantium Claws II',0,'Adamantium Claws',{clawHealUp:true,text:'Deal 4 / 5 / 6 damage. Three matching numbers heal 3; alternatively four matching numbers heal 4.'}],
  ['Barrage II',3,'Barrage',{damage:()=>7,text:'Small straight · heal 1 and gain Rage. Then deal 7 damage.',variants:{large:{wHeal:2,rage:0,barrageChoice:true,damage:()=>9,label:'Barrage II (large straight)',text:'Large straight · heal 2, gain Rage or inflict Alpha. Then deal 9 damage.'}}}],
  ['Severe Threat II',2,'Severe Threat',{effectCount:5,severeChoice:true,text:'Deal 7 damage and roll 5: damage per Claw; any Adamantium inflicts Alpha; any Mask gains Rage or adds 3 damage.'}],
  ['Power Level Nine II',2,'Power Level Nine',{wHeal:2,rage:2,text:'Heal 2. Gain 2 Rage. Inflict Alpha. Then deal 6 undefendable damage.'},2,{name:'Levels Rising',symbols:{Mask:3},rage:2,alpha:true,damage:()=>1,type:'undefendable',text:'Gain 2 Rage. Inflict Alpha. Then deal 1 undefendable damage.'}],
  ['Vengeful II',2,'defence',{}]
 ];
 const cards=[['Intimidate!',0,'main'],['Is That All You Got!?',2,'roll'],['Fastball Special!',1,'roll'],['Recovery',0,'rage'],['Recovery',0,'rage'],['Astonishing Recovery',0,'rage'],['Frenzy',0,'rage'],['Frenzy',0,'rage'],['Astonishing Frenzy',0,'rage'],['Feral!',0,'main']];
 function busy(s){return !!(s.psyReveal||s.rogueGain||s.stormTask&&s.stage==='stormChoices'||s.iceFreezeChoice||s.wolverineRageRoll||s.alphaRoll||s.rogueRoll||s.jeanBurnRoll||s.widowAgility||s.widowBombRoll||s.cosmicRayRoll||s.gambitRoll||s.scarletJinx||s.seraphRoll||s.artRoll||s.lokiBag||s.wolverineIntimidate||s.retry||s.cardRoll||s.growth||s.mainChoice||s.mainAction||s.strangeTask||s.premonitionTask||s.lokiTask||s.lokiIllusion||s.conjureTask||s.widowTask||s.widowReveal);}
 function attack(s,seat){const h=s.pending;return !!(seat===s.active&&h&&(h.attack??h.damage>0)&&!h.pure&&!h.evaded&&!h.parlayBlocked&&!s.sideDamage&&['wolverineAbility','wolverineResolved','wolverineSevere','stormAbility','rogueAbility','psyAbility','jeanAbility','jeanResolved','iceAbility','iceResolved','gambitAbility','cyclopsAbility','thorAbility','widowAbility','targeting','defence','defenceResponse','damage','locked'].includes(s.stage));}
 function rageChoices(s,seat){const p=s.players[seat],out=[];if(!s.cards||!p.rage||busy(s)||s.stage==='finished'||s.stage==='discard'||seat!==s.active&&attackLocked(s))return out;
  if(p.rage>=3&&(p.deck.length||p.discard.length))out.push({kind:'draw',label:'Spend 3 Rage · draw 1 card'});
  if(attack(s,seat))for(const card of p.hand)out.push({kind:'boost',card,label:`Spend Rage · discard ${seatCard(s,seat,card).name} · add ${heroId(s,seat)===id&&card===32?4:3} damage`});return out;
 }
 function gain(s,seat,n=1,exclude){if(!n||psylocke.block(s,s.players[seat],'rage',n))return;const p=s.players[seat];if((p.rage??0)+n>3&&rageChoices(s,seat).length){s.wolverineGain={seat,amount:n,...(exclude!==undefined?{exclude}:{})};return;}grantStatus(p,'rage',n);}
 function damage(s,n){const h=s.pending;if(h.grossDamage===undefined){h.damage+=n;h.wolverineModifiers=(h.wolverineModifiers??0)+n;}else{h.grossDamage+=n;updateDamage(h);}}
 function inflictAlpha(s,target,source,roll,resume=s.stage){const p=s.players[target];if(p.alpha||psylocke.block(s,p,'alpha'))return false;grantStatus(p,'alpha');s.alphaRoll={seat:source,target,dice:rollToken(roll,'alpha',target,2,[source,target]),resume,locked:!!attackLocked(s)};s.stage='alphaRoll';return true;}
 function ability(s){const h=s.pending;if(!h.wolverine||h.wolverine.ready)return false;h.wolverine.ready=true;s.stage='wolverineAbility';return true;}
 function printed(s,roll,random){const r=s.pending.wolverine,p=s.players[s.active];
  if(!r.healed){r.healed=true;p.hp=bounded(p.hp+(r.heal??0),60);if(r.draw&&!r.drawAfter)drawCards(p,r.draw,random);}
  if(r.remove&&!r.removed){s.stage='wolverineRemove';return true;}
  if(r.choice&&!r.chosen){s.stage='wolverineBarrage';return true;}
  if(!r.gained){r.gained=true;gain(s,s.active,r.rage??0);if(s.wolverineGain)return true;}
  if(r.drawAfter&&!r.drewAfter){r.drewAfter=true;drawCards(p,r.draw,random);}
  if(r.alpha&&!r.alphaDone){r.alphaDone=true;if(inflictAlpha(s,1-s.active,s.active,roll,'wolverineAbility'))return true;}
  return false;
 }
 function effect(s,c){const h=s.pending,r=h.wolverine;if(h.effect==='wolverineHunter'){s.stage='wolverineResolved';gain(s,s.active,c.Mask??0);return;}
  h.damage+=c.Claw??0;r.effectAlpha=!!c.Adamantium;if(c.Mask){if(r.severeChoice){s.stage='wolverineSevere';return;}h.damage+=3;}s.stage='wolverineResolved';
 }
 function effectAlpha(s,roll){const r=s.pending.wolverine;if(r.effectAlpha&&!r.effectAlphaDone){r.effectAlphaDone=true;return inflictAlpha(s,1-s.active,s.active,roll,'wolverineResolved');}return false;}
 function removalChoices(s){const p=s.players[s.active];return statusKeys.filter(k=>p[k]&&!['covertOps','cosmicRay'].includes(k)).flatMap(key=>key==='timeBomb'?(p.timeBombTimers??[]).map(b=>({key,tokenId:b.id,label:`Time Bomb 0:0${b.ticks}`})):key==='spellbound'?(p.boundAbilities??[]).map(b=>({key,tokenId:b.id,label:`Spellbound · ${b.key}`})):key==='bagOfTricks'?(p.trickBags??[]).map(b=>({key,tokenId:b.id,label:`Bag of Tricks from ${heroNames(s)[b.owner]}`})):[{key,label:statusLabel(key)}]);}
 function resolveRecovery(s,random){const r=s.wolverineRageRoll,p=s.players[r.seat],c=tally(effectiveDice(r.dice,p),heroId(s,r.seat));delete s.wolverineRageRoll;
  if(c.Mask){const at=p.discard.indexOf(r.id);if(at>=0){p.discard.splice(at,1);p.hand.push(r.id);}}
  else if(r.id===29)p.hp=bounded(p.hp+2,60);
 }
 function pump(s){const f=s.wolverineFastball;if(!f||s.stage==='finished'||s.wolverineGain||s.wolverineRageRoll||s.sideDamage)return;
  if(f.step==='gain'){f.step='damage';startSideDamage(s,f.seat,2,'Fastball Special!',false,{keepPending:true,pantherLocked:f.locked});}
  else {damage(s,2);delete s.wolverineFastball;}
 }
 return {
  leafletPositives: {
   rage: (state, seat) => gain(state, seat)
  },
  id,board,upgrades,cards,promoId:33,busy,attack,rageChoices,gain,inflictAlpha,ability,printed,effect,effectAlpha,removalChoices,pump,
  initialize(s,seat){Object.assign(s.players[seat],{rage:0,alpha:false});},
  complexity: 2,
  defenceDiceCount:p=>p.upgrades?.defence?4:3,
  resolveDefence({state:s,seat,counts:c}){s.pending.returnDamage+=c.Claw??0;s.stage='damage';if(c.Mask)gain(s,seat);return 'damage';},
  cardChoices(card,{s,seat,one}){if(card>=27&&card<=32)return [];if(card===24)return s.players[1-seat].alpha?one:[];
   if(card===25){const h=s.pending;if(seat===s.active||!h?.attack||h.ultimate||!['defence','defenceResponse','damage'].includes(s.stage))return [];return [{skip:false,label:'Gain 2 Rage'},...(s.stage==='defence'&&!h.undefendable&&!h.pure&&!h.parlayBlocked?[{skip:true,label:'Gain 2 Rage · skip defence to gain 2 CP'}]:[])];}
   if(card===26)return !busy(s)&&attack(s,seat)?one:[];return one;
  },
  applyCard({id:card,s,seat,p,choice}){
   if(card===24){s.wolverineIntimidate={seat,target:1-seat,resume:s.stage};s.stage='wolverineIntimidate';return true;}
   if(card===25){if(choice.skip){gainCP(p,2);s.stage='damage';}gain(s,seat,2,card);return true;}
   if(card===26){s.wolverineFastball={seat,step:'gain',locked:!!attackLocked(s)};gain(s,seat,1,card);return true;}return false;
  },
  cardRollSize:card=>card===33?1:0,
  resolveCardRoll({id:card,s,seat,p,counts:c,random}){if(card!==33)return false;drawCards(p,1,random,card);if(c.Mask)gain(s,seat,2,card);return true;},
  handle(previous,a,roll,random,bypassResponse){
   if(!['spendRage','collectRage','resolveRageRecovery','resolveAlpha','wolverineBarrage','wolverineRemove','wolverineSevere','wolverineIntimidate'].includes(a.type))return undefined;
   const seat=cardActor(previous),r=previous.pending?.wolverine;
   const choice=a.type==='spendRage'?rageChoices(previous,seat)[a.choice]:a.type==='wolverineRemove'?removalChoices(previous)[a.choice]:null;
   if(a.type==='spendRage'&&!choice||a.type==='collectRage'&&(!previous.wolverineGain||previous.wolverineGain.seat!==seat||previous.wolverineRageRoll||previous.response))return previous;
   if(a.type==='resolveRageRecovery'&&(!previous.wolverineRageRoll||previous.cardRoll||previous.retry||previous.response)||a.type==='resolveAlpha'&&(!previous.alphaRoll||previous.cardRoll||previous.retry||previous.response))return previous;
   if(['resolveRageRecovery','resolveAlpha'].includes(a.type)&&!bypassResponse&&!previous.response){const t=previous.wolverineRageRoll??previous.alphaRoll;if(!t.locked&&hasResponse(previous,1-t.seat))return {...previous,response:{seat:1-t.seat,action:a}};}
   if(a.type==='wolverineBarrage'&&(previous.stage!=='wolverineBarrage'||seat!==previous.active||!['rage','alpha'].includes(a.status)))return previous;
   if(a.type==='wolverineSevere'&&(previous.stage!=='wolverineSevere'||seat!==previous.active||!['rage','damage'].includes(a.status)))return previous;
   if(a.type==='wolverineRemove'&&(previous.stage!=='wolverineRemove'||seat!==previous.active||!choice&&a.choice!==-1))return previous;
   const intimidate=previous.wolverineIntimidate;if(a.type==='wolverineIntimidate'&&(!intimidate||seat!==intimidate.target||a.status!=='damage'&&(a.status!=='discard'||!previous.players[seat].hand.includes(a.id))))return previous;
   const s=structuredClone(previous),p=s.players[seat];psylocke.setState(s);s.response=null;
   if(a.type==='spendRage'){
    if(choice.kind==='draw'){p.rage-=3;drawCards(p,1,random,s.wolverineGain?.exclude);}
    else {p.rage--;p.hand.splice(p.hand.indexOf(choice.card),1);p.discard.push(choice.card);damage(s,heroId(s,seat)===id&&choice.card===32?4:3);
     if(heroId(s,seat)===id&&[30,31,32].includes(choice.card))psylocke.withoutAbility(s,()=>gain(s,seat));
     if(heroId(s,seat)===id&&[27,28,29].includes(choice.card)){s.wolverineRageRoll={seat,id:choice.card,dice:rollBatch(roll,2),locked:!!attackLocked(s)};if(s.wolverineRageRoll.locked)resolveRecovery(s,random);}
    }
   }
   if(a.type==='collectRage'){grantStatus(p,'rage',s.wolverineGain.amount);delete s.wolverineGain;}
   if(a.type==='resolveRageRecovery')resolveRecovery(s,random);
   if(a.type==='resolveAlpha'){const t=s.alphaRoll,own=dieValue(t.dice[0],s.players[t.seat]),other=dieValue(t.dice[1],s.players[t.target]);if(own<other)removeStatus(s.players[t.target],'alpha');s.stage=t.resume;delete s.alphaRoll;s.log.unshift(`Alpha rolls ${own} against ${other}: ${own<other?'token removed':'token retained'}.`);}
   if(a.type==='wolverineBarrage'){const q=s.pending.wolverine;q.chosen=true;q.rage=a.status==='rage'?1:0;q.alpha=a.status==='alpha';s.stage='wolverineAbility';}
   if(a.type==='wolverineSevere'){psylocke.useAbility(s);s.stage='wolverineResolved';if(a.status==='rage')gain(s,seat);else s.pending.damage+=3;}
   if(a.type==='wolverineRemove'){if(choice){if(choice.key==='timeBomb')blackWidow.removeBomb(p,choice.tokenId);else removeMatchStatus(s,seat,choice.key,choice.tokenId);}s.pending.wolverine.removed=true;s.stage='wolverineAbility';}
   if(a.type==='wolverineIntimidate'){s.stage=intimidate.resume;delete s.wolverineIntimidate;if(a.status==='discard'){p.hand.splice(p.hand.indexOf(a.id),1);p.discard.push(a.id);}else startSideDamage(s,seat,4,'Intimidate!',false,{keepPending:true});}
   return s;
  }
 };
})();
