// 1022 "Black October" storyboard: one short isometric loop per script line (S01-S12), in the 1020 dark isometric
// house style (../iso20/kit). Storyboard only: timings are placeholders until the voice is recorded, then each shot
// gets rebuilt to its word cues. Face-cam shots draw over a reference frame of the speaker so the headroom reads.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { DBox, HeadIso, Header, P0, RGlow, RGrid, Slot, Small, Terminal, Tile, ease, easeO, lerp, sans, serif, PAPER, MUTED, AMBER, GREEN, RED } from "../iso20/kit";
import { mkView, proj, RTvBox, type Pose, type View } from "../ara/AraIso-rot";

export const T = 90;
export const BODY = { t: "#1d1c1a", l: "#2a2826", r: "#141312" };
export const REDT = { t: RED, l: "#B23A3E", r: "#7E2629" };
export const GREENT = { t: GREEN, l: "#6BAA7D", r: "#4B8560" };
export const AMBERT = { t: AMBER, l: "#D98E1F", r: "#9A6414" };
const hash = (n: number) => Math.abs(Math.sin(n * 12.9898 + 4.1) * 43758.5453) % 1;
const P = (v: View, x: number, y: number, z = 0) => proj(v, x, y, z);

// full-screen shot: dark floor, fixed camera (no drift, so overlays can be pinned to projected points)
export const Full: React.FC<{ pose: Pose; scene: (f: number, v: View) => React.ReactNode; overlay?: (f: number, v: View) => React.ReactNode }> = ({ pose, scene, overlay }) => {
  const v = mkView(pose);
  return (
    <Slot frames={T} inFade={0} outFade={2} endPush={0} driftAmp={0} keys={[{ f: 0, pose }]}
      scene={(f, w) => (<><RGrid x0={-1600} x1={1600} y0={-1600} y1={1600} step={100} op={0.08} />{scene(f, w)}</>)}
      overlay={overlay ? (f) => overlay(f, v) : undefined} />
  );
};

// face-cam shot: the speaker's reference frame, props in the headroom (y 130-560)
export const Face: React.FC<{ pose: Pose; scene: (f: number, v: View) => React.ReactNode; overlay?: (f: number, v: View) => React.ReactNode }> = ({ pose, scene, overlay }) => {
  const v = mkView(pose);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Img src={staticFile("iso22/face-ref.png")} style={{ position: "absolute", width: 1080, height: 1920 }} />
      <HeadIso keys={[{ f: 0, pose }]} driftAmp={0} scene={scene} overlay={overlay ? (f) => overlay(f, v) : undefined} />
    </AbsoluteFill>
  );
};

// a flat label pinned to a projected point
export const Pin: React.FC<{ at: [number, number]; text: string; color?: string; op?: number; size?: number; dy?: number; stamp?: boolean }> = ({ at, text, color = PAPER, op = 1, size = 40, dy = 0, stamp }) => (
  <div style={{ position: "absolute", left: at[0], top: at[1] + dy, transform: `translate(-50%, -50%)${stamp ? " rotate(-6deg)" : ""}`, opacity: op, fontFamily: sans, fontWeight: 800, fontSize: size, letterSpacing: 2, color, whiteSpace: "nowrap", textShadow: "0 2px 14px #000", ...(stamp ? { border: `5px solid ${color}`, borderRadius: 8, padding: "4px 14px", background: "rgba(0,0,0,0.7)" } : {}) }}>{text}</div>
);

// a flat card (news headline, a post): source line, then text
export const Card: React.FC<{ top: number; src: string; text: string; op?: number; size?: number }> = ({ top, src, text, op = 1, size = 46 }) => (
  <div style={{ position: "absolute", left: 90, top, width: 900, opacity: op, background: "#FEFCF9", borderRadius: 18, padding: "26px 34px", boxShadow: "0 20px 60px rgba(0,0,0,0.7)", transform: `translateY(${(1 - op) * 30}px)` }}>
    <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 24, letterSpacing: 2, color: "#8a8378", marginBottom: 10 }}>{src}</div>
    <div style={{ fontFamily: serif, fontSize: size, lineHeight: 1.12, color: "#141312" }}>{text}</div>
  </div>
);

