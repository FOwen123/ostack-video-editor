// 1024 "Gold is fucked???": what every shot shares, in the approved isometric-diorama look of the S06 style frame (solid
// SVG objects, four-tone shading, a dark gridded floor, one accent: gold). Built on the house iso kit (../iso26/kit).
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { RDisc, RGrid, RPrism, ease, easeO, hash, poseAt, proj, rise, sans, serif, MUTED, PAPER } from "../iso26/kit";
import type { PoseKey, View } from "../iso26/kit";
import { Stage2 } from "../ara/AraIso-kit";
import { mix as mixC } from "../ara/AraIso";
import { ViewProvider, blurOfPose, drift, mkView } from "../ara/AraIso-rot";
import type { Pose } from "../ara/AraIso-rot";

export * from "../iso26/kit";
export { SLOTS, cue } from "./cues";

export const GOLDC = "#FFC23D"; // the accent: the glow of the mercury becoming gold
export type Tone = { t: string; l: string; r: string };
export const TONE_GOLD: Tone = { t: GOLDC, l: "#E0A126", r: "#9A6A14" };
export const TONE_STEEL: Tone = { t: "#3a3834", l: "#2c2a27", r: "#1a1917" };
export const TONE_SILVER: Tone = { t: "#C4BCB0", l: "#8a8378", r: "#5a5650" };
export const TONE_DARK: Tone = { t: "#262422", l: "#1d1c1a", r: "#141312" };
export type P3 = { x: number; y: number; z: number };
const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// camera depth (bigger = nearer), for painter's order of free-standing things
export const depth = (v: View, x: number, y: number, z: number) => (x * v.sn + y * v.cs) * v.cp + z * v.sp;
export const rotZ = (p: P3, a: number): P3 => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a), z: p.z });
export type Item = { d: number; el: React.ReactNode };
export const Sorted: React.FC<{ items: Item[] }> = ({ items }) => <>{[...items].sort((a, b) => a.d - b.d).map((it, i) => <React.Fragment key={i}>{it.el}</React.Fragment>)}</>;

// the full-screen shot (S06's camera: eased keys, a slight drift, a small push over the last 14 frames, motion blur
// except on `sharp` frames, a 3-frame fade to black at the end), on the dark gridded floor
export const Shot: React.FC<{ frames: number; keys: PoseKey[]; scene: (f: number, v: View) => React.ReactNode; overlay?: (f: number, v: View) => React.ReactNode; amp?: number; sharp?: number[]; push?: number }> = ({ frames, keys, scene, overlay, amp = 0.3, sharp = [], push = 0.04 }) => {
  const f = useCurrentFrame();
  const poseFn = (g: number): Pose => {
    const p = drift(poseAt(keys, g), g, amp);
    return { ...p, zoom: p.zoom * (1 + push * ease(g, frames - 14, frames - 1)) };
  };
  const v = mkView(poseFn(f));
  const out = interpolate(f, [frames - 3, frames - 1], [0, 1], CL);
  return (
    <Stage2 fx={540} fy={0} s={1} cy={0} blur={sharp.indexOf(f) >= 0 ? undefined : blurOfPose(poseFn, f)} noGrid overlay={<>{overlay?.(f, v)}<AbsoluteFill style={{ background: "#000", opacity: out }} /></>}>
      <ViewProvider value={v}>
        <GDefs />
        <RGrid x0={-1600} x1={1600} y0={-1600} y1={1600} step={100} op={0.06} />
        {scene(f, v)}
      </ViewProvider>
    </Stage2>
  );
};

