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
  const scripts = html.matchAll(/<script src="\.\/((?:heroes\/[^"]+|engine)\.js)"/g);
  for (const [, file] of scripts) {
    vm.runInContext(fs.readFileSync(path.join(directory, file), 'utf8'), context, {filename: file});
  }
  return vm.runInContext(`({
    createMatch, transition, legal, actor, cardActor, cardChoices, tokenChoices, tacticalChoices,
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
const stepPassing = (rules, state, type) => {
  const next = step(rules, state, type);
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

console.log('Positive-status, transfer and Upkeep regression checks passed.');

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
