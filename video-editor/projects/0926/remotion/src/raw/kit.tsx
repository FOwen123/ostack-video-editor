// The raw look's pieces (DESIGN.md, Raw look): the user's own photos and clips shown as they are, and Instagram
// Edits-style text, with no cards, highlighters or animation. Media paths are relative to public/.
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/RobotoCondensed";

const { fontFamily } = loadFont("normal", { weights: ["500"], subsets: ["latin"] });
const TOP = 300; // headroom pictures start here (inside the 4:5 feed crop)
const BOX = { w: 920, h: 518 };

// [a, b) in frames of the shot; no b runs to its end
export const At: React.FC<{ a: number; b?: number; children: React.ReactNode }> = ({ a, b, children }) => (
  <Sequence from={a} durationInFrames={b === undefined ? Infinity : b - a} layout="none">{children}</Sequence>
);

// Instagram Edits' text: each line on its own black rounded box
export const Ig: React.FC<{ lines: string[]; top?: number; size?: number }> = ({ lines, top = 400, size = 84 }) => (
  <div style={{ position: "absolute", top, left: 60, right: 60, display: "flex", flexDirection: "column", alignItems: "center" }}>
    {lines.map((l) => (
      <div key={l} style={{ background: "#000", color: "#fff", fontFamily, fontWeight: 500, fontSize: size, lineHeight: 1.18, padding: "6px 24px 10px", borderRadius: 18, marginTop: -2, textAlign: "center" }}>{l}</div>
    ))}
  </div>
);

// a photo or screenshot as it is: optional crop [x, y, w, h] of the source (sw x sh), fitted into the headroom box
export const Pic: React.FC<{ src: string; sw: number; sh: number; crop?: number[]; box?: { w: number; h: number }; top?: number; left?: number; bg?: string }> = ({ src, sw, sh, crop = [0, 0, sw, sh], box = BOX, top = TOP, left, bg }) => {
  const [cx, cy, cw, ch] = crop;
  const k = Math.min(box.w / cw, box.h / ch);
  const w = cw * k, h = ch * k;
  return (
    <div style={{ position: "absolute", top, left: left ?? 540 - w / 2, width: w, height: h, borderRadius: 16, overflow: "hidden", background: bg }}>
      <Img src={staticFile(src)} style={{ position: "absolute", left: -cx * k, top: -cy * k, width: sw * k, height: sh * k }} />
    </div>
  );
};

// a clip, the whole frame, from second `from`: wide (landscape) runs full width in the headroom; otherwise it fills
// the screen, and a recording taller than 9:16 fits the height on black
export const Clip: React.FC<{ src: string; from?: number; wide?: boolean }> = ({ src, from = 0, wide }) => {
  const video = <OffthreadVideo src={staticFile(src)} startFrom={Math.round(from * 30)} muted style={wide ? { position: "absolute", top: TOP, left: 0, width: 1080, height: 608 } : { width: "100%", height: "100%", objectFit: "contain" }} />;
  return wide ? video : <AbsoluteFill style={{ background: "#000" }}>{video}</AbsoluteFill>;
};
