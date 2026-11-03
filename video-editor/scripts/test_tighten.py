from tighten import keep_ranges, locate, merge_silences, ordered, overlay_template, pack, speed_of

# 2s clip, one 1s pause in the middle: keep speech + 0.1s pad each side of the pause.
assert keep_ranges(0, 2, [(0.5, 1.5)], pad=0.1) == [(0, 0.6), (1.4, 2)]
# Pause clipped to the used source range; a pause at the very start is dropped entirely.
assert keep_ranges(10, 12, [(9, 10.5)], pad=0.1) == [(10.4, 12)]
# Pause shorter than 2*pad removes nothing.
assert keep_ranges(0, 2, [(1.0, 1.15)], pad=0.1) == [(0, 2)]

# A sub-0.3s fragment between two pauses flashes like a glitch: merge it into the
# neighbour across the shorter pause (left gap 0.8s, right gap 0.75s -> right).
assert keep_ranges(0, 5, [(1, 2), (2.05, 3)], pad=0.1) == [(0, 1.1), (1.9, 5)]
# A sub-0.3s fragment at the clip edge is breath/noise: drop it.
assert keep_ranges(0, 5, [(0.15, 1)], pad=0.1) == [(0.9, 5)]

# A first/last fragment that does NOT touch the clip edge has one neighbour: merge into it.
assert keep_ranges(0, 5, [(0, 1), (1.05, 2)], pad=0.1) == [(0.9, 5)]

# pack lays pieces back to back on whole frames: no gaps, no overlaps.
pieces = pack([("a", 0, 0.6), ("a", 1.4, 2.0), ("b", 5.0, 5.5)], fps=30)
assert [(p["src"], p["dst"], p["len"]) for p in pieces] == [(0, 0, 18), (42, 18, 18), (150, 36, 15)]
# locate maps a source second to the new timeline: pieces are (src_start, src_end, dst_start).
kept = [(0, 1.1, 0), (1.9, 5, 1.1)]
assert locate(kept, 0.5) == 0.5
assert locate(kept, 1.5) == 1.1  # inside a removed pause -> where the next piece starts
assert locate(kept, 2.9) == 2.1
assert locate(kept, 1.5, end=True) == 1.1  # an end inside a pause -> where the last piece ended
assert locate(kept, 9, end=True) == 4.2  # past the clip -> its last frame, never a later clip
# Before the first kept piece -> its start; after the last -> its end (never a crash).
assert locate(kept, -1, end=True) == 0
assert locate(kept, 99) == 4.2
# plan.json "order" puts the talking-head clips in script order; without it, timeline order.
assert ordered(["a", "b", "c"], None) == ["a", "b", "c"]
assert ordered(["a", "b", "c"], ["a", "c", "b"]) == ["a", "c", "b"]
try:
    ordered(["a", "b", "c"], ["a", "c"])  # a clip left out would silently vanish
    raise SystemExit("ordered accepted an incomplete order")
except AssertionError:
    pass
# Overlays copy their settings from an existing overlay video, never from a photo
# or anything else on the main track (it would make every overlay a "photo").
main = {"flag": 0, "segments": [{"id": "jpg", "material_id": "p"}]}
over = {"flag": 2, "segments": [{"id": "ov", "material_id": "v"}]}
mats = {"p": {"type": "photo"}, "v": {"type": "video"}}
assert overlay_template([main], main["segments"], mats) is None
assert overlay_template([main, over], main["segments"] + over["segments"], mats) == (over["segments"][0], over)
# A pause whose removable part is under min_gap stays: cutting 0.1s makes the head
# jump (a glitch) and saves nothing.
assert keep_ranges(0, 3, [(1.0, 1.35)], pad=0.1, min_gap=0.25) == [(0, 3)]
assert keep_ranges(0, 3, [(1.0, 1.5)], pad=0.1, min_gap=0.25) == [(0, 1.1), (1.4, 3)]
# Speed: a piece of a clip sped up 1.25x takes 4/5 of its source frames on the timeline.
sped = pack([("a", 0, 1.0, 1.25), ("b", 0, 1.0)], fps=30)
assert [(p["src"], p["src_len"], p["dst"], p["len"], p["speed"]) for p in sped] == [(0, 30, 0, 24, 1.25), (0, 30, 24, 30, 1.0)]
# locate on a sped-up piece: (src_start, src_end, dst_start, speed).
assert locate([(0, 2, 10, 2.0)], 1.0) == 10.5
assert locate([(0, 2, 10, 2.0)], 5, end=True) == 11.0
# plan.json "speed": one number speeds up the whole video; a dict picks clips.
assert speed_of(1.15, "IMG_1") == 1.15
assert speed_of({"IMG_1": 1.2}, "IMG_1") == 1.2 and speed_of({"IMG_1": 1.2}, "IMG_2") == 1.0
assert speed_of(None, "IMG_1") == 1.0
# "drop" leaves retakes out on purpose; "order" must then list every other clip.
assert ordered(["a", "b", "c"], ["c", "a"], drop=["b"]) == ["c", "a"]
print("ok")

# A 0.03s blip between two pauses is one pause (1010: 0.31-0.71 + 0.74-1.31), and a
# pause that starts in the first 0.35s runs from the clip start (a quiet open).
assert merge_silences([(0.31, 0.71), (0.74, 1.31), (5.0, 5.6)]) == [(0.0, 1.31), (5.0, 5.6)]
assert merge_silences([(0.5, 0.9)]) == [(0.5, 0.9)]
