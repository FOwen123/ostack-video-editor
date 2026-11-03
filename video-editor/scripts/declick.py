"""Remove the clicks at every cut of a tightened CapCut draft.

    python3 declick.py <job> <draft>

A hard cut starts or stops the voice mid-waveform, which clicks. For every
talking-head clip the draft uses, this rebuilds projects/<job>/capcut/media/
<clip>-loud.mov from the raw recording with the usual audio chain plus a FADE
(20ms) in and out at each kept range, so CapCut plays audio that is already
silent at every cut. Each piece keeps 0.1s of room tone at its edges (tighten.py
PAD), so the fades never touch a word. Audio is stored uncompressed (no AAC
padding). If plan.json has "grade" (an ffmpeg filter), the picture is re-encoded
through it to fix the lighting; otherwise it is copied. Per clip, "clip_grade": {clip: filter or null}
overrides "grade". "mute": {clip: [[from, to], ...]} silences those source seconds (a bleeped word),
with the same fades. A noisy recording: put a cleaned copy (same video, denoised audio) at projects/<job>/raw/<clip>.mov
and it replaces the download. A <clip>-key.mov next to
the loud file (the speaker cut out over a background, keyface.swift or keyface.py) replaces the
raw picture; the audio still comes from the raw recording. Run after tighten.py,
with CapCut closed; the draft is not changed.
"""
import json
import subprocess
import sys
from pathlib import Path

import capcut as C

ROOT = C.ROOT
PROJECTS = Path(__file__).resolve().parent.parent / "projects"
FADE = 0.02
# no noise reduction: the mic's room noise is ~-75 dB, and afftdn lifted soft speech ~4 dB (1023)
CHAIN = "highpass=f=95,highpass=f=95,volume={gain}dB,alimiter=limit=0.77:level=false,atrim=start=0.03,asetpts=PTS-STARTPTS"


def envelope(ranges, fade=FADE):
    """ffmpeg aeval gain: 0 outside the kept ranges, ramps of `fade` seconds at each edge."""
    terms = [f"clip(min((t-{a:.4f})/{fade},({b:.4f}-t)/{fade}),0,1)" for a, b in ranges]
    return "+".join(terms) or "0"


def cut_out(ranges, mutes):
    """Kept ranges minus the muted spans."""
    for m0, m1 in mutes:
        ranges = [r for a, b in ranges for r in ((a, min(b, m0)), (max(a, m1), b)) if r[1] > r[0]]
    return ranges


def ranges_by_clip(d):
    """{raw media path: [(src_start_s, src_end_s), ...]} for the main track."""
    mats = {m["id"]: m for m in d["materials"]["videos"]}
    main = next(t for t in d["tracks"] if t["type"] == "video" and t["flag"] == 0)
    out = {}
    for s in main["segments"]:
        st = s["source_timerange"]
        out.setdefault(mats[s["material_id"]]["path"], []).append((st["start"] / 1e6, (st["start"] + st["duration"]) / 1e6))
    return out


def video_args(grade):
    """ffmpeg video options: copy the picture, or re-encode it through the plan's
    "grade" filter (lighting/colour fix) at a high bitrate, tagged BT.709."""
    if not grade:
        return ["-c:v", "copy"]
    return ["-vf", grade, "-c:v", "h264_videotoolbox", "-b:v", "24M", "-pix_fmt", "yuv420p",
            "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709"]


def raw_for(loud, downloads=Path.home() / "Downloads"):
    stem = Path(loud).stem.removesuffix("-loud")
    folders = (Path(loud).parents[2] / "raw", downloads)  # a cleaned copy in the job's raw/ wins
    return next(p for f in folders for p in (f / f"{stem}.MOV", f / f"{stem}.mov") if p.exists())


def picture_for(loud):
    """The cut-out version of a clip when one exists, else the raw recording."""
    key = Path(loud).with_name(Path(loud).name.replace("-loud.mov", "-key.mov"))
    return key if key.exists() else raw_for(loud)


def main(job, draft, gain):
    d = C.read(ROOT / draft / C.draft_file(ROOT / draft))
    plan_path = PROJECTS / job / "plan.json"
    plan = json.loads(plan_path.read_text()) if plan_path.exists() else {}
    cutaways = {str(PROJECTS / job / c) for c in plan.get("insert_after", {}).values()}  # carry their own finished sound
    for loud, ranges in ranges_by_clip(d).items():
        if loud in cutaways:
            continue
        assert loud.endswith("-loud.mov"), f"run tighten.py first: {loud}"
        tmp = Path(loud).with_suffix(".tmp.mov")
        clip = Path(loud).name.removesuffix("-loud.mov")
        ranges = cut_out(sorted(ranges), plan.get("mute", {}).get(clip, []))
        af = CHAIN.format(gain=gain) + f",aeval='val(0)*({envelope(ranges)})':c=same"
        grade = plan.get("clip_grade", {}).get(clip, plan.get("grade"))  # a cut-out shot is lit for its background
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(picture_for(loud)), "-i", str(raw_for(loud)),
                        "-map", "0:v:0", "-map", "1:a:0",
                        *video_args(grade), "-af", af, "-ar", "48000", "-c:a", "pcm_s16le", str(tmp)], check=True)
        tmp.replace(loud)
        print(Path(loud).name, len(ranges), "ranges")


def test():
    # 1s tone, keep 0.2-0.5s: silent before, full inside, a 20ms ramp at the edges.
    import tempfile
    import wave
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "t.wav"
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-f", "lavfi", "-i", "sine=f=440:d=1:sample_rate=48000",
                        "-af", f"aeval='val(0)*({envelope([(0.2, 0.5)])})':c=same", str(out)], check=True)
        w = wave.open(str(out))
        x = [int.from_bytes(w.readframes(1), "little", signed=True) for _ in range(w.getnframes())]
    peak = lambda a, b: max(abs(v) for v in x[int(a * 48000):int(b * 48000)])
    full = peak(0.3, 0.4)
    assert peak(0.0, 0.199) == 0 and peak(0.501, 1.0) == 0, "audio outside the kept range"
    assert peak(0.2, 0.203) < 0.2 * full, "no fade-in at the cut"
    assert peak(0.497, 0.5) < 0.2 * full, "no fade-out at the cut"
    assert full > 2000  # lavfi sine is 1/8 of full scale
    assert cut_out([(0, 2), (3, 4)], [(1, 1.5)]) == [(0, 1), (1.5, 2), (3, 4)]
    assert cut_out([(0, 2)], [(1.8, 2.5)]) == [(0, 1.8)]
    # No grade: the picture is copied untouched. A grade re-encodes it through that filter.
    assert video_args(None) == ["-c:v", "copy"]
    assert video_args("eq=contrast=1.06")[:2] == ["-vf", "eq=contrast=1.06"]
    print("ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["--test"]:
        test()
    else:
        main(sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 6.8)
