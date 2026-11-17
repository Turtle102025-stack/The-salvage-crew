/**
 * A simple but sensible AI player for the balance simulator.
 *
 * Combat: one-step lookahead. For every playable card / target (and potion
 * when it matters) the engine plays it on a copy of the state and the result
 * is scored; the best move is taken, or the turn ends when nothing helps.
 * Run decisions (cards, paths, shops, events) use light heuristics with a bit
 * of seeded randomness so every card gets picked sometimes.
 */
import {
  availableNodes,
  canPlayCard,
  cardNeedsTarget,
  choiceAvailable,
  dispatchCombat,
  effectsUseTarget,
  getIntent,
  nextFloat,
  pick,
  resolveCard,
  selectableCards,
  shopPrice,
  type CardDef,
  type CombatCommand,
  type CombatState,
  type Content,
  type Effect,
  type RngState,
  type RunCommand,
  type RunEffect,
  type RunState,
  type Amount,
} from '../src/engine';

// --- Combat ------------------------------------------------------------------

const STATUS_VALUE: Record<string, number> = {
  strength: 5,
  scrap: 0.9,
  cutter_drone: 6,
  shield_drone: 5,
  coolant_drone: 6,
  recycler: 7,
  scrap_plating: 9,
  thermal_feedback: 12,
  double_shift: 12,
  magnetic_field: 7,
  // debuffs on the player
  weak: -3,
  vulnerable: -4,
  poison: -1.5,
};

/** Value of debuffs we put on an enemy (per stack). */
const ENEMY_STATUS_VALUE: Record<string, number> = {
  poison: 1.6,
  vulnerable: 3,
  weak: 2.2,
  breach: 1.2,
  magnetized: 0.6,
  strength: -4,
};

function heatValue(heat: number): number {
  if (heat >= 8) return 3 - (heat - 7) * 4; // close to Overheat: risky
  return heat * 0.6;
}

export function incomingDamage(content: Content, state: CombatState): number {
  let total = 0;
  for (const e of state.enemies) {
    if (e.dead) continue;
    const intent = getIntent(content, state, e);
    if (intent?.damage !== undefined) total += intent.damage * (intent.hits ?? 1);
  }
  return total;
}

export function scoreCombat(content: Content, state: CombatState): number {
  if (state.phase === 'victory') return 100000 + state.player.hp * 10;
  if (state.phase === 'defeat') return -100000;
  let score = state.player.hp * 2.2;
  const incoming = incomingDamage(content, state);
  const unblocked = Math.max(0, incoming - state.player.block);
  score -= unblocked * 2.4;
  // Some value for block beyond the visible attack (powers, multi-turn safety), small.
  score += Math.min(state.player.block, incoming + 6) * 0.15;
  for (const [id, n] of Object.entries(state.player.statuses)) {
    if (id === 'heat') score += heatValue(n);
    else score += (STATUS_VALUE[id] ?? (content.statuses[id]?.kind === 'power' ? 8 : 0)) * n;
  }
  for (const e of state.enemies) {
    if (e.dead) {
      score += 45;
      continue;
    }
    score -= e.hp * 1.0 + e.block * 0.35;
    for (const [id, n] of Object.entries(e.statuses)) score += (ENEMY_STATUS_VALUE[id] ?? 0) * n;
  }
  score += state.hand.length * 0.8 + state.energy * 0.3;
  return score;
}

/** All the moves worth considering right now. */
function candidates(content: Content, state: CombatState, usePotions: boolean): CombatCommand[] {
  const out: CombatCommand[] = [];
  const living = state.enemies.filter((e) => !e.dead);
  for (const card of state.hand) {
    if (!canPlayCard(content, state, card.uid).ok) continue;
    const def = content.cards[card.id]!;
    if (cardNeedsTarget(def, card.upgraded) && living.length > 1) {
      for (const e of living) out.push({ type: 'playCard', uid: card.uid, target: e.id });
    } else out.push({ type: 'playCard', uid: card.uid });
  }
  if (usePotions) {
    state.potions.forEach((id, slot) => {
      if (!id) return;
      const def = content.potions[id];
      if (!def) return;
      if (effectsUseTarget(def.effects) && living.length > 1) for (const e of living) out.push({ type: 'usePotion', slot, target: e.id });
      else out.push({ type: 'usePotion', slot });
    });
  }
  return out;
}

