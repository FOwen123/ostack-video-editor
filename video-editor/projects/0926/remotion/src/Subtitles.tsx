// The English + Traditional Chinese subtitles of a video rendered whole in Remotion (DESIGN.md, Subtitles), matched to
// CapCut's captions.py look: DM Sans Bold over Noto Sans TC Bold, Paper with a thin black outline, centred on y 1478 and
// 1630 (77% and 85% down). cues: [start seconds, English, Chinese], punctuation already stripped (captions.bare); each
// holds until the next starts, and ["", ""] ends the one before it.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadTC } from "@remotion/google-fonts/NotoSansTC";

const { fontFamily: sans } = loadSans("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: tc } = loadTC("normal", { weights: ["700"] });

export type Cue = [number, string, string];

const line = (top: number, fontFamily: string, fontSize: number, text: string) => (
  <div
    style={{
      position: "absolute", left: 80, right: 80, top, transform: "translateY(-50%)", textAlign: "center",
      fontFamily, fontWeight: 700, fontSize, lineHeight: 1, color: "#FEFCF9", whiteSpace: "nowrap",
      WebkitTextStroke: "6px #000", paintOrder: "stroke fill",
    }}
  >
    {text}
  </div>
);

export const Subtitles: React.FC<{ cues: Cue[] }> = ({ cues }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const cue = cues.filter((c) => c[0] <= t).pop();
  if (!cue) return null;
  return (
    <AbsoluteFill>
      {cue[1] && line(1478, sans, 43.5, cue[1])}
      {cue[2] && line(1630, tc, 56, cue[2])}
    </AbsoluteFill>
  );
};