// gradients: shaded spheres (silver/graphite protons and neutrons, their gold versions), glows, liquid mercury
export const GDefs: React.FC = () => {
  const sph = (id: string, hi: string, mid: string, lo: string) => (
    <radialGradient id={id} cx={0.5} cy={0.5} r={0.5} fx={0.36} fy={0.32}>
      <stop offset={0} stopColor={hi} />
      <stop offset={0.55} stopColor={mid} />
      <stop offset={1} stopColor={lo} />
    </radialGradient>
  );
  const glow = (id: string, c: string, a: number) => (
    <radialGradient id={id}>
      <stop offset={0} stopColor={c} stopOpacity={a} />
      <stop offset={0.55} stopColor={c} stopOpacity={a * 0.26} />
      <stop offset={1} stopColor={c} stopOpacity={0} />
    </radialGradient>
  );
  return (
    <defs>
      {sph("sp", "#FFFFFF", "#CFCAC2", "#6f6a62")}
      {sph("sn", "#8a857d", "#55524c", "#232220")}
      {sph("gp", "#FFF3CF", GOLDC, "#9A6A14")}
      {sph("gn", "#D9A04A", "#94621A", "#3d2706")}
      {sph("hg", "#FFFFFF", "#B9B3AA", "#3f3c38")}
      <linearGradient id="steelSide" x1={0} x2={1} y1={0} y2={0}>
        <stop offset={0} stopColor="#3a3834" />
        <stop offset={0.45} stopColor="#2c2a27" />
        <stop offset={1} stopColor="#141312" />
      </linearGradient>
      {glow("goldGlow", GOLDC, 0.55)}
      {glow("paperGlow", PAPER, 0.4)}
    </defs>
  );
};

// a soft round glow around a world point (screen-space circle), or a pool of it on the floor
export const Glow: React.FC<{ v: View; x: number; y: number; z: number; r: number; op: number; id?: string }> = ({ v, x, y, z, r, op, id = "goldGlow" }) => {
  if (op <= 0.01) return null;
  const [cx, cy] = proj(v, x, y, z);
  return <circle cx={cx} cy={cy} r={r * v.Z} fill={`url(#${id})`} opacity={op} />;
};
export const Pool: React.FC<{ v: View; x: number; y: number; z?: number; r: number; op: number; id?: string }> = ({ v, x, y, z = 0, r, op, id = "goldGlow" }) => {
  if (op <= 0.01) return null;
  const [cx, cy] = proj(v, x, y, z);
  return <ellipse cx={cx} cy={cy} rx={r * v.Z} ry={r * v.Z * v.sp} fill={`url(#${id})`} opacity={op} />;
};

// ---------------------------------------------------------------- nuclei: shaded balls; protons carry a +
export const BR = 36;
export const Ball: React.FC<{ v: View; x: number; y: number; z: number; kind: "p" | "n"; gold?: boolean; r?: number; sx?: number; op?: number; bare?: boolean }> = ({ v, x, y, z, kind, gold = false, r: r0 = BR, sx = 1, op = 1, bare }) => {
  const [cx, cy] = proj(v, x, y, z);
  const r = r0 * v.Z;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${Math.max(0.04, sx)} 1)`} opacity={op}>
      <circle r={r} fill={`url(#${gold ? "g" : "s"}${kind})`} stroke="#000" strokeWidth={1.4} />
      {kind === "p" && !bare && <path d={`M${-r * 0.36} 0 H${r * 0.36} M0 ${-r * 0.36} V${r * 0.36}`} stroke={gold ? "#5a3b08" : "#2a2826"} strokeWidth={r * 0.13} strokeLinecap="round" />}
    </g>
  );
};
// n balls packed in a sphere of radius R (golden spiral, radius growing with the cube root so the volume fills evenly)
export const pack = (n: number, R: number): P3[] => Array.from({ length: n }, (_, i) => {
  const r = R * Math.cbrt((i + 0.5) / n);
  const zz = 1 - (2 * (i + 0.5)) / n, rr = Math.sqrt(1 - zz * zz), th = i * 2.39996;
  return { x: r * rr * Math.cos(th), y: r * rr * Math.sin(th), z: r * zz };
});
export const protonSet = (n: number, np: number, keep: number[] = [], seed = 3) => {
  const s = new Set<number>(keep);
  for (let k = 0; s.size < np; k++) s.add(Math.floor(hash(k * 7 + seed) * n));
  return s;
};
// a nucleus as depth-sorted items, so electrons or neutrons passing through it sort with its balls
export const nucleusItems = (v: View, c: P3, balls: P3[], protons: Set<number>, o: { r?: number; gold?: boolean; rot?: number; at?: (i: number, p: P3) => P3 | null; op?: number } = {}): Item[] => {
  const out: Item[] = [];
  balls.forEach((b0, i) => {
    const q = rotZ(b0, o.rot ?? 0);
    const p = o.at ? o.at(i, { x: c.x + q.x, y: c.y + q.y, z: c.z + q.z }) : { x: c.x + q.x, y: c.y + q.y, z: c.z + q.z };
    if (!p) return;
    out.push({ d: depth(v, p.x, p.y, p.z), el: <Ball v={v} x={p.x} y={p.y} z={p.z} kind={protons.has(i) ? "p" : "n"} gold={o.gold} r={o.r} op={o.op} /> });
  });
  return out;
};