// a dark box with a coloured seam and an optional label on its top (a company, a tool)
export const Unit: React.FC<{ x: number; y: number; s: number; seam?: typeof AMBERT; label?: string; fs?: number; glow?: number }> = ({ x, y, s, seam = AMBERT, label, fs, glow = 0 }) => (
  <g>
    {glow > 0 && <RGlow x={x + s / 2} y={y + s / 2} z={s * 0.85} r={s} op={glow} />}
    <DBox x={x} y={y} z={0} w={s} d={s} h={s * 0.85} tone={BODY} top="#1d1c1a" stroke="#4a4742" />
    <DBox x={x - 2} y={y - 2} z={s * 0.85} w={s + 4} d={s + 4} h={5} tone={seam} top={seam.t} stroke="#000" />
    {label && <Tile x={x + s * 0.1} y={y + s * 0.3} z={s * 0.85 + 5} w={s * 0.8} d={s * 0.4} h={2} text={label} tone={BODY} top="#141312" ink={PAPER} fs={fs ?? s * 0.17} stroke="none" />}
  </g>
);

// a red "bug" block
const Bug: React.FC<{ x: number; y: number; s: number; found?: number }> = ({ x, y, s, found = 0 }) => (
  <g>
    {found > 0 && <RGlow x={x + s / 2} y={y + s / 2} z={s * 0.5} r={s * 1.4} op={found} />}
    <Tile x={x} y={y} z={0} w={s} d={s} h={s * 0.5} text="BUG" tone={REDT} top={RED} ink="#1b0d0d" fs={s * 0.28} />
  </g>
);

// a beam between two screen points that draws itself in (u 0..1)
export const Beam: React.FC<{ a: [number, number]; b: [number, number]; u: number; color: string; w?: number }> = ({ a, b, u, color, w = 6 }) =>
  u <= 0 ? null : <line x1={a[0]} y1={a[1]} x2={lerp(a[0], b[0], u)} y2={lerp(a[1], b[1], u)} stroke={color} strokeWidth={w} strokeLinecap="round" opacity={0.85} />;

const nf = (n: number) => Math.round(n).toLocaleString("en-US");

// ---------------------------------------------------------------- S01 FACE: "Halloween came early… Black October…"
export const S01: React.FC = () => (
  <Face pose={P0(45, 32, 0.95, 0, 0, 0, 560)}
    scene={(f) => (
      <>
        {Array.from({ length: 24 }, (_, k) => {
          const i = k % 6, j = Math.floor(k / 6);
          const off = easeO(f, 24 + hash(k) * 50, 30 + hash(k) * 50);
          return <Tile key={k} x={-250 + i * 84} y={-170 + j * 84} z={0} w={70} d={70} h={12} tone={off > 0.5 ? BODY : AMBERT} top={off > 0.5 ? "#161514" : AMBER} glow={(1 - off) * 0.25} />;
        })}
      </>
    )}
    overlay={(f) => <Header f={f} at={0} text="BLACK OCTOBER" size={120} top={150} />} />
);

// ---------------------------------------------------------------- S02 VO: PHP, WordPress, anyone takes over the server
export const S02: React.FC = () => (
  <Full pose={P0(45, 30, 1.3, 0, 0, 0, 900)}
    scene={(f) => {
      const hit = easeO(f, 38, 46);
      const u = ease(f, 8, 38);
      return (
        <>
          <Unit x={-330} y={-60} s={130} label="WordPress" fs={22} />
          <DBox x={-60} y={-60} z={0} w={130} d={130} h={230} tone={BODY} top={hit > 0 ? RED : "#1d1c1a"} stroke="#4a4742" />
          <Tile x={-45} y={75} z={150} w={100} d={4} h={50} text="" tone={AMBERT} />
          <Tile x={-60} y={-60} z={230} w={130} d={130} h={4} text="PHP" tone={hit > 0 ? REDT : AMBERT} top={hit > 0 ? RED : AMBER} ink="#141312" fs={44} />
          {u < 1 && <Tile x={lerp(-80, 10, u)} y={lerp(420, 90, u)} z={60} w={30} d={30} h={30} tone={REDT} top={RED} />}
          {hit > 0 && <RGlow x={5} y={5} z={240} r={200} op={hit * 0.7} />}
        </>
      );
    }}
    overlay={(f) => (
      <>
        <Header f={f} at={44} text="NO PASSWORD" size={120} top={230} color={RED} />
        <Small f={f} at={60} text="HIDING SINCE 2012" top={390} size={34} />
        {f >= 40 && <Terminal f={f} left={140} top={1150} width={800} title="php-server" lines={[["$ ", "id", 40], ["", "uid=33(www-data)  ← attacker", 52]]} fs={34} />}
      </>
    )} />
);

