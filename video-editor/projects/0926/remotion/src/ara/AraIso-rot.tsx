import React, { createContext, useContext } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, sans } from "../iso";
import { AMBER, HOT, mix, SP, HEAD, CHIP, at, mkPath } from "./AraIso";
import type { Path } from "./AraIso";

// An orthographic isometric renderer with an animatable yaw and pitch. World: x/y on the floor, z up.
// yaw 45 deg and pitch 35.26 deg is the classic iso look; yaw 0 looks at the +y faces head-on; pitch 90 is a plan view.
//   a = dx cos(yaw) - dy sin(yaw);  b = dx sin(yaw) + dy cos(yaw)   (b grows toward the camera)
//   sx = S + Z a;  sy = S' + Z (b sin(pitch) - dz cos(pitch))
export type Pose = { yaw: number; pitch: number; zoom: number; cx: number; cy: number; cz: number; sy: number };
export type View = { yaw: number; pitch: number; cs: number; sn: number; sp: number; cp: number; Z: number; cx: number; cy: number; cz: number; sy: number };
const D2R = Math.PI / 180;
const Z0 = 1.2247;
export const mkView = (p: Pose): View => ({
  yaw: p.yaw, pitch: p.pitch, cs: Math.cos(p.yaw * D2R), sn: Math.sin(p.yaw * D2R), sp: Math.sin(p.pitch * D2R), cp: Math.cos(p.pitch * D2R), Z: Z0 * p.zoom, cx: p.cx, cy: p.cy, cz: p.cz, sy: p.sy,
});
export const proj = (v: View, x: number, y: number, z = 0): [number, number] => {
  const dx = x - v.cx;
  const dy = y - v.cy;
  const a = dx * v.cs - dy * v.sn;
  const b = dx * v.sn + dy * v.cs;
  return [540 + v.Z * a, v.sy + v.Z * (b * v.sp - (z - v.cz) * v.cp)];
};
export const depthOf = (v: View, x: number, y: number, z = 0) => x * v.sn + y * v.cs + z * 0.002;
const ViewCtx = createContext<View>(mkView({ yaw: 45, pitch: 35.264, zoom: 1, cx: 0, cy: 0, cz: 0, sy: 900 }));
export const useV = () => useContext(ViewCtx);
export const ViewProvider = ViewCtx.Provider;
export const faceVis = (v: View, nx: number, ny: number) => nx * v.sn + ny * v.cs > 0.03;

// ---- poses: hold, then an eased turn of `dur` frames that arrives at the key's frame
export type PoseKey = { f: number; dur?: number; pose: Pose };
const sm5 = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export const P0 = (yaw: number, pitch: number, zoom: number, cx: number, cy: number, cz: number, sy = 880): Pose => ({ yaw, pitch, zoom, cx, cy, cz, sy });
export const poseAt = (keys: PoseKey[], f: number): Pose => {
  let cur = keys[0].pose;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    const d = k.dur ?? 22;
    const t0 = k.f - d;
    if (f < t0) break;
    const e = sm5(Math.min(1, (f - t0) / d));
    const a = keys[i - 1].pose;
    cur = {
      yaw: a.yaw + (k.pose.yaw - a.yaw) * e, pitch: a.pitch + (k.pose.pitch - a.pitch) * e, zoom: a.zoom + (k.pose.zoom - a.zoom) * e,
      cx: a.cx + (k.pose.cx - a.cx) * e, cy: a.cy + (k.pose.cy - a.cy) * e, cz: a.cz + (k.pose.cz - a.cz) * e, sy: a.sy + (k.pose.sy - a.sy) * e,
    };
    if (f < k.f) break;
  }
  return cur;
};
// a little drift on top, so the camera is never dead still
export const drift = (p: Pose, f: number, amp = 1): Pose => ({ ...p, yaw: p.yaw + 1.6 * amp * Math.sin(f * 0.021), pitch: p.pitch + 0.8 * amp * Math.sin(f * 0.017), zoom: p.zoom * (1 + 0.006 * amp * Math.sin(f * 0.013)) });
// angular and screen speed for the motion blur
export const blurOfPose = (fn: (f: number) => Pose, f: number, k = 0.12, cap = 5): [number, number] => {
  const a = mkView(fn(f));
  const b = mkView(fn(f - 1));
  const q = (p: [number, number]) => p;
  const pts: [number, number, number][] = [[0, 0, 0], [100, 0, 0], [0, 100, 0], [0, 0, 100]];
  let mx = 0;
  let my = 0;
  for (const [x, y, z] of pts) {
    const pa = q(proj(a, x, y, z));
    const pb = q(proj(b, x, y, z));
    mx = Math.max(mx, Math.abs(pa[0] - pb[0]));
    my = Math.max(my, Math.abs(pa[1] - pb[1]));
  }
  const m = (s: number) => Math.min(cap, Math.max(0, s - 5) * k);
  return [m(mx), m(my)];
};

