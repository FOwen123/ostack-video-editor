---
name: animated-shots
description: Animate a face-cam short in Remotion, from single shots to whole videos, in 2D, isometric or 3D, plus animated cards and memes. Use when the user asks to animate lines or a whole video, for the animated shots of a news or education video, to pick or change an animation style, or for motion design, cards or memes.
---

# Animated shots

Everything in our videos that is drawn in Remotion: full-frame illustrated or 3D shots that carry VO lines, props over a FACE line, whole animated videos, and the cards and memes in [CARDS.md](CARDS.md). The look is `video-editor/DESIGN.md` (palette, type, Animated shots, Beats, Subtitles); the styles are [STYLES.md](STYLES.md); the judges are [REVIEW.md](REVIEW.md).

## Who owns the timeline

Decide once per video, from what is being delivered; when the script doesn't say, ask and recommend one.

- **A camera edit** (face-cam footage cut in CapCut): **edit-video** owns the timeline. This skill delivers each shot as a file on its words in `plan.json`, and CapCut keeps the cut, the subtitles and the mix.
- **An animated video** (voice-over with no camera edit, or the user asks for the whole video in Remotion): this skill owns the timeline. One Remotion composition plays the voice, every shot, the subtitles and the sound, and renders the finished MP4.

## The team

You are the director: you own the shot list, the kit, the briefs, the judges' verdicts and the final call. Builders are parallel subagents, by default one per style frame (step 2) and one per group of shots (step 3). Each builder owns only its own files; the kit, cues and root stay read-only to them. Two judges, fresh subagents that never saw the plans, review the build (step 4).

## 1. Shot list and timing

Read `script.md` (**write-script**): every VO row with its `On screen` and `Style` cells is a shot; a FACE row gets props when `On screen` asks. List each shot with its words, what the picture shows on each cue word, and its style.

- **Camera edit:** add each shot to `plan.json` as an overlay on its words, `{"file": "capcut/overlays/<id>.mp4", "clip": "<clip>", "from": s, "to": s}` (`.mov` for a shot over the speaker). `anchor.py` writes each shot's length to `frames.json`, and the job's `cues.py` (from `_template/`, with `TOPIC` set to the video's folder) writes every spoken word's frame inside its shot to `src/<topic>/cues.ts`.
- **Animated video:** transcribe the voice (edit-video, step 1), write `captions/subs.json` and run `subs.py` for the subtitle cues, and cut the voice into shots on sentence boundaries. `src/<topic>/cues.ts` gets every word's frame and the subtitle cues as `[film seconds, English, Chinese]`, punctuation stripped with `captions.bare` (`video-editor/scripts/captions.py`).

Done when every animated row of the storyboard has a shot, a style and its cue frames.

## 2. Style frames

Choose fresh for this video. Offer three styles that genuinely differ and each fit its subject (STYLES.md, Choosing), with one line on how the video would feel in each and the one you recommend. Past picks show what the user tends to like; they don't decide this video's style. Unless the user already named the style, one builder per style renders the same beat, the video's hardest, at 1080 × 1920 with the subtitle zone shown. Feedback rounds change the picked frame without losing what was already approved.

Done when the user has picked a style frame.

## 3. Build

You build the shared parts first: one folder per video, `video-editor/projects/0926/remotion/src/<topic>/`, its own Remotion entry: `index.ts` (`registerRoot` on the folder's root), `Root.tsx` registering one composition per shot with its exact length (plus the whole film when this skill owns the timeline), `kit.tsx` (palette, type and the style's parts, from the style's kit in STYLES.md), `cues.ts`. Then write one brief per group of shots (the look, the standing notes below, the cues, the files that builder owns) and start the builders in parallel. Compute everything from the frame number (seeded random only), so a still and the render show the same frame.

The standing notes, from the user's feedback on every animated video so far:

- **Literal.** The picture says the words being spoken, at the moment they're spoken: each object, label or logo appears on the word that names it. With the sound off, a viewer can retell the line (the mute test, REVIEW.md).
- **Big and close.** One subject per beat, filling 60–85% of the frame width; text at least 54px.
- **Readable.** Text, diagrams, charts, rows and sequences face the camera flat and read left to right, in every style.
- **Alive.** Each beat has a main action, things reacting to it, and background life, so the frame is never down to one moving part. The camera moves only for a reason: to follow, to reveal, or to land on something. In 3D the camera keeps moving through the whole shot, drifting or pushing between its moves. Entries ease with anticipation, overshoot and settle.
- **Real things.** Real logos instead of typed names, real data for charts, the real post or page when the line is about one (uncropped, X in its white theme), and recognisable objects.
- **Clear frame.** Each element touches only what it is part of; everything sits inside x 60–1020, y 130–1400, clear of the subtitles.
- **The face** may be covered when the moment calls for it (a hook that hides the face, a reveal, a punchline); otherwise props stay above the hairline (about y 550, read off a frame of the take).
- **Headers name the section** (`DESIGN.md`, Animated shots), not the spoken sentence; labels sit plain on the picture.
- **Sound** follows `DESIGN.md` Beats: each effect lands on the frame its visual appears (step 5).

Done when `pnpm lint` passes and every shot renders end to end.

## 4. Judges

Run the two judges ([REVIEW.md](REVIEW.md)): the mute test, and finish and facts. Check the user's requests yourself (REVIEW.md, Requests). Route each issue to the builder that owns the shot, fix in parallel, re-render, spot-check every fix yourself, and run again only the judge whose lens the fix touched.

Done when every judge passes, or the top open issue needs the user. Report which judges ran, what each found, and which shots you checked by stills only.

## 5. Render and deliver

Render each shot silent (`pnpm exec remotion render src/<topic>/index.ts <Id> <out> --muted`): full-screen shots to MP4, shots over the speaker to transparent ProRes:

```bash
pnpm exec remotion render src/<topic>/index.ts <Id> <out>.mov --muted \
  --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png
```

Without all three transparency flags the background renders black and hides the speaker; `ffprobe` shows `yuva444p10le` when it worked.

- **Camera edit:** the job's `sfx.py` (from `_template/`, its `CUES` filled in) mixes the sound effects into each shot on their cue words and writes the files to the paths in `plan.json`. Rebuild the draft with `tighten.py` (**edit-video**) and scrub to each shot in CapCut (`skills/edit-video/CAPCUT-SAFETY.md`).
- **Animated video:** the film composition plays the voice, the shots, the sound effects (`DESIGN.md`, Sound) and `<Subtitles cues={...} />` from `src/Subtitles.tsx` on top (the `DESIGN.md` Subtitles look, measured against CapCut's). Render it to `projects/<job>/<MMDD>-v<N>.mp4`, then check frame 0 (the thumbnail, **hook** skill), the last second, and the loudness: `ffmpeg -i <film>.mp4 -af ebur128=peak=true -f null -` reads −14 ±0.5 LUFS with true peak under −1 dB.

Each round of changes is a new numbered version, and the shots it changes are new files, so earlier versions still play as they were.

Done when every shot plays on its words: in the CapCut draft, or in the rendered video at −14 ±0.5 LUFS.
