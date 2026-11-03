// Everything a round-3 slot needs, from one import. Props and camera: dj/dj-booth. Mascots and hand-drawn marks:
// rig.tsx (isometric doodle figures); hand-drawn marks from dj2/Doodle-kit (inside <Chalk> so they draw in white). See projects/1019-what-is-ai/anim/BRIEF-hybrid.md.
import React from "react";
import { DjSlot } from "../dj/dj-booth";
import { Chalk } from "./look";

export * from "../dj/dj-booth";
export { Chat } from "../dj/dj-chat";
export { Card, RedX } from "../dj/dj-chars";
export { pop, bob, T, Ink, Arrow, Mark, Bub, Burst, Circ, Rect, hand } from "../dj2/Doodle-kit";
export { RGlow, RDisc, RLine, RRing, RTop, RFace, RBox, RGrid, poseAt } from "../ara/AraIso-rot";
export { sans, serif, seg } from "../iso";
export * from "./look";
export * from "./rig";

// The slot wrapper for round 3: DjSlot with a calmer drift; scene and overlay draw mascots in chalk.
export const Slot: React.FC<React.ComponentProps<typeof DjSlot>> = (p) => (
  <DjSlot driftAmp={0.35} {...p} scene={(f, v) => <Chalk>{p.scene(f, v)}</Chalk>} />
);
