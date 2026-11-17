const gunslinger = (() => {
  const id = 12;
  const board = {name:'Gunslinger',symbols:['Bullet','Bullet','Bullet','Dash','Dash','Bullseye'],defence:'Duel',abilities:[
    {name:'Revolver',symbols:{Bullet:3},damage:c=>c.Bullet,text:'3–5 Bullets · 3 / 4 / 5 damage'},
    {name:'Bounty Hunter',symbols:{Bullet:2,Bullseye:2},bounty:true,damage:()=>1,type:'undefendable',text:'2 Bullets + 2 Bullseyes · inflict Bounty, then deal 1 undefendable damage'},
    {name:'Take Cover',symbols:{Bullet:2,Dash:3},evasive:1,damage:()=>5,text:'2 Bullets + 3 Dashes · gain Evasive and deal 5 damage'},
    {name:'Showdown',straight:4,showdown:[7,5],text:'Small straight · each player rolls one die. Deal 7 damage on a win or tie, otherwise 5.'},
    {name:'Fan the Hammer',straight:5,evasive:2,damage:()=>7,text:'Large straight · gain 2 Evasive and deal 7 damage'},
    {name:'Deadeye',symbols:{Bullseye:4},knockdown:true,damage:()=>6,type:'undefendable',text:'4 Bullseyes · inflict Knockdown and deal 6 undefendable damage'},
    {name:"Fill’em With Lead!",symbols:{Bullseye:5},evasive:1,bounty:true,knockdown:true,damage:()=>10,type:'ultimate',reloadReroll:true,
      text:'5 Bullseyes · gain Evasive, inflict Bounty and Knockdown, and deal 10 Ultimate damage. May reroll a Reload die.'}
  ]};
  const upgrades = [
    ['Duel II',3,'defence',{}],
    ['Showdown II',2,'Showdown',{showdown:[8,6],text:'Small straight · roll off. Deal 8 on a win or tie, otherwise 6.'}],
    ['Showdown III',3,'Showdown',{showdown:[9,6],text:'Small straight · roll off. Deal 9 on a win or tie, otherwise 6.'},3],
    ['Revolver II',2,'Revolver',{damage:c=>c.Bullet+1,matchKnockdown:4,text:'3–5 Bullets · 4 / 5 / 6 damage. Inflict Knockdown on four of a kind.'}],
    ['Fan the Hammer II',2,'Fan the Hammer',{damage:()=>8,text:'Large straight · gain 2 Evasive and deal 8 damage'},2,
      {name:'Pistol Whip',symbols:{Dash:2,Bullseye:1},evasive:1,knockdown:true,damage:()=>1,type:'undefendable',text:'2 Dashes + Bullseye · gain Evasive, inflict Knockdown and deal 1 undefendable damage'}],
    ['Bounty Hunter II',1,'Bounty Hunter',{damage:()=>2,text:'2 Bullets + 2 Bullseyes · inflict Bounty, then deal 2 undefendable damage'}],
    ['Take Cover II',2,'Take Cover',{damage:()=>6,text:'2 Bullets + 3 Dashes · gain Evasive and deal 6 damage'},2,
      {name:'Mark the Target',symbols:{Dash:3},evasive:2,bounty:true,text:'3 Dashes · gain 2 Evasive and inflict Bounty'}],
    ['Deadeye II',2,'Deadeye',{damage:()=>8,text:'4 Bullseyes · inflict Knockdown and deal 8 undefendable damage'},2,
      {name:'Enforcer',symbols:{Bullseye:3},evasive:1,bounty:true,knockdown:true,text:'3 Bullseyes · gain Evasive and inflict Bounty and Knockdown'}]
  ];
  const extraUpgrades = {32:['Quick Draw II',2,'Quick Draw',{}]};
  const cards = [['Wild West!',1,'roll'],['Wanted!',2,'main'],['Spin the Chamber!',1,'main'],
    ['Roulette!',1,'main'],['Eat Lead!',1,'roll'],null,['Run and Gun!',0,'main']];
  return {
    id,board,upgrades,extraUpgrades,cards,promoId:33,
    cardChoices(card,{s,seat,one}) {
      if(card===30)return heroNames(s).map((label,target)=>({label,target}));
      if(card===27||card===31){
        const hit=s.pending, reloading=s.gunReload?.seat===seat;
        const allowed=seat===s.active&&hit?.attack&&!hit.pure&&!hit.evaded&&!hit.parlayBlocked&&
          (['defence','defenceResponse','damage','locked'].includes(s.stage)||card===27&&reloading);
        if(!allowed)return [];
        if(card===27&&(!s.players[seat].reload&&!reloading||hit.wildWest||hit.wildWestUsed))return [];
      }
      return one;
    },
    applyCard({id:card,s,p,opponent,grantStatus}) {
      if(card===27)s.pending.wildWest=true;
      else if(card===28)grantStatus(opponent,'bounty');
      else if(card===29)grantStatus(p,'reload');
      else return false;
      return true;
    },
    cardRollSize(card) { return card===31?5:[30,33].includes(card)?1:0; },
    resolveCardRoll({id:card,counts,p,opponent,s,hit,target,grantStatus,grantAttackStatus,startSideDamage,updateDamage,drawCards,random}) {
      if(card===30){
        if(counts.Bullet)startSideDamage(s,target,2,'Roulette!');
        if(counts.Dash)grantStatus(s.players[target],'knockdown');
        if(counts.Bullseye)grantStatus(s.players[target],'bounty');
      } else if(card===31){
        const extra=counts.Bullet??0;
        hit.grossDamage+=extra;
        if(extra>=4)grantAttackStatus(s,opponent,'knockdown');
        updateDamage(hit);
      } else if(card===33){
        if(counts.Bullseye){
          grantStatus(opponent,'bounty');
          grantStatus(opponent,'knockdown');
        } else drawCards(p,1,random,card);
      }
    },
    defenceDiceCount() { return 1; },
    resolveDefence() { return 'damage'; }
  };
})();
