import React from "react";
import { loadFont as loadSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadSans } from "@remotion/google-fonts/DMSans";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// 0930 "OpenAI DevDay" overlays. Same layout and motion as Jev.tsx (black
// cards in the headroom above the speaker, whose hair starts near y 750;
// "settle, don't pop"; same fonts) but in the palette of openai.com's DevDay
// 2026 recap: black, pure white, 60% white for secondary text, and its four
// accents. OpenAI blue is the highlighter; each announcement gets one accent
// for its number dot. Beat numbers are frames from each overlay's start.
// ponytail: primitives are copied from Jev.tsx with a different palette; pull
// them into a shared themed kit when a third video needs them.

const C = {
  black: "#000000",
  white: "#FFFFFF",
  muted: "rgba(255,255,255,0.6)",
  line: "rgba(255,255,255,0.2)",
  blue: "#006AFF", // highlighter
  green: "#00AB44",
  purple: "#924FF7",
  orange: "#F26D00",
};
const serif = loadSerif("normal", { weights: ["400"] }).fontFamily;
loadSerif("italic", { weights: ["400"] });
const sans = loadSans("normal", { weights: ["400", "500", "600", "700"] }).fontFamily;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const shadow = "0 30px 80px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)";
const glow = "0 4px 28px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.6)";
const ease = (t: number) => 1 - (1 - t) ** 3;

const useSpring = (delay: number, snap = false) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: snap ? { damping: 16, stiffness: 200 } : { damping: 22, stiffness: 110, mass: 0.9 },
  });
};

const enter = (p: number, dy = 28): React.CSSProperties => ({
  opacity: Math.min(1, p * 1.4),
  filter: `blur(${(1 - Math.min(1, p)) * 10}px)`,
  transform: `translateY(${(1 - p) * dy}px)`,
});

const Scene: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const out = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ fontFamily: sans, color: C.white, opacity: out, transform: `translateY(${(1 - out) * -12}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

const Panel: React.FC<{ top?: number; width?: number; pad?: string; children: React.ReactNode }> = ({
  top = 110,
  width = 940,
  pad = "40px 48px",
  children,
}) => (
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
      ...enter(useSpring(0)),
    }}
  >
    {children}
  </div>
);

const Dot: React.FC<{ color?: string; size?: number }> = ({ color = C.blue, size = 14 }) => (
  <div style={{ width: size, height: size, borderRadius: size, background: color, flexShrink: 0 }} />
);

const Tag: React.FC<{ children: React.ReactNode; color?: string; at?: number; right?: React.ReactNode }> = ({ children, color, at = 0, right }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...enter(useSpring(at), 10) }}>
    <div style={{ fontSize: 22, letterSpacing: 3.5, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 12 }}>
      <Dot color={color} />
      {children}
    </div>
    {right ? <div style={{ fontSize: 20, color: C.muted }}>{right}</div> : null}
  </div>
);

const Line: React.FC<{ at: number; size?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, size = 72, children, style }) => (
  <div style={{ fontFamily: serif, fontSize: size, lineHeight: 1.05, letterSpacing: -size * 0.02, ...enter(useSpring(at), 18), ...style }}>
    {children}
  </div>
);

// Blue highlighter sweeping across its words on `at`; the words stay white.
const Mark: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const w = interpolate(useCurrentFrame(), [at, at + 10], [0, 100], { ...clamp, easing: ease });
  return (
    <span style={{ background: `linear-gradient(to right, ${C.blue} ${w}%, transparent ${w}%)`, fontStyle: "italic", padding: "0 12px 2px", borderRadius: 8 }}>
      {children}
    </span>
  );
};

// Outline pill; `chosen` fills blue.
const Chip: React.FC<{ at: number; children: React.ReactNode; chosen?: boolean; size?: number }> = ({ at, children, chosen, size = 28 }) => {
  const p = useSpring(at, true);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 24px",
        borderRadius: 999,
        background: chosen ? C.blue : C.black,
        border: `1.5px solid ${chosen ? C.blue : C.white}`,
        fontSize: size,
        fontWeight: 600,
        opacity: Math.min(1, p * 2),
        transform: `scale(${0.6 + p * 0.4})`,
      }}
    >
      {children}
    </div>
  );
};

const Row: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 18, ...style }}>{children}</div>
);

// An official DevDay picture (16:9), wiped in from the left.
const Shot: React.FC<{ src: string; height?: number }> = ({ src, height = 476 }) => {
  const wipe = interpolate(useCurrentFrame(), [4, 22], [100, 0], { ...clamp, easing: ease });
  return (
    <div style={{ height, borderRadius: 16, overflow: "hidden", clipPath: `inset(0 ${wipe}% 0 0 round 16px)`, marginTop: 18 }}>
      <Img src={staticFile(`devday/${src}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
};

