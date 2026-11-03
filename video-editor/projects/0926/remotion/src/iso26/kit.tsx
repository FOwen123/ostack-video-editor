// 1024 "LLM vs NCM" (CapCut draft 1026). The paper's diagrams rebuilt as solid blocks on an upright wall, seen square-on
// like the figures themselves (v2, the user: "show it vertically, not slanted"): x runs right, z runs up, every block's
// label sits on its front face. Figure 2 (word by word vs diffusion vs NCM's levels), Figure 3 (a translation, step 1 to
// 11) and Figure 4 (stage 1 tokenizer: encoder -> multiscale codes -> codebook; stage 2 transformer: one level at a time,
// then the decoder). Built on the 1022 dark kit (../iso23/kit).
import React from "react";
import { Easing } from "remotion";
import { DBox, RFace, Slot, proj, seg, sans, PAPER, MUTED, AMBER, GREEN } from "../iso23/kit";
import type { PoseKey, View } from "../iso23/kit";
import { mkView, poseAt, useV } from "../ara/AraIso-rot";
import { BODY, GREENT } from "../iso22/Board";

export * from "../iso23/kit";
export { SLOTS, cue } from "./cues";

export type Tone = { t: string; l: string; r: string };
export const PAPERT: Tone = { t: "#FEFCF9", l: "#E3DED5", r: "#B2ACA2" };
export const DARKT: Tone = { t: "#2a2826", l: "#1d1c1a", r: "#141312" };
// NCM's levels, coarse to fine, dark amber to pale like the paper's Figure 2 (k = 1 darkest)
export const LEVEL: Tone[] = [
  { t: "#E89A2C", l: "#D98E1F", r: "#9A6414" },
  { t: "#FFBE5C", l: "#FFB547", r: "#B57A22" },
  { t: "#FFD08A", l: "#FFC979", r: "#B88A48" },
  { t: "#FFE6BE", l: "#FFDDA8", r: "#B89A6A" },
];
export const WORDS = ["the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog"]; // the paper's Figure 2 sentence
export const COUNTS = [1, 2, 4, 9]; // codes per level; the last level has one code per word (k = K)

// smooth 0..1 between frames a and b (ease in-out), and an ease-out for entrances
export const sm = (f: number, a: number, b: number) => seg(f, a, b, Easing.inOut(Easing.cubic));
export const out = (f: number, a: number, b: number) => seg(f, a, b, Easing.out(Easing.cubic));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// the wall camera: square-on (yaw 0), a little from above so blocks show their depth. (cx, cz) lands at screen (540, sy).
export const WP = (zoom: number, cx: number, cz: number, sy = 960, pitch = 16) => ({ yaw: 0, pitch, zoom, cx, cy: 0, cz, sy });
export const at = (v: View, x: number, z: number, y = 0): [number, number] => proj(v, x, y, z);

// a full-screen shot over the voice: dark floor grid far below, camera keys, no drift
export const Shot: React.FC<{ frames: number; keys: PoseKey[]; scene: (f: number, v: View) => React.ReactNode; overlay?: (f: number, v: View) => React.ReactNode; inFade?: number }> = ({ frames, keys, scene, overlay, inFade = 0 }) => (
  <Slot frames={frames} keys={keys} driftAmp={0} inFade={inFade} outFade={3} endPush={0}
    scene={(f, v) => (<><WallGrid />{scene(f, v)}</>)}
    overlay={overlay ? (f) => overlay(f, viewAt(keys, f)) : undefined} />
);
export const viewAt = (keys: PoseKey[], f: number): View => mkView(poseAt(keys, f));

// a faint grid on the wall behind everything
const WallGrid: React.FC = () => {
  const v = useV();
  const ls: React.ReactNode[] = [];
  for (let x = -2400; x <= 2400; x += 120) { const a = proj(v, x, -30, -1600), b = proj(v, x, -30, 2000); ls.push(<line key={`x${x}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />); }
  for (let z = -1560; z <= 2000; z += 120) { const a = proj(v, -2400, -30, z), b = proj(v, 2400, -30, z); ls.push(<line key={`z${z}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />); }
  return <g stroke={PAPER} strokeOpacity={0.05} strokeWidth={1.4}>{ls}</g>;
};

// 0..1..0 dip around frame t: a block dips out and back in while its content swaps (a flip)
export const dip = (f: number, t: number, half = 5) => 1 - 0.9 * (1 - Math.abs(2 * sm(f, t - half, t + half) - 1));

// a soft round glow behind a point on the wall
export const WGlow: React.FC<{ x: number; z: number; r: number; op: number; color?: string }> = ({ x, z, r, op, color = AMBER }) => {
  const v = useV();
  if (op <= 0.01) return null;
  const [cx, cy] = proj(v, x, -40, z);
  return (
    <g opacity={op}>
      <defs>
        <radialGradient id={`wg${color.slice(1)}`}>
          <stop offset={0} stopColor={color} stopOpacity={0.55} />
          <stop offset={0.6} stopColor={color} stopOpacity={0.15} />
          <stop offset={1} stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r * v.Z} fill={`url(#wg${color.slice(1)})`} />
    </g>
  );
};

