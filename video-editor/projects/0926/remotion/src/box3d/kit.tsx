// 1020 "The internet in a box": the shared 3D kit (three.js through @remotion/three). One world for the whole video:
// a matte black box (THE BOX) in a dark, warm-lit room; everything the narration builds is a physical prop near it.
// Our take on a polished "machine room" 3D explainer, in the house palette (DESIGN.md): black, paper, amber, green.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadSans } from "@remotion/google-fonts/DMSans";
import { ThreeCanvas } from "../korea3d-6/three-canvas";
import { Finish } from "../korea3d-6/finish";

export const C = { bg: "#060606", paper: "#FEFCF9", muted: "#C4BCB0", amber: "#FFB547", green: "#8ECC9F", red: "#E5484D", ink: "#141311", box: "#121212" };
// token colours (OpenAI's tokenizer page), for cards and bars
export const TOK = ["#CDBDF2", "#B5E8BE", "#F8D6A0", "#F6B9BB", "#AEDDF2", "#E8D5B5"];
export const serif = loadSerif("normal", { weights: ["400"] }).fontFamily;
export const sans = loadSans("normal", { weights: ["400", "500", "600", "700"] }).fontFamily;
export type V3 = [number, number, number];

// ---------------------------------------------------------------- timing
export const c01 = (x: number) => Math.min(1, Math.max(0, x));
const sm = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export const seg = (f: number, a: number, b: number) => sm(c01((f - a) / (b - a))); // eased 0..1 over [a, b]
export const out3 = (f: number, a: number, b: number) => 1 - Math.pow(1 - c01((f - a) / (b - a)), 3);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const hash = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
// a springy settle: 0 -> 1 with one small overshoot, starting at frame a
export const pop = (f: number, a: number, d = 14) => { const t = c01((f - a) / d); return t <= 0 ? 0 : 1 + Math.sin(t * Math.PI) * 0.12 * (1 - t) - Math.pow(1 - t, 3); };

// ---------------------------------------------------------------- camera
// Keys: the camera holds, then eases (over `dur` frames, default 24) to arrive at each key's frame.
export type CamKey = { f: number; pos: V3; look: V3; fov?: number; dur?: number };
export type Cam = { pos: V3; look: V3; fov: number };
export const camAt = (keys: CamKey[], f: number, drift = 1): Cam => {
  let cur: Cam = { pos: keys[0].pos, look: keys[0].look, fov: keys[0].fov ?? 42 };
  for (const k of keys.slice(1)) {
    const t = seg(f, k.f - (k.dur ?? 24), k.f);
    if (t <= 0) break;
    cur = { pos: lerp3(cur.pos, k.pos, t), look: lerp3(cur.look, k.look, t), fov: lerp(cur.fov, k.fov ?? cur.fov, t) };
  }
  // a slow handheld drift so the frame is never dead still
  const d = 0.04 * drift;
  return { ...cur, pos: [cur.pos[0] + d * Math.sin(f * 0.031), cur.pos[1] + d * 0.6 * Math.sin(f * 0.023 + 1), cur.pos[2] + d * Math.sin(f * 0.017 + 2)] };
};
const CamRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const { camera } = useThree();
  const c = camera as THREE.PerspectiveCamera;
  c.position.set(...cam.pos);
  c.fov = cam.fov;
  c.updateProjectionMatrix();
  c.lookAt(...cam.look);
  return null;
};

// ---------------------------------------------------------------- stage
// The room's lights: a warm key from above-left that casts soft shadows, a cool rim from behind, a low fill.
// a soft studio environment (three's RoomEnvironment through PMREM): gives every surface gentle reflections and fill
const Env: React.FC<{ strength: number }> = ({ strength }) => {
  const { gl, scene } = useThree();
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const t = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return t;
  }, [gl]);
  scene.environment = env;
  scene.environmentIntensity = strength;
  return null;
};
export const Lights: React.FC<{ strength?: number; env?: number; warm?: string }> = ({ strength: k = 1, env = 0.55, warm = "#FFE2B8" }) => (
  <>
    <Env strength={env} />
    <ambientLight intensity={0.35} />
    <hemisphereLight args={["#FFE9CC", "#1a1612", 0.6]} />
    <directionalLight castShadow position={[-4, 9, 5]} intensity={3.6 * k} color={warm}
      shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-0.0004} shadow-radius={6} />
    <directionalLight position={[5, 4, -6]} intensity={2.2} color="#BFD4FF" />
    <pointLight position={[3, 1.2, 4]} intensity={6} distance={14} decay={2} color="#FFC98A" />
  </>
);

