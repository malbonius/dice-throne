const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const docs = path.join(__dirname, '../docs');
const baseline = process.argv[2];
const loadEngine = directory => {
  const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
  const context = vm.createContext({structuredClone});
  vm.runInContext('Math.random = () => 0.37', context);
  const scripts = html.matchAll(/<script src="\.\/((?:heroes\/[^"]+|turn|rolls|engine)\.js)"/g);
  for (const [, file] of scripts) {
    vm.runInContext(fs.readFileSync(path.join(directory, file), 'utf8'), context, {filename: file});
  }
  return vm.runInContext(`({
    createMatch, transition, legal, actor, cardActor, cardChoices, tokenChoices, tacticalChoices,
    rollContext, rollPhase, attackLocked, dieOwner, diceOwnedBy,
    names: HEROES.map(hero => hero.name),
    leafletKeys: typeof positiveStatusKeys === 'undefined' ? scarletWitch.positives : positiveStatusKeys,
    conjure: scarletWitch.conjureChoices, fourthWall: deadpool.fourthChoices
  })`, context);
};

const engine = loadEngine(docs);
const plain = value => JSON.parse(JSON.stringify(value));
const random = () => 0.37;
const rolls = first => {
  let count = 0;
  return () => count++ === 0 ? first === 0 ? 6 : 1 : first === 0 ? 1 : 6;
};
const start = (rules, heroes, first = 0, promo = false) =>
  rules.createMatch(rolls(first), {heroes, promo, random});
const step = (rules, state, type, extra = {}, roll = () => 3) =>
  rules.transition(state, {type, ...extra}, roll, random);
const stealScenario = (rules, hero, active = 0) => {
  const players = active === 0 ? [29, hero] : [hero, 29];
  const state = start(rules, players, active);
  state.stage = 'main1';
  state.players[active].conjure = true;
  return state;
};
const spendConjure = (rules, state, key) => {
  const choice = rules.conjure(state, state.active).findIndex(
    option => option.status === key && option.source === 1 - state.active
  );
  assert.ok(choice >= 0, `Conjure must offer ${key}`);
  return step(rules, state, 'spendConjure', {choice});
};
const stepPassing = (rules, state, type, extra) => {
  const next = step(rules, state, type, extra);
  return next.response ? step(rules, next, 'passResponse') : next;
};
const finishMain = (rules, state) => {
  state.stage = 'main';
  return stepPassing(rules, stepPassing(rules, state, 'endMain'), 'next');
};

{
  assert.equal(engine.names.length, 45);
  const state = stealScenario(engine, 28, 1);
  const choice = spendConjure(engine, state, 'bagOfTricks');
  assert.equal(choice.stage, 'conjureResponse');
  const allowed = step(engine, plain(choice), 'conjureAllow');
  assert.deepEqual(plain(allowed.players[1].trickBags), [{id: 1, owner: 0}]);
  const blocked = step(engine, plain(choice), 'conjureDiscard', {index: choice.players[0].hand[0]});
  assert.equal(blocked.players[1].bagOfTricks, undefined);
  assert.equal(blocked.players[0].hand.length, choice.players[0].hand.length - 1);

  const rage = stealScenario(engine, 39);
  rage.players[0].rage = 3;
  const offered = step(engine, spendConjure(engine, rage, 'rage'), 'conjureAllow');
  assert.deepEqual(plain(offered.wolverineGain), {seat: 0, amount: 1});
  assert.equal(step(engine, plain(offered), 'collectRage').players[0].rage, 3);

  assert.deepEqual(Array.from(engine.fourthWall(start(engine, [44, 35]), 0), option => option.key),
    ['donut', 'forceField', 'acuity', 'flameBlast']);
}

