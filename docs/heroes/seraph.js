const seraph = (() => {
  const id = 10;
  const blade = {Blade:3}, glorious = {Blade:3,Wings:1}, purify = {Cross:2,Pendant:1};
  const smite = {Blade:1,Wings:1,Cross:1,Pendant:1};
  const cherubim = {name:'Cherubim',symbols:{Blade:3,Pendant:1},flightGain:1,holyGain:1,
    text:'3 Blades + Pendant · gain Flight and Holy Presence'};
  const board = {name:'Seraph',symbols:['Blade','Blade','Blade','Wings','Cross','Pendant'],defence:'Angelic Mantle',abilities:[
    {name:'Holy Blade',text:'3–5 Blades · 5 / 6 / 7 damage',symbols:blade,damage:c=>c.Blade+2},
    {name:'Glorious',text:'3 Blades + Wings · gain Flight and deal 6 damage',symbols:glorious,flightGain:1,damage:()=>6},
    {name:'Purify',text:'2 Crosses + Pendant · heal 4 or deal 5 undefendable damage. May remove a status from the chosen player.',symbols:purify,purify:{heal:4,damage:5},type:'undefendable'},
    {name:'Holy Smite',text:'One of each symbol · roll four dice for undefendable damage and status effects',symbols:smite,effect:'holySmite',effectCount:4,type:'undefendable'},
    {name:'Triumphant',text:'Small straight · 6 damage, then roll one die for bonus damage or undefendable damage',straight:4,damage:()=>6,effect:'triumphant',effectCount:1},
    {name:'Archangel’s Will',text:'Large straight · gain Flight, inflict Blinding Light and deal 8 damage',straight:5,flightGain:1,blinding:true,damage:()=>8},
    {name:'Highest Power',text:'4 Pendants · gain Flight and Holy Presence, inflict Blinding Light and deal 8 damage',symbols:{Pendant:4},flightGain:1,holyGain:1,blinding:true,damage:()=>8},
    {name:'Split the Heavens!',text:'5 Pendants · gain Flight, Holy Presence and Blessing of Divinity, then deal 13 Ultimate damage',symbols:{Pendant:5},flightGain:1,holyGain:1,blessing:true,damage:()=>13,type:'ultimate'}
  ]};
  const upgrades = [
    ['Holy Blade II',2,'Holy Blade',{damage:c=>c.Blade+3,text:'3–5 Blades · 6 / 7 / 8 damage'},2,cherubim],
    ['Glorious II',2,'Glorious',{damage:()=>7,text:'3 Blades + Wings · gain Flight and deal 7 damage'},2,
      {name:'Take Flight',symbols:{Blade:1,Wings:2},flightTarget:true,flightGain:1,damage:()=>3,type:'undefendable',text:'Blade + 2 Wings · chosen player gains Flight. Deal 3 undefendable damage.'}],
    ['Triumphant II',2,'Triumphant',{damage:()=>8,text:'Small straight · 8 damage, then roll one die for bonus damage or undefendable damage'}],
    ['Archangel’s Will II',2,'Archangel’s Will',{damage:()=>9,text:'Large straight · gain Flight, inflict Blinding Light and deal 9 damage'},2,
      {name:'Heaven’s Blessing',symbols:{Blade:1,Cross:2},flightTarget:true,flightGain:2,cleanseGain:2,text:'Blade + 2 Crosses · chosen player gains 2 Cleanse and 2 Flight'}],
    ['Highest Power II',2,'Highest Power',{damage:()=>10,text:'4 Pendants · gain Flight and Holy Presence, inflict Blinding Light and deal 10 damage'},2,
      {name:'Divine Visage',symbols:{Pendant:3},holyGain:1,flightGain:2,cleanseGain:2,blinding:true,text:'3 Pendants · gain Holy Presence, 2 Flight and 2 Cleanse, and inflict Blinding Light'}],
    ['Purify II',2,'Purify',{purify:{heal:5,damage:6},text:'2 Crosses + Pendant · may remove a status. Then heal the chosen player for 5 or deal 6 undefendable damage.'}],
    ['Holy Smite II',2,'Holy Smite',{smiteUpgrade:true,text:'One of each symbol · roll four dice. Gain Flight and Cleanse per matching symbol.'},2,
      {name:'Holy Command',symbols:{Blade:3,Cross:1},heal:()=>1,damage:()=>4,type:'undefendable',text:'3 Blades + Cross · heal 1 and deal 4 undefendable damage'}],
    ['Holy Blade III',3,'Holy Blade',{damage:c=>2*c.Blade-1,blindingMatch:4,text:'3–5 Blades · 5 / 7 / 9 damage. Inflict Blinding Light on four of a kind.'},3,
      {...cherubim,name:'Cherubim II',cleanseGain:1,text:'3 Blades + Pendant · gain Cleanse, Flight and Holy Presence'}],
    ['Angelic Mantle II',2,'defence',{}],
    ['Angelic Mantle III',3,'defence',{},3]
  ];
  const cards = [['To the Skies!',1,'main'],['Divine Intervention!',4,'main'],
    ['Angelic Combat!',1,'roll'],['Smote!',1,'roll'],['Holier Than Thou!',0,'main']];
  return {
    id, board, upgrades, cards, promoId:33,
    effects:{
      triumphant(hit,counts) {
        hit.damage+=counts.Blade?1:counts.Wings?2:counts.Cross?3:0;
        if(counts.Pendant)hit.undefendable=true;
      },
      holySmite(hit,counts) {
        hit.damage=2*(counts.Blade??0);
        hit.flightGain=hit.smiteUpgrade?(counts.Wings??0):Number(!!counts.Wings);
        hit.cleanseGain=hit.smiteUpgrade?(counts.Cross??0):Number(!!counts.Cross);
        hit.blindingLight=!!counts.Pendant;
      }
    },
    cardChoices(card,{s,seat,one}) {
      if(card===29||card===30){
        const names=heroNames(s);
        const players=names.map((label,target)=>({label,target}));
        if(card===29)return players;
        return players.flatMap(light=>players.flatMap(flight=>players.map(cleanse=>({
          light:light.target,flight:flight.target,cleanse:cleanse.target,
          label:`Blind ${light.label} · Flight for ${flight.label} · Cleanse for ${cleanse.label}`
        }))));
      }
      if(card===31||card===32){
        const hit=s.pending;
        return seat===s.active&&hit?.attack&&!hit.pure&&!hit.ultimate&&!hit.evaded&&!hit.parlayBlocked&&
          ['defence','defenceResponse','damage','locked'].includes(s.stage)?one:[];
      }
      return one;
    },
    applyCard({id:card,s,p,choice,grantStatus}) {
      if(card===29){grantStatus(s.players[choice.target],'flight');return true;}
      if(card===30){
        grantStatus(p,'holyPresence');
        grantStatus(s.players[choice.light],'blindingLight');
        grantStatus(s.players[choice.flight],'flight',2);
        grantStatus(s.players[choice.cleanse],'cleanse');
        return true;
      }
      return false;
    },
    cardRollSize(card) { return card===32?5:[31,33].includes(card)?1:0; },
    resolveCardRoll({id:card,p,opponent,counts,hit,grantStatus,grantAttackStatus,s,updateDamage,drawCards,random}) {
      if(card===31){
        hit.grossDamage+=counts.Blade?3:0;
        if(counts.Wings)grantStatus(p,'flight');
        if(counts.Cross)grantStatus(p,'cleanse');
        if(counts.Pendant)grantStatus(p,'holyPresence');
      } else if(card===32){
        hit.grossDamage+=counts.Blade??0;
        if(counts.Pendant)grantAttackStatus(s,opponent,'blindingLight');
      } else if(card===33){
        if(counts.Pendant){grantStatus(p,'flight',2);grantStatus(p,'cleanse',2);}
        else drawCards(p,1,random,card);
        return true;
      } else return false;
      updateDamage(hit);
      return false;
    },
    defenceDiceCount() { return 1; },
    resolveDefence({state,defender,counts,grantStatus,updateDamage}) {
      const level=defender.upgrades?.defence??0, hit=state.pending;
      if(counts.Blade)hit.returnDamage=level?3:2;
      if(counts.Wings&&level)grantStatus(defender,'flight');
      const prevent=counts.Cross?2:counts.Pendant?(level===28?4:3):counts.Wings&&!level?1:0;
      hit.prevention=(hit.prevention??0)+prevent;
      updateDamage(hit);
    }
  };
})();
