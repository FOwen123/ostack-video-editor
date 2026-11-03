import React from "react";
import { useCurrentFrame } from "remotion";
import { sans } from "../iso";
import { useV, proj } from "../ara/AraIso-rot";
import { AMBER, GREEN, PAPER } from "./dj-booth";

// Two characters, white line art, no faces, same build so they compare. They are billboards: they face the camera
// whatever the yaw. (x, y, z) is the point on the floor/desk where the torso is cut off; s scales them.

const Body: React.FC<{ ext?: number }> = ({ ext = 0 }) => (
  <g fill="#10100f" stroke={PAPER} strokeWidth={3.2} strokeLinejoin="round" strokeLinecap="round">
    <path d={`M-50 ${ext} L-50 0 L-44 -98 Q-42 -124 -18 -128 L18 -128 Q42 -124 44 -98 L50 0 L50 ${ext} Z`} />
    <path d="M-12 -128 L-12 -142 M12 -128 L12 -142" fill="none" />
  </g>
);
const Arms: React.FC<{ hold: [number, number]; other?: [number, number] }> = ({ hold, other = [58, -62] }) => (
  <g fill="none" stroke={PAPER} strokeWidth={4} strokeLinecap="round">
    <path d={`M-42 -108 Q-70 -92 ${hold[0]} ${hold[1]}`} />
    <path d={`M42 -108 Q70 -92 ${other[0]} ${other[1]}`} />
  </g>
);

export const Dj: React.FC<{ x: number; y: number; z: number; s?: number; op?: number; nod?: number; record?: boolean; blankRecord?: boolean; flip?: boolean }> = ({ x, y, z, s = 1, op = 1, nod = 0, record = true, blankRecord = false, flip = false }) => {
  const v = useV();
  const f = useCurrentFrame();
  const [px, py] = proj(v, x, y, z);
  const k = (s * v.Z) / 1.2247;
  const bob = Math.sin(f * 0.14) * 1.6 + nod;
  const ext = (z * 0 + 60) * v.cp * 1.2247 / s;
  return (
    <g transform={`translate(${px} ${py}) scale(${flip ? -k : k} ${k})`} opacity={op}>
      <g transform={`translate(0 ${bob * 0.4})`}>
        <Body ext={ext} />
        <Arms hold={[-70, -78]} />
        {record && (
          <g transform="translate(-80 -86)">
            <circle r={34} fill="#0c0c0b" stroke={PAPER} strokeWidth={3} />
            <circle r={22} fill="none" stroke="#3a3835" strokeWidth={1.5} />
            <circle r={10} fill={blankRecord ? "#cfc9be" : AMBER} stroke="#000" strokeWidth={1.5} />
          </g>
        )}
        <g transform={`translate(0 ${bob})`}>
          <circle cx={0} cy={-170} r={30} fill="#10100f" stroke={PAPER} strokeWidth={3.2} />
          {/* white cap, brim to one side */}
          <path d="M-31 -176 A31 31 0 0 1 31 -176 Z" fill={PAPER} stroke={PAPER} strokeWidth={2} strokeLinejoin="round" />
          <path d="M6 -178 L62 -172 Q66 -168 60 -165 L8 -168 Z" fill={PAPER} stroke={PAPER} strokeWidth={2} strokeLinejoin="round" />
          {/* amber headphones */}
          <path d="M-36 -164 A38 44 0 0 1 36 -164" fill="none" stroke={AMBER} strokeWidth={7} strokeLinecap="round" />
          <ellipse cx={-36} cy={-160} rx={8} ry={14} fill={AMBER} stroke="#000" strokeWidth={1.5} />
          <ellipse cx={36} cy={-160} rx={8} ry={14} fill={AMBER} stroke="#000" strokeWidth={1.5} />
        </g>
      </g>
    </g>
  );
};

