// Shared parts for the 1031 "Monkey breeding" shots. Same look as en-neuron (black ground, flat stone shapes, DM Serif Display
// headers, DM Sans labels, calm eased motion); amber is the one thing the story follows (monkeys, money), crimson only for a bad turn.
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { INK, PAPER, STONE, STONE_D, Stage as NStage, sans, seg, snap } from "../en-neuron/kit";

export { INK, PAPER, MUTED, RED, STONE, STONE_D, LINE, Header, Pic, bez, seg, lerp, snap, mix, sans, serif } from "../en-neuron/kit";
loadSerif("italic", { weights: ["400"] }); // the highlighted word is DM Serif italic

// en-neuron's Stage, its y 164-1376 squeezed into y 300-1450: inside the feed's 4:5 crop (y 285-1635) and above the English subtitle (~1478)
export const Stage: React.FC<React.ComponentProps<typeof NStage>> = (props) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <AbsoluteFill style={{ transformOrigin: "540px 164px", transform: "translateY(136px) scale(0.95)" }}><NStage {...props} /></AbsoluteFill>
  </AbsoluteFill>
);

export const AMB = "#FFB547", AMB_D = "#B97A1F", AMB_L = "#FFD58A";
export const out3 = Easing.out(Easing.cubic);
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// text and cards: rise 28px and un-blur over `dur` frames, no overshoot
export const rise = (f: number, at: number, dur = 14): React.CSSProperties => {
  const p = seg(f, at, at + dur, out3);
  return { opacity: p, transform: `translateY(${28 * (1 - p)}px)`, filter: p < 1 ? `blur(${10 * (1 - p)}px)` : undefined };
};
export const W: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const f = useCurrentFrame();
  return <span style={{ display: "inline-block", ...rise(f, at, 10), ...style }}>{children}</span>;
};

// flat stone card with a darker lower rim; x,y = centre
export const Plate: React.FC<{ x: number; y: number; w: number; h: number; at: number; fill?: string; rim?: string; children?: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, w, h, at, fill = STONE, rim = STONE_D, children, style }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: 28, background: fill, boxShadow: `0 7px 0 ${rim}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", ...rise(f, at), ...style }}>{children}</div>
  );
};

// outlined pill chip, DM Sans uppercase; x,y = centre; snaps in
export const Chip: React.FC<{ x: number; y: number; at: number; children: React.ReactNode; fs?: number; radius?: number }> = ({ x, y, at, children, fs = 30, radius = 999 }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${snap(f, at)})`, background: "#000", border: `3px solid ${PAPER}`, borderRadius: radius, padding: "16px 36px", fontFamily: sans, fontWeight: 700, fontSize: fs, letterSpacing: 4, lineHeight: `${Math.round(fs * 1.25)}px`, color: PAPER, textTransform: "uppercase", textAlign: "center", whiteSpace: "pre" }}>{children}</div>
  );
};

// flat front-on monkey face, centre x,y, head radius r
export const Monkey: React.FC<{ x: number; y: number; r: number; face?: string; rim?: string; patch?: string; op?: number }> = ({ x, y, r, face = AMB, rim = AMB_D, patch = AMB_L, op = 1 }) => {
  if (op <= 0.01 || r <= 0.3) return null;
  const sh = Math.max(2, r * 0.12);
  const body = (c: string) => (
    <g fill={c}><circle cx={-r * 0.95} cy={r * 0.05} r={r * 0.4} /><circle cx={r * 0.95} cy={r * 0.05} r={r * 0.4} /><circle cx={0} cy={0} r={r} /></g>
  );
  return (
    <g opacity={op} transform={`translate(${x} ${y})`}>
      <g transform={`translate(0 ${sh})`}>{body(rim)}</g>
      {body(face)}
      <g fill={patch}><circle cx={-r * 0.95} cy={r * 0.05} r={r * 0.2} /><circle cx={r * 0.95} cy={r * 0.05} r={r * 0.2} /><ellipse cx={0} cy={r * 0.2} rx={r * 0.68} ry={r * 0.6} /></g>
      <g fill={INK}><circle cx={-r * 0.26} cy={0} r={r * 0.1} /><circle cx={r * 0.26} cy={0} r={r * 0.1} /><circle cx={-r * 0.09} cy={r * 0.34} r={r * 0.045} /><circle cx={r * 0.09} cy={r * 0.34} r={r * 0.045} /></g>
      <path d={`M${-r * 0.2},${r * 0.52} Q0,${r * 0.66} ${r * 0.2},${r * 0.52}`} stroke={INK} strokeWidth={r * 0.07} fill="none" strokeLinecap="round" />
    </g>
  );
};

// typed text: words come in on their cue frames, characters type across the gap to the next word
export type TW = { t: string; at: number; style?: React.CSSProperties };
export const Typed: React.FC<{ lines: TW[][]; style?: React.CSSProperties }> = ({ lines, style }) => {
  const f = useCurrentFrame();
  const all = lines.reduce<TW[]>((a, l) => a.concat(l), []);
  return (
    <div style={style}>
      {lines.map((l, li) => (
        <div key={li} style={{ whiteSpace: "nowrap" }}>
          {l.map((w, wi) => {
            const k = all.indexOf(w), next = all[k + 1], dur = next ? clamp(next.at - w.at, 2, 10) : 12;
            const n = f < w.at ? 0 : Math.min(w.t.length, Math.ceil(((f - w.at + 1) / dur) * w.t.length));
            return (
              <span key={wi} style={w.style}>
                {w.t.slice(0, n)}<span style={{ opacity: 0 }}>{w.t.slice(n)}</span>{wi < l.length - 1 ? " " : ""}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ---------- transparent overlays over the face cam ----------
// Black top fade (DESIGN: 85% -> 60% at 380px -> clear at 700px). `tail`: frames before the slot end when it fades out (0 = stays).
export const Veil: React.FC<{ n: number; tail?: number }> = ({ n, tail = 6 }) => {
  const f = useCurrentFrame();
  const v = Math.min(interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" }), tail ? 1 - seg(f, n - tail - 2, n - 1, (t) => t) : 1);
  return <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 700, opacity: v, background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0px, rgba(0,0,0,0.6) 380px, rgba(0,0,0,0) 700px)" }} />;
};
// a picture in the headroom: snaps in on `at`, uncropped, 20px corners; fades and drifts up over the last 6 frames before `n` unless tail is 0
export const FPic: React.FC<{ src: string; ratio: number; h?: number; x?: number; y?: number; at: number; n: number; tail?: number; inner?: (w: number, h: number) => React.CSSProperties }> = ({ src, ratio, h = 360, x = 540, y = 480, at, n, tail = 6, inner }) => {
  const f = useCurrentFrame(), w = Math.round(h * ratio);
  if (f < at) return null;
  const t = tail ? seg(f, n - tail, n, (u) => u) : 0;
  if (t >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: 20, overflow: "hidden", boxShadow: "0 12px 32px rgba(0,0,0,0.38)", opacity: 1 - t, transform: `translateY(${-24 * t}px) scale(${snap(f, at)})` }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", display: "block", ...(inner ? inner(w, h) : {}) }} />
    </div>
  );
};
