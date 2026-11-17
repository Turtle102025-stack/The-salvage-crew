import { TitleArt } from '../art/TitleArt';
import { BUILD_PHASE, GAME_VERSION } from '../../engine/version';
import './TitleScreen.css';

/** Build-plan progress, shown on the title screen until the real menu exists. */
const WORK_ORDER: { label: string; done: boolean }[] = [
  { label: 'Phase 1: Plan approved', done: true },
  { label: 'Phase 2: Dry dock (project setup)', done: true },
  { label: 'Phase 3: Test fight (combat engine)', done: false },
  { label: 'Phase 4: Battle screen & animations', done: false },
  { label: 'Phase 5: The run: map, rewards, shop, events', done: false },
  { label: 'Phase 6: Act 1 content, through the boss', done: false },
  { label: 'Phase 7: Balance simulator', done: false },
  { label: 'Phase 8: Acts 2 & 3, difficulty, sound, polish', done: false },
];

export function TitleScreen() {
  return (
    <main className="title-screen">
      <header className="title-header">
        <h1 className="title-logo">
          <span className="title-logo-small">The</span>
          Salvage Crew
        </h1>
        <div className="title-rule hazard-stripes" aria-hidden="true" />
        <p className="title-tagline">
          Claim #4471: the colony ship <em>Meridian</em>. Biggest wreck ever found.
          Hazard pay not included.
        </p>
      </header>

      <TitleArt />

      <section className="work-order" aria-labelledby="work-order-heading">
        <h2 id="work-order-heading">
          Work order <span className="work-order-status">In dry dock</span>
        </h2>
        <p className="work-order-note">
          The crew is still bolting the engine back on. Nothing to play yet: the
          first test fight ships in Phase 3.
        </p>
        <ul>
          {WORK_ORDER.map((item) => (
            <li key={item.label} className={item.done ? 'done' : undefined}>
              <span className="check" aria-hidden="true">
                {item.done ? '✓' : ''}
              </span>
              <span className="visually-hidden">{item.done ? 'Done: ' : 'To do: '}</span>
              {item.label}
            </li>
          ))}
        </ul>
      </section>

      <footer className="title-footer">
        v{GAME_VERSION} · {BUILD_PHASE}
      </footer>
    </main>
  );
}
