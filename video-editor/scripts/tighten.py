"""Remove pauses from a CapCut draft's talking-head clips into a NEW draft.

    python3 tighten.py <job> <draft> <new-draft>

Reads projects/<job>/transcript/<clip>.silences.txt (ffmpeg silencedetect) for
every talking-head clip in <draft>, keeps speech plus PAD seconds either side
of each pause, and lays the kept pieces back to back on the main track. Other
video (overlays) keeps its length and moves to where its start lands after the
cut, unless projects/<job>/plan.json exists: then its "overlays" replace them,
each anchored to source seconds of a clip so it follows the words it explains:
  {"file": "capcut/overlays/x.mov", "clip": "IMG_8570", "from": 11.2, "to": 22.6}
("to" omitted = the file's own length; "to_clip" when it ends in another clip).
"end_at": {"clip": ..., "at": s} runs the last shot on to that source second;
"start_at" likewise opens the first shot earlier (a better first frame).
"order": [clip, ...] lays the talking-head clips in that order (script order).
"add": {clip: path} brings in a take recorded later; "drop": [clip, ...] leaves retakes out.
"cut_after": {clip: s} ends that clip at source second s (drops a stop-recording tap); "cut_before": {clip: s}
starts it there (a part re-recorded in another take, or a tap before the first word).
"insert_after": {clip: path} plays a full-screen cutaway (job-relative, 1080x1920, with its own sound) on the
main track right after that clip; the voice pauses for its length and everything after moves along.
"min_gap": 0.5 keeps more short pauses (fewer jump cuts; default MIN_GAP).
Split screen: an overlay's "y" moves it up (0.5 = a 1080x960 file fills the top half;
1 = the canvas half-height), and "face_y": -0.2 moves the talking head down.
"speed": 1.15 plays the whole video faster, pitch kept; {clip: 1.2} only those clips. Also writes every kept word with its new
time to transcript/<new-draft>.words.json for captions. The original draft is
never touched. CapCut must be closed: it rewrites
its draft registry on quit.
"""
import copy
import json
import re
import shutil
import subprocess
import sys
import time
import uuid
import wave
from pathlib import Path

import capcut as C

ROOT = C.ROOT
PROJECTS = Path(__file__).resolve().parent.parent / "projects"
PAD = 0.1
MIN_PIECE = 0.3
MIN_GAP = 0.25  # pauses that would lose less than this stay: the cut reads as a glitch
OVERLAY_VOLUME = 0.6  # a picture's click or a sound effect sits under the voice (DESIGN.md, Sound)


def keep_ranges(a, b, silences, pad=PAD, min_gap=0.0):
    """Source seconds [a, b] minus each pause shrunk by pad (not at the clip edges).
    A pause that would remove less than min_gap is kept."""
    keep, cur = [], a
    for s, e in sorted(silences):
        s, e = max(s, a), min(e, b)
        s2 = round(s + pad, 3) if s > a else s
        e2 = round(e - pad, 3) if e < b else e
        if e2 <= s2 or e2 - s2 < min_gap:
            continue
        if s2 > cur:
            keep.append((cur, s2))
        cur = max(cur, e2)
    if cur < b:
        keep.append((cur, b))
    # Fragments under MIN_PIECE flash a different pose for a few frames (a
    # "glitch"): drop them at the clip edges, merge them across the shorter pause
    # inside the clip.
    while len(keep) > 1:
        i = next((i for i, (s, e) in enumerate(keep) if e - s < MIN_PIECE), None)
        if i is None:
            break
        if keep[i][0] == a or keep[i][1] == b:
            keep.pop(i)
            continue
        left = keep[i][0] - keep[i - 1][1] if i > 0 else float("inf")
        right = keep[i + 1][0] - keep[i][1] if i < len(keep) - 1 else float("inf")
        j = i - 1 if left < right else i
        keep[j:j + 2] = [(keep[j][0], keep[j + 1][1])]
    return keep


def audio_end(wav, fallback):
    """Where the clip's sound ends. iPhone takes can stop recording audio ~0.27 s before the picture; a piece
    running past it ends the voice dead mid-room-tone (a click, then digital silence). 0.03 s is the audio
    chain's atrim (declick CHAIN)."""
    if not wav.exists():
        return fallback
    with wave.open(str(wav)) as w:
        return w.getnframes() / w.getframerate() - 0.03


