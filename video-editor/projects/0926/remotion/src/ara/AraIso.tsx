import React from "react";
import { Easing, useCurrentFrame } from "remotion";
import { Box, C, INK, K, MID, P, PAD, Stage, STONE, Tag, lin, sans, seg, serif } from "../iso";
import { CUES } from "./cues";

// Isometric diorama: the sealed network is a glass-railed tray, devices are upright slabs with a port at the
// base, and the chip centipede crawls out of one port, walks a floor track and enters the next one head first.
// World = x/y floor + z up; P() projects.

export const AMBER = "#FFB547";
export const HOT = "#FFF1CF";
export const RED = "#E5484D";

// ------------------------------------------------------------------ layout
const PXs = 130;
const PYs = 280;
const W = 90;
const D = 18;
const H = 116;
const BX = (i: number) => (i % 4) * PXs;
const BY = (i: number) => Math.floor(i / 4) * PYs;
const X0 = (i: number) => BX(i) + 20;
const FACE_Y = (i: number) => BY(i) + 14 + D;
const YE = 492; // tray inner end (y)
const XE = 580; // tray inner end (x)
const SERVER_Y = 90; // plane of the server's front face
const SERVER_X = -260;
const ORDER = [0, 1, 2, 3, 4, 5, 6, 7].sort((a, b) => BX(a) + BY(a) - BX(b) - BY(b));

