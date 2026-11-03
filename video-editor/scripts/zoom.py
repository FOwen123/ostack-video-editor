"""Face-cam zooms (DESIGN.md, Face-cam zoom) as scale keyframes on a tightened CapCut draft.

    python3 zoom.py <job> <draft>

Reads "zooms" from projects/<job>/plan.json, each anchored to source seconds of a
clip like the overlays, so it follows the words through any recut:
  {"clip": "IMG_9159", "from": 3.2, "to": 7.9, "scale": 1.12}               punch-in
  {"clip": "IMG_9159", "from": 3.2, "to": 5.0, "scale": 1.06, "push": true}  slow push
  {"clip": "IMG_9159", "from": 3.2, "to": 5.0, "scale": 1.1, "ease": 0.35}   glide
A punch-in jumps to `scale` at "from" and holds; a slow push grows from 100% to
`scale` across from..to. Both cut back to 100% at "to" (or at the end of the clip's
pieces). A glide eases in over `ease` seconds from "from" and back out by "to". Every main-track piece the zoom overlaps gets keyframes; a rerun replaces
the old ones. Run after tighten.py, with CapCut closed. Scales about the frame
centre, which keeps a centred face in frame at these sizes.

Head-follow (split screen): "follow": {"scale": 1.15, "y": -0.5} in plan.json scales the
face cam up and moves it every STEP seconds with the face, smoothed over SMOOTH seconds:
sideways it cancels the head's movement around where it sits on average in that clip, and
up and down it holds the face at that y (canvas half-heights; -0.5 = the bottom half's
centre). Zooms multiply the follow scale. Face tracks come from facetrack.swift (macOS) or facetrack.py (any system), one per clip:
  swiftc -O facetrack.swift -o /tmp/facetrack
  /tmp/facetrack capcut/media/IMG_9216-loud.mov 10 > edit-assets/face/IMG_9216.json
  python3 facetrack.py capcut/media/IMG_9216-loud.mov 10 > edit-assets/face/IMG_9216.json
The face cam never shows an edge at the sides or bottom; the top half is always under an overlay.
While an overlay marked "full_face": true is up (a card over the face video), the face cam
cuts back to its full frame around it, holding the face as low as that frame allows. CapCut adds position keyframes to the clip's own
position, so the follow zeroes that and its keyframes carry the whole offset.
"""
import json
import sys
import uuid
from pathlib import Path

import capcut as C

ROOT = C.ROOT
PROJECTS = Path(__file__).resolve().parent.parent / "projects"
SCALE = ("KFTypeScaleX", "KFTypeScaleY")
POS = ("KFTypePositionX", "KFTypePositionY")
STEP, SMOOTH = 0.2, 1.0


def interp(pts, x):
    """Value at x of sorted (x, value) keyframes, held flat past either end (1.0 if none)."""
    if not pts:
        return 1.0
    for (x0, v0), (x1, v1) in zip(pts, pts[1:]):
        if x0 <= x <= x1:
            return v0 + (v1 - v0) * (x - x0) / (x1 - x0)
    return pts[0][1] if x < pts[0][0] else pts[-1][1]


def face_at(track, x):
    """(cx, cy) of the face at source second x, a triangle-weighted mean over SMOOTH seconds."""
    near = [(1 - abs(t - x) / (SMOOTH / 2), cx, cy) for t, cx, cy, _ in track if abs(t - x) < SMOOTH / 2]
    if not near:
        t, cx, cy, _ = min(track, key=lambda p: abs(p[0] - x))
        return cx, cy
    w = sum(n[0] for n in near)
    return sum(n[0] * n[1] for n in near) / w, sum(n[0] * n[2] for n in near) / w


def follow_points(a, b, track, zpts, follow, full=()):
    """[(source_s, scale, x, y)] keyframes that keep the face at its clip-average x and follow["y"] in piece a..b,
    or as near it as a full frame allows inside the `full` (from, to) spans, cutting between the two in one frame."""
    mx = sum(p[1] for p in track) / len(track)
    edges = [e for f, t in full for e in (f - 1 / 30, f, t - 1 / 30, t)]
    xs = sorted({*(x for x, _ in zpts), *(a + i * STEP for i in range(int((b - a) / STEP) + 1)), b,
                 *(e for e in edges if a <= e <= b)})
    out = []
    for x in xs:
        s = follow["scale"] * interp(zpts, x)
        cx, cy = face_at(track, x)
        px = min(max(-s * (cx - mx) * 2, 1 - s), s - 1)
        py = follow["y"] - s * (0.5 - cy) * 2
        low = 1 - s if any(f <= x < t for f, t in full) else -s  # full frame: the top edge must stay out of view too
        py = min(max(py, low), s - 1)
        out.append((x, s, px, py))
    return out