def pack(pieces, fps):
    """(clip, start_s, end_s[, speed]) -> whole-frame pieces laid back to back.
    A sped-up piece takes src_len / speed frames on the timeline."""
    out, dst = [], 0
    for clip, s, e, *rest in pieces:
        speed = rest[0] if rest else 1.0
        src = round(s * fps)
        n_src = round(e * fps) - src
        n = round(n_src / speed)
        if n > 0:
            out.append({"clip": clip, "src": src, "src_len": n_src, "dst": dst, "len": n, "speed": speed})
            dst += n
    return out


def ordered(stems, order, drop=()):
    """Clip stems in timeline order -> the plan's "order" (script order), when given.
    Clips in `drop` (replaced retakes) are left out; every other clip must be listed."""
    keep = [c for c in stems if c not in drop]
    if order is None:
        return keep
    assert sorted(order) == sorted(keep), f"order must list every kept clip once: {sorted(set(keep) ^ set(order))}"
    return list(order)


def overlay_template(tracks, others, mats):
    """(segment, track) of an existing overlay video to copy, or None. Only an
    overlay track's video qualifies: a photo or a main-track clip would carry its
    type and track over to every new overlay."""
    for t in tracks:
        if t["flag"] == 0:
            continue
        for seg in t["segments"]:
            if seg in others and mats.get(seg["material_id"], {}).get("type") == "video":
                return seg, t
    return None


def speed_of(speed, clip):
    """plan.json "speed": a number for the whole video, or {clip: speed} for some clips."""
    if isinstance(speed, (int, float)):
        return float(speed)
    return (speed or {}).get(clip, 1.0)


def silences(path):
    txt = path.read_text()
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", txt)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", txt)]
    return merge_silences(list(zip(starts, ends)))


def merge_silences(pauses, blip=0.06, head=0.35):
    """Pauses split by a blip shorter than `blip` become one; a pause starting in
    the first `head` seconds starts at 0 (silencedetect misses a quiet open)."""
    out = []
    for s, e in sorted(pauses):
        if out and s - out[-1][1] < blip:
            out[-1] = (out[-1][0], e)
        else:
            out.append((s, e))
    if out and out[0][0] < head:
        out[0] = (0.0, out[0][1])
    return out


def uid():
    return str(uuid.uuid4()).upper()


def write_json(path, data):
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    tmp.replace(path)  # atomic: a crash never leaves a half-written file


def locate(pieces, t, end=False):
    """Source second -> new-timeline second. pieces: (src_start, src_end, dst_start
    [, speed]) of ONE clip. A start inside a removed pause snaps to the next piece,
    an end to the previous one, so a range never spills into another clip."""
    first, last = min(pieces, key=lambda p: p[0]), max(pieces, key=lambda p: p[0])
    if end:
        p = max((p for p in pieces if p[0] <= t), key=lambda p: p[0], default=first)
    else:
        p = min((p for p in pieces if p[1] > t), key=lambda p: p[0], default=None) or last
    a, b, dst, speed = (*p, 1.0)[:4]
    return round(dst + min(max(0.0, t - a), b - a) / speed, 6)


def probe(path):
    """(width, height, seconds, has_audio) of a media file."""
    streams = json.loads(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries",
         "stream=codec_type,width,height,duration", "-of", "json", str(path)]))["streams"]
    v = next(s for s in streams if s["codec_type"] == "video")
    return int(v["width"]), int(v["height"]), float(v["duration"]), any(
        s["codec_type"] == "audio" for s in streams)