// ------------------------------------------------------------------- paths
export type Path = { pts: [number, number][]; cum: number[]; L: number };
export const mkPath = (v: [number, number][], r = 20): Path => {
  const out: [number, number][] = [v[0]];
  for (let i = 1; i < v.length - 1; i++) {
    const p = v[i];
    const a = v[i - 1];
    const b = v[i + 1];
    const la = Math.hypot(p[0] - a[0], p[1] - a[1]);
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const rr = Math.min(r, la / 2, lb / 2);
    const p0: [number, number] = [p[0] + ((a[0] - p[0]) / la) * rr, p[1] + ((a[1] - p[1]) / la) * rr];
    const p1: [number, number] = [p[0] + ((b[0] - p[0]) / lb) * rr, p[1] + ((b[1] - p[1]) / lb) * rr];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      out.push([(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p[0] + t * t * p1[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p[1] + t * t * p1[1]]);
    }
  }
  out.push(v[v.length - 1]);
  const cum = [0];
  for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
  return { pts: out, cum, L: cum[cum.length - 1] };
};
// position and heading at arc length s; before the start and after the end the path continues straight (into the slab)
export const at = (p: Path, s: number): { x: number; y: number; ang: number } => {
  const n = p.pts.length;
  let i = 1;
  if (s <= 0) i = 1;
  else if (s >= p.L) i = n - 1;
  else while (p.cum[i] < s) i++;
  const a = p.pts[i - 1];
  const b = p.pts[i];
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const dx = (b[0] - a[0]) / d;
  const dy = (b[1] - a[1]) / d;
  const o = s - p.cum[i - 1];
  return { x: a[0] + dx * o, y: a[1] + dy * o, ang: Math.atan2(dy, dx) };
};
export const sub = (p: Path, s: number) => {
  const out: string[] = [];
  for (let i = 0; i < p.pts.length && p.cum[i] <= s; i++) out.push(sc(p.pts[i][0], p.pts[i][1], 2.2));
  const q = at(p, Math.min(s, p.L));
  out.push(sc(q.x, q.y, 2.2));
  return out.join(" ");
};

// ---------------------------------------------------------------- schedule
const mouth = (i: number): [number, number] => (i < 0 ? [SERVER_X, SERVER_Y] : [BX(i) + 65, FACE_Y(i)]);
const plane = (i: number) => (i < 0 ? SERVER_Y : FACE_Y(i));
const route = (a: number, b: number): [number, number][] => {
  if (a < 0) return [[SERVER_X, SERVER_Y], [SERVER_X, 130], [65, 130], [65, FACE_Y(0)]];
  const A = mouth(a);
  const B = mouth(b);
  if (BY(a) === BY(b)) {
    const y = BY(a) + 70;
    return [A, [A[0], y], [B[0], y], B];
  }
  const cx = BX(a) + 124;
  const y1 = BY(b) + 80;
  return [A, [A[0], BY(a) + 70], [cx, BY(a) + 70], [cx, y1], [B[0], y1], B];
};

export const SP = 28; // chip spacing
export const HEAD = 34;
export const CHIP = 24;
const N = 6;
export const BODY = 30 + (N - 2) * SP; // head centre to last chip centre

type Hop = { from: number; to: number; t0: number; t1: number; find: number; getIn: number; path: Path; travel: number; tIn: number };
const hOf = (h: { t0: number; t1: number; travel: number }, f: number) => {
  const u = Math.min(1, Math.max(0, (f - h.t0) / (h.t1 - h.t0)));
  const m = 0.5 * u + 0.5 * Easing.inOut(Easing.quad)(u);
  return -18 + (h.travel + 18) * m;
};
const mk = (from: number, to: number, t0: number, t1: number, find: number, getIn: number): Hop => {
  const path = mkPath(route(from, to));
  const travel = path.L + BODY + 22;
  const h: Hop = { from, to, t0, t1, find, getIn, path, travel, tIn: t1 };
  for (let f = t0; f <= t1; f += 0.5) {
    if (hOf(h, f) >= path.L) {
      h.tIn = f;
      break;
    }
  }
  return h;
};
const A1 = CUES.again;
const HOPS_A: Hop[] = [
  mk(-1, 0, CUES.patientZero + 20, CUES.patientZero + 82, CUES.patientZero + 8, -1),
  mk(0, 1, CUES.copy - 2, CUES.run, CUES.find, CUES.getIn),
  mk(1, 2, A1 + 5, A1 + 26, A1, A1 + 3),
];
// the second repeat leaves device 3's neighbour right after the first worm is inside
const B0 = Math.ceil(HOPS_A[2].tIn) + 1;
const HOPS: Hop[] = [
  ...HOPS_A,
  mk(2, 3, B0, A1 + 44, A1 + 14, B0 - 3),
  ...[0, 1, 2, 3].map((i) => {
    const t0 = CUES.propagate + 14 + i * 18;
    return mk(i, i + 4, t0, t0 + 64, t0 - 12, t0 - 5);
  }),
];
const HOP_TO = (i: number) => HOPS.find((h) => h.to === i)!;
const LIT = (i: number) => HOP_TO(i).t1;
const OPEN = (i: number) => (i === 0 ? HOPS[0].tIn - 14 : HOP_TO(i).getIn);
const BOOT = (i: number) => CUES.android + i * 5;
const RISE = (i: number) => CUES.eight + i * 3;

// ------------------------------------------------------------------ camera
export type KF = [number, number, number, number, number]; // frame, fx, fy, scale, cy
const KFA: KF[] = [
  [0, 40, 280, 0.92, 850],
  [CUES.eight, 40, 270, 0.92, 850],
  [CUES.android, -40, 130, 1.22, 850],
  [CUES.android + 34, 200, 230, 1.22, 850],
  [CUES.patientZero - 6, 20, 130, 1.05, 850],
  [CUES.patientZero + 10, -50, 20, 1.0, 830],
  [HOPS[0].t1 - 6, 55, 60, 1.9, 800],
  [CUES.find - 4, 70, 85, 2.2, 800],
  [CUES.getIn + 4, 75, 85, 2.2, 800],
  [HOPS[1].t1 + 6, 78, 88, 2.2, 800],
  [CUES.again - 8, 160, 130, 1.8, 800],
  [CUES.again + 8, 250, 175, 1.5, 800],
  [423, 280, 190, 1.4, 800],
];
const KFB: KF[] = [
  [CUES.onlyOne, 40, 120, 0.92, 850],
  [CUES.propagate + 40, 40, 130, 0.92, 860],
  [CUES.allEight - 10, 60, 150, 0.9, 940],
  [CUES.runs, 60, 150, 0.9, 960],
  [799, 60, 150, 0.92, 965],
];
export const spline = (K5: KF[], f: number): [number, number, number, number] => {
  let i = K5.findIndex((k) => k[0] > f);
  if (i === -1) i = K5.length - 1;
  if (i === 0) i = 1;
  const a = K5[i - 1];
  const b = K5[i];
  const p0 = K5[Math.max(0, i - 2)];
  const p3 = K5[Math.min(K5.length - 1, i + 1)];
  const dt = b[0] - a[0];
  const t = Math.min(1, Math.max(0, (f - a[0]) / dt));
  return [1, 2, 3, 4].map((j) => {
    const m0 = ((b[j] - p0[j]) / (b[0] - p0[0] || 1)) * dt;
    const m1 = ((p3[j] - a[j]) / (p3[0] - a[0] || 1)) * dt;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * a[j] + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * b[j] + (t3 - t2) * m1;
  }) as [number, number, number, number];
};
// the camera rides the walking head during these windows
const FOLLOW = [
  { a: HOPS[0].t0 - 10, b: HOPS[0].t1 - 8, hop: 0, s: 1.6 },
];
const cam = (f: number): [number, number, number, number] => {
  const base = f < 430 ? spline(KFA, Math.min(f, 423)) : spline(KFB, f);
  let w = 0;
  let tgt: [number, number, number, number] = base;
  for (const fl of FOLLOW) {
    const ww = seg(f, fl.a, fl.a + 14) * (1 - seg(f, fl.b - 14, fl.b));
    if (ww > w) {
      w = ww;
      const hp = HOPS[fl.hop];
      let sx = 0;
      let sy = 0;
      for (let k = 0; k < 5; k++) {
        const q = at(hp.path, Math.min(hp.path.L + 40, hOf(hp, f - k * 3)));
        const [px, py] = P(q.x, q.y, 14);
        sx += px / 5;
        sy += py / 5;
      }
      tgt = [sx, sy - 30, fl.s, 800];
    }
  }
  return [base[0] + (tgt[0] - base[0]) * w, base[1] + (tgt[1] - base[1]) * w, base[2] + (tgt[2] - base[2]) * w, base[3] + (tgt[3] - base[3]) * w];
};

// ----------------------------------------------------------------- helpers
export const mix = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};
export const sc = (x: number, y: number, z: number) => P(x, y, z).map((n) => n.toFixed(1)).join(",");
export const quad = (pts: [number, number, number][]) => pts.map((p) => sc(...p)).join(" ");
export const hash = (n: number) => Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;
const clipY = (pts: [number, number][], Y?: number): [number, number][] | null => {
  if (Y === undefined) return pts;
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const ai = a[1] >= Y;
    const bi = b[1] >= Y;
    if (ai) out.push(a);
    if (ai !== bi) {
      const t = (Y - a[1]) / (b[1] - a[1]);
      out.push([a[0] + t * (b[0] - a[0]), Y]);
    }
  }
  return out.length >= 3 ? out : null;
};