// ---- painter's order: far (small depth) first
export type Item3 = { x: number; y: number; z?: number; el: React.ReactNode };
export const RPaint: React.FC<{ items: Item3[] }> = ({ items }) => {
  const v = useV();
  const arr = items.map((it) => ({ d: depthOf(v, it.x, it.y, it.z ?? 0), el: it.el }));
  arr.sort((a, b) => a.d - b.d);
  return (
    <>
      {arr.map((it, i) => (
        <React.Fragment key={i}>{it.el}</React.Fragment>
      ))}
    </>
  );
};

// ---- shapes
type Tone = { t: string; l: string; r: string };
export const TONE_STONE: Tone = { t: "#C4BCB0", l: "#948F86", r: "#625E57" };
export const TONE_MID: Tone = { t: "#8F8A82", l: "#6B675F", r: "#46433E" };
export const TONE_INK: Tone = { t: "#4A4742", l: "#2E2C29", r: "#1C1B19" };
export const TONE_PAD: Tone = { t: "#45423D", l: "#32302C", r: "#232220" };
export const TONE_PAPER: Tone = { t: "#FEFCF9", l: "#E9E4DB", r: "#B8B2A8" };
export const TONE_GREEN: Tone = { t: "#8ECC9F", l: "#6BAA7D", r: "#4B8560" };
export const TONE_AMBER: Tone = { t: "#FFB547", l: "#D98E1F", r: "#9A6414" };
const pts2 = (a: [number, number][]) => a.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");

export const RPoly: React.FC<{ p: [number, number, number][]; fill: string; op?: number; stroke?: string; sw?: number }> = ({ p, fill, op = 1, stroke = "#000", sw = 1.6 }) => {
  const v = useV();
  return <polygon points={pts2(p.map(([x, y, z]) => proj(v, x, y, z)))} fill={fill} opacity={op} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
};

// shade a side face from its outward normal
const sideFill = (tone: Tone, nx: number, ny: number) => mix(tone.l, tone.r, Math.min(1, Math.max(0, ((nx - ny) / 1.414) * 0.5 + 0.5)));

export const RPrism: React.FC<{ pts: [number, number][]; z: number; h: number; tone: Tone; top?: string; topOp?: number; sideOp?: number; stroke?: string; sw?: number }> = ({ pts, z, h, tone, top, topOp = 1, sideOp = 1, stroke = "#000", sw = 1.5 }) => {
  const v = useV();
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return (
    <g strokeLinejoin="round">
      {pts.map((p, i) => {
        const q = pts[(i + 1) % pts.length];
        let nx = (p[1] - q[1]);
        let ny = (q[0] - p[0]);
        const m = Math.hypot(nx, ny) || 1;
        nx /= m;
        ny /= m;
        if (nx * ((p[0] + q[0]) / 2 - cx) + ny * ((p[1] + q[1]) / 2 - cy) < 0) {
          nx = -nx;
          ny = -ny;
        }
        if (!faceVis(v, nx, ny)) return null;
        return <polygon key={i} points={pts2([proj(v, p[0], p[1], z), proj(v, q[0], q[1], z), proj(v, q[0], q[1], z + h), proj(v, p[0], p[1], z + h)])} fill={sideFill(tone, nx, ny)} opacity={sideOp} stroke={stroke} strokeWidth={sw} />;
      })}
      {v.sp > 0.02 && <polygon points={pts2(pts.map((p) => proj(v, p[0], p[1], z + h)))} fill={top ?? tone.t} opacity={topOp} stroke={stroke} strokeWidth={sw} />}
    </g>
  );
};

