import React, { createContext, useContext } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/PatrickHand";

// Doodle style kit: hand-drawn ink on warm paper, wobbling lines (redrawn every 3 frames), handwritten labels.
export const hand = loadFont("normal", { weights: ["400"] }).fontFamily;
export const BG = "#FBF8F1";
export const INK = "#2B2A27";
export const YEL = "#F2C230";
export const GRN = "#6CC08B";
export const BLU = "#5AA9E6";
export const RED = "#E8584F";
export const PUR = "#9B6BD6";
export const AMB = "#FFB547";
export const AIG = "#8ECC9F";
export const PEN_BLU = "#2F6DB5";
export const PEN_RED = "#D0493F";
export const PEN_GRN = "#2E8B57";
export type P = [number, number];
// The pen: ink colour, body fills, wobble amplitude and how many frames each wobble holds. dj3 sets it for dark or paper.
export const PenCtx = createContext({ ink: INK, fill: "#FFFFFF", skin: "#E7E1D5", amp: 1.6, boil: 3 });

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const prog = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { ...CL, easing: Easing.inOut(Easing.cubic) });
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const pop = (f: number, at: number) => (f < at ? 0 : spring({ frame: f - at, fps: 30, config: { damping: 9, stiffness: 200, mass: 0.6 } }));
export const bob = (f: number, ph = 0) => Math.sin((f + ph) / 7) * 3;
export const at = (x: number, y: number, s: number, q: P) => `translate(${x + q[0] * s} ${y + q[1] * s}) scale(${s})`;

// Wobble: a deterministic jitter per point, changing every 3 frames (line boil).
const hash = (n: number) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};
const jit = (seed: number, i: number, b: number, axis: number, amp: number) => (hash(seed * 7.13 + i * 3.71 + b * 1.37 + axis * 0.5) - 0.5) * 2 * amp;

type InkProps = { pts: P[]; seed?: number; sw?: number; c?: string; fill?: string; closed?: boolean; smooth?: boolean; draw?: number; amp?: number; op?: number };
export const Ink: React.FC<InkProps> = ({ pts, seed = 1, sw = 5, c: c0, fill = "none", closed = false, smooth = true, draw = 1, amp: a0, op = 1 }) => {
  const pen = useContext(PenCtx);
  const c = c0 ?? pen.ink;
  const amp = a0 ?? pen.amp;
  const b = Math.floor(useCurrentFrame() / pen.boil);
  const q = pts.map(([x, y], i): P => [x + jit(seed, i, b, 0, amp), y + jit(seed, i, b, 1, amp)]);
  const n = q.length;
  const mid = (a: P, z: P): P => [(a[0] + z[0]) / 2, (a[1] + z[1]) / 2];
  const pt = (p: P) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  let d: string;
  if (!smooth || n < 3) d = q.map((p, i) => `${i ? "L" : "M"}${pt(p)}`).join(" ");
  else if (closed) d = `M${pt(mid(q[n - 1], q[0]))}` + q.map((p, i) => ` Q${pt(p)} ${pt(mid(p, q[(i + 1) % n]))}`).join("");
  else d = `M${pt(q[0])} L${pt(mid(q[0], q[1]))}` + q.slice(1, n - 1).map((p, i) => ` Q${pt(p)} ${pt(mid(p, q[i + 2]))}`).join("") + ` L${pt(q[n - 1])}`;
  if (closed) d += " Z";
  const dash = draw < 1 ? { strokeDasharray: "1 1", strokeDashoffset: 1 - draw } : {};
  return <path d={d} pathLength={1} fill={fill} stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" opacity={op} {...dash} />;
};

export const T: React.FC<{ x: number; y: number; s?: number; c?: string; a?: "start" | "middle" | "end"; r?: number; op?: number; children?: React.ReactNode }> = ({ x, y, s = 60, c, a = "middle", r = 0, op = 1, children }) => (
  <text x={x} y={y} fontFamily={hand} fontSize={s} fill={c ?? useContext(PenCtx).ink} textAnchor={a} opacity={op} transform={r ? `rotate(${r} ${x} ${y})` : undefined}>
    {children}
  </text>
);

export const Grp: React.FC<{ x?: number; y?: number; s?: number; r?: number; op?: number; children?: React.ReactNode }> = ({ x = 0, y = 0, s = 1, r = 0, op = 1, children }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} opacity={op}>{children}</g>
);