export const Prism: React.FC<{ pts: [number, number][]; z: number; h: number; l: string; r: string; top: string; stroke?: string; sw?: number }> = ({ pts, z, h, l, r, top, stroke = "#000", sw = 1.4 }) => {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return (
    <g strokeLinejoin="round">
      {pts.map((p, i) => {
        const q = pts[(i + 1) % pts.length];
        const mx = (p[0] + q[0]) / 2 - cx;
        const my = (p[1] + q[1]) / 2 - cy;
        const m = Math.hypot(mx, my) || 1;
        const nx = mx / m;
        const ny = my / m;
        if (nx + ny <= 0) return null;
        return <polygon key={i} points={quad([[p[0], p[1], z], [q[0], q[1], z], [q[0], q[1], z + h], [p[0], p[1], z + h]])} fill={mix(l, r, ((nx - ny) / 1.414) * 0.5 + 0.5)} stroke="#000" strokeWidth={1.2} />;
      })}
      <polygon points={pts.map((p) => sc(p[0], p[1], z + h)).join(" ")} fill={top} stroke={stroke} strokeWidth={sw} />
    </g>
  );
};

export const Ring: React.FC<{ x: number; y: number; z?: number; r: number; op: number; sw?: number; col?: string }> = ({ x, y, z = 3, r, op, sw = 3, col = AMBER }) => {
  if (op <= 0.01) return null;
  const [cx, cy] = P(x, y, z);
  return <ellipse cx={cx} cy={cy} rx={r * 1.2247} ry={r * 0.7071} fill="none" stroke={col} strokeWidth={sw} opacity={op} />;
};

// -------------------------------------------------------------- centipede
export const ZB = 1.5; // chip base height (floor / pad top)
export const ChipBlock: React.FC<{ x: number; y: number; ang: number; s: number; phase: number; head?: boolean; eye?: number; flare?: number; cut?: number }> = ({ x, y, ang, s, phase, head, eye = 1, flare = 0, cut }) => {
  const f = useCurrentFrame();
  const a = head ? ang + 0.14 * Math.sin(f * 0.11) : ang;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const hs = s / 2;
  const rot = (lx: number, ly: number): [number, number] => [x + lx * ca - ly * sa, y + lx * sa + ly * ca];
  const th = 8;
  const z = ZB;
  const corner = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as [number, number][]).map(([a1, b1]) => rot(a1 * hs, b1 * hs));
  const body = clipY(corner, cut);
  if (!body) return null;
  const dieC = head ? -hs * 0.22 : 0;
  const dh = hs * (head ? 0.36 : 0.44);
  const die = clipY(([[-1, -1], [1, -1], [1, 1], [-1, 1]] as [number, number][]).map(([a1, b1]) => rot(dieC + a1 * dh, b1 * dh)), cut);
  const [ex, ey] = rot(hs * 0.52, 0);
  const eyeOk = cut === undefined || ey >= cut + 3;
  const [ex2, ey2] = P(ex, ey, z + th + 3);
  const ant = ([-1, 1] as const).map((sd) => {
    const w = 6 * Math.sin(f * 0.13 + sd * 1.7);
    const p0 = rot(hs * 0.85, sd * hs * 0.5);
    const p1 = rot(hs + 14, sd * (hs * 0.5 + 10));
    const p2 = rot(hs + 28, sd * (hs * 0.5 + 22) + w);
    if (cut !== undefined && (p0[1] < cut || p1[1] < cut || p2[1] < cut)) return null;
    const a0 = P(p0[0], p0[1], z + th);
    const a1 = P(p1[0], p1[1], z + th + 11);
    const a2 = P(p2[0], p2[1], z + th + 4);
    return `M${a0[0]} ${a0[1]} Q${a1[0]} ${a1[1]} ${a2[0]} ${a2[1]}`;
  });
  const leg = (sd: number, j: number) => {
    const lx = (j - 1) * s * 0.3;
    const len = 4 + 4.5 * Math.max(0, Math.sin(phase * 0.45 + (sd > 0 ? Math.PI : 0) + j * 0.5));
    const p0 = rot(lx, sd * hs);
    const p1 = rot(lx, sd * (hs + len));
    if (cut !== undefined && (p0[1] < cut || p1[1] < cut)) return null;
    const q0 = P(p0[0], p0[1], z + th * 0.45);
    const q1 = P(p1[0], p1[1], z + th * 0.45);
    return <line key={`${sd}${j}`} x1={q0[0]} y1={q0[1]} x2={q1[0]} y2={q1[1]} stroke="#C4BCB0" strokeWidth={3.4} strokeLinecap="round" />;
  };
  return (
    <g>
      {([-1, 1] as const).map((sd) => [0, 1, 2].map((j) => leg(sd, j)))}
      <Prism pts={body} z={z} h={th} l="#2A2927" r="#161513" top="#2F2E2B" stroke="#E7E0D4" sw={1.8} />
      {die && <polygon points={die.map((p) => sc(p[0], p[1], z + th + 0.4)).join(" ")} fill="#A9A298" stroke="#4A4742" strokeWidth={1} />}
      {head && (
        <g>
          {ant.map((d, j) => d && <path key={j} d={d} fill="none" stroke="#C4BCB0" strokeWidth={2.2} strokeLinecap="round" />)}
          {eyeOk && (
            <g>
              <circle cx={ex2} cy={ey2} r={14 + 16 * eye + 2 * Math.sin(f * 0.2)} fill="url(#aEye)" opacity={0.9 * eye} />
              <circle cx={ex2} cy={ey2} r={5.6} fill={mix("#3A3835", AMBER, eye)} stroke="#000" strokeWidth={1.2} />
              <circle cx={ex2} cy={ey2} r={2.6 * eye} fill={HOT} />
              {flare > 0 && flare < 1 && <circle cx={ex2} cy={ey2} r={10 + 55 * flare} fill="none" stroke={AMBER} strokeWidth={3} opacity={1 - flare} />}
            </g>
          )}
        </g>
      )}
    </g>
  );
};

