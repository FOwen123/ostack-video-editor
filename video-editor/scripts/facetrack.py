"""Face position over time in a video, for zoom.py's head-follow camera, on any system (MediaPipe).
The Python twin of facetrack.swift, which macOS keeps using.

    python3 facetrack.py <video> <samples-per-second> > track.json
    python3 facetrack.py --test

Prints [[seconds, cx, cy, h], ...]: the largest face's centre and height as fractions of the frame,
top-left origin. Samples with no face are left out. Needs `pip install mediapipe` and ffmpeg; the face
model downloads to ~/.cache/mediapipe on first use.
"""
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite"
# MediaPipe's box sits lower on the face than Apple Vision's, which zoom.py was tuned on: shift the centre up by
# CY_TO_VISION face heights and scale the height, measured against facetrack.swift on two clips (1014 IMG_9216, IMG_9225).
CY_TO_VISION = 0.1
H_TO_VISION = 0.975


def model(url):
    path = Path.home() / ".cache/mediapipe" / url.rsplit("/", 1)[1]
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(url, path)
    return str(path)


def frames(video, rate, width=540):
    """(seconds, RGB array) for each sample, upright (ffmpeg applies the rotation tag)."""
    import numpy as np

    probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:stream_side_data=rotation",
                            "-of", "json", video], capture_output=True, text=True, check=True)
    s = json.loads(probe.stdout)["streams"][0]
    w, h = s["width"], s["height"]
    if any(abs(d.get("rotation", 0)) in (90, 270) for d in s.get("side_data_list", [])):
        w, h = h, w
    height = round(h * width / w / 2) * 2
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", video, "-vf", f"fps={rate},scale={width}:{height}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         stdout=subprocess.PIPE)
    i, size = 0, width * height * 3
    while chunk := p.stdout.read(size):
        if len(chunk) < size:
            break
        yield i / rate, np.frombuffer(chunk, np.uint8).reshape(height, width, 3)
        i += 1
    p.wait()


def largest(detections, w, h):
    """[cx, cy, h] of the tallest face box, as fractions of a w x h frame, or None."""
    if not detections:
        return None
    b = max((d.bounding_box for d in detections), key=lambda b: b.height)
    fh = b.height / h
    return [(b.origin_x + b.width / 2) / w, (b.origin_y + b.height / 2) / h - CY_TO_VISION * fh, fh * H_TO_VISION]


def track(video, rate):
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python.vision import FaceDetector, FaceDetectorOptions

    detector = FaceDetector.create_from_options(FaceDetectorOptions(base_options=BaseOptions(model_asset_path=model(MODEL_URL))))
    out = []
    for t, rgb in frames(video, rate):
        face = largest(detector.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)).detections, rgb.shape[1], rgb.shape[0])
        if face:
            out.append([round(t, 3), *face])
    return out


if __name__ == "__main__":
    if sys.argv[1:] == ["--test"]:
        from types import SimpleNamespace as N

        box = lambda x, y, w, h: N(bounding_box=N(origin_x=x, origin_y=y, width=w, height=h))  # noqa: E731
        assert largest([], 540, 960) is None
        assert largest([box(0, 0, 50, 60), box(170, 300, 200, 240)], 540, 960) == [270 / 540, 420 / 960 - CY_TO_VISION * 240 / 960, 240 / 960 * H_TO_VISION]
        print("ok")
    elif len(sys.argv) == 3:
        print(json.dumps(track(sys.argv[1], float(sys.argv[2]))))
    else:
        sys.exit(__doc__)
