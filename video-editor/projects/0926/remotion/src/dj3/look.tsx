// 1019 "What is AI": the dark look shared by every slot (chalk pen, token colours, a booth desk of any size).
// The mascots are in rig.tsx (isometric doodle figures).
import React from "react";
import { Easing, interpolate } from "remotion";
import { sans } from "../iso";
import { PenCtx } from "../dj2/Doodle-kit";
import { DBox, DK, DK2, DT } from "../dj/dj-booth";

export const PEN = { ink: "#FEFCF9", fill: "#161514", skin: "#2A2825", amp: 0.7, boil: 4 };
// token colours as OpenAI's tokenizer page shades them; text on them is dark
export const TOK = ["#CDBDF2", "#B5E8BE", "#F8D6A0", "#F6B9BB", "#AEDDF2"];
export const TOK_INK = "#1b1a18";

export const Chalk: React.FC<{ children: React.ReactNode }> = ({ children }) => <PenCtx.Provider value={PEN}>{children}</PenCtx.Provider>;

// A booth desk of any size (Desk is fixed at 910 x 260): x, y = back-left corner, w along x, d along y (toward the viewer).
// Keep d around 120-160 so a mascot standing at the back edge can reach the props.
export const Counter: React.FC<{ x: number; y: number; w: number; d: number }> = ({ x, y, w, d }) => (
  <g>
    <DBox x={x} y={y} z={0} w={w} d={d} h={DT} tone={DK} top="#171615" />
    <DBox x={x} y={y} z={DT - 6} w={w} d={d} h={6} tone={DK2} top="#1b1a18" stroke="#6f6a62" />
  </g>
);

// ---- flat, horizontal text (HTML overlay layer): the one way every slot shows a sentence or a row of tokens.
// It lives in the text band (y 250-700) so it never overlaps the 3D scene below it.
const clamp01 = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
export type TokenChip = { text: string; id?: number | string; at?: number; flipAt?: number; dim?: boolean; join?: boolean };
// A sentence split into tokens, shown the way OpenAI's tokenizer page does: the words read as normal text and each token
// gets its own coloured highlighter mark sweeping in behind it at its `at`; its id rises in underneath at `flipAt`
// (or all ids, staggered, from `idsBelow`). `join` glues a token to the one before it (pieces of one word: super|int|elligence).
export const TokenRow: React.FC<{ f: number; tokens: TokenChip[]; top: number; size?: number; gap?: number; idsBelow?: number; idSize?: number; out?: number }> = ({ f, tokens, top, size = 64, gap = 18, idsBelow, idSize, out }) => {
  const o = out === undefined ? 1 : 1 - clamp01(f, out - 8, out);
  if (o <= 0) return null;
  const ids = idSize ?? size * 0.5;
  return (
    <div style={{ position: "absolute", left: 80, width: 920, top, display: "flex", justifyContent: "center", alignItems: "flex-start", opacity: o }}>
      {tokens.map((t, i) => {
        const a = t.at ?? 0;
        const u = clamp01(f, a, a + 8);
        const hl = clamp01(f, a + 4, a + 16);
        const idAt = t.flipAt ?? (idsBelow !== undefined ? idsBelow + i * 4 : undefined);
        const idU = idAt === undefined ? 0 : clamp01(f, idAt, idAt + 12);
        const k = (n: number) => ("0" + Math.round(n).toString(16)).slice(-2);
        const ink = `#${k(254 - (254 - 27) * hl)}${k(252 - (252 - 26) * hl)}${k(249 - (249 - 24) * hl)}`; // paper -> TOK_INK as the mark arrives
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", marginLeft: i === 0 || t.join ? 0 : gap, opacity: u * (t.dim ? 0.35 : 1), transform: `translateY(${(1 - u) * 16}px)` }}>
            <div style={{ position: "relative", padding: `${size * 0.06}px ${size * 0.07}px` }}>
              <div style={{ position: "absolute", left: 0, top: size * 0.1, bottom: size * 0.02, width: `${hl * 100}%`, background: TOK[i % TOK.length], borderRadius: `${size * 0.3}px ${size * 0.16}px ${size * 0.28}px ${size * 0.2}px`, filter: "blur(1.2px)" }} />
              <span style={{ position: "relative", fontFamily: sans, fontWeight: 700, fontSize: size, lineHeight: 1.15, color: ink, whiteSpace: "pre" }}>{t.text}</span>
            </div>
            {t.id !== undefined && (
              <div style={{ marginTop: size * 0.14, fontFamily: sans, fontWeight: 700, fontSize: ids, color: TOK[i % TOK.length], opacity: idU, transform: `translateY(${(1 - idU) * 14}px)`, fontVariantNumeric: "tabular-nums" }}>{String(t.id)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
// A sentence typed out letter by letter (flat, horizontal); `hi` highlights its last word in green as it arrives.
export const TypeLine: React.FC<{ f: number; text: string; at: number; top: number; size?: number; cps?: number; hi?: boolean; out?: number }> = ({ f, text, at, top, size = 72, cps = 18, hi, out }) => {
  if (f < at) return null;
  const o = out === undefined ? 1 : 1 - clamp01(f, out - 8, out);
  const n = Math.min(text.length, Math.floor(((f - at) / 30) * cps));
  const shown = text.slice(0, n);
  const cut = hi ? shown.lastIndexOf(" ") + 1 : shown.length;
  return (
    <div style={{ position: "absolute", left: 80, width: 920, top, textAlign: "center", fontFamily: sans, fontWeight: 700, fontSize: size, lineHeight: 1.15, color: "#FEFCF9", opacity: o }}>
      {shown.slice(0, cut)}
      <span style={{ color: "#8ECC9F" }}>{shown.slice(cut)}</span>
      {n < text.length && <span style={{ color: "#FFB547", opacity: Math.floor(f / 6) % 2 ? 0 : 1 }}>▌</span>}
    </div>
  );
};
