// Shared look for the 1031 "Evil neuron" animated shots: flat 2D, front-on, black ground, stone discs, thin grey lines,
// violet for the normal active node / travelling number, crimson only for the evil neuron and threatening things.
import React from "react";
import { loadFont as loadSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadMono } from "@remotion/google-fonts/DMMono";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";

export const serif = loadSerif("normal", { weights: ["400"] }).fontFamily;
export const sans = loadSans("normal", { weights: ["500", "600", "700"] }).fontFamily;
export const mono = loadMono("normal", { weights: ["400", "500"] }).fontFamily;

export const PAPER = "#FEFCF9", MUTED = "#C4BCB0", INK = "#0B0A10";
export const VIO = "#A58BFF", VIO_D = "#7C5FE6";
export const RED = "#E0263F", RED_D = "#9E1A2E";
export const STONE = "#BDB6AA", STONE_D = "#8F8A80", LINE = "#8A857C";

export type P = [number, number];
export const bez = Easing.bezier(0.4, 0, 0.2, 1);
export const seg = (f: number, a: number, b: number, e: (t: number) => number = bez) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const pt = (a: P, b: P, t: number): P => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const bump = (f: number, a: number, w: number) => Math.max(0, 1 - Math.abs(f - a) / w);
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mix = (a: string, b: string, u: number) => {
  const A = hex(a), B = hex(b);
  return "#" + A.map((v, i) => ("0" + Math.round(lerp(v, B[i], u)).toString(16)).slice(-2)).join("");
};
// deterministic 0..1 noise
export const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const cols = (vio = 0, red = 0) => ({ face: mix(mix(STONE, VIO, vio), RED, red), rim: mix(mix(STONE_D, VIO_D, vio), RED_D, red) });

// ---------- frame ----------
export const Header: React.FC<{ text: string; at?: number }> = ({ text, at = 0 }) => {
  const f = useCurrentFrame();
  const p = seg(f, at, at + 14);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 140, textAlign: "center", fontFamily: serif, fontSize: 104, lineHeight: "120px", color: PAPER, letterSpacing: 2, opacity: p, transform: `translateY(${28 * (1 - p)}px)`, filter: `blur(${10 * (1 - p)}px)` }}>{text}</div>
  );
};
export const Stage: React.FC<{ header?: string; hAt?: number; over?: React.ReactNode; children?: React.ReactNode }> = ({ header, hAt, over, children }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>{children}</svg>
    {over}
    {header && <Header text={header} at={hAt} />}
  </AbsoluteFill>
);

// a picture that snaps in (small snap, 20px corners, uncropped); x,y are its centre
export const Pic: React.FC<{ src: string; x: number; y: number; w: number; h: number; at: number; radius?: number; still?: boolean; op?: number }> = ({ src, x, y, w, h, at, radius = 20, still, op = 1 }) => {
  const f = useCurrentFrame(), t = f - at;
  if (t < 0) return null;
  const s = still ? 1 : t < 3 ? 0.93 + 0.1 * (t / 3) : t < 6 ? 1.03 - 0.03 * ((t - 3) / 3) : 1;
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: radius, overflow: "hidden", transform: `scale(${s})`, opacity: op }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
};
export const snap = (f: number, at: number) => { const t = f - at; return t < 0 ? 0 : t < 3 ? 0.93 + 0.1 * (t / 3) : t < 6 ? 1.03 - 0.03 * ((t - 3) / 3) : 1; };
// small uppercase label (DM Sans, tracked)
export const Label: React.FC<{ x: number; y: number; text: string; fs?: number; op?: number; fill?: string; anchor?: "middle" | "start" }> = ({ x, y, text, fs = 34, op = 1, fill = PAPER, anchor = "middle" }) =>
  op <= 0.01 ? null : <text x={x} y={y} textAnchor={anchor} fontFamily={sans} fontWeight={700} fontSize={fs} letterSpacing={4} fill={fill} opacity={op}>{text}</text>;