export interface CombatPolicy {
  /** Fight kind, so potions are saved for the fights that matter. */
  node: 'battle' | 'elite' | 'boss';
}

export function chooseCombatCommand(content: Content, state: CombatState, policy: CombatPolicy): CombatCommand {
  const base = scoreCombat(content, state);
  const danger = incomingDamage(content, state) - state.player.block >= state.player.hp * 0.6;
  const usePotions = policy.node !== 'battle' || state.player.hp < state.player.maxHp * 0.35 || danger;
  let best: CombatCommand = { type: 'endTurn' };
  let bestScore = base + 0.5;
  for (const cmd of candidates(content, state, usePotions)) {
    const result = dispatchCombat(content, state, cmd);
    if (result.error) continue;
    let s = scoreCombat(content, result.state);
    if (cmd.type === 'usePotion') s -= policy.node === 'boss' ? 2 : 8; // potions are a resource
    if (s > bestScore) {
      bestScore = s;
      best = cmd;
    }
  }
  return best;
}

// --- Card evaluation ---------------------------------------------------------

function walk(effects: readonly Effect[], visit: (e: Effect) => void) {
  for (const e of effects) {
    visit(e);
    if (e.type === 'spend' || e.type === 'if') {
      walk(e.then, visit);
      walk(e.else ?? [], visit);
    } else if (e.type === 'repeat') walk(e.effects, visit);
  }
}

/** Which deck style(s) a card belongs to. */
export function cardTags(def: CardDef): Set<string> {
  const tags = new Set<string>();
  walk(def.effects, (e) => {
    const touches = (id: string) => (e.type === 'applyStatus' || e.type === 'removeStatus' || e.type === 'spend') && e.status === id;
    const scales = (id: string) =>
      (e.type === 'attack' || e.type === 'block' || e.type === 'damage') && typeof e.amount === 'object' && typeof e.amount.of === 'object' && e.amount.of.stacks === id;
    if (touches('scrap') || scales('scrap') || touches('scrap_plating') || touches('recycler')) tags.add('scrap');
    if (touches('heat') || scales('heat') || touches('thermal_feedback')) tags.add('heat');
    if (touches('cutter_drone') || touches('shield_drone') || touches('coolant_drone')) tags.add('drone');
    if (touches('poison') || touches('coolant_drone')) tags.add('poison');
    if (touches('magnetized') || touches('magnetic_field') || scales('magnetized')) tags.add('magnet');
    if (e.type === 'block') tags.add('block');
    if (e.type === 'attack' && e.target === 'allEnemies') tags.add('aoe');
  });
  if (def.type === 'attack') tags.add('attack');
  return tags;
}

/** Rough context the AI assumes when valuing scaling cards. */
const ASSUME: Record<string, number> = { heat: 5, scrap: 4, magnetized: 2, x: 3, thisStacks: 3, handSize: 5 };

function amountValue(a: Amount): number {
  if (typeof a === 'number') return a;
  const src = a.of;
  const v = typeof src === 'object' ? (ASSUME[src.stacks] ?? 2) : (ASSUME[src] ?? 2);
  return (a.plus ?? 0) + (a.times ?? 1) * v;
}

