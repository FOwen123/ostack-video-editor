// The doodle mascots as isometric figures: every joint is a world point (x right, y toward the viewer, z up), projected
// with the booth's camera, so they stand on the floor, hide behind the desk and put their hands on real props.
// Arms and legs have fixed lengths (two-bone IK); a target out of reach makes the body lean a little (max 22 deg), never the arm stretch.
import React, { useContext } from "react";
import { Ink, PenCtx, T } from "../dj2/Doodle-kit";
import { proj, useV } from "../ara/AraIso-rot";
import type { View } from "../ara/AraIso-rot";

export type V3 = [number, number, number];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
const UP: V3 = [0, 0, 1];

// Two-bone IK: root -> joint -> end with lengths l1, l2; the joint bends toward `pole`. An unreachable end stops short.
export const ik = (root: V3, target: V3, l1: number, l2: number, pole: V3): [V3, V3, V3] => {
  const d = sub(target, root);
  const dist = Math.min(Math.max(len(d), 0.001), l1 + l2 - 0.01);
  const dir = norm(d);
  const a = (l1 * l1 + dist * dist - l2 * l2) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let p = sub(pole, mul(dir, dot(pole, dir)));
  if (len(p) < 1e-4) p = [0, 0, -1];
  return [root, add(add(root, mul(dir, a)), mul(norm(p), h)), add(root, mul(dir, dist))];
};

export type RigProps = {
  who: "dj" | "ai";
  x: number;
  y: number;
  z?: number;
  face?: number; // degrees in the floor plane; 90 faces +y (toward the viewer's left-front at the classic yaw)
  size?: number; // 1 = 130 world units tall (the desk, 60 tall, comes to its hips)
  lh?: V3 | null; // world target for the hand on the figure's -side; null/undefined = hangs
  rh?: V3 | null; // the same for the +side hand
  cue?: "l" | "r"; // that hand holds the headphone cup to the ear (the DJ's listening pose)
  lean?: number; // forward lean in degrees; omitted = just enough to reach the hand targets (max 22)
  nod?: number; // 0..1, the head dips forward (use beat(f) for nodding along)
  bounce?: number; // the whole body moves down by this (knees bend), world units
  step?: number; // walk cycle phase (1 = one full stride); 0 = standing
  arms?: number; // 0..1 shrug (hands up beside the shoulders, elbows low); for a cheer give lh/rh targets above the head
  screen?: React.ReactNode; // the AI's screen, local units: about 74 x 56 visible, centre (0, 0)
  part?: "all" | "legs" | "upper"; // draw legs before the desk and the upper body after it
  op?: number;
};

type J = { hip: V3; neck: V3; head: V3; fwd: V3; side: V3; up: V3; sh: [V3, V3]; arms: [[V3, V3, V3], [V3, V3, V3]]; legs: [[V3, V3, V3], [V3, V3, V3]]; s: number };

// All joints for a pose (exported so a scene can aim at a hand or an ear).
export const joints = (p: RigProps, leanIn?: number): J => {
  const s = p.size ?? 1;
  const th = ((p.face ?? 90) * Math.PI) / 180;
  const fwd: V3 = [Math.cos(th), Math.sin(th), 0];
  const side: V3 = [fwd[1], -fwd[0], 0];
  const base: V3 = [p.x, p.y, p.z ?? 0];
  const bounce = p.bounce ?? 0;
  const hip = add(base, [0, 0, 58 * s - bounce]);
  const ln = ((leanIn ?? p.lean ?? 0) * Math.PI) / 180;
  const up = norm(add(mul(fwd, Math.sin(ln)), mul(UP, Math.cos(ln))));
  const neck = add(hip, mul(up, 42 * s));
  const nod = p.nod ?? 0;
  const head = add(add(neck, mul(up, (p.who === "ai" ? 19 : 15) * s)), add(mul(fwd, 4 * s * nod), [0, 0, -3 * s * nod]));
  const shw = (p.who === "ai" ? 15 : 10) * s;
  const shC = add(neck, mul(up, -6 * s));
  const sh: [V3, V3] = [add(shC, mul(side, -shw)), add(shC, mul(side, shw))];
  const ear = (k: number): V3 => add(head, mul(side, k * (p.who === "ai" ? 24 : 17) * s));
  const armLen = 27 * s;
  const arm = (k: 0 | 1): [V3, V3, V3] => {
    const sg = k ? 1 : -1;
    let t = (k ? p.rh : p.lh) ?? null;
    if (p.cue && (p.cue === "r") === (k === 1)) t = add(ear(sg), mul(side, sg * 3 * s));
    const lift = p.arms ?? 0;
    // lift 1 = a shrug: elbows stay low and out, hands come up beside the shoulders, palms open
    const hang = add(sh[k], add(add(mul(side, sg * (6 + 18 * lift) * s), mul(fwd, 10 * lift * s)), [0, 0, (-50 + 50 * lift) * s]));
    const pole = add(add(mul(side, sg * 0.6), mul(fwd, -0.5)), [0, 0, -0.6]);
    return ik(sh[k], t ?? hang, armLen, armLen, pole);
  };
  const st = p.step ?? 0;
  const leg = (k: 0 | 1): [V3, V3, V3] => {
    const sg = k ? 1 : -1;
    const ph = 2 * Math.PI * st + (k ? Math.PI : 0);
    const foot = add(add(base, mul(side, sg * 9 * s)), add(mul(fwd, st ? 12 * s * Math.sin(ph) : 0), [0, 0, st ? Math.max(0, 7 * s * Math.cos(ph)) : 0]));
    return ik(add(hip, mul(side, sg * 6 * s)), foot, 30 * s, 30 * s, fwd);
  };
  return { hip, neck, head, fwd, side, up, sh, arms: [arm(0), arm(1)], legs: [leg(0), leg(1)], s };
};

