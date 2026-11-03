"""Mix sound effects into this job's overlay clips, cued to spoken words (animated-shots skill, step 5).

    python3 sfx.py <rendered-dir>     # silent renders (s01.mp4, s02.mov, ...) -> capcut/overlays/ with their sound

Each overlay with sounds gets them as its own audio track (picture copied, frame count checked), so they stay in sync
wherever tighten.py places the clip. Cues name a spoken word (looked up in the Remotion cue file, frames from the slot
start; the first word starting with it) or a frame number. Clips without sounds are copied as they are.
"""
import array
import json
import math
import re
import subprocess
import sys
from pathlib import Path

JOB = Path(__file__).resolve().parent
SFX = JOB.parent.parent / "assets" / "sound-effects"
TOPIC = "my-topic"  # this video's folder in the Remotion project, as in cues.py
CUES_TS = JOB.parent / "0926" / "remotion" / "src" / TOPIC / "cues.ts"
FPS = 30
# name -> (file, lead s, length s, gain dB)
S = {
    "whoosh": ("whoosh-clean.mp3", 0.0, 0.5, -2),
    "click": ("mouse-click-sound.mp3", 1.02, 0.18, -3),
    "impact": ("vine-boom-sound-effect_KT89XIq.mp3", 0.07, 1.2, -3),  # the file opens on 0.1 s of silence
    "shocked": ("shocked-sound-effect.mp3", 0.0, 1.5, -4),
}
PEAK = 0.3  # effects peak at -10.5 dBFS: -6 (1022) clipped the mix where a click met a loud word (1031)
VOICE = -16.3  # dBFS, for the voice-matched mode (1023-v1's voice)
EARLY = 3  # frames: a word cue sounds just before the word, in the gap, not on its consonant
W = "whoosh"
# slot -> [(word or frame, sound[, dB trim])]; beats from DESIGN.md: hook frame 0 silent, a click on each picture or post, a whoosh on each section turn
CUES = {
    # "s02": [("Palantir", "impact", -12), ("military", "click")],
}


def slot_words():
    out = {}
    for m in re.finditer(r"([a-z]+\d\d): \{ frames: \d+.*?words: (\[.*?\]) as", CUES_TS.read_text()):
        out[m.group(1)] = json.loads(m.group(2))
    return out


def frame_of(words, w):
    if isinstance(w, int):
        return w
    hit = next((f for f, t in words if re.sub(r"^\W+", "", t).lower().startswith(w.lower())), None)
    assert hit is not None, f"no word {w}"
    return hit


def frames(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v",
                                   "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", str(path)])
    return int(out.decode().strip().strip(","))


def loudest(file, lead, dur):
    """(RMS of a sound's loudest 50 ms, its peak), dBFS: how loud it sounds next to a syllable, and how much room it has."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(lead), "-t", str(dur), "-i", str(SFX / file), "-ac", "1", "-ar", "16000",
                          "-f", "s16le", "-"], capture_output=True, check=True).stdout
    x = array.array("h", raw)
    rms = max(20 * math.log10(math.sqrt(sum(v * v for v in x[i:i + 800]) / 800) / 32768 + 1e-9) for i in range(0, max(1, len(x) - 800), 160))
    return rms, 20 * math.log10(max(abs(v) for v in x) / 32768)


def mix(src, dst, cues, words, below=None):
    n = frames(src)
    args = ["ffmpeg", "-v", "error", "-y", "-i", str(src)]
    chains = []
    for k, (w, name, *trim) in enumerate(cues):
        file, lead, dur, gain = S[name]
        if below is None:
            gain += trim[0] if trim else 0
        else:  # voice-matched: the trim only marks a loud word, which gets 3 dB under the voice
            rms, peak = loudest(file, lead, dur)
            gain = min(VOICE - (3 if trim else below) - rms, -3 - peak)  # a short click can't reach the voice: it would clip first
        args += ["-i", str(SFX / file)]
        ms = round(max(0, frame_of(words, w) - (EARLY if isinstance(w, str) else 0)) / FPS * 1000)
        chains.append(f"[{k + 1}:a]atrim=start={lead}:duration={dur},asetpts=PTS-STARTPTS,volume={gain}dB,aresample=48000,"
                      f"aformat=channel_layouts=stereo,adelay={ms}|{ms}[s{k}]")
    limit = f",alimiter=limit={PEAK}:level=false" if below is None else ""  # voice-matched sounds play as they are
    labels = "".join(f"[s{k}]" for k in range(len(cues)))
    chains.append(f"{labels}amix=inputs={len(cues)}:normalize=0:duration=longest{limit},"
                  f"apad,atrim=end={n / FPS},afade=t=out:st={n / FPS - 0.25}:d=0.25[a]")  # no hard stop at the clip end
    acodec = ["-c:a", "pcm_s16le"] if dst.suffix == ".mov" else ["-c:a", "aac", "-b:a", "256k"]
    args += ["-filter_complex", ";".join(chains), "-map", "0:v", "-map", "[a]", "-c:v", "copy", *acodec,
             "-t", f"{n / FPS}", str(dst)]  # -t: the audio pad must never run on
    subprocess.run(args, check=True)
    assert frames(dst) == n, f"{dst}: frame count changed"


def main(rendered, out=None, below=None):
    words = slot_words()
    out = Path(out) if out else JOB / "capcut" / "overlays"
    out.mkdir(exist_ok=True)
    for src in sorted(p for p in Path(rendered).glob("*.*") if re.fullmatch(r"[a-z]+\d\d", p.stem)):
        dst = out / src.name
        if src.stem in CUES:
            mix(src, dst, CUES[src.stem], words.get(src.stem, []), None if below is None else float(below))
        elif src.resolve() != dst.resolve():
            subprocess.run(["cp", str(src), str(dst)], check=True)
        print(dst.name, [c[1] for c in CUES.get(src.stem, [])])


if __name__ == "__main__":
    if sys.argv[1:] == ["--test"]:
        w = slot_words()
        for slot, cs in CUES.items():
            for word, *_ in cs:
                frame_of(w.get(slot, []), word)
        print("ok: every cue word found")
    else:
        main(*sys.argv[1:4])