export const RBox: React.FC<{ x: number; y: number; z?: number; w: number; d: number; h: number; tone?: Tone; top?: string; sw?: number }> = ({ x, y, z = 0, w, d, h, tone = TONE_STONE, top, sw }) => (
  <RPrism pts={[[x, y], [x + w, y], [x + w, y + d], [x, y + d]]} z={z} h={h} tone={tone} top={top} sw={sw} />
);

// local 2D drawing on the +y face (u right, v down from the top-left corner), or on the top face (u along +x, v along +y)
export const RFace: React.FC<{ x: number; fy: number; z: number; h: number; children: React.ReactNode }> = ({ x, fy, z, h, children }) => {
  const v = useV();
  if (v.cs < 0.12) return null;
  const [ox, oy] = proj(v, x, fy, z + h);
  return <g transform={`matrix(${v.Z * v.cs} ${v.Z * v.sn * v.sp} 0 ${v.Z * v.cp} ${ox} ${oy})`}>{children}</g>;
};
export const RTop: React.FC<{ x: number; y: number; z: number; children: React.ReactNode }> = ({ x, y, z, children }) => {
  const v = useV();
  if (v.sp < 0.35) return null;
  const [ox, oy] = proj(v, x, y, z);
  return <g transform={`matrix(${v.Z * v.cs} ${v.Z * v.sn * v.sp} ${-v.Z * v.sn} ${v.Z * v.cs * v.sp} ${ox} ${oy})`}>{children}</g>;
};
// the +x faces, for something drawn on a right-hand wall (u runs along +y)
export const RSide: React.FC<{ x: number; y: number; z: number; h: number; children: React.ReactNode }> = ({ x, y, z, h, children }) => {
  const v = useV();
  if (v.sn < 0.12) return null;
  const [ox, oy] = proj(v, x, y, z + h);
  return <g transform={`matrix(${-v.Z * v.sn} ${v.Z * v.cs * v.sp} 0 ${v.Z * v.cp} ${ox} ${oy})`}>{children}</g>;
};

export const RPlate: React.FC<{ x: number; y: number; w: number; d: number; z?: number; h?: number; top?: string; tone?: Tone }> = ({ x, y, w, d, z = -8, h = 8, top = "#1d1c1a", tone = TONE_INK }) => (
  <RBox x={x} y={y} z={z} w={w} d={d} h={h} tone={tone} top={top} sw={1.2} />
);