// a fast neutron: a graphite ball with a pale streak behind it, at progress t (0..1) from a to b
export const Neutron: React.FC<{ v: View; a: P3; b: P3; t: number; r?: number; tail?: number; op?: number }> = ({ v, a, b, t, r = 16, tail = 0.35, op = 1 }) => {
  if (t <= 0 || op <= 0.01) return null;
  const tt = Math.min(1, t), t0 = Math.max(0, tt - tail);
  const at = (u: number) => proj(v, a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u);
  const [hx, hy] = at(tt), [sx, sy] = at(t0);
  return (
    <g opacity={op}>
      <defs>
        <linearGradient id={`tr${Math.round(sx)}${Math.round(sy)}`} gradientUnits="userSpaceOnUse" x1={sx} y1={sy} x2={hx} y2={hy}>
          <stop offset={0} stopColor={PAPER} stopOpacity={0} />
          <stop offset={1} stopColor={PAPER} stopOpacity={0.85} />
        </linearGradient>
      </defs>
      <line x1={sx} y1={sy} x2={hx} y2={hy} stroke={`url(#tr${Math.round(sx)}${Math.round(sy)})`} strokeWidth={r * v.Z * 0.9} strokeLinecap="round" />
      <circle cx={hx} cy={hy} r={r * v.Z} fill="url(#sn)" stroke="#000" strokeWidth={1.2} />
    </g>
  );
};

// ---------------------------------------------------------------- gold: bars, a pallet of them, a nugget
// a trapezoid bar: footprint w (x) by d (y) at height z, h tall, the top inset by k; sides shaded like RPrism
export const Bar: React.FC<{ v: View; x: number; y: number; z: number; w?: number; d?: number; h?: number; k?: number; tone?: Tone; op?: number; sw?: number }> = ({ v, x, y, z, w = 62, d = 30, h = 16, k = 5, tone = TONE_GOLD, op = 1, sw = 1.2 }) => {
  const B: [number, number][] = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
  const T: [number, number][] = [[x + k, y + k], [x + w - k, y + k], [x + w - k, y + d - k], [x + k, y + d - k]];
  const N: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const cam = [v.sn * v.cp, v.cs * v.cp, v.sp];
  const pts = (p: [number, number][]) => p.map((q) => q.map((n) => n.toFixed(1)).join(",")).join(" ");
  return (
    <g opacity={op} stroke="#000" strokeWidth={sw} strokeLinejoin="round">
      {N.map(([nx, ny], i) => {
        const nz = k / h; // the slope's upward lean
        if (nx * cam[0] + ny * cam[1] + nz * cam[2] <= 0) return null;
        const j = (i + 1) % 4;
        return <polygon key={i} points={pts([proj(v, B[i][0], B[i][1], z), proj(v, B[j][0], B[j][1], z), proj(v, T[j][0], T[j][1], z + h), proj(v, T[i][0], T[i][1], z + h)])} fill={mixC(tone.l, tone.r, Math.min(1, Math.max(0, ((nx - ny) / 1.414) * 0.5 + 0.5)))} />;
      })}
      <polygon points={pts(T.map(([px, py]) => proj(v, px, py, z + h)))} fill={tone.t} />
    </g>
  );
};

