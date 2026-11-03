"""Every spoken word's frame inside its overlay slot, for this job's Remotion shots (animated-shots skill, step 1).

    python3 cues.py <draft>      # -> projects/0926/remotion/src/<TOPIC>/cues.ts

Same cut as anchor.py (plan.json without overlays) and the same word times as subs.py (spelling fixes, start fixes,
words whisper put inside a pause moved to the pause end). Slot <name> = plan.json overlay capcut/overlays/<name>.mp4 or .mov.
"""
import json
import sys
from pathlib import Path

JOB = Path(__file__).resolve().parent
sys.path.insert(0, str(JOB.parents[1] / "scripts"))
import anchor as A  # noqa: E402
import subs as S  # noqa: E402
import tighten as T  # noqa: E402

TOPIC = "my-topic"  # this video's folder in the Remotion project
OUT = JOB.parent / "0926" / "remotion" / "src" / TOPIC / "cues.ts"


def main(draft):
    d, by_clip, plan = A.cut(JOB.name, draft)
    c = S.load(JOB.name)
    toks = {clip: S.tokens(JOB.name, c, clip) for clip in c["order"]}
    lines, at = [], 0
    for o in plan["overlays"]:
        name = Path(o["file"]).stem
        n = A.frames_for(by_clip, o)
        start = round(T.locate(by_clip[o["clip"]], o["from"]) * A.FPS)
        kind = "h" if o["file"].endswith(".mov") else "v"
        words = [(round(T.locate(by_clip[o["clip"]], s) * A.FPS) - start, w) for s, w, _ in toks[o["clip"]] if o["from"] <= s < o["to"]]
        ws = ", ".join(f"[{f}, {json.dumps(w)}]" for f, w in words)
        lines.append(f'  {name}: {{ frames: {n}, at: {start}, kind: "{kind}", words: [{ws}] as [number, string][] }},')
        at += n
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(
        f'// {JOB.name} (CapCut draft {draft}). Per slot: length (frames, 30 fps), start on the timeline, kind (v = full-screen\n'
        '// .mp4 over the voice; h = transparent .mov over the face cam) and every spoken word with its frame from the slot start.\n'
        f'// Written by projects/{JOB.name}/cues.py: rerun it rather than editing.\n'
        "export const SLOTS = {\n" + "\n".join(lines) + "\n} as const;\n"
        "export type Slot = keyof typeof SLOTS;\n"
        "// the frame of the first word starting with `w` at or after frame `from` (case-insensitive)\n"
        "export const cue = (slot: Slot, w: string, from = 0) => { const x = SLOTS[slot].words.find(([f, t]) => f >= from && t.toLowerCase().startsWith(w.toLowerCase())); if (!x) throw new Error(`no word ${w} in ${slot}`); return x[0]; };\n")
    print(OUT.read_text())


if __name__ == "__main__":
    main(sys.argv[1])
