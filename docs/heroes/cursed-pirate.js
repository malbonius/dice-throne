const cursedPirate = (() => {
  const id = 8;
  const symbols = ['Cutlass','Cutlass','Cutlass','Booty','Booty','Skull'];
  const plank = {Cutlass:1,Booty:2,Skull:1};
  const shiver = {Cutlass:1,Skull:3};
  const spot = {Skull:4};
  const touch = {Skull:5};
  const board = {name:'Cursed Pirate', symbols, defence:'Ahoy Matey', abilities:[
    {name:'Cutlass Strike',text:'3–5 Cutlasses · 5 / 6 / 7 damage; four matching numbers inflict Powder Keg',symbols:{Cutlass:3},damage:c=>c.Cutlass+2,kegMatch:4},
    {name:'X Marks the Spot',text:'3 Booty · gain 1 CP and roll three dice for damage, cards and Doubloons',symbols:{Booty:3},cpGain:1,effect:'pirateBooty',effectCount:3,type:'undefendable'},
    {name:'Walk the Plank',text:'Cutlass + 2 Booty + Skull · steal 1 CP or make your opponent discard; deal 7 damage',symbols:plank,damage:()=>7,piratePlank:true},
    {name:'Light the Fuse',text:'Small / large straight · inflict Powder Keg and deal 7 / 9 damage',straight:4,powderKeg:true,damage:c=>c.largeStraight?9:7},
    {name:'Black Spot',text:'4 Skulls · gain a Doubloon, inflict Parlay and deal 7 undefendable damage',symbols:spot,parlay:true,pirateCoins:1,damage:()=>7,type:'undefendable'},
    {name:'Shiver Me Timbers',text:'Cutlass + 3 Skulls · deal 7 undefendable damage and remove any number of your own Doubloons',symbols:shiver,pirateRemove:true,damage:()=>7,type:'undefendable'},
    {name:"Pirate’s Touch!",text:'5 Skulls · 12 Ultimate damage, gain 2 Doubloons, inflict Parlay and Powder Keg',symbols:touch,damage:()=>12,pirateCoins:2,parlay:true,powderKeg:true,type:'ultimate'}
  ]};
  const cursedBoard = {...board,defence:'Avast Ye',abilities:[
    {name:'Soul Cutlass',text:'3–5 Cutlasses · 5 / 7 / 9 damage; three matching numbers inflict Powder Keg',symbols:{Cutlass:3},damage:c=>2*c.Cutlass-1,kegMatch:3},
    {name:'Dread Mark',text:'3 Booty · gain 2 CP and roll four dice for damage, cards and inflicting Doubloons',symbols:{Booty:3},cpGain:2,effect:'pirateBooty',effectCount:4,type:'undefendable'},
    {name:'Abyssal Walk',text:'Cutlass + 2 Booty + Skull · steal 1 CP, make your opponent discard, inflict Wither and deal 8 damage',symbols:plank,damage:()=>8,piratePlank:true,wither:true},
    {name:'Thar She Blows',text:'Small / large straight · inflict Wither and Powder Keg, deal 7 / 10 damage',straight:4,powderKeg:true,wither:true,damage:c=>c.largeStraight?10:7},
    {name:'Black Soul',text:'4 Skulls · inflict Parlay, Powder Keg and Wither; deal 8 undefendable damage',symbols:spot,parlay:true,powderKeg:true,wither:true,damage:()=>8,type:'undefendable'},
    {name:'The Shivering',text:'Cutlass + 3 Skulls · deal 8 undefendable damage plus 1 per Doubloon you have inflicted',symbols:shiver,pirateCoinDamage:true,damage:()=>8,type:'undefendable'},
    {name:'Cursed Touch!',text:'5 Skulls · 13 Ultimate damage; inflict Parlay, Doubloon, Wither and Powder Keg',symbols:touch,damage:()=>13,pirateInflict:1,parlay:true,wither:true,powderKeg:true,type:'ultimate'}
  ]};
  const cards = [
    ['Yo Ho!',2,'main'],['Light It Up!',2,'main'],['Feed the Fish!',3,'main'],['Pirate’s Life!',1,'main'],
    ['High Stakes!',2,'main'],['Crow’s Nest!',1,'main'],['Truce!',3,'main'],['Pillage!',0,'main'],
    ['Scurvy!',2,'main'],['Swashbuckle!',2,'main'],['Ransom!',1,'roll'],['Run Ya Through!',2,'roll'],
    ['Shark Bait!',1,'roll'],['Batten Down!',4,'instant'],['Cursed Cards!',0,'instant'],['Heave-Ho!',0,'main']
  ];
  const promoId = 34;
  const targetStatus = {20:'powderKeg',21:'powderKeg',25:'parlay'};
  const cardRolls = {23:2,24:1,28:1,30:5,34:1};

  function coins(state, recipient, owner) {
    return state.players[recipient].pirateCoins?.[owner] ?? 0;
  }
  function setCoins(state, recipient, owner, count) {
    const player = state.players[recipient];
    (player.pirateCoins ??= [0,0])[owner] = count;
  }
  function inflictCoins(state, owner, count) {if(psylocke.block(state,state.players[1-owner],'doubloon',count))return;
    const recipient = 1-owner;
    setCoins(state,recipient,owner,Math.min(3,coins(state,recipient,owner)+count));
  }
  function choose(state, seat, kind, extra={}) {
    state.pirateChoice = {seat,kind,resume:state.stage,...extra};
    state.stage = 'pirateChoice';
  }

  function steal(p, opponent, bounded) {
    if (!opponent.cp) return;
    opponent.cp--;
    gainCP(p,1);
  }

  return {
    id, board, cursedBoard, cards, promoId, upgrades:[],
    initialize(state, seat) {
      setCoins(state,seat,seat,3);
    },
    foreignCoins(state, seat) { return coins(state,seat,1-seat); },
    endTurn(state, seat, add) {
      const count = coins(state,seat,seat);
      if (state.players[seat].cursed) return;
      if (count) setCoins(state,seat,seat,count-1);
      else {
        state.players[seat].cursed = true;
        add(`Cursed Pirate (P${seat+1}) flips to the cursed board.`);
      }
    },
    coinOptions(state, seat, count, resume) {if(psylocke.block(state,state.players[seat],'doubloon',count))return false;
      const max = Math.min(count,5-coins(state,seat,seat));
      if (max>0) choose(state,seat,'coins',{max,after:resume});
      return max>0;
    },
    choices(state) {
      const {seat,kind,max,index} = state.pirateChoice;
      const player = state.players[seat];
      const amounts = (zero, count, label) => Array.from({length:count+1},(_,amount)=>amount?label(amount):zero);
      switch (kind) {
        case 'coins': return amounts('Decline Doubloons',max,n=>`Gain ${n} Doubloon${n===1?'':'s'}`);
        case 'remove': return amounts('Keep Doubloons',coins(state,seat,seat),n=>`Remove ${n} Doubloon${n===1?'':'s'}`);
        case 'plank': return ['Steal 1 CP','Opponent discards a card'];
        case 'discard': return player.hand.length ? player.hand.map(card=>cardInfo(heroId(state,seat),card).name) : ['Continue'];
        case 'inspect': return ['Continue'];
        case 'yoHo': return ['Accept Powder Keg','Roll a die'];
        case 'ransom': return [...(player.cp>=2?['Pay 2 CP']:[]),`Reroll die ${index+1}`];
        case 'passKeg': return ['Keep Powder Keg','Pass Powder Keg'];
        default: return [];
      }
    },
    resolveChoice(state, selection, {roll,bounded,grantPirateStatus,rollContext,releaseChangedAnnouncement,add}) {
      const choice = state.pirateChoice;
      const {seat,kind,index,after} = choice;
      const p = state.players[seat], opponent = state.players[1-seat];
      state.pirateChoice = null;
      state.stage = choice.resume;
      switch (kind) {
        case 'coins': setCoins(state,seat,seat,coins(state,seat,seat)+selection); break;
        case 'remove': setCoins(state,seat,seat,coins(state,seat,seat)-selection); break;
        case 'plank':
          if (selection===0) steal(p,opponent,bounded);
          else if (opponent.hand.length) choose(state,1-seat,'discard',{after});
          break;
        case 'discard':
          if (p.hand.length) p.discard.push(p.hand.splice(selection,1)[0]);
          break;
        case 'yoHo':
          if (selection===1) {
            const die = roll();
            add(`Yo Ho! rolls ${die}.`);
            if (die<=2) break;
            grantPirateStatus(state,seat,'wither');
          }
          grantPirateStatus(state,seat,'powderKeg');
          break;
        case 'ransom':
          if (p.cp>=2 && selection===0) {
            p.cp-=2;
            gainCP(opponent,2);
          } else {
            const ctx=rollContext(state), before=ctx.dice.slice();
            ctx.dice[index]=roll();
            if (ctx.scalar) state.effectDie=ctx.dice[0];
            releaseChangedAnnouncement(state,ctx,before);
            add(`Ransom! rerolls die ${index+1} to ${ctx.dice[index]}.`);
          }
          break;
        case 'passKeg':
          if (selection) {
            p.powderKeg=false;
            grantPirateStatus(state,1-seat,'powderKeg');
          }
          break;
      }
      return state.pirateChoice ? null : after;
    },
    effects: {
      pirateBooty(p,counts,{attacker}) {
        p.damage = 2*(counts.Cutlass??0);
        p.draw = counts.Booty??0;
        if (attacker.cursed) p.pirateInflict = counts.Skull??0;
        else p.pirateCoins = counts.Skull??0;
      }
    },
    prepareAbility(state,{bounded}) {
      const seat = state.active, p = state.players[seat], target = state.players[1-seat], hit = state.pending;
      if (hit.pirateCoinDamage) {
        hit.damage += coins(state,1-seat,seat);
        hit.pirateCoinDamage = false;
      }
      if (hit.piratePlank) {
        hit.piratePlank = false;
        if (!p.cursed) { choose(state,seat,'plank',{after:'offence'}); return true; }
        steal(p,target,bounded);
        if (target.hand.length) { choose(state,1-seat,'discard',{after:'offence'}); return true; }
      }
      if (hit.pirateCoins) {
        const count = hit.pirateCoins;
        hit.pirateCoins = 0;
        if (this.coinOptions(state,seat,count,'offence')) return true;
      }
      return false;
    },
    inflictCoins,
    cardRollSize(card) { return cardRolls[card] ?? 0; },
    cardChoices(card, {s, seat, pos, d, one}) {
      if (card===29) return d && d.seat!==seat ? pos : [];
      if (card===30 || card===31) {
        const hit=s.pending;
        return seat===s.active && hit?.attack && !hit.pure && !hit.evaded &&
          ['defence','defenceResponse','damage','locked'].includes(s.stage) ? one : [];
      }
      if (card===33) return [0,2,4].map((amount,i)=>({amount,label:`Draw ${i+1}${amount?` and take ${amount} damage`:''}`}));
      return one;
    },
    applyCard({id:card,s,seat,p,opponent,choice,bounded,updateDamage,grantPirateStatus,drawCards,random,startSideDamage}) {
      if (targetStatus[card]) {
        grantPirateStatus(s,1-seat,targetStatus[card]);
        return true;
      }
      switch (card) {
        case 19: choose(s,1-seat,'yoHo'); return true;
        case 22:
          if (p.cursed) p.hp=bounded(p.hp+3,60);
          else this.coinOptions(s,seat,1);
          return true;
        case 26: steal(p,opponent,bounded); return true;
        case 27:
          startSideDamage(s,seat,1,'Scurvy!',false,{afterPirateStatus:[1-seat,'wither'],keepPending:true});
          return true;
        case 29: choose(s,1-seat,'ransom',{index:choice.i}); return true;
        case 31: s.pending.grossDamage+=2; updateDamage(s.pending); return true;
        case 32:
          p.discard.push(...p.hand);
          p.hand=[];
          drawCards(p,4,random,card);
          return true;
        case 33:
          if (choice.amount) startSideDamage(s,seat,choice.amount,'Cursed Cards!',false,{draw:1+choice.amount/2,exclude:card,keepPending:true});
          else drawCards(p,1,random,card);
          return true;
        default: return false;
      }
    },
    resolveCardRoll({id:card,p,opponent,counts,hit,s,seat,bounded,updateDamage,grantPirateStatus,drawCards,discardRandom,random,startSideDamage}) {
      if (card===23 && counts.Booty) { drawCards(p,2,random,card); gainCP(p,2); }
      if (card===24) {
        if (counts.Cutlass) choose(s,seat,'inspect');
        else if (counts.Booty && opponent.hand.length) choose(s,1-seat,'discard');
        else if (counts.Skull) discardRandom(opponent,random);
      }
      if (card===28) {
        if (counts.Cutlass) startSideDamage(s,1-seat,2,'Swashbuckle!');
        else if (counts.Booty) drawCards(p,2,random,card);
        else grantPirateStatus(s,1-seat,'powderKeg');
      }
      if (card===30) {
        hit.grossDamage+=counts.Cutlass??0;
        updateDamage(hit);
        if ((counts.Cutlass??0)>=3) grantPirateStatus(s,1-seat,'powderKeg',true);
      }
      if (card===promoId) {
        if (counts.Skull) grantPirateStatus(s,1-seat,'parlay');
        else drawCards(p,1,random,card);
      }
    },
    defenceDiceCount(defender) { return defender.cursed ? 5 : 4; },
    resolveDefence({state,seat,defender,counts,bounded,updateDamage}) {
      const hit = state.pending;
      hit.returnDamage = counts.Cutlass??0;
      gainCP(defender,(counts.Booty??0));
      hit.prevention = (hit.prevention??0)+2*(counts.Skull??0);
      updateDamage(hit);
      if ((counts.Cutlass??0)>=2 && counts.Skull) {
        if (defender.cursed) inflictCoins(state,seat,1);
        else if (this.coinOptions(state,seat,1,'damage')) return 'pirateChoice';
      }
    },
    choose
  };
})();
