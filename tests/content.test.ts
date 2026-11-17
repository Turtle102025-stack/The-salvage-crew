/**
 * Checks every piece of content for mistakes the type checker can't catch:
 * missing upgrades, references to things that don't exist, broken AI tables.
 */
import { describe, expect, it } from 'vitest';
import { CONTENT } from '../src/content';
import { describeCard, describeRelic, resolveCard, type Effect } from '../src/engine';

function walk(effects: readonly Effect[], visit: (e: Effect) => void): void {
  for (const e of effects) {
    visit(e);
    if (e.type === 'spend' || e.type === 'if') {
      walk(e.then, visit);
      walk(e.else ?? [], visit);
    } else if (e.type === 'repeat') walk(e.effects, visit);
  }
}

/** Every status and card id an effect list refers to must exist. */
function checkRefs(effects: readonly Effect[], where: string): string[] {
  const problems: string[] = [];
  walk(effects, (e) => {
    if ((e.type === 'applyStatus' || e.type === 'removeStatus' || e.type === 'spend') && !CONTENT.statuses[e.status]) {
      problems.push(`${where}: unknown status "${e.status}"`);
    }
    if (e.type === 'addCard' && !CONTENT.cards[e.card]) problems.push(`${where}: unknown card "${e.card}"`);
    if (e.type === 'if' && 'hasStatus' in e.cond && !CONTENT.statuses[e.cond.hasStatus]) {
      problems.push(`${where}: unknown status "${e.cond.hasStatus}"`);
    }
  });
  return problems;
}

const ID = /^[a-z][a-z0-9_]*$/;

/** Starter-card names from well-known deckbuilders that we must not reuse. */
const RESERVED_NAMES = ['Strike', 'Defend', 'Bash', 'Neutralize', 'Survivor', 'Zap', 'Dualcast', 'Eruption', 'Vigilance'];

describe('cards', () => {
  for (const def of Object.values(CONTENT.cards)) {
    describe(def.name, () => {
      it('has a valid id and character', () => {
        expect(def.id).toMatch(ID);
        expect(CONTENT.characters[def.character] || def.character === 'neutral').toBeTruthy();
      });

      it('has an upgrade that actually changes something', () => {
        const base = resolveCard(def, false);
        const up = resolveCard(def, true);
        const changed =
          base.cost !== up.cost ||
          JSON.stringify(base.effects) !== JSON.stringify(up.effects) ||
          JSON.stringify(base.keywords) !== JSON.stringify(up.keywords) ||
          base.text !== up.text;
        expect(changed || def.type === 'status' || def.type === 'curse').toBe(true);
      });

      it('has readable text in both versions', () => {
        expect(describeCard(CONTENT, def, false).length).toBeGreaterThan(3);
        expect(describeCard(CONTENT, def, true).length).toBeGreaterThan(3);
      });

      it('only refers to things that exist', () => {
        expect([...checkRefs(def.effects, def.id), ...checkRefs(def.upgrade.effects ?? [], `${def.id}+`)]).toEqual([]);
      });

      it('does not reuse a famous starter-card name', () => {
        expect(RESERVED_NAMES).not.toContain(def.name);
      });
    });
  }
});

describe('statuses', () => {
  it('have ids matching their keys and descriptions', () => {
    for (const [key, def] of Object.entries(CONTENT.statuses)) {
      expect(def.id).toBe(key);
      expect(def.id).toMatch(ID);
      expect(def.description.length).toBeGreaterThan(5);
      for (const hook of def.hooks ?? []) expect(checkRefs(hook.effects, key)).toEqual([]);
      expect(checkRefs(def.threshold?.effects ?? [], key)).toEqual([]);
    }
  });
});

describe('relics', () => {
  it('only refer to things that exist and describe themselves', () => {
    for (const def of Object.values(CONTENT.relics)) {
      expect(def.id).toMatch(ID);
      for (const hook of def.hooks) expect(checkRefs(hook.effects, def.id)).toEqual([]);
      expect(describeRelic(CONTENT, def).length).toBeGreaterThan(5);
    }
  });
});

describe('enemies', () => {
  for (const def of Object.values(CONTENT.enemies)) {
    it(`${def.name} has a valid HP range, moves and AI`, () => {
      expect(def.id).toMatch(ID);
      expect(def.hp[0]).toBeGreaterThan(0);
      expect(def.hp[1]).toBeGreaterThanOrEqual(def.hp[0]);
      const moves = Object.keys(def.moves);
      const used = [
        ...(def.ai.opening ?? []),
        ...('cycle' in def.ai.then ? def.ai.then.cycle : Object.keys(def.ai.then.weights)),
      ];
      for (const m of used) expect(moves).toContain(m);
      for (const [id, move] of Object.entries(def.moves)) expect(checkRefs(move.effects, `${def.id}.${id}`)).toEqual([]);
      for (const s of Object.keys(def.startStatuses ?? {})) expect(CONTENT.statuses[s]).toBeDefined();
    });
  }
});

describe('characters', () => {
  it('have a valid starter deck and starter relic', () => {
    for (const def of Object.values(CONTENT.characters)) {
      expect(def.starterDeck.length).toBeGreaterThanOrEqual(10);
      for (const id of def.starterDeck) expect(CONTENT.cards[id]).toBeDefined();
      expect(CONTENT.relics[def.starterRelic]).toBeDefined();
    }
  });
});