// ---------------------------------------------------------------- S03 VO: planned Oct 22, leaked Oct 20, fix Oct 21
const DAYS: [string, number][] = [["OCT 20", -330], ["OCT 21", -90], ["OCT 22", 150]];
export const S03: React.FC = () => (
  <Full pose={P0(20, 38, 1.15, -20, 90, 0, 900)}
    scene={(f) => (
      <>
        {DAYS.map(([d, x], i) => {
          const leak = i === 0 && f >= 32, fix = i === 1 && f >= 62, plan = i === 2;
          const tone = leak ? REDT : fix ? GREENT : plan ? AMBERT : BODY;
          return <Tile key={d} x={x} y={0} z={0} w={200} d={190} h={34} text={d} tone={tone} top={tone.t} ink={tone === BODY ? PAPER : "#141312"} fs={46} glow={plan ? 0.35 : 0} />;
        })}
      </>
    )}
    overlay={(f, v) => (
      <>
        <Header f={f} at={32} text="LEAKED" size={130} top={240} color={RED} />
        <Pin at={P(v, 250, 190)} dy={70} text="PLANNED" color={AMBER} stamp />
        <Pin at={P(v, -230, 190)} dy={70} text="LEAKED" color={RED} stamp op={easeO(f, 32, 38)} />
        <Pin at={P(v, 10, 190)} dy={70} text="FIX" color={GREEN} stamp op={easeO(f, 62, 68)} />
      </>
    )} />
);

// ---------------------------------------------------------------- S04 VO: Amazon Oct 17, Cloudflare hundreds of thousands
export const S04: React.FC = () => (
  <Full pose={P0(45, 32, 1.05, 0, 0, 0, 980)}
    scene={(f) => (
      <>
        <Tile x={-170} y={130} z={0} w={170} d={150} h={30} text="OCT 17" tone={REDT} top={RED} ink="#141312" fs={40} />
        {Array.from({ length: 60 }, (_, i) => {
          const s = i * 1.3 + (i > 8 ? 0 : 0);
          const t = (f - s) / 22;
          if (t < 0 || t > 1) return null;
          const a = hash(i) * Math.PI * 2;
          return <DBox key={i} x={lerp(Math.cos(a) * 520, 0, t) - 10} y={lerp(Math.sin(a) * 520, 0, t) - 10} z={60} w={20} d={20} h={20} tone={REDT} top={RED} stroke="#000" />;
        })}
        <DBox x={-70} y={-70} z={0} w={140} d={140} h={200} tone={BODY} top="#1d1c1a" stroke="#4a4742" />
        <DBox x={-72} y={-72} z={200} w={144} d={144} h={5} tone={REDT} top={RED} stroke="#000" />
        <RGlow x={0} y={0} z={205} r={220} op={0.3 + 0.3 * easeO(f, 20, 80)} />
      </>
    )}
    overlay={(f, v) => (
      <>
        <div style={{ position: "absolute", left: 80, width: 920, top: 230, textAlign: "center", fontFamily: serif, fontSize: 150, color: RED, textShadow: "0 4px 30px #000" }}>{nf(lerp(0, 100000, easeO(f, 20, 80)))}+</div>
        <Small f={f} at={20} text="ATTACKS IN 2 HOURS · CLOUDFLARE" top={420} size={32} />
        <Pin at={P(v, -85, 280)} dy={50} text="FIRST TRY · AMAZON" color={MUTED} size={28} />
      </>
    )} />
);

