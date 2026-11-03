import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, sans, seg, serif } from "../iso";
import { Stage2 } from "../ara/AraIso-kit";
import { AMBER, HOT, mix } from "../ara/AraIso";
import { RDisc, RGlow, RGrid, RPaint, RPrism, RTop, ViewProvider, blurOfPose, drift, mkView, poseAt, proj } from "../ara/AraIso-rot";
import type { Item3, Pose, PoseKey, View } from "../ara/AraIso-rot";

export { AMBER, HOT, mix, RPaint, RPrism, RTop, RDisc, RGlow, proj };
export const RRingX = null;
export type { Item3, PoseKey, View };
export { P0 } from "../ara/AraIso-rot";

// ============================================================ one isometric DJ booth, shared by every slot
// World: x right, y toward the viewer, z up. The desk top is at z = DT.
export const GREEN = "#8ECC9F";
export const PAPER = "#FEFCF9";
export const MUTED = "#C4BCB0";
export const RED = "#E5484D";
export const LINE = "#B7B1A6"; // paper-ish stroke on dark bodies
export const DT = 60;
export const ease3 = Easing.inOut(Easing.cubic);
export const ease = (f: number, a: number, b: number) => seg(f, a, b, ease3);
export const easeO = (f: number, a: number, b: number) => seg(f, a, b, Easing.out(Easing.cubic));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const hash = (n: number) => Math.abs(Math.sin(n * 12.9898 + 4.1) * 43758.5453) % 1;

type Tone = { t: string; l: string; r: string };
export const DK: Tone = { t: "#262522", l: "#302e2b", r: "#1b1a18" };
export const DK2: Tone = { t: "#3a3834", l: "#45423d", r: "#26241f" };
export const PAPERT: Tone = { t: "#FEFCF9", l: "#E3DED5", r: "#B2ACA2" };

// positions of the booth parts
export const CRATE = { x: -460, y: 10, w: 120, d: 160 };
export const CUTTER = { x: -330, y: 30, w: 190, d: 110 };
export const PRESS_X = -235; // where the strip is cut
export const TRAY = { x: -205, y: 30, w: 140, d: 180 };
export const MIXER = { x: -55, y: 10 };
export const PLATTER = { x: 245, y: 90, r: 78 };
export const SPOT = { x: 140, y: -75 }; // where a character stands, behind the desk

// the item's far (smallest depth) corner, so things standing on it are drawn after it
export const far = (v: View, x0: number, y0: number, x1: number, y1: number): [number, number] => [v.sn >= 0 ? x0 : x1, v.cs >= 0 ? y0 : y1];

export const DBox: React.FC<{ x: number; y: number; z?: number; w: number; d: number; h: number; tone?: Tone; top?: string; stroke?: string; sw?: number; op?: number }> = ({ x, y, z = 0, w, d, h, tone = DK, top, stroke = LINE, sw = 1.3, op = 1 }) => (
  <g opacity={op}>
    <RPrism pts={[[x, y], [x + w, y], [x + w, y + d], [x, y + d]]} z={z} h={h} tone={tone} top={top} stroke={stroke} sw={sw} />
  </g>
);
const boxItem = (v: View, x: number, y: number, w: number, d: number, z: number, el: React.ReactNode): Item3 => {
  const [fx, fy] = far(v, x, y, x + w, y + d);
  return { x: fx, y: fy, z, el };
};

// ------------------------------------------------------------ the desk and floor (drawn before everything else)
export const Desk: React.FC<{ glow?: number; back?: number }> = ({ glow = 0, back = 0 }) => (
  <g>
    <DBox x={-470} y={-45 - back} z={0} w={910} d={260 + back} h={DT} tone={DK} top="#171615" />
    <DBox x={-470} y={-45 - back} z={DT - 6} w={910} d={260 + back} h={6} tone={DK2} top="#1b1a18" stroke="#6f6a62" />
    {glow > 0 && <RGlow x={30} y={80} z={DT} r={260} op={glow * 0.5} />}
  </g>
);
export const Floor: React.FC<{ cx?: number; cy?: number }> = ({ cx = 0, cy = 0 }) => <RGrid x0={cx - 1500} x1={cx + 1500} y0={cy - 1500} y1={cy + 1500} step={100} op={0.07} />;