def points(a, b, z, frame):
    """[(source_s, scale)] keyframes for zoom z inside the piece a..b (source seconds)."""
    f, t, s, push = z["from"], z["to"], z["scale"], z.get("push", False)
    if t <= a or f >= b:
        return []
    if "ease" in z:
        e = z["ease"]
        val = lambda x: 1 + (s - 1) * min(1, (x - f) / e, (t - x) / e)
        return [(x, val(x)) for x in sorted({max(a, f), min(b, t), *(x for x in (f + e, t - e) if a < x < b)})]
    val = (lambda x: 1 + (s - 1) * (x - f) / (t - f)) if push else (lambda x: s)
    lo, hi = max(a, f), (t - frame if t < b else b)
    pts = [(f - frame, 1.0)] if not push and f - frame > a else []  # a 1-frame step reads as a cut
    pts += [(lo, val(lo)), (hi, val(hi))]
    if t < b:
        pts.append((t, 1.0))
    return pts


def keyframe(offset_us, value):
    return {"curveType": "Line", "graphID": "", "id": str(uuid.uuid4()).upper(),
            "left_control": {"x": 0.0, "y": 0.0}, "right_control": {"x": 0.0, "y": 0.0},
            "string_value": "", "time_offset": offset_us, "values": [value]}


def apply(d, zooms, follow=None, faces=None, full=None):
    """Write the zooms (and the head-follow, given faces {clip: track}) onto the main track of
    draft d; returns pieces touched per zoom."""
    fps = d.get("fps", 30.0)
    mats = {m["id"]: m for m in d["materials"]["videos"]}
    main = next(t for t in d["tracks"] if t["type"] == "video" and t["flag"] == 0)
    hits = [0] * len(zooms)
    for seg in main["segments"]:
        seg["common_keyframes"] = [k for k in seg.get("common_keyframes", []) if k["property_type"] not in SCALE + POS]
        clip = Path(mats[seg["material_id"]]["path"]).stem.removesuffix("-loud").removesuffix("-key")
        st = seg["source_timerange"]
        a, b = st["start"] / 1e6, (st["start"] + st["duration"]) / 1e6
        pts = []
        for i, z in enumerate(zooms):
            p = points(a, b, z, 1 / fps) if z["clip"] == clip else []
            hits[i] += bool(p)
            pts += p
        pts.sort()
        assert all(x < y for (x, _), (y, _) in zip(pts, pts[1:])), f"zooms overlap in {clip} at {a:.2f}s"
        speed = seg.get("speed", 1.0)
        tracks = {SCALE: pts}
        if follow:
            seg["clip"]["transform"].update(x=0.0, y=0.0)  # else CapCut adds tighten.py's face_y on top
            fp = follow_points(a, b, faces[clip], pts, follow, (full or {}).get(clip, ()))
            tracks = {SCALE: [(x, s) for x, s, _, _ in fp], POS[:1]: [(x, px) for x, _, px, _ in fp],
                      POS[1:]: [(x, py) for x, _, _, py in fp]}
        for props, kps in tracks.items():
            for prop in props if kps else ():
                seg["common_keyframes"].append({"id": str(uuid.uuid4()).upper(), "material_id": "", "property_type": prop,
                                                "keyframe_list": [keyframe(round((x - a) * 1e6 / speed), v) for x, v in kps]})
    return hits


def main(job, draft):
    if C.running():
        sys.exit("quit CapCut first: it rewrites its draft registry on quit")
    plan = json.loads((PROJECTS / job / "plan.json").read_text())
    zooms, follow = plan.get("zooms", []), plan.get("follow")
    full = {}
    for o in plan.get("overlays", []):
        if o.get("full_face"):
            full.setdefault(o["clip"], []).append((o["from"], o["to"]))
    faces = {f.stem: json.loads(f.read_text()) for f in (PROJECTS / job / "edit-assets/face").glob("*.json")} if follow else None
    folder = ROOT / draft
    draft = C.draft_file(folder)
    d = C.read(folder / draft)
    hits = apply(d, zooms, follow, faces, full)
    for z, n in zip(zooms, hits):
        assert n, f"zoom lands in no kept piece (cut out?): {z}"
    proj = json.loads((folder / "Timelines/project.json").read_text())
    for f in (folder / draft, folder / "Timelines" / proj["main_timeline_id"] / draft):
        tmp = f.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
        tmp.replace(f)
    print(f"{draft}: {len(zooms)} zooms on {sum(hits)} pieces" + (", head-follow on" if follow else ""))


