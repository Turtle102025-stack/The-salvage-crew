/**
 * Turns engine events into plain-English combat log lines. The Phase 4 battle
 * screen animates these same events; for now they're simply listed.
 */
import { resolveCard, type CombatEvent, type CombatState, type Content } from '../../engine';
import { creatureLabel } from './names';

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatEvent(content: Content, state: CombatState, event: CombatEvent): string | null {
  const who = (id: string | undefined) => creatureLabel(state, id);
  const cardName = (id: string) => {
    const def = content.cards[id];
    return def ? resolveCard(def, false).name : id;
  };
  const statusName = (id: string) => content.statuses[id]?.name ?? id;

  switch (event.type) {
    case 'combatStart':
      return 'The fight begins.';
    case 'turnStart':
      return event.who === 'player' ? `── Turn ${event.turn} ──` : null;
    case 'turnEnd':
      return event.who === 'player' ? '── Enemies act ──' : null;
    case 'shuffle':
      return `Shuffled ${event.count} cards from your discard pile into your draw pile.`;
    case 'handFull':
      return 'Your hand is full.';
    case 'playCard':
      return `You play ${cardName(event.card)}${event.target ? ` on ${who(event.target)}` : ''}.`;
    case 'cardMoved':
      return event.to === 'exhaust' ? `${cardName(event.card)} is exhausted.` : null;
    case 'cardCreated':
      return `${cardName(event.card)} is added to your ${event.to === 'draw' ? 'draw pile' : event.to}.`;
    case 'damage': {
      const blocked = event.blocked ? ` (${event.blocked} blocked)` : '';
      const target = who(event.target);
      const possessive = event.target === 'player' ? 'Your' : `${cap(target)}'s`;
      if (event.hpLost === 0 && event.blocked > 0) return `${possessive} Block absorbs ${event.blocked} damage.`;
      if (event.hpLost === 0) return `${cap(target)} ${event.target === 'player' ? 'take' : 'takes'} no damage.`;
      return `${cap(target)} ${event.target === 'player' ? 'take' : 'takes'} ${event.hpLost} damage${blocked}.`;
    }
    case 'hpLoss':
      return `${cap(who(event.target))} ${event.target === 'player' ? 'lose' : 'loses'} ${event.amount} HP.`;
    case 'heal':
      return `${cap(who(event.target))} ${event.target === 'player' ? 'heal' : 'heals'} ${event.amount} HP.`;
    case 'block':
      return `${cap(who(event.target))} ${event.target === 'player' ? 'gain' : 'gains'} ${event.amount} Block.`;
    case 'status': {
      const name = statusName(event.status);
      const subject = cap(who(event.target));
      const verb = event.target === 'player' ? 'gain' : 'gains';
      const loses = event.target === 'player' ? 'lose' : 'loses';
      if (event.delta > 0) return `${subject} ${verb} ${event.delta} ${name}${event.stacks !== event.delta ? ` (now ${event.stacks})` : ''}.`;
      if (event.stacks === 0) return `${subject} ${loses} all ${name}.`;
      return `${subject} ${loses} ${-event.delta} ${name} (now ${event.stacks}).`;
    }
    case 'trigger':
      if (event.source.kind === 'relic') return `${content.relics[event.source.id]?.name ?? event.source.id} activates.`;
      if (event.source.kind === 'status') {
        const def = content.statuses[event.source.id];
        if (def?.threshold) return `${(def.threshold.label ?? def.name).toUpperCase()}!`;
        if (def?.kind === 'power') return `${def.name} activates.`;
      }
      return null;
    case 'enemyMove':
      return `${cap(who(event.enemy))} uses ${event.name}.`;
    case 'death':
      return event.target === 'player' ? 'Juno goes down.' : `${cap(who(event.target))} is destroyed.`;
    case 'spawn':
      return `${event.creature.name} joins the fight!`;
    case 'cardUpgraded':
      return `${cardName(event.card)} is upgraded.`;
    case 'victory':
      return 'Victory! Claim secured.';
    case 'defeat':
      return 'Defeat. The crew will have to drag you home.';
    default:
      return null;
  }
}

export function formatEvents(content: Content, state: CombatState, events: CombatEvent[]): string[] {
  return events.map((e) => formatEvent(content, state, e)).filter((line): line is string => line !== null);
}