// ---------------------------------------------------------------- S05 FACE: "And then governments started panicking."
export const S05: React.FC = () => (
  <Face pose={P0(45, 30, 0.75, 0, 0, 0, 500)}
    scene={(f) => (
      <>
        <DBox x={-170} y={-120} z={0} w={340} d={240} h={22} tone={BODY} top="#2a2826" stroke="#4a4742" />
        {[0, 1, 2, 3, 4].map((i) => <DBox key={i} x={-150 + i * 70} y={90} z={22} w={24} d={24} h={150} tone={{ t: "#3a3834", l: "#45423d", r: "#26241f" }} stroke="#000" />)}
        <DBox x={-180} y={-130} z={172} w={360} d={260} h={28} tone={BODY} top="#2a2826" stroke="#4a4742" />
        <DBox x={-20} y={-20} z={200} w={40} d={40} h={36} tone={REDT} top={RED} stroke="#000" />
      </>
    )}
    overlay={(f, v) => {
      const [x, y] = P(v, 0, 0, 236);
      const on = Math.floor(f / 8) % 2 === 0;
      return <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}><circle cx={x} cy={y} r={on ? 120 : 60} fill={RED} opacity={on ? 0.35 : 0.15} /></svg>;
    }} />
);

// ---------------------------------------------------------------- S06 VO: CISA "may go dark"; FBI and NSA: take your site offline
export const S06: React.FC = () => (
  <Full pose={P0(40, 32, 1.25, 0, 0, 0, 1000)}
    scene={(f) => {
      const lit = 1 - ease(f, 50, 62);
      return (
        <>
          <Tile x={-330} y={-250} z={0} w={130} d={130} h={20} text="FBI" fs={44} />
          <Tile x={-150} y={-330} z={0} w={130} d={130} h={20} text="NSA" fs={44} />
          <RTvBox x={-60} y={-40} w={260} d={150} h={170} lit={lit} label="website" labelSize={30} tone={{ t: "#45423d", l: "#32302c", r: "#232220" }} />
          {lit > 0 && <RGlow x={70} y={40} z={180} r={260} op={lit * 0.6} />}
        </>
      );
    }}
    overlay={(f) => (
      <>
        <Card top={170} op={easeO(f, 0, 12)} src="US NEWS · OCT 21" text="Cyber agency warns websites may go dark as PHP prepares critical fix" />
        <Header f={f} at={50} text="GO OFFLINE" size={120} top={1210} color={RED} />
      </>
    )} />
);

// ---------------------------------------------------------------- S07 VO: Japan's PM late at night; 1.5 million unpatched
export const S07: React.FC = () => (
  <Full pose={P0(45, 34, 0.85, 0, 0, 0, 1020)}
    scene={(f) => (
      <>
        {Array.from({ length: 140 }, (_, k) => {
          const i = k % 14, j = Math.floor(k / 14);
          const flip = easeO(f, 38 + hash(k) * 30, 42 + hash(k) * 30);
          const bad = hash(k + 7) < 0.58; // ~1.5M of 2.6M
          const tone = flip < 0.5 ? BODY : bad ? REDT : GREENT;
          return <DBox key={k} x={-470 + i * 68} y={-340 + j * 68} z={0} w={46} d={46} h={30} tone={tone} top={tone.t} stroke="#000" />;
        })}
      </>
    )}
    overlay={(f) => {
      const card = 1 - ease(f, 30, 38);
      return (
        <>
          {card > 0 && <Card top={190} op={card * easeO(f, 0, 10)} src="POST ON X · PRIME MINISTER OF JAPAN · 9:55 PM" text="(her post, as a screenshot: check whether your site runs PHP)" size={40} />}
          {f >= 36 && <div style={{ position: "absolute", left: 80, width: 920, top: 230, textAlign: "center", fontFamily: serif, fontSize: 150, color: RED, textShadow: "0 4px 30px #000" }}>{lerp(0, 1.5, easeO(f, 38, 72)).toFixed(1)} MILLION</div>}
          <Small f={f} at={44} text="SERVERS STILL NOT UPDATED" top={420} size={32} />
        </>
      );
    }} />
);

