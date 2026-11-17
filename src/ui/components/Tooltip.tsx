/**
 * Tooltips that work everywhere: mouse hover (after a short delay), keyboard
 * focus, and long-press on touch screens (tap anywhere to close).
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Tooltip.css';

const HOVER_DELAY = 180;
const LONG_PRESS = 450;

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  /** Preferred side; flips automatically if there's no room. */
  side?: 'top' | 'bottom' | 'right' | 'left';
  /** Wider panel for rich content (cards, keyword lists). */
  wide?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Tooltip({ content, children, side = 'top', wide, disabled, className }: TooltipProps) {
  const anchor = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const pressed = useRef(false);
  const downAt = useRef<{ x: number; y: number } | null>(null);

  const clear = () => window.clearTimeout(timer.current);
  const show = useCallback(() => !disabled && setOpen(true), [disabled]);
  const hide = useCallback(() => {
    clear();
    setOpen(false);
    setPos(null);
  }, []);

  useLayoutEffect(() => {
    if (!open || !anchor.current || !tip.current) return;
    const a = anchor.current.getBoundingClientRect();
    const t = tip.current.getBoundingClientRect();
    const gap = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const place = (s: string) => {
      switch (s) {
        case 'top':
          return { left: a.left + a.width / 2 - t.width / 2, top: a.top - t.height - gap };
        case 'bottom':
          return { left: a.left + a.width / 2 - t.width / 2, top: a.bottom + gap };
        case 'right':
          return { left: a.right + gap, top: a.top + a.height / 2 - t.height / 2 };
        default:
          return { left: a.left - t.width - gap, top: a.top + a.height / 2 - t.height / 2 };
      }
    };
    const fits = (p: { left: number; top: number }) => p.left >= 4 && p.top >= 4 && p.left + t.width <= vw - 4 && p.top + t.height <= vh - 4;
    const order = [side, side === 'top' ? 'bottom' : side === 'bottom' ? 'top' : side === 'left' ? 'right' : 'left', 'top', 'bottom', 'right', 'left'];
    let p = place(side);
    for (const s of order) {
      const candidate = place(s);
      if (fits(candidate)) {
        p = candidate;
        break;
      }
    }
    setPos({ left: Math.max(4, Math.min(p.left, vw - t.width - 4)), top: Math.max(4, Math.min(p.top, vh - t.height - 4)) });
  }, [open, side, content]);

  // Close on any outside tap/scroll once opened by touch.
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (anchor.current?.contains(e.target as Node)) return;
      hide();
    };
    window.addEventListener('pointerdown', close, true);
    window.addEventListener('scroll', hide, true);
    return () => {
      window.removeEventListener('pointerdown', close, true);
      window.removeEventListener('scroll', hide, true);
    };
  }, [open, hide]);

  useEffect(() => () => clear(), []);
  useEffect(() => {
    if (disabled) hide();
  }, [disabled, hide]);

  return (
    <span
      ref={anchor}
      className={`tt-anchor${className ? ` ${className}` : ''}`}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return;
        clear();
        timer.current = window.setTimeout(show, HOVER_DELAY);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') hide();
      }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return;
        pressed.current = false;
        downAt.current = { x: e.clientX, y: e.clientY };
        clear();
        timer.current = window.setTimeout(() => {
          pressed.current = true;
          show();
        }, LONG_PRESS);
      }}
      onPointerMove={(e) => {
        // A finger that moves is dragging, not long-pressing.
        const d = downAt.current;
        if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) {
          clear();
          downAt.current = null;
        }
      }}
      onPointerUp={() => clear()}
      onPointerCancel={() => clear()}
      onClickCapture={(e) => {
        // A long-press that opened the tooltip shouldn't also count as a tap.
        if (pressed.current) {
          e.stopPropagation();
          e.preventDefault();
          pressed.current = false;
        }
      }}
      onContextMenu={(e) => {
        if (open) e.preventDefault();
      }}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open &&
        createPortal(
          <div
            ref={tip}
            role="tooltip"
            className={`tt${wide ? ' tt-wide' : ''}`}
            style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  );
}

/** Standard tooltip body: a title and some lines of text. */
export function TipBody({ title, children, accent }: { title: ReactNode; children?: ReactNode; accent?: string }) {
  return (
    <div className="tt-body">
      <div className="tt-title" style={accent ? { color: accent } : undefined}>
        {title}
      </div>
      {children && <div className="tt-text">{children}</div>}
    </div>
  );
}