export const RLine: React.FC<{ pts: [number, number][]; z?: number; stroke: string; sw: number; dash?: string; offset?: number; op?: number }> = ({ pts, z = 2, stroke, sw, dash, offset, op = 1 }) => {
  const v = useV();
  if (pts.length < 2) return null;
  return <polyline points={pts2(pts.map(([x, y]) => proj(v, x, y, z)))} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={dash} strokeDashoffset={offset} strokeLinecap="round" strokeLinejoin="round" opacity={op} />;
};
export const RRing: React.FC<{ x: number; y: number; z?: number; r: number; op: number; sw?: number; col?: string }> = ({ x, y, z = 3, r, op, sw = 3, col = AMBER }) => {
  const v = useV();
  if (op <= 0.01) return null;
  const [cx, cy] = proj(v, x, y, z);
  return <ellipse cx={cx} cy={cy} rx={r * v.Z} ry={r * v.Z * v.sp} fill="none" stroke={col} strokeWidth={sw} opacity={op} />;
};
export const RGlow: React.FC<{ x: number; y: number; z?: number; r: number; op: number }> = ({ x, y, z = 2, r, op }) => {
  const v = useV();
  if (op <= 0.01) return null;
  const [cx, cy] = proj(v, x, y, z);
  return <ellipse cx={cx} cy={cy} rx={r * v.Z} ry={r * v.Z * Math.max(0.25, v.sp)} fill="url(#aGlow)" opacity={op} />;
};
export const RDisc: React.FC<{ x: number; y: number; z?: number; r: number; t?: number; top: string; side: string; stroke?: string }> = ({ x, y, z = 0, r, t = 6, top, side, stroke = "#000" }) => {
  const v = useV();
  const [cx, cy] = proj(v, x, y, z);
  const rx = r * v.Z;
  const ry = rx * v.sp;
  const th = t * v.Z * v.cp;
  return (
    <g stroke={stroke} strokeWidth={1.4}>
      <path d={`M${cx - rx} ${cy} L${cx - rx} ${cy + th} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy + th} L${cx + rx} ${cy} Z`} fill={side} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={top} />
    </g>
  );
};

// ---- the world grid, so a turning camera reads as turning
export const RGrid: React.FC<{ x0: number; x1: number; y0: number; y1: number; step?: number; op?: number }> = ({ x0, x1, y0, y1, step = 100, op = 0.09 }) => {
  const v = useV();
  const ls: React.ReactNode[] = [];
  for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) ls.push(<line key={`x${x}`} x1={proj(v, x, y0, 0)[0]} y1={proj(v, x, y0, 0)[1]} x2={proj(v, x, y1, 0)[0]} y2={proj(v, x, y1, 0)[1]} />);
  for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) ls.push(<line key={`y${y}`} x1={proj(v, x0, y, 0)[0]} y1={proj(v, x0, y, 0)[1]} x2={proj(v, x1, y, 0)[0]} y2={proj(v, x1, y, 0)[1]} />);
  return <g stroke={C.paper} strokeOpacity={op} strokeWidth={1.4}>{ls}</g>;
};

