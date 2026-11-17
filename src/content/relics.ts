/**
 * Relics ("Salvage" in game). Rarities: starter, common, uncommon, rare,
 * shop (only sold at the Trader) and boss (picked after a boss).
 */
import { defineRelics } from '../engine/defs';
import { apply, block, dealDamage, draw, energy, gain, loseHp, when } from '../engine/effects/builders';

export const RELICS = defineRelics({
  // --- Starter ------------------------------------------------------------------
  lucky_wrench: {
    name: 'Lucky Wrench',
    rarity: 'starter',
    character: 'rigger',
    hooks: [{ on: 'combatStart', effects: [gain('scrap', 2)] }],
    flavor: "Juno's first wrench. It has never once been lucky, but she isn't about to tell it that.",
  },

  // --- Common -------------------------------------------------------------------
  duct_tape: {
    name: 'Duct Tape Roll',
    rarity: 'common',
    character: 'neutral',
    hooks: [{ on: 'combatStart', effects: [block(6)] }],
    flavor: 'Fixes 90% of problems. The other 10% need more tape.',
  },
  mag_boots: {
    name: 'Mag-Lock Boots',
    rarity: 'common',
    character: 'neutral',
    hooks: [{ on: 'turnStart', effects: [block(2)] }],
    flavor: 'Keeps your feet on the deck and your lunch where it belongs.',
  },
  coffee_thermos: {
    name: 'Coffee Thermos',
    rarity: 'common',
    character: 'neutral',
    hooks: [],
    run: { healAfterCombat: 4 },
    description: 'After each fight, heal 4 HP.',
    flavor: 'Still warm. Nobody knows how. Nobody asks.',
  },
  union_card: {
    name: 'Union Card',
    rarity: 'common',
    character: 'neutral',
    hooks: [],
    run: { goldAfterCombat: 12 },
    description: 'After each fight, gain 12 Credits (hazard pay).',
    flavor: 'Solidarity, and a 12-Credit stipend per incident.',
  },
  hazard_vest: {
    name: 'Hi-Vis Hazard Vest',
    rarity: 'common',
    character: 'neutral',
    hooks: [],
    run: { maxHpOnPickup: 8 },
    description: 'Gain 8 max HP.',
    flavor: 'Bright orange, so they can find what is left of you.',
  },
  grease_gun: {
    name: 'Grease Gun',
    rarity: 'common',
    character: 'neutral',
    hooks: [{ on: 'combatStart', effects: [apply('vulnerable', 1, 'allEnemies')] }],
    flavor: 'Nothing keeps its footing on a deck this slick.',
  },
  welding_mask: {
    name: 'Welding Mask',
    rarity: 'common',
    character: 'rigger',
    hooks: [{ on: 'combatStart', effects: [gain('heat', 3)] }],
    flavor: 'Pre-heated for your convenience.',
  },

  // --- Uncommon -----------------------------------------------------------------
  tool_belt: {
    name: 'Pocketed Tool Belt',
    rarity: 'uncommon',
    character: 'neutral',
    hooks: [],
    run: { potionSlots: 1 },
    description: 'Gain 1 extra Canister slot.',
    flavor: 'Seventeen pockets. Fourteen contain gum wrappers.',
  },
  scrap_magnet: {
    name: 'Scrap Magnet',
    rarity: 'uncommon',
    character: 'rigger',
    hooks: [{ on: 'enemyDied', effects: [gain('scrap', 3)] }],
    flavor: 'What the enemy leaves behind is yours. That is just good salvage law.',
  },
  spare_fuse: {
    name: 'Spare Fuse',
    rarity: 'uncommon',
    character: 'neutral',
    hooks: [{ on: 'cardPlayed', if: { cardType: 'attack' }, every: 3, effects: [energy(1)] }],
    description: 'Every 3rd Attack you play in a fight gives you 1 Energy.',
    flavor: 'Rated for 30 amps. Asked to handle 300.',
  },
  coolant_loop: {
    name: 'Coolant Loop',
    rarity: 'uncommon',
    character: 'rigger',
    hooks: [{ on: 'turnEnd', effects: [when({ hasStatus: 'heat', atLeast: 5 }, [block(7)])] }],
    flavor: 'Turns waste heat into a nice, protective haze.',
  },
  crackling_radio: {
    name: 'Crackling Radio',
    rarity: 'uncommon',
    character: 'neutral',
    hooks: [],
    run: { cardChoices: 1 },
    description: 'Card rewards offer 1 more choice.',
    flavor: 'Picks up tips from other crews. Mostly bad ones.',
  },

  // --- Rare ---------------------------------------------------------------------
  drone_kit: {
    name: 'Drone Starter Kit',
    rarity: 'rare',
    character: 'rigger',
    hooks: [{ on: 'combatStart', effects: [gain('cutter_drone', 2)] }],
    description: 'At the start of each combat, deploy a Cutter Drone that deals 2 damage to a random enemy at the end of each of your turns.',
    flavor: 'Some assembly required. Most assembly, really.',
  },
  pocket_fusion: {
    name: 'Pocket Fusion Cell',
    rarity: 'rare',
    character: 'neutral',
    hooks: [{ on: 'combatStart', effects: [draw(2), energy(1)] }],
    description: 'At the start of each combat, draw 2 cards and gain 1 Energy.',
    flavor: 'Fits in a pocket. Do not keep it in a pocket.',
  },
  gravity_anchor: {
    name: 'Gravity Anchor',
    rarity: 'rare',
    character: 'neutral',
    hooks: [{ on: 'turnStart', every: 2, effects: [gain('strength', 1)] }],
    description: 'Every 2nd turn of a fight, gain 1 Strength.',
    flavor: 'Heavier every time you swing it.',
  },

  // --- Shop ---------------------------------------------------------------------
  traders_ledger: {
    name: "Trader's Ledger",
    rarity: 'shop',
    character: 'neutral',
    hooks: [],
    run: { shopDiscount: 0.2 },
    description: 'Everything at the Trader costs 20% less.',
    flavor: 'Someone else’s ledger. Their discounts are now your discounts.',
  },
  shrapnel_net: {
    name: 'Shrapnel Net',
    rarity: 'shop',
    character: 'neutral',
    hooks: [{ on: 'shuffle', effects: [dealDamage(5, 'allEnemies')] }],
    flavor: 'Every time the deck reshuffles, something explodes. Coincidence.',
  },

  // --- Boss (choose one after each boss) -----------------------------------------
  overclocked_reactor: {
    name: 'Overclocked Reactor',
    rarity: 'boss',
    character: 'neutral',
    hooks: [{ on: 'combatStart', effects: [loseHp(4)] }],
    run: { maxEnergy: 1 },
    description: 'Gain 1 Energy at the start of each turn. At the start of each combat, lose 4 HP.',
    flavor: 'Runs hot. Runs fast. Runs a small risk of ending the run.',
  },
  bigger_toolbox: {
    name: 'Bigger Toolbox',
    rarity: 'boss',
    character: 'neutral',
    hooks: [{ on: 'combatStart', effects: [gain('weak', 1)] }],
    run: { drawPerTurn: 1 },
    description: 'Draw 1 more card each turn. At the start of each combat, become Weak for 1 turn.',
    flavor: 'Holds more tools. Weighs more than you do.',
  },
  cracked_fusion_core: {
    name: 'Cracked Fusion Core',
    rarity: 'boss',
    character: 'rigger',
    hooks: [{ on: 'turnStart', effects: [gain('heat', 1)] }],
    run: { maxEnergy: 1 },
    description: 'Gain 1 Energy at the start of each turn. At the start of each turn, gain 1 Heat.',
    flavor: 'The crack is where the extra power comes from. Probably.',
  },
  salvage_license: {
    name: 'Salvage License',
    rarity: 'boss',
    character: 'neutral',
    hooks: [],
    run: { maxEnergy: 1, cardChoices: -1 },
    description: 'Gain 1 Energy at the start of each turn. Card rewards offer 1 fewer choice.',
    flavor: 'Fully legal. Fully restrictive.',
  },
});