// ------------------------------------------------------------ record crate: sleeves standing in a row (grows into a wall)
export const crateItems = (v: View, o: { n?: number; grow?: number; books?: boolean; x?: number; y?: number; z?: number; sweep?: number } = {}): Item3[] => {
  const { n = 14, grow = 0, books = false, x = CRATE.x, y = CRATE.y, z = DT, sweep = 0 } = o;
  const items: Item3[] = [];
  const body = <DBox key="cb" x={x} y={y} z={z} w={CRATE.w} d={CRATE.d} h={26} tone={DK2} top="#141312" />;
  items.push(boxItem(v, x, y, CRATE.w, CRATE.d, z, body));
  const wmax = CRATE.w - 12;
  for (let i = 0; i < n; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const rows = Math.ceil(n / 2);
    const sx = x + 8 + (i % 6) * ((wmax - 8) / 6);
    const sy = y + 8 + Math.floor(i / 6) * 10;
    const rise = 26 + 30 * hash(i) + grow * (40 + 150 * hash(i + 9)) * (1 + Math.floor(i / 6) * 0.4);
    const sw = (wmax - 8) / 6 - 3;
    void col; void row; void rows;
    const tone = books ? { t: i % 3 === 0 ? PAPER : "#d8d3c9", l: "#bfb9ae", r: "#8d877d" } : { t: "#232220", l: "#2d2b29", r: "#181716" };
    items.push({
      x: sx,
      y: sy,
      z: z + 26,
      el: (
        <g key={`s${i}`}>
          <DBox x={sx} y={sy} z={z + 18} w={sw} d={CRATE.d - 20 - Math.floor(i / 6) * 8} h={rise} tone={tone} top={books ? "#eae5dc" : "#2a2927"} stroke={books ? "#6f6a62" : LINE} sw={1.1} />
        </g>
      ),
    });
  }
  void sweep;
  return items;
};

