---
name: find-pictures
description: Find, check and place the still pictures that illustrate a face-cam short (logos, press photos, charts, article screenshots). Use when a video needs pictures, a picture must be swapped, or the user asks for a logo, photo or screenshot of something they say.
---

# Find pictures

Every point the user makes gets one still picture that shows exactly what they're saying, cutting in on those words with a mouse-click sound. No animation and no highlighter unless the user asks.

Tools are in `video-editor/scripts/`: `commons.py` (Wikimedia), `shot.mjs` (article paragraphs), `anchor.py` (lengths), `pictures.py` (stills to clips).

## Steps

### 1. List the points

From the transcript, one line per point: the words it covers (clip and source seconds) and what would show it. A point lasting under about 1.2s on the final timeline flashes; merge it with its neighbour into one picture (two images side by side with `logos`).

Done when every point has a line.

### 2. Find each picture

Look in this order and take the first that fits:

1. **The source the user gave**: its own images, or a screenshot of the exact paragraph quoted (`node shot.mjs <url> "<text>" <out.png>`, add `--dark` for a dark version).
2. **The company's own pages**: product page, press room, media kit, press releases, `og:image`. Logos come from the product's own site or docs (Claude Code's wordmark from its docs, Antigravity's from antigravity.google). Product video stills: Mux thumbnails (`image.mux.com/<id>/thumbnail.png?time=2`).
3. **Wikimedia Commons** for general photos and logos: `python3 commons.py search "<words>"`, then `get`, and note the licence.

Rules the user set:

- Show the actual thing. When the point is that something was published or said (a news headline, an X post, the article or paper quoted), show a real screenshot of it rather than a recreated card or text box (1022). When the point is a thing (a product, a device, a person), show its picture: text standing in for a thing that has a real picture gets swapped (1008). Anything about the subject's own product uses its official pictures; general science points use a research paper's or lab's photo or figure. Tell the user when no real picture exists.
- List the screenshots for the user (what each shows and where it lands) before placing them, and keep to the few that carry a point: 1022 went from many news screenshots down to 3.
- The logo must be the real one for that product. If two products share a logo (Claude Code uses Claude's), show something that tells them apart: the product's own wordmark or an official screenshot. If a logo has no text, add the name as a label.
- Before using a screenshot, read it: crop out errors in the source (TechCrunch's "David Ek" for Daniel Ek) and anything off-topic.
- Skip nude anatomy photos; use a silhouette or the company's own body imagery.
- Pictures and clips can come from a subject's official Instagram or YouTube, or other official source. For a film, that means its poster or a scene from the studio's channel or Movieclips: cut only the seconds needed with `yt-dlp --download-sections`, and warn the user that the platform may mute or block it (1031). Never pull from other creators' reuploads or streaming sites.

Done when every point has a file in `projects/<job>/broll/` and its source (and licence for Wikimedia) is noted.

### 3. Place them

Copy the files to `video-editor/projects/0926/remotion/public/<job-topic>/`. Add each to `plan.json` overlays with a `picture` key holding the `Picture` props (see `src/Picture.tsx`): `src` + `aspect` for one image, `width`/`centerY` to make a wide screenshot bigger and centred, `logos` for two side by side, `rows` + `rightLabel` for A → B, `title` for the hook's text.

Then:

```bash
python3 video-editor/scripts/anchor.py <job> <draft>      # lengths after cuts and speed -> frames.json
python3 video-editor/scripts/pictures.py <job>            # stills -> clips with the click
```

Rerun both whenever the cuts or speed change. To swap one picture, edit its props and run `pictures.py <job> <name>`; the clip keeps its name and length, so the draft needs no rebuild (restart CapCut so it reloads the file).

Done when each clip exists at its frames.json length.

### 4. Check them

Render a still of each picture over the graded footage and look: picture readable at phone size, face and subtitles visible (a dense table may cover the eyes), and the hook fully inside the profile-grid crop (y 240–1680).

Done when every still passes.