export const rrect = (cx: number, cy: number, w: number, h: number, r = 14): P[] => {
  const k = Math.min(r, w / 2, h / 2);
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  const arc = (ax: number, ay: number, a0: number, a1: number): P[] => [0, 1, 2, 3].map((j) => {
    const a = a0 + ((a1 - a0) * j) / 3;
    return [ax + k * Math.cos(a), ay + k * Math.sin(a)] as P;
  });
  return [...arc(x0 + k, y0 + k, Math.PI, 1.5 * Math.PI), ...arc(x1 - k, y0 + k, 1.5 * Math.PI, 2 * Math.PI), ...arc(x1 - k, y1 - k, 0, Math.PI / 2), ...arc(x0 + k, y1 - k, Math.PI / 2, Math.PI)];
};
export const arcPts = (cx: number, cy: number, r: number, a0: number, a1: number, n: number): P[] =>
  Array.from({ length: n }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / (n - 1);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as P;
  });

export const Rect: React.FC<{ cx: number; cy: number; w: number; h: number; r?: number; fill?: string; seed?: number; sw?: number; c?: string; op?: number; draw?: number }> = ({ cx, cy, w, h, r = 14, fill = "none", seed = 1, sw = 5, c, op = 1, draw = 1 }) => (
  <Ink pts={rrect(cx, cy, w, h, r)} closed smooth={false} fill={fill} seed={seed} sw={sw} c={c} op={op} draw={draw} />
);
export const Circ: React.FC<{ cx: number; cy: number; r: number; fill?: string; seed?: number; sw?: number; c?: string; op?: number; draw?: number }> = ({ cx, cy, r, fill = "none", seed = 1, sw = 5, c, op = 1, draw = 1 }) => (
  <Ink pts={arcPts(cx, cy, r, 0, 2 * Math.PI - 2 * Math.PI / 18, 18)} closed fill={fill} seed={seed} sw={sw} c={c} op={op} draw={draw} />
);

// Coloured token: a circle with its label (word or number) inside.
export const Tok: React.FC<{ cx: number; cy: number; r: number; fill: string; label: string; ls?: number; seed?: number; op?: number }> = ({ cx, cy, r, fill, label, ls = 44, seed = 1, op = 1 }) => (
  <g opacity={op}>
    <Circ cx={cx} cy={cy} r={r} fill={fill} seed={seed} />
    <T x={cx} y={cy + ls * 0.36} s={ls}>{label}</T>
  </g>
);
export const Chip: React.FC<{ cx: number; cy: number; w: number; h?: number; fill: string; label: string; ls?: number; seed?: number; op?: number }> = ({ cx, cy, w, h = 120, fill, label, ls = 56, seed = 1, op = 1 }) => (
  <g opacity={op}>
    <Rect cx={cx} cy={cy} w={w} h={h} r={16} fill={fill} seed={seed} />
    <T x={cx} y={cy + ls * 0.36} s={ls}>{label}</T>
  </g>
);

export const Arrow: React.FC<{ a: P; b: P; bend?: number; seed?: number; c?: string; sw?: number; draw?: number }> = ({ a, b, bend = 16, seed = 2, c = INK, sw = 5, draw = 1 }) => {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const m: P = [mx - (dy / L) * bend, my + (dx / L) * bend];
  const ang = Math.atan2(b[1] - m[1], b[0] - m[0]);
  const h1: P = [b[0] - 18 * Math.cos(ang - 0.5), b[1] - 18 * Math.sin(ang - 0.5)];
  const h2: P = [b[0] - 18 * Math.cos(ang + 0.5), b[1] - 18 * Math.sin(ang + 0.5)];
  return (
    <g>
      <Ink pts={[a, m, b]} seed={seed} sw={sw} c={c} draw={draw} />
      <Ink pts={[h1, b, h2]} smooth={false} seed={seed + 1} sw={sw} c={c} draw={draw} />
    </g>
  );
};