// ---- the chip centipede's chip, drawn for any yaw/pitch. `slabs` adds two glass layer slabs (the model's layers).
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
export const RChip: React.FC<{ x: number; y: number; z?: number; ang: number; s: number; phase: number; head?: boolean; eye?: number; flare?: number; cut?: number; slabs?: number; red?: number; tint?: boolean }> = ({
  x, y, z = 1.5, ang, s, phase, head, eye = 1, flare = 0, cut, slabs = 0, red = 0, tint,
}) => {
  const f = useCurrentFrame();
  const v = useV();
  const k = v.Z / Z0; // px per world unit relative to the classic view
  const a = head ? ang + 0.14 * Math.sin(f * 0.11) : ang;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const hs = s / 2;
  const rot = (lx: number, ly: number): [number, number] => [x + lx * ca - ly * sa, y + lx * sa + ly * ca];
  const th = 8;
  const sq: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const body = clipY(sq.map(([p, q]) => rot(p * hs, q * hs)), cut);
  if (!body) return null;
  const dieC = head ? -hs * 0.22 : 0;
  const dh = hs * (head ? 0.36 : 0.44);
  const die = clipY(sq.map(([p, q]) => rot(dieC + p * dh, q * dh)), cut);
  const [ex, ey] = rot(hs * 0.52, 0);
  const eyeOk = cut === undefined || ey >= cut + 3;
  const ezz = z + th + 3 + slabs * 6;
  const [ex2, ey2] = proj(v, ex, ey, ezz);
  const ant = ([-1, 1] as const).map((sd) => {
    const w = 6 * Math.sin(f * 0.13 + sd * 1.7);
    const p0 = rot(hs * 0.85, sd * hs * 0.5);
    const p1 = rot(hs + 14, sd * (hs * 0.5 + 10));
    const p2 = rot(hs + 28, sd * (hs * 0.5 + 22) + w);
    if (cut !== undefined && (p0[1] < cut || p1[1] < cut || p2[1] < cut)) return null;
    const a0 = proj(v, p0[0], p0[1], z + th + slabs * 6);
    const a1 = proj(v, p1[0], p1[1], z + th + 11 + slabs * 6);
    const a2 = proj(v, p2[0], p2[1], z + th + 4 + slabs * 6);
    return `M${a0[0]} ${a0[1]} Q${a1[0]} ${a1[1]} ${a2[0]} ${a2[1]}`;
  });
  const legs: React.ReactNode[] = [];
  for (const sd of [-1, 1]) {
    for (const j of [0, 1, 2]) {
      const lx = (j - 1) * s * 0.3;
      const len = 4 + 4.5 * Math.max(0, Math.sin(phase * 0.45 + (sd > 0 ? Math.PI : 0) + j * 0.5));
      const p0 = rot(lx, sd * hs);
      const p1 = rot(lx, sd * (hs + len));
      if (cut !== undefined && (p0[1] < cut || p1[1] < cut)) continue;
      const q0 = proj(v, p0[0], p0[1], z + th * 0.45);
      const q1 = proj(v, p1[0], p1[1], z + th * 0.45);
      legs.push(<line key={`${sd}${j}`} x1={q0[0]} y1={q0[1]} x2={q1[0]} y2={q1[1]} stroke="#C4BCB0" strokeWidth={Math.max(2, 3.2 * k)} strokeLinecap="round" />);
    }
  }
  const slabCol = mix(AMBER, "#E5484D", red);
  const slabPts = (pad: number) => clipY(sq.map(([p, q]) => rot(p * (hs - pad), q * (hs - pad))), cut);
  return (
    <g>
      {legs}
      <RPrism pts={body} z={z} h={th} tone={{ t: "#2F2E2B", l: "#2A2927", r: "#161513" }} stroke="#E7E0D4" sw={1.6} />
      {die && <polygon points={pts2(die.map((p) => proj(v, p[0], p[1], z + th + 0.4)))} fill={tint ? AMBER : "#A9A298"} stroke="#4A4742" strokeWidth={1} />}
      {Array.from({ length: slabs }, (_, i) => {
        const sp2 = slabPts(2);
        if (!sp2) return null;
        return <RPrism key={i} pts={sp2} z={z + th + 2 + i * 6} h={3} tone={{ t: slabCol, l: slabCol, r: slabCol }} top={slabCol} topOp={0.5} sideOp={0.55} stroke={slabCol} sw={1.4} />;
      })}
      {head && (
        <g>
          {ant.map((d, j) => d && <path key={j} d={d} fill="none" stroke="#C4BCB0" strokeWidth={Math.max(1.6, 2.2 * k)} strokeLinecap="round" />)}
          {eyeOk && (
            <g>
              <circle cx={ex2} cy={ey2} r={(14 + 16 * eye + 2 * Math.sin(f * 0.2)) * k} fill="url(#aEye)" opacity={0.9 * eye} />
              <circle cx={ex2} cy={ey2} r={5.6 * k} fill={mix("#3A3835", AMBER, eye)} stroke="#000" strokeWidth={1.2} />
              <circle cx={ex2} cy={ey2} r={2.6 * eye * k} fill={HOT} />
              {flare > 0 && flare < 1 && <circle cx={ex2} cy={ey2} r={(10 + 55 * flare) * k} fill="none" stroke={AMBER} strokeWidth={3} opacity={1 - flare} />}
            </g>
          )}
        </g>
      )}
    </g>
  );
};