/** Value of a status applied to an enemy (per stack) or gained by you (per stack). */
const ON_ENEMY: Record<string, number> = { vulnerable: 4, weak: 3, poison: 1.8, breach: 1.6, magnetized: 1.3 };
const ON_SELF: Record<string, number> = {
  strength: 7,
  scrap: 1.3,
  heat: 0.6,
  cutter_drone: 4,
  shield_drone: 3,
  coolant_drone: 5,
  recycler: 7,
  scrap_plating: 14,
  thermal_feedback: 18,
  double_shift: 16,
  magnetic_field: 9,
};

function effectsPower(effects: readonly Effect[]): number {
  let v = 0;
  for (const e of effects) {
    switch (e.type) {
      case 'attack':
      case 'damage': {
        const hits = e.type === 'attack' && e.hits !== undefined ? amountValue(e.hits) : 1;
        v += amountValue(e.amount) * hits * (e.target === 'allEnemies' ? 1.7 : 1) * (e.type === 'damage' ? 0.9 : 1);
        break;
      }
      case 'block':
        v += amountValue(e.amount) * 0.75;
        break;
      case 'applyStatus': {
        const n = amountValue(e.amount);
        if (e.target === 'self') v += (ON_SELF[e.status] ?? 2) * n;
        else v += (ON_ENEMY[e.status] ?? 1) * n * (e.target === 'allEnemies' ? 1.7 : 1);
        break;
      }
      case 'removeStatus':
        v += e.status === 'heat' ? 1.5 : 0;
        break;
      case 'draw':
        v += amountValue(e.amount) * 3;
        break;
      case 'gainEnergy':
        v += amountValue(e.amount) * 4.5;
        break;
      case 'heal':
        v += amountValue(e.amount) * 0.5;
        break;
      case 'loseHp':
        v -= amountValue(e.amount) * 0.6;
        break;
      case 'addCard':
        v -= 2 * (e.count ?? 1);
        break;
      case 'spend':
        v += 0.6 * effectsPower(e.then);
        break;
      case 'if':
        v += 0.5 * effectsPower(e.then);
        break;
      case 'repeat':
        v += amountValue(e.times) * effectsPower(e.effects);
        break;
    }
  }
  return v;
}

/** Estimated value per Energy of a card (a starter Pry Bar is about 6). */
export function cardPower(def: CardDef, upgraded: boolean): number {
  const card = resolveCard(def, upgraded);
  const cost = card.cost === 'X' ? 3 : card.cost;
  let v = effectsPower(card.effects);
  if (def.type === 'power') v *= 1.1;
  if ((card.keywords ?? []).includes('exhaust') && def.type !== 'power') v *= 0.85;
  return v / Math.max(cost, 0.7);
}

export function cardScore(content: Content, run: RunState, id: string, upgraded: boolean): number {
  const def = content.cards[id];
  if (!def) return 0;
  if (def.type === 'curse' || def.type === 'status') return -10;
  let s = cardPower(def, upgraded) * 0.55;
  const tags = cardTags(def);
  const deckTags = run.deck.map((c) => cardTags(content.cards[c.id]!));
  for (const t of tags) {
    if (t === 'attack' || t === 'block') continue;
    const shared = deckTags.filter((d) => d.has(t)).length;
    s += Math.min(2.5, shared * 0.5);
  }
  const attacks = deckTags.filter((d) => d.has('attack')).length;
  if (tags.has('attack') && attacks < run.deck.length * 0.45) s += 0.8;
  if (tags.has('aoe')) s += 0.6;
  // Bigger decks draw good cards less often.
  s -= Math.max(0, run.deck.length - 18) * 0.12;
  return s;
}

// --- Run decisions ----------------------------------------------------------------

export interface AiOptions {
  /** Chance to pick randomly instead of by score (spreads the statistics). */
  explore: number;
}