// ---------------------------------------------------------------- S08 FACE: "But the crazy part? This bug was found by AI."
export const S08: React.FC = () => (
  <Face pose={P0(45, 30, 0.62, 0, 0, 0, 560)}
    scene={(f, v) => {
      const scan = ease(f, 14, 40);
      const found = easeO(f, 40, 50);
      const a = P(v, -150, -150, 150), b = P(v, 170, 170, 40);
      return (
        <>
          <Unit x={-260} y={-260} s={220} seam={GREENT} label="AI" fs={70} glow={0.5} />
          {scan > 0 && <polygon points={`${a[0]},${a[1]} ${lerp(a[0], b[0], scan) - 50},${lerp(a[1], b[1], scan) + 30} ${lerp(a[0], b[0], scan) + 50},${lerp(a[1], b[1], scan) - 20}`} fill={GREEN} opacity={0.25} />}
          <Bug x={110} y={110} s={120} found={found} />
        </>
      );
    }}
    overlay={(f) => <Header f={f} at={44} text="FOUND BY AI" size={110} top={140} color={GREEN} />} />
);

// ---------------------------------------------------------------- S09 VO: two security companies, Google's and OpenAI's models
const ModelCard: React.FC<{ left: number; name: string; maker: string; op: number }> = ({ left, name, maker, op }) => (
  <div style={{ position: "absolute", left, top: 200, width: 400, opacity: op, background: "#0b0d0c", border: `3px solid ${GREEN}`, borderRadius: 18, padding: "22px 26px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
    <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 26, letterSpacing: 3, color: MUTED }}>{maker}</div>
    <div style={{ fontFamily: sans, fontWeight: 800, fontSize: 48, color: PAPER, marginTop: 6 }}>{name}</div>
  </div>
);
export const S09: React.FC = () => (
  <Full pose={P0(45, 32, 1.15, 0, 0, 0, 1020)}
    scene={(f) => (
      <>
        <Unit x={-360} y={-60} s={170} label="CALIF" fs={38} glow={0.4 * easeO(f, 30, 40)} />
        <Unit x={-60} y={-360} s={170} label="WIZ" fs={44} glow={0.4 * easeO(f, 30, 40)} />
        <Bug x={130} y={130} s={110} found={easeO(f, 50, 60)} />
      </>
    )}
    overlay={(f, v) => {
      const u = ease(f, 14, 34);
      const L: [number, number] = [290, 360], R: [number, number] = [790, 360];
      const calif = P(v, -275, 25, 150), wiz = P(v, 25, -275, 150);
      return (
        <>
          <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
            <Beam a={L} b={calif} u={u} color={GREEN} /><Beam a={R} b={calif} u={u} color={GREEN} />
            <Beam a={L} b={wiz} u={u} color={GREEN} /><Beam a={R} b={wiz} u={u} color={GREEN} />
          </svg>
          <ModelCard left={90} name="Gemini 4 Argon" maker="GOOGLE" op={easeO(f, 0, 10)} />
          <ModelCard left={590} name="GPT-5.6 Sol" maker="OPENAI" op={easeO(f, 4, 14)} />
          <Pin at={P(v, 185, 240)} dy={50} text="FOUND" color={GREEN} stamp op={easeO(f, 52, 58)} />
        </>
      );
    }} />
);

