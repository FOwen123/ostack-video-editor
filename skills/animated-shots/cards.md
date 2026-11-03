# Cards and memes

Animated cards, memes and highlighters, made only when the user asks; otherwise points get still pictures (**find-pictures**). They are transparent overlays laid over the speaker in a camera edit, in the card look of `DESIGN.md` (Cards, Memes and pictures, Motion). Zooming the speaker's own clip is camera movement, not an overlay: `DESIGN.md` (Face-cam zoom) and **edit-video**.

The building blocks live in `video-editor/projects/0926/remotion/src/Jev.tsx`: `Scene`, `Panel`, `Tag`, `Line`, `Body`, `Mark`, `Chip`, `Leaf`, `Meme`, `Sfx`. A new video gets its own file (`src/<Topic>.tsx`), registered in `src/Composition.tsx` and `src/scenes.json`.

## 1. Plan the beats

From the transcript, list each overlay with the words it explains: start and end in the clip's source seconds, what it shows, and any sound effect. One idea per card. Show the list to the user, then write it into `plan.json` as `{"file": "capcut/overlays/<name>.mov", "clip": "<clip>", "from": s, "to": s}`.

Done when the user approves the list.

## 2. Build each scene

Frames count from the overlay's own start (30fps). Time each `Mark`, `Chip` and `Sfx` to the frame the word is spoken, read from the transcript's word times.

- **Cards:** `Panel` with `Tag`, `Line`, `Body`, one `Mark`.
- **Memes and pictures:** `Meme`, the picture only, in the headroom above the face.
- **Sound effects:** `Sfx` inside the scene they belong to, so they stay on the beat. Normalize the source file from `video-editor/assets/sound-effects` to about −17 LUFS into `public/<topic>/sfx/<name>.wav` first. Volume 0.6 normally, 0.4 when it lands on a loud word.

Done when `pnpm lint` passes.

## 3. Check, render, place

Render a still at each scene's key frame (after the entrance, on the highlighted word) and check it: text inside the safe margins, face visible, fonts DM Serif and DM Sans (not a fallback), green only on the highlighted word, each element clear of the others. Render each moving scene to a short MP4 over the footage and look at frames across the whole move (`ffmpeg -vf fps=6,tile=6x3`): nothing jumps, and the motion lands on the spoken word.

Then render with the transparency flags of SKILL.md step 5, from the project's default entry (`pnpm exec remotion render <CompId> ../../<job>/capcut/overlays/<name>.mov ...`), and rebuild the draft with `tighten.py`. Mix the voice with every sound effect and confirm the true peak stays under 0 dB.

Done when every overlay shows in CapCut at its moment, and the mix doesn't clip.