// ------------------------------------------------------------ a vinyl record on a platter or held out (flat disc)
export const Record: React.FC<{ x: number; y: number; z: number; r?: number; rot?: number; label?: string; labelCol?: string; blank?: boolean; wave?: number[] }> = ({ x, y, z, r = 62, rot = 0, label, labelCol = AMBER, blank, wave }) => {
  const v = useV();
  const [cx, cy] = proj(v, x, y, z);
  const rx = r * v.Z;
  const ry = rx * v.sp;
  const a = (rot * Math.PI) / 180;
  const grooves = [0.88, 0.76, 0.64, 0.52];
  return (
    <g>
      <RDisc x={x} y={y} z={z} r={r} t={4} top="#0c0c0b" side="#1b1a18" stroke={LINE} />
      {!blank && grooves.map((g, i) => <ellipse key={i} cx={cx} cy={cy} rx={rx * g} ry={ry * g} fill="none" stroke="#3a3835" strokeWidth={1.2} />)}
      {/* a bright sector so the spin reads */}
      <path d={`M${cx} ${cy} L${cx + rx * 0.92 * Math.cos(a)} ${cy + ry * 0.92 * Math.sin(a)} A${rx * 0.92} ${ry * 0.92} 0 0 1 ${cx + rx * 0.92 * Math.cos(a + 0.5)} ${cy + ry * 0.92 * Math.sin(a + 0.5)} Z`} fill="#ffffff" opacity={0.08} />
      {wave && (
        <polyline
          points={wave.map((w, i) => {
            const t = (i / (wave.length - 1)) * 2 - 1;
            const px = proj(v, x + t * r * 0.8, y, z)[0];
            const py = proj(v, x + t * r * 0.8, y + w * r * 0.3, z)[1];
            return `${px},${py}`;
          }).join(" ")}
          fill="none"
          stroke={AMBER}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <ellipse cx={cx} cy={cy} rx={rx * 0.3} ry={ry * 0.3} fill={blank ? "#cfc9be" : labelCol} stroke="#000" strokeWidth={1.2} />
      {label && (
        <RTop x={x} y={y} z={z}>
          <text transform={`rotate(${rot})`} x={0} y={r * 0.08} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={r * 0.17} fill="#000">
            {label}
          </text>
        </RTop>
      )}
      <ellipse cx={cx} cy={cy} rx={rx * 0.04} ry={ry * 0.04} fill="#000" />
    </g>
  );
};

// ------------------------------------------------------------ turntable: plinth + platter + a record
export const platterItems = (v: View, o: { rot?: number; label?: string; blank?: boolean; labelCol?: string; wave?: number[]; glow?: number; x?: number; y?: number; r?: number } = {}): Item3[] => {
  const { rot = 0, label, blank, labelCol, wave, glow = 0, x = PLATTER.x, y = PLATTER.y, r = PLATTER.r } = o;
  const body = (
    <g key="pl">
      <DBox x={x - r - 14} y={y - r - 14} z={DT} w={2 * r + 28} d={2 * r + 28} h={14} tone={DK2} top="#181716" />
      {glow > 0 && <RGlow x={x} y={y} z={DT + 16} r={r * 1.6} op={glow} />}
    </g>
  );
  const [fx, fy] = far(v, x - r - 14, y - r - 14, x + r + 14, y + r + 14);
  return [
    { x: fx, y: fy, z: DT, el: body },
    { x, y, z: DT + 15, el: <Record key="rec" x={x} y={y} z={DT + 16} r={r} rot={rot} label={label} blank={blank} labelCol={labelCol} wave={wave} /> },
  ];
};

// ------------------------------------------------------------ knobs
export type Knob = { a: number; glow?: number; green?: number; tw?: number };
export const KnobEl: React.FC<{ x: number; y: number; z: number; a: number; glow?: number; green?: number; r?: number }> = ({ x, y, z, a, glow = 0, green = 0, r = 12 }) => {
  const v = useV();
  const top = green > 0 ? mix("#3a3835", GREEN, green) : glow > 0 ? mix("#3a3835", AMBER, glow) : "#34322f";
  const rad = (a * Math.PI) / 180;
  const [cx, cy] = proj(v, x, y, z + 8);
  const [ix, iy] = proj(v, x + Math.cos(rad) * r * 0.85, y + Math.sin(rad) * r * 0.85, z + 8);
  return (
    <g>
      {(glow > 0.05 || green > 0.05) && <RGlow x={x} y={y} z={z} r={r * 2.4} op={Math.max(glow, green) * 0.75} />}
      <RDisc x={x} y={y} z={z} r={r + 3} t={3} top="#121110" side="#0b0b0a" stroke="#55514b" />
      <RDisc x={x} y={y} z={z + 3} r={r} t={6} top={top} side={green > 0 ? "#4B8560" : "#201f1d"} stroke={green > 0 ? "#bfe6cb" : LINE} />
      <line x1={cx} y1={cy} x2={ix} y2={iy} stroke={green > 0 ? "#06150c" : PAPER} strokeWidth={Math.max(2, 2.6 * (v.Z / 1.22))} strokeLinecap="round" />
    </g>
  );
};
// a mixer: body + a grid of knobs. nx columns along x, ny rows going back (-y); the front edge sits at y0+d.
export const mixerDims = (nx: number, ny: number, pitch = 34) => ({ w: nx * pitch + 36, d: ny * pitch + 36 });
export const mixerItems = (v: View, o: { nx?: number; ny?: number; x?: number; yFront?: number; pitch?: number; knob: (i: number, j: number) => Knob; z?: number; r?: number }): Item3[] => {
  const { nx = 4, ny = 3, x = MIXER.x, yFront = MIXER.y + 142, pitch = 34, knob, z = DT, r = 11 } = o;
  const { w, d } = mixerDims(nx, ny, pitch);
  const y = yFront - d;
  const items: Item3[] = [boxItem(v, x, y, w, d, z, <DBox key="mx" x={x} y={y} z={z} w={w} d={d} h={22} tone={DK2} top="#171615" />)];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = knob(i, j);
      const kx = x + 18 + pitch / 2 + i * pitch;
      const ky = y + 18 + pitch / 2 + j * pitch;
      items.push({ x: kx, y: ky, z: z + 22, el: <KnobEl key={`k${i}_${j}`} x={kx} y={ky} z={z + 22} a={k.a + (k.tw ?? 0)} glow={k.glow} green={k.green} r={r} /> });
    }
  }
  return items;
};

