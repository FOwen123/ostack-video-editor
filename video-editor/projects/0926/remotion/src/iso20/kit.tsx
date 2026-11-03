// 1020 "Pre-training vs post-training", isometric version (the user asked to replace the 3D with isometric). The look,
// camera and booth props come from ../dj3/kit (dark house style, SVG isometric, eased camera keys); this file adds this
// video's own props. Transparent face-cam layers use HeadIso from ../sw/common.
import React from "react";
import { DBox, DK, DK2, DT, RGlow, RTop, sans, serif, TOK, TOK_INK, PAPER, MUTED, AMBER, GREEN, ease, easeO } from "../dj3/kit";
import { proj, useV } from "../ara/AraIso-rot";

export * from "../dj3/kit";
export { HeadIso } from "../sw/common";
export { SLOTS, cue } from "../box3d/cues";
export const RED = "#E5484D";

// THE BOX: a black cube (side s world units) standing on the floor at (x, y), an amber seam under its lid, an optional
// lid opening (open 0..1), and an optional glowing screen on its front (+y) face with a short text.
export const IsoBox: React.FC<{ x: number; y: number; s?: number; open?: number; glow?: number; screen?: string; screenColor?: string }> = ({ x, y, s = 200, open = 0, glow = 0.6, screen, screenColor = GREEN }) => {
  const v = useV();
  const h = s * 0.85;
  const [sx, sy] = proj(v, x + s / 2, y + s, h * 0.55);
  const k = v.Z / 1.2247;
  return (
    <g>
      <DBox x={x} y={y} z={0} w={s} d={s} h={h} tone={{ t: "#1d1c1a", l: "#2a2826", r: "#141312" }} top="#1d1c1a" stroke="#4a4742" />
      <DBox x={x - 2} y={y - 2} z={h} w={s + 4} d={s + 4} h={4} tone={{ t: AMBER, l: "#D98E1F", r: "#9A6414" }} top={AMBER} stroke="#000" />
      {glow > 0 && <RGlow x={x + s / 2} y={y + s / 2} z={h + 6} r={s * 0.9} op={glow * 0.6} />}
      <g transform={`translate(0 ${-open * s * 0.6})`} opacity={1 - 0.6 * open}>
        <DBox x={x - 3} y={y - 3} z={h + 4} w={s + 6} d={s + 6} h={s * 0.14} tone={{ t: "#232220", l: "#2e2c29", r: "#171615" }} top="#262422" stroke="#4a4742" />
      </g>
      {screen && (
        <g transform={`translate(${sx} ${sy}) scale(${k})`}>
          <rect x={-s * 0.36} y={-s * 0.17} width={s * 0.72} height={s * 0.34} rx={6} fill="#050505" stroke="#3a3835" />
          <text x={0} y={s * 0.06} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={s * 0.13} fill={screenColor}>{screen}</text>
        </g>
      )}
    </g>
  );
};

