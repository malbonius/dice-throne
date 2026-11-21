const paleLady = (() => {
  const id = 18;
  const symbols = ['Slash','Slash','Slash','Crescent','Crescent','Full Moon'];
  const scratch = {Slash:3}, cure = {Crescent:3,'Full Moon':1}, hunt = {Slash:2,'Full Moon':2};
  const moon = {Crescent:4}, beast = {'Full Moon':4}, ultimate = {'Full Moon':5};
  const attack = (name,symbols,damage,text,extra={})=>({name,symbols,damage:()=>damage,text,...extra});
  const claw = (name,type)=>attack(name,scratch,4,'3–5 Slashes · deal 4 / 5 / 6 damage. Three matching numbers inflict Bleed.',
    {type,damage:c=>c.Slash+1,bleedMatch:3});
  const frenzy = attack('Unleash the Beast!',ultimate,13,'5 Full Moons · gain a Moon Shard, inflict Prey and 2 Bleed, and deal 13 Ultimate damage. Keep your Shard at turn end.',
    {type:'ultimate',shards:1,prey:1,bleed:2,skipShardLoss:true});
  const board = {name:'Pale Lady',symbols,defence:'Refresh',abilities:[
    claw('Scratch'),
    attack('The Cure',cure,0,'3 Crescents + Full Moon · gain a Moon Shard and 1 CP, draw 1 and heal 3.',{shards:1,cpGain:1,draw:1,heal:()=>3}),
    attack('The Hunt',hunt,6,'2 Slashes + 2 Full Moons · inflict Prey and deal 6 damage.',{prey:1}),
    {name:'Conflicted',straight:4,damage:c=>c.largeStraight?8:6,paleStraight:true,text:'Small / large straight · gain 1 / 2 Moon Shards and deal 6 / 8 damage.'},
    attack('Full Moon',moon,5,'4 Crescents · deal 5 damage and roll four dice for extra damage, CP and Moon Shards.',{effect:'paleFullMoon',effectCount:4}),
    attack('Ensnare',beast,5,'4 Full Moons · gain 2 Moon Shards, inflict 2 Prey and deal 5 undefendable damage.',{type:'undefendable',shards:2,prey:2}),
    {...frenzy,shards:2,transform:true,text:'5 Full Moons · gain 2 Moon Shards, flip to Werewolf and activate its Ultimate.'}
  ]};
  const werewolfBoard = {name:'Werewolf',symbols,defence:'Backslash',abilities:[
    claw('Shred','undefendable'),
    attack('Rip and Tear',cure,8,'3 Crescents + Full Moon · deal 8 undefendable damage.',{type:'undefendable'}),
    attack('The Hunter',hunt,7,'2 Slashes + 2 Full Moons · inflict 2 Prey and deal 7 damage.',{prey:2}),
    {name:'Sunder',straight:4,damage:()=>8,shardDamage:1,sunder:true,text:'Small / large straight · inflict 1 / 2 Bleed and deal 8 damage plus 1 / 2 per Moon Shard.'},
    attack('Full Moon Blitz',moon,4,'4 Crescents · heal 1 and add 1 damage per Moon Shard. Damage is undefendable.',{type:'undefendable',shardDamage:1,shardHeal:true}),
    attack('Jaws of the Wolf',beast,5,'4 Full Moons · inflict Prey, then roll four dice to gain a Shard on Full Moon. Deal 5 undefendable damage plus 2 per Moon Shard.',
      {type:'undefendable',prey:1,shardDamage:2,effect:'paleJaws',effectCount:4}),
    frenzy
  ]};
  const cards = [
    ['Ambush!',1,'roll'],['Ravage!',2,'roll'],['Quenched!',1,'roll'],['Etiquette!',1,'roll'],
    ['New Moon!',2,'instant'],['Dark Side of the Moon!',0,'main'],['Briar Thorn!',1,'main'],['Scent of Blood!',1,'main'],
    ['Petulant!',1,'main'],['Transformation!',3,'main'],['Waxing Moon!',3,'main'],['Life Trade!',0,'main'],
    ['Trick of the Light!',1,'main'],['Waning Moon!',1,'main'],['Apogee of the Moon!',0,'main']
  ];
  const gain = (p,n=1)=>{if(psylocke.blockDirect(p,'moonShard',n))return;p.moonShard=Math.min(3,p.moonShard+n);};
  const heal = (p,n)=>{p.hp=Math.min(60,p.hp+n);};
  const cp = (p,n)=>{gainCP(p,n);};
  return {
    turnStartUpkeep: 'every-turn',
    id,board,werewolfBoard,cards,upgrades:[],promoId:33,gain,heal,
    initialize(s,seat){Object.assign(s.players[seat],{moonShard:0,werewolf:false});},
    complexity: 3,
    defenceEffect: p => p.werewolf
      ? 'Return 1 damage per Slash and 2 more on any Full Moon. Any Crescent inflicts Bleed.'
      : 'Heal 1 per Crescent. Any Full Moon grants 1 Moon Shard.',
    defenceDiceCount(){return 4;},
    resolveDefence({state,defender,attacker,counts,grantStatus}){
      const crescent=counts.Crescent??0, full=!!counts['Full Moon'];
      if(defender.werewolf){
        state.pending.returnDamage+=(counts.Slash??0)+2*Number(full);
        if(crescent)grantStatus(attacker,'bleed');
      } else {
        heal(defender,crescent);
        if(full)gain(defender);
      }
      return 'damage';
    },
    cardChoices(card,{s,seat,one}){
      const p=s.players[seat],hit=s.pending;
      const attack=seat===s.active&&hit?.attack&&!hit.pure&&!hit.parlayBlocked&&!hit.evaded&&['locked','defence','defenceResponse','damage'].includes(s.stage);
      if(card===19)return attack&&!p.werewolf&&p.moonShard?one:[];
      if(card===20||card===21)return attack&&p.werewolf?one:[];
      if(card===22)return seat!==s.active&&hit?.attack&&!hit.ultimate&&!hit.stun&&!hit.parlayBlocked&&hit.damage>=10&&['defence','defenceResponse','damage'].includes(s.stage)?one:[];
      if(card===26)return p.werewolf?[{amount:1,label:'Inflict 1 Prey'},...(p.cp>=3?[{amount:2,label:'Spend 2 extra CP to inflict 2 Prey'}]:[])]:[];
      if([23,27,28,32].includes(card))return p.werewolf?[]:one;
      if(card===29||card===31)return p.werewolf?one:[];
      if(card===30)return p.werewolf?[]:[0,1,2,3].map(amount=>({amount,label:`Take ${amount} damage and gain ${amount} CP`}));
      return one;
    },
    applyCard({id:card,s,p,opponent,seat,choice,grantStatus,startSideDamage}){
      switch(card){
        case 19:p.moonShard--;return false;
        case 20:startSideDamage(s,seat,1,'Ravage!',false,{ravage:true,keepPending:true});break;
        case 21:s.pending.quenched=(s.pending.quenched??0)+1;break;
        case 22:heal(p,2);gain(p);break;
        case 23:if(!p.werewolf)startSideDamage(s,seat,1,'New Moon!',false,{keepPending:true});gain(p);break;
        case 26:p.cp-=2*(choice.amount-1);grantStatus(opponent,'prey',choice.amount);break;
        case 27:s.petulant={seat,resume:s.stage};s.stage='petulant';break;
        case 28:gain(p);p.werewolf=true;break;
        case 30:startSideDamage(s,seat,choice.amount,'Life Trade!');cp(p,choice.amount);break;
        case 31:heal(p,2);p.werewolf=false;break;
        default:return false;
      }
      return true;
    },
    cardRollSize(card){return ({19:1,20:5,24:5,25:1,29:1,32:1,33:1})[card]??0;},
    resolveCardRoll({id:card,dice,p,opponent,counts,hit,s,seat,updateDamage,grantStatus,startSideDamage,drawCards,random}){
      const slash=counts.Slash??0,crescent=counts.Crescent??0,full=counts['Full Moon']??0;
      if(card===19&&dice[0]||card===20){
        hit.grossDamage+=card===20?slash:dice[0]===1?3:4;
        if(card===19&&full)gain(p);
        updateDamage(hit);
      }
      if(card===24){
        startSideDamage(s,seat,slash,'Dark Side of the Moon!');
        if(crescent)grantStatus(opponent,'bleed',crescent);
        gain(p,full);
      }
      if(card===25)grantStatus(opponent,'bleed',crescent?2:1);
      if(card===29){
        if(slash)startSideDamage(s,1-seat,4,'Waxing Moon!');
        if(crescent)drawCards(p,2,random,card);
        if(full)gain(p);
      }
      if(card===32){
        if(slash)startSideDamage(s,1-seat,2,'Waning Moon!');
        if(crescent)cp(p,2);
        if(full)heal(p,2);
      }
      if(card===33){
        if(full)gain(p,2);
        else drawCards(p,1,random,card);
      }
    }
  };
})();
