// 1022 "Black October" (CapCut draft 1023). The 1020 dark isometric kit (../iso20/kit) plus the storyboard's props
// (../iso22/Board) and this video's word cues. Face-cam slots are transparent over the real room (no keyed background):
// TopFade darkens the bright ceiling so headroom props read.
import React from "react";
import { AbsoluteFill } from "remotion";

export * from "../iso20/kit";
export { SLOTS, cue } from "./cues";
export { Pin, Card, Unit, BODY, REDT, GREENT, AMBERT } from "../iso22/Board";

// black from the top: 88% -> 60% at 420px -> clear at 760px (DESIGN.md, Hook fade), faded in/out with `op`
export const TopFade: React.FC<{ op?: number }> = ({ op = 1 }) => (
  <AbsoluteFill style={{ opacity: op, background: "linear-gradient(180deg, rgba(0,0,0,0.88) 0px, rgba(0,0,0,0.6) 420px, rgba(0,0,0,0) 760px)" }} />
);