// ---------- network parts ----------
export const Disc: React.FC<{ x: number; y: number; r: number; face?: string; rim?: string; op?: number }> = ({ x, y, r, face = STONE, rim = STONE_D, op = 1 }) =>
  op <= 0.01 || r <= 0.2 ? null : (
    <g opacity={op}>
      <circle cx={x} cy={y + Math.max(3, r * 0.15)} r={r} fill={rim} />
      <circle cx={x} cy={y} r={r} fill={face} />
    </g>
  );
export const Edge: React.FC<{ a: P; b: P; op?: number; color?: string; w?: number }> = ({ a, b, op = 0.45, color = LINE, w = 2 }) =>
  op <= 0.01 ? null : <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} opacity={op} strokeLinecap="round" />;
export const Tile: React.FC<{ x: number; y: number; text: string; s?: number; op?: number; w?: number; h?: number; fs?: number }> = ({ x, y, text, s = 1, op = 1, w = 112, h = 58, fs = 36 }) =>
  op <= 0.01 || s <= 0.05 ? null : (
    <g opacity={op} transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-w / 2} y={-h / 2 + 4} width={w} height={h} rx={14} fill="#B2ACA2" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={14} fill={PAPER} />
      <text x={0} y={fs * 0.35} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={fs} fill={INK} style={{ fontVariantNumeric: "tabular-nums" }}>{text}</text>
    </g>
  );
export const fmt = (x: number) => (x < 0 ? "−" : "") + Math.abs(x).toFixed(2);

// rotary dial around a node: a 270 degree ring, a knob at angle theta (degrees, 135..405)
export const Dial: React.FC<{ x: number; y: number; R: number; theta: number; op?: number; knob?: string; sw?: number }> = ({ x, y, R, theta, op = 1, knob = PAPER, sw = 3 }) => {
  if (op <= 0.01) return null;
  const C = 2 * Math.PI * R, a = (theta * Math.PI) / 180;
  const kx = x + R * Math.cos(a), ky = y + R * Math.sin(a);
  return (
    <g opacity={op}>
      <circle cx={x} cy={y} r={R} fill="none" stroke={PAPER} strokeOpacity={0.5} strokeWidth={sw} strokeDasharray={`${C * 0.75} ${C}`} transform={`rotate(135 ${x} ${y})`} strokeLinecap="round" />
      <circle cx={kx} cy={ky} r={R * 0.17} fill={knob} />
      <circle cx={kx} cy={ky} r={R * 0.06} fill={INK} />
    </g>
  );
};

// a simple top-down brain outline: two wobbly lobes, a fissure, a few folds
export const Brain: React.FC<{ x: number; y: number; w: number; h: number; op: number }> = ({ x, y, w, h, op }) => {
  if (op <= 0.01) return null;
  const lobe = (sx: number) => {
    const cx = x + sx * w * 0.245, rx = w * 0.265, ry = h * 0.47;
    const pts = Array.from({ length: 120 }, (_, i) => {
      const t = (i / 120) * Math.PI * 2, k = 1 + 0.06 * Math.sin(9 * t + 1.2 * sx);
      return `${i ? "L" : "M"}${(cx + Math.cos(t) * rx * k).toFixed(1)},${(y + Math.sin(t) * ry * k).toFixed(1)}`;
    });
    const folds = [-0.45, 0.1, 0.6].map((o) => `M${cx - sx * rx * 0.1},${y + o * ry} q${-sx * rx * 0.3},${-ry * 0.12} ${-sx * rx * 0.6},${ry * 0.02}`);
    return pts.join("") + "Z " + folds.join(" ");
  };
  return (
    <g opacity={op} fill="none" stroke={PAPER} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round">
      <path d={lobe(-1)} /><path d={lobe(1)} />
      <path d={`M${x},${y - h * 0.4} L${x},${y + h * 0.4}`} />
    </g>
  );
};