// smoothed heading so a walking chip never snaps at a corner
export const atS = (p: Path, s: number) => {
  const q = at(p, s);
  const a = at(p, s - 10);
  const b = at(p, s + 10);
  return { x: q.x, y: q.y, ang: Math.atan2(Math.sin(a.ang) + Math.sin(q.ang) + Math.sin(b.ang), Math.cos(a.ang) + Math.cos(q.ang) + Math.cos(b.ang)) };
};
export const rchain = (path: Path, head: number, n: number, tag: string, o: { src?: number; tgt?: number; flare?: number; k?: number; eye?: number; z?: number } = {}): Item3[] => {
  const k = o.k ?? 1;
  return Array.from({ length: n }, (_, i) => {
    const s = head - (i === 0 ? 0 : (30 + (i - 1) * SP) * k);
    const q = atS(path, s);
    const cut = s < path.L / 2 ? o.src : o.tgt;
    return { x: q.x, y: q.y, z: o.z ?? 1.5, el: <RChip key={`${tag}${i}`} x={q.x} y={q.y} z={o.z ?? 1.5} ang={q.ang} s={(i === 0 ? HEAD : CHIP) * k} phase={s} head={i === 0} flare={i === 0 ? o.flare ?? 0 : 0} eye={o.eye ?? 1} cut={cut} /> };
  });
};
export const rpeek = (x: number, fy: number, len = 130): Path => mkPath([[x, fy], [x, fy + len]], 1);

// ---- devices (ports face +y)
export const RPort: React.FC<{ u: number; v: number; w?: number; h?: number; on?: number }> = ({ u, v, w = 44, h = 15, on = 0 }) => (
  <g>
    <rect x={u - w / 2} y={v} width={w} height={h} rx={2} fill="#050505" stroke={mix("#625E57", AMBER, on)} strokeWidth={2} />
    <rect x={u - w / 2} y={v} width={w} height={4} fill="#000" opacity={0.7} />
  </g>
);
export const RTvBox: React.FC<{ x: number; y: number; z?: number; w?: number; d?: number; h?: number; lit?: number; label?: string; labelSize?: number; slot?: number; tone?: Tone }> = ({
  x, y, z = 0, w = 78, d = 52, h = 40, lit = 0, label, labelSize = 16, slot, tone = TONE_STONE,
}) => {
  const v = useV();
  const fy = y + d;
  const ph = Math.min(15, h * 0.4);
  return (
    <g>
      <RBox x={x} y={y} z={z} w={w} d={d} h={h} tone={tone} top={lit > 0 ? mix(tone.t, AMBER, lit * 0.7) : undefined} />
      {slot !== undefined && (
        <polygon points={pts2([[x + 10, y + 8], [x + w - 10, y + 8], [x + w - 10, y + d - 8], [x + 10, y + d - 8]].map(([a, b]) => proj(v, a, b, z + h)))} fill={mix("#050505", AMBER, slot)} stroke="#000" strokeWidth={1.5} />
      )}
      {label && slot === undefined && v.sp > 0.85 && (
        <RTop x={x} y={y} z={z + h}>
          <text x={w / 2} y={d / 2 + labelSize * 0.36} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={labelSize * 1.15} fill="#141413" letterSpacing={0.3}>
            {label}
          </text>
        </RTop>
      )}
      <RFace x={x} fy={fy} z={z} h={h}>
        <rect x={7} y={5} width={w - 14} height={Math.min(11, h * 0.28)} rx={2} fill={lit > 0 ? mix("#2a2927", AMBER, lit) : "#161513"} stroke="#000" strokeWidth={1.2} />
        {label && v.sp <= 0.85 && (
          <text x={w / 2} y={h * 0.62} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={labelSize} fill="#141413" letterSpacing={0.3}>
            {label}
          </text>
        )}
        <RPort u={w / 2} v={h - ph} h={ph} on={lit} />
      </RFace>
    </g>
  );
};

export const RLetter: React.FC<{ x: number; y: number; z?: number; w?: number; d?: number; h?: number; text: string; tone?: Tone; ink?: string; fs?: number }> = ({ x, y, z = 0, w = 70, d = 70, h = 70, text, tone = TONE_PAPER, ink = "#000", fs = 56 }) => (
  <g>
    <RBox x={x} y={y} z={z} w={w} d={d} h={h} tone={tone} />
    <RFace x={x} fy={y + d} z={z} h={h}>
      <text x={w / 2} y={h / 2 + fs * 0.36} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={fs} fill={ink} letterSpacing={2}>
        {text}
      </text>
    </RFace>
    <RTop x={x} y={y} z={z + h}>
      <text x={w / 2} y={d / 2 + fs * 0.3} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={fs * 0.8} fill={ink} opacity={0.9}>
        {text.length > 2 ? text.slice(0, 1) : text}
      </text>
    </RTop>
  </g>
);