const transferResults = rules => {
  const match = start(rules, [14, 25]);
  match.players[0].hand = [1];
  match.players[0].tactical = 4;
  match.players[1].hand = [];
  Object.assign(match.players[1], {
    trickBags: [{id: 11, owner: 1}], bagOfTricks: 1,
    timeBombTimers: [{id: 21, ticks: 2}, {id: 22, ticks: 1}], timeBomb: 2,
    spellbound: 1, boundAbilities: [{id: 33, key: 'Recon'}]
  });
  const card = rules.cardChoices(match, 0, 1);
  const tactical = rules.tacticalChoices(match, 0);
  assert.ok(!card.some(option => option.status === 'spellbound'));
  assert.ok(!tactical.some(option => option.kind === 'transfer' && option.status === 'spellbound'));
  const results = [];
  for (const key of ['bagOfTricks', 'timeBomb']) {
    const cardChoice = card.findIndex(option => option.status === key &&
      (key !== 'timeBomb' || option.bombId === 22));
    const tacticalChoice = tactical.findIndex(option => option.kind === 'transfer' &&
      option.status === key && (key !== 'timeBomb' || option.bombId === 22));
    assert.ok(cardChoice >= 0 && tacticalChoice >= 0, `Both actions must offer ${key}`);
    const movedByCard = step(rules, plain(match), 'playCard', {id: 1, choice: cardChoice});
    const movedByTactical = step(rules, plain(match), 'spendTactical', {choice: tacticalChoice});
    for (const moved of [movedByCard, movedByTactical]) {
      if (key === 'timeBomb') {
        assert.equal(moved.players[0].timeBombTimers[0].ticks, 1);
        assert.deepEqual(plain(moved.players[1].timeBombTimers), [{id: 21, ticks: 2}]);
      } else {
        assert.deepEqual(plain(moved.players[0].trickBags), [{id: 11, owner: 1}]);
        assert.deepEqual(plain(moved.players[1].trickBags), []);
      }
      results.push(moved);
    }
  }
  return results;
};
const transfers = transferResults(engine);

{
  const gambit = start(engine, [0, 33], 1);
  assert.equal(gambit.stage, 'upkeep');
  assert.equal(engine.legal(gambit).gambitHighStakes, true);
  const artificer = start(engine, [9, 0]);
  const collected = step(engine, artificer, 'collectSynth');
  const firstMain = stepPassing(engine, collected, 'resolveUpkeep');
  assert.equal(firstMain.stage, 'main1');
  assert.equal(firstMain.income.skipped, 'first-turn');
  assert.equal(firstMain.players[0].cp, 2);
  assert.equal(firstMain.players[0].hand.length, 4);

  assert.equal(start(engine, [35, 0]).stage, 'main1');
  const jeanUpkeep = finishMain(engine, start(engine, [0, 35]));
  assert.equal(jeanUpkeep.stage, 'upkeep');
  assert.equal(stepPassing(engine, jeanUpkeep, 'resolveUpkeep').income.drawn, 1);

  const poison = start(engine, [0, 1]);
  poison.players[1].poison = 2;
  const upkeep = finishMain(engine, poison);
  assert.equal(upkeep.stage, 'upkeep');
  const after = stepPassing(engine, plain(upkeep), 'resolveUpkeep');
  assert.equal(after.players[1].hp, 48);
  assert.equal(after.players[1].hand.length, 5);
  assert.equal(after.players[1].cp, 3);

  const emptyDeck = start(engine, [0, 1]);
  Object.assign(emptyDeck.players[1], {deck: [], discard: [3]});
  const replenished = finishMain(engine, emptyDeck);
  assert.equal(replenished.income.drawn, 1);
  assert.equal(replenished.players[1].hand.at(-1), 3);
  assert.equal(replenished.players[1].discard.length, 0);

  const skipped = start(engine, [0, 1]);
  skipped.players[0].knockdown = true;
  skipped.players[0].realityWarp = true;
  const knockdown = stepPassing(engine, skipped, 'begin');
  assert.equal(knockdown.stage, 'knockdown');
  const skip = stepPassing(engine, knockdown, 'skipKnockdown');
  assert.equal(skip.stage, 'main');
  assert.equal(skip.players[0].realityWarp, true);
  assert.equal(skip.realityDie, undefined);

  const extraRoll = start(engine, [30, 0]);
  extraRoll.stage = 'spiderCombo';
  extraRoll.players[0].combo = true;
  const extra = stepPassing(engine, extraRoll, 'spendCombo');
  assert.equal(extra.stage, 'offence');
  assert.equal(extra.turn, extraRoll.turn);
  assert.equal(extra.players[0].hand.length, extraRoll.players[0].hand.length);
  assert.equal(extra.players[0].cp, extraRoll.players[0].cp);
}