// a pallet stacked with gold bars: COLS x ROWS x LAYERS = 160 bars of 12.4 kg (a 400-oz good-delivery bar) = 1,984 kg,
// the 2 tonnes a year one plant could make. u(i) 0..1 lands bar i (0 = not there yet; it drops in from above).
export const PAL = { cols: 5, rows: 4, layers: 8, w: 62, d: 30, h: 16, gap: 4, base: 30 };
export const PAL_W = PAL.cols * (PAL.w + PAL.gap) + PAL.gap, PAL_D = PAL.rows * (PAL.d + PAL.gap) + PAL.gap;
export const PAL_N = PAL.cols * PAL.rows * PAL.layers;
export const PAL_H = PAL.base + PAL.layers * PAL.h;
const WOOD: Tone = { t: "#4a4742", l: "#3a3834", r: "#262422" };
export const Pallet: React.FC<{ v: View; x: number; y: number; z?: number; u?: (i: number) => number; base?: number; s?: number }> = ({ v, x, y, z = 0, u = () => 1, base = 1, s = 1 }) => {
  const thin = s * v.Z < 0.35; // hairline strokes when the pallet is a speck
  const bars: React.ReactNode[] = [];
  for (let L = 0; L < PAL.layers; L++) {
    const cells: { d: number; el: React.ReactNode }[] = [];
    for (let r = 0; r < PAL.rows; r++) for (let c = 0; c < PAL.cols; c++) {
      const i = L * PAL.cols * PAL.rows + r * PAL.cols + c;
      const ui = u(i);
      if (ui <= 0.001) continue;
      const bx = x + (PAL.gap + c * (PAL.w + PAL.gap)) * s, by = y + (PAL.gap + r * (PAL.d + PAL.gap)) * s;
      cells.push({ d: bx * v.sn + by * v.cs, el: <Bar key={i} v={v} x={bx} y={by} z={z + (PAL.base + L * PAL.h + (1 - ui) * 160) * s} w={PAL.w * s} d={PAL.d * s} h={PAL.h * s} k={4 * s} op={Math.min(1, ui * 3)} sw={thin ? 0.3 : 1.2} /> });
    }
    cells.sort((a, b) => a.d - b.d);
    bars.push(...cells.map((c) => c.el));
  }
  const W = PAL_W * s, D = PAL_D * s, B = PAL.base * s;
  return (
    <g opacity={base}>
      {[0, 0.5, 1].map((k) => <RPrism key={k} pts={[[x, y + k * (D - 14 * s)], [x + W, y + k * (D - 14 * s)], [x + W, y + k * (D - 14 * s) + 14 * s], [x, y + k * (D - 14 * s) + 14 * s]]} z={z} h={B - 8 * s} tone={WOOD} sw={thin ? 0.3 : 1.2} />)}
      <RPrism pts={[[x, y], [x + W, y], [x + W, y + D], [x, y + D]]} z={z + B - 8 * s} h={8 * s} tone={WOOD} sw={thin ? 0.3 : 1.2} />
      {bars}
    </g>
  );
};

// THE bar: the classic trapezoid ingot the mercury hardens into (s01) and the callbacks show again (s08, s15),
// centred on (x, y) and standing on height z; s scales it
export const Ingot: React.FC<{ v: View; x: number; y: number; z: number; s?: number; op?: number }> = ({ v, x, y, z, s = 1, op = 1 }) => {
  const w = 220 * s, d = 100 * s;
  return <Bar v={v} x={x - w / 2} y={y - d / 2} z={z} w={w} d={d} h={46 * s} k={13 * s} op={op} sw={1.6} />;
};

// a drop of liquid mercury sitting at (x, y, z): a shiny dome about 2r wide; `wob` makes it tremble
export const Drop: React.FC<{ v: View; x: number; y: number; z: number; r: number; op?: number; wob?: number; f?: number; sy?: number }> = ({ v, x, y, z, r, op = 1, wob = 0, f = 0, sy = 1 }) => {
  const [cx, cy] = proj(v, x, y, z);
  const w = 1 + wob * 0.05 * Math.sin(f * 1.3);
  const rx = r * v.Z * w, base = rx * v.sp, H = r * 0.62 * v.Z * v.cp * sy / w;
  const top = cy - H, bot = cy + base, ry = (bot - top) / 2, my = (bot + top) / 2;
  return (
    <g opacity={op}>
      <ellipse cx={cx + rx * 0.06} cy={cy + base * 0.25} rx={rx * 1.06} ry={base * 1.1} fill="#000" opacity={0.6} />
      <ellipse cx={cx} cy={my} rx={rx} ry={ry} fill="url(#hg)" stroke="#000" strokeWidth={1.6} />
      <path d={`M${cx - rx * 0.78} ${my + ry * 0.18} A${rx * 0.8} ${ry * 0.8} 0 0 0 ${cx + rx * 0.78} ${my + ry * 0.18}`} fill="none" stroke="#FEFCF9" strokeOpacity={0.35} strokeWidth={rx * 0.05} strokeLinecap="round" />
      <ellipse cx={cx - rx * 0.36} cy={my - ry * 0.42} rx={rx * 0.22} ry={ry * 0.13} fill="#FFFFFF" opacity={0.95} transform={`rotate(-18 ${cx - rx * 0.36} ${my - ry * 0.42})`} />
      <ellipse cx={cx + rx * 0.3} cy={my - ry * 0.55} rx={rx * 0.07} ry={ry * 0.05} fill="#FFFFFF" opacity={0.8} />
    </g>
  );
};

