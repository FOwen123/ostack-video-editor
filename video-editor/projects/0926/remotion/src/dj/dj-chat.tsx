import React from "react";
import { sans } from "../iso";
import { seg } from "../iso";
import { AMBER, PAPER, MUTED, rise } from "./dj-booth";

// a clean chat window (no product UI): a question bubble, then a reply typing out
export const Chat: React.FC<{ f: number; at: number; out?: number; left: number; top: number; width: number; q: string; reply?: string; replyAt?: number; speed?: number; fs?: number; tint?: string; confident?: boolean }> = ({
  f, at, out, left, top, width, q, reply = "", replyAt = at + 20, speed = 0.9, fs = 28, tint = AMBER, confident,
}) => {
  if (f < at || (out !== undefined && f > out)) return null;
  const typed = reply.slice(0, Math.max(0, Math.floor((f - replyAt) * speed)));
  const showReply = f >= replyAt - 4;
  return (
    <div style={{ position: "absolute", left, top, width, boxSizing: "border-box", background: "rgba(0,0,0,0.92)", border: "2.5px solid rgba(254,252,249,0.6)", borderRadius: 28, padding: "20px 22px 24px", fontFamily: sans, color: PAPER, boxShadow: "0 12px 50px rgba(0,0,0,0.7)", ...rise(f, at, out) }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 11, height: 11, borderRadius: 6, background: i === 0 ? tint : "rgba(254,252,249,0.3)" }} />
        ))}
      </div>
      <div style={{ alignSelf: "flex-end", marginLeft: "auto", maxWidth: "92%", background: "rgba(254,252,249,0.14)", borderRadius: 20, padding: "12px 16px", fontWeight: 600, fontSize: fs, lineHeight: 1.25, width: "fit-content" }}>{q}</div>
      {showReply && (
        <div style={{ marginTop: 14, borderLeft: `4px solid ${tint}`, paddingLeft: 14, fontWeight: 600, fontSize: fs, lineHeight: 1.28, color: confident ? PAPER : PAPER, minHeight: fs * 1.28 * 2 }}>
          {typed}
          {typed.length < reply.length && <span style={{ color: tint, opacity: Math.floor(f / 6) % 2 ? 0 : 1 }}>{"▌"}</span>}
        </div>
      )}
    </div>
  );
};
void seg;
void MUTED;
