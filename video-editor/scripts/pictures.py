"""Render every picture in a job's plan to a clip of exact length, with the click.

    python3 pictures.py <job> [<name> ...]

Each plan.json overlay with a "picture" key, e.g.
  {"file": "capcut/overlays/ring.mov", "clip": "IMG_8912", "from": 2.0, "to": 6.0,
   "picture": {"src": "neko/ring.jpg", "aspect": 1.333}}
is rendered with the Remotion `Picture` composition (props = "picture"; files
live in video-editor/projects/0926/remotion/public/), held for the length that
anchor.py wrote to frames.json, and gets the mouse-click sound at frame 0
(or "sound": "<file in assets/sound-effects>" on the overlay, e.g. for a meme).
Run anchor.py first (lengths change whenever the cuts or speed change). Give
names to render only those.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECTS = HERE.parent / "projects"
REMOTION = PROJECTS / "0926" / "remotion"
CLICK = HERE.parent / "assets" / "sound-effects" / "mouse-click-sound.mp3"
FPS = 30


def clip_args(png, click, frames, out):
    """ffmpeg: a still held for `frames` frames (ProRes 4444, alpha kept), click at 0."""
    return ["ffmpeg", "-nostdin", "-v", "error", "-y", "-loop", "1", "-framerate", str(FPS), "-i", str(png),
            "-i", str(click), "-map", "0:v", "-map", "1:a", "-frames:v", str(frames), "-t", f"{frames / FPS:g}",
            "-af", "apad", "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le",
            "-c:a", "pcm_s16le", str(out)]


def sound_for(overlay):
    """The click, or the overlay's own "sound" from assets/sound-effects (e.g. a meme's)."""
    return CLICK.with_name(overlay["sound"]) if "sound" in overlay else CLICK


def sound_wav(job_dir, src):
    """A sound trimmed to its start and peaking at -8 dB, cached per job."""
    out = job_dir / "broll" / ("click.wav" if src == CLICK else f"{src.stem}.wav")
    if not out.exists():
        out.parent.mkdir(parents=True, exist_ok=True)
        raw = out.with_name(out.stem + "-raw.wav")
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(src), "-af",
                        "silenceremove=start_periods=1:start_threshold=-45dB", "-ar", "48000", "-ac", "2", str(raw)], check=True)
        log = subprocess.run(["ffmpeg", "-nostdin", "-i", str(raw), "-af", "volumedetect", "-f", "null", "-"],
                             capture_output=True, text=True).stderr
        peak = float(log.split("max_volume:")[1].split("dB")[0])
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(raw), "-af", f"volume={-8 - peak}dB", str(out)], check=True)
    return out


def main(job, *only):
    job_dir = PROJECTS / job
    plan = json.loads((job_dir / "plan.json").read_text())
    frames = json.loads((job_dir / "frames.json").read_text())
    with tempfile.TemporaryDirectory() as tmp:
        for o in plan["overlays"]:
            name = Path(o["file"]).stem
            if "picture" not in o or (only and name not in only):
                continue
            png = Path(tmp) / f"{name}.png"
            subprocess.run(["pnpm", "-s", "exec", "remotion", "still", "Picture", str(png),
                            f"--props={json.dumps(o['picture'])}", "--log=error"], cwd=REMOTION, check=True,
                           stdin=subprocess.DEVNULL)
            out = job_dir / o["file"]
            out.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(clip_args(png, sound_wav(job_dir, sound_for(o)), frames[name], out), check=True)
            print(f"{name}: {frames[name]} frames")


if __name__ == "__main__":
    main(*sys.argv[1:])