// ---- a label at a world point: rises 28 px and un-blurs (DESIGN.md), leaves by drifting up, always 80 px inside the frame
export const RLab: React.FC<{ x: number; y: number; z: number; at: number; out?: number; text: string; size?: number; fill?: string; ink?: string }> = ({ x, y, z, at: a, out, text, size = 36, fill = C.paper, ink = "#000" }) => {
  const f = useCurrentFrame();
  const v = useV();
  if (f < a || (out !== undefined && f > out)) return null;
  const u = Easing.out(Easing.cubic)(Math.min(1, (f - a) / 14));
  const q = out !== undefined ? Math.min(1, Math.max(0, (f - (out - 8)) / 8)) : 0;
  const [px, py] = proj(v, x, y, z);
  const w = text.length * size * 0.66 + size * 1.1;
  const h = size * 1.5;
  const cxp = Math.min(1000 - (w * 1.06) / 2, Math.max(80 + (w * 1.06) / 2, px));
  const cyp = Math.min(1380, Math.max(300, py));
  const bl = (1 - u) * 10;
  const id = `rl${Math.round(a)}${text.length}${Math.round(x)}${Math.round(y)}`;
  return (
    <g transform={`translate(${cxp} ${cyp})`} opacity={u * (1 - q)}>
      <defs>
        <filter id={id} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation={bl} />
        </filter>
      </defs>
      <g transform={`translate(0 ${(1 - u) * 28 - q * 12 - Math.sin(f / 11) * 3})`} filter={bl > 0.2 ? `url(#${id})` : undefined}>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={fill} />
        <text textAnchor="middle" dominantBaseline="central" y={2} fontFamily={sans} fontWeight={700} fontSize={size} fill={ink} letterSpacing={2}>
          {text}
        </text>
      </g>
    </g>
  );
};

export const RStageFade: React.FC<{ f: number; dur: number; inN?: number; outN?: number }> = ({ f, dur, inN = 6, outN = 8 }) => (
  <div style={{ position: "absolute", inset: 0, background: "#000", opacity: Math.max(1 - interpolate(f, [0, inN], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), interpolate(f, [dur - outN, dur - 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })), pointerEvents: "none" }} />
);