// Cuts from OpenAI's "dots" film: [overlay frame, film second] pairs, hard cuts.
const Film: React.FC<{ cuts: [number, number][]; height?: number }> = ({ cuts, height = 476 }) => {
  const { durationInFrames, fps } = useVideoConfig();
  return (
    <div style={{ height, borderRadius: 16, overflow: "hidden", marginTop: 18, position: "relative", background: C.black }}>
      {cuts.map(([at, sec], i) => (
        <Sequence key={at} from={at} durationInFrames={(cuts[i + 1]?.[0] ?? durationInFrames) - at} layout="none">
          <OffthreadVideo src={staticFile("devday/dots.mp4")} startFrom={Math.round(sec * fps)} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        </Sequence>
      ))}
    </div>
  );
};

const Sfx: React.FC<{ name: string; at: number; volume?: number }> = ({ name, at, volume = 1 }) => {
  const { durationInFrames } = useVideoConfig();
  return (
    <Sequence from={at}>
      <Audio src={staticFile(`devday/sfx/${name}.wav`)} volume={(f) => volume * interpolate(f + at, [durationInFrames - 8, durationInFrames], [1, 0], clamp)} />
    </Sequence>
  );
};

// The OpenAI blossom (from openai.com/favicon.svg), white.
const Blossom: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="29.5 30 121 120" fill={C.white}>
    <path d="M75.91 73.628V62.232c0-.96.36-1.68 1.199-2.16l22.912-13.194c3.119-1.8 6.838-2.639 10.676-2.639 14.394 0 23.511 11.157 23.511 23.032 0 .839 0 1.799-.12 2.758l-23.752-13.914c-1.439-.84-2.879-.84-4.318 0L75.91 73.627Zm53.499 44.383v-27.23c0-1.68-.72-2.88-2.159-3.719L97.142 69.55l9.836-5.638c.839-.48 1.559-.48 2.399 0l22.912 13.195c6.598 3.839 11.035 11.995 11.035 19.912 0 9.116-5.397 17.513-13.915 20.992v.001Zm-60.577-23.99-9.836-5.758c-.84-.48-1.2-1.2-1.2-2.16v-26.39c0-12.834 9.837-22.55 23.152-22.55 5.039 0 9.716 1.679 13.676 4.678L70.993 55.516c-1.44.84-2.16 2.039-2.16 3.719v34.787-.002Zm21.173 12.234L75.91 98.339V81.546l14.095-7.917 14.094 7.917v16.793l-14.094 7.916Zm9.056 36.467c-5.038 0-9.716-1.68-13.675-4.678l23.631-13.676c1.439-.839 2.159-2.038 2.159-3.718V85.863l9.956 5.757c.84.48 1.2 1.2 1.2 2.16v26.389c0 12.835-9.957 22.552-23.27 22.552v.001Zm-28.43-26.75L47.72 102.778c-6.599-3.84-11.036-11.996-11.036-19.913 0-9.236 5.518-17.513 14.034-20.992v27.35c0 1.68.72 2.879 2.16 3.718l29.989 17.393-9.837 5.638c-.84.48-1.56.48-2.399 0Zm-1.318 19.673c-13.555 0-23.512-10.196-23.512-22.792 0-.959.12-1.919.24-2.879l23.63 13.675c1.44.84 2.88.84 4.32 0l30.108-17.392v11.395c0 .96-.361 1.68-1.2 2.16l-22.912 13.194c-3.119 1.8-6.837 2.639-10.675 2.639Zm29.748 14.274c14.515 0 26.63-10.316 29.39-23.991 13.434-3.479 22.071-16.074 22.071-28.91 0-8.396-3.598-16.553-10.076-22.43.6-2.52.96-5.039.96-7.557 0-17.153-13.915-29.99-29.989-29.99-3.239 0-6.358.48-9.477 1.56-5.398-5.278-12.835-8.637-20.992-8.637-14.515 0-26.63 10.316-29.39 23.991-13.434 3.48-22.07 16.074-22.07 28.91 0 8.396 3.598 16.553 10.075 22.431-.6 2.519-.96 5.038-.96 7.556 0 17.154 13.915 29.989 29.99 29.989 3.238 0 6.357-.479 9.476-1.559 5.397 5.278 12.835 8.637 20.992 8.637Z" />
  </svg>
);

