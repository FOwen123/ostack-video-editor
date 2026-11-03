"""Bake a tightened draft's playback speed into the media, so CapCut plays at 1x.

    python3 bakespeed.py <job> <draft>

CapCut stretches sped-up audio live, which can sound glitchy. For every main-track
segment with speed != 1, this renders projects/<job>/capcut/media/<clip>-x<speed>.mov
from <clip>-loud.mov (picture setpts, audio atempo: pitch kept), points the segment
at it with its source range divided by the speed, and sets the speed to 1. Run
after declick.py (the fades and grade must already be in -loud.mov), with CapCut
closed. Writes both copies of the draft file (draft_info.json, or draft_content.json on Windows).
"""
import json
import os
import subprocess
import sys
import uuid
from pathlib import Path

import capcut as C

ROOT = C.ROOT


def baked(source, target, speed):
    """Source range in the original clip -> the same moment in the sped-up file.
    Duration becomes the target's, so source and timeline match frame for frame."""
    return {"start": round(source["start"] / speed), "duration": target["duration"]}


def render(loud, out, speed):
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(loud),
                    "-filter:v", f"setpts=PTS/{speed}", "-r", "30", "-af", f"atempo={speed}",
                    "-c:v", "h264_videotoolbox", "-b:v", "24M", "-pix_fmt", "yuv420p",
                    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
                    "-c:a", "pcm_s16le", "-ar", "48000", str(out)], check=True)


def main(job, draft):
    folder = ROOT / draft
    draft = C.draft_file(folder)
    d = C.read(folder / draft)
    mats = {m["id"]: m for m in d["materials"]["videos"]}
    main_track = next(t for t in d["tracks"] if t["type"] == "video" and t["flag"] == 0)
    speeds = {m["id"]: m for m in d["materials"].get("speeds", [])}
    done = {}
    for seg in main_track["segments"]:
        speed = seg.get("speed", 1.0)
        if speed == 1.0:
            continue
        mat = mats[seg["material_id"]]
        loud = Path(mat["path"])
        assert loud.name.endswith("-loud.mov"), f"run declick.py first: {loud}"
        key = (str(loud), speed)
        if key not in done:
            out = loud.with_name(loud.name.replace("-loud.mov", f"-x{speed:g}.mov"))
            render(loud, out, speed)
            new = dict(mat, id=str(uuid.uuid4()).upper(), path=str(out), material_name=out.name,
                       duration=round(mat["duration"] / speed))
            d["materials"]["videos"].append(new)
            done[key] = new["id"]
            print(out.name)
        seg["material_id"] = done[key]
        seg["source_timerange"] = baked(seg["source_timerange"], seg["target_timerange"], speed)
        seg["speed"] = 1.0
        for r in seg["extra_material_refs"]:
            if r in speeds:
                speeds[r]["speed"] = 1.0
    proj = json.loads((folder / "Timelines/project.json").read_text())
    for f in (folder / draft, folder / "Timelines" / proj["main_timeline_id"] / draft):
        tmp = f.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
        os.replace(tmp, f)
    print(f"{draft}: {len(done)} clips baked")


def test():
    # 1.25x: a piece starting 10s into the clip starts 8s into the sped-up file and
    # lasts exactly as long as it plays on the timeline.
    assert baked({"start": 10_000_000, "duration": 2_500_000}, {"start": 0, "duration": 2_000_000}, 1.25) == \
        {"start": 8_000_000, "duration": 2_000_000}
    print("ok")


if __name__ == "__main__":
    test() if sys.argv[1:] == ["--test"] else main(sys.argv[1], sys.argv[2])