export type Walk = { path: Path; srcY?: number; tgtY?: number; head: number; flare: number };
// chip k sits SP behind chip k-1 along the path; the part that is behind a slab's front face is cut away
export const walkChips = (w: Walk, f: number, tag: string) =>
  Array.from({ length: N }, (_, k) => {
    const s = w.head - (k === 0 ? 0 : 30 + (k - 1) * SP);
    const q = at(w.path, s);
    const cut = s < w.path.L / 2 ? w.srcY : w.tgtY;
    return {
      key: q.x + q.y,
      el: <ChipBlock key={`${tag}${k}`} x={q.x} y={q.y} ang={q.ang} s={k === 0 ? HEAD : CHIP} phase={s} head={k === 0} flare={k === 0 ? w.flare : 0} cut={cut} />,
    };
  });

// ------------------------------------------------------------------- device
const Lock: React.FC<{ open: number }> = ({ open }) => {
  const col = open > 0.5 ? AMBER : "#C4BCB0";
  return (
    <g transform="translate(45 81)">
      <g transform={`translate(6 0) rotate(${48 * open}) translate(-6 0) translate(0 ${-4 * open})`}>
        <path d="M-6 0 V-8 A6 6 0 0 1 6 -8 V0" fill="none" stroke={col} strokeWidth={3.6} strokeLinecap="round" />
      </g>
      <rect x={-11} y={0} width={22} height={13} rx={2.5} fill={col} stroke="#000" strokeWidth={1.2} />
      <circle cx={0} cy={6.5} r={2} fill="#000" />
    </g>
  );
};

// the voice says "Llama" at frame 626: no model name on a screen before that, then a short staggered settle
const LLAMA_AT = 626;
const llamaAt = (i: number) => {
  const early = HOPS.filter((h) => h.t1 < LLAMA_AT).map((h) => h.to).sort((a, b) => HOP_TO(a).t1 - HOP_TO(b).t1);
  const r = early.indexOf(i);
  return Math.max(HOP_TO(i).t1, LLAMA_AT + (r < 0 ? 0 : r * 3));
};

