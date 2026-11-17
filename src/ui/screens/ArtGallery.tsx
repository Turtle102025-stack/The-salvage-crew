/** Developer page (open the site with #gallery) showing every piece of art. */
import { CONTENT } from '../../content';
import { EnemyArt, type BodyPlan } from '../art/EnemyArt';
import { Glyph, GLYPHS } from '../art/glyphs';
import { PlayerArt } from '../art/PlayerArt';
import { ENEMY_ART } from '../art/specs';
import { CardView } from '../components/Card';

const BODIES: BodyPlan[] = ['mite', 'worm', 'drone', 'turret', 'scavenger', 'blob', 'crab', 'orb', 'construct', 'swarm', 'jelly', 'warden', 'hive', 'heart'];

export function ArtGallery() {
  return (
    <main style={{ padding: 16, display: 'grid', gap: 24 }}>
      <h1>Art gallery</h1>
      <section>
        <h2>Glyphs</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {Object.keys(GLYPHS).map((name) => (
            <figure key={name} style={{ margin: 0, textAlign: 'center', width: 64 }}>
              <Glyph name={name} size={48} />
              <figcaption style={{ fontSize: 11 }}>{name}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section>
        <h2>Enemies</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {Object.entries(ENEMY_ART).map(([id, spec]) => (
            <figure key={id} style={{ margin: 0, width: 160, textAlign: 'center' }}>
              <EnemyArt spec={spec} />
              <figcaption>{CONTENT.enemies[id]?.name ?? id}</figcaption>
            </figure>
          ))}
          {BODIES.map((body) => (
            <figure key={body} style={{ margin: 0, width: 160, textAlign: 'center' }}>
              <EnemyArt spec={{ body, main: '#5b6b8c', accent: '#2ec4b6', eye: '#f5a524', features: ['antenna', 'stripes'] }} />
              <figcaption>{body}</figcaption>
            </figure>
          ))}
          <figure style={{ margin: 0, width: 160, textAlign: 'center' }}>
            <PlayerArt />
            <figcaption>Juno</figcaption>
          </figure>
        </div>
      </section>
      <section>
        <h2>Cards</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
          {Object.keys(CONTENT.cards).flatMap((id) => [
            <CardView key={id} content={CONTENT} id={id} />,
            <CardView key={`${id}+`} content={CONTENT} id={id} upgraded />,
          ])}
        </div>
      </section>
    </main>
  );
}