// an upright block on the wall: bottom-left corner (x, z), w wide, h tall, d deep; text on its front face.
// `u` 0..1 brings it in: it rises 40 units and fades up (no pop). `dashed` = an empty slot outline.
export const Block: React.FC<{ x: number; z: number; w: number; h: number; d?: number; y?: number; text?: string; fs?: number; tone?: Tone; ink?: string; u?: number; glow?: number; dashed?: boolean; weight?: number; font?: string }> = ({ x, z, w, h, d = 26, y = 0, text, fs = 26, tone = PAPERT, ink = "#141312", u = 1, glow = 0, dashed, weight = 700, font = sans }) => {
  if (u <= 0.001) return null;
  const dz = (1 - u) * 40;
  if (dashed) {
    return (
      <g opacity={u}>
        <DBox x={x} y={y} z={z - dz} w={w} d={d} h={h} tone={{ t: "#161514", l: "#121110", r: "#0e0d0c" }} top="#161514" stroke="#6f6a62" sw={1.6} />
        {text && <RFace x={x} fy={y + d} z={z - dz} h={h}><text x={w / 2} y={h / 2 + fs * 0.36} textAnchor="middle" fontFamily={font} fontWeight={weight} fontSize={fs} fill={MUTED}>{text}</text></RFace>}
      </g>
    );
  }
  return (
    <g opacity={Math.min(1, u * 1.4)}>
      {glow > 0 && <WGlow x={x + w / 2} z={z + h / 2} r={Math.min(240, Math.max(w, h) * 0.9)} op={glow} color={tone.t} />}
      <DBox x={x} y={y} z={z - dz} w={w} d={d} h={h} tone={{ t: tone.t, l: tone.l, r: tone.r }} top={tone.t} stroke="#000" sw={1.4} />
      {text && <RFace x={x} fy={y + d} z={z - dz} h={h}><text x={w / 2} y={h / 2 + fs * 0.36} textAnchor="middle" fontFamily={font} fontWeight={weight} fontSize={fs} fill={ink}>{text}</text></RFace>}
    </g>
  );
};

// a row of word blocks along x at height z; u(i) brings in word i
export const WordRow: React.FC<{ x0: number; z: number; words?: string[]; w?: number; step?: number; h?: number; fs?: number; u?: (i: number) => number; tone?: (i: number) => Tone; text?: (i: number) => string; dashed?: (i: number) => boolean; glow?: (i: number) => number }> = ({ x0, z, words = WORDS, w = 84, step = 92, h = 62, fs = 25, u = () => 1, tone = () => PAPERT, text, dashed = () => false, glow = () => 0 }) => (
  <>
    {words.map((word, i) => <Block key={i} x={x0 + i * step} z={z} w={w} h={h} fs={fs} text={text ? text(i) : word} u={u(i)} tone={tone(i)} dashed={dashed(i)} glow={glow(i)} ink={tone(i) === GREENT ? "#0f1a12" : "#141312"} />)}
  </>
);

// NCM's levels on the wall, top to bottom like the paper: level k's codes split the full width W, row k at zTop - k*gap.
// grow(k) 0..1 draws level k in from the left (one stroke over the row); lit(k) glows it; text(k, i) labels a code.
export const Levels: React.FC<{ x0: number; zTop: number; W: number; gap: number; h?: number; grow: (k: number) => number; lit?: (k: number) => number; text?: (k: number, i: number) => string; fs?: number; counts?: number[]; together?: boolean }> = ({ x0, zTop, W, gap, h = 56, grow, lit = () => 0, text, fs = 22, counts = COUNTS, together }) => (
  <>
    {counts.map((n, k) => {
      const g = grow(k);
      if (g <= 0) return null;
      const cw = W / n;
      return Array.from({ length: n }, (_, i) => {
        const u = together ? g : Math.max(0, Math.min(1, (g * n - i) * 1.6)); // left to right across the row, or all at once
        return <Block key={`${k}-${i}`} x={x0 + i * cw + 3} z={zTop - k * gap} w={cw - 6} h={h} text={text?.(k, i)} fs={Math.min(fs, cw * 0.32)} tone={LEVEL[k]} u={u} glow={lit(k) * 0.6} />;
      });
    })}
  </>
);
export const kText = (k: number) => `k = ${["1", "2", "3", "K"][k]}`;

