import { createRngStreams } from '../rng';
import type { CombatSetup, Content, DeckCard } from '../types';

/**
 * Builds a stand-alone fight from a seed: a character with their starter deck
 * and starter relic (plus any extra cards) against the given enemies.
 * Used by the test fight and by tests; runs build their fights from run state.
 */
export function setupFromSeed(
  content: Content,
  opts: { seed: string; characterId: string; enemies: string[]; extraCards?: DeckCard[]; hp?: number },
): CombatSetup {
  const character = content.characters[opts.characterId];
  if (!character) throw new Error(`Unknown character "${opts.characterId}"`);
  const streams = createRngStreams(opts.seed);
  return {
    characterId: character.id,
    hp: opts.hp ?? character.maxHp,
    maxHp: character.maxHp,
    deck: [...character.starterDeck.map((id) => ({ id })), ...(opts.extraCards ?? [])],
    relics: [character.starterRelic],
    enemies: opts.enemies,
    rng: { shuffle: streams.shuffle, enemyAI: streams.enemyAI, misc: streams.misc },
  };
}
