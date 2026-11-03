import React from "react";
import { loadFont as loadSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadSans } from "@remotion/google-fonts/DMSans";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// 0929 "Jev" overlays. Full-frame transparent, content kept in the headroom
// above the speaker (y ≈ 110–580; his head starts near y 600). Style = the
// Content Kit (Paper file "Content"): black cards, warm-white type, green ONLY
// as a highlighter behind key words; the house fonts (DM Serif
// Display + DM Sans); motion "settle, don't pop". Memes go full-frame. Sound
// effects are baked into the overlay they belong to, so they stay on the beat.
// Beat numbers are frames from each overlay's start, read off the transcript.

const C = {
  black: "#000000",
  paper: "#FEFCF9", // warm white
  hl: "#8ECC9F", // green-300 — highlighter only
  muted: "#C4BCB0", // stone-muted
  line: "rgba(254,252,249,0.16)",
};
const serif = loadSerif("normal", { weights: ["400"] }).fontFamily;
loadSerif("italic", { weights: ["400"] });
const sans = loadSans("normal", { weights: ["400", "500", "600", "700"] }).fontFamily;
const mono = sans; // no mono in the house fonts: small labels are DM Sans, tracked uppercase
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const shadow = "0 30px 80px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)";
const glow = "0 4px 28px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.6)";
const ease = (t: number) => 1 - (1 - t) ** 3;

// Cards settle (no overshoot); only chips/photos get a small snap.
const useSpring = (delay: number, snap = false) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: snap ? { damping: 16, stiffness: 200 } : { damping: 22, stiffness: 110, mass: 0.9 },
  });
};

// Rise 28px, blur 10 → 0.
const enter = (p: number, dy = 28): React.CSSProperties => ({
  opacity: Math.min(1, p * 1.4),
  filter: `blur(${(1 - Math.min(1, p)) * 10}px)`,
  transform: `translateY(${(1 - p) * dy}px)`,
});

// Exit: last 8 frames drift up 12px and fade.
const Scene: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const out = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ fontFamily: sans, color: C.paper, opacity: out, transform: `translateY(${(1 - out) * -12}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

const Panel: React.FC<{ top: number; width?: number; delay?: number; pad?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({
  top,
  width = 920,
  delay = 0,
  pad = "40px 48px",
  style,
  children,
}) => {
  const p = useSpring(delay);
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: (1080 - width) / 2,
        width,
        padding: pad,
        borderRadius: 28,
        background: C.black,
        boxShadow: shadow,
        ...enter(p),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Leaf: React.FC<{ size?: number }> = ({ size = 13 }) => (
  <div style={{ width: size, height: size, borderRadius: `${size}px 0 ${size}px 0`, background: C.hl, flexShrink: 0 }} />
);

const Tag: React.FC<{ children: React.ReactNode; at?: number }> = ({ children, at = 0 }) => {
  const p = useSpring(at);
  return (
    <div style={{ fontFamily: mono, fontSize: 22, letterSpacing: 3.5, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 12, color: C.paper, ...enter(p, 10) }}>
      <Leaf />
      {children}
    </div>
  );
};

// Serif display line.
const Line: React.FC<{ at: number; size?: number; italic?: boolean; color?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({
  at,
  size = 72,
  italic,
  color = C.paper,
  children,
  style,
}) => {
  const p = useSpring(at);
  return (
    <div style={{ fontFamily: serif, fontStyle: italic ? "italic" : "normal", fontSize: size, lineHeight: 1.02, letterSpacing: -size * 0.02, color, ...enter(p, 18), ...style }}>
      {children}
    </div>
  );
};

const Body: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const p = useSpring(at);
  return <div style={{ fontFamily: sans, fontSize: 30, lineHeight: 1.3, color: C.muted, ...enter(p, 12), ...style }}>{children}</div>;
};

// The kit's only green: a highlighter that sweeps across its words on `at`
// (10 frames); the words turn black, italic, on the green block.
const Mark: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame, [at, at + 10], [0, 100], { ...clamp, easing: ease });
  return (
    <span
      style={{
        background: `linear-gradient(to right, ${C.hl} ${w}%, transparent ${w}%)`,
        color: w > 45 ? C.black : "inherit",
        fontStyle: "italic",
        padding: "0 12px 2px",
        borderRadius: 8,
      }}
    >
      {children}
    </span>
  );
};

// Outline chip; `chosen` fills green.
const Chip: React.FC<{ at: number; children: React.ReactNode; chosen?: boolean; style?: React.CSSProperties; size?: number }> = ({
  at,
  children,
  chosen,
  style,
  size = 30,
}) => {
  const p = useSpring(at, true);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 24px",
        borderRadius: 999,
        background: chosen ? C.hl : C.black,
        color: chosen ? C.black : C.paper,
        border: chosen ? `1.5px solid ${C.hl}` : `1.5px solid ${C.paper}`,
        fontFamily: sans,
        fontSize: size,
        fontWeight: 600,
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        opacity: Math.min(1, p * 2),
        transform: `scale(${0.6 + p * 0.4})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// A meme: just the picture, uncropped, sized into the headroom above the
