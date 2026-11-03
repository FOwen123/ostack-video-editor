"""Write a job's subtitle cues: English in 2-3 word cues, Chinese in its own meaning units.

    python3 subs.py <job>          # projects/<job>/captions/subs.json -> captions/<job>.cues-src.json
    python3 subs.py --test

English cues come from the transcript words (fixed spellings, numbers as digits), split at
punctuation into 2-word groups (3 when a phrase would leave one word alone, and never ending a
line on a small word). Each Chinese unit starts at a source second; every English cue shows the
latest unit that started at or before it, so Chinese changes about every 2-3 English cues
(DESIGN.md, Subtitles). anchor.py then moves the cues onto the cut.

captions/subs.json holds the video's own data:

    {"order": ["IMG_9271", ...],                  clips in script order
     "fix": {"Antropic": "Anthropic", ...},       mishearings (edit-video word list) and names
     "glue": [["GLM", "5.2"], ...],               word pairs that stay in one cue
     "zh": {"IMG_9271": [[2.81, "中文"], ...]},    Chinese units by source second
     "start": {"IMG_9159": {"0": 1.74}},          optional: word index -> real start, when whisper
                                                  bunched a clip's first words at 0 s
     "skip_before": {"IMG_9158": 6.7},            optional: no subtitles before (the hook says it)
     "drop": [["IMG_9277", 4.92]],                optional: words to leave out (clip, whisper start)
     "break": [["IMG_9162", 3.36]],               optional: a line ends after this word
     "notes": ["why a fix is there", ...]}        optional: free text
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import tighten as T

PROJECTS = HERE.parent / "projects"
WEAK = {"a", "an", "the", "and", "to", "of", "for", "with", "that", "about", "its", "their", "from", "in", "on",
        "is", "was", "will", "it", "if", "we", "but", "into", "through", "has", "are"}


def load(job):
    c = json.loads((PROJECTS / job / "captions" / "subs.json").read_text())
    c["start"] = {clip: {int(i): s for i, s in m.items()} for clip, m in c.get("start", {}).items()}
    for k in ("drop", "break", "glue"):
        c[k] = {tuple(x) for x in c.get(k, [])}
    return c


def tokens(job, c, clip):
    """[(source_s, word, ends_phrase)] with fixes and the clip-start times applied. A word
    whisper stamps inside a pause starts when the pause ends (its times run early)."""
    tdir = PROJECTS / job / "transcript"
    pauses = [(s, e) for s, e in T.silences(tdir / f"{clip}.silences.txt") if e - s >= 0.3]
    out = []
    for i, (a, _, w) in enumerate(T.words(tdir / f"{clip}.json")):
        a0 = a
        a = c["start"].get(clip, {}).get(i, a)
        a = next((e for s, e in pauses if s + 0.05 < a < e), a)
        if out and a <= out[-1][0]:
            a = out[-1][0] + 0.05
        if a < c.get("skip_before", {}).get(clip, 0) or (clip, round(a0, 2)) in c["drop"]:
            continue
        end = bool(re.search(r"[,.?!]$", w)) or (clip, round(a0, 2)) in c["break"]
        bare = w.rstrip(",.?!")
        for k, v in c["fix"].items():
            if bare == k or bare.startswith(k + "."):  # "cloud.md" keeps its ".md"
                bare = v + bare[len(k):]
        out.append((a, bare, end))
    return out


def groups(toks, glue):
    """Cues as token lists: 2 words, 3 when a phrase would leave one word alone; glued names stay together."""
    phrases, cur = [], []
    for t in toks:
        if cur and (cur[-1][1].split()[-1], t[1].split()[0]) in glue:
            cur[-1] = (cur[-1][0], cur[-1][1] + " " + t[1], t[2])
        else:
            cur.append(t)
        if t[2]:
            phrases.append(cur)
            cur = []
    if cur:
        phrases.append(cur)
    out = []
    for p in phrases:
        i = 0
        for n in split(p):
            out.append(p[i:i + n])
            i += n
    return out


def words(toks):
    return sum(len(t[1].split()) for t in toks)


def split(p):
    """Group sizes for one phrase: lines of 2-3 words (a glued name counts its words), never
    more than 3 unless a single name is longer; avoids one-word lines and lines that end on a
    small word."""
    best = {0: (0, [])}
    for i in range(1, len(p) + 1):
        opts = []
        for n in (2, 3, 1):
            if i - n < 0 or i - n not in best:
                continue
            g = p[i - n:i]
            if n > 1 and words(g) > 3:
                continue
            weak = i < len(p) and g[-1][1].split()[-1].lower() in WEAK
            lone = words(g) == 1 and len(p) > 1
            cost = best[i - n][0] + (0.3 if words(g) == 3 else 0) + weak + 2 * lone
            opts.append((cost, best[i - n][1] + [n]))
        if opts:
            best[i] = min(opts)
    return best[len(p)][1]


def rebalance(toks):
    """A cue too short to read plus the next one: one line if they hold 3 words or fewer, else
    two lines of at most 3 words where the first lasts 0.3 s (or as long as it can), preferring
    no one-word line and no line ending on a small word."""
    n = len(toks)
    if words(toks) <= 3:
        return [toks]
    ks = [k for k in range(1, n) if words(toks[:k]) <= 3 and words(toks[k:]) <= 3] or list(range(1, n))

    def cost(k):
        dur = toks[k][0] - toks[0][0]
        return ((dur < 0.3) * (10 - dur) + 2 * (1 in (words(toks[:k]), words(toks[k:])))
                + (toks[k - 1][1].split()[-1].lower() in WEAK) + abs(k - n / 2) / 10)
    k = min(ks, key=cost)
    return [toks[:k], toks[k:]]


def cues(job, c):
    out, last = [], []  # last: the tokens of out[-1]
    for clip in c["order"]:
        zh = c["zh"][clip]
        for g in groups(tokens(job, c, clip), c["glue"]):
            parts = [g]
            if out and out[-1][0] == clip and g[0][0] - out[-1][1] < 0.3:  # out[-1] would flash
                out.pop()
                parts = rebalance(last + g)
            for p in parts:
                t = p[0][0]
                unit = max((u for u in zh if u[0] <= t + 0.05), key=lambda u: u[0], default=zh[0])[1]
                out.append([clip, round(t, 3), " ".join(x[1] for x in p), unit])
            last = parts[-1]
    return out


def test():
    text = lambda gs: [(g[0][0], " ".join(t[1] for t in g)) for g in gs]
    assert text(groups([(0, "a", False), (1, "b", False), (2, "c", True), (3, "d", True)], set())) == [(0, "a b c"), (3, "d")]
    assert text(groups([(0, "Shinhan", False), (1, "Bank", True)], {("Shinhan", "Bank")})) == [(0, "Shinhan Bank")]
    # "and some" lasts 0.2 s: with "people are saying" it becomes 3 + 2, never one 5-word line
    w = [(0, "and", 0), (0.1, "some", 0), (0.2, "people", 0), (0.5, "are", 0), (0.7, "saying", 1)]
    assert [len(p) for p in rebalance(w)] == [3, 2]
    assert [len(p) for p in rebalance(w[:3])] == [3]
    # a glued name counts its words: "smart ovens and cheap" is 4 words, so it splits
    p = [(0, "smart ovens", 0), (0.4, "and", 0), (0.6, "cheap", 0), (0.9, "Android", 0), (1.2, "TV boxes", 1)]
    i = 0
    for n in split(p):
        assert words(p[i:i + n]) <= 3
        i += n
    # a line never ends on a small word when a 3-word group avoids it ("it runs / on a box")
    assert split([(0, "it", 0), (1, "runs", 0), (2, "on", 0), (3, "a", 0), (4, "box", 1)]) == [2, 3]
    print("ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["--test"]:
        test()
        sys.exit()
    job = sys.argv[1]
    out = cues(job, load(job))
    (PROJECTS / job / "captions" / f"{job}.cues-src.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(len(out), "cues")
    for c in out:
        print(f"{c[0]} {c[1]:6.2f}  {c[2]:28} {c[3]}")