function runEffectScore(content: Content, run: RunState, effects: readonly RunEffect[]): number {
  let s = 0;
  const hpFrac = run.hp / run.maxHp;
  for (const e of effects) {
    switch (e.type) {
      case 'gold':
        s += e.amount * 0.06;
        break;
      case 'hp':
        s += e.amount < 0 ? e.amount * (hpFrac < 0.5 ? 0.9 : 0.4) : Math.min(e.amount, run.maxHp - run.hp) * 0.4;
        break;
      case 'healPercent':
        s += Math.min((run.maxHp * e.percent) / 100, run.maxHp - run.hp) * 0.4;
        break;
      case 'maxHp':
        s += e.amount * 0.7;
        break;
      case 'addCard':
        s += content.cards[e.card]?.type === 'curse' ? -6 : 2;
        break;
      case 'addRandomCard':
        s += 2;
        break;
      case 'relic':
        s += 7;
        break;
      case 'potion':
        s += run.potions.includes(null) ? 2.5 : 0;
        break;
      case 'selectCards':
        s += e.purpose === 'remove' ? 4 : e.purpose === 'upgrade' ? 3.5 : 1;
        break;
      case 'upgradeRandom':
        s += 2.5 * e.count;
        break;
      case 'fight':
        s += hpFrac < 0.5 ? -12 : -4;
        break;
      case 'chance':
        s += (e.percent / 100) * runEffectScore(content, run, e.then) + (1 - e.percent / 100) * runEffectScore(content, run, e.else ?? []);
        break;
    }
  }
  return s;
}

function upgradeTarget(content: Content, run: RunState): number | undefined {
  const options = selectableCards(content, run, 'upgrade');
  if (!options.length) return undefined;
  return [...options].sort((a, b) => cardScore(content, run, b.id, false) - cardScore(content, run, a.id, false))[0]!.uid;
}

function removeTarget(content: Content, run: RunState): number | undefined {
  const order = (id: string) => {
    const def = content.cards[id];
    if (def?.type === 'curse') return 0;
    if (id === 'hull_patch') return 2;
    if (id === 'pry_bar') return 1;
    return 10 + cardScore(content, run, id, false);
  };
  return [...run.deck].sort((a, b) => order(a.id) - order(b.id))[0]?.uid;
}