def tighten(d, transcript, plan=None, job_dir=None):
    fps = d["fps"]
    us = lambda f: round(f * 1e6 / fps)
    mats = {m["id"]: m for m in d["materials"]["videos"]}
    extras = {m["id"]: (cat, m) for cat, lst in d["materials"].items() if isinstance(lst, list)
              for m in lst if isinstance(m, dict) and "id" in m}

    def stem(seg):
        return Path(mats[seg["material_id"]]["path"]).stem if seg["material_id"] in mats else None

    def clone(seg):  # new segment that owns copies of its helper materials
        seg = copy.deepcopy(seg)
        seg["id"] = uid()
        refs = []
        for r in seg["extra_material_refs"]:
            cat, m = extras[r]
            m2 = dict(copy.deepcopy(m), id=uid())
            d["materials"][cat].append(m2)
            refs.append(m2["id"])
        seg["extra_material_refs"] = refs
        return seg

    video = [s for t in d["tracks"] if t["type"] == "video" for s in t["segments"]]
    heads = sorted((s for s in video if (transcript / f"{stem(s)}.silences.txt").exists()),
                   key=lambda s: s["target_timerange"]["start"])
    others = [s for s in video if s not in heads]
    for clip, path in (plan or {}).get("add", {}).items():  # a new take recorded after the draft
        w, h, length, _ = probe(path)
        mat = dict(copy.deepcopy(mats[heads[0]["material_id"]]), id=uid(), path=path,
                   material_name=Path(path).name, duration=round(length * 1e6), width=w, height=h)
        d["materials"]["videos"].append(mat)
        mats[mat["id"]] = mat
        end_us = max(s["target_timerange"]["start"] + s["target_timerange"]["duration"] for s in heads)
        heads.append(dict(copy.deepcopy(heads[0]), id=uid(), material_id=mat["id"],
                          source_timerange={"start": 0, "duration": round(length * 1e6)},
                          target_timerange={"start": end_us, "duration": round(length * 1e6)}))
    order, drop = (plan or {}).get("order"), (plan or {}).get("drop", [])
    if order or drop:  # script order and/or retakes left out
        if order:  # other tracks can't follow a reshuffle, so the plan must replace them
            assert all(t["type"] == "video" for t in d["tracks"]), "reorder needs a draft with video tracks only"
        by_stem = {stem(s): s for s in heads}
        heads = [by_stem[c] for c in ordered([stem(s) for s in heads], order, drop)]

    speeds = (plan or {}).get("speed")  # playback speed, pitch kept
    pieces, spans = [], []  # spans: old timeline (start, end) of each piece, for moving overlays
    for seg in heads:
        a = seg["source_timerange"]["start"] / 1e6
        b = a + seg["source_timerange"]["duration"] / 1e6
        b = min(b, (plan or {}).get("cut_after", {}).get(stem(seg), b))  # e.g. before the tap that stops the recording
        b = min(b, audio_end(transcript / f"{stem(seg)}.wav", b))
        t0 = seg["target_timerange"]["start"] / 1e6
        a0 = max(a, (plan or {}).get("cut_before", {}).get(stem(seg), a))
        for s, e in keep_ranges(a0, b, silences(transcript / f"{stem(seg)}.silences.txt"), min_gap=(plan or {}).get("min_gap", MIN_GAP)):
            pieces.append((seg, s, e, speed_of(speeds, stem(seg))))
            spans.append((t0 + s - a, t0 + e - a))
    for clip, path in (plan or {}).get("insert_after", {}).items():  # a cutaway with its own sound; the voice pauses
        w, h, length, _ = probe(job_dir / path)
        mat = dict(copy.deepcopy(mats[heads[0]["material_id"]]), id=uid(), path=str(job_dir / path),
                   material_name=Path(path).name, duration=round(length * 1e6), width=w, height=h)
        d["materials"]["videos"].append(mat)
        mats[mat["id"]] = mat
        i = max(k for k, p in enumerate(pieces) if stem(p[0]) == clip) + 1
        seg = dict(copy.deepcopy(heads[0]), id=uid(), material_id=mat["id"])
        pieces.insert(i, (seg, 0.0, length, 1.0))
        spans.insert(i, (spans[i - 1][1], spans[i - 1][1]))  # takes no time on the old timeline
    start = (plan or {}).get("start_at")
    if start:  # open on a chosen frame (the thumbnail), e.g. before the first word, mouth closed
        seg, s0, e0, sp = pieces[0]
        assert stem(seg) == start["clip"], f"first clip is {stem(seg)}, not {start['clip']}"
        pieces[0] = (seg, min(s0, start["at"]), e0, sp)
    end = (plan or {}).get("end_at")
    if end:  # run the last shot on to a chosen frame, e.g. until the speaker's eyes are open
        seg, s, e, sp = pieces[-1]
        assert stem(seg) == end["clip"], f"last clip is {stem(seg)}, not {end['clip']}"
        pieces[-1] = (seg, s, max(e, end["at"]), sp)
    packed = pack(pieces, fps)
    by_clip = {}
    for p in packed:
        by_clip.setdefault(stem(p["clip"]), []).append(
            (p["src"] / fps, (p["src"] + p["src_len"]) / fps, p["dst"] / fps, p["speed"]))

    def remap(t):
        for (o0, o1), p in zip(spans, packed):
            if t < o1:
                return p["dst"] / fps + max(0.0, t - o0)
        return (packed[-1]["dst"] + packed[-1]["len"]) / fps

    main = next(t for t in d["tracks"] if t["type"] == "video" and t["flag"] == 0)
    new_main = []
    for p in packed:
        seg = clone(p["clip"])
        dur = us(p["dst"] + p["len"]) - us(p["dst"])  # exact join with the next piece
        seg["source_timerange"] = {"start": us(p["src"]), "duration": round(dur * p["speed"])}
        seg["target_timerange"] = {"start": us(p["dst"]), "duration": dur}
        seg["speed"], seg["is_tone_modify"] = p["speed"], False  # CapCut keeps the pitch
        for m in d["materials"].get("speeds", []):
            if m["id"] in seg["extra_material_refs"]:
                m["speed"] = p["speed"]
        seg["render_index"] = seg["track_render_index"] = 0
        seg["clip"]["transform"]["y"] = (plan or {}).get("face_y", seg["clip"]["transform"]["y"])
        new_main.append(seg)

    drop = {s["id"] for s in heads}
    if plan:  # the plan replaces every existing overlay
        drop = {s["id"] for s in video}
        found = overlay_template([t for t in d["tracks"] if t["type"] == "video"], others, mats)
        if found:
            tmpl_seg, tmpl_track = found
        else:  # no overlay to copy: build one from a talking-head segment
            tmpl_seg = dict(copy.deepcopy(heads[0]), render_index=1, track_render_index=1)
            tmpl_track = {"id": uid(), "type": "video", "segments": [], "flag": 2,
                          "attribute": 0, "name": "", "is_default_name": True}
        tmpl_mat = mats[tmpl_seg["material_id"]]
    for t in d["tracks"]:
        t["segments"] = [s for s in t["segments"] if s["id"] not in drop]
        for s in t["segments"]:
            s["target_timerange"]["start"] = us(round(remap(s["target_timerange"]["start"] / 1e6) * fps))
    main["segments"] = new_main

    for item in (plan or {}).get("overlays", []):
        path = job_dir / item["file"]
        w, h, length, has_audio = probe(path)  # overlays may carry their own sound effects
        start = round(locate(by_clip[item["clip"]], item["from"]) * fps)
        to_clip = item.get("to_clip", item["clip"])  # a visual may run across a clip change
        n = (round(locate(by_clip[to_clip], item["to"], end=True) * fps) - start
             if "to" in item else round(length * fps))
        n = min(n, round(length * fps))
        mat = dict(copy.deepcopy(tmpl_mat), id=uid(), path=str(path), material_name=path.name,
                   duration=us(round(length * fps)), width=w, height=h, has_audio=has_audio)
        d["materials"]["videos"].append(mat)
        seg = clone(tmpl_seg)
        seg.update(material_id=mat["id"], volume=OVERLAY_VOLUME if has_audio else 0.0,
                   source_timerange={"start": 0, "duration": us(n)},
                   target_timerange={"start": us(start), "duration": us(n)},
                   uniform_scale={"on": True, "value": 1.0})
        seg["clip"].update(scale={"x": 1.0, "y": 1.0}, transform={"x": 0.0, "y": item.get("y", 0.0)})
        free = next((t for t in d["tracks"] if t["flag"] == 2 and not any(
            s["target_timerange"]["start"] < us(start + n)
            and us(start) < s["target_timerange"]["start"] + s["target_timerange"]["duration"]
            for s in t["segments"])), None)
        if free is None:
            free = dict(copy.deepcopy(tmpl_track), id=uid(), segments=[])
            d["tracks"].append(free)
        free["segments"].append(seg)
        free["segments"].sort(key=lambda s: s["target_timerange"]["start"])

    d["tracks"] = [t for t in d["tracks"] if t["segments"] or t is main]
    d["duration"] = max(s["target_timerange"]["start"] + s["target_timerange"]["duration"]
                        for t in d["tracks"] for s in t["segments"])
    cuts = plan or {}
    used = [(stem(s), max(s["source_timerange"]["start"] / 1e6, cuts.get("cut_before", {}).get(stem(s), 0)),
             min((s["source_timerange"]["start"] + s["source_timerange"]["duration"]) / 1e6,
                 cuts.get("cut_after", {}).get(stem(s), float("inf")))) for s in heads]

    # Audio: use the cleaned-up capcut/media/<clip>-loud.mov (low-cut + gain +
    # limiter, made with ffmpeg) when it exists, and keep CapCut's Pro-only
    # "Reduce noise" off so export never asks for Pro.
    for m in d["materials"]["videos"]:
        loud = job_dir and job_dir / "capcut/media" / f"{Path(m['path']).stem}-loud.mov"
        if loud and loud.exists():
            m.update(path=str(loud), material_name=loud.name)
    for m in d["materials"].get("realtime_denoises", []):
        m["is_denoise"] = False
    return d, len(packed), by_clip, used