// ---------------------------------------------------------------- the fusion reactor: a tokamak ring under a glass top,
// its plasma glowing inside, 12 field coils round it, on a round plinth. `plasma` 0..1 lights it; `dashed` = a blueprint.
const NCOIL = 12;
export const reactorDims = (R: number) => ({ r: R * 0.42, h: R * 0.5, base: R * 0.16, mid: R * 0.71 });
export const Reactor: React.FC<{ v: View; x: number; y: number; R?: number; plasma?: number; f?: number; dashed?: boolean; op?: number }> = ({ v, x, y, R = 220, plasma = 1, f = 0, dashed = false, op = 1 }) => {
  const { r, h, base, mid } = reactorDims(R);
  const z0 = base, z1 = base + h;
  const [cx, ct] = proj(v, x, y, z1), cb = proj(v, x, y, z0)[1];
  const rx = R * v.Z, ry = rx * v.sp, ix = r * v.Z, iy = ix * v.sp, th = ct - cb; // th < 0
  const cam = (a: number) => Math.cos(a) * v.sn + Math.sin(a) * v.cs;
  const coil = (k: number, front: boolean) => {
    const a = ((k + 0.5) / NCOIL) * 2 * Math.PI, c = Math.cos(a), s = Math.sin(a), t = 14;
    if ((cam(a) > 0) !== front) return null;
    const r0 = R - 6, r1 = R + 20;
    return <RPrism key={`c${k}`} pts={[[x + r0 * c - t * s, y + r0 * s + t * c], [x + r1 * c - t * s, y + r1 * s + t * c], [x + r1 * c + t * s, y + r1 * s - t * c], [x + r0 * c + t * s, y + r0 * s - t * c]]} z={z0 - 4} h={h + 16} tone={{ t: "#5a5650", l: "#45423d", r: "#26241f" }} sw={1.2} />;
  };
  const side = `M${cx - rx} ${ct} L${cx - rx} ${cb} A${rx} ${ry} 0 0 0 ${cx + rx} ${cb} L${cx + rx} ${ct} Z`;
  const annulus = `M${cx - rx} ${ct} A${rx} ${ry} 0 1 0 ${cx + rx} ${ct} A${rx} ${ry} 0 1 0 ${cx - rx} ${ct} Z M${cx - ix} ${ct} A${ix} ${iy} 0 1 0 ${cx + ix} ${ct} A${ix} ${iy} 0 1 0 ${cx - ix} ${ct} Z`;
  const id = `hole${Math.round(x)}_${Math.round(y)}`;
  const pl = plasma * (0.85 + 0.15 * Math.sin(f * 0.5));
  const [pcx, pcy] = proj(v, x, y, z0 + h * 0.55);
  if (dashed) {
    return (
      <g opacity={op} fill="none" stroke={MUTED} strokeWidth={2.5} strokeDasharray="10 8">
        <path d={`M${cx - rx} ${ct} L${cx - rx} ${cb} A${rx} ${ry} 0 0 0 ${cx + rx} ${cb} L${cx + rx} ${ct}`} />
        <ellipse cx={cx} cy={ct} rx={rx} ry={ry} />
        <ellipse cx={cx} cy={ct} rx={ix} ry={iy} />
      </g>
    );
  }
  return (
    <g opacity={op}>
      <Pool v={v} x={x} y={y} r={R * 2.1} op={0.35 * plasma} id="paperGlow" />
      <RDisc x={x} y={y} z={base} r={R + 44} t={base} top="#1d1c1a" side="#141312" stroke="#4a4742" />
      {Array.from({ length: NCOIL }, (_, k) => coil(k, false))}
      <path d={side} fill="url(#steelSide)" stroke="#000" strokeWidth={1.4} />
      <defs><clipPath id={id}><ellipse cx={cx} cy={ct} rx={ix} ry={iy} /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <rect x={cx - ix} y={ct - iy} width={ix * 2} height={iy * 2} fill="#24221f" />
        <ellipse cx={cx} cy={ct - th} rx={ix} ry={iy} fill="#0e0d0c" />
      </g>
      <path d={annulus} fillRule="evenodd" fill="#2c2a27" stroke="#000" strokeWidth={1.4} />
      {pl > 0.01 && (
        <g>
          <ellipse cx={pcx} cy={pcy} rx={mid * v.Z} ry={mid * v.Z * v.sp} fill="none" stroke={PAPER} strokeOpacity={0.12 * pl} strokeWidth={(R - r) * v.Z * 0.8} />
          <ellipse cx={pcx} cy={pcy} rx={mid * v.Z} ry={mid * v.Z * v.sp} fill="none" stroke="#FFF1D6" strokeOpacity={0.4 * pl} strokeWidth={(R - r) * v.Z * 0.34} />
          <ellipse cx={pcx} cy={pcy} rx={mid * v.Z} ry={mid * v.Z * v.sp} fill="none" stroke="#FFFFFF" strokeOpacity={0.95 * pl} strokeWidth={Math.max(2, (R - r) * v.Z * 0.07)} />
        </g>
      )}
      <path d={annulus} fillRule="evenodd" fill="none" stroke={PAPER} strokeOpacity={0.3} strokeWidth={1.6} />
      {Array.from({ length: NCOIL }, (_, k) => coil(k, true))}
    </g>
  );
};

