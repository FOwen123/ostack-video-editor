from anchor import anchor_cues, frames_for
from mixcheck import near_cuts, spikes
from pictures import CLICK, clip_args, sound_for

# A clip kept as two pieces on the new timeline: source 0-2s at 0s, source 3-5s at 2s.
by_clip = {"IMG_1": [(0.0, 2.0, 0.0), (3.0, 5.0, 2.0)]}

# An overlay's length is where its "to" lands minus where its "from" lands, in frames.
assert frames_for(by_clip, {"clip": "IMG_1", "from": 1.0, "to": 4.0}, fps=30) == 60  # 1s lands at 1s, 4s at 3s
# A clip sped up 1.25x: 2s of source plays in 1.6s.
fast = {"IMG_1": [(0.0, 2.0, 0.0, 1.25)]}
assert frames_for(fast, {"clip": "IMG_1", "from": 0.0, "to": 2.0}, fps=30) == 48

# Subtitle lines tied to clip seconds move onto the timeline, in order.
cues = anchor_cues(by_clip, [["IMG_1", 0.0, "a", "甲"], ["IMG_1", 3.5, "b", "乙"]])
assert cues == [[0.0, "a", "甲"], [2.5, "b", "乙"]]
try:
    anchor_cues(by_clip, [["IMG_1", 3.5, "b", "乙"], ["IMG_1", 0.0, "a", "甲"]])
    raise SystemExit("anchor_cues accepted lines out of order")
except AssertionError:
    pass

# A still becomes a clip of exactly `frames` frames with the click under it.
args = clip_args("p.png", "click.wav", 45, "out.mov")
assert args[args.index("-frames:v") + 1] == "45" and args[args.index("-t") + 1] == "1.5" and args[-1] == "out.mov"

# Click detection: a single-sample spike in a quiet tone is found, and matched to a nearby cut.
import math
sr = 48000
x = [0.05 * math.sin(2 * math.pi * 200 * i / sr) for i in range(sr)]
x[24000] = 0.9
hits = spikes(x, sr)
assert any(abs(t - 0.5) < 0.01 for t in hits), hits
assert near_cuts(hits, [0.5, 0.9]) == 1
# A picture can swap the click for another sound effect from assets/sound-effects.
assert sound_for({}) == CLICK
assert sound_for({"sound": "shocked-sound-effect.mp3"}) == CLICK.with_name("shocked-sound-effect.mp3")
print("ok")