// ------------------------------------------------------------------ scenes

// The hook card. `head` and `stamp` run 0 → 1 (logo, then the
// highlighter); at 1, 1 and scale 1 it is exactly frame 0 of the video.
const HookCard: React.FC<{ head?: number; stamp?: number; scale?: number }> = ({ head = 1, stamp = 1, scale = 1 }) => (
  <>
    <AbsoluteFill style={{ opacity: head, background: "linear-gradient(to bottom, rgba(0,0,0,0.9) 0px, rgba(0,0,0,0.7) 480px, rgba(0,0,0,0) 820px)" }} />
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 200, flexDirection: "column", gap: 18, transformOrigin: "50% 20%", transform: `scale(${scale})` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 30, filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.5))", ...enter(head, 18) }}>
        <Blossom size={170} />
        <div style={{ fontFamily: serif, fontSize: 190, lineHeight: 1, letterSpacing: -4, textShadow: glow }}>OpenAI</div>
      </div>
      <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 150, lineHeight: 1.05, background: C.blue, padding: "0 30px 12px", borderRadius: 14, opacity: stamp, transform: `rotate(-1.5deg) scale(${1.25 - stamp * 0.25})` }}>
        Cooked???
      </div>
    </AbsoluteFill>
  </>
);

// "OpenAI just gave you a 24/7 AI employee that never stops." Fully on screen
// from frame 0 (thumbnail); whoosh on the first frame.
export const DevDayHook: React.FC = () => {
  const drift = interpolate(useCurrentFrame(), [0, 133], [1, 1.03]);
  return (
    <Scene>
      <HookCard scale={drift} />
      <Sfx name="whoosh-clean" at={0} />
    </Scene>
  );
};

// Last line, "Did OpenAI (10) just cook (30)?": the hook card builds back up and
// its last frame is exactly frame 0, so the Reel's replay is one continuous
// shot. No exit fade.
export const DevDayLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const head = interpolate(frame, [6, 20], [0, 1], { ...clamp, easing: ease });
  const stamp = interpolate(frame, [28, 36], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ fontFamily: sans, color: C.white }}>
      <HookCard head={head} stamp={stamp} />
    </AbsoluteFill>
  );
};

// "Yesterday was OpenAI Dev Day, they dropped over 20 (98) updates. Here are 5 (138) things…"
export const DevDayRecap: React.FC = () => {
  const accents = [C.purple, C.blue, C.green, C.orange, C.purple];
  return (
    <Scene>
      <Panel>
        <Tag right="Sep 29, 2026">OpenAI DevDay</Tag>
        <Line at={90} size={96} style={{ marginTop: 18 }}>
          <Mark at={98}>20+</Mark> updates
        </Line>
        <Line at={138} size={56} style={{ marginTop: 22, color: C.muted }}>
          5 you should know
        </Line>
        <Row style={{ marginTop: 22 }}>
          {accents.map((c, i) => (
            <Chip key={i} at={140 + i * 5} size={26}>
              <Dot color={c} />0{i + 1}
            </Chip>
          ))}
        </Row>
      </Panel>
    </Scene>
  );
};

// "First, dots (19), always on (51) agent … GPT-6 Astra (124). Each one has their
// own computer (205) and browser, connects to 4,000 (269) apps and keeps (292)
// working on your goal even when you're not there."
export const DevDayDots: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Scene>
      <Panel top={90} pad="28px 32px">
        <Tag color={C.purple} right="always-on agents">
          01 · Dots
        </Tag>
        <Film height={450} cuts={[[0, 1.8], [51, 20.0], [124, 33.0], [205, 45.5], [269, 62.5], [292, 72.0]]} />
        {frame < 292 ? (
          <Row>
            <Chip at={51} size={26}>Always on</Chip>
            <Chip at={124} size={26}>GPT-6 Astra</Chip>
            <Chip at={205} size={26}>Own computer</Chip>
            <Chip at={269} chosen size={26}>4,000 apps</Chip>
          </Row>
        ) : (
          <Row>
            <Chip at={328} chosen size={26}>Works while you&apos;re away</Chip>
          </Row>
        )}
      </Panel>
    </Scene>
  );
};

