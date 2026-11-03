import React from "react";
import { loadFont as loadSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadSans } from "@remotion/google-fonts/DMSans";
import { AbsoluteFill, Audio, Easing, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// Isometric toy-diorama kit (from the 1010 Naval variant B): world is x/y on the floor plus z up,
// P() projects it to the screen.
export const C = {
  black: "#000000",
  paper: "#FEFCF9",
  muted: "#C4BCB0",
  hl: "#8ECC9F", // the winning / owned element only
  line: "rgba(254,252,249,0.16)",
};
export const serif = loadSerif("normal", { weights: ["400"] }).fontFamily;
export const sans = loadSans("normal", { weights: ["400", "500", "600", "700"] }).fontFamily;
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const FPS = 30;

export type Tone = { t: string; l: string; r: string; g: string };
export const PAPER: Tone = { t: "#FEFCF9", l: "#C4BCB0", r: "#8F8A82", g: "gPaper" };
export const STONE: Tone = { t: "#C4BCB0", l: "#948F86", r: "#625E57", g: "gStone" };
export const MID: Tone = { t: "#8F8A82", l: "#6B675F", r: "#46433E", g: "gMid" };
export const INK: Tone = { t: "#4A4742", l: "#2E2C29", r: "#1C1B19", g: "gInk" };
export const PAD: Tone = { t: "#45423D", l: "#32302C", r: "#232220", g: "gPad" };
export const GREEN: Tone = { t: "#8ECC9F", l: "#6BAA7D", r: "#4B8560", g: "gGreen" };
export const TONES = [PAPER, STONE, MID, INK, PAD, GREEN];

export type V = [number, number, number];
export const K = 0.866;
export const P = (x: number, y: number, z = 0): [number, number] => [(x - y) * K, (x + y) / 2 - z];
export const pt = (v: V) => P(v[0], v[1], v[2]).map((n) => n.toFixed(1)).join(",");

export const seg = (f: number, a: number, b: number, easing: (t: number) => number = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing });
export const lin = (f: number, a: number, b: number) => seg(f, a, b, Easing.linear);
export const arc = (b: number, len: number, peak: number) => (b <= 0 || b >= len ? 0 : peak * 4 * (b / len) * (1 - b / len));
export const sp = (f: number, at: number, damping = 12, stiffness = 160) => spring({ frame: f - at, fps: FPS, config: { damping, stiffness } });
export const lerpV = (a: V, b: V, u: number): V => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
// A hop from a to b between frames t0 and t1, with a small bounce on landing.
export const hopTo = (f: number, t0: number, t1: number, a: V, b: V, peak = 70): V => {
  const u = lin(f, t0, t1);
  const p = lerpV(a, b, u);
  return [p[0], p[1], p[2] + peak * 4 * u * (1 - u) + arc(f - t1, 8, 9)];
};

// ------------------------------------------------------------------ shapes

export const Poly: React.FC<{ p: V[]; fill: string; op?: number }> = ({ p, fill, op = 1 }) => (
  <polygon points={p.map(pt).join(" ")} fill={fill} opacity={op} stroke={C.black} strokeWidth={2} strokeLinejoin="round" />
);

export const Box: React.FC<{ x: number; y: number; z?: number; w: number; d: number; h: number; tone?: Tone; topFill?: string }> = ({ x, y, z = 0, w, d, h, tone = PAPER, topFill }) => (
  <g>
    <Poly p={[[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]]} fill={tone.l} />
    <Poly p={[[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]]} fill={tone.r} />
    <Poly p={[[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]} fill={topFill ?? tone.t} />
  </g>
);

export const Disc: React.FC<{ x: number; y: number; z?: number; r: number; t?: number; tone?: Tone; fill?: string; stroke?: string; sw?: number; op?: number }> = ({
  x, y, z = 0, r, t = 8, tone = PAPER, fill, stroke, sw = 0, op = 1,
}) => {
  const [cx, cy] = P(x, y, z);
  const rx = r * 1.2247;
  const ry = r * 0.7071;
  return (
    <g opacity={op}>
      <path d={`M${cx - rx} ${cy} L${cx - rx} ${cy + t} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy + t} L${cx + rx} ${cy} A${rx} ${ry} 0 0 1 ${cx - rx} ${cy} Z`} fill={`url(#${tone.g})`} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill ?? tone.t} stroke={stroke} strokeWidth={sw} />
    </g>
  );
};

export const Coin: React.FC<{ x: number; y: number; z?: number; r?: number; ring?: string }> = ({ x, y, z = 0, r = 24, ring = C.hl }) => {
  const [cx, cy] = P(x, y, z);
  return (
    <g>
      <Disc x={x} y={y} z={z} r={r} t={8} />
      <ellipse cx={cx} cy={cy} rx={r * 1.2247 * 0.62} ry={r * 0.7071 * 0.62} fill="none" stroke={ring} strokeWidth={3} />
    </g>
  );
};