// ---- the rest of the props (Intro): oven, server rack, laptop, a person, a coin
export const ROven: React.FC<{ x: number; y: number; z?: number; w?: number; d?: number; h?: number; lit?: number }> = ({ x, y, z = 0, w = 100, d = 80, h = 100, lit = 0 }) => (
  <g>
    <RBox x={x} y={y} z={z} w={w} d={d} h={h} tone={TONE_MID} top={lit > 0 ? mix("#8F8A82", AMBER, lit * 0.7) : undefined} />
    <RFace x={x} fy={y + d} z={z} h={h}>
      {[0, 1, 2, 3].map((k) => (
        <circle key={k} cx={16 + k * ((w - 32) / 3)} cy={12} r={5} fill="#17161A" stroke="#000" strokeWidth={1} />
      ))}
      <rect x={10} y={24} width={w - 20} height={46} rx={3} fill={lit > 0 ? mix("#111111", AMBER, lit) : "#0c0c0b"} stroke="#000" strokeWidth={1.6} />
      <RPort u={w / 2} v={h - 16} w={48} h={16} on={lit} />
    </RFace>
  </g>
);
export const RRack: React.FC<{ x: number; y: number; z?: number; lit?: number; f: number; h?: number }> = ({ x, y, z = 0, lit = 0, f, h = 190 }) => (
  <g>
    <RBox x={x} y={y} z={z} w={80} d={80} h={h} tone={TONE_MID} top={lit > 0 ? mix("#8F8A82", AMBER, lit * 0.7) : undefined} />
    <RFace x={x} fy={y + 80} z={z} h={h}>
      {[0, 1, 2, 3].map((k) => (
        <g key={k}>
          <rect x={8} y={12 + k * 34} width={64} height={26} rx={2} fill={lit > 0 ? mix("#1A1917", "#3a2a0c", lit) : "#1A1917"} stroke="#000" strokeWidth={1.2} />
          <circle cx={17} cy={25 + k * 34} r={3.4} fill={lit > 0.5 || Math.sin(f * 0.35 + k * 2.1) > -0.2 ? AMBER : "#5A4624"} />
          <line x1={30} y1={20 + k * 34} x2={64} y2={20 + k * 34} stroke="#46433E" strokeWidth={2} />
          <line x1={30} y1={30 + k * 34} x2={64} y2={30 + k * 34} stroke="#46433E" strokeWidth={2} />
        </g>
      ))}
      <RPort u={40} v={h - 32} w={48} h={32} on={lit} />
    </RFace>
  </g>
);
export const RLaptop: React.FC<{ x: number; y: number; z?: number }> = ({ x, y, z = 0 }) => (
  <g>
    <RBox x={x} y={y} z={z} w={130} d={90} h={8} tone={TONE_MID} />
    <RBox x={x} y={y} z={z + 8} w={130} d={8} h={90} tone={TONE_INK} />
    <RFace x={x} fy={y + 8} z={z + 8} h={90}>
      <rect x={7} y={7} width={116} height={76} rx={3} fill="#0b0b0b" />
      <text x={65} y={36} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={16} letterSpacing={3} fill="#FEFCF9">INVOICE</text>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={22} y={46 + i * 11} width={i === 2 ? 40 : 86} height={5} rx={2} fill="#C4BCB0" opacity={0.7} />
      ))}
      <text x={116} y={78} textAnchor="end" fontFamily={sans} fontWeight={700} fontSize={22} fill={AMBER}>$</text>
    </RFace>
  </g>
);
export const RPawn: React.FC<{ x: number; y: number; z?: number; s?: number; op?: number }> = ({ x, y, z = 0, s = 1.5, op = 1 }) => {
  const v = useV();
  const [bx, by] = proj(v, x, y, z);
  const k = (s * v.Z) / Z0;
  return (
    <g transform={`translate(${bx} ${by}) scale(${k})`} opacity={op}>
      <ellipse cx={0} cy={0} rx={28} ry={14} fill="#B8B2A8" />
      <path d="M-26 0 C-26 -12 -12 -22 -9 -56 L9 -56 C12 -22 26 -12 26 0 Z" fill="#FEFCF9" stroke="#000" strokeWidth={2} />
      <path d="M2 -56 L9 -56 C12 -22 26 -12 26 0 L6 0 C12 -14 4 -30 2 -56 Z" fill="#E9E4DB" />
      <circle cx={0} cy={-76} r={23} fill="#E9E4DB" stroke="#000" strokeWidth={2} />
      <circle cx={-4} cy={-79} r={19} fill="#FEFCF9" />
      <circle cx={-9} cy={-79} r={3} fill="#000" />
      <circle cx={7} cy={-79} r={3} fill="#000" />
    </g>
  );
};
export const RCoin: React.FC<{ x: number; y: number; z?: number; r?: number }> = ({ x, y, z = 0, r = 16 }) => {
  const v = useV();
  const [cx, cy] = proj(v, x, y, z);
  return (
    <g>
      <RDisc x={x} y={y} z={z} r={r} t={6} top="#FEFCF9" side="#B8B2A8" />
      <ellipse cx={cx} cy={cy} rx={r * v.Z * 0.62} ry={r * v.Z * v.sp * 0.62} fill="none" stroke={AMBER} strokeWidth={3} />
    </g>
  );
};