// "You can now scroll (5) your Instagram (30), TikTok (44), all while still getting your work (115) done."
export const DevDayScroll: React.FC = () => (
  <Scene>
    <Panel top={90} pad="28px 32px">
      <Tag color={C.purple}>Meanwhile, you</Tag>
      <Film height={450} cuts={[[0, 70.2], [60, 130.0]]} />
      <Row>
        <Chip at={30} size={26}>Instagram</Chip>
        <Chip at={44} size={26}>TikTok</Chip>
        <Chip at={90} chosen size={26}>Work: done ✓</Chip>
      </Row>
    </Panel>
    <Sfx name="shocked" at={5} volume={0.9} />
  </Scene>
);

// "Second, ChatGPT Space (14). A shared workspace for your teams. Think of it like
// Google Docs (131), but for you and your agents (191)."
export const DevDaySpace: React.FC = () => (
  <Scene>
    <Panel top={90} pad="28px 32px">
      <Tag color={C.blue} right="shared workspace">
        02 · ChatGPT Space
      </Tag>
      <Shot src="space.png" height={430} />
      <Line at={129} size={50} style={{ marginTop: 20 }}>
        Google Docs, for you + your <Mark at={191}>agents</Mark>
      </Line>
    </Panel>
  </Scene>
);

// "Dots can also work there. Leave a comment (56) and dots will pick it up (94)
// and do the work (124) for you."
export const DevDayComment: React.FC = () => {
  const frame = useCurrentFrame();
  const bar = (w: number) => <div style={{ height: 14, width: `${w}%`, borderRadius: 7, background: C.line, marginTop: 14 }} />;
  const done = frame >= 124;
  return (
    <Scene>
      <Panel top={120}>
        <Tag color={C.blue} right="in your Space">
          Q4 launch plan
        </Tag>
        {bar(92)}
        {bar(78)}
        {bar(64)}
        <div style={{ marginTop: 26, padding: "18px 22px", border: `1.5px solid ${C.line}`, borderRadius: 16, ...enter(useSpring(56, true), 14) }}>
          <div style={{ fontSize: 20, color: C.muted }}>You · comment</div>
          <div style={{ fontSize: 30, fontWeight: 500, marginTop: 6 }}>@dot draft the launch email</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18, ...enter(useSpring(94, true), 14) }}>
          <Dot color={C.purple} size={44} />
          <div style={{ fontSize: 28, fontWeight: 600 }}>{done ? "Done. Draft added ✓" : "dot picked this up…"}</div>
        </div>
      </Panel>
    </Scene>
  );
};

// "Third, GPT-6.1 Sol (15). Literally dropped one week (118) after GPT-6 Sol."
export const DevDaySol: React.FC = () => (
  <Scene>
    <Panel top={90} pad="28px 32px">
      <Tag color={C.green} right="new model">
        03 · GPT-6.1 Sol
      </Tag>
      <Shot src="sol.png" height={430} />
      <Row>
        <Chip at={118} chosen size={26}>1 week after GPT-6 Sol</Chip>
      </Row>
    </Panel>
  </Scene>
);

// "It's close to Astra (10) in terms of intelligence (43) with one-fifth (84) of the price."
export const DevDayPrice: React.FC = () => {
  const frame = useCurrentFrame();
  const grow = (at: number, to: number) => interpolate(frame, [at, at + 16], [0, to], { ...clamp, easing: ease });
  const bar = (label: string, w: number, color: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 12 }}>
      <div style={{ width: 150, fontSize: 24, color: C.muted }}>{label}</div>
      <div style={{ flex: 1, height: 30 }}>
        <div style={{ width: `${w}%`, height: "100%", borderRadius: 8, background: color }} />
      </div>
    </div>
  );
  return (
    <Scene>
      <Panel top={130}>
        <Tag color={C.green}>GPT-6.1 Sol vs GPT-6 Astra</Tag>
        <div style={{ fontSize: 26, fontWeight: 600, marginTop: 26 }}>Intelligence</div>
        {bar("Astra", grow(10, 100), C.muted)}
        {bar("6.1 Sol", grow(43, 90), C.white)}
        <div style={{ fontSize: 26, fontWeight: 600, marginTop: 30 }}>Price</div>
        {bar("Astra", grow(70, 100), C.muted)}
        {bar("6.1 Sol", grow(84, 20), C.blue)}
        <Line at={90} size={60} style={{ marginTop: 24 }}>
          Near-Astra, <Mark at={100}>⅕ the price</Mark>
        </Line>
      </Panel>
    </Scene>
  );
};

