# Content

Vertical face-cam shorts (1080 × 1920) for Instagram Reels and TikTok, edited in CapCut with Remotion overlays and bilingual English + Traditional Chinese subtitles.

Three pillars, each with its script shape (`write-script` SHAPES.md):

- **AI info**: AI news, AI in general, AI startups the user finds interesting. News shape.
- **Education**: how AI and technology work. Journey shape.
- **Personal opinion**: the user's own views and topics, such as productivity and the apps they build. Personal shape.

## Where things live

- `video-editor/DESIGN.md`: the look (palette, fonts, formats, layout zones, hook, cards, animated shots, motion, sound and beats, subtitles). Read it before building any visual, sound or subtitle.
- `video-editor/scripts/`: `tighten.py` (remove gaps, place overlays from `plan.json`), `anchor.py` (picture lengths and subtitle times after the cut), `pictures.py` (stills to clips with the click), `subs.py` (transcript to 2-3 word English cues with Chinese units, from `captions/subs.json`), `captions.py` (native subtitle tracks), `declick.py` (fades at every cut, lighting grade), `bakespeed.py` (renders the speed-up so CapCut plays at 1x), `zoom.py` (face-cam punch-ins, pushes and head-follow as keyframes), `facetrack.swift` (face positions for the head-follow), `keyface.swift` (the speaker cut out over a background image), `mixcheck.py` (loudness and clicks), `record.mjs` (an HTML figure or page to a 30fps MP4 on a frame-stepped clock), `shot.mjs` (article paragraph screenshots), `commons.py` (Wikimedia pictures with licence). Usage is in each file's docstring; tests in `test_*.py` and each script's `--test`.
- `video-editor/projects/<MMDD>/`: one job per video (copy `_template/`). Inputs and outputs only.
- `video-editor/projects/0926/remotion/`: the Remotion project for every video's overlays (pnpm). `src/Picture.tsx` renders the still pictures and hooks; `src/Jev.tsx` and `src/DevDay.tsx` hold the animated card primitives (used only when asked); `src/<topic>/` holds each video's animated shots; `src/Subtitles.tsx` draws the subtitles of a video rendered whole in Remotion.
- `video-editor/assets/`: brand fonts, memes, sound effects, music.

## Skills

In `skills/`:

- **write-script**: research to a recordable script and storyboard in `projects/<job>/script.md` (news, journey or personal shape).
- **edit-video**: new video end to end: transcribe, fact-check, plan, build, check.
- **find-pictures**: the still pictures for each point (sources, logos, screenshots, placing).
- **hook**: the opening picture and title, the thumbnail frame.
- **animated-shots**: everything animated in Remotion: shots inside a video (the default in news and education videos), whole animated videos, and cards and memes (when the user asks). Styles in its `STYLES.md`.
- **agent-reach** (optional, installed separately: see README): research for a video, in every skill above that reads the web.

## Rules

- CapCut drafts stay in CapCut's own folder. Quit CapCut before any script writes a draft (see `edit-video/CAPCUT-SAFETY.md`).
- Leave CapCut's Pro and upgrade buttons for the user to click.
- Use official press assets or the user's own files for pictures, clips and sound effects. Ask before pulling anything from another creator.

## Post captions

The text posted with the video (not the on-screen subtitles):

- Write every hashtag in lowercase: `#openai #chatgpt #aiagents`, even for brand names and acronyms.