// ---------------------------------------------------------------- S10 VO: Microsoft: a China-linked group uses ARTEX on hundreds of organizations
export const S10: React.FC = () => (
  <Full pose={P0(45, 32, 1.0, 0, 0, 0, 1050)}
    scene={(f, v) => {
      const box = P(v, -330, -330, 190);
      return (
        <>
          <Unit x={-440} y={-440} s={220} seam={REDT} label="ARTEX" fs={46} glow={0.4} />
          {Array.from({ length: 30 }, (_, k) => {
            const i = k % 6, j = Math.floor(k / 6);
            const x = -60 + i * 80, y = -60 + j * 80;
            const at = 14 + k * 2;
            const hit = easeO(f, at + 6, at + 10);
            return (
              <g key={k}>
                <Tile x={x} y={y} z={0} w={60} d={60} h={16} tone={hit > 0.5 ? REDT : BODY} top={hit > 0.5 ? RED : "#2a2826"} />
                {f >= at && f < at + 12 && <Beam a={box} b={P(v, x + 30, y + 30, 16)} u={easeO(f, at, at + 6)} color={RED} w={3} />}
              </g>
            );
          })}
        </>
      );
    }}
    overlay={(f) => <Card top={170} op={easeO(f, 0, 12)} src="MICROSOFT SECURITY BLOG · OCT 21" text="AI-driven, large-scale nation-state campaign using ARTEX enables supply chain compromise" size={42} />} />
);

// ---------------------------------------------------------------- S11 VO: Cloudflare: AI bots keep changing the attack until one gets through
const TRIES: [number, number, number][] = [[40, 40, 40], [24, 24, 80], [70, 50, 18]]; // the attack's shape on each try
export const S11: React.FC = () => (
  <Full pose={P0(45, 30, 1.2, 0, 0, 0, 980)}
    scene={(f) => {
      const k = Math.min(2, Math.floor(f / 28));
      const t = (f - k * 28) / 28;
      const through = k === 2;
      const x = through ? lerp(460, -260, t) : t < 0.6 ? lerp(460, 40, t / 0.6) : lerp(40, 300, (t - 0.6) / 0.4);
      const [w, d, h] = TRIES[k];
      const wallHit = !through && t > 0.5 && t < 0.75;
      const packet = <DBox x={x - w / 2} y={-d / 2} z={60} w={w} d={d} h={h} tone={REDT} top={RED} stroke="#000" />;
      return (
        <>
          {x < -30 && packet}
          <DBox x={-30} y={-220} z={0} w={24} d={440} h={220} tone={through && t > 0.5 ? REDT : AMBERT} top={through && t > 0.5 ? RED : AMBER} stroke="#000" op={0.92} />
          {wallHit && <RGlow x={-20} y={0} z={120} r={200} op={0.6} />}
          {x >= -30 && packet}
        </>
      );
    }}
    overlay={(f) => (
      <>
        <Header f={f} at={0} text="AI BOTS" size={130} top={230} />
        <Small f={f} at={4} text={`TRY ${Math.min(3, Math.floor(f / 28) + 1)} · CHANGE THE ATTACK · TRY AGAIN`} top={400} size={30} />
      </>
    )} />
);

// ---------------------------------------------------------------- S12 FACE: "So I think we're entering an AI war…"
export const S12: React.FC = () => (
  <Face pose={P0(0, 22, 0.8, 0, 0, 0, 590)}
    scene={(f, v) => {
      const u = ease(f, 10, 40);
      const gl = P(v, -300, -100, 170), rd = P(v, 300, -100, 170), bug = P(v, 0, -60, 50);
      return (
        <>
          <Unit x={-420} y={-220} s={210} seam={GREENT} glow={0.35} />
          <Unit x={210} y={-220} s={210} seam={REDT} />
          <Bug x={-55} y={-120} s={110} found={0.3 + 0.3 * Math.abs(Math.sin(f / 9))} />
          <Beam a={gl} b={bug} u={u} color={GREEN} />
          <Beam a={rd} b={bug} u={u} color={RED} />
        </>
      );
    }}
    overlay={(f, v) => (<><Header f={f} at={0} text="AI WAR" size={130} top={140} /><Pin at={P(v, -315, -10, 90)} text="DEFENDERS" color={GREEN} size={34} /><Pin at={P(v, 315, -10, 90)} text="HACKERS" color={RED} size={34} /></>)} />
);

export const SHOTS: [string, React.FC][] = [["S01", S01], ["S02", S02], ["S03", S03], ["S04", S04], ["S05", S05], ["S06", S06], ["S07", S07], ["S08", S08], ["S09", S09], ["S10", S10], ["S11", S11], ["S12", S12]];
void useCurrentFrame;
