/**
 * Timing for battle animations: how long the screen pauses after each event
 * (at Normal speed). Divided by the animation-speed setting.
 */
import type { CombatEvent } from '../../engine';

export function eventDuration(e: CombatEvent): number {
  switch (e.type) {
    case 'playCard':
      return 200;
    case 'damage':
      return e.attack ? 300 : 260;
    case 'hpLoss':
      return 280;
    case 'heal':
      return 240;
    case 'block':
      return 170;
    case 'status':
      return 130;
    case 'enemyMove':
      return 360;
    case 'death':
      return 420;
    case 'draw':
      return 75;
    case 'shuffle':
      return 280;
    case 'trigger':
      return 200;
    case 'turnStart':
      return e.who === 'player' ? 420 : 60;
    case 'turnEnd':
      return e.who === 'player' ? 320 : 80;
    case 'cardMoved':
      return e.to === 'exhaust' ? 180 : 25;
    case 'cardCreated':
      return 120;
    case 'spawn':
      return 420;
    case 'cardUpgraded':
      return 90;
    case 'victory':
    case 'defeat':
      return 600;
    default:
      return 0;
  }
}
