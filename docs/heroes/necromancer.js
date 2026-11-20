const necromancer=(()=>{
 const id=17;
 const undead={warrior:{name:'Skeletal Warrior',cost:2,cap:3},mage:{name:'Skeletal Mage',cost:3,cap:1},golem:{name:'Bone Golem',cost:6,cap:1}};
 const unearth={'Shear':2,'Reanimate':2,'Harvest':2,'Corpse Explosion':2,'Blight':2,'Black Shroud':3,'Deadman’s Party':2};
 const board={name:'Necromancer',symbols:['Scythe','Scythe','Scythe','Bones','Bones','Soul'],defence:'Resist Death',abilities:[
  {name:'Shear',symbols:{Scythe:3},damage:c=>c.Scythe,text:'3–5 Scythes · deal 3 / 4 / 5 damage'},
  {name:'Reanimate',symbols:{Bones:3},corpses:c=>c.Bones===5?4:3,reanimate:true,text:'3 or 5 Bones · gain Corpses and optionally summon at a discount'},
  {name:'Harvest',symbols:{Scythe:3,Soul:1},harvest:[4,3],text:'3 Scythes + Soul · gain a Corpse and roll for damage, Corpses or another Offensive Roll Phase'},
  {name:'Corpse Explosion',symbols:{Scythe:1,Bones:1,Soul:2},explosion:3,damage:()=>4,text:'Scythe + Bones + 2 Souls · deal 4 damage and roll one die per Corpse spent, up to three'},
  {name:'Blight',straight:4,corpses:()=>1,damage:()=>5,text:'Small straight · gain 1 Corpse and deal 5 damage'},
  {name:'Blight (large straight)',upgradeSlot:'Blight',variant:'large',straight:5,corpses:()=>2,decrepify:true,damage:()=>7,text:'Large straight · gain 2 Corpses, inflict Decrep-ify and deal 7 damage'},
  {name:'Black Shroud',symbols:{Soul:4},shroud:true,damage:()=>4,type:'undefendable',text:'4 Souls · summon one Undead or gain 3 Corpses, then deal 4 undefendable damage'},
  {name:'Deadman’s Party',symbols:{Bones:3,Soul:2},freeUndead:true,damage:()=>6,text:'3 Bones + 2 Souls · deal 6 damage and skip Undead rolls this turn'},
  {name:'Necro-Dancer!',symbols:{Soul:5},resurrect:true,decrepify:true,freeUndead:true,damage:()=>10,type:'ultimate',text:'5 Souls · gain Resurrect, inflict Decrep-ify and deal 10 Ultimate damage. Skip Undead rolls this turn.'}
 ]};
 const upgrades=[
  ['Shear II',2,'Shear',{damage:c=>c.Scythe+1,corpseMatch:3,text:'3–5 Scythes · deal 4 / 5 / 6 damage. Gain 1 Corpse on three of a kind.'}],
  ['Reanimate II',1,'Reanimate',{corpses:()=>3,cpGain:1,text:'3 Bones · gain 3 Corpses and 1 CP. Optionally summon at a discount.'},2,
   {name:'Reanimate Mastery',symbols:{Bones:5},corpses:()=>8,cpGain:2,text:'5 Bones · gain 8 Corpses and 2 CP'}],
  ['Blight II',2,'Blight',{corpses:()=>2,text:'Small straight · gain 2 Corpses and deal 5 damage',variants:{large:{corpses:()=>3,damage:()=>8,label:'Blight II (large straight)',text:'Large straight · gain 3 Corpses, inflict Decrep-ify and deal 8 damage'}}}],
  ['Black Shroud II',2,'Black Shroud',{shroud:'both',text:'4 Souls · summon one Undead, gain 3 Corpses and deal 4 undefendable damage'},2,
   {name:'Dark Hood',symbols:{Soul:3},corpses:()=>3,draw:1,decrepify:true,text:'3 Souls · gain 3 Corpses, draw 1 and inflict Decrep-ify'}],
  ['Harvest II',2,'Harvest',{harvest:[5,4],text:'3 Scythes + Soul · gain a Corpse and roll for 5 damage, 4 Corpses and a draw, or another Offensive Roll Phase'}],
  ['Corpse Explosion II',1,'Corpse Explosion',{explosion:4,text:'Scythe + Bones + 2 Souls · deal 4 damage and roll one die per Corpse spent, up to four'},2,
   {name:'Disentomb',symbols:{Scythe:1,Soul:3},corpses:()=>2,explosion:4,damage:()=>4,text:'Scythe + 3 Souls · gain 2 Corpses and activate Corpse Explosion II'}],
  ['Deadman’s Party II',2,'Deadman’s Party',{damage:()=>7,text:'3 Bones + 2 Souls · deal 7 damage and skip Undead rolls this turn'},2,
   {name:'Creeper',symbols:{Scythe:2,Bones:2},decrepify:true,damage:()=>3,text:'2 Scythes + 2 Bones · inflict Decrep-ify and deal 3 damage'}],
  ['Resist Death II',2,'defence',{}]
 ];
 const cards=[['Bone Appétit!',1,'main'],['Death Manual!',2,'main'],['Go Go Golem!',3,'main'],['Bone Armor!',1,'roll'],
  ['Dead-ly Shrapnel!',0,'roll'],['Sturdy Bones!',2,'roll'],['Fractured Magic!',2,'instant'],['Skeletal Structure!',0,'main']];
 const gain=(p,n)=>{p.corpses=Math.min(10,p.corpses+n);};
 const count=(p,kind)=>p.undead[kind]??0;
 const summon=(p,kind,n=1)=>{p.undead[kind]=Math.min(undead[kind].cap,count(p,kind)+n);};
 const types=p=>Object.keys(undead).filter(kind=>count(p,kind)<undead[kind].cap);
 function sacrifices(p){
  const singles=Object.keys(undead).filter(k=>count(p,k)>0);
  return [[],...singles.map(k=>[k]),...singles.flatMap((k,i)=>singles.slice(i).filter(j=>j!==k||count(p,k)>1).map(j=>[k,j]))];
 }
 return {
  turnStartUpkeep: 'every-turn',
  id,board,upgrades,cards,promoId:34,undead,unearth,gain,count,summon,types,
  initialize(s,seat){Object.assign(s.players[seat],{corpses:0,covered:'Black Shroud',undead:{}});},
  effects:{corpseExplosion(hit,c){hit.damage+=(c.Scythe??0)+2*(c.Bones??0);hit.undefendable||=!!c.Soul;}},
  defenceDiceCount(p){return p.upgrades?.defence?5:4;},
  resolveDefence({state,seat,defender,counts,stealNecroHealth}){
   gain(defender,counts.Bones??0);
   return stealNecroHealth(state,seat,defender.upgrades?.defence?counts.Soul??0:Number(!!counts.Soul))?'finished':'damage';
  },
  cardChoices(card,{s,seat,one}){
   const p=s.players[seat], hit=s.pending, defending=seat!==s.active&&hit?.attack&&!hit.ultimate&&!hit.stun&&!hit.parlayBlocked&&['defence','defenceResponse','damage'].includes(s.stage);
   if(card===28)return Array.from({length:1+Math.min(2,3-count(p,'warrior'))},(_,n)=>({amount:n,label:`Summon ${n} Skeletal Warriors`})).filter(x=>x.amount<=2);
   if(card===29)return count(p,'golem')?[]:one;
   if(card===30)return defending?sacrifices(p).map(types=>({types,label:types.length?types.map(k=>undead[k].name).join(' + '):'Remove no Undead'})):[];
   if(card===31)return defending&&count(p,'mage')?one:[];
   if(card===32)return s.stage==='undeadRoll'&&s.undeadRoll.seat===seat&&!s.undeadRoll.rerolls?one:[];
   if(card===33)return count(p,'mage')?[]:one;
   return one;
  },
  applyCard({id:card,s,p,choice,updateDamage}){
   switch(card){
    case 28:summon(p,'warrior',choice.amount);break;
    case 29:summon(p,'golem');break;
    case 30:
     choice.types.forEach(kind=>p.undead[kind]--);
     s.pending.prevention=(s.pending.prevention??0)+2*choice.types.length;updateDamage(s.pending);break;
    case 31:p.undead.mage--;s.pending.necroReturn=(s.pending.necroReturn??0)+3;break;
    case 32:s.undeadRoll.rerolls=3;break;
    case 33:summon(p,'mage');break;
    default:return false;
   }
   return true;
  },
  cardRollSize(card){return [27,34].includes(card)?1:0;},
  resolveCardRoll({id:card,counts,s,seat,p,opponent,drawCards,random,grantStatus,stealNecroHealth}){
   if(card===27){
    if(counts.Scythe)gain(p,2);
    if(counts.Bones)drawCards(p,2,random,card);
    if(counts.Soul){grantStatus(opponent,'decrepify');stealNecroHealth(s,seat,1);}
   }
   if(card===34){
    if(counts.Soul)gain(p,8);
    else drawCards(p,1,random,card);
   }
  }
 };
})();