// One full-frame 3D shot. `transparent` renders with alpha (for headroom over the face cam): no backdrop, no finish.
export const Stage3D: React.FC<{
  keys: CamKey[];
  children: (f: number) => React.ReactNode;
  overlay?: (f: number) => React.ReactNode;
  transparent?: boolean;
  bloom?: number;
  fog?: [number, number];
  drift?: number;
  lights?: boolean;
}> = ({ keys, children, overlay, transparent = false, bloom = 0.8, fog = [14, 40], drift = 1, lights = true }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cam = camAt(keys, f, drift);
  const scene = (
    <ThreeCanvas width={width} height={height} shadows camera={{ fov: cam.fov, near: 0.05, far: 120, position: cam.pos }}
      gl={{ antialias: true, alpha: transparent, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
      onCreated={({ gl }) => { gl.shadowMap.type = THREE.PCFShadowMap; gl.setClearColor(0x000000, transparent ? 0 : 1); }}>
      <CamRig cam={cam} />
      {!transparent && <fog attach="fog" args={[C.bg, fog[0], fog[1]]} />}
      {lights && <Lights />}
      {children(f)}
    </ThreeCanvas>
  );
  if (transparent)
    return (
      <AbsoluteFill>
        {scene}
        {overlay?.(f)}
      </AbsoluteFill>
    );
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Finish fr={f} bloom={bloom}>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 70% at 50% 40%, #1d1813 0%, ${C.bg} 70%)` }} />
        {scene}
      </Finish>
      {overlay?.(f)}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- materials and props
export const matte = (color: string, rough = 0.62, metal = 0.05) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

// the floor: dark, slightly glossy, catches the key light's shadows
export const Floor: React.FC<{ y?: number; size?: number; color?: string }> = ({ y = 0, size = 80, color = "#0d0c0b" }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
    <planeGeometry args={[size, size]} />
    <meshStandardMaterial color={color} roughness={0.38} metalness={0.15} />
  </mesh>
);

// a rounded slab (cards, panels, plinths): w x h x d, corner radius r
export const Slab: React.FC<{ size: V3; r?: number; color?: string; rough?: number; metal?: number; emissive?: string; emissiveIntensity?: number; position?: V3; rotation?: V3; castShadow?: boolean; opacity?: number }> = ({
  size, r = 0.04, color = C.paper, rough = 0.6, metal = 0.02, emissive, emissiveIntensity = 0, position, rotation, castShadow = true, opacity = 1,
}) => {
  const geo = useMemo(() => new RoundedBoxGeometry(size[0], size[1], size[2], 4, Math.min(r, size[0] / 2, size[1] / 2, size[2] / 2)), [size[0], size[1], size[2], r]);
  return (
    <mesh geometry={geo} position={position} rotation={rotation} castShadow={castShadow} receiveShadow>
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} emissive={emissive ?? "#000"} emissiveIntensity={emissiveIntensity} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
};

// ---------------------------------------------------------------- text and pictures drawn into textures
// Wait for the brand fonts before any canvas text is drawn (a canvas draws with whatever font is loaded at that moment).
const fontsReady = (() => {
  let p: Promise<unknown> | null = null;
  return () => (p ??= Promise.all([document.fonts.load(`64px "${serif}"`), document.fonts.load(`700 64px "${sans}"`), document.fonts.load(`500 64px "${sans}"`)]));
})();
export const useFonts = () => {
  const [ok, setOk] = useState(false);
  const [h] = useState(() => delayRender("fonts for 3D text"));
  useEffect(() => { fontsReady().then(() => { setOk(true); requestAnimationFrame(() => continueRender(h)); }); }, [h]);
  return ok;
};
// A canvas texture: `draw` paints into a W x H 2D context (W = 1024 by default). Rebuilt only when `key` changes.
export const useCanvasTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, W: number, H: number) => void, deps: unknown[] = []) => {
  const ok = useFonts();
  const advance = useThree((st) => st.advance);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    if (ok) draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, key, w, h, ...deps]);
  // the canvas only redraws on its own commits, so draw again once the real texture (fonts loaded) is in
  useEffect(() => { advance(performance.now()); }, [tex, advance]);
  return tex;
};
// Flat text on a plane in the world: width `w` world units, the plane's height follows the text box ratio.
export const TextPlane: React.FC<{ text: string; w: number; h?: number; font?: "serif" | "sans"; weight?: number; color?: string; bg?: string; size?: number; align?: CanvasTextAlign; position?: V3; rotation?: V3; opacity?: number; emissive?: number }> = ({
  text, w, h = w * 0.25, font = "sans", weight = 700, color = C.paper, bg, size = 0.62, align = "center", position, rotation, opacity = 1, emissive = 0,
}) => {
  const W = 1024;
  const H = Math.round((W * h) / w);
  const tex = useCanvasTex(`${text}|${font}|${weight}|${color}|${bg}|${size}|${align}`, W, H, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); }
    g.fillStyle = color;
    g.textAlign = align;
    g.textBaseline = "middle";
    const lines = text.split("\n");
    const px = (H * size) / lines.length;
    g.font = `${font === "serif" ? 400 : weight} ${px}px "${font === "serif" ? serif : sans}"`;
    lines.forEach((l, i) => g.fillText(l, align === "left" ? W * 0.04 : align === "right" ? W * 0.96 : W / 2, H / 2 + (i - (lines.length - 1) / 2) * px * 1.12));
  });
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} transparent={!bg || opacity < 1} opacity={opacity} roughness={0.8} emissive={"#ffffff"} emissiveMap={emissive > 0 ? tex : null} emissiveIntensity={emissive} />
    </mesh>
  );
};

