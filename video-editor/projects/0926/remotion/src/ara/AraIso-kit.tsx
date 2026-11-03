import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { Box, C, K, MID, P, PAD, STONE, TONES, INK, PAPER, sans } from "../iso";
import type { Tone } from "../iso";
import { AMBER, ChipBlock, HEAD, CHIP, SP, at, mix, spline } from "./AraIso";
import type { KF } from "./AraIso";
import type { Path } from "./AraIso";

export { AMBER, HOT, RED, mkPath, at, sub, mix, sc, quad, hash, Prism, Ring, ChipBlock, walkChips, spline, enter, leave, Lab } from "./AraIso";
export type { Path, KF } from "./AraIso";

export const AMBER_TONE: Tone = { t: "#FFB547", l: "#D98E1F", r: "#9A6414", g: "gStone" };

// Same stage as iso.tsx's Stage but without the fade in/out (these scenes are cut into the edit).
export const Stage2: React.FC<{ fx: number; fy: number; s: number; cy?: number; blur?: [number, number]; noGrid?: boolean; overlay?: React.ReactNode; children: React.ReactNode }> = ({ fx, fy, s, cy = 800, blur, noGrid, overlay, children }) => {
  const cam = `translate(540 ${cy}) scale(${s}) translate(${-fx} ${-fy})`;
  return (
    <AbsoluteFill style={{ background: C.black, fontFamily: sans }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <pattern id="grid" patternUnits="userSpaceOnUse" width={173.2} height={100} patternTransform="translate(0 -50)">
            <path d="M0 50 L86.6 0 L173.2 50 L86.6 100 Z" fill="none" stroke="rgba(254,252,249,0.09)" strokeWidth={1.5} />
          </pattern>
          <radialGradient id="vig" gradientUnits="userSpaceOnUse" cx={0} cy={0} r={1} gradientTransform="translate(540 860) scale(700 900)">
            <stop offset="0.5" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={1} />
          </radialGradient>
          <radialGradient id="aGlow">
            <stop offset={0} stopColor={AMBER} stopOpacity={0.5} />
            <stop offset={0.6} stopColor={AMBER} stopOpacity={0.14} />
            <stop offset={1} stopColor={AMBER} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="aEye">
            <stop offset={0} stopColor="#FFF1CF" stopOpacity={0.95} />
            <stop offset={0.25} stopColor={AMBER} stopOpacity={0.7} />
            <stop offset={1} stopColor={AMBER} stopOpacity={0} />
          </radialGradient>
          {TONES.map((t) => (
            <linearGradient key={t.g} id={t.g} x1={0} x2={1} y1={0} y2={0}>
              <stop offset={0} stopColor={t.l} />
              <stop offset={1} stopColor={t.r} />
            </linearGradient>
          ))}
          <filter id="mblur" filterUnits="userSpaceOnUse" x={-120} y={-120} width={1320} height={2160}>
            <feGaussianBlur stdDeviation={blur ? `${blur[0].toFixed(2)} ${blur[1].toFixed(2)}` : "0 0"} />
          </filter>
        </defs>
        <g filter={blur && blur[0] + blur[1] > 0.4 ? "url(#mblur)" : undefined}>
          <g transform={cam}>
            {!noGrid && <rect x={-6000} y={-6000} width={12000} height={12000} fill="url(#grid)" />}
          </g>
          <rect width={1080} height={1920} fill="url(#vig)" />
          <g transform={cam}>{children}</g>
        </g>
      </svg>
      {overlay}
    </AbsoluteFill>
  );
};

export const FaceG: React.FC<{ x: number; fy: number; z: number; h: number; children: React.ReactNode }> = ({ x, fy, z, h, children }) => {
  const [ox, oy] = P(x, fy, z + h);
  return <g transform={`translate(${ox} ${oy}) matrix(${K} 0.5 0 1 0 0)`}>{children}</g>;
};

export type Item = { key: number; el: React.ReactNode };
export const paint = (items: Item[]) =>
  items
    .slice()
    .sort((a, b) => a.key - b.key)
    .map((it, i) => <React.Fragment key={i}>{it.el}</React.Fragment>);

// a worm of n chips following its head along a path; chips behind a slab's front face (y < cut) are hidden
export const chain = (path: Path, head: number, n: number, tag: string, o: { src?: number; tgt?: number; flare?: number; k?: number; eye?: number } = {}): Item[] => {
  const k = o.k ?? 1;
  return Array.from({ length: n }, (_, i) => {
    const s = head - (i === 0 ? 0 : (30 + (i - 1) * SP) * k);
    const q = atSmooth(path, s);
    const cut = s < path.L / 2 ? o.src : o.tgt;
    return {
      key: q.x + q.y,
      el: <ChipBlock key={`${tag}${i}`} x={q.x} y={q.y} ang={q.ang} s={(i === 0 ? HEAD : CHIP) * k} phase={s} head={i === 0} flare={i === 0 ? o.flare ?? 0 : 0} eye={o.eye ?? 1} cut={cut} />,
    };
  });
};

// the straight peek path out of a port on a +y face
export const peekPath = (x: number, fy: number, len = 130): Path => ({ pts: [[x, fy], [x, fy + len]], cum: [0, len], L: len });

export const Plate: React.FC<{ x: number; y: number; w: number; d: number; z?: number; h?: number; top?: string; tone?: Tone }> = ({ x, y, w, d, z = 0, h = 8, top = "#1b1a18", tone = INK }) => (
  <Box x={x} y={y} z={z} w={w} d={d} h={h} tone={tone} topFill={top} />
);

export const Port: React.FC<{ u: number; v: number; w?: number; h?: number; on?: number }> = ({ u, v, w = 44, h = 15, on = 0 }) => (
  <g>
    <rect x={u - w / 2} y={v} width={w} height={h} rx={2} fill="#050505" stroke={mix("#625E57", AMBER, on)} strokeWidth={2} />
    <rect x={u - w / 2} y={v} width={w} height={4} fill="#000" opacity={0.7} />
  </g>
);

// a small set-top / TV box. Port on the +y face; optional top recess (memory slot).
export const TvBox: React.FC<{ x: number; y: number; z?: number; w?: number; d?: number; h?: number; lit?: number; label?: string; labelSize?: number; slot?: number; dx?: number; dy?: number; tone?: Tone; bar?: string }> = ({
  x, y, z = 0, w = 76, d = 50, h = 40, lit = 0, label, labelSize = 17, slot, dx = 0, dy = 0, tone = STONE, bar,
}) => {
  const fy = y + d;
  const ph = Math.min(15, h * 0.4);
  return (
    <g transform={`translate(${dx} ${dy})`}>
      <Box x={x} y={y} z={z} w={w} d={d} h={h} tone={tone} />
      {slot !== undefined && (
        <polygon points={[[x + 10, y + 8], [x + w - 10, y + 8], [x + w - 10, y + d - 8], [x + 10, y + d - 8]].map(([a, b]) => `${P(a, b, z + h).join(",")}`).join(" ")} fill={mix("#050505", AMBER, slot)} stroke="#000" strokeWidth={1.5} />
      )}
      <FaceG x={x} fy={fy} z={z} h={h}>
        <rect x={7} y={5} width={w - 14} height={Math.min(11, h * 0.28)} rx={2} fill={lit > 0 ? mix("#2a2927", AMBER, lit) : "#161513"} stroke="#000" strokeWidth={1.2} />
        {label && (
          <text x={w / 2} y={h * 0.62} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={labelSize} fill="#141413" letterSpacing={0.3}>
            {label}
          </text>
        )}
        {bar && <rect x={9} y={7} width={w - 18} height={4} fill={bar} />}
        <Port u={w / 2} v={h - ph} h={ph} on={lit} />
      </FaceG>
    </g>
  );
};

export const Oven: React.FC<{ x: number; y: number; w?: number; d?: number; h?: number; lit?: number; dx?: number; dy?: number }> = ({ x, y, w = 100, d = 80, h = 100, lit = 0, dx = 0, dy = 0 }) => {
  const fy = y + d;
  return (
    <g transform={`translate(${dx} ${dy})`}>
      <Box x={x} y={y} w={w} d={d} h={h} tone={MID} />
      <FaceG x={x} fy={fy} z={0} h={h}>
        {[0, 1, 2, 3].map((k) => (
          <circle key={k} cx={16 + k * ((w - 32) / 3)} cy={12} r={5} fill="#17161A" stroke="#000" strokeWidth={1} />
        ))}
        <rect x={10} y={24} width={w - 20} height={46} rx={3} fill={lit > 0 ? mix("#111", AMBER, lit) : "#0c0c0b"} stroke="#000" strokeWidth={1.6} />
        {lit > 0.2 && <rect x={16} y={30} width={w - 32} height={34} rx={2} fill={HOTc} opacity={0.35 * lit} />}
        <Port u={w / 2} v={h - 16} w={48} h={16} on={lit} />
      </FaceG>
    </g>
  );
};
const HOTc = "#FFF1CF";

export const Rack: React.FC<{ x: number; y: number; lit?: number; f: number; dx?: number; dy?: number; h?: number }> = ({ x, y, lit = 0, f, dx = 0, dy = 0, h = 190 }) => {
  const fy = y + 80;
  const led = (k: number) => (lit > 0.5 || Math.sin(f * 0.35 + k * 2.1) > -0.2 ? AMBER : "#5A4624");
  return (
    <g transform={`translate(${dx} ${dy})`}>
      <Box x={x} y={y} w={80} d={80} h={h} tone={MID} />
      <FaceG x={x} fy={fy} z={0} h={h}>
        {[0, 1, 2, 3].map((k) => (
          <g key={k}>
            <rect x={8} y={12 + k * 34} width={64} height={26} rx={2} fill={lit > 0 ? mix("#1A1917", "#3a2a0c", lit) : "#1A1917"} stroke="#000" strokeWidth={1.2} />
            <circle cx={17} cy={25 + k * 34} r={3.4} fill={led(k)} />
            <line x1={30} y1={20 + k * 34} x2={64} y2={20 + k * 34} stroke="#46433E" strokeWidth={2} />
            <line x1={30} y1={30 + k * 34} x2={64} y2={30 + k * 34} stroke="#46433E" strokeWidth={2} />
          </g>
        ))}
        <Port u={40} v={h - 32} w={48} h={32} on={lit} />
      </FaceG>
    </g>
  );
};

export { PAD, PAPER };
export const smooth = (t: number) => Easing.inOut(Easing.cubic)(Math.min(1, Math.max(0, t)));
// screen point -> world (x, y) on the floor
export const W2 = (sx: number, sy: number, z = 0): [number, number] => [(sx / K + 2 * (sy + z)) / 2, (2 * (sy + z) - sx / K) / 2];

// ---- shared bits for the extra scenes
export const LetterBlock: React.FC<{ x: number; y: number; w?: number; d?: number; h?: number; text: string; tone?: Tone; ink?: string; fs?: number; z?: number }> = ({
  x, y, w = 70, d = 70, h = 70, text, tone = PAPER, ink = "#000", fs = 56, z = 0,
}) => (
  <g>
    <Box x={x} y={y} z={z} w={w} d={d} h={h} tone={tone} />
    <FaceG x={x} fy={y + d} z={z} h={h}>
      <text x={w / 2} y={h / 2 + fs * 0.36} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={fs} fill={ink} letterSpacing={2}>
        {text}
      </text>
    </FaceG>
  </g>
);

// a paper note standing on the floor or hovering: header, lines and a small arrow
export const NoteCard: React.FC<{ x: number; y: number; z?: number; w?: number; h?: number; glow?: number }> = ({ x, y, z = 0, w = 120, h = 150, glow = 0 }) => (
  <g>
    <Box x={x} y={y} z={z} w={w} d={8} h={h} tone={{ t: "#FEFCF9", l: "#FEFCF9", r: "#C4BCB0", g: "gPaper" }} />
    <FaceG x={x} fy={y + 8} z={z} h={h}>
      <rect x={0} y={0} width={w} height={h} fill="none" stroke={AMBER} strokeWidth={glow > 0 ? 5 : 0} />
      <text x={w / 2} y={h * 0.2} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={h * 0.13} letterSpacing={3} fill="#000">NOTE</text>
      {[0.36, 0.5, 0.64].map((v, i) => (
        <rect key={i} x={w * 0.14} y={h * v} width={w * (i === 2 ? 0.42 : 0.72)} height={h * 0.04} rx={2} fill="#6B675F" opacity={0.7} />
      ))}
      <path d={`M${w * 0.2} ${h * 0.84} H${w * 0.74} M${w * 0.62} ${h * 0.76} L${w * 0.76} ${h * 0.84} L${w * 0.62} ${h * 0.92}`} fill="none" stroke="#000" strokeWidth={h * 0.04} strokeLinecap="round" strokeLinejoin="round" />
    </FaceG>
  </g>
);

// ---- camera: shots blended with eased whips, then low-passed so velocity is always continuous
export type Cam = [number, number, number, number]; // fx, fy, scale, cy
export type Shot = { keys: KF[] };
export type Whip = [number, number]; // frame window between shot i and i+1
const sm5 = (t: number) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep: zero velocity and acceleration at both ends
export const shotCam = (shots: { keys: KF[] }[], whips: Whip[], f: number): Cam => {
  let i = 0;
  while (i < whips.length && f >= whips[i][1]) i++;
  const A = spline(shots[i].keys, f);
  if (i < whips.length && f >= whips[i][0]) {
    const e = sm5((f - whips[i][0]) / (whips[i][1] - whips[i][0]));
    const B = spline(shots[i + 1].keys, f);
    return [0, 1, 2, 3].map((j) => A[j] + (B[j] - A[j]) * e) as Cam;
  }
  return A;
};
export const lowpass = (fn: (f: number) => Cam, f: number, lo: number, hi: number, r = 5): Cam => {
  let w = 0;
  const out: Cam = [0, 0, 0, 0];
  for (let k = -r; k <= r; k++) {
    const ww = r + 1 - Math.abs(k);
    const c = fn(Math.min(hi, Math.max(lo, f + k)));
    for (let j = 0; j < 4; j++) out[j] += c[j] * ww;
    w += ww;
  }
  return out.map((v) => v / w) as Cam;
};
// screen-space speed (px per frame) for the motion blur
export const blurOf = (fn: (f: number) => Cam, f: number, k = 0.28, cap = 46): [number, number] => {
  const a = fn(f);
  const b = fn(f - 1);
  const sx = Math.abs(a[0] - b[0]) * a[2];
  const sy = Math.abs(a[1] - b[1]) * a[2];
  const m = (v: number) => Math.min(cap, Math.max(0, v - 4) * k);
  return [m(sx), m(sy)];
};

// ---- label that rises 28px and un-blurs from 10px (DESIGN.md), leaves by drifting up 12px
export const Lab2: React.FC<LabProps2> = ({ fx, s, x, y, z, at: a, out, text, size = 30, fill = "#FEFCF9", ink = "#000" }) => {
  const f = useCurrentFrame();
  if (f < a || (out !== undefined && f > out)) return null;
  const u = Easing.out(Easing.cubic)(Math.min(1, (f - a) / 14));
  const q = out !== undefined ? Math.min(1, Math.max(0, (f - (out - 8)) / 8)) : 0;
  const [px, py] = P(x, y, z);
  const w = text.length * size * 0.66 + size * 1.1;
  const h = size * 1.5;
  const half = (w * 1.06 * s) / 2;
  const sxp = 540 + (px - fx) * s;
  const c = 1000 - half < 80 + half ? 540 : Math.min(1000 - half, Math.max(80 + half, sxp));
  const dx = (c - sxp) / s;
  const id = `lb${Math.round(a)}${text.length}${Math.round(x)}`;
  const bl = ((1 - u) * 10) / s;
  return (
    <g transform={`translate(${px + dx} ${py})`} opacity={u * (1 - q)}>
      <defs>
        <filter id={id} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation={bl} />
        </filter>
      </defs>
      <g transform={`translate(0 ${((1 - u) * 28 - q * 12) / s}) translate(0 ${-Math.sin(f / 11) * 3})`} filter={bl > 0.2 ? `url(#${id})` : undefined}>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={fill} />
        <text textAnchor="middle" dominantBaseline="central" y={2} fontFamily={sans} fontWeight={700} fontSize={size} fill={ink} letterSpacing={2}>
          {text}
        </text>
      </g>
    </g>
  );
};
export type LabProps2 = { fx: number; s: number; x: number; y: number; z: number; at: number; out?: number; text: string; size?: number; fill?: string; ink?: string };

// heading smoothed over the corner of a path so a walking chip never snaps to a new direction
export const atSmooth = (p: Path, s: number) => {
  const q = at(p, s);
  const a = at(p, s - 10);
  const b = at(p, s + 10);
  const ang = Math.atan2(Math.sin(a.ang) + Math.sin(q.ang) + Math.sin(b.ang), Math.cos(a.ang) + Math.cos(q.ang) + Math.cos(b.ang));
  return { x: q.x, y: q.y, ang };
};
