---
name: edit-video
description: Turn raw face-cam clips in a CapCut project into a tight, loud, subtitled draft with pictures. Use when the user says to edit a new video, clean up or boost the audio, fix the lighting, remove gaps or pauses, speed it up, tighten, or add English/Chinese subtitles.
---

# Edit video

Raw clips in a CapCut draft become a new draft with clean audio, natural light, no dead air, a hook, still pictures on every point, and English + Traditional Chinese subtitles. The look comes from `video-editor/DESIGN.md`. Every CapCut write follows [CAPCUT-SAFETY.md](CAPCUT-SAFETY.md). Scripts are in `video-editor/scripts/` (usage in each docstring).

The user records the clips and adds them, in order, to a new CapCut project named `MMDD` (for example `0930`). A job is a folder `video-editor/projects/<MMDD>/` (copy `_template/`; screenshots and screen recordings go in `broll/`). CapCut drafts stay in CapCut's own folder; the job folder holds only inputs and outputs. Each build is a new draft `<MMDD>-v1`, `-v2`…; the user's own draft is never touched.

## Steps

### 1. Transcribe and find pauses

For each talking-head clip in the draft, into `projects/<job>/transcript/`:

```bash
ffmpeg -i <clip>.MOV -map 0:a:0 -ar 16000 -ac 1 <clip>.wav
whisper-cli -m ~/.cache/whisper/ggml-large-v3-turbo.bin -f <clip>.wav -l en -ojf -of <clip>
ffmpeg -i <clip>.wav -af silencedetect=noise=-35dB:d=0.35 -f null - 2> <clip>.silences.txt
```

iPhone files carry an extra spatial-audio stream ffmpeg can't decode, so always `-map 0:a:0`. Whisper bunches a clip's first words into the opening silence: when a clip opens with a pause, transcribe from 0.15s before the pause ends (`ffmpeg -ss`) and add that offset back to every time (1014). Fix names with the **word list** below.

Done when every clip has `.json` and `.silences.txt`.

### 2. Fact-check

Read every claim in the transcript against the user's source and the company's own page, starting from the fact table in `script.md` when the video has one (**write-script** skill). List each claim the sources don't support, with what the source actually says (0930: "costs 6× more" was the 6× *speed* figure; 1005: the $4/$20 price wasn't on the page; 1006: the Sweden figures weren't in the article). Subtitles follow what was said, except obvious slips the source corrects.

Done when every claim is matched to a source or listed for the user in the final report.

### 3. Plan

