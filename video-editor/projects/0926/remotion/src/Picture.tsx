import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadSans } from "@remotion/google-fonts/DMSans";

// A still picture for a "pictures only" video (1004): no motion, it hard-cuts in
// and out with the line it illustrates. Sized into the 940 × 520 headroom box
// above the speaker's face (DESIGN.md, Memes and pictures). A photo or
// screenshot shows as-is with rounded corners; `logos` (transparent icons) sit
// side by side on a white card so they read on any background.
// Rendered with `remotion still Picture --props='{...}'`, then held as a clip.

// `width` and `centerY` override the default box: a wide screenshot can grow to
// 1000px and sit centred in the headroom instead of hugging the top.
type Props = {
  src?: string;
  aspect?: number;
  logos?: string[];
  width?: number;
  centerY?: number;
  title?: string; // hook text under the picture (1005), plain white serif
  // "A → B" rows on a white card (1005 harness: Claude Code → Claude, Codex → ChatGPT).
  rows?: { left: string; right: string; rightLabel?: string }[];
  tileSize?: { w: number; h: number }; // bigger tiles for a hook (1006)
};

const TILE = { w: 360, h: 210 };
const tile: React.CSSProperties = {
  width: TILE.w,
  height: TILE.h,
  borderRadius: 16,
  objectFit: "cover",
  boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
};

const Flow: React.FC<{
  rows: NonNullable<Props["rows"]>;
  size?: Props["tileSize"];
}> = ({ rows, size }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 28,
      padding: "36px 40px",
      borderRadius: 28,
      background: "#FFFFFF",
      boxShadow: shadow,
    }}
  >
    {rows.map((r) => (
      <div
        key={r.left}
        style={{ display: "flex", alignItems: "center", gap: 26 }}
      >
        <Img
          src={staticFile(r.left)}
          style={
            r.left.endsWith(".svg") // a wordmark: fit it on a white tile
              ? {
                  ...tile,
                  objectFit: "contain",
                  padding: 26,
                  background: "#FFFFFF",
                  border: "2px solid #ECECEC",
                  boxSizing: "border-box",
                }
              : size
                ? {
                    ...tile,
                    width: size.w,
                    height: size.h,
                    objectFit: "contain",
                    background: "#FFFFFF",
                  }
                : tile
          }
        />
        <div style={{ fontSize: 72, color: "#000000", lineHeight: 1 }}>→</div>
        {r.rightLabel ? (
          <div
            style={{
              ...tile,
              boxShadow: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 22,
            }}
          >
            <Img
              src={staticFile(r.right)}
              style={{ width: 130, height: 130, objectFit: "contain" }}
            />
            <div
              style={{
                fontFamily: sans,
                fontWeight: 700,
                fontSize: 52,
                color: "#000000",
              }}
            >
              {r.rightLabel}
            </div>
          </div>
        ) : (
          <Img
            src={staticFile(r.right)}
            style={size ? { ...tile, width: size.w, height: size.h } : tile}
          />
        )}
      </div>
    ))}
  </div>
);

const serif = loadSerif("normal", { weights: ["400"] }).fontFamily;
loadSerif("italic", { weights: ["400"] });

const sans = loadSans("normal", { weights: ["700"] }).fontFamily;

const BOX = { w: 940, h: 520, top: 90 };
const shadow = "0 30px 80px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)";

export const Picture: React.FC<Props> = ({
  src,
  aspect = 16 / 9,
  logos,
  width,
  centerY,
  title,
  rows,
  tileSize,
}) => {
  const w = width ?? Math.min(BOX.w, BOX.h * aspect);
  const top = centerY === undefined ? BOX.top : centerY - w / aspect / 2;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
        }}
      >
        {rows ? (
          <Flow rows={rows} size={tileSize} />
        ) : logos ? (
          <div
            style={{
              display: "flex",
              gap: 90,
              padding: "56px 80px",
              borderRadius: 28,
              background: "#FFFFFF",
              boxShadow: shadow,
            }}
          >
            {logos.map((l) => (
              <Img
                key={l}
                src={staticFile(l)}
                style={{ width: 260, height: 260, objectFit: "contain" }}
              />
            ))}
          </div>
        ) : src ? (
          <Img
            src={staticFile(src)}
            style={{
              width: w,
              height: w / aspect,
              borderRadius: 20,
              boxShadow: shadow,
              objectFit: "cover",
            }}
          />
        ) : null /* title only, e.g. a "Comment X" card (1008) */}
        {title ? (
          <div
            style={{
              fontFamily: serif,
              fontSize: 100,
              lineHeight: 1.05,
              textAlign: "center",
              maxWidth: 1000,
              letterSpacing: -2,
              color: "#FEFCF9",
              textShadow:
                "0 4px 30px rgba(0,0,0,0.75), 0 2px 6px rgba(0,0,0,0.8)",
            }}
          >
            {title}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// The title hook as plain text above the head, still (no motion), over the black
// top fade so it reads on frame 0, the thumbnail. `mark` is the one word on the
// green highlighter (DESIGN.md, Hook). Text for 1004.
const HOOK = { lines: ["Stop taking advice", "in your 20s"], mark: "" }; // 1004: plain text, no highlighter

export const TitleHook: React.FC = () => {
  const { lines, mark } = HOOK;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.85) 0px, rgba(0,0,0,0.6) 380px, rgba(0,0,0,0) 700px)",
        }}
      />
      <AbsoluteFill
        style={{
          alignItems: "center",
          paddingTop: 170,
          flexDirection: "column",
          gap: 6,
        }}
      >
        {lines.map((line) => (
          <div
            key={line}
            style={{
              fontFamily: serif,
              fontSize: 116,
              lineHeight: 1.08,
              letterSpacing: -2,
              color: "#FEFCF9",
              textShadow: "0 4px 28px rgba(0,0,0,0.5)",
            }}
          >
            {line.split(" ").map((word, i) => (
              <React.Fragment key={i}>
                {i > 0 ? " " : null}
                {word === mark ? (
                  <span
                    style={{
                      fontStyle: "italic",
                      color: "#000000",
                      background: "#8ECC9F",
                      padding: "0 18px 6px",
                      borderRadius: 10,
                      display: "inline-block",
                      transform: "rotate(-1deg)",
                    }}
                  >
                    {word}
                  </span>
                ) : (
                  word
                )}
              </React.Fragment>
            ))}
          </div>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