export const Ai: React.FC<{ x: number; y: number; z: number; s?: number; op?: number; cursor?: number; text?: string; chip?: boolean; blankRecord?: boolean; flip?: boolean; relaxed?: number }> = ({
  x, y, z, s = 1, op = 1, cursor = 1, text = "", chip = true, blankRecord = false, flip = false, relaxed = 0,
}) => {
  const v = useV();
  const f = useCurrentFrame();
  const [px, py] = proj(v, x, y, z);
  const k = (s * v.Z) / 1.2247;
  const bob = Math.sin(f * 0.14 + 1) * 1.6;
  const ext = 60 * v.cp * 1.2247 / s;
  const blink = Math.floor(f / 9) % 2 === 0 ? 1 : 0.15;
  return (
    <g transform={`translate(${px} ${py}) scale(${flip ? -k : k} ${k})`} opacity={op}>
      <g transform={`translate(0 ${bob * 0.4})`}>
        <Body ext={ext} />
        <Arms hold={[-70, -78]} other={[58 - 8 * relaxed, -62 + 24 * relaxed]} />
        {blankRecord ? (
          <g transform="translate(-80 -86)">
            <circle r={34} fill="#0c0c0b" stroke={PAPER} strokeWidth={3} />
            <circle r={22} fill="none" stroke="#3a3835" strokeWidth={1.5} />
            <circle r={10} fill="#cfc9be" stroke="#000" strokeWidth={1.5} />
          </g>
        ) : (
          chip && (
            <g transform="translate(-80 -86)">
              <rect x={-20} y={-20} width={40} height={40} rx={6} fill="#10100f" stroke={PAPER} strokeWidth={3} />
              <rect x={-9} y={-9} width={18} height={18} fill={PAPER} opacity={0.85} />
              {[-12, 0, 12].map((p) => (
                <g key={p} stroke={PAPER} strokeWidth={2.4} strokeLinecap="round">
                  <line x1={p} y1={-20} x2={p} y2={-27} />
                  <line x1={p} y1={20} x2={p} y2={27} />
                </g>
              ))}
            </g>
          )
        )}
        <g transform={`translate(0 ${bob})`}>
          {/* square screen head and an antenna */}
          <line x1={0} y1={-196} x2={0} y2={-228} stroke={PAPER} strokeWidth={3.2} strokeLinecap="round" />
          <circle cx={0} cy={-232} r={6} fill="#10100f" stroke={PAPER} strokeWidth={3} />
          <rect x={-34} y={-200} width={68} height={58} rx={9} fill="#10100f" stroke={PAPER} strokeWidth={3.2} />
          <rect x={-26} y={-192} width={52} height={42} rx={4} fill="#050505" stroke="#55514b" strokeWidth={1.5} />
          {text ? (
            <text x={0} y={-164} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={22} fill={PAPER}>
              {text}
            </text>
          ) : null}
          <rect x={text ? 6 + text.length * 6 : -8} y={-176} width={12} height={20} fill={PAPER} opacity={cursor * blink} />
          {/* green headphones */}
          <path d="M-38 -166 A40 48 0 0 1 38 -166" fill="none" stroke={GREEN} strokeWidth={7} strokeLinecap="round" />
          <rect x={-46} y={-178} width={13} height={28} rx={6} fill={GREEN} stroke="#000" strokeWidth={1.5} />
          <rect x={33} y={-178} width={13} height={28} rx={6} fill={GREEN} stroke="#000" strokeWidth={1.5} />
        </g>
      </g>
    </g>
  );
};

// a flat card flying through the scene that always faces the camera (a word card, a chat bubble)
export const Card: React.FC<{ x: number; y: number; z: number; w?: number; h?: number; text: string; rot?: number; op?: number; fs?: number; fill?: string; ink?: string }> = ({ x, y, z, w = 130, h = 62, text, rot = 0, op = 1, fs = 34, fill = PAPER, ink = "#0b0b0a" }) => {
  const v = useV();
  const [px, py] = proj(v, x, y, z);
  const k = v.Z / 1.2247;
  return (
    <g transform={`translate(${px} ${py}) rotate(${rot}) scale(${k})`} opacity={op}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={9} fill={fill} stroke="#000" strokeWidth={2} />
      <text x={0} y={fs * 0.35} textAnchor="middle" fontFamily={sans} fontWeight={700} fontSize={fs} fill={ink}>
        {text}
      </text>
    </g>
  );
};

// the DJ's hand: a finger pointing down onto a point on the desk, with a forearm going up-right out of frame
export const HandPtr: React.FC<{ x: number; y: number; z: number; press?: number; s?: number; op?: number }> = ({ x, y, z, press = 0, s = 1, op = 1 }) => {
  const v = useV();
  const [px, py] = proj(v, x, y, z);
  const k = (s * v.Z) / 1.2247;
  return (
    <g transform={`translate(${px} ${py + press * 5 * k}) scale(${k})`} opacity={op} fill="#10100f" stroke={PAPER} strokeWidth={3.4} strokeLinejoin="round" strokeLinecap="round">
      {/* a forearm from the upper right ending in one pressing fingertip */}
      <path d="M110 -250 L40 -80" fill="none" stroke={PAPER} strokeWidth={52} />
      <path d="M110 -250 L40 -80" fill="none" stroke="#10100f" strokeWidth={45} />
      <path d="M40 -80 L6 -10" fill="none" stroke={PAPER} strokeWidth={30} />
      <path d="M40 -80 L6 -10" fill="none" stroke="#10100f" strokeWidth={23} />
      <path d="M62 -112 L84 -96" fill="none" strokeWidth={3} />
    </g>
  );
};

// a red X flashed over a wrong guess
export const RedX: React.FC<{ x: number; y: number; z: number; s?: number; op?: number }> = ({ x, y, z, s = 1, op = 1 }) => {
  const v = useV();
  const [px, py] = proj(v, x, y, z);
  const k = (s * v.Z) / 1.2247;
  return (
    <g transform={`translate(${px} ${py}) scale(${k})`} opacity={op} stroke="#E5484D" strokeWidth={14} strokeLinecap="round">
      <line x1={-30} y1={-30} x2={30} y2={30} />
      <line x1={30} y1={-30} x2={-30} y2={30} />
    </g>
  );
};