Write `projects/<job>/plan.json` (format in `tighten.py`'s docstring):

- `"order"` when takes sit out of script order; `"add"`/`"drop"` for a retake recorded later. Read the transcript for repeated sentences and keep the last clean take.
- `"speed"`: one number for the whole video when the user wants a faster pace (1005 and 1006 used 1.25).
- `"grade"`: the lighting fix. The user wants natural light and a brighter face: `eq=gamma=1.10:contrast=1.02:saturation=0.96:gamma_g=0.995:gamma_b=1.01,curves=master='0/0 0.3/0.33 0.6/0.66 1/1'`. Warming filters tint the ceiling light pink; check a before/after still first. A clip cut out over a dark background gets `"clip_grade": {"<clip>": null}`: it keeps its own lighting (`DESIGN.md`, Face lighting).
- `"start_at"` to open on a calm frame (mouth closed) when frame 0 looks bad.
- `"overlays"`: the hook (**hook** skill), the pictures (**find-pictures** skill) and the animated shots (**animated-shots** skill).
- Split screen (shots on top, face below, as in 1014): 1080×960 overlay files with `"y": 0.5`, `"face_y"` to move the face into the bottom half, and `captions.py --y` to put the subtitles at the seam. `record.mjs` records HTML figures for the top half; speed up long animations with `--speed`.

Write the subtitles' data as `projects/<job>/captions/subs.json` (format in `subs.py`'s docstring: clip order, spelling fixes, word pairs to keep together, and the Chinese meaning units by source second), then run `python3 video-editor/scripts/subs.py <job>`: it splits the English into two or three spoken words per cue, on one line, and writes `captions/<job>.cues-src.json` (`[[clip, source_s, "English", "中文"], ...]`), where each Chinese unit repeats on the two or three English cues it spans (`DESIGN.md`, Subtitles). Identical back-to-back lines show as one still line. No punctuation reaches the screen (`captions.py` strips it and keeps it's, GPT-6.1, 4,000, 24/7, $500), so break lines where a comma would go. Subtitles start on the first words the hook doesn't already say, unless the user says otherwise.

Done when plan.json and the subtitle file are written and every name is spelled right.

### 4. Pictures

Follow the **find-pictures** skill: it runs `anchor.py` (lengths after cuts and speed) and `pictures.py` (stills to clips with the click).

### 5. Build the draft

```bash
# first-pass audio (the mic needs no boost; declick sets the final gain, -1.7 dB on 1022)
ffmpeg -i <clip>.MOV -map 0:v:0 -map 0:a:0 -c:v copy -af "highpass=f=95,highpass=f=95,alimiter=limit=0.77:level=false,atrim=start=0.03,asetpts=PTS-STARTPTS" -ar 48000 -c:a aac -b:a 256k projects/<job>/capcut/media/<clip>-loud.mov
python3 video-editor/scripts/tighten.py <job> <draft> <new-draft>       # cut the gaps, place overlays (clicks at 60%)
python3 video-editor/scripts/anchor.py <job> <draft> <new-draft>        # subtitle times -> captions/<new-draft>.cues.json
python3 video-editor/scripts/zoom.py <job> <new-draft>                  # only with "zooms": face-cam punch-ins and pushes
python3 video-editor/scripts/captions.py projects/<job>/captions/<new-draft>.cues.json <new-draft>
python3 video-editor/scripts/declick.py <job> <new-draft> <gain>        # fades at every cut + lighting grade
python3 video-editor/scripts/bakespeed.py <job> <new-draft>             # only with "speed": CapCut plays at 1x
python3 video-editor/scripts/mixcheck.py <new-draft>                    # loudness, peak, clicks at cuts, dead air
```

What each fixes: tighten keeps 0.1s around each pause, leaves pauses under 0.25s (cutting them only makes the head jump) and merges pieces under 0.3s (they flash). declick fades 20ms at every cut because a hard cut clicks; bakespeed renders the speed-up with ffmpeg because CapCut's live stretching sounds glitchy. Fixed gain only: `loudnorm` lifts the pauses and the room noise.

After tighten, review every sentence boundary in the new timeline: transcript words either side of each cut, plus the leftover pauses over 0.4s. Remove false starts, repeated openings, recording taps (1008-2: a stop-recording tap at 4.84s) and dead air a split pause left behind, using `"drop"`, `"cut_after"` or `"min_gap"` in plan.json. Keep a pause that lands a point.

Optional face-cam zoom (`DESIGN.md`, Face-cam zoom): plan it from the tightened transcript after this review, and list each zoom's word and scale for the user. Write them as `"zooms"` in plan.json, in source seconds of the clip (`{"clip": "IMG_9159", "from": 3.2, "to": 7.9, "scale": 1.12}`, plus `"push": true` for a slow push), then run `zoom.py`: it writes scale keyframes on every piece a zoom overlaps, and a rerun replaces them. Check one zoom in CapCut's preview before reporting.

If mixcheck isn't at −14 ±0.5 LUFS, rebuild as the next `-vN` with the gain adjusted (about 1 dB per 1 LU): declick can't run on a draft whose speed is already baked.

Done when mixcheck reads −14 ±0.5 LUFS, true peak under −1 dB, every listed spike is "sound starts" (none is "cut"), and no dead air.

### 6. Check and report

Render stills of frame 0 (hook inside the profile-grid crop) and a few pictures over the graded footage.

Check the subtitles against the final cut, not the source clips:

- **Timing:** in `captions/<new-draft>.cues.json`, each English cue starts within 0.1s of its first word in the tightened timeline.
- **Missing words:** the English cues read in order match the kept transcript, with nothing dropped by a cut.
- **Reading time:** no cue under 0.3s, and no Chinese line under 0.8s.
- **Muted:** read the subtitles alone, without the audio. Every point and the call to action must still make sense.

Then report: draft name, length, loudness and peak, every picture with its source, the fact-check list, and what was left out and why. Say plainly that you can't listen: the user judges the feel.

## Export

The user exports from CapCut: 9:16, 1080 × 1920, MP4, H.264, at the recording's frame rate (30fps so far), to `projects/<MMDD>/<draft>.mp4`. One master file goes to both Instagram and TikTok.

Then check the exported file itself; the checks above read the draft, not what gets posted:

```bash
ffmpeg -i <draft>.mp4 -map 0:a:0 -ar 16000 -ac 1 /tmp/<draft>-export.wav
whisper-cli -m ~/.cache/whisper/ggml-large-v3-turbo.bin -f /tmp/<draft>-export.wav -l en -ojf -of projects/<job>/transcript/<draft>-export
ffmpeg -i <draft>.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -A13 Summary:
```

- **Every word whole:** compare the export's words with the kept transcript. List each word that is missing or changed within 0.3s of a cut, with its time, for the user to listen to. Speech recognition can guess a clipped word right while a listener hears it broken, so also list the cuts that land inside a phrase rather than in a pause.
- **Loudness:** −14 ±1 LUFS integrated, true peak at or below −1 dB, measured on the MP4 (1021-sw-v5: −13.8 LUFS, −1.0 dB).

Done when both pass, or the list goes to the user.

## Loop ending (optional)

Reels and TikTok replay straight from the end to the start. To make the replay seamless, end on a line that leads back into the first sentence (0930: "Did OpenAI just cook?" → "OpenAI just gave you…"), trim all silence after the last word, and rebuild the hook over that last line so the final frame equals frame 0 (see `DevDayLoop` in `video-editor/projects/0926/remotion/src/DevDay.tsx`). Compare a still of the last frame with frame 0: pixel-identical. `captions.py` clamps subtitles to the video's end, since a subtitle running one frame long adds a black frame that blinks on every replay. The user checks the feel by playing the export on loop in QuickTime (View → Loop).

## Word list

Speech recognition mishears these. Add to it every time a new one appears.

| Heard | Correct |
|---|---|
| cloud | Claude |
| entropic | Anthropic |
| saw | Sol (GPT-6 Sol) |
| (other spellings of the name) | Jev |
| choose (when the noun is meant) | choice |
| engineer, "heals all guard" (in "get tenure") | tenure |
| Archon | Argon (Gemini 4 Argon) |
| cloud code, codecs | Claude Code, Codex |
| CGPT | ChatGPT |
| anti-gravity | Antigravity |
| "so bad" (Google is…) | so back |
| NACO, Neco | Neko (Neko Health) |
| school (blurs your brain signals) | skull |
| Metta | Meta |
| Kostla | Khosla (Khosla Ventures) |
| Excel (the investor) | Accel |
| NovalHealth, Nola, Ola | Nolla (Nolla Health) |
| Luis Venus | Luis Wenus |
| art project (Worldcoin) | orb project |
| "You don't just approve" | Utah just approved |