const Dev: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const rise = Math.min(1.03, Math.max(0, seg(f, RISE(i), RISE(i) + 14, Easing.out(Easing.back(1.4)))));
  if (rise <= 0) return null;
  const hop = HOP_TO(i);
  const h = H * rise;
  const [ox, oy] = P(X0(i), FACE_Y(i), H);
  const full = seg(rise, 0.9, 1);
  const bt = seg(f, BOOT(i), BOOT(i) + 16);
  const lit = f >= hop.t1;
  const flash = lit ? 1 - lin(f, hop.t1, hop.t1 + 9) : 0;
  const open = f >= OPEN(i) ? Math.min(1.12, seg(f, OPEN(i), OPEN(i) + 12, Easing.out(Easing.back(3)))) : 0;
  const entering = f >= hop.tIn && f < hop.t1;
  const amp = f >= hop.tIn ? 2.6 * (f < hop.t1 ? 1 : 1 - lin(f, hop.t1, hop.t1 + 8)) : 0;
  const dx = amp * Math.sin(f * 3.3 + i);
  const dy = amp * 0.6 * Math.sin(f * 4.1);
  const flick = entering && hash(f * 1.7 + i) > 0.4;
  const portOn = lit ? 1 : seg(f, hop.tIn - 14, hop.tIn) * (f < hop.t1 + 1 ? 1 : 0);
  const scr = lit ? AMBER : flick ? "#B87818" : bt > 0 ? "#141413" : "#090909";
  return (
    <g transform={`translate(${dx} ${dy})`}>
      <Box x={X0(i)} y={BY(i) + 14} w={W} d={D} h={h} tone={STONE} />
      <g opacity={full} transform={`translate(${ox} ${oy}) matrix(${K} 0.5 0 1 0 0)`}>
        <rect x={6} y={7} width={78} height={60} rx={3} fill={scr} stroke="#000" strokeWidth={1.6} />
        {lit && <rect x={6} y={7} width={78} height={60} rx={3} fill={HOT} opacity={flash} />}
        {entering && flick && [0, 1, 2].map((k) => <rect key={k} x={6} y={12 + hash(f + k * 7 + i) * 48} width={78} height={3} fill={HOT} opacity={0.6} />)}
        {lit ? (
          <g fontFamily={sans} fontWeight={700} fill="#000" textAnchor="middle" opacity={i === 0 ? 1 : seg(f, llamaAt(i), llamaAt(i) + 10, Easing.out(Easing.cubic))}>
            <text x={45} y={33} fontSize={i === 0 ? 15 : 19} letterSpacing={0.3}>{i === 0 ? "PATIENT" : "LLAMA"}</text>
            <text x={45} y={57} fontSize={i === 0 ? 17 : 19} letterSpacing={0.3}>{i === 0 ? "ZERO" : "3.1 8B"}</text>
          </g>
        ) : (
          bt > 0 &&
          !entering && (
            <g>
              <rect x={22} y={52} width={46} height={4} rx={2} fill="#2E2C29" opacity={1 - seg(bt, 0.9, 1)} />
              <rect x={22} y={52} width={46 * seg(bt, 0, 0.7, Easing.linear)} height={4} rx={2} fill="#FEFCF9" opacity={1 - seg(bt, 0.9, 1)} />
              <g opacity={seg(bt, 0.7, 1)}>
                <g transform="translate(45 32) scale(1.15)">
                  <path d="M-11 0 A11 11 0 0 1 11 0 Z" fill="#FEFCF9" />
                  <circle cx={-4.5} cy={-4.5} r={1.7} fill="#000" />
                  <circle cx={4.5} cy={-4.5} r={1.7} fill="#000" />
                  <path d="M-7 -8 L-10 -14 M7 -8 L10 -14" stroke="#FEFCF9" strokeWidth={1.8} strokeLinecap="round" />
                </g>
                <text x={45} y={58} fontSize={14.5} fontFamily={sans} fontWeight={700} fill="#FEFCF9" textAnchor="middle" letterSpacing={0.4}>ANDROID</text>
              </g>
            </g>
          )
        )}
        <Lock open={open} />
        {/* the port the worm goes in and out of */}
        <rect x={19} y={100} width={52} height={16} rx={2} fill="#050505" stroke={mix("#625E57", AMBER, portOn)} strokeWidth={2.2} />
        <rect x={19} y={100} width={52} height={5} fill="#000" opacity={0.7} />
        {portOn > 0 && <rect x={22} y={108} width={46} height={8} fill="url(#aGlow)" opacity={portOn} />}
        <circle cx={12} cy={108} r={2.6} fill={mix("#46433E", AMBER, portOn)} />
        <circle cx={78} cy={108} r={2.6} fill={mix("#46433E", AMBER, portOn)} />
      </g>
    </g>
  );
};

// ------------------------------------------------------------------- floor
const Floor: React.FC = () => {
  const f = useCurrentFrame();
  const els: React.ReactNode[] = [];
  // glow under infected bays
  for (let i = 0; i < 8; i++) {
    const a = seg(f, LIT(i) - 4, LIT(i) + 12);
    if (a <= 0) continue;
    const [gx, gy] = P(BX(i) + 65, BY(i) + 110, 2);
    els.push(<ellipse key={`g${i}`} cx={gx} cy={gy} rx={105} ry={58} fill="url(#aGlow)" opacity={a * (0.55 + 0.1 * Math.sin(f * 0.1 + i))} />);
  }
  HOPS.forEach((hp, k) => {
    const srv = hp.from < 0;
    const t0 = hp.find;
    const tEnd = hp.t1 + 16;
    if (f < t0 || (!srv && f > tEnd + 12)) return;
    // scan pulse (FIND): rings at the source port and a dot running down the track
    const dur = Math.max(6, (srv ? hp.t0 : hp.getIn) - hp.find);
    const u = srv ? seg(f, hp.find, hp.t0) : seg(f, hp.find, hp.find + dur * 0.8);
    const reach = hp.path.L * u;
    const fade = srv ? 0.55 : 1 - seg(f, hp.t1, tEnd + 10);
    const flow = -f * 1.4;
    els.push(
      <g key={`t${k}`} opacity={fade}>
        <polyline points={sub(hp.path, hp.path.L)} fill="none" stroke={C.paper} strokeWidth={9} strokeOpacity={0.07} strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={sub(hp.path, reach)} fill="none" stroke={AMBER} strokeWidth={3} strokeDasharray="7 9" strokeDashoffset={flow} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
        {u > 0 && u < 1 && (() => {
          const q = at(hp.path, reach);
          const [dx, dy] = P(q.x, q.y, 4);
          return <circle cx={dx} cy={dy} r={7} fill={HOT} stroke={AMBER} strokeWidth={3} />;
        })()}
      </g>,
    );
    if (!srv) {
      const m = mouth(hp.from);
      [0, 1, 2].map((r) => {
        const t = lin(f, hp.find + r * dur * 0.12, hp.find + r * dur * 0.12 + dur * 0.6);
        els.push(<Ring key={`r${k}${r}`} x={m[0]} y={m[1] + 12} r={20 + t * 90} op={t > 0 && t < 1 ? 0.8 * (1 - t) : 0} />);
      });
    }
  });
  return <g>{els}</g>;
};