function turnBoundaryResults(rules) {
  const results = [];
  const record = state => {
    results.push(state);
    return plain(state);
  };
  const act = (state, type, extra) => record(stepPassing(rules, state, type, extra));

  const opening = start(rules, [0, 27]);
  Object.assign(opening.players[1], {premonition: 1, realityWarp: true});
  const incomeChoice = record(finishMain(rules, opening));
  assert.equal(incomeChoice.stage, 'incomePremonition');
  const drawn = act(incomeChoice, 'choosePremonition', {amount: 1});
  const returned = drawn.premonitionTask.drawn[0];
  const returnedState = act(drawn, 'returnPremonition', {index: returned, status: 'top'});
  const mainOne = act(returnedState, 'completePremonition');
  assert.equal(mainOne.stage, 'main1');
  assert.equal(mainOne.players[1].cp, 3);
  assert.equal(mainOne.players[1].hand.length, 5);
  assert.equal(mainOne.players[1].deck.at(-1), returned);
  assert.equal(mainOne.players[1].realityWarp, true);
  assert.equal(mainOne.realityDie, undefined);
  const offence = act(mainOne, 'begin');
  assert.equal(offence.players[1].realityWarp, false);
  assert.deepEqual(offence.realityDie, {seat: 1, index: 4});

  const dejaVu = start(rules, [27, 7]);
  dejaVu.stage = 'offence';
  dejaVu.vineAttempts = 1;
  Object.assign(dejaVu.players[0], {dejaVu: true, barbed: true});
  const sideDamage = act(dejaVu, 'spendDejaVu');
  assert.equal(sideDamage.stage, 'sideDamage');
  assert.equal(sideDamage.sideDamage.source, 'Barbed Vine');
  assert.equal(sideDamage.sideDamage.resume, 'tacticalRestart');
  const resumed = act(sideDamage, 'resolveSideDamage');
  assert.equal(resumed.stage, 'tacticalRestart');
  const restarted = act(resumed, 'restartTacticalOffence');
  assert.equal(restarted.stage, 'offence');
  assert.equal(restarted.turn, dejaVu.turn);
  assert.equal(restarted.active, dejaVu.active);
  assert.equal(restarted.players[0].hp, 49);
  assert.equal(restarted.players[0].cp, dejaVu.players[0].cp);
  assert.equal(restarted.players[0].hand.length, dejaVu.players[0].hand.length);

  for (const [status, skipped] of [['alpha', 'alpha'], ['concussion', 'concussion']]) {
    const match = start(rules, [0, 1]);
    match.players[1][status] = true;
    const after = record(finishMain(rules, match));
    assert.equal(after.stage, 'main1');
    assert.equal(after.income.skipped, skipped);
    assert.equal(after.players[1][status], false);
    assert.equal(after.players[1].cp, 2);
    assert.equal(after.players[1].hand.length, 4);
  }

  const disarmed = start(rules, [0, 1]);
  disarmed.players[1].disarm = true;
  const disarmUpkeep = record(finishMain(rules, disarmed));
  const choseSkip = act(disarmUpkeep, 'resolveDisarm', {status: 'skip'});
  const skippedIncome = act(choseSkip, 'resolveUpkeep');
  assert.equal(skippedIncome.income.skipped, 'disarm');
  assert.equal(skippedIncome.players[1].cp, 2);
  assert.equal(skippedIncome.players[1].hand.length, 4);

  const delayedPoison = start(rules, [0, 1]);
  delayedPoison.players[0].delayedPoison = 1;
  const poisonDamage = record(finishMain(rules, delayedPoison));
  assert.equal(poisonDamage.active, 0);
  assert.equal(poisonDamage.sideDamage.endTurn, true);
  const passedTurn = act(poisonDamage, 'resolveSideDamage');
  assert.equal(passedTurn.active, 1);
  assert.equal(passedTurn.players[0].hp, 47);
  assert.equal(passedTurn.players[1].cp, 3);

  const fatal = start(rules, [0, 1]);
  Object.assign(fatal.players[1], {hp: 1, poison: 2});
  const upkeep = record(finishMain(rules, fatal));
  const finished = act(upkeep, 'resolveUpkeep');
  assert.equal(finished.stage, 'finished');
  assert.equal(finished.winner, 'Barbarian wins');
  assert.equal(finished.players[1].hand.length, 4);

  const legacy = rules.createMatch(rolls(0));
  legacy.stage = 'main';
  const legacyNext = act(legacy, 'next');
  assert.equal(legacyNext.stage, 'offence');
  assert.equal(legacyNext.players[1].hand, 5);
  assert.equal(legacyNext.players[1].deck, 27);
  return results;
}

