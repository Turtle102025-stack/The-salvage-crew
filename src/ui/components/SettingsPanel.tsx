import { ANIM_SPEED_LABELS, useSettings, type AnimSpeed } from '../settings';

const SPEEDS: AnimSpeed[] = [0.5, 1, 2, 0];

export function SettingsPanel() {
  const { settings, update } = useSettings();
  return (
    <div className="settings-panel">
      <fieldset>
        <legend>Animation speed</legend>
        <div className="seg">
          {SPEEDS.map((s) => (
            <button key={s} className={settings.animSpeed === s ? 'on' : ''} onClick={() => update({ animSpeed: s })} aria-pressed={settings.animSpeed === s}>
              {ANIM_SPEED_LABELS[s]}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Sound</legend>
        <div className="seg">
          <button className={settings.sound ? 'on' : ''} onClick={() => update({ sound: true })} aria-pressed={settings.sound}>
            On
          </button>
          <button className={!settings.sound ? 'on' : ''} onClick={() => update({ sound: false })} aria-pressed={!settings.sound}>
            Off
          </button>
        </div>
        <label className="volume">
          Volume
          <input type="range" min={0} max={1} step={0.05} value={settings.volume} onChange={(e) => update({ volume: Number(e.target.value) })} disabled={!settings.sound} />
        </label>
      </fieldset>
    </div>
  );
}