def words(whisper_json):
    """Whisper token JSON -> [(start_s, end_s, word)]; tokens after the first
    without a leading space continue the previous word."""
    out = []
    for seg in json.loads(Path(whisper_json).read_text())["transcription"]:
        for tok in seg["tokens"]:
            text = tok["text"]
            if text.startswith("[") or not text.strip():
                continue
            a, b = tok["offsets"]["from"] / 1000, tok["offsets"]["to"] / 1000
            if text.startswith(" ") or not out:
                out.append([a, b, text.strip()])
            else:
                out[-1][1], out[-1][2] = b, out[-1][2] + text
    return out


def main(job, name, new_name):
    src, dst = ROOT / name, ROOT / new_name
    job_dir = PROJECTS / job
    transcript = job_dir / "transcript"
    if dst.exists():
        sys.exit(f"draft already exists: {dst}")
    if C.running():
        sys.exit("quit CapCut first: it rewrites its draft registry on quit")

    plan_path = job_dir / "plan.json"
    plan = json.loads(plan_path.read_text()) if plan_path.exists() else None
    draft = C.draft_file(src)
    before = C.read(src / draft)["duration"] / 1e6
    d, n, by_clip, used = tighten(C.read(src / draft),
                            transcript, plan, job_dir)

    # Every spoken word in the parts of each clip the draft uses, on the new
    # timeline (for captions). Whisper's word times drift, so a word can look like
    # it sits in a removed pause: keep it and snap it to the nearest kept audio.
    kept = []
    for clip, a0, b0 in used:
        pieces = by_clip[clip]
        for a, b, w in words(transcript / f"{clip}.json"):
            if a0 <= (a + b) / 2 < b0:
                s = locate(pieces, min(a, pieces[-1][1] - 0.01))
                kept.append([s, max(s, locate(pieces, b, end=True)), w])
    write_json(transcript / f"{new_name}.words.json", sorted(kept))

    shutil.copytree(src, dst, symlinks=True)
    # The main timeline keeps its own copy of the draft file; write both.
    proj = json.loads((dst / "Timelines/project.json").read_text())
    for f in (dst / draft, dst / "Timelines" / proj["main_timeline_id"] / draft):
        write_json(f, d)

    now = time.time_ns() // 1000
    draft_id = uid()
    meta = json.loads((dst / "draft_meta_info.json").read_text())
    meta.update(draft_id=draft_id, draft_name=new_name, draft_fold_path=str(dst),
                tm_draft_create=now, tm_draft_modified=now, tm_duration=d["duration"])
    write_json(dst / "draft_meta_info.json", meta)

    reg_path = ROOT / "root_meta_info.json"
    shutil.copy2(reg_path, reg_path.with_name(f"root_meta_info.json.bak-{int(time.time())}"))
    reg = json.loads(reg_path.read_text())
    entry = copy.deepcopy(next(e for e in reg["all_draft_store"] if e["draft_name"] == name))
    entry.update(draft_id=draft_id, draft_name=new_name, draft_fold_path=str(dst),
                 draft_json_file=str(dst / draft),
                 draft_cover=str(dst / "draft_cover.jpg"),
                 tm_draft_create=now, tm_draft_modified=now, tm_duration=d["duration"])
    reg["all_draft_store"].insert(0, entry)
    write_json(reg_path, reg)
    print(f"{new_name}: {n} pieces, {before:.2f}s -> {d['duration'] / 1e6:.2f}s, "
          f"{len(kept)} words -> {transcript / (new_name + '.words.json')}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