// ---------------------------------------------------------------- the hero: THE BOX
// A matte black cube (2 x 2 x 2, resting on the floor at `position`), a lid that can open, an amber light seam under the
// lid that glows brighter as it works (`glow` 0..1), and a small screen on its front (`screen`: text, or null for dark).
export const TheBox: React.FC<{ position?: V3; rotationY?: number; scale?: number; open?: number; glow?: number; screen?: string | null; screenColor?: string; label?: string | null }> = ({
  position = [0, 0, 0], rotationY = 0, scale = 1, open = 0, glow = 0.3, screen = null, screenColor = C.green, label = null,
}) => {
  const body = useMemo(() => new RoundedBoxGeometry(2, 1.7, 2, 6, 0.08), []);
  const lid = useMemo(() => new RoundedBoxGeometry(2.04, 0.26, 2.04, 6, 0.08), []);
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh geometry={body} position={[0, 0.85, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1c1b1a" roughness={0.38} metalness={0.25} />
      </mesh>
      {/* the light seam between body and lid */}
      {/* a thin rim of light around the top edge (four bars, so the top stays dark) */}
      {([[0, 1.0, 2.01, 0.035], [0, -1.0, 2.01, 0.035], [1.0, 0, 0.035, 2.01], [-1.0, 0, 0.035, 2.01]] as const).map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 1.72, z]}>
          <boxGeometry args={[w, 0.035, d]} />
          <meshStandardMaterial color="#FF8A1E" emissive="#FF6A10" emissiveIntensity={0.45 + 1.3 * glow} toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[0, 1.9, 0]} intensity={4 * glow + 3 * open} distance={5} decay={2} color={C.amber} />
      {open > 0.02 && (
        <mesh position={[0, 1.705, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.84, 1.84]} />
          <meshBasicMaterial color="#1a0d03" toneMapped={false} />
        </mesh>
      )}
      {open > 0.02 && (
        <mesh position={[0, 1.71, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.7, 48]} />
          <meshBasicMaterial color="#FF8A1E" transparent opacity={0.35 * open} toneMapped={false} />
        </mesh>
      )}
      {/* the lid hinges at the back edge */}
      <group position={[0, 1.74, -1.02]} rotation={[-1.9 * open, 0, 0]}>
        <mesh geometry={lid} position={[0, 0.13, 1.02]} castShadow>
          <meshStandardMaterial color="#161616" roughness={0.38} metalness={0.4} />
        </mesh>
      </group>
      {/* front screen */}
      <mesh position={[0, 0.95, 1.006]}>
        <planeGeometry args={[1.3, 0.62]} />
        <meshStandardMaterial color="#050505" roughness={0.25} metalness={0.2} />
      </mesh>
      {screen !== null && <TextPlane text={screen} w={1.22} h={0.54} position={[0, 0.95, 1.012]} color={screenColor} size={0.42} emissive={1.4} />}
      {label && <TextPlane text={label} w={1.4} h={0.2} position={[0, 0.3, 1.012]} color={C.muted} size={0.7} weight={700} />}
    </group>
  );
};