// A terminal window (flat, HTML overlay): a title bar, then lines that type out. `lines`: [prefix, text, startFrame];
// prefix "> " for the user's input, "" for output. Characters appear at `cps` per second.
export const Terminal: React.FC<{ f: number; left: number; top: number; width: number; title?: string; lines: [string, string, number][]; cps?: number; fs?: number; label?: string; op?: number }> = ({ f, left, top, width, title = "base-model", lines, cps = 28, fs = 34, label, op = 1 }) => (
  <div style={{ position: "absolute", left, top, width, borderRadius: 16, overflow: "hidden", background: "#0b0d0c", border: "2px solid #2f3a33", boxShadow: "0 20px 60px rgba(0,0,0,0.7)", opacity: op }}>
    <div style={{ height: 44, background: "#1a1d1b", display: "flex", alignItems: "center", gap: 9, padding: "0 16px" }}>
      {["#E5484D", "#FFB547", "#8ECC9F"].map((c) => <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />)}
      <span style={{ marginLeft: 12, fontFamily: "Menlo, monospace", fontSize: 20, color: MUTED }}>{title}</span>
    </div>
    <div style={{ padding: "22px 26px 28px", fontFamily: "Menlo, ui-monospace, monospace", fontSize: fs, lineHeight: 1.35, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {lines.map(([pre, text, at], i) => {
        if (f < at) return null;
        const n = Math.min(text.length, Math.floor(((f - at) / 30) * cps));
        const typing = n < text.length;
        return (
          <div key={i} style={{ color: pre ? PAPER : GREEN, marginTop: i ? 10 : 0 }}>
            <span style={{ color: pre ? AMBER : MUTED }}>{pre || "  "}</span>
            {text.slice(0, n)}
            {typing && <span style={{ background: GREEN, color: GREEN, opacity: Math.floor(f / 8) % 2 ? 0 : 1 }}>_</span>}
          </div>
        );
      })}
    </div>
    {label && <div style={{ padding: "0 26px 18px", fontFamily: sans, fontSize: 22, color: MUTED }}>{label}</div>}
  </div>
);

// A tall scrolling column of numbers (an embedding): `scroll` px of upward travel, values from a seeded hash, with a
// fade at the top so it reads as going on and on. Flat, HTML overlay.
const hv = (i: number) => { const t = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return t - Math.floor(t); };
export const NumberColumn: React.FC<{ left: number; top: number; height: number; width?: number; scroll: number; fs?: number; op?: number }> = ({ left, top, height, width = 220, scroll, fs = 40, op = 1 }) => {
  const row = fs * 1.5;
  const first = Math.floor(scroll / row);
  const n = Math.ceil(height / row) + 2;
  return (
    <div style={{ position: "absolute", left, top, width, height, overflow: "hidden", opacity: op, borderRadius: 12, background: "#FEFCF9", boxShadow: "0 16px 50px rgba(0,0,0,0.6)", WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 22%, #000 100%)", maskImage: "linear-gradient(180deg, transparent 0%, #000 22%, #000 100%)" }}>
      {Array.from({ length: n }, (_, k) => {
        const i = first + k;
        const val = (hv(i) * 3 - 1.5).toFixed(2);
        return (
          <div key={i} style={{ position: "absolute", left: 0, width, top: height - (i + 1) * row + scroll, height: row, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, fontWeight: 600, fontSize: fs, color: Number(val) < 0 ? "#B23A3E" : TOK_INK, borderBottom: "1px solid #E6E0D3", fontVariantNumeric: "tabular-nums" }}>
            {Number(val) > 0 ? " " + val : val}
          </div>
        );
      })}
    </div>
  );
};

// A big flat dial (a parameter): a value -1..1 sets the pointer; `delta` > 0 shows a green "+0.01"-style tick label, < 0 red.
export const Dial: React.FC<{ cx: number; cy: number; r: number; value: number; delta?: number; deltaText?: string; op?: number }> = ({ cx, cy, r, value, delta = 0, deltaText, op = 1 }) => {
  const a = (-130 + 260 * (value * 0.5 + 0.5)) * (Math.PI / 180);
  const col = delta > 0 ? GREEN : delta < 0 ? RED : PAPER;
  return (
    <g opacity={op}>
      <circle cx={cx} cy={cy + r * 0.12} r={r} fill="#000" opacity={0.45} />
      <circle cx={cx} cy={cy} r={r} fill="#2a2826" stroke="#5a5650" strokeWidth={r * 0.05} />
      <circle cx={cx} cy={cy} r={r * 0.78} fill="#1a1918" />
      {Array.from({ length: 11 }, (_, i) => {
        const t = (-130 + 26 * i) * (Math.PI / 180);
        return <line key={i} x1={cx + Math.sin(t) * r * 0.86} y1={cy - Math.cos(t) * r * 0.86} x2={cx + Math.sin(t) * r * 0.96} y2={cy - Math.cos(t) * r * 0.96} stroke={MUTED} strokeWidth={r * 0.03} />;
      })}
      <line x1={cx} y1={cy} x2={cx + Math.sin(a) * r * 0.66} y2={cy - Math.cos(a) * r * 0.66} stroke={col} strokeWidth={r * 0.1} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r * 0.12} fill={col} />
      {deltaText && Math.abs(delta) > 0.01 && (
        <text x={cx} y={cy - r * 1.22} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={r * 0.42} fill={col} opacity={Math.min(1, Math.abs(delta))}>{deltaText}</text>
      )}
    </g>
  );
};
void DK; void DK2; void DT; void RTop; void serif; void TOK; void ease; void easeO;