// ------------------------------------------------------------ fader bank
export const faderItems = (v: View, o: { n: number; x: number; y: number; heights: (i: number) => number; green?: (i: number) => number; pitch?: number; len?: number; z?: number }): Item3[] => {
  const { n, x, y, heights, green = () => 0, pitch = 13, len = 78, z = DT } = o;
  const w = n * pitch + 20;
  const items: Item3[] = [boxItem(v, x, y, w, len + 24, z, <DBox key="fb" x={x} y={y} z={z} w={w} d={len + 24} h={14} tone={DK2} top="#151413" />)];
  for (let i = 0; i < n; i++) {
    const fx = x + 10 + i * pitch;
    const h = heights(i);
    const g = green(i);
    const cy = y + 12 + (1 - h) * len;
    items.push({
      x: fx + 4,
      y: y + 12,
      z: z + 14,
      el: (
        <g key={`f${i}`}>
          <DBox x={fx + 3} y={y + 12} z={z + 14} w={3} d={len} h={1.5} tone={{ t: "#050505", l: "#050505", r: "#050505" }} top="#050505" stroke="#2c2b29" sw={0.8} />
          {g > 0.05 && <RGlow x={fx + 4.5} y={cy + 6} z={z + 16} r={22} op={g * 0.8} />}
          <DBox x={fx - 1} y={cy} z={z + 15} w={11} d={13} h={7} tone={g > 0 ? { t: mix("#4a4742", GREEN, g), l: mix("#2e2c29", "#6BAA7D", g), r: mix("#1c1b19", "#4B8560", g) } : { t: "#4a4742", l: "#2e2c29", r: "#1c1b19" }} top={g > 0 ? mix("#4a4742", GREEN, g) : "#55524c"} stroke={g > 0 ? "#bfe6cb" : LINE} sw={1} />
        </g>
      ),
    });
  }
  return items;
};

// ------------------------------------------------------------ a flat tile (a word card, a strip, a token chip) with text on top
export const Tile: React.FC<{ x: number; y: number; z: number; w: number; d?: number; h?: number; text?: string; tone?: Tone; ink?: string; fs?: number; stroke?: string; op?: number; top?: string; glow?: number }> = ({
  x, y, z, w, d = 36, h = 8, text, tone = PAPERT, ink = "#0b0b0a", fs, stroke = "#000", op = 1, top, glow = 0,
}) => (
  <g opacity={op}>
    {glow > 0 && <RGlow x={x + w / 2} y={y + d / 2} z={z} r={Math.max(w, d) * 0.8} op={glow} />}
    <DBox x={x} y={y} z={z} w={w} d={d} h={h} tone={tone} top={top} stroke={stroke} sw={1.3} />
    {text && (
      <RTop x={x} y={y} z={z + h}>
        <text x={w / 2} y={d / 2 + (fs ?? d * 0.5) * 0.36} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={fs ?? d * 0.5} fill={ink} letterSpacing={0.5}>
          {text}
        </text>
      </RTop>
    )}
  </g>
);

// ------------------------------------------------------------ token cutter: a small press over a feed bed
export const cutterItems = (v: View, o: { press: number; x?: number; y?: number }): Item3[] => {
  const { press, x = CUTTER.x, y = CUTTER.y } = o;
  const z = DT;
  const items: Item3[] = [];
  // bed (the strip runs along +x through the press); the out tray is separate
  items.push(boxItem(v, x, y, CUTTER.w - 60, CUTTER.d, z, <DBox key="cbed" x={x} y={y} z={z} w={CUTTER.w - 60} d={CUTTER.d} h={14} tone={DK2} top="#131211" />));
  items.push(boxItem(v, TRAY.x, TRAY.y, TRAY.w, TRAY.d, z, <DBox key="tray" x={TRAY.x} y={TRAY.y} z={z} w={TRAY.w} d={TRAY.d} h={6} tone={DK2} top="#0f0f0e" />));
  // two posts and a cross-head that slides down
  const px = x + (PRESS_X - CUTTER.x) - 14;
  for (const sy of [y + 8, y + CUTTER.d - 20]) {
    items.push({ x: px, y: sy, z: z + 14, el: <DBox key={`post${sy}`} x={px} y={sy} z={z + 14} w={28} d={12} h={84} tone={DK2} top="#201f1d" /> });
  }
  const hz = z + 14 + 14 + (1 - press) * 56;
  items.push({ x: px, y: y + 8, z: z + 100, el: <DBox key="head" x={px - 2} y={y + 8} z={hz} w={32} d={CUTTER.d - 16} h={14} tone={{ t: "#8F8A82", l: "#6B675F", r: "#46433E" }} top="#a8a298" stroke={PAPER} /> });
  return items;
};