export const Bub: React.FC<{ cx: number; cy: number; w: number; h: number; tx: number; ty: number; s?: number; seed?: number; op?: number; children?: React.ReactNode }> = ({ cx, cy, w, h, tx, ty, s = 46, seed = 5, op = 1, children }) => {
  const { fill } = useContext(PenCtx);
  return (
  <g opacity={op}>
    <Rect cx={cx} cy={cy} w={w} h={h} r={18} fill={fill} seed={seed} sw={4} />
    <Ink pts={[[cx - w * 0.2, cy + h / 2 - 3], [tx, ty], [cx - w * 0.04, cy + h / 2 - 3]]} smooth={false} closed fill={fill} seed={seed + 1} sw={4} />
    <T x={cx} y={cy + s * 0.36} s={s}>{children}</T>
  </g>
  );
};

export const Burst: React.FC<{ cx: number; cy: number; r0?: number; r1?: number; n?: number; seed?: number; c?: string; draw?: number }> = ({ cx, cy, r0 = 80, r1 = 120, n = 8, seed = 3, c = INK, draw = 1 }) => (
  <g>
    {Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + 0.2;
      return <Ink key={i} pts={[[cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)], [cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)]]} smooth={false} sw={5} c={c} seed={seed + i} draw={draw} />;
    })}
  </g>
);

export const Mark: React.FC<{ x: number; y: number; s?: number; ok?: boolean; draw?: number; seed?: number }> = ({ x, y, s = 60, ok = false, draw = 1, seed = 9 }) =>
  ok ? (
    <Ink pts={[[x - s * 0.5, y], [x - s * 0.12, y + s * 0.4], [x + s * 0.5, y - s * 0.45]]} smooth={false} c={PEN_GRN} sw={10} draw={draw} seed={seed} />
  ) : (
    <g>
      <Ink pts={[[x - s * 0.4, y - s * 0.4], [x + s * 0.4, y + s * 0.4]]} smooth={false} c={PEN_RED} sw={10} draw={draw} seed={seed} />
      <Ink pts={[[x + s * 0.4, y - s * 0.4], [x - s * 0.4, y + s * 0.4]]} smooth={false} c={PEN_RED} sw={10} draw={Math.max(0, draw * 2 - 1)} seed={seed + 1} />
    </g>
  );

export const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: BG }}>
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }}>
      {children}
    </svg>
  </AbsoluteFill>
);

// ---- Mascots. Local units: feet at (0,0), y up is negative. Scale and place with x, y.
export type Pose = { hip: P; lean: number; hd: P; hl: P; hr: P; fl: P; fr: P };
export const STAND: Pose = { hip: [0, -200], lean: 0, hd: [0, -50], hl: [-70, -190], hr: [70, -190], fl: [-36, 0], fr: [36, 0] };
export const pz = (o: Partial<Pose> = {}): Pose => ({ ...STAND, ...o });
const rot = (v: P, deg: number): P => {
  const r = (deg * Math.PI) / 180;
  return [v[0] * Math.cos(r) - v[1] * Math.sin(r), v[0] * Math.sin(r) + v[1] * Math.cos(r)];
};
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
export const neck = (p: Pose): P => add(p.hip, rot([0, -118], p.lean));
export const headC = (p: Pose): P => add(neck(p), rot(p.hd, p.lean));
const shoulder = (p: Pose): P => add(neck(p), rot([0, 16], p.lean));
// Two-segment limb with a bent elbow, bend = offset of the elbow from the straight line.
const limb = (a: P, b: P, bend: number): P[] => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  return [a, [(a[0] + b[0]) / 2 - (dy / L) * bend, (a[1] + b[1]) / 2 + (dx / L) * bend], b];
};
const lp = (a: P, b: P, u: number): P => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
// Keyframed pose: track is [[localFrame, pose], ...], eased between keys.
export const kf = (f: number, track: [number, Pose][]): Pose => {
  if (f <= track[0][0]) return track[0][1];
  for (let i = 1; i < track.length; i++) {
    const [t1, p1] = track[i];
    if (f <= t1) {
      const [t0, p0] = track[i - 1];
      const u = prog(f, t0, t1);
      return { hip: lp(p0.hip, p1.hip, u), lean: lerp(p0.lean, p1.lean, u), hd: lp(p0.hd, p1.hd, u), hl: lp(p0.hl, p1.hl, u), hr: lp(p0.hr, p1.hr, u), fl: lp(p0.fl, p1.fl, u), fr: lp(p0.fr, p1.fr, u) };
    }
  }
  return track[track.length - 1][1];
};

