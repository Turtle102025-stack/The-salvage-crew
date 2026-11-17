/** Text for run effects (event choices) and potions, generated from data. */
import { resolveCard } from '../defs';
import { describeEffects } from '../effects/describe';
import type { Content, PotionDef, RunEffect } from '../types';

const PURPOSE: Record<string, [string, string]> = {
  upgrade: ['Upgrade a card.', 'Upgrade {n} cards.'],
  remove: ['Remove a card from your deck.', 'Remove {n} cards from your deck.'],
  transform: ['Transform a card into a random one.', 'Transform {n} cards into random ones.'],
  duplicate: ['Copy a card in your deck.', 'Copy {n} cards in your deck.'],
};

export function describeRunEffect(content: Content, e: RunEffect): string {
  switch (e.type) {
    case 'gold':
      return e.amount >= 0 ? `Gain ${e.amount} Credits.` : `Lose ${-e.amount} Credits.`;
    case 'hp':
      return e.amount >= 0 ? `Heal ${e.amount} HP.` : `Lose ${-e.amount} HP.`;
    case 'healPercent':
      return `Heal ${e.percent}% of your max HP.`;
    case 'maxHp':
      return e.amount >= 0 ? `Gain ${e.amount} max HP.` : `Lose ${-e.amount} max HP.`;
    case 'addCard': {
      const def = content.cards[e.card];
      const name = def ? resolveCard(def, e.upgraded ?? false).name : e.card;
      const count = e.count ?? 1;
      return `Add ${count > 1 ? `${count} ` : ''}${name} to your deck.`;
    }
    case 'addRandomCard':
      return `Add a random ${e.rarity ? `${e.rarity} ` : ''}${e.cardType ?? 'card'}${e.upgraded ? ' (upgraded)' : ''} to your deck.`;
    case 'relic':
      return e.relic ? `Obtain ${content.relics[e.relic]?.name ?? e.relic}.` : `Obtain ${e.rarity ? `${e.rarity} ` : ''}Salvage.`;
    case 'potion':
      return e.potion ? `Obtain ${content.potions[e.potion]?.name ?? e.potion}.` : 'Obtain a random Canister.';
    case 'selectCards': {
      const [one, many] = PURPOSE[e.purpose] ?? ['Choose a card.', 'Choose {n} cards.'];
      return e.count === 1 ? one : many.replace('{n}', String(e.count));
    }
    case 'upgradeRandom':
      return e.count === 1 ? 'Upgrade a random card.' : `Upgrade ${e.count} random cards.`;
    case 'fight':
      return `Fight: ${e.enemies.map((id) => content.enemies[id]?.name ?? id).join(', ')}.`;
    case 'chance': {
      const then = describeRunEffects(content, e.then);
      const otherwise = e.else?.length ? ` Otherwise: ${describeRunEffects(content, e.else)}` : '';
      return `${e.percent}% chance: ${then}${otherwise}`;
    }
  }
}

export function describeRunEffects(content: Content, effects: readonly RunEffect[]): string {
  return effects.map((e) => describeRunEffect(content, e)).join(' ');
}

export function describePotion(content: Content, def: PotionDef): string {
  if (def.description) return def.description;
  const text = describeEffects(content, def.effects);
  return def.outOfCombat ? `${text} Can also be used outside of fights.` : text;
}