// the least forward lean (0-22 deg) that brings both hand targets within reach; past that the arm stops short,
// which is the sign to move the prop closer (a deeper lean reads as falling over)
const autoLean = (p: RigProps) => {
  if (p.lean !== undefined) return p.lean;
  const reach = 2 * 27 * (p.size ?? 1) - 1;
  for (let l = 0; l <= 22; l += 2) {
    const j = joints(p, l);
    const ok = ([p.lh, p.rh] as (V3 | null | undefined)[]).every((t, k) => !t || len(sub(t, j.sh[k])) <= reach);
    if (ok) return l;
  }
  return 22;
};

// the direction from the scene toward the camera; a face is visible when its normal points along it
const toCam = (v: View): V3 => [v.sn * v.cp, v.cs * v.cp, v.sp];

const P = (v: View, a: V3) => proj(v, a[0], a[1], a[2]);

// An oriented box (centre, unit axes, half sizes), drawn face by face in chalk; `front` draws on the +ax face.
const Box: React.FC<{ c: V3; ax: V3; ay: V3; az: V3; h: V3; fill: string; ink: string; sw: number; front?: React.ReactNode; k?: number }> = ({ c, ax, ay, az, h, fill, ink, sw, front, k = 1 }) => {
  const v = useV();
  const cam = toCam(v);
  const corner = (i: number, j: number, l: number) => add(c, add(mul(ax, i * h[0]), add(mul(ay, j * h[1]), mul(az, l * h[2]))));
  const faces: { n: V3; pts: V3[]; isFront?: boolean }[] = [
    { n: ax, pts: [corner(1, -1, 1), corner(1, 1, 1), corner(1, 1, -1), corner(1, -1, -1)], isFront: true },
    { n: mul(ax, -1), pts: [corner(-1, -1, 1), corner(-1, 1, 1), corner(-1, 1, -1), corner(-1, -1, -1)] },
    { n: ay, pts: [corner(-1, 1, 1), corner(1, 1, 1), corner(1, 1, -1), corner(-1, 1, -1)] },
    { n: mul(ay, -1), pts: [corner(-1, -1, 1), corner(1, -1, 1), corner(1, -1, -1), corner(-1, -1, -1)] },
    { n: az, pts: [corner(-1, -1, 1), corner(1, -1, 1), corner(1, 1, 1), corner(-1, 1, 1)] },
    { n: mul(az, -1), pts: [corner(-1, -1, -1), corner(1, -1, -1), corner(1, 1, -1), corner(-1, 1, -1)] },
  ];
  return (
    <g>
      {faces
        .filter((fc) => dot(fc.n, cam) > 0.02)
        .map((fc, i) => {
          const q = fc.pts.map((a) => P(v, a));
          let extra: React.ReactNode = null;
          if (fc.isFront && front) {
            // local units: x along +ay, y along -az, origin at the face centre, `k` world units per local unit
            const o = P(v, add(c, mul(ax, h[0])));
            const ex = sub([...P(v, add(add(c, mul(ax, h[0])), ay)), 0] as V3, [...o, 0] as V3);
            const ey = sub([...P(v, add(add(c, mul(ax, h[0])), mul(az, -1))), 0] as V3, [...o, 0] as V3);
            extra = <g transform={`matrix(${ex[0] * k} ${ex[1] * k} ${ey[0] * k} ${ey[1] * k} ${o[0]} ${o[1]})`}>{front}</g>;
          }
          return (
            <g key={i}>
              <polygon points={q.map((pt) => pt.map((n) => n.toFixed(1)).join(",")).join(" ")} fill={fill} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
              {extra}
            </g>
          );
        })}
    </g>
  );
};

