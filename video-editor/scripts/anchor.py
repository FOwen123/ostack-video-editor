"""Where things land after tighten.py: picture lengths and subtitle times.

    python3 anchor.py <job> <draft> [<new-draft>]

Runs tighten.py's cut (plan.json's order, speed, add, drop, start_at, end_at; not
its overlays) in memory on <draft>, then:
- prints and writes projects/<job>/frames.json: each plan overlay's length in
  frames on the new timeline (pictures.py renders clips of exactly that length);
- with <new-draft>, turns projects/<job>/captions/<job>.cues-src.json
  ([[clip, source_s, "English", "中文"], ...], times read off the clip's own
  transcript) into captions/<new-draft>.cues.json for captions.py.
"""
import json
import sys
from pathlib import Path

import tighten as T

FPS = 30


def frames_for(by_clip, overlay, fps=FPS):
    """Frames an overlay covers: from its "from" to its "to" (in "to_clip" if set)."""
    start = round(T.locate(by_clip[overlay["clip"]], overlay["from"]) * fps)
    end = round(T.locate(by_clip[overlay.get("to_clip", overlay["clip"])], overlay["to"], end=True) * fps)
    return end - start


def anchor_cues(by_clip, src):
    """[[clip, source_s, en, zh], ...] -> [[timeline_s, en, zh], ...], strictly in order."""
    cues = [[round(T.locate(by_clip[c], s), 2), en, zh] for c, s, en, zh in src]
    bad = [(a, b) for a, b in zip(cues, cues[1:]) if b[0] <= a[0]]
    assert not bad, f"subtitle lines out of order: {bad}"
    return join_short(cues, [i + 1 == len(src) or src[i + 1][0] != src[i][0] for i in range(len(src))])


def join_short(cues, last=None, least=0.3):
    """A cue the cut squeezed under `least` s flashes. Removing the pause between clips squeezes the last words
    of a clip (they join the cue before them: "...a tiny bit") and the first words of a sentence (they join the
    cue after them: "AI does the same thing"). last[i] is True when cue i is its clip's last."""
    last = last or [False] * len(cues)
    out, carry = [], None
    for i, cue in enumerate(cues):
        cue = list(cue)
        if carry:  # the squeezed cue before this one opens it
            cue = [carry[0], carry[1] + " " + cue[1], carry[2]]
            carry = None
        nxt = cues[i + 1][0] if i + 1 < len(cues) else None
        if nxt is not None and nxt - cue[0] < least:
            if last[i] and out:
                out[-1] = [out[-1][0], out[-1][1] + " " + cue[1], out[-1][2]]
                continue
            if not last[i]:
                carry = cue
                continue
        out.append(cue)
    return out


assert join_short([[0, "want to become", "a"], [1.0, "a DJ", "a"], [1.2, "You'd listen", "b"]], [False, True, False]) == \
    [[0, "want to become a DJ", "a"], [1.2, "You'd listen", "b"]]
assert join_short([[0, "mix", "a"], [1.0, "AI does", "b"], [1.2, "the same thing", "b"]]) == \
    [[0, "mix", "a"], [1.0, "AI does the same thing", "b"]]


def cut(job, draft):
    """(new draft dict, by_clip) for <draft> cut with the job's plan."""
    job_dir = T.PROJECTS / job
    plan_path = job_dir / "plan.json"
    plan = json.loads(plan_path.read_text()) if plan_path.exists() else {}
    d = json.loads((T.ROOT / draft / "draft_info.json").read_text())
    d, _, by_clip, _ = T.tighten(d, job_dir / "transcript", {k: v for k, v in plan.items() if k != "overlays"}, job_dir)
    return d, by_clip, plan


def main(job, draft, new_draft=None):
    job_dir = T.PROJECTS / job
    d, by_clip, plan = cut(job, draft)
    frames = {Path(o["file"]).stem: frames_for(by_clip, o) for o in plan.get("overlays", [])}
    (job_dir / "frames.json").write_text(json.dumps(frames, indent=1))
    for name, n in frames.items():
        print(f"{name:16} {n:4} frames  {n / FPS:5.2f}s")
    print(f"video {d['duration'] / 1e6:.2f}s")
    src = job_dir / "captions" / f"{job}.cues-src.json"
    if new_draft and src.exists():
        cues = anchor_cues(by_clip, json.loads(src.read_text()))
        out = job_dir / "captions" / f"{new_draft}.cues.json"
        out.write_text(json.dumps({"end": round(d["duration"] / 1e6, 3), "cues": cues}, ensure_ascii=False, indent=1))
        print(f"{len(cues)} subtitle lines -> {out}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