// A token card: a thin paper card lying (or standing) in the world, its word on top and a strip of colour bars under it
// (the embedding numbers, drawn as colour) when `bars` is on.
export const Card: React.FC<{ text: string; w?: number; position?: V3; rotation?: V3; tint?: string; bars?: number; num?: string; scale?: number }> = ({
  text, w = 1.1, position, rotation, tint = TOK[0], bars = 0, num, scale = 1,
}) => {
  const h = w * 0.62;
  const tex = useCanvasTex(`card|${text}|${tint}|${bars}|${num}`, 1024, Math.round(1024 * 0.62), (g, W, H) => {
    g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
    g.fillStyle = tint; g.fillRect(0, 0, W, H * 0.12);
    g.fillStyle = C.ink; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `400 ${H * 0.34}px "${serif}"`;
    g.fillText(text, W / 2, H * (bars > 0 ? 0.42 : 0.55));
    if (num) { g.font = `600 ${H * 0.1}px "${sans}"`; g.fillStyle = "#6B665E"; g.fillText(num, W / 2, H * 0.66); }
    for (let i = 0; i < bars; i++) {
      g.fillStyle = TOK[Math.floor(hash(i * 7.1 + text.length) * TOK.length)];
      const bw = (W * 0.84) / bars;
      g.fillRect(W * 0.08 + i * bw, H * 0.74, bw - 4, H * 0.14);
    }
  });
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Slab size={[w, h, 0.03]} r={0.03} color={C.paper} />
      <mesh position={[0, 0, 0.0165]}>
        <planeGeometry args={[w * 0.985, h * 0.985]} />
        <meshStandardMaterial map={tex} roughness={0.85} color="#D9D3C7" envMapIntensity={0.4} />
      </mesh>
    </group>
  );
};

// A web page as a physical sheet: a browser window (bar with three dots, a title, lines of text, an image block) on a
// thin card. `seed` varies the layout and accent colour.
export const WebPage: React.FC<{ seed: number; w?: number; position?: V3; rotation?: V3; scale?: number }> = ({ seed, w = 1.0, position, rotation, scale = 1 }) => {
  const h = w * 1.3;
  const accent = TOK[seed % TOK.length];
  const tex = useCanvasTex(`page|${seed}`, 512, 666, (g, W, H) => {
    g.fillStyle = "#F4F1EA"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#2A2825"; g.fillRect(0, 0, W, 46);
    ["#E5484D", "#FFB547", "#8ECC9F"].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(24 + i * 22, 23, 7, 0, 7); g.fill(); });
    g.fillStyle = "#4A4742"; g.fillRect(100, 15, W - 130, 16);
    g.fillStyle = accent; g.fillRect(28, 72, W - 56, 150 + (seed % 3) * 30);
    g.fillStyle = "#2A2825"; g.fillRect(28, 250 + (seed % 3) * 30, W * (0.5 + hash(seed) * 0.35), 26);
    for (let i = 0; i < 9; i++) { g.fillStyle = "#9C968C"; g.fillRect(28, 300 + (seed % 3) * 30 + i * 34, (W - 56) * (0.55 + hash(seed * 3 + i) * 0.45), 12); }
  });
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Slab size={[w, h, 0.02]} r={0.02} color="#EDE8DE" />
      <mesh position={[0, 0, 0.011]}>
        <planeGeometry args={[w * 0.99, h * 0.99]} />
        <meshStandardMaterial map={tex} roughness={0.8} envMapIntensity={0.4} />
      </mesh>
    </group>
  );
};

// HTML overlay helpers (headers and numbers in the house type, drawn over the 3D, never repeating the subtitle)
export const Header: React.FC<{ text: string; f: number; at: number; out?: number; top?: number; size?: number; color?: string; sub?: string }> = ({ text, f, at, out, top = 300, size = 120, color = C.paper, sub }) => {
  const u = out3(f, at, at + 14);
  const o = out === undefined ? 1 : 1 - seg(f, out - 8, out);
  if (u <= 0 || o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 80, width: 920, top, textAlign: "center", fontFamily: serif, fontSize: size, lineHeight: 1.04, letterSpacing: 2, whiteSpace: "pre-line", color, opacity: u * o, transform: `translateY(${(1 - u) * 24}px)`, filter: `blur(${(1 - u) * 8}px)`, textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>
      {text}
      {sub && <div style={{ fontFamily: sans, fontWeight: 600, fontSize: size * 0.24, letterSpacing: 4, color: C.muted, marginTop: 14 }}>{sub}</div>}
    </div>
  );
};
