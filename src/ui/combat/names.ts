import type { CombatState, CreatureId } from '../../engine';

/** "Scrap Mite A" / "Scrap Mite B" when two enemies share a name; "you" for the player. */
export function creatureLabel(state: CombatState, id: CreatureId | undefined, you = 'you'): string {
  if (id === undefined) return 'something';
  if (id === 'player') return you;
  const enemy = state.enemies.find((e) => e.id === id);
  if (!enemy) return id;
  const same = state.enemies.filter((e) => e.name === enemy.name);
  if (same.length < 2) return enemy.name;
  return `${enemy.name} ${String.fromCharCode(65 + same.indexOf(enemy))}`;
}