const Limbs: React.FC<{ p: Pose; seed: number; sw: number }> = ({ p, seed, sw }) => {
  const sh = shoulder(p);
  return (
    <>
      <Ink pts={limb(p.hip, p.fl, -6)} seed={seed} sw={sw} />
      <Ink pts={limb(p.hip, p.fr, 6)} seed={seed + 1} sw={sw} />
      <Ink pts={limb(sh, p.hl, 12)} seed={seed + 2} sw={sw} />
      <Ink pts={limb(sh, p.hr, -12)} seed={seed + 3} sw={sw} />
    </>
  );
};

// The DJ: round head, white cap with the brim to the right, amber headphones. Optional record in the right hand.
export const Dj: React.FC<{ p: Pose; x: number; y: number; s?: number; rec?: boolean }> = ({ p, x, y, s = 1, rec = false }) => {
  const [h0, h1] = headC(p);
  const pen = useContext(PenCtx);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Limbs p={p} seed={21} sw={6} />
      <Ink pts={[p.hip, neck(p)]} seed={23} sw={7} />
      <Circ cx={h0} cy={h1} r={34} fill={pen.skin} seed={26} />
      <Ink pts={[...arcPts(h0, h1, 36, Math.PI, 2 * Math.PI, 7), [h0 + 60, h1 + 6], [h0 + 36, h1 + 10], [h0 - 30, h1 + 6], [h0 - 36, h1 + 2]]} smooth={false} closed fill="#FFFFFF" seed={27} sw={4} />
      <Ink pts={arcPts(h0, h1, 46, Math.PI, 2 * Math.PI, 9)} c={AMB} sw={9} seed={28} />
      <Rect cx={h0 - 47} cy={h1 + 12} w={14} h={30} r={5} fill={AMB} seed={29} sw={3} />
      <Rect cx={h0 + 47} cy={h1 + 12} w={14} h={30} r={5} fill={AMB} seed={30} sw={3} />
      {rec && (
        <g transform={`translate(${p.hr[0] + 22} ${p.hr[1] + 6})`}>
          <Circ cx={0} cy={0} r={30} fill={INK} seed={31} sw={3} />
          <Circ cx={0} cy={0} r={9} fill={AMB} seed={32} sw={2} />
        </g>
      )}
    </g>
  );
};

// The AI: square screen-head with an antenna dot, green headphones. `screen` draws on the screen (local units).
export const Ai: React.FC<{ p: Pose; x: number; y: number; s?: number; screen?: React.ReactNode }> = ({ p, x, y, s = 1, screen }) => {
  const n = neck(p), [h0, h1] = headC(p);
  const nx = rot([1, 0], p.lean);
  const side = (q: P, k: number): P => [q[0] + nx[0] * k, q[1] + nx[1] * k];
  const { fill } = useContext(PenCtx);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Limbs p={p} seed={41} sw={6} />
      <Ink pts={[side(p.hip, 26), side(n, 26), side(n, -26), side(p.hip, -26)]} smooth={false} closed fill={fill} seed={46} sw={5} />
      <Ink pts={limb(shoulder(p), p.hl, 8)} seed={42} sw={6} />
      <Ink pts={limb(shoulder(p), p.hr, -8)} seed={43} sw={6} />
      <Ink pts={[[h0, h1 - 42], [h0, h1 - 64]]} smooth={false} seed={44} sw={4} />
      <Circ cx={h0} cy={h1 - 70} r={9} fill={AIG} seed={45} sw={3} />
      <Ink pts={arcPts(h0, h1, 62, Math.PI, 2 * Math.PI, 9)} c={AIG} sw={9} seed={47} />
      <Rect cx={h0 - 64} cy={h1 + 14} w={14} h={36} r={5} fill={AIG} seed={48} sw={3} />
      <Rect cx={h0 + 64} cy={h1 + 14} w={14} h={36} r={5} fill={AIG} seed={49} sw={3} />
      <Rect cx={h0} cy={h1} w={100} h={84} r={16} fill={fill} seed={50} sw={5} />
      <Rect cx={h0} cy={h1} w={74} h={56} r={8} fill={fill} seed={51} sw={3} />
      <g transform={`translate(${h0} ${h1})`}>{screen}</g>
    </g>
  );
};
