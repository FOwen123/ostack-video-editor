"""Add English + Traditional Chinese captions to a CapCut draft, natively.

    python3 captions.py <cues.json> <draft> [--style-from 0929-v1] [--y -0.06,-0.15]

cues.json: {"end": seconds, "cues": [[start_s, "English", "中文"], ...]}; each
cue holds until the next one starts; an empty cue [t, "", ""] ends the one before it at t. The caption look (font, size, outline)
is copied from a styled caption in --style-from, so no SRT import through
CapCut's file dialog is needed. English and Chinese go on separate tracks,
English above Chinese with a gap (--y moves them: English,Chinese in canvas half-heights, 0 = centre). Punctuation is stripped (see bare). Also writes <cues>.en.srt / .zh-TW.srt /
.bilingual.srt next to cues.json. CapCut must be closed.
"""
import copy
import json
import re
import sys
import uuid
from pathlib import Path

ROOT = Path.home() / "Movies/CapCut/User Data/Projects/com.lveditor.draft"
Y = {"en": -0.54, "zh": -0.70}  # ~77% and ~85% down the frame: chest, clear of app UI


def uid():
    return str(uuid.uuid4()).upper()


def spans(cues, end):
    """[(start_us, dur_us, en, zh)] — each cue lasts until the next begins."""
    starts = [c[0] for c in cues] + [end]
    out = []
    for (s, en, zh), nxt in zip(cues, starts[1:]):
        assert nxt > s, f"cue at {s}s ends before it starts"
        out.append((round(s * 1e6), round((nxt - s) * 1e6), en, zh))
    return out


def bare(text):
    """Captions carry no punctuation (house style). Keeps what belongs to a word
    or number: it's, GPT-6.1, 4,000, 24/7, $500. Chinese punctuation becomes a
    space, since Chinese has no spaces to fall back on."""
    text = re.sub(r"[，。？！：；、「」『』]", " ", text)
    text = re.sub(r"(?<!\d)[,.]|[,.](?!\d)|[?!:;“”\"…]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def caption_end(end, draft_us):
    """The last caption stops where the video does. One frame past it and CapCut
    exports a black frame with only captions, which shows as a blink when the
    Reel loops."""
    return min(end, draft_us / 1e6)


def ts(us):
    ms = us // 1000
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


def srt(rows):
    return "\n".join(f"{i}\n{ts(s)} --> {ts(s + d)}\n{t}\n" for i, (s, d, t) in enumerate(rows, 1))


def write_json(path, data):
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    tmp.replace(path)


def main(cues_path, draft, style_from="0929-v1", y=Y):
    cues_path = Path(cues_path)
    spec = json.loads(cues_path.read_text())

    src = json.loads((ROOT / style_from / "draft_info.json").read_text())
    byid = {m["id"]: (cat, m) for cat, lst in src["materials"].items() if isinstance(lst, list)
            for m in lst if isinstance(m, dict) and "id" in m}
    tmpl_track = next(t for t in src["tracks"] if t["type"] == "text")
    tmpl_seg = tmpl_track["segments"][0]

    folder = ROOT / draft
    d = json.loads((folder / "draft_info.json").read_text())
    # Measure the end from the video itself: a caption that once ran long has
    # already stretched d["duration"].
    video_us = max(s["target_timerange"]["start"] + s["target_timerange"]["duration"]
                   for t in d["tracks"] if t["type"] == "video" for s in t["segments"])
    rows = spans([[t, bare(en), bare(zh)] for t, en, zh in spec["cues"]], caption_end(spec["end"], video_us))
    d["duration"] = video_us
    d["tracks"] = [t for t in d["tracks"] if t["type"] != "text"]  # replace any old captions
    for lang in ("en", "zh"):
        track = dict(copy.deepcopy(tmpl_track), id=uid(), segments=[])
        for start, dur, en, zh in rows:
            text = en if lang == "en" else zh
            if not text:  # an empty cue ends the one before it (a cutaway with no voice)
                continue
            _, m = byid[tmpl_seg["material_id"]]
            m = dict(copy.deepcopy(m), id=uid())
            c = json.loads(m["content"])
            c["text"] = text
            for st in c["styles"]:
                st["range"] = [0, len(text)]
            m["content"] = json.dumps(c, ensure_ascii=False)
            d["materials"]["texts"].append(m)
            seg = dict(copy.deepcopy(tmpl_seg), id=uid(), material_id=m["id"],
                       source_timerange={"start": 0, "duration": dur},
                       target_timerange={"start": start, "duration": dur})
            refs = []
            for r in seg["extra_material_refs"]:
                cat, x = byid[r]
                x = dict(copy.deepcopy(x), id=uid())
                d["materials"].setdefault(cat, []).append(x)
                refs.append(x["id"])
            seg["extra_material_refs"] = refs
            seg["clip"]["transform"].update(x=0.0, y=y[lang])
            track["segments"].append(seg)
        if track["segments"]:  # an English-only video has no Chinese track
            d["tracks"].append(track)

    proj = json.loads((folder / "Timelines/project.json").read_text())
    for f in (folder / "draft_info.json", folder / "Timelines" / proj["main_timeline_id"] / "draft_info.json"):
        write_json(f, d)

    stem = cues_path.name.removesuffix(".cues.json")
    for name, pick in (("en", lambda r: r[2]), ("zh-TW", lambda r: r[3]), ("bilingual", lambda r: f"{r[2]}\n{r[3]}")):
        (cues_path.parent / f"{stem}.{name}.srt").write_text(srt([(s, dur, pick((s, dur, en, zh))) for s, dur, en, zh in rows]))
    print(f"{draft}: {len(rows)} captions x 2 tracks; SRTs in {cues_path.parent}")


if __name__ == "__main__":
    if sys.argv[1:] == ["--test"]:
        assert spans([[0, "a", "甲"], [1.5, "b", "乙"]], 3) == [(0, 1500000, "a", "甲"), (1500000, 1500000, "b", "乙")]
        assert ts(3723456000) == "01:02:03,456"
        assert caption_end(78.37, 78366667) == 78.366667  # never past the video: a caption-only black frame
        assert caption_end(70.0, 78366667) == 70.0
        assert bare("First, dots: 4,000 apps in GPT-6.1. It's 24/7!") == "First dots 4,000 apps in GPT-6.1 It's 24/7"
        assert bare("你現在可以滑 IG、TikTok，") == "你現在可以滑 IG TikTok"
        assert bare('留言「Jev」。 "Done?"') == "留言 Jev Done"
        assert bare("第一，dots：") == "第一 dots"
        print("ok")
    else:
        args = sys.argv[1:]
        style = args[args.index("--style-from") + 1] if "--style-from" in args else "0929-v1"
        y = dict(zip(("en", "zh"), map(float, args[args.index("--y") + 1].split(",")))) if "--y" in args else Y
        main(args[0], args[1], style, y)