const AIG = "#8ECC9F";
const AMB = "#FFB547";

export const IsoMascot: React.FC<RigProps> = (props) => {
  const v = useV();
  const pen = useContext(PenCtx);
  const lean = autoLean(props);
  const j = joints(props, lean);
  const { s } = j;
  const px = v.Z / 1.2247; // screen px per world unit at zoom 1 is 1.2247
  const sw = 3.4 * s * px;
  const cam = toCam(v);
  const part = props.part ?? "all";
  const pts = (a: V3[]) => a.map((q) => P(v, q));
  const seed = props.who === "ai" ? 40 : 20;
  // the limb on the camera's side is drawn after the body
  const nearK = dot(j.side, cam) > 0 ? 1 : 0;
  const limb = (seg: [V3, V3, V3], k: number, kind: string) => <Ink key={`${kind}${k}`} pts={pts(seg)} seed={seed + k + (kind === "a" ? 2 : 0)} sw={sw} />;
  const hand = (seg: [V3, V3, V3], k: number) => {
    const [hx, hy] = P(v, seg[2]);
    return <circle key={`h${k}`} cx={hx} cy={hy} r={3.2 * s * px} fill={pen.ink} />;
  };
  const legs = [limb(j.legs[1 - nearK], 1 - nearK, "l"), limb(j.legs[nearK], nearK, "l")];
  const farArm = [limb(j.arms[1 - nearK], 1 - nearK, "a"), hand(j.arms[1 - nearK], 1 - nearK)];
  const nearArm = [limb(j.arms[nearK], nearK, "a"), hand(j.arms[nearK], nearK)];
  const facing = dot(j.fwd, cam) > 0;

  let body: React.ReactNode;
  let head: React.ReactNode;
  if (props.who === "dj") {
    body = <Ink pts={pts([j.hip, j.neck])} seed={seed + 5} sw={sw * 1.1} />;
    const [hx, hy] = P(v, j.head);
    const r = 14 * s * px;
    // the cap's bill points to the side (the mascot's look): which side it shows on screen follows the head's turn
    const bd = norm(add(mul(j.side, 0.85), mul(j.fwd, 0.5)));
    const [bx] = P(v, add(j.head, mul(bd, 10 * s)));
    const dir = bx >= hx ? 1 : -1;
    const turn = Math.min(1, Math.abs(bx - hx) / (10 * s * px)); // 0 = bill straight at or away from the camera
    const by = hy - r * 0.12;
    const bill = `M${hx + dir * r * 0.55} ${by - r * 0.16} Q${hx + dir * r * (1.25 + 0.5 * turn)} ${by - r * 0.22} ${hx + dir * r * (1.35 + 0.55 * turn)} ${by + r * 0.08} Q${hx + dir * r * 1.1} ${by + r * 0.24} ${hx + dir * r * 0.6} ${by + r * 0.12} Z`;
    const brimEl = <path d={bill} fill="#FFFFFF" stroke={pen.ink} strokeWidth={sw * 0.5} strokeLinejoin="round" />;
    const band = Array.from({ length: 9 }, (_, i) => {
      const t = (Math.PI * i) / 8;
      return add(j.head, add(mul(j.side, -Math.cos(t) * 17 * s), mul(j.up, Math.sin(t) * 17 * s)));
    });
    const cup = (k: number) => {
      const [cx, cy] = P(v, add(j.head, mul(j.side, k * 17 * s)));
      return <rect key={`c${k}`} x={cx - 3.5 * s * px} y={cy - 7 * s * px} width={7 * s * px} height={14 * s * px} rx={3 * s * px} fill={AMB} stroke={pen.ink} strokeWidth={sw * 0.35} />;
    };
    head = (
      <g>
        <circle cx={hx} cy={hy} r={r} fill="#D8D1C5" stroke={pen.ink} strokeWidth={sw * 0.8} />
        {/* the cap: a white dome over the top of the head, its band curving around it, the bill to one side */}
        <path d={`M${hx - r * 1.05} ${hy - r * 0.12} A${r * 1.05} ${r * 1.05} 0 0 1 ${hx + r * 1.05} ${hy - r * 0.12} Q${hx} ${hy + r * 0.2} ${hx - r * 1.05} ${hy - r * 0.12} Z`} fill="#FFFFFF" stroke={pen.ink} strokeWidth={sw * 0.6} strokeLinejoin="round" />
        {brimEl}
        <Ink pts={pts(band)} c={AMB} sw={sw * 1.05} seed={seed + 7} />
        {cup(-1)}
        {cup(1)}
      </g>
    );
  } else {
    // torso: a box between hip and neck; head: a box with the screen on its front
    const mid = mul(add(j.hip, j.neck), 0.5);
    const ax = norm(sub(j.fwd, mul(j.up, dot(j.fwd, j.up))));
    body = <Box c={mid} ax={ax} ay={j.side} az={j.up} h={[7 * s, 13 * s, 21 * s]} fill={pen.fill} ink={pen.ink} sw={sw * 0.7} />;
    const k = 0.4 * s;
    const screen = (
      <g>
        <rect x={-37} y={-28} width={74} height={56} rx={8} fill={pen.fill} stroke={pen.ink} strokeWidth={3} />
        {props.screen}
      </g>
    );
    const ant = [add(j.head, mul(j.up, 17 * s)), add(j.head, mul(j.up, 27 * s))];
    const [dx, dy] = P(v, ant[1]);
    const band = Array.from({ length: 9 }, (_, i) => {
      const t = (Math.PI * i) / 8;
      return add(j.head, add(mul(j.side, -Math.cos(t) * 24 * s), mul(j.up, Math.sin(t) * 24 * s)));
    });
    const cup = (kk: number) => {
      const [cx, cy] = P(v, add(j.head, mul(j.side, kk * 23 * s)));
      return <rect key={`c${kk}`} x={cx - 3.5 * s * px} y={cy - 8 * s * px} width={7 * s * px} height={16 * s * px} rx={3 * s * px} fill={AIG} stroke={pen.ink} strokeWidth={sw * 0.35} />;
    };
    head = (
      <g>
        <Ink pts={pts(ant)} seed={seed + 8} sw={sw * 0.7} />
        <circle cx={dx} cy={dy} r={4 * s * px} fill={AIG} stroke={pen.ink} strokeWidth={sw * 0.35} />
        {!facing && <Ink pts={pts(band)} c={AIG} sw={sw * 1.05} seed={seed + 7} />}
        <Box c={j.head} ax={ax} ay={j.side} az={j.up} h={[13 * s, 20 * s, 17 * s]} fill={pen.fill} ink={pen.ink} sw={sw * 0.7} front={screen} k={k} />
        {facing && <Ink pts={pts(band)} c={AIG} sw={sw * 1.05} seed={seed + 7} />}
        {cup(-1)}
        {cup(1)}
      </g>
    );
  }
  return (
    <g opacity={props.op ?? 1}>
      {part !== "upper" && legs}
      {part !== "legs" && (
        <>
          {farArm}
          {body}
          {facing ? null : head}
          {nearArm}
          {facing ? head : null}
        </>
      )}
    </g>
  );
};

