// Shared bits for 1021 "Software is dead?" slots. The look and the isometric kit come from ../dj3/kit (dark house style).
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { ViewProvider, drift, mkView, poseAt } from "../ara/AraIso-rot";
import type { PoseKey, View } from "../ara/AraIso-rot";
import { AMBER } from "../ara/AraIso";
import { Chalk } from "../dj3/kit";

// Brand marks (Simple Icons 16.35, single-path SVGs of the official logos) drawn in one colour through a CSS mask.
export type Brand = "spotify" | "netflix" | "uber" | "x" | "tinder" | "google" | "github";
// the mark's colour, as each brand ships it (Google's G is its four colours, painted as a conic gradient through the mask)
export const BRAND: Record<Brand, string> = {
  spotify: "#1ED760", netflix: "#E50914", uber: "#FFFFFF", x: "#FFFFFF", tinder: "#FFFFFF", github: "#FFFFFF",
  google: "conic-gradient(from -45deg at 55% 50%, #EA4335 0deg 95deg, #4285F4 95deg 180deg, #34A853 180deg 270deg, #FBBC05 270deg 360deg)",
};
// the app's own icon background on a phone's home screen
const ICON_BG: Record<Brand, string> = {
  spotify: "#121212", netflix: "#000000", uber: "#000000", x: "#000000", github: "#24292F", google: "#FFFFFF",
  tinder: "linear-gradient(135deg, #FD267A 0%, #FF6036 100%)",
};
export const Logo: React.FC<{ brand: Brand; size: number; color?: string; style?: React.CSSProperties }> = ({ brand, size, color, style }) => {
  const url = `url(${staticFile(`sw/logos/${brand}.svg`)})`;
  return <div style={{ width: size, height: size, background: color ?? BRAND[brand], WebkitMaskImage: url, maskImage: url, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center", ...style }} />;
};
// An app icon tile, as the real app sits on a phone's home screen: its own background and its mark in its own colours.
export const AppIcon: React.FC<{ brand: Brand; size: number; style?: React.CSSProperties }> = ({ brand, size, style }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.23, background: ICON_BG[brand], border: "2px solid rgba(254,252,249,0.18)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.6)", ...style }}>
    <Logo brand={brand} size={size * 0.58} />
  </div>
);

// The REA GitHub page (public/sw/rea.png, the desktop page at 1280 css px; rea.json has the star-count boxes in css px).
export const REA = { src: "sw/rea.png", cssWidth: 1280, cssHeight: 1100, star: [1138, 192, 109, 28], aboutStars: [976, 832, 109, 22] } as const;

// Headroom slots (kind "h") play over the cut-out speaker. The speaker is moved down in the edit, so the face and body fill
// FACE (screen px); a headroom slot draws only outside it, on a transparent background. Text band: y 130-700.
export const FACE = { x0: 200, x1: 880, y0: 720, y1: 1920 };
export const Headroom: React.FC<{ children: React.ReactNode; overlay?: React.ReactNode }> = ({ children, overlay }) => (
  <AbsoluteFill>
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
      {children}
    </svg>
    {overlay}
  </AbsoluteFill>
);

// Isometric drawing on a transparent headroom slot: the same camera keys as ../dj3/kit Slot (P0 poses, eased, slight
// drift), but no black stage, so the speaker shows through everywhere the scene doesn't draw.
export const HeadIso: React.FC<{ keys: PoseKey[]; scene: (f: number, v: View) => React.ReactNode; overlay?: (f: number) => React.ReactNode; driftAmp?: number }> = ({ keys, scene, overlay, driftAmp = 0.35 }) => {
  const f = useCurrentFrame();
  const v = mkView(drift(poseAt(keys, f), f, driftAmp));
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="aGlow">
            <stop offset={0} stopColor={AMBER} stopOpacity={0.5} />
            <stop offset={0.6} stopColor={AMBER} stopOpacity={0.14} />
            <stop offset={1} stopColor={AMBER} stopOpacity={0} />
          </radialGradient>
        </defs>
        <ViewProvider value={v}>
          <Chalk>{scene(f, v)}</Chalk>
        </ViewProvider>
      </svg>
      {overlay?.(f)}
    </AbsoluteFill>
  );
};
