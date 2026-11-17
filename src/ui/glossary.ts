/**
 * Plain-language explanations for keywords, plus a helper that finds every
 * status and keyword a card mentions (for its tooltip).
 */
import { resolveCard, type CardDef, type Content, type Effect } from '../engine';

export const KEYWORDS: Record<string, string> = {
  Block: 'Absorbs incoming damage. Your Block resets at the start of your turn.',
  Energy: 'Spend it to play cards. Refills to full at the start of each turn.',
  Exhaust: 'Removed from your deck until the end of this fight when played.',
  Ethereal: 'If it is still in your hand at the end of your turn, it is exhausted.',
  Retain: 'Stays in your hand at the end of your turn.',
  Innate: 'Always in your opening hand.',
  Unplayable: 'Cannot be played.',
  Power: 'Stays active for the rest of the fight once played.',
  X: 'Spends all your Energy; X is the amount spent.',
};

function walk(effects: readonly Effect[], visit: (e: Effect) => void) {
  for (const e of effects) {
    visit(e);
    if (e.type === 'spend' || e.type === 'if') {
      walk(e.then, visit);
      walk(e.else ?? [], visit);
    } else if (e.type === 'repeat') walk(e.effects, visit);
  }
}

export interface KeywordNote {
  name: string;
  text: string;
}

/** Status and keyword explanations relevant to a card. */
export function cardNotes(content: Content, def: CardDef, upgraded: boolean): KeywordNote[] {
  const card = resolveCard(def, upgraded);
  const notes = new Map<string, string>();
  for (const k of card.keywords ?? []) {
    const name = k.charAt(0).toUpperCase() + k.slice(1);
    notes.set(name, KEYWORDS[name] ?? '');
  }
  if (card.cost === 'X') notes.set('X', KEYWORDS.X!);
  walk(card.effects, (e) => {
    if (e.type === 'block') notes.set('Block', KEYWORDS.Block!);
    if (e.type === 'applyStatus' || e.type === 'removeStatus' || e.type === 'spend') {
      const s = content.statuses[e.status];
      if (s && s.kind !== 'power') notes.set(s.name, s.summary ?? s.description.replaceAll('{n}', 'X').replaceAll('{s}', 's'));
    }
    if (e.type === 'attack' || e.type === 'block') {
      const amt = e.amount;
      if (typeof amt === 'object' && typeof amt.of === 'object') {
        const s = content.statuses[amt.of.stacks];
        if (s) notes.set(s.name, s.summary ?? s.description);
      }
    }
  });
  if (def.type === 'power') notes.set('Power', KEYWORDS.Power!);
  return [...notes].map(([name, text]) => ({ name, text }));
}

/** Words to highlight in rules text. */
export function highlightTerms(content: Content): string[] {
  return [...Object.values(content.statuses).map((s) => s.name), 'Block', 'Energy', 'Exhaust', 'Ethereal', 'Retain', 'Innate', 'Unplayable', 'ALL', 'Overheat'];
}