// A bell-shaped person: base on the ground at (x,y,z).
export const Pawn: React.FC<{ x: number; y: number; z?: number; s?: number; tone?: Tone; rot?: number; sleep?: boolean; sq?: number }> = ({
  x, y, z = 0, s = 1, tone = PAPER, rot = 0, sleep, sq = 0,
}) => {
  const [bx, by] = P(x, y, z);
  return (
    <g transform={`translate(${bx} ${by}) rotate(${rot}) scale(${s * (1 + sq * 0.5)} ${s * (1 - sq)})`}>
      <ellipse cx={0} cy={0} rx={28} ry={14} fill={tone.r} />
      <path d="M-26 0 C-26 -12 -12 -22 -9 -56 L9 -56 C12 -22 26 -12 26 0 Z" fill={tone.t} stroke={C.black} strokeWidth={2} />
      <path d="M2 -56 L9 -56 C12 -22 26 -12 26 0 L6 0 C12 -14 4 -30 2 -56 Z" fill={tone.l} />
      <circle cx={0} cy={-76} r={23} fill={tone.l} stroke={C.black} strokeWidth={2} />
      <circle cx={-4} cy={-79} r={19} fill={tone.t} />
      {sleep ? (
        <g stroke={C.black} strokeWidth={3} strokeLinecap="round" fill="none">
          <path d="M-14 -78 q4 4 8 0" />
          <path d="M4 -78 q4 4 8 0" />
        </g>
      ) : (
        <g fill={C.black}>
          <circle cx={-9} cy={-79} r={3} />
          <circle cx={7} cy={-79} r={3} />
        </g>
      )}
    </g>
  );
};

// House with a gable roof (ridge along y). Roof colour is a prop so it can turn green.
export const House: React.FC<{ x: number; y: number; z?: number; w?: number; d?: number; h?: number; tone?: Tone; roof?: Tone; lit?: boolean }> = ({
  x, y, z = 0, w = 130, d = 130, h = 100, tone = PAPER, roof = INK, lit,
}) => {
  const rh = w * 0.62;
  const zr = z + h + rh;
  const win = lit ? C.hl : C.black;
  return (
    <g>
      <Poly p={[[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]]} fill={tone.l} />
      <Poly p={[[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]]} fill={tone.r} />
      <Poly p={[[x + w * 0.36, y + d, z], [x + w * 0.64, y + d, z], [x + w * 0.64, y + d, z + h * 0.58], [x + w * 0.36, y + d, z + h * 0.58]]} fill={C.black} op={0.75} />
      <Poly p={[[x + w, y + d * 0.2, z + h * 0.4], [x + w, y + d * 0.5, z + h * 0.4], [x + w, y + d * 0.5, z + h * 0.72], [x + w, y + d * 0.2, z + h * 0.72]]} fill={win} op={lit ? 1 : 0.75} />
      <Poly p={[[x, y + d, z + h], [x + w, y + d, z + h], [x + w / 2, y + d, zr]]} fill={tone.l} />
      <Poly p={[[x + w / 2, y - 6, zr], [x + w / 2, y + d + 6, zr], [x + w + 8, y + d + 6, z + h - 4], [x + w + 8, y - 6, z + h - 4]]} fill={roof.l} />
      <Poly p={[[x - 8, y + d + 6, z + h - 4], [x + w / 2, y + d + 6, zr], [x + w + 8, y + d + 6, z + h - 4]]} fill={roof.t} op={0} />
    </g>
  );
};

// Gear drawn flat on a wall that faces +y (the "left" iso face). Local coords are the wall's.
export const gearPath = (n: number, R: number, depth: number) => {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const q = (Math.PI * 2) / n;
    [[-0.28, R - depth], [-0.16, R], [0.16, R], [0.28, R - depth]].forEach(([k, r]) => {
      pts.push(`${(Math.cos(a + k * q) * r).toFixed(1)},${(Math.sin(a + k * q) * r).toFixed(1)}`);
    });
  }
  return `M${pts.join("L")}Z`;
};

export const Gem: React.FC<{ s?: number; spin?: number }> = ({ s = 1, spin = 0 }) => {
  const sx = 0.78 + 0.22 * Math.cos(spin);
  return (
    <g transform={`scale(${s * sx} ${s})`} stroke={C.black} strokeWidth={2} strokeLinejoin="round">
      <path d="M-62 -30 L-34 -72 L-6 -30Z" fill={GREEN.t} />
      <path d="M-34 -72 L34 -72 L6 -30 L-6 -30Z" fill="#B5E0C1" />
      <path d="M34 -72 L62 -30 L6 -30Z" fill={GREEN.l} />
      <path d="M-62 -30 L-6 -30 L0 46Z" fill={GREEN.l} />
      <path d="M-6 -30 L6 -30 L0 46Z" fill={GREEN.t} />
      <path d="M6 -30 L62 -30 L0 46Z" fill={GREEN.r} />
    </g>
  );
};