function rollTimingResults(rules) {
  const snapshots = [];
  const snapshot = state => {
    const context = rules.rollContext(state);
    const view = plain({
      context, phase: rules.rollPhase(state), locked: !!rules.attackLocked(state),
      actor: rules.actor(state), responder: rules.cardActor(state),
      owners: context?.dice.map((_, index) => rules.dieOwner(context, index)),
      writableDice: [0, 1].map(seat => rules.diceOwnedBy(context, seat, state))
    });
    snapshots.push(view);
    return view;
  };

  const show = start(rules, [12, 0]);
  show.players[0].hand = [16, 18];
  show.players[1].hand = [16, 18];
  Object.assign(show, {stage: 'gunContest', gunContest: {seat: 0, kind: 'showdown', dice: [2, 5]}});
  assert.deepEqual(snapshot(show).owners, [0, 1]);
  assert.deepEqual(Array.from(rules.cardChoices(show, 0, 16), option => option.i), [1]);
  assert.deepEqual(Array.from(rules.cardChoices(show, 0, 18), option => option.i), [0]);
  const rerolled = step(rules, plain(show), 'playCard', {id: 16, choice: 0});
  assert.deepEqual(plain(rerolled.gunContest.dice), [2, 3]);
  snapshots.push(plain(rerolled));

  const response = {...plain(show), response: {seat: 1, action: {type: 'resolveGunContest'}}};
  const during = snapshot(response);
  assert.equal(during.actor, 0);
  assert.equal(during.responder, 1);
  assert.deepEqual(during.owners, [0, 1]);

  const frozen = start(rules, [0, 34]);
  frozen.players[0].hand = [13, 18];
  frozen.players[0].diceCube = 1;
  Object.assign(frozen, {
    stage: 'offence', dice: [1, 2, 3, 4, 5], attempts: 1,
    iceFirstRoll: {seat: 0, values: [1, 2, 3, 4, 5], selected: [0]}
  });
  assert.deepEqual(snapshot(frozen).writableDice, [[null, 2, 3, 4, 5], []]);
  assert.ok(Array.from(rules.cardChoices(frozen, 0, 18)).every(option => option.i !== 0));
  const nested = {
    ...plain(frozen), stage: 'iceChoices',
    iceTask: {seat: 1, resume: 'offence', queue: [{kind: 'gain', amount: 1}]}
  };
  const throughChoice = snapshot(nested);
  assert.equal(throughChoice.phase, true);
  assert.equal(throughChoice.actor, 1);
  assert.deepEqual(throughChoice.owners, [0, 0, 0, 0, 0]);
  assert.deepEqual(throughChoice.writableDice, [[null, 2, 3, 4, 5], []]);
  const cardDice = snapshot({...nested, cardRoll: {seat: 1, roller: 0, dice: [6], id: 3}});
  assert.equal(cardDice.actor, 1);
  assert.deepEqual(cardDice.owners, [0]);
  assert.deepEqual(cardDice.writableDice, [[6], []]);

  const discardWindow = start(rules, [41, 0]);
  discardWindow.krampusOverflow = 1;
  discardWindow.krampusActivation = {seat: 0};
  const choosing = snapshot(discardWindow);
  assert.equal(choosing.actor, 1);
  assert.equal(choosing.responder, 0);
  const rage = start(rules, [0, 39]);
  rage.wolverineIntimidate = {target: 1};
  rage.wolverineRageRoll = {seat: 0, dice: [4]};
  const rageWindow = snapshot(rage);
  assert.equal(rageWindow.actor, 1);
  assert.equal(rageWindow.responder, 0);
  assert.deepEqual(rageWindow.owners, [0]);

  const ultimate = start(rules, [0, 1]);
  ultimate.players[1].hand = [8, 13];
  Object.assign(ultimate, {stage: 'locked', pending: {ultimate: true, attack: true, damage: 15}});
  assert.equal(snapshot(ultimate).locked, true);
  const forbidden = [8, 13].map(id => plain(rules.cardChoices(ultimate, 1, id)));
  assert.deepEqual(forbidden, [[], []]);
  snapshots.push(forbidden);

  const scalar = start(rules, [0, 1]);
  scalar.players[1].hand = [8];
  Object.assign(scalar, {stage: 'evasion', effectDie: 3, evasionSeat: 1, evasionReturnStage: 'damage'});
  assert.deepEqual(snapshot(scalar).context, {seat: 1, dice: [3], scalar: true});
  const tip = rules.cardChoices(scalar, 1, 8).findIndex(option => option.v === 4);
  assert.ok(tip >= 0);
  const tipped = step(rules, plain(scalar), 'playCard', {id: 8, choice: tip});
  assert.equal(tipped.effectDie, 4);
  snapshots.push(plain(tipped));
  return snapshots;
}

const turnBoundaries = turnBoundaryResults(engine);
const rollTiming = rollTimingResults(engine);
console.log('Positive-status, transfer, turn lifecycle and roll timing regression checks passed.');

