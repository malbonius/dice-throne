const samurai = (() => {
  const id = 13;
  const board = {name:'Samurai',symbols:['Katana','Katana','Katana','Kabuto','Kabuto','Rising Sun'],defence:'Stand Tall',abilities:[
    {name:'Katana Slice',symbols:{Katana:3},damage:c=>c.Katana+2,text:'3–5 Katana · 5 / 6 / 7 damage'},
    {name:'Wakizashi',symbols:{Katana:2,'Rising Sun':2},backStrike:true,damage:()=>3,type:'undefendable',text:'2 Katana + 2 Rising Suns · gain Back Strike and deal 3 undefendable damage'},
    {name:'Solemnity',symbols:{Katana:2,Kabuto:3},shame:1,damage:()=>7,text:'2 Katana + 3 Kabuto · inflict Shame and deal 7 damage'},
    {name:'Budō',straight:4,honorGain:1,damage:()=>6,text:'Small straight · gain Honor and deal 6 damage'},
    {name:'Masamune',straight:5,damage:()=>7,effect:'masamune',effectCount:4,text:'Large straight · 7 damage, then roll four dice for damage, Shame and Back Strike'},
    {name:'Hagakure',symbols:{'Rising Sun':4},honorGain:1,backStrike:true,shame:2,damage:()=>5,type:'undefendable',text:'4 Rising Suns · gain Honor and Back Strike, inflict 2 Shame, and deal 5 undefendable damage'},
    {name:'Shogun!',symbols:{'Rising Sun':5},honorGain:1,shame:2,damage:()=>13,type:'ultimate',text:'5 Rising Suns · gain Honor, inflict 2 Shame and deal 13 Ultimate damage'}
  ]};
  const upgrades = [
    ['Stand Tall II',3,'defence',{}],
    ['Katana Slice II',2,'Katana Slice',{damage:c=>c.Katana+3,shameMatch:4,text:'3–5 Katana · 6 / 7 / 8 damage. Inflict Shame on four of a kind.'}],
    ['Katana Slice III',3,'Katana Slice',{damage:c=>c.Katana+3,shameMatch:3,text:'3–5 Katana · 6 / 7 / 8 damage. Inflict Shame on three of a kind.'},3],
    ['Wakizashi II',1,'Wakizashi',{damage:()=>4,text:'2 Katana + 2 Rising Suns · gain Back Strike and deal 4 undefendable damage'}],
    ['Wakizashi III',2,'Wakizashi',{damage:()=>4,shame:1,text:'2 Katana + 2 Rising Suns · gain Back Strike, inflict Shame and deal 4 undefendable damage'},3],
    ['Solemnity II',2,'Solemnity',{damage:()=>8,shame:2,text:'2 Katana + 3 Kabuto · inflict 2 Shame and deal 8 damage'},2,
      {name:'Solemn',symbols:{Kabuto:3},shame:2,text:'3 Kabuto · inflict 2 Shame'}],
    ['Budō II',2,'Budō',{damage:()=>8,text:'Small straight · gain Honor and deal 8 damage'}],
    ['Masamune II',2,'Masamune',{effectCount:5,text:'Large straight · 7 damage, then roll five dice for damage, Shame and Back Strike'},2,
      {name:'Empower',symbols:{Katana:1,Kabuto:1,'Rising Sun':1},backStrike:true,text:'Katana + Kabuto + Rising Sun · gain Back Strike'}],
    ['Hagakure II',2,'Hagakure',{damage:()=>7,text:'4 Rising Suns · gain Honor and Back Strike, inflict 2 Shame and deal 7 undefendable damage'},2,
      {name:'Haga',symbols:{'Rising Sun':3},honorGain:1,shame:2,damage:()=>2,type:'undefendable',text:'3 Rising Suns · gain Honor, inflict 2 Shame and deal 2 undefendable damage'}]
  ];
  const cards = [['Gishi!',1,'roll'],['Honorable!',1,'main'],['Follow Through!',1,'roll'],
    ['Shame on You!',1,'main'],['Don’t Back Down!',1,'main'],['Kensei!',0,'main']];
  return {
    leafletPositives: {honor: true, backStrike: true},
    id,board,upgrades,cards,promoId:33,
    effects:{
      masamune(hit,counts){
        hit.damage+=counts.Katana??0;
        hit.shame=counts.Kabuto??0;
        hit.backStrike=!!counts['Rising Sun'];
      }
    },
    cardChoices(card,{s,seat,one}) {
      if(card===28||card===30){
        const hit=s.pending;
        return seat===s.active&&hit?.attack&&!hit.pure&&!hit.evaded&&!hit.parlayBlocked&&
          ['defence','defenceResponse','damage','locked'].includes(s.stage)?one:[];
      }
      return one;
    },
    applyCard({id:card,p,opponent,grantStatus}) {
      if(card===29)grantStatus(p,'honor',2);
      else if(card===31)grantStatus(opponent,'shame',2);
      else if(card===32)grantStatus(p,'backStrike');
      else return false;
      return true;
    },
    cardRollSize(card) { return card===30?5:[28,33].includes(card)?1:0; },
    resolveCardRoll({id:card,counts,p,opponent,s,hit,grantStatus,grantAttackStatus,updateDamage,drawCards,random}) {
      if(card===28){
        hit.grossDamage+=counts.Katana?2:0;
        if(counts.Kabuto)grantAttackStatus(s,opponent,'shame',2);
        if(counts['Rising Sun'])grantStatus(p,'backStrike');
        updateDamage(hit);
      } else if(card===30){
        hit.grossDamage+=counts.Katana??0;
        grantAttackStatus(s,opponent,'shame');
        updateDamage(hit);
      } else if(card===33){
        if(counts['Rising Sun']){
          grantStatus(p,'backStrike');
          grantStatus(p,'honor',2);
        } else drawCards(p,1,random,card);
      }
    },
    complexity: 3,
    defenceEffect: p => 'Return 1 damage per Katana and prevent 1 per Kabuto. Any Rising Sun prevents 2 more.' + (p.upgrades?.defence ? '' : ' Gain Shame if you roll neither Kabuto nor Rising Sun.'),
    defenceDiceCount(p) { return p.upgrades?.defence?4:3; },
    resolveDefence({state,defender,counts,grantStatus,updateDamage}) {
      const hit=state.pending;
      hit.returnDamage=counts.Katana??0;
      hit.prevention=(hit.prevention??0)+(counts.Kabuto??0)+(counts['Rising Sun']?2:0);
      if(!defender.upgrades?.defence&&!counts.Kabuto&&!counts['Rising Sun'])grantStatus(defender,'shame');
      updateDamage(hit);
    }
  };
})();
