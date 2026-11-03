---
name: hook
description: Write and build the opening hook of a face-cam short, so every video opens the same way. Use when making or changing a video's hook, title card, thumbnail frame, or first seconds.
---

# Hook

The opening follows the video's format (`DESIGN.md`, Formats and Hook): a news or education video opens on its first animated shot with the title over it; a personal or opinion video opens on the speaker, with a picture or meme in the headroom and one line of plain text under it. Either way frame 0 is the thumbnail: fully visible, still, plain warm-white serif text, no highlighter, no label, no push-in.

## Steps

### 1. Write it

The user usually gives the hook, or picked one in `script.md` (**write-script** skill). If not, read the first spoken sentence and write one short line that restates it as a question or surprise.

The picture is the subject's official logo or press image, or a meme from `video-editor/assets/meme` that states the feeling. A relation reads as `A → B` with an arrow between two pictures.

Then test it: in the first 3 seconds, is someone convinced they need to watch to the end? Name the promise (what the viewer gets for staying) and the script line that pays it off. A hook the video never pays off fails, however good frame 0 looks; so does one that only says "this is about X". The winners so far opened on a claim with stakes (Korea, the self-replicating AI virus).

Done when the text fits on one or two lines at the `Picture` title size (100px), and the promise and its payoff line are written next to the hook in `script.md`.

### 2. Build it

A format 3 hook is the first animated shot's opening frames with the title over them, built with that shot (**animated-shots** skill). A format 1 hook goes in as the first overlay in `plan.json` with a `picture` key (the `Picture` props in `video-editor/projects/0926/remotion/src/Picture.tsx`): `src` (one picture) or `rows` + `tileSize` (A → B), plus `title` for the text, and `centerY` to keep it inside the grid crop. `pictures.py` renders it like any picture (**find-pictures** skill). Pictures come from official sources, per that skill.

Its length is the first spoken sentence. Subtitles start on the first words the hook doesn't already say.

### 3. Check frame 0

Render a still of frame 0 over the graded footage and draw the feed crop (4:5, y 285–1635; tighter than the profile grid's y 240–1680) on it:

- picture and text fully inside that box,
- centered left to right; overlapping the face is fine,
- readable at thumbnail size.

Done when frame 0 passes all three.