// ------------------------------------------------------------------- tray
const Tray: React.FC<{ extra: { key: number; el: React.ReactNode }[] }> = ({ extra }) => {
  const f = useCurrentFrame();
  const b = seg(f, 0, 12);
  const wh = 34 * seg(f, 4, 26, Easing.out(Easing.back(1.3)));
  const gh = 150 * seg(f, 12, 38);
  const gf = 64 * seg(f, 20, 42);
  const glass = seg(f, 22, 44);
  const X1 = XE + 14;
  const Y1 = YE + 14;
  const gl = (pts: [number, number, number][]) => <polygon points={quad(pts)} fill={C.paper} fillOpacity={0.05 * glass} stroke={C.paper} strokeOpacity={0.3 * glass} strokeWidth={1.5} />;
  const traces: React.ReactNode[] = [];
  const tr = (x1: number, y1: number, x2: number, y2: number, k: string) => <line key={k} x1={P(x1, y1, 0.6)[0]} y1={P(x1, y1, 0.6)[1]} x2={P(x2, y2, 0.6)[0]} y2={P(x2, y2, 0.6)[1]} stroke={C.paper} strokeOpacity={0.12} strokeWidth={2} />;
  [70, 70 + PYs].forEach((y, r) => traces.push(tr(-8, y, XE - 4, y, `h${r}`)));
  for (let c = 0; c < 4; c++) traces.push(tr(c * PXs + 124, -8, c * PXs + 124, YE - 4, `v${c}`));
  const items = [...extra];
  ORDER.forEach((i) => items.push({ key: BX(i) + 65 + FACE_Y(i), el: <Dev key={`d${i}`} i={i} /> }));
  items.sort((p, q) => p.key - q.key);
  const doorLo = 98;
  const doorHi = 162;
  return (
    <g>
      <g opacity={b}>
        <Box x={-26} y={-26} w={XE + 40} d={532} z={-24} h={24} tone={INK} topFill="#23221F" />
        <g opacity={0.8 * seg(f, 2, 14)}>{traces}</g>
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i} opacity={seg(f, 1 + i, 12 + i)}>
            <Box x={BX(i) + 8} y={BY(i) + 40} w={114} d={170} z={0} h={1.5} tone={PAD} topFill="#2E2C28" />
          </g>
        ))}
      </g>
      {wh > 0.5 && <Box x={-26} y={-26} w={XE + 40} d={14} z={0} h={wh} tone={PAD} />}
      {wh > 0.5 && <Box x={-26} y={-12} w={14} d={doorLo + 12} z={0} h={wh} tone={PAD} />}
      {wh > 0.5 && <Box x={-26} y={doorHi} w={14} d={YE - doorHi + 14} z={0} h={wh} tone={PAD} />}
      {gh > 1 && <Box x={-26} y={-26} w={5} d={5} z={0} h={gh} tone={STONE} />}
      {gh > 100 && <Box x={-26} y={-26} w={XE + 40} d={4} z={gh - 3} h={3} tone={STONE} />}
      {gh > 100 && <Box x={-26} y={-26} w={4} d={532} z={gh - 3} h={3} tone={STONE} />}
      <Floor />
      {items.map((it, k) => (
        <React.Fragment key={k}>{it.el}</React.Fragment>
      ))}
      {wh > 0.5 && <Box x={-26} y={YE} w={XE + 40} d={14} z={0} h={wh} tone={PAD} />}
      {wh > 0.5 && <Box x={XE} y={-12} w={14} d={YE + 12} z={0} h={wh} tone={PAD} />}
      {gf > 1 && gl([[-26, Y1, wh], [X1, Y1, wh], [X1, Y1, gf], [-26, Y1, gf]])}
      {gf > 1 && gl([[X1, -26, wh], [X1, Y1, wh], [X1, Y1, gf], [X1, -26, gf]])}
      {gh > 1 && <Box x={XE + 6} y={-26} w={5} d={5} z={0} h={gh} tone={STONE} />}
      {gh > 1 && <Box x={-26} y={YE + 6} w={5} d={5} z={0} h={gh} tone={STONE} />}
      {gf > 1 && <Box x={XE + 6} y={YE + 6} w={5} d={5} z={0} h={gf} tone={STONE} />}
      {gf > 61 && <Box x={-26} y={YE + 8} w={XE + 40} d={4} z={gf - 3} h={3} tone={STONE} />}
      {gf > 61 && <Box x={XE + 8} y={-26} w={4} d={532} z={gf - 3} h={3} tone={STONE} />}
    </g>
  );
};

// ------------------------------------------------------------------ server
const Server: React.FC = () => {
  const f = useCurrentFrame();
  const led = (k: number) => (Math.sin(f * 0.35 + k * 2.1) > -0.2 ? AMBER : "#5A4624");
  const [fx, fy] = P(-300, 90, 190);
  const [rx, ry] = P(-220, 90, 190);
  const out = f >= HOPS[0].t0 - 4 && f < HOPS[0].t0 + 28 ? 1 : 0;
  return (
    <g>
      <Box x={-300} y={10} w={80} d={80} h={190} tone={MID} />
      <g transform={`translate(${fx} ${fy}) matrix(${K} 0.5 0 1 0 0)`}>
        {[0, 1, 2, 3].map((k) => (
          <g key={k}>
            <rect x={8} y={12 + k * 34} width={64} height={26} rx={2} fill="#1A1917" stroke="#000" strokeWidth={1.2} />
            <circle cx={17} cy={25 + k * 34} r={3.4} fill={led(k)} />
            <line x1={30} y1={20 + k * 34} x2={64} y2={20 + k * 34} stroke="#46433E" strokeWidth={2} />
            <line x1={30} y1={30 + k * 34} x2={64} y2={30 + k * 34} stroke="#46433E" strokeWidth={2} />
          </g>
        ))}
        <rect x={16} y={158} width={48} height={32} rx={2} fill="#050505" stroke={out ? AMBER : "#625E57"} strokeWidth={2.2} />
      </g>
      <g transform={`translate(${rx} ${ry}) matrix(${K} -0.5 0 1 0 0)`}>
        {Array.from({ length: 10 }, (_, k) => (
          <line key={k} x1={10 + k * 7} y1={14} x2={10 + k * 7} y2={170} stroke="#46433E" strokeWidth={2.2} />
        ))}
      </g>
    </g>
  );
};