export const Tag: React.FC<{ x: number; y: number; z: number; at: number; out?: number; text: string; fill?: string; ink?: string; size?: number }> = ({
  x, y, z, at, out, text, fill = C.paper, ink = C.black, size = 44,
}) => {
  const f = useCurrentFrame();
  if (f < at || (out !== undefined && f > out)) return null;
  const p = sp(f, at, 11, 200);
  const q = out !== undefined ? lin(f, out - 8, out) : 0;
  const [px, py] = P(x, y, z);
  const w = text.length * size * 0.66 + size * 1.1;
  const h = size * 1.5;
  return (
    <g transform={`translate(${px} ${py - Math.sin(f / 9) * 5}) scale(${Math.max(0, p) * (1 - q)})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={fill} />
      <text textAnchor="middle" dominantBaseline="central" y={2} fontFamily={sans} fontWeight={700} fontSize={size} fill={ink} letterSpacing={2}>
        {text}
      </text>
    </g>
  );
};

// ---------------------------------------------------------------- physics

// Falls from h above, hits the ground, bounces twice, squashes on impact.
// Lifts away again (like a crane) when `out` is set. Children use absolute world coords.
export const Drop: React.FC<{ at: number; x: number; y: number; w?: number; d?: number; h?: number; out?: number; shadow?: boolean; children: React.ReactNode }> = ({
  at, x, y, w = 100, d = 100, h = 380, out, shadow = true, children,
}) => {
  const f = useCurrentFrame();
  const t = f - at;
  if (t < 0 || (out !== undefined && f > out + 14)) return null;
  const T = 10;
  let z = 0;
  let sq = 0;
  if (t < T) z = h * (1 - (t / T) ** 2);
  else {
    const b = t - T;
    z = b < 8 ? arc(b, 8, 24) : arc(b - 8, 5, 7);
    sq = b < 4 ? 0.09 * (1 - b / 4) : 0;
  }
  let op = Math.min(1, t / 2);
  if (out !== undefined && f > out) {
    const u = lin(f, out, out + 14);
    z += 320 * u * u;
    op *= 1 - u;
    sq = 0;
  }
  const [ax, ay] = P(x + w / 2, y + d / 2, 0);
  const sh = shadow ? 0.16 * (1 - Math.min(1, z / h)) * (1 - lin(t, T, T + 13)) : 0;
  return (
    <g opacity={op}>
      {sh > 0 && <Poly p={[[x, y, 0], [x + w, y, 0], [x + w, y + d, 0], [x, y + d, 0]]} fill={C.paper} op={sh} />}
      <g transform={`translate(${ax} ${ay - z}) scale(${1 + sq * 0.5} ${1 - sq}) translate(${-ax} ${-ay})`}>{children}</g>
    </g>
  );
};

// ------------------------------------------------------------------- stage

// `overlay` is HTML over the diorama (titles, logos as <Img>); `cy` moves the camera centre down the frame.
export const Stage: React.FC<{ fx: number; fy: number; s: number; audio?: React.ReactNode; overlay?: React.ReactNode; cy?: number; children: React.ReactNode }> = ({ fx, fy, s, audio, overlay, cy = 800, children }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const op = Math.min(interpolate(f, [0, 5], [0, 1], clamp), interpolate(f, [durationInFrames - 6, durationInFrames], [1, 0], clamp));
  const cam = `translate(540 ${cy}) scale(${s}) translate(${-fx} ${-fy})`;
  return (
    <AbsoluteFill style={{ background: C.black, opacity: op, fontFamily: sans }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <pattern id="grid" patternUnits="userSpaceOnUse" width={173.2} height={100} patternTransform="translate(0 -50)">
            <path d="M0 50 L86.6 0 L173.2 50 L86.6 100 Z" fill="none" stroke="rgba(254,252,249,0.09)" strokeWidth={1.5} />
          </pattern>
          <radialGradient id="vig" gradientUnits="userSpaceOnUse" cx={0} cy={0} r={1} gradientTransform="translate(540 760) scale(640 720)">
            <stop offset="0.5" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={1} />
          </radialGradient>
          {TONES.map((t) => (
            <linearGradient key={t.g} id={t.g} x1={0} x2={1} y1={0} y2={0}>
              <stop offset={0} stopColor={t.l} />
              <stop offset={1} stopColor={t.r} />
            </linearGradient>
          ))}
        </defs>
        <g transform={cam}>
          <rect x={-5000} y={-5000} width={10000} height={10000} fill="url(#grid)" />
        </g>
        <rect width={1080} height={1920} fill="url(#vig)" />
        <g transform={cam}>{children}</g>
      </svg>
      {overlay}
      {audio}
    </AbsoluteFill>
  );
};

export const Ka: React.FC<{ at: number }> = ({ at }) => (
  <Sequence from={at} durationInFrames={45}>
    <Audio src={staticFile("naval/sfx/kaching.wav")} volume={0.35} />
  </Sequence>
);
export const Whoosh: React.FC<{ at: number }> = ({ at }) => (
  <Sequence from={at} durationInFrames={14}>
    <Audio src={staticFile("naval/sfx/whoosh.wav")} volume={0.3} />
  </Sequence>
);