// a flat shape on the wall (front face plus a darker back offset for depth): the paper's encoder/decoder trapezoids
export const WallShape: React.FC<{ pts: [number, number][]; fill?: string; side?: string; stroke?: string; d?: number; op?: number; children?: React.ReactNode }> = ({ pts, fill = "#24221f", side = "#121110", stroke = "#6f6a62", d = 26, op = 1 }) => {
  const v = useV();
  const back = pts.map(([x, z]) => proj(v, x, 0, z)), front = pts.map(([x, z]) => proj(v, x, d, z));
  const s = (p: [number, number][]) => p.map((q) => q.join(",")).join(" ");
  return (
    <g opacity={op} strokeLinejoin="round">
      <polygon points={s(back)} fill={side} stroke={stroke} strokeWidth={1.2} />
      {pts.map((_, i) => {
        const j = (i + 1) % pts.length;
        return <polygon key={i} points={s([back[i], back[j], front[j], front[i]])} fill={side} stroke="#000" strokeWidth={1} />;
      })}
      <polygon points={s(front)} fill={fill} stroke={stroke} strokeWidth={1.6} />
    </g>
  );
};

// a line on the wall's front plane, drawn from a to b as u goes 0..1
export const WLine: React.FC<{ a: [number, number]; b: [number, number]; u?: number; color?: string; w?: number; dash?: string; op?: number; arrow?: boolean }> = ({ a, b, u = 1, color = MUTED, w = 4, dash, op = 1, arrow }) => {
  const v = useV();
  if (u <= 0) return null;
  const p = proj(v, a[0], 30, a[1]), q0 = proj(v, b[0], 30, b[1]);
  const q: [number, number] = [p[0] + (q0[0] - p[0]) * u, p[1] + (q0[1] - p[1]) * u];
  const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
  return (
    <g opacity={op}>
      <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={color} strokeWidth={w} strokeDasharray={dash} strokeLinecap="round" />
      {arrow && u > 0.95 && <polygon points={`${q[0]},${q[1]} ${q[0] - 18 * Math.cos(ang - 0.45)},${q[1] - 18 * Math.sin(ang - 0.45)} ${q[0] - 18 * Math.cos(ang + 0.45)},${q[1] - 18 * Math.sin(ang + 0.45)}`} fill={color} />}
    </g>
  );
};

// a flat label at a wall point (screen space)
export const Label: React.FC<{ v: View; x: number; z: number; text: string; color?: string; size?: number; op?: number; dy?: number; align?: "center" | "left" | "right" }> = ({ v, x, z, text, color = PAPER, size = 28, op = 1, dy = 0, align = "center" }) => {
  if (op <= 0.01) return null;
  const [sx, sy] = proj(v, x, 30, z);
  const tx = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
  return <div style={{ position: "absolute", left: sx, top: sy + dy, transform: `translate(${tx}, -50%)`, opacity: op, fontFamily: sans, fontWeight: 800, fontSize: size, letterSpacing: 2, color, whiteSpace: "nowrap", textShadow: "0 2px 14px #000" }}>{text}</div>;
};

// a counter of steps as a grid of small blocks (64 for the word-by-word model, 11 for NCM); `on` = how many are lit
export const Pips: React.FC<{ x0: number; zTop: number; n: number; cols: number; s: number; on: number; tone: Tone }> = ({ x0, zTop, n, cols, s, on, tone }) => (
  <>
    {Array.from({ length: n }, (_, i) => {
      const u = Math.max(0, Math.min(1, on - i));
      const x = x0 + (i % cols) * (s + 8), z = zTop - Math.floor(i / cols) * (s + 8);
      return u > 0 ? <Block key={i} x={x} z={z} w={s} h={s} d={18} tone={tone} u={0.4 + 0.6 * u} /> : <Block key={i} x={x} z={z} w={s} h={s} d={8} dashed />;
    })}
  </>
);

export { BODY, GREENT, GREEN, MUTED, PAPER, AMBER };