const Motes: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <g>
      {Array.from({ length: 90 }, (_, i) => {
        const h1 = hash(i + 1);
        const h2 = hash(i * 3 + 7);
        const h3 = hash(i * 5 + 11);
        const z = ((h3 * 600 + f * (0.25 + h1 * 0.3)) % 600) - 40;
        const [x, y] = P(-520 + h1 * 1500, -520 + h2 * 1300, z);
        return <circle key={i} cx={x} cy={y} r={1.4 + (i % 3) * 0.8} fill={C.paper} opacity={(0.14 + 0.28 * h2) * (0.6 + 0.4 * Math.sin(f * 0.06 + i))} />;
      })}
    </g>
  );
};

const Ghost: React.FC = () => {
  const f = useCurrentFrame();
  const u = seg(f, 0, 22);
  const fade = 1 - seg(f, 30, 52);
  const d = ([[-26, -26], [XE + 14, -26], [XE + 14, 506], [-26, 506]] as [number, number][]).map((p, k) => `${k ? "L" : "M"}${sc(p[0], p[1], 0)}`).join("") + "Z";
  const t = lin(f, 0, 70);
  return (
    <g>
      <path d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - u} fill="none" stroke={C.paper} strokeWidth={2.5} opacity={0.5 * fade} />
      {[0, 1, 2].map((r) => {
        const q = (t * 1.6 + r * 0.33) % 1;
        return <Ring key={r} x={260} y={240} z={0} r={120 + q * 560} op={0.28 * (1 - q) * fade} sw={2.5} col={C.paper} />;
      })}
    </g>
  );
};

// ----------------------------------------------------------------- overlay
export const enter = (f: number, a: number, dur = 14): React.CSSProperties => {
  const u = seg(f, a, a + dur, Easing.out(Easing.cubic));
  return { opacity: u, transform: `translateY(${(1 - u) * 28}px)`, filter: `blur(${(1 - u) * 10}px)` };
};
export const leave = (f: number, end: number): React.CSSProperties => {
  const u = seg(f, end - 8, end, Easing.in(Easing.quad));
  return { opacity: 1 - u, transform: `translateY(${-12 * u}px)` };
};

const Caption: React.FC<{ f: number }> = ({ f }) => {
  const a = CUES.eight + 6;
  const end = CUES.patientZero + 6;
  if (f < a || f > end) return null;
  return (
    <div style={{ position: "absolute", left: 80, top: 262, width: 920, textAlign: "center", fontFamily: sans, fontWeight: 700, fontSize: 30, letterSpacing: 5, color: C.paper, whiteSpace: "nowrap", textShadow: "0 2px 14px #000", ...enter(f, a), ...leave(f, end) }}>
      SEALED NETWORK <span style={{ color: C.muted, margin: "0 8px" }}>·</span>
      <span style={{ color: C.muted }}>8 CLOUD COMPUTERS</span>
    </div>
  );
};

const Counter: React.FC<{ f: number }> = ({ f }) => {
  const a = CUES.allEight;
  if (f < a) return null;
  const snap = 1 + 0.06 * Math.max(0, 1 - (f - a - 10) / 8) * (f > a + 10 ? 1 : 0);
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center", fontFamily: serif, fontSize: 330, lineHeight: 1, color: RED, textShadow: "0 4px 30px #000", ...enter(f, a, 12), transform: `${enter(f, a, 12).transform} scale(${snap})` }}>8/8</div>
      {f >= CUES.runs && (
        <div style={{ position: "absolute", left: 80, width: 920, top: 490, textAlign: "center", fontFamily: sans, fontWeight: 700, fontSize: 44, letterSpacing: 8, color: C.paper, textShadow: "0 2px 16px #000", ...enter(f, CUES.runs, 14) }}>IN 4 OF 5 RUNS</div>
      )}
    </>
  );
};

// ------------------------------------------------------------------- scene
export type LabProps = { x: number; y: number; z: number; at: number; out?: number; text: string; size: number; fill?: string; fx: number; s: number };
// a label that is slid sideways, if needed, so it stays 80 px inside the frame
export const Lab: React.FC<LabProps> = ({ fx, s, ...t }) => {
  const [px] = P(t.x, t.y, t.z);
  const half = ((t.text.length * t.size * 0.66 + t.size * 1.1) * 1.06 * s) / 2;
  const sxp = 540 + (px - fx) * s;
  const c = 1000 - half < 80 + half ? 540 : Math.min(1000 - half, Math.max(80 + half, sxp));
  return (
    <g transform={`translate(${(c - sxp) / s} 0)`}>
      <Tag {...t} />
    </g>
  );
};