// ---------------------------------------------------------------- text
// a tracked DM Sans label with a leader from the thing (x, y) to an underline at (lx, ly), all screen px
export const Tag: React.FC<{ x: number; y: number; lx: number; ly: number; text: string; op: number; color?: string; size?: number; right?: boolean; dot?: boolean }> = ({ x, y, lx, ly, text, op, color = PAPER, size = 26, right, dot = true }) => {
  if (op <= 0.01) return null;
  const w = text.length * (size * 0.68 + 3.5);
  const x2 = right ? lx - w : lx + w;
  return (
    <g opacity={op}>
      {dot && <circle cx={x} cy={y} r={5} fill={color} />}
      <polyline points={`${x},${y} ${lx},${ly} ${x2},${ly}`} fill="none" stroke={color} strokeWidth={3} />
      <text x={right ? lx : lx} y={ly - 16} textAnchor={right ? "end" : "start"} fontFamily={sans} fontWeight={700} fontSize={size} letterSpacing={3.5} fill={color}>{text}</text>
    </g>
  );
};
// a big DM Serif number centred at screen (x, y) with a small tracked label under it; enters by rising and un-blurring
export const Num: React.FC<{ f: number; at: number; x: number; y: number; text: React.ReactNode; sub?: React.ReactNode; size?: number; color?: string; out?: number; glow?: boolean }> = ({ f, at, x, y, text, sub, size = 130, color = PAPER, out, glow }) => {
  const u = easeO(f, at, at + 14) * (out === undefined ? 1 : 1 - ease(f, out - 8, out));
  if (u <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: x - 460, width: 920, top: y, textAlign: "center", opacity: u, transform: `translateY(${(1 - u) * 28}px)`, filter: `blur(${(1 - u) * 10}px)` }}>
      <div style={{ fontFamily: serif, fontSize: size, lineHeight: 1, color, textShadow: glow ? `0 0 40px ${GOLDC}66` : "0 4px 30px #000", whiteSpace: "nowrap" }}>{text}</div>
      {sub && <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 24, letterSpacing: 4, marginTop: 14, color: MUTED, whiteSpace: "nowrap" }}>{sub}</div>}
    </div>
  );
};
// a section header of one or more lines (DM Serif capitals), entering like Header
export const Head: React.FC<{ f: number; at: number; lines: string[]; size?: number; top?: number }> = ({ f, at, lines, size = 124, top = 170 }) => {
  if (f < at) return null;
  return (
    <div style={{ position: "absolute", left: 80, width: 920, top, textAlign: "center", fontFamily: serif, fontSize: size, lineHeight: 1.04, letterSpacing: 4, color: PAPER, textShadow: "0 4px 30px #000", ...rise(f, at) }}>
      {lines.map((l) => <div key={l} style={{ whiteSpace: "nowrap" }}>{l}</div>)}
    </div>
  );
};
export { CL };