def test():
    fr = 0.1
    # Punch-in inside one piece: 100% until a frame before, 112% held, back to 100% at "to".
    assert points(0, 10, {"from": 2, "to": 5, "scale": 1.12}, fr) == [(1.9, 1.0), (2, 1.12), (4.9, 1.12), (5, 1.0)]
    # Spanning a cut: the next piece opens zoomed and holds to its end.
    assert points(4, 6, {"from": 2, "to": 8, "scale": 1.12}, fr) == [(4, 1.12), (6, 1.12)]
    # Slow push: ramps 1.0 -> 1.06 across the line, then cuts back.
    push = points(0, 10, {"from": 2, "to": 4, "scale": 1.06, "push": True}, fr)
    assert [(round(x, 3), round(v, 4)) for x, v in push] == [(2, 1.0), (3.9, 1.057), (4, 1.0)]
    assert points(0, 1, {"from": 2, "to": 4, "scale": 1.12}, fr) == []
    # Glide: eases in to 110% and back out to 100% at "to"; a cut mid-glide splits it across pieces.
    assert points(0, 10, {"from": 2, "to": 4, "scale": 1.1, "ease": 0.5}, fr) == [(2, 1.0), (2.5, 1.1), (3.5, 1.1), (4, 1.0)]
    assert [(x, round(v, 4)) for x, v in points(3.75, 10, {"from": 2, "to": 4, "scale": 1.1, "ease": 0.5}, fr)] == [(3.75, 1.05), (4, 1.0)]
    # On a draft: keyframe offsets are timeline µs from the piece start, sped-up pieces compressed.
    seg = {"material_id": "m", "speed": 2.0, "source_timerange": {"start": 1_000_000, "duration": 9_000_000},
           "clip": {"transform": {"x": 0.0, "y": -0.333}}}
    d = {"fps": 10.0, "materials": {"videos": [{"id": "m", "path": "/x/IMG_1-loud.mov"}]},
         "tracks": [{"type": "video", "flag": 0, "segments": [seg]}]}
    assert apply(d, [{"clip": "IMG_1", "from": 3, "to": 5, "scale": 1.12}]) == [1]
    kf = seg["common_keyframes"]
    assert [k["property_type"] for k in kf] == list(SCALE)
    assert [(k["time_offset"], k["values"][0]) for k in kf[0]["keyframe_list"]] == \
        [(950000, 1.0), (1000000, 1.12), (1950000, 1.12), (2000000, 1.0)]
    apply(d, [])  # a rerun with no zooms clears them
    assert seg["common_keyframes"] == []
    # Head-follow: a still face stays put; a head far right of its average is followed only until the edge would show.
    f = {"scale": 1.2, "y": -0.5}
    assert [(round(s, 3), round(px, 3), round(py, 3)) for _, s, px, py in follow_points(0, 0.2, [[0, 0.3, 0.5, 0.3]], [], f)] == [(1.2, 0.0, -0.5)] * 2
    track = [[0, 0.5, 0.5, 0.3], [9, 0.46, 0.5, 0.3], [10, 0.1, 0.5, 0.3]]
    assert round(follow_points(9, 9, track, [], f)[0][2], 3) == -0.2
    assert round(follow_points(0, 0, track, [], f)[0][2], 3) == -0.2  # clamped at the edge
    # Under a middle card the face cam cuts to full frame for the card's span, then back.
    fp = follow_points(0, 3, [[0, 0.5, 0.5, 0.3]], [], f, [(1, 2)])
    assert [round(py, 3) for x, _, _, py in fp if x in (0.8, 1, 1.8, 2)] == [-0.5, -0.2, -0.2, -0.5]
    # Zooms multiply the follow scale.
    assert round(follow_points(3, 3, [[3, 0.5, 0.5, 0.3]], [(2, 1.1), (4, 1.1)], f)[0][1], 3) == 1.32
    apply(d, [], f, {"IMG_1": [[0, 0.5, 0.6, 0.3], [9, 0.5, 0.6, 0.3]]})
    assert sorted(k["property_type"] for k in seg["common_keyframes"]) == sorted(SCALE + POS)
    assert seg["clip"]["transform"] == {"x": 0.0, "y": 0.0}
    print("ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["--test"]:
        test()
    else:
        main(*sys.argv[1:3])