if (baseline) {
  const old = loadEngine(path.resolve(baseline));
  let comparisons = 0;
  let transitions = 0;
  const compare = (before, after, label) => {
    assert.deepEqual(plain(after), plain(before), label);
    comparisons++;
  };
  const run = (state, type, extra, roll) => {
    const before = step(old, plain(state), type, extra, roll);
    const after = step(engine, plain(state), type, extra, roll);
    compare(before, after, `${state.stage} → ${type}`);
    transitions++;
    return after;
  };
  compare(transferResults(old), transfers, 'Resolved transfers preserve source and countdown');
  transitions += transfers.length;
  const previousBoundaries = turnBoundaryResults(old);
  for (const [index, state] of turnBoundaries.entries()) {
    compare(previousBoundaries[index], state, `Turn boundary ${index + 1}`);
  }
  transitions += turnBoundaries.length;
  const previousRollTiming = rollTimingResults(old);
  for (const [index, snapshot] of rollTiming.entries()) {
    compare(previousRollTiming[index], snapshot, `Roll timing scenario ${index + 1}`);
  }
  compare(old.names, engine.names, 'Hero identities and order');
  compare(old.leafletKeys, engine.leafletKeys, 'Positive status catalogue and order');

  const phases = ['passResponse', 'resolveUpkeep', 'collectSynth', 'resolveArtRoll', 'reposition',
    'horseUpkeep', 'gambitHighStakes', 'gambitResolveRoll', 'gambitContinue', 'alchemistUpkeep',
    'alchemistChoice', 'forgeUpkeep', 'forgeMineChoice', 'unearth', 'begin', 'accept',
    'rollEffect', 'resolveEffect', 'resolveTarget', 'defend', 'resolveDefence', 'settle',
    'continueHit', 'skipCombo', 'endMain', 'next'];
  for (const hero of engine.names.keys()) {
    for (const active of [0, 1]) {
      const heroes = active === 0 ? [hero, (hero + 1) % 45] : [(hero + 1) % 45, hero];
      const first = start(engine, heroes, active, !!active);
      compare(start(old, heroes, active, !!active), first, `Opening state for hero ${hero}`);
      compare(finishMain(old, plain(first)), finishMain(engine, plain(first)), `Later entry for opponent of hero ${hero}`);
      for (const pattern of [[1, 2, 3, 4, 5], [1, 1, 1, 1, 1], [6, 6, 6, 6, 6]]) {
        let state = plain(first);
        for (let index = 0; index < 32 && state.turn === 1; index++) {
          const legal = engine.legal(state);
          compare(old.legal(state), legal, 'Legal actions');
          compare(old.rollContext(state), engine.rollContext(state), 'Visible roll context');
          compare(old.rollPhase(state), engine.rollPhase(state), 'Roll Phase eligibility');
          compare(old.actor(state), engine.actor(state), 'Acting seat');
          const cardSeat = engine.cardActor(state);
          compare(old.cardActor(state), cardSeat, 'Responding seat');
          for (const id of state.players[cardSeat].hand) {
            compare(old.cardChoices(state, cardSeat, id), engine.cardChoices(state, cardSeat, id), `Card choices for ${id}`);
          }
          compare(old.tokenChoices(state, cardSeat), engine.tokenChoices(state, cardSeat), 'Token choices');
          let next;
          if (legal.declare?.length) {
            next = run(state, 'declare', {ability: legal.declare.at(-1)});
          } else if (legal.roll && state.attempts === 0) {
            let offset = 0;
            const tape = () => pattern[offset++ % pattern.length];
            const before = step(old, state, 'roll', {}, tape);
            offset = 0;
            next = step(engine, state, 'roll', {}, tape);
            compare(before, next, 'Offensive roll');
            transitions++;
          } else {
            const action = (legal.end ? 'end' : null) ?? phases.find(type => legal[type]);
            if (!action) break;
            next = run(state, action, {choice: 0, index: 0});
          }
          if (JSON.stringify(next) === JSON.stringify(state)) break;
          state = next;
        }
      }

      const state = stealScenario(engine, hero, active);
      const options = engine.conjure(state, active);
      compare(old.conjure(state, active), options, 'Conjure choice order');
      compare(old.fourthWall(state, active), engine.fourthWall(state, active), 'Fourth Wall choices');
      for (const [choice] of options.entries()) {
        const pending = run(state, 'spendConjure', {choice});
        if (pending.conjureTask) run(pending, 'conjureAllow');
      }
    }
  }
  console.log(`${comparisons} baseline comparisons, including ${transitions} transitions across all 45 heroes.`);
}
