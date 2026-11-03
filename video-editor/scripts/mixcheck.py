"""Measure a draft's final mix: loudness, peak, clicks and dead air.

    python3 mixcheck.py <draft>
    python3 mixcheck.py --test

Rebuilds the audio the way CapCut plays it (every segment with audio, at its
volume and speed, placed on the timeline), then prints integrated loudness and
true peak (target: -14 LUFS, peak under -1 dB), and lists:

- each click-like spike at a cut or a sound's start, with its time: "sound starts" (a
  picture's click or a sound effect begins there: expected) or "cut" (a cut clicks with
  no sound starting: needs declick.py). Spikes inside a shot are mostly p/t/k sounds in
  speech, so only their count is shown;
- dead air: stretches of digital silence (room tone is never silent), where a voice
  track stops dead, e.g. a clip whose audio ends before its video (the 1016 "bzzt").

Pass: loudness -14 +/-0.5, peak under -1 dB, no "cut" spikes, no dead air.
"""
import array
import os
import re
import shlex
import subprocess
import sys
import tempfile
import wave

import capcut as C

ROOT = C.ROOT


def spikes(x, sr, block=0.005, ratio=5.0):
    """Times (s) of click-like spikes: 5ms blocks whose sharpest sample-to-sample
    change is `ratio` times the 200ms around them. Speech rarely does that; a cut
    that starts mid-waveform does."""
    n = int(block * sr)
    d2 = [abs(x[i + 1] - 2 * x[i] + x[i - 1]) for i in range(1, len(x) - 1)]
    pk = [max(d2[i:i + n]) for i in range(0, len(d2) - n + 1, n)]
    out, half = [], 20
    for i, p in enumerate(pk):
        ctx = pk[max(0, i - half):i + half + 1]
        if p > ratio * (sum(ctx) / len(ctx)) and p > 1e-3:
            t = round((i * n + n / 2) / sr, 2)  # block centre
            if not out or t - out[-1] > 0.05:
                out.append(t)
    return out


def near_cuts(hits, cuts, tol=0.03):
    return sum(1 for t in hits if any(abs(t - c) < tol for c in cuts))


def kind(t, cuts, starts, tol=0.03, sound_tol=0.15):
    """What sits under a spike. A sound effect can peak a little after it starts (a whoosh at 0.12 s)."""
    if any(-tol < t - s < sound_tol for s in starts):
        return "sound starts"
    return "cut" if any(abs(t - c) < tol for c in cuts) else "inside a shot"


def dead_air(x, sr, floor=2, min_len=0.05):
    """(start, end) s of stretches at least `min_len` long where every 16-bit sample is within
    `floor` of zero. Leading and trailing silence count too: the video should start and end on sound."""
    out, run, n = [], None, int(min_len * sr)
    for i, v in enumerate(x):
        if -floor <= v <= floor:
            if run is None:
                run = i
        elif run is not None:
            if i - run >= n:
                out.append((round(run / sr, 2), round(i / sr, 2)))
            run = None
    if run is not None and len(x) - run >= n:
        out.append((round(run / sr, 2), round(len(x) / sr, 2)))
    return out


def test():
    sr = 1000
    tone = [100, -100] * 100
    assert dead_air(tone + [0] * 100 + tone, sr) == [(0.2, 0.3)]
    assert dead_air(tone + [1] * 20 + tone, sr) == []  # under 50 ms: a zero crossing, not dead air
    assert dead_air(tone + [0] * 60, sr) == [(0.2, 0.26)]
    assert kind(10.0, [10.0], []) == "cut"
    assert kind(10.1, [10.0], [10.0]) == "sound starts"
    assert kind(5.0, [10.0], [10.0]) == "inside a shot"
    print("ok")


def mix_command(d, wav):
    mats = {m["id"]: m for m in d["materials"]["videos"]}
    ins, parts = [], []
    for track in d["tracks"]:
        for s in track["segments"]:
            m = mats.get(s["material_id"])
            if not m or not m.get("has_audio") or s.get("volume", 1) == 0:
                continue
            i = len(ins)
            ins.append(m["path"])
            st, tt = s["source_timerange"], s["target_timerange"]
            tempo = f",atempo={s['speed']}" if s.get("speed", 1) != 1 else ""
            parts.append(f"[{i}:a:0]atrim=start={st['start'] / 1e6}:duration={st['duration'] / 1e6},"
                         f"asetpts=PTS-STARTPTS{tempo},volume={s.get('volume', 1)},adelay={tt['start'] // 1000}:all=1[a{i}]")
    graph = ";".join(parts) + ";" + "".join(f"[a{i}]" for i in range(len(ins))) + \
        f"amix=inputs={len(ins)}:normalize=0,asplit[m1][m2];[m1]ebur128=peak=true[o1]"
    args = ["ffmpeg", "-nostdin", "-nostats", "-v", "info"]
    for p in ins:
        args += ["-i", p]
    return args + ["-filter_complex", graph, "-map", "[o1]", "-f", "null", "-",
                   "-map", "[m2]", "-ac", "1", "-ar", "48000", "-y", wav]


def main(draft):
    d = C.read(ROOT / draft / C.draft_file(ROOT / draft))
    main_track = next(t for t in d["tracks"] if t["type"] == "video" and t["flag"] == 0)
    cuts = [s["target_timerange"]["start"] / 1e6 for s in main_track["segments"]][1:]
    mats = {m["id"]: m for m in d["materials"]["videos"]}
    starts = [s["target_timerange"]["start"] / 1e6 for t in d["tracks"] if t is not main_track
              for s in t["segments"] if mats.get(s["material_id"], {}).get("has_audio") and s.get("volume", 1) > 0]
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "mix.wav")
        log = subprocess.run(mix_command(d, wav), capture_output=True, text=True).stderr
        summary = log[log.rfind("Summary:"):]
        loud = re.search(r"I:\s+(-?[\d.]+) LUFS", summary).group(1)
        peak = re.search(r"Peak:\s+(-?[\d.inf]+) dBFS", summary).group(1)
        w = wave.open(wav)
        x = array.array("h", w.readframes(w.getnframes()))
        sr = w.getframerate()
        hits = spikes([v / 32768 for v in x], sr)
        dead = dead_air(x, sr)
    print(f"{draft}: {loud} LUFS, true peak {peak} dB, {len(hits)} spikes, {near_cuts(hits, cuts)} of {len(cuts)} cuts")
    inside = 0
    for t in hits:
        k = kind(t, cuts, starts)
        if k == "inside a shot":  # mostly plosives in speech: counted, not listed
            inside += 1
        else:
            print(f"  spike {t // 60:.0f}:{t % 60:05.2f}  {k}")
    print(f"  {inside} more spikes inside shots (usually p/t/k sounds; listen only if one is heard)")
    for a, b in dead:
        print(f"  dead air {a // 60:.0f}:{a % 60:05.2f} to {b // 60:.0f}:{b % 60:05.2f} ({b - a:.2f} s)")
    print("  dead air: none" if not dead else f"  {len(dead)} stretches of dead air")


if __name__ == "__main__":
    test() if sys.argv[1:] == ["--test"] else main(sys.argv[1])