// ---- helpers for DJ actions (all return world points)
// a nod on the beat: 0..1, `period` frames per beat
export const beat = (f: number, period = 15) => Math.max(0, Math.sin((2 * Math.PI * f) / period)) ** 2;
// a hand scratching a record: rocks back and forth on the record's near edge
export const scratch = (f: number, c: V3, r: number, period = 14, a0 = 100): V3 => {
  const a = ((a0 + 28 * Math.sin((2 * Math.PI * f) / period)) * Math.PI) / 180;
  return [c[0] + r * 0.7 * Math.cos(a), c[1] + r * 0.7 * Math.sin(a), c[2] + 3];
};
// a fingertip resting on top of a knob or fader cap
export const onTop = (p: V3, h = 10): V3 => [p[0], p[1], p[2] + h];
// eased walk: position along a path and the stride phase to feed `step`
export const walk = (f: number, a: [number, number], b: [number, number], f0: number, f1: number, stride = 26) => {
  const u = Math.min(1, Math.max(0, (f - f0) / (f1 - f0)));
  const e = u * u * (3 - 2 * u);
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) * e;
  return { x: a[0] + (b[0] - a[0]) * e, y: a[1] + (b[1] - a[1]) * e, step: u > 0 && u < 1 ? d / stride : 0 };
};
// the AI's screen faces: eye dots for "eyes" (open, happy arcs, squint), a "?" and short text
export const Face: React.FC<{ kind: "eyes" | "happy" | "squint" | "?" | "text"; text?: string; s?: number }> = ({ kind, text = "", s = 40 }) => {
  const { ink } = useContext(PenCtx);
  if (kind === "eyes") return <g fill={ink}><circle cx={-14} cy={-2} r={5} /><circle cx={14} cy={-2} r={5} /></g>;
  if (kind === "happy") return <g fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round"><path d="M-21 2 Q-14 -8 -7 2" /><path d="M7 2 Q14 -8 21 2" /></g>;
  if (kind === "squint") return <g stroke={ink} strokeWidth={4} strokeLinecap="round"><line x1={-21} y1={-2} x2={-7} y2={-2} /><line x1={7} y1={-2} x2={21} y2={-2} /></g>;
  if (kind === "?") return <T x={0} y={16} s={48}>?</T>;
  return <T x={0} y={s * 0.36} s={s}>{text}</T>;
};