const lowpassCam = (f: number, lo: number, hi: number, r = 6) => {
  let w = 0;
  const out = [0, 0, 0, 0];
  for (let k = -r; k <= r; k++) {
    const c = cam(Math.min(hi, Math.max(lo, f + k)));
    const ww = r + 1 - Math.abs(k);
    for (let j = 0; j < 4; j++) out[j] += c[j] * ww;
    w += ww;
  }
  return out.map((v) => v / w) as [number, number, number, number];
};
// low-passed so velocity is continuous (the hidden chart gap 424-539 is never averaged across)
const camSmooth = (f: number) => (f < 430 ? lowpassCam(f, 0, 423) : lowpassCam(f, 540, 799));

export const AraIso: React.FC = () => {
  const f = useCurrentFrame();
  const [fx, fy, s0, cy] = camSmooth(f);
  // transitions at the scene edges: start already moving, push forward into the cut at 423 / 799, come out of it at 540
  const inEase = Easing.in(Easing.cubic);
  const push = Math.max(inEase(seg(f, 411, 423, Easing.linear)) * (f < 430 ? 1 : 0), inEase(seg(f, 787, 799, Easing.linear)) * (f > 700 ? 1 : 0));
  const pull = Math.max(1 - seg(f, 540, 553), 1 - seg(f, 0, 14)) * (f < 430 || f >= 540 ? 1 : 0);
  const s = s0 * (1 + 0.28 * (f > 700 ? 0.35 : 1) * push + 0.2 * pull * (f < 20 ? 0.6 : 1));
  const glmDy = 60 * (1 - seg(f, CUES.onlyOne, CUES.onlyOne + 16, Easing.out(Easing.cubic)));
  const extra: { key: number; el: React.ReactNode }[] = [];
  HOPS.forEach((hp, k) => {
    if (f < hp.t0 || f > hp.t1 + 1) return;
    const head = hOf(hp, f);
    extra.push(...walkChips({ path: hp.path, srcY: plane(hp.from), tgtY: plane(hp.to), head, flare: lin(f, hp.t0 + 2, hp.t0 + 16) }, f, `w${k}`));
    const q = at(hp.path, Math.max(0, Math.min(hp.path.L, head)));
    const [gx, gy] = P(q.x, q.y, 3);
    extra.push({ key: -1e6, el: <ellipse key={`gl${k}`} cx={gx} cy={gy} rx={60} ry={34} fill="url(#aGlow)" opacity={0.7} /> });
  });
  // after 8/8 every worm peeks out of its port now and then
  const peek = seg(f, CUES.allEight - 10, CUES.allEight + 8);
  if (peek > 0) {
    for (let i = 0; i < 8; i++) {
      const p = mkPathMemo(i);
      const head = -18 + 70 * peek * (0.5 + 0.5 * Math.sin(f * 0.07 + i * 1.9));
      extra.push(...walkChips({ path: p, srcY: FACE_Y(i), head, flare: 0 }, f, `p${i}`));
    }
  }
  return (
    <Stage
      fx={fx}
      fy={fy}
      s={s}
      cy={cy}
      overlay={
        <>
          <div style={{ position: "absolute", inset: 0, background: "#000", opacity: f < 430 ? seg(f, 415, 423) : 1 - seg(f, 540, 548), pointerEvents: "none", zIndex: 5 }} />
          <Caption f={f} />
          <Counter f={f} />
        </>
      }
    >
      <defs>
        <radialGradient id="aGlow">
          <stop offset={0} stopColor={AMBER} stopOpacity={0.5} />
          <stop offset={0.6} stopColor={AMBER} stopOpacity={0.14} />
          <stop offset={1} stopColor={AMBER} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="aEye">
          <stop offset={0} stopColor={HOT} stopOpacity={0.95} />
          <stop offset={0.25} stopColor={AMBER} stopOpacity={0.7} />
          <stop offset={1} stopColor={AMBER} stopOpacity={0} />
        </radialGradient>
      </defs>
      <Motes />
      <Ghost />
      {f >= CUES.patientZero && <Server />}
      <Tray extra={extra} />
      <Lab fx={fx} s={s} x={SERVER_X} y={50} z={265} at={CUES.patientZero + 14} out={HOPS[0].t0 + 40} text="THE WORM'S BRAIN" size={30} />
      <g transform={`translate(0 ${-glmDy})`}>
        <Lab fx={fx} s={s} x={-45} y={-115} z={150} at={CUES.onlyOne} text="GLM 5.2" size={32} fill={C.paper} />
      </g>
      <Lab fx={fx} s={s} x={65} y={FACE_Y(0)} z={H + 60} at={Math.round(HOPS[0].tIn) - 20} out={CUES.find + 10} text="PATIENT ZERO" size={30} fill={AMBER} />
    </Stage>
  );
};

const peekPaths: Path[] = [];
function mkPathMemo(i: number): Path {
  if (!peekPaths[i]) peekPaths[i] = mkPath([[BX(i) + 65, FACE_Y(i)], [BX(i) + 65, FACE_Y(i) + 90]]);
  return peekPaths[i];
}
