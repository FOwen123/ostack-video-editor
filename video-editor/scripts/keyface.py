"""Cut the speaker out of a face-cam clip and put them over a still background (a "green screen"
without a green screen), on any system (MediaPipe person segmentation). The Python twin of
keyface.swift, which macOS keeps using.

    python3 keyface.py <in.mov> <background.png> <out.mov>
    python3 keyface.py --test

Writes video only (H.264, same size and frame rate); mux the cleaned audio with ffmpeg. Needs
`pip install mediapipe` and ffmpeg; the segmentation model downloads to ~/.cache/mediapipe on first use.
"""
import json
import subprocess
import sys
from fractions import Fraction

from facetrack import model

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite"
SEGMENT_WIDTH = 512  # segment a small copy of each frame; the mask is scaled back up
BLEND = 0.35  # share of the last frame's mask in this one: the edge would otherwise shimmer
ERODE, BLUR = 8, 3  # px: pull the edge in and soften it, so the room's wall doesn't rim the hair and shoulders
EDGE = (0.35, 0.75)  # MediaPipe's mask fades out wider than Apple's: confidence below/above these is background/person


def video_info(path):
    s = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                   "stream=width,height,r_frame_rate:stream_side_data=rotation", "-of", "json", path],
                                  capture_output=True, text=True, check=True).stdout)["streams"][0]
    w, h = s["width"], s["height"]
    if any(abs(d.get("rotation", 0)) in (90, 270) for d in s.get("side_data_list", [])):
        w, h = h, w
    return w, h, s["r_frame_rate"]


def edge(mask, prev):
    """This frame's person mask (0..1, full size), blended with the last one, eroded and softened."""
    import cv2
    import numpy as np

    if prev is not None:
        mask = mask * (1 - BLEND) + prev * BLEND
    lo, hi = EDGE
    hard = np.clip((mask - lo) / (hi - lo), 0, 1)
    soft = cv2.erode(hard, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * ERODE + 1, 2 * ERODE + 1)))
    return mask, np.clip(cv2.GaussianBlur(soft, (0, 0), BLUR), 0, 1)


def main(src, background, out):
    import cv2
    import mediapipe as mp
    import numpy as np
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python.vision import ImageSegmenter, ImageSegmenterOptions, RunningMode

    w, h, rate = video_info(src)
    bg = cv2.cvtColor(cv2.imread(background), cv2.COLOR_BGR2RGB)
    bg = cv2.resize(bg, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32)
    seg = ImageSegmenter.create_from_options(ImageSegmenterOptions(
        base_options=BaseOptions(model_asset_path=model(MODEL_URL)), running_mode=RunningMode.VIDEO, output_confidence_masks=True))
    small = (SEGMENT_WIDTH, round(h * SEGMENT_WIDTH / w))
    reader = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    writer = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", rate, "-i", "-",
                               "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    size, n, prev = w * h * 3, 0, None
    fps = float(Fraction(rate))  # r_frame_rate is a fraction such as "30/1"
    while (chunk := reader.stdout.read(size)) and len(chunk) == size:
        frame = np.frombuffer(chunk, np.uint8).reshape(h, w, 3)
        res = seg.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(cv2.resize(frame, small))),
                                    round(n * 1000 / fps))
        person = 1 - res.confidence_masks[0].numpy_view()  # class 0 is the background
        prev, mask = edge(cv2.resize(person, (w, h), interpolation=cv2.INTER_LINEAR), prev)
        comp = frame * mask[..., None] + bg * (1 - mask[..., None])
        writer.stdin.write(comp.astype(np.uint8).tobytes())
        n += 1
    writer.stdin.close()
    ok = writer.wait() == 0 and reader.wait() == 0
    print(f"{n} frames -> {out} ({'ok' if ok else 'FAILED'})")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    if sys.argv[1:] == ["--test"]:
        import numpy as np

        full = np.ones((60, 60), np.float32)
        a, out = edge(full, None)
        assert a is full and out[30, 30] > 0.99  # a solid person stays solid inside
        blended, _ = edge(np.zeros((60, 60), np.float32), full)
        assert abs(blended[0, 0] - BLEND) < 1e-6  # the last frame carries BLEND of its mask over
        dot = np.zeros((60, 60), np.float32)
        dot[28:32, 28:32] = 1
        assert edge(dot, None)[1].max() < 0.5  # specks smaller than the erosion disappear
        print("ok")
    elif len(sys.argv) == 4:
        main(*sys.argv[1:])
    else:
        sys.exit(__doc__)
