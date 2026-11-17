/**
 * Generates rules text from effects, so a card's text always matches what it
 * does (upgrades included). Content can override with a hand-written `text`.
 */
import { resolveCard } from '../defs';
import type { CardDef, CardKeyword, Content, Hook, RelicDef, StatusDef, Trigger } from '../types';
import type { Amount, CardPile, Condition, Effect, TargetSel } from './types';

/** Lower-cases the first letter unless the word is an all-caps keyword (ALL). */
function lcFirst(text: string): string {
  if (/^[A-Z]{2,}/.test(text)) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function stripPeriod(text: string): string {
  return text.endsWith('.') ? text.slice(0, -1) : text;
}

function statusName(content: Content, id: string): string {
  return content.statuses[id]?.name ?? id;
}

function plural(n: string, word: string): string {
  return n === '1' ? `${n} ${word}` : `${n} ${word}s`;
}

/** Fills a status description template: {n} = stacks, {s} = plural "s". */
export function fillStatusText(template: string, stacks: number): string {
  return template.replaceAll('{n}', String(stacks)).replaceAll('{s}', stacks === 1 ? '' : 's');
}

type AmountText = { kind: 'number'; text: string } | { kind: 'phrase'; text: string };

function describeAmount(content: Content, amount: Amount): AmountText {
  if (typeof amount === 'number') return { kind: 'number', text: String(amount) };
  const times = amount.times ?? 1;
  const plus = amount.plus ?? 0;
  const src = amount.of;
  if (src === 'x') {
    const core = times === 1 ? 'X' : `${times}X`;
    return { kind: 'number', text: plus ? `${core}+${plus}` : core };
  }
  let source: string;
  if (src === 'thisStacks') source = 'its stacks';
  else if (src === 'handSize') source = 'the number of cards in your hand';
  else source = src.on === 'target' ? `the target's ${statusName(content, src.stacks)}` : `your ${statusName(content, src.stacks)}`;
  const scaled = times === 1 ? source : times === 2 ? `twice ${source}` : `${times}× ${source}`;
  return { kind: 'phrase', text: plus ? `${plus} plus ${scaled}` : scaled };
}

function targetSuffix(target: TargetSel): string {
  switch (target) {
    case 'allEnemies':
      return ' to ALL enemies';
    case 'randomEnemy':
      return ' to a random enemy';
    case 'self':
      return ' to yourself';
    case 'allAllies':
      return ' to all allies';
    case 'target':
      return '';
  }
}

function pileName(pile: CardPile): string {
  return pile === 'hand' ? 'your hand' : pile === 'draw' ? 'your draw pile' : 'your discard pile';
}

function describeCondition(content: Content, cond: Condition): string {
  if ('not' in cond) {
    const inner = describeCondition(content, cond.not);
    return inner.replace(' has ', ' does not have ').replace('you have', 'you do not have');
  }
  const name = statusName(content, cond.hasStatus);
  const amount = cond.atLeast && cond.atLeast > 1 ? `${cond.atLeast} or more ` : '';
  return cond.on === 'target' ? `the target has ${amount}${name}` : `you have ${amount}${name}`;
}

/** Bonus clauses read better with "more": "Spend 2 Scrap: gain 6 more Block." */
function bonus(text: string): string {
  return text.replace(/^gain (\d+) Block/, 'gain $1 more Block').replace(/^deal (\d+) damage/, 'deal $1 more damage');
}

/** "Deal 6 damage." / "Deal damage equal to twice your Heat." */
function describeDamage(content: Content, amount: Amount, target: TargetSel, hits?: Amount): string {
  const a = describeAmount(content, amount);
  const where = targetSuffix(target);
  let hitText = '';
  if (hits !== undefined) {
    const h = describeAmount(content, hits);
    if (h.kind === 'number' && h.text === '2') hitText = ' twice';
    else if (h.kind === 'number' && h.text !== '1') hitText = ` ${h.text} times`;
    else if (h.kind === 'phrase') hitText = `, repeated ${h.text} times`;
  }
  if (a.kind === 'number') return `Deal ${a.text} damage${where}${hitText}.`;
  return `Deal damage${where} equal to ${a.text}${hitText}.`;
}

export function describeEffect(content: Content, effect: Effect): string {
  switch (effect.type) {
    case 'attack':
      return describeDamage(content, effect.amount, effect.target, effect.hits);
    case 'damage':
      return describeDamage(content, effect.amount, effect.target);
    case 'block': {
      const a = describeAmount(content, effect.amount);
      const who = effect.target === 'self' ? 'Gain' : effect.target === 'allAllies' ? 'All allies gain' : 'Give';
      return a.kind === 'number' ? `${who} ${a.text} Block.` : `${who} Block equal to ${a.text}.`;
    }
    case 'applyStatus': {
      const def = content.statuses[effect.status];
      const a = describeAmount(content, effect.amount);
      // Powers describe what they do rather than "Gain 3 Cutter Drone".
      if (def?.kind === 'power' && effect.target === 'self' && a.kind === 'number') {
        return fillStatusText(def.description, Number(a.text));
      }
      const name = statusName(content, effect.status);
      const n = a.kind === 'number' ? `${a.text} ${name}` : `${name} equal to ${a.text}`;
      switch (effect.target) {
        case 'self':
          return `Gain ${n}.`;
        case 'target':
          return `Apply ${n}.`;
        case 'allEnemies':
          return `Apply ${n} to ALL enemies.`;
        case 'randomEnemy':
          return `Apply ${n} to a random enemy.`;
        case 'allAllies':
          return `All allies gain ${n}.`;
      }
      break;
    }
    case 'removeStatus': {
      const name = statusName(content, effect.status);
      const n = effect.amount === undefined ? 'all' : describeAmount(content, effect.amount).text;
      return effect.target === 'self' ? `Lose ${n} ${name}.` : `Remove ${n} ${name}${targetSuffix(effect.target).replace(' to ', ' from ')}.`;
    }
    case 'draw': {
      const a = describeAmount(content, effect.amount);
      return a.kind === 'number' ? `Draw ${plural(a.text, 'card')}.` : `Draw cards equal to ${a.text}.`;
    }
    case 'gainEnergy': {
      const a = describeAmount(content, effect.amount);
      return a.kind === 'number' ? `Gain ${a.text} Energy.` : `Gain Energy equal to ${a.text}.`;
    }
    case 'heal': {
      const a = describeAmount(content, effect.amount);
      return a.kind === 'number' ? `Heal ${a.text} HP.` : `Heal HP equal to ${a.text}.`;
    }
    case 'loseHp': {
      const a = describeAmount(content, effect.amount);
      if (effect.target === 'self') return a.kind === 'number' ? `Lose ${a.text} HP.` : `Lose HP equal to ${a.text}.`;
      return `${effect.target === 'target' ? 'The target loses' : 'ALL enemies lose'} ${a.text} HP.`;
    }
    case 'addCard': {
      const def = content.cards[effect.card];
      const name = def ? resolveCard(def, effect.upgraded ?? false).name : effect.card;
      const count = effect.count ?? 1;
      return `Add ${count === 1 ? 'a' : count} ${name}${count === 1 ? '' : ' cards'} to ${pileName(effect.to)}.`;
    }
    case 'spend': {
      const then = bonus(lcFirst(describeEffects(content, effect.then)));
      const otherwise = effect.else ? ` Otherwise, ${lcFirst(describeEffects(content, effect.else))}` : '';
      return `Spend ${effect.amount} ${statusName(content, effect.status)}: ${then}${otherwise}`;
    }
    case 'repeat': {
      const t = describeAmount(content, effect.times);
      const inner = stripPeriod(describeEffects(content, effect.effects));
      return t.kind === 'number' ? `${inner} ${t.text} times.` : `${inner}, repeated ${t.text} times.`;
    }
    case 'if': {
      const then = bonus(lcFirst(describeEffects(content, effect.then)));
      const otherwise = effect.else ? ` Otherwise, ${lcFirst(describeEffects(content, effect.else))}` : '';
      return `If ${describeCondition(content, effect.cond)}, ${then}${otherwise}`;
    }
  }
  return '';
}

export function describeEffects(content: Content, effects: readonly Effect[]): string {
  return effects.map((e) => describeEffect(content, e)).join(' ');
}

const KEYWORD_TEXT: Record<CardKeyword, string> = {
  unplayable: 'Unplayable.',
  innate: 'Innate.',
  ethereal: 'Ethereal.',
  retain: 'Retain.',
  exhaust: 'Exhaust.',
};
const LEADING_KEYWORDS: CardKeyword[] = ['unplayable', 'innate', 'ethereal', 'retain'];

/** Full rules text for a card, e.g. "Deal 5 damage. Gain 2 Scrap." */
export function describeCard(content: Content, def: CardDef, upgraded: boolean): string {
  const card = resolveCard(def, upgraded);
  const keywords = card.keywords ?? [];
  const lead = LEADING_KEYWORDS.filter((k) => keywords.includes(k)).map((k) => KEYWORD_TEXT[k]);
  const body = card.text ?? describeEffects(content, card.effects);
  const tail = keywords.includes('exhaust') ? [KEYWORD_TEXT.exhaust] : [];
  return [...lead, body, ...tail].filter(Boolean).join(' ');
}

const TRIGGER_TEXT: Record<Trigger, string> = {
  combatStart: 'At the start of each combat',
  combatEnd: 'At the end of each combat',
  turnStart: 'At the start of your turn',
  turnEnd: 'At the end of your turn',
  cardPlayed: 'Whenever you play a card',
  attacked: 'Whenever you are attacked',
  damageTaken: 'Whenever you lose HP',
  blockGained: 'Whenever you gain Block',
  enemyDied: 'Whenever an enemy dies',
  shuffle: 'Whenever you shuffle your draw pile',
};

const CARD_TYPE_ARTICLE: Record<string, string> = {
  attack: 'an Attack',
  skill: 'a Skill',
  power: 'a Power',
  status: 'a Status',
  curse: 'a Curse',
};

function describeHook(content: Content, hook: Hook): string {
  let when = TRIGGER_TEXT[hook.on];
  if (hook.on === 'cardPlayed' && hook.if?.cardType) when = `Whenever you play ${CARD_TYPE_ARTICLE[hook.if.cardType]}`;
  return `${when}, ${lcFirst(describeEffects(content, hook.effects))}`;
}

export function describeRelic(content: Content, def: RelicDef): string {
  return def.description ?? def.hooks.map((h) => describeHook(content, h)).join(' ');
}

export function describeStatus(def: StatusDef, stacks: number): string {
  return fillStatusText(def.description, stacks);
}