// ------------------------------------------------------------ text helpers (overlay layer)
export const rise = (f: number, a: number, out?: number): React.CSSProperties => {
  const u = easeO(f, a, a + 16);
  const q = out !== undefined ? seg(f, out - 8, out, Easing.in(Easing.quad)) : 0;
  return { opacity: u * (1 - q), transform: `translateY(${(1 - u) * 28 - q * 12}px)`, filter: `blur(${(1 - u) * 10}px)` };
};
export const Header: React.FC<{ f: number; at: number; out?: number; text: React.ReactNode; size?: number; top?: number; color?: string; sub?: string }> = ({ f, at, out, text, size = 168, top = 250, color = PAPER, sub }) => {
  if (f < at || (out !== undefined && f > out)) return null;
  return (
    <div style={{ position: "absolute", left: 80, width: 920, top, textAlign: "center", fontFamily: serif, fontSize: size, lineHeight: 1.02, letterSpacing: 4, color, textShadow: "0 4px 30px #000", whiteSpace: "nowrap", ...rise(f, at, out) }}>
      {text}
      {sub && <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 26, letterSpacing: 6, color: MUTED, marginTop: 14 }}>{sub}</div>}
    </div>
  );
};
export const Small: React.FC<{ f: number; at: number; out?: number; text: React.ReactNode; top: number; color?: string; size?: number }> = ({ f, at, out, text, top, color = MUTED, size = 28 }) => {
  if (f < at || (out !== undefined && f > out)) return null;
  return (
    <div style={{ position: "absolute", left: 80, width: 920, top, textAlign: "center", fontFamily: sans, fontWeight: 600, fontSize: size, letterSpacing: 3, color, textShadow: "0 2px 14px #000", ...rise(f, at, out) }}>
      {text}
    </div>
  );
};

// ------------------------------------------------------------ the slot wrapper: camera poses, motion blur, edge fades, depth-sorted scene
export const DjSlot: React.FC<{
  frames: number;
  keys: PoseKey[];
  scene: (f: number, v: View) => React.ReactNode;
  overlay?: (f: number) => React.ReactNode;
  driftAmp?: number;
  inFade?: number;
  outFade?: number;
  endPush?: number;
  extraPose?: (f: number, p: Pose) => Pose;
}> = ({ frames, keys, scene, overlay, driftAmp = 0.7, inFade = 6, outFade = 7, endPush = 0.08, extraPose }) => {
  const f = useCurrentFrame();
  const poseFn = (g: number): Pose => {
    let p = drift(poseAt(keys, g), g, driftAmp);
    const push = ease(g, frames - 14, frames - 1);
    p = { ...p, zoom: p.zoom * (1 + endPush * push) };
    return extraPose ? extraPose(g, p) : p;
  };
  const v = mkView(poseFn(f));
  const mb = blurOfPose(poseFn, f);
  const fade = Math.max(inFade > 0 ? 1 - interpolate(f, [0, inFade], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0, interpolate(f, [frames - outFade, frames - 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <Stage2 fx={540} fy={0} s={1} cy={0} blur={mb} noGrid overlay={<>{overlay?.(f)}<div style={{ position: "absolute", inset: 0, background: "#000", opacity: fade, pointerEvents: "none" }} /></>}>
      <ViewProvider value={v}>{scene(f, v)}</ViewProvider>
    </Stage2>
  );
};
import { useV } from "../ara/AraIso-rot";
export { useV };
void C;