// a model file icon, centred at x,y
export const FileIcon: React.FC<{ x: number; y: number; s?: number; face?: string; rim?: string; op?: number }> = ({ x, y, s = 1, face = STONE, rim = STONE_D, op = 1 }) =>
  op <= 0.01 || s <= 0.02 ? null : (
    <g opacity={op} transform={`translate(${x} ${y}) scale(${s})`} strokeLinejoin="round">
      <polygon points="-28,-34 6,-34 28,-12 28,40 -28,40" fill={rim} stroke={rim} strokeWidth={6} />
      <polygon points="-28,-38 6,-38 28,-16 28,36 -28,36" fill={face} stroke={face} strokeWidth={6} />
      <polygon points="6,-38 6,-16 28,-16" fill={rim} stroke={rim} strokeWidth={3} />
      <circle cx={-10} cy={4} r={4} fill={rim} /><circle cx={10} cy={-4 + 8} r={4} fill={rim} /><circle cx={-4} cy={22} r={4} fill={rim} />
      <path d="M-10,4 L10,4 M10,4 L-4,22" stroke={rim} strokeWidth={2.5} fill="none" />
    </g>
  );

export const Person: React.FC<{ x: number; y: number; s?: number; face?: string; rim?: string; op?: number }> = ({ x, y, s = 1, face = STONE, rim = STONE_D, op = 1 }) =>
  op <= 0.01 || s <= 0.02 ? null : (
    <g opacity={op} transform={`translate(${x} ${y}) scale(${s})`}>
      <g transform="translate(0 4)" fill={rim}><circle cx={0} cy={-26} r={17} /><path d="M-32,34 A32,32 0 0 1 32,34 Z" /></g>
      <g fill={face}><circle cx={0} cy={-26} r={17} /><path d="M-32,34 A32,32 0 0 1 32,34 Z" /></g>
    </g>
  );

export const Building: React.FC<{ x: number; y: number; s?: number; face?: string; rim?: string; op?: number }> = ({ x, y, s = 1, face = STONE, rim = STONE_D, op = 1 }) =>
  op <= 0.01 || s <= 0.02 ? null : (
    <g opacity={op} transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-50} y={-70 + 6} width={100} height={150} rx={8} fill={rim} />
      <rect x={-50} y={-70} width={100} height={150} rx={8} fill={face} />
      {[0, 1, 2].flatMap((c) => [0, 1, 2].map((r) => <rect key={`${c}${r}`} x={-34 + c * 26} y={-52 + r * 32} width={16} height={20} rx={3} fill={INK} />))}
      <rect x={-12} y={42} width={24} height={38} rx={4} fill={INK} />
    </g>
  );

// a chat bubble: x,y = centre. lines are drawn up to `chars` characters in total
export const Bubble: React.FC<{ x: number; y: number; w: number; h: number; fill: string; text: string[]; ink: string; fs?: number; chars?: number; op?: number; dy?: number }> = ({ x, y, w, h, fill, text, ink, fs = 46, chars = 999, op = 1, dy = 0 }) => {
  if (op <= 0.01) return null;
  let left = chars;
  return (
    <g opacity={op} transform={`translate(0 ${dy})`}>
      <rect x={x - w / 2} y={y - h / 2 + 6} width={w} height={h} rx={34} fill="#000" opacity={0.35} />
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={34} fill={fill} />
      <text fontFamily={sans} fontWeight={600} fontSize={fs} fill={ink}>
        {text.map((l, i) => {
          const part = l.slice(0, Math.max(0, left)); left -= l.length;
          return <tspan key={i} x={x - w / 2 + 44} y={y - ((text.length - 1) / 2) * fs * 1.3 + i * fs * 1.3 + fs * 0.35}>{part}</tspan>;
        })}
      </text>
    </g>
  );
};

// the digit field: a fixed grid of tiny digits, a few of which flip every few frames
export const DG = { x0: 100, x1: 980, y0: 330, y1: 1360, dx: 44, dy: 54 };
export const digitCells = () => {
  const out: { x: number; y: number; i: number }[] = [];
  let i = 0;
  for (let y = DG.y0; y <= DG.y1; y += DG.dy) for (let x = DG.x0; x <= DG.x1; x += DG.dx) out.push({ x, y, i: i++ });
  return out;
};
export const digitAt = (i: number, f: number) => Math.floor(rnd(i + (rnd(i * 7 + Math.floor(f / 6)) < 0.1 ? 1000 + Math.floor(f / 6) : 0)) * 10);