// "4. Ultrafast (30). It runs 8 (79) times faster in Codex (115)."
export const DevDayUltrafast: React.FC = () => (
  <Scene>
    <Panel top={90} pad="28px 32px">
      <Tag color={C.orange} right="speed tier">
        04 · Ultrafast
      </Tag>
      <Shot src="ultrafast.png" height={430} />
      <Line at={79} size={64} style={{ marginTop: 18 }}>
        <Mark at={79}>8×</Mark> faster in Codex
      </Line>
    </Panel>
  </Scene>
);

// "But it costs six (18) times more, and they also drop a new $500 (102) a month plan."
export const DevDayCost: React.FC = () => (
  <Scene>
    <Panel top={90} pad="28px 32px">
      <Tag color={C.orange}>The catch</Tag>
      <Line at={10} size={64} style={{ marginTop: 14 }}>
        Costs <Mark at={18}>6× more</Mark>
      </Line>
      <Sequence from={83} layout="none">
        <Shot src="pro500.png" height={430} />
      </Sequence>
      <Row>
        <Chip at={102} chosen size={26}>New $500 / month plan</Chip>
      </Row>
    </Panel>
  </Scene>
);

// "Then the fifth one, Decisions API (36), basically (79) Jev."
export const DevDayDecision: React.FC = () => (
  <Scene>
    <Panel top={90} pad="28px 32px">
      <Tag color={C.purple} right="limited preview">
        05 · Decisions API
      </Tag>
      <Shot src="decisions.png" height={430} />
      <Row>
        <Chip at={82} chosen size={26}>Basically Jev</Chip>
      </Row>
    </Panel>
  </Scene>
);

// "You give it a set of options (23) and it will pick one (63) in a fraction (101) of a second."
export const DevDayPick: React.FC = () => {
  const picked = useCurrentFrame() >= 63;
  return (
    <Scene>
      <Panel top={150}>
        <Tag color={C.purple}>Decisions API</Tag>
        <Line at={0} size={56} style={{ marginTop: 16 }}>
          Which team gets this ticket?
        </Line>
        <Row style={{ marginTop: 24 }}>
          <Chip at={23} size={28}>Billing</Chip>
          <Chip at={28} chosen={picked} size={28}>Tech support</Chip>
          <Chip at={33} size={28}>Sales</Chip>
        </Row>
        <div style={{ fontSize: 28, color: C.muted, marginTop: 24, ...enter(useSpring(101), 10) }}>⚡ picked in a fraction of a second</div>
      </Panel>
    </Scene>
  );
};

// "The competition has moved. It's not about who has the smartest AI (82). It's
// about agents (129), personalization (140), who knows you (184) more, agents that
// can work nonstop, 24/7 (263)."
export const DevDayOutro: React.FC = () => {
  const strike = interpolate(useCurrentFrame(), [97, 109], [0, 100], { ...clamp, easing: ease });
  return (
    <Scene>
      <Panel top={130}>
        <Tag>The race has moved</Tag>
        <Line at={82} size={80} style={{ marginTop: 16, color: C.muted, position: "relative", display: "inline-block" }}>
          Smartest AI
          <div style={{ position: "absolute", left: 0, top: "55%", height: 6, width: `${strike}%`, background: C.white, borderRadius: 3 }} />
        </Line>
        <Row style={{ marginTop: 26 }}>
          <Chip at={129}>Agents</Chip>
          <Chip at={140}>Personalization</Chip>
          <Chip at={184}>Knows you best</Chip>
          <Chip at={263} chosen>
            Works 24/7
          </Chip>
        </Row>
      </Panel>
    </Scene>
  );
};
