// Damage amounts, resource changes and shared settlement for the classic-script engine.

function roundedHalfDamage(amount) {
  return Math.ceil(amount / 2);
}

function damageAfterPrevention(amount, {flat = 0, halves = 0, avoided = false} = {}) {
  if (avoided) return 0;
  const subtotal = amount - flat;
  // Each half effect uses the same subtotal after flat prevention.
  return Math.max(0, subtotal - halves * roundedHalfDamage(subtotal));
}

function attackReduction(hit) {
  const reduction = (hit.witherReduction ?? 0) + (hit.shameReduction ?? 0) + (hit.decrepReduction ?? 0);
  return Math.min(reduction, Math.max(0, hit.grossDamage - (hit.collateral ?? 0)));
}

// Hail the King counts its collateral damage as part of the combined attack.
function modifiedAttackDamage(hit) {
  return Math.max(0, hit.grossDamage - (hit.iceman ? 0 : hit.collateral ?? 0) - attackReduction(hit));
}

function damageSubtotal(hit) {
  return Math.max(0, hit.grossDamage - (hit.prevention ?? 0) - attackReduction(hit));
}

function updateDamage(hit) {
  const avoided = hit.evaded || hit.parlayBlocked || hit.illusionPreventAll || hit.invulnerabilityAll;
  const halves = Number(!!hit.halfDefence) + Number(!!hit.blindingHalf) + (hit.protect ?? 0) + (hit.illusionHalves ?? 0);
  hit.damage = avoided ? 0 : damageAfterPrevention(damageSubtotal(hit), {halves});
}

function shadowAvoids(state) {
  return !!state.players[1 - state.active].shadows && !state.pending?.ultimate;
}

function incomingDamage(state) {
  return shadowAvoids(state) ? 0 : state.pending?.damage ?? 0;
}

function retributionDamage(hit) {
  return hit.retribution && !hit.evaded && !hit.shadowAvoided ? roundedHalfDamage(damageSubtotal(hit)) : 0;
}

function returnIncoming(hit) {
  const amount = hit.returnDamage + (hit.necroReturn ?? 0) + (hit.disengageDamage ?? 0) +
    (hit.backStrikeDamage ?? 0) + (hit.artSelfDamage ?? 0) + (hit.vineDamage ?? 0) +
    (hit.absolutionReturn ?? 0) + retributionDamage(hit) + (hit.damage > 0 ? hit.recoil ?? 0 : 0);
  return damageAfterPrevention(amount, {
    flat: hit.returnPrevention ?? 0,
    halves: hit.returnProtect,
    avoided: hit.returnEvaded || hit.returnInvulnerable
  });
}

function vineDamage(state) {
  return state.players[state.active].barbed ? state.vineAttempts ?? 0 : 0;
}

function returnDamageFor(state) {
  return returnIncoming({
    ...state.pending,
    damage: incomingDamage(state),
    shadowAvoided: shadowAvoids(state),
    vineDamage: vineDamage(state)
  });
}

function upkeepDamage(player, seat) {
  return (player.burn ? 2 : 0) + (player.poison ?? 0) + (player.pirateCoins?.[1 - seat] ?? 0);
}

function upkeepIncoming(state) {
  const amount = upkeepDamage(state.players[state.active], state.active) +
    (state.upkeepBagDamage ?? 0) + (state.upkeepDisruptionDamage ?? 0);
  return damageAfterPrevention(amount, {
    flat: state.upkeepPrevention ?? 0,
    halves: state.upkeepProtect,
    avoided: state.upkeepInvulnerability
  });
}

function sideIncoming(event) {
  return damageAfterPrevention(event.amount, {
    flat: event.prevention ?? 0,
    halves: event.protect,
    avoided: event.evaded || event.invulnerabilityAll || event.shadowBlocked || event.parlayBlocked
  });
}

function startSideDamage(state, seat, amount, source, endTurn = false, extra = {}) {
  const parent = state.sideDamage;
  if (!extra.keepPending && !parent) state.pending = null;
  state.sideDamage = {seat, amount, source, endTurn, resume: state.stage, ...extra};
  if (parent) state.sideDamage.parent = parent;
  state.stage = 'sideDamage';
}

function reviveNecromancer(p) {
 if(!p.resurrect||p.hp>0)return false;
 p.hp=5;
 p.resurrect=false;
 p.resurrected=true;
 p.cp=0;
 if(Array.isArray(p.hand)){p.discard.push(...p.hand);p.hand=[];}
 return true;
}
function takeDamage(player,damage,absorb=true) {
 const saved=damage>=player.hp&&player.blessing;
 player.hp=saved?1:bounded(player.hp-damage,60);
 if(saved)removeStatus(player,'blessing');
 else reviveNecromancer(player);
 if(absorb&&damage>0&&player.hp>0&&player.hero===blackPanther.id)blackPanther.gain(player,1);
 return saved;
}
function stealNecroHealth(s,seat,amount) {
 if(!amount)return false;
 const victim=s.players[1-seat], thief=s.players[seat], names=heroNames(s);
 const stolen=Math.min(victim.hp,amount);
 takeDamage(victim,stolen,false);
 thief.hp=bounded(thief.hp+stolen,60);
 s.log.unshift(`${names[seat]} steals ${stolen} Health.`);
 if(victim.hp)return false;
 s.stage='finished';
 s.winner=`${names[seat]} wins`;
 s.log.unshift(s.winner);
 return true;
}

// Allow every damage source in a simultaneous batch to settle before checking this.
function finishMatchIfDefeated(state) {
  const [left, right] = state.players;
  if (left.hp && right.hp) return false;
  state.stage = 'finished';
  state.winner = !left.hp && !right.hp ? 'Draw' : `${heroNames(state)[left.hp ? 0 : 1]} wins`;
  state.log.unshift(state.winner);
  return true;
}