// speaker's face (it may touch the top of the hair) so the face and body stay
// visible. Quick punch-in. Shown from `from` until `to` (default: scene end).
// `aspect` is the picture's width / height, so small images scale up to fill
// the 940×520 headroom box.
const Meme: React.FC<{ src: string; aspect: number; from: number; to?: number }> = ({ src, aspect, from, to }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  if (frame < from || frame >= (to ?? durationInFrames)) return null;
  const punch = spring({ frame: frame - from, fps, config: { damping: 14, stiffness: 260 } });
  const width = Math.min(940, 520 * aspect);
  return (
    <div style={{ position: "absolute", top: 90, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <Img
        src={staticFile(`jev/${src}`)}
        style={{
          width,
          height: width / aspect,
          borderRadius: 20,
          boxShadow: shadow,
          opacity: Math.min(1, punch * 2),
          transform: `scale(${1.15 - punch * 0.15})`,
        }}
      />
    </div>
  );
};

// A sound effect from assets/sound-effects (normalized to about -17 LUFS, just
// under the voice), starting on frame `at` and fading out over the scene's last
// 8 frames so long ones don't cut off abruptly.
const Sfx: React.FC<{ name: string; at: number; volume?: number }> = ({ name, at, volume = 1 }) => {
  const { durationInFrames } = useVideoConfig();
  return (
    <Sequence from={at}>
      <Audio
        src={staticFile(`jev/sfx/${name}.wav`)}
        volume={(f) => volume * interpolate(f + at, [durationInFrames - 8, durationInFrames], [1, 0], clamp)}
      />
    </Sequence>
  );
};

// ------------------------------------------------------------------ scenes

// "A new AI model just dropped. It's an AI that can't talk…" — fully on screen
// from frame 0 so the first frame is the thumbnail; centred left-to-right in
// the headroom above the speaker's face, over a black fade from the top.
export const JevHook: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 125], [1, 1.03]);
  return (
    <Scene>
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0px, rgba(0,0,0,0.6) 380px, rgba(0,0,0,0) 700px)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 140, flexDirection: "column", gap: 10, transformOrigin: "50% 20%", transform: `scale(${drift})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: mono, fontSize: 26, fontWeight: 500, letterSpacing: 5 }}>
          <Leaf size={16} />
          NEW MODEL · TYPESAFE AI
        </div>
        <div style={{ fontFamily: serif, fontSize: 300, lineHeight: 0.95, letterSpacing: -6, textShadow: glow }}>JEV</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <div style={{ fontFamily: serif, fontSize: 84, lineHeight: 1, textShadow: glow }}>AI that</div>
          <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 84, lineHeight: 1.05, color: C.black, background: C.hl, padding: "0 18px 6px", borderRadius: 10, transform: "rotate(-1deg)" }}>
            can&apos;t talk
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

// "It's called Jev, the company behind it is TypeSafe (70)."
export const JevTypeSafe: React.FC = () => {
  const frame = useCurrentFrame();
  const wipe = interpolate(frame, [6, 26], [100, 0], { ...clamp, easing: ease });
  return (
    <Scene>
      <Panel top={140} width={860} pad="20px">
        <div style={{ height: 330, overflow: "hidden", borderRadius: 16, clipPath: `inset(0 ${wipe}% 0 0 round 16px)` }}>
          <Img src={staticFile("jev/typesafe-og.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 12px 6px" }}>
          <Tag at={14}>typesafe.ai</Tag>
          <div style={{ fontFamily: mono, fontSize: 22, color: C.muted, ...enter(useSpring(24), 10) }}>the company behind Jev</div>
        </div>
      </Panel>
    </Scene>
  );
};

// "It's co-founded by the person who co-created (61) InstructGPT, who later
// became ChatGPT." — his launch post, with the launch video playing inside.
export const JevFounder: React.FC = () => (
  <Scene>
    <Panel top={120} width={980} pad="28px">
      <div style={{ display: "flex", gap: 26 }}>
        <div style={{ width: 448, height: 252, flexShrink: 0, borderRadius: 16, overflow: "hidden", background: C.black }}>
          <OffthreadVideo src={staticFile("jev/founder.mp4")} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Img src={staticFile("jev/diogo-avatar.jpg")} style={{ width: 62, height: 62, borderRadius: 31 }} />
            <div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>Diogo Almeida</div>
              <div style={{ fontFamily: mono, fontSize: 19, color: C.muted }}>@CompleteSkeptic · Sep 16</div>
            </div>
          </div>
          <div style={{ fontFamily: serif, fontSize: 32, lineHeight: 1.18, marginTop: 14 }}>
            “After co-inventing ChatGPT, I kept asking myself: why have superhuman chat models not led to AGI?”
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 22 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Chip at={61} chosen size={26}>
            Co-created InstructGPT
          </Chip>
          <Chip at={110} size={26}>
            → ChatGPT
          </Chip>
        </div>
        <div style={{ fontFamily: mono, fontSize: 20, color: C.muted }}>76K likes · 39.8M views</div>
      </div>
    </Panel>
    <Sfx name="anime-wow" at={61} volume={0.9} />
  </Scene>
);

// "They call it a system (11) 1 model. So (53) what's exactly a system 1?"
export const JevSystem1: React.FC = () => (
  <Scene>
    <Panel top={170} width={820} style={{ opacity: useCurrentFrame() >= 53 ? 0 : 1 }}>
      <Tag>TypeSafe calls Jev a</Tag>
      <Line at={8} size={104} style={{ marginTop: 16 }}>
        <Mark at={14}>System 1</Mark> model
      </Line>
      <Body at={30} style={{ marginTop: 14 }}>
        …so what is System 1?
      </Body>
    </Panel>
    <Meme src="monkey-thinking.jpeg" aspect={678 / 452} from={53} />
    <Sfx name="vine-boom" at={53} />
  </Scene>
);

// "Let's say you were on a basketball (28) court and suddenly there was a
// ball flying (100) straight to your face (138)."
export const JevBall: React.FC = () => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [52, 100], [0, 1], { ...clamp, easing: (x) => x ** 2.2 });
  const flash = interpolate(frame, [95, 98, 101], [0, 0.9, 0], clamp);
  return (
    <Scene>
      <Panel top={140} width={800} style={{ opacity: frame >= 100 ? 0 : 1 }}>
        <Tag>Scenario</Tag>
        <Line at={6} size={72} style={{ marginTop: 14 }}>
          You&apos;re on a <Mark at={30}>basketball court</Mark>…
        </Line>
      </Panel>
      <div
        style={{
          position: "absolute",
          left: interpolate(t, [0, 1], [860, 540]),
          top: interpolate(t, [0, 1], [440, 820]),
          fontSize: interpolate(t, [0, 1], [70, 900]),
          transform: `translate(-50%, -50%) rotate(${frame * 9}deg)`,
          opacity: frame < 52 || frame >= 100 ? 0 : 1, // gone on impact
          lineHeight: 1,
        }}
      >
        🏀
      </div>
      <AbsoluteFill style={{ background: C.paper, opacity: flash }} />
      <Meme src="shock-face.jpg" aspect={300 / 279} from={100} />
      <Sfx name="punch" at={96} />
      <Sfx name="shocked" at={102} volume={0.9} />
    </Scene>
  );
};

// Option A: "calculate the ball movement (A 28), 12 m/s (55), velocity (86),
// acceleration (99), downward (120), spinning force (133), … Newton's law (192)?"
export const JevOverload: React.FC = () => {
  const frame = useCurrentFrame();
  const shake = interpolate(frame, [140, 215], [0, 6], clamp) * Math.sin(frame * 1.7);
  const load = interpolate(frame, [20, 215], [0, 23], clamp);
  const chips: [number, string, number, number][] = [
    [55, "v₀ = 12 m/s", 30, 20],
    [86, "velocity", 360, 0],
    [99, "acceleration", 560, 70],
    [120, "↓ downward", 20, 110],
    [133, "spin ω", 330, 120],
    [160, "Δt × 2", 600, 150],
    [192, "F = m·a", 220, 190],
  ];
  return (
    <Scene>
      <Panel top={110} width={940} style={{ transform: `translateX(${shake}px)` }}>
        <Tag>Option A</Tag>
        <Line at={28} size={72} style={{ marginTop: 12 }}>
          Calculate <Mark at={40}>everything</Mark>?
        </Line>
        <div style={{ position: "relative", height: 250, marginTop: 16 }}>
          {chips.map(([at, label, x, y]) => (
            <Chip key={label} at={at} size={26} style={{ position: "absolute", left: x, top: y, fontFamily: mono, fontWeight: 500 }}>
              {label}
            </Chip>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: mono, fontSize: 20, color: C.muted }}>
          computing{".".repeat(1 + (Math.floor(frame / 8) % 3))}
          <div style={{ flex: 1, height: 8, background: C.line, borderRadius: 4 }}>
            <div style={{ width: `${load}%`, height: "100%", background: C.hl, borderRadius: 4 }} />
          </div>
          {Math.round(load)}%
        </div>
      </Panel>
      <Sfx name="eh-eh-ehhh" at={178} />
    </Scene>
  );
};

// "Or you just dodge." — a quick beat, settles fast.
export const JevDodge: React.FC = () => (
  <Scene>
    <Panel top={230} width={720} pad="36px 48px">
      <Tag>Option B</Tag>
      <Line at={0} size={100} style={{ marginTop: 8 }}>
        Just <Mark at={4}>dodge.</Mark>
      </Line>
    </Panel>
    <Sfx name="metal-pipe" at={2} volume={0.85} />
  </Scene>
);

// "That's System 1. Fast (31) thinking, pure (59) reflexes. System 2 is the
// slow (126) thinking one, coming from the book (172) Thinking, Fast and Slow."
export const JevSystems: React.FC = () => {
  const col = (tag: string, tagAt: number, big: React.ReactNode, bigAt: number, sub: string, subAt: number) => (
    <div style={{ flex: 1 }}>
      <Tag at={tagAt}>{tag}</Tag>
      <Line at={bigAt} size={96} style={{ marginTop: 12 }}>
        {big}
      </Line>
      <Body at={subAt} style={{ marginTop: 8 }}>
        {sub}
      </Body>
    </div>
  );
  return (
    <Scene>
      <Panel top={120} width={960}>
        <div style={{ display: "flex", gap: 40 }}>
          {col("System 1", 19, <Mark at={31}>Fast</Mark>, 25, "pure reflexes", 59)}
          <div style={{ width: 1.5, background: C.line }} />
          {col("System 2", 114, "Slow", 120, "deliberate thinking", 140)}
        </div>
        <div style={{ marginTop: 26, fontFamily: mono, fontSize: 22, color: C.muted, ...enter(useSpring(166), 10) }}>
          from “Thinking, Fast and Slow” · Daniel Kahneman
        </div>
      </Panel>
    </Scene>
  );
};

// "You give Jev some context (19) with question (51) and fixed (76) answers.
// It will return (118) you one of three types."
export const JevIO: React.FC = () => {
  const frame = useCurrentFrame();
  const line = interpolate(frame, [90, 112], [0, 1], clamp);
  const node = useSpring(100);
  return (
    <Scene>
      <Panel top={120} width={960}>
        <Tag>How you use Jev</Tag>
        <div style={{ display: "flex", alignItems: "center", marginTop: 22, height: 250 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 300, alignItems: "flex-start" }}>
            <Chip at={19} size={28}>Context</Chip>
            <Chip at={51} size={28}>Question</Chip>
            <Chip at={76} size={28}>Fixed answers</Chip>
          </div>
          <div style={{ flex: 1, height: 2, background: C.line }}>
            <div style={{ width: `${line * 100}%`, height: "100%", background: C.paper }} />
          </div>
          <div style={{ textAlign: "center", ...enter(node, 16) }}>
            <Img src={staticFile("jev/typesafe-icon.png")} style={{ width: 118, height: 118 }} />
            <div style={{ fontFamily: mono, fontSize: 24, marginTop: 6, letterSpacing: 3 }}>JEV</div>
          </div>
          <div style={{ width: 56, height: 2, background: frame > 112 ? C.paper : C.line, margin: "0 6px" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Chip at={118} chosen size={26}>Typed decision</Chip>
            <div style={{ display: "flex", gap: 8 }}>
              <Chip at={142} size={20}>choice</Chip>
              <Chip at={148} size={20}>score</Chip>
              <Chip at={154} size={20}>yes/no</Chip>
            </div>
          </div>
        </div>
      </Panel>
    </Scene>
  );
};

const Prob: React.FC<{ label: string; at: number; value: number; hot?: boolean; hotAt?: number }> = ({ label, at, value, hot, hotAt = 0 }) => {
  const frame = useCurrentFrame();
  const p = useSpring(at);
  const fill = interpolate(frame, [at + 4, at + 22], [0, value], { ...clamp, easing: ease });
  const lit = hot && frame >= hotAt;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, height: 52, ...enter(p, 12) }}>
      <div style={{ width: 210, fontFamily: mono, fontSize: 28 }}>
        <span style={{ background: lit ? C.hl : "transparent", color: lit ? C.black : C.paper, padding: "2px 8px", borderRadius: 6 }}>{label}</span>
      </div>
      <div style={{ flex: 1, height: 18, background: C.line, borderRadius: 9 }}>
        <div style={{ width: `${fill * 100}%`, height: "100%", borderRadius: 9, background: lit ? C.hl : C.paper }} />
      </div>
      <div style={{ width: 80, fontFamily: mono, fontSize: 26, color: lit ? C.paper : C.muted }}>{fill.toFixed(2)}</div>
    </div>
  );
};

// "Pick one option from a list (57). Like what programming language is this?
// Python (130)? Rust (145)? TypeScript (161)?"
export const JevChoose: React.FC = () => (
  <Scene>
    <Panel top={110} width={940}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Tag>Type 1 · Choice</Tag>
        <div style={{ fontFamily: mono, fontSize: 18, color: C.muted }}>example</div>
      </div>
      <Line at={6} size={68} style={{ marginTop: 12 }}>
        Pick <Mark at={40}>one</Mark> from a list
      </Line>
      <div style={{ fontFamily: mono, fontSize: 24, marginTop: 16, padding: "12px 18px", border: `1.5px solid ${C.line}`, borderRadius: 12, color: C.muted, ...enter(useSpring(60), 10) }}>
        const x: number = 1; // which language?
      </div>
      <div style={{ marginTop: 12 }}>
        <Prob label="Python" at={126} value={0.04} />
        <Prob label="Rust" at={141} value={0.03} />
        <Prob label="TypeScript" at={157} value={0.93} hot hotAt={161} />
      </div>
    </Panel>
  </Scene>
);

// "Score puts something on a scale (58), like how urgent it is, from low (117)
// to critical (135)." — the marker lands a beat early so it reads before the exit.
export const JevScore: React.FC = () => {
  const frame = useCurrentFrame();
  const pos = interpolate(frame, [70, 108, 124], [0.05, 0.08, 0.92], { ...clamp, easing: ease });
  const levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  return (
    <Scene>
      <Panel top={140} width={920}>
        <Tag>Type 2 · Score</Tag>
        <Line at={6} size={72} style={{ marginTop: 12 }}>
          How <Mark at={62}>urgent</Mark> is it?
        </Line>
        <div style={{ position: "relative", marginTop: 48, ...enter(useSpring(50), 12) }}>
          <div style={{ height: 14, borderRadius: 7, background: C.line }}>
            <div style={{ width: `${pos * 100}%`, height: "100%", borderRadius: 7, background: C.paper }} />
          </div>
          <div style={{ position: "absolute", top: -9, left: `${pos * 100}%`, width: 32, height: 32, borderRadius: 16, background: C.paper, transform: "translateX(-50%)", boxShadow: "0 0 0 6px rgba(0,0,0,1)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, fontFamily: mono, fontSize: 20 }}>
            {levels.map((l) => {
              const lit = l === "CRITICAL" && frame >= 124;
              return (
                <span key={l} style={{ color: lit ? C.black : C.muted, background: lit ? C.hl : "transparent", padding: "2px 8px", borderRadius: 6 }}>
                  {l}
                </span>
              );
            })}
          </div>
        </div>
      </Panel>
    </Scene>
  );
};

// "And yes (21) or no … it will give you a probability (92) between yes or no."
export const JevYesNo: React.FC = () => {
  const frame = useCurrentFrame();
  const yes = interpolate(frame, [92, 120], [0.5, 0.82], { ...clamp, easing: ease });
  return (
    <Scene>
      <Panel top={140} width={920}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Tag>Type 3 · Yes / No</Tag>
          <div style={{ fontFamily: mono, fontSize: 18, color: C.muted }}>example</div>
        </div>
        <Line at={6} size={72} style={{ marginTop: 12 }}>
          Yes or no, <Mark at={94}>as a probability</Mark>
        </Line>
        <div style={{ display: "flex", height: 68, marginTop: 34, borderRadius: 14, overflow: "hidden", border: `1.5px solid ${C.line}`, ...enter(useSpring(24), 12) }}>
          <div style={{ width: `${yes * 100}%`, background: C.hl, color: C.black, display: "flex", alignItems: "center", paddingLeft: 22, fontFamily: mono, fontSize: 28, fontWeight: 500 }}>
            YES {yes.toFixed(2)}
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 22, fontFamily: mono, fontSize: 28, color: C.muted }}>
            NO {(1 - yes).toFixed(2)}
          </div>
        </div>
      </Panel>
    </Scene>
  );
};

// "The best part, of course (0–58: the cat, full-frame), it's cheap (65) and
// really fast (110)."
export const JevCheap: React.FC = () => (
  <Scene>
    <div style={{ position: "absolute", top: 220, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 22 }}>
      <Chip at={62} size={56}>
        $ Cheap
      </Chip>
      <Chip at={96} chosen size={56}>
        ⚡ Fast
      </Chip>
    </div>
    <Meme src="cat-lick.png" aspect={451 / 498} from={0} to={58} />
    <Sfx name="anime-wow" at={2} volume={0.8} />
  </Scene>
);

const Count: React.FC<{ to: number; at: number; label: string }> = ({ to, at, label }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [at, at + 28], [0, to], { ...clamp, easing: (t) => 1 - (1 - t) ** 4 });
  const p = useSpring(at - 4);
  return (
    <div style={{ flex: 1, ...enter(p, 16) }}>
      <div style={{ fontFamily: serif, fontSize: 150, lineHeight: 0.95, letterSpacing: -4 }}>
        {v.toFixed(1)}
        <span style={{ fontStyle: "italic", color: C.muted }}>×</span>
      </div>
      <div style={{ marginTop: 10 }}>
        <span style={{ fontFamily: mono, fontSize: 24, letterSpacing: 3, background: C.hl, color: C.black, padding: "3px 10px", borderRadius: 6 }}>{label}</span>
      </div>
    </div>
  );
};

// "In TypeSafe's own report it says 193 (90) times faster and 444 (181) times
// cheaper, although (254) we didn't know which AI model they are comparing it with."
export const JevStats: React.FC = () => (
  <Scene>
    <Panel top={130} width={960}>
      <Tag>TypeSafe&apos;s own report</Tag>
      <div style={{ display: "flex", gap: 30, marginTop: 24 }}>
        <Count to={193.6} at={86} label="FASTER" />
        <Count to={444.6} at={177} label="CHEAPER" />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28 }}>
        <div style={{ fontFamily: mono, fontSize: 20, color: C.muted }}>source: typesafe.ai · System One tasks</div>
        <Chip at={254} size={24}>
          vs. which model? 🤔
        </Chip>
      </div>
    </Panel>
    <Sfx name="vine-boom" at={88} volume={0.8} />
    <Sfx name="dun-dun-dun" at={254} volume={0.85} />
  </Scene>
);

// "You can use it for AI automation (24) software or any apps (102) that need
// quick decisions. Model routing (170), lead generation (185), market research (228)."
export const JevUseCases: React.FC = () => (
  <Scene>
    <Panel top={130} width={960}>
      <Tag>Use Jev for</Tag>
      <Line at={4} size={72} style={{ marginTop: 12 }}>
        Quick decisions, <Mark at={100}>at scale</Mark>
      </Line>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 24 }}>
        <Chip at={24} size={28}>AI automation</Chip>
        <Chip at={102} size={28}>Apps that need quick decisions</Chip>
        <Chip at={170} size={28}>Model routing</Chip>
        <Chip at={185} size={28}>Lead generation</Chip>
        <Chip at={228} size={28}>Market research</Chip>
      </div>
    </Panel>
  </Scene>
);

// "Comment Jev and I'll send you the full documentation."
export const JevCta: React.FC = () => (
  <Scene>
    <Panel top={220} width={760} pad="36px 48px">
      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <div style={{ fontFamily: serif, fontSize: 96, lineHeight: 1 }}>Comment</div>
        <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 96, lineHeight: 1, color: C.black, background: C.hl, padding: "0 18px 6px", borderRadius: 10 }}>JEV</div>
      </div>
      <div style={{ fontFamily: mono, fontSize: 24, color: C.muted, marginTop: 14 }}>→ I&apos;ll send you the full docs</div>
    </Panel>
  </Scene>
);