export function chooseRunCommand(content: Content, run: RunState, rng: RngState, opts: AiOptions): RunCommand {
  const s = run.screen;
  const explore = () => nextFloat(rng) < opts.explore;
  switch (s.type) {
    case 'actIntro':
      return { type: 'proceed' };

    case 'map': {
      const nodes = availableNodes(run.map, run.position).map((id) => run.map.nodes[id]!);
      if (explore()) return { type: 'chooseNode', node: pick(rng, nodes).id };
      const hp = run.hp / run.maxHp;
      const value = (type: string) => {
        switch (type) {
          case 'rest':
            return hp < 0.5 ? 10 : 3;
          case 'elite':
            return hp > 0.75 ? 6 : hp > 0.55 ? 2 : -8;
          case 'shop':
            return run.gold >= 150 ? 6 : 1;
          case 'treasure':
            return 8;
          case 'event':
            return 4;
          case 'battle':
            return hp > 0.4 ? 4.5 : 1;
          default:
            return 0;
        }
      };
      nodes.sort((a, b) => value(b.type) - value(a.type) || a.col - b.col);
      return { type: 'chooseNode', node: nodes[0]!.id };
    }

    case 'combat':
      return { type: 'combat', command: chooseCombatCommand(content, s.combat, { node: s.node === 'boss' ? 'boss' : s.node === 'elite' ? 'elite' : 'battle' }) };

    case 'reward':
    case 'treasure': {
      if (s.type === 'treasure' && !s.opened) return { type: 'openChest' };
      const r = s.reward!;
      if (r.gold !== null) return { type: 'takeGold' };
      if (r.relic) return { type: 'takeRelic' };
      if (r.bossRelics) return { type: 'takeRelic', index: explore() ? Math.floor(nextFloat(rng) * r.bossRelics.length) : 0 };
      if (r.potion && run.potions.includes(null)) return { type: 'takePotion' };
      const i = r.cards.findIndex((c) => !c.taken);
      if (i >= 0) {
        const options = r.cards[i]!.options;
        if (explore()) {
          const roll = Math.floor(nextFloat(rng) * (options.length + 1));
          return roll === options.length ? { type: 'skipCard', reward: i } : { type: 'takeCard', reward: i, option: roll };
        }
        const scored = options.map((o, k) => ({ k, v: cardScore(content, run, o.id, o.upgraded) }));
        scored.sort((a, b) => b.v - a.v);
        const threshold = run.deck.length > 22 ? 5.5 : 4;
        if (scored[0]!.v < threshold) return { type: 'skipCard', reward: i };
        return { type: 'takeCard', reward: i, option: scored[0]!.k };
      }
      return { type: 'proceed' };
    }

    case 'rest':
      if (s.done) return { type: 'proceed' };
      if (run.hp < run.maxHp * 0.55 || selectableCards(content, run, 'upgrade').length === 0) return { type: 'rest' };
      return { type: 'smith' };

    case 'shop': {
      const { shop } = s;
      const removePrice = shopPrice(content, run, shop.removePrice);
      if (!shop.removeUsed && run.gold >= removePrice && run.deck.length > 8) return { type: 'removeCard' };
      const relicIdx = shop.relics.findIndex((r) => !r.sold && shopPrice(content, run, r.price) <= run.gold - 40);
      if (relicIdx >= 0 && !explore()) return { type: 'buy', kind: 'relic', index: relicIdx };
      let bestCard = -1;
      let bestScore = 5.2;
      shop.cards.forEach((c, i) => {
        if (c.sold || shopPrice(content, run, c.price) > run.gold) return;
        const v = cardScore(content, run, c.id, c.upgraded ?? false);
        if (v > bestScore) {
          bestScore = v;
          bestCard = i;
        }
      });
      if (bestCard >= 0) return { type: 'buy', kind: 'card', index: bestCard };
      const potionIdx = shop.potions.findIndex((p) => !p.sold && shopPrice(content, run, p.price) <= run.gold - 60);
      if (potionIdx >= 0 && run.potions.includes(null)) return { type: 'buy', kind: 'potion', index: potionIdx };
      return { type: 'proceed' };
    }

    case 'event': {
      if (s.event.result !== null) return { type: 'proceed' };
      const scene = content.events[s.event.id]!.scenes[s.event.scene]!;
      const options = scene.choices.map((c, i) => ({ i, ok: choiceAvailable(run, c.requires), v: c.next ? 3 : runEffectScore(content, run, c.effects) }));
      const ok = options.filter((o) => o.ok);
      if (explore()) return { type: 'eventChoice', index: pick(rng, ok).i };
      ok.sort((a, b) => b.v - a.v);
      return { type: 'eventChoice', index: ok[0]!.i };
    }

    case 'cardSelect': {
      const eligible = selectableCards(content, run, s.purpose);
      const need = Math.min(s.count, eligible.length);
      let uids: number[];
      if (s.purpose === 'upgrade') {
        const sorted = [...eligible].sort((a, b) => cardScore(content, run, b.id, false) - cardScore(content, run, a.id, false));
        uids = sorted.slice(0, need).map((c) => c.uid);
        void upgradeTarget;
      } else if (s.purpose === 'remove' || s.purpose === 'transform') {
        const first = removeTarget(content, run);
        uids = [first, ...eligible.map((c) => c.uid).filter((u) => u !== first)].filter((u): u is number => u !== undefined).slice(0, need);
      } else {
        const sorted = [...eligible].sort((a, b) => cardScore(content, run, b.id, b.upgraded) - cardScore(content, run, a.id, a.upgraded));
        uids = sorted.slice(0, need).map((c) => c.uid);
      }
      return { type: 'selectCards', uids };
    }

    case 'gameOver':
      throw new Error('The run is over.');
  }
}
