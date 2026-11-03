# ostack-video-editor

Agent skills and tools for making vertical face-cam shorts (1080 × 1920) for Instagram Reels and TikTok: from research and script, through recording, to an edited CapCut draft or a fully animated video, with pictures, animation in 2D, isometric or 3D, sound, and English + Traditional Chinese subtitles. Written for Claude Code and Codex.

## Skills

| Skill | What it does |
| --- | --- |
| [write-script](skills/write-script/SKILL.md) | Research to a script ready to record: fact table, angle, hook options, a peak map, the script in your voice (a general anti-AI layer plus a persona profile that learns from every edit), a checklist pass, and one `script.md` with the storyboard. Three shapes: news, journey (how something works) and personal story. |
| [hook](skills/hook/SKILL.md) | The opening picture and title, built so frame 0 works as the thumbnail and fits Instagram's profile-grid crop. |
| [edit-video](skills/edit-video/SKILL.md) | Raw clips in CapCut to a new draft: transcribe, fact-check, cut the gaps, grade, clean and level the audio, place pictures and animation, subtitles, and the checks. |
| [find-pictures](skills/find-pictures/SKILL.md) | The still picture for each point, from official sources or Wikimedia with licence, placed on the words it shows. |
| [animated-shots](skills/animated-shots/SKILL.md) | Everything animated in Remotion: shots inside a video or a whole animated video, in a style picked fresh per video ([styles](skills/animated-shots/styles.md)), built by parallel builders and checked by two judges, one running a mute test; plus cards and memes when asked. |

How they fit: **write-script** writes the script and the storyboard, then stops. **hook** builds the opening from it. **edit-video** owns the CapCut timeline and calls **find-pictures** for stills and **animated-shots** for animation; a fully animated video's timeline belongs to **animated-shots** instead. All of them follow [`video-editor/DESIGN.md`](video-editor/DESIGN.md), the look: palette, fonts, formats, beats, sound and subtitles. Change it to make the videos yours.

## Make it yours

- `video-editor/DESIGN.md`: palette, fonts, layout, sound and subtitle rules.
- `skills/write-script/voice.md`: who you are and how you talk on camera. Start it from your published videos; after that it learns from every line you change in a script.
- `skills/write-script/opinions.md`: your opinions, so scripts keep them in your words. It fills in as you work.
- `video-editor/assets/sound-effects/` and `video-editor/assets/meme/`: add your own (the README in each lists the names the skills expect).

## What's here

| Path | What |
| --- | --- |
| `AGENTS.md` | Instructions every agent reads first (`CLAUDE.md` points to it) |
| `skills/` | The skills above |
| `video-editor/DESIGN.md` | The look, for any editor or AI |
| `video-editor/scripts/` | Python, Swift and Node tools the skills run (usage in each file's docstring; `python3 <script> --test` for the self-checks, `test_*.py` for the tests) |
| `video-editor/assets/` | Fonts (SIL OFL); folders for your sound effects and memes |
| `video-editor/projects/_template/` | Copy to `projects/<MMDD>/` for each new video; holds `cues.py` and `sfx.py` for animated shots |
| `video-editor/projects/0926/remotion/` | The Remotion project (pnpm): `Picture.tsx` (still pictures and hooks), `Jev.tsx` (card parts), `Subtitles.tsx` (subtitles for a video rendered whole), and the style kits listed in `styles.md` |

Your video jobs (footage, CapCut drafts, renders) stay out of git (`.gitignore`).

## Install

```sh
git clone https://github.com/FOwen123/ostack-video-editor.git
cd ostack-video-editor
(cd video-editor/projects/0926/remotion && pnpm install)
```

Link the skills into your agent's skills folder (Claude Code and Codex both read from there):

```sh
for s in skills/*/; do
  s=$(basename "$s")
  for d in "$HOME/.claude/skills" "$HOME/.codex/skills"; do
    mkdir -p "$d"; test -e "$d/$s" || ln -s "$PWD/skills/$s" "$d/$s"
  done
done
```

Then open your agent in the repository root: the skills' paths (`video-editor/...`) start there, and it reads `AGENTS.md` first.

## Requirements

- macOS (the Swift face tools use Apple's Vision framework), CapCut desktop 9.4
- `ffmpeg`, Python 3, Node and pnpm, Google Chrome (for `record.mjs` and `shot.mjs`)
- `whisper-cli` (whisper.cpp) with the model at `~/.cache/whisper/ggml-large-v3-turbo.bin`

Skills from other authors that these call, installed separately:

- **agent-reach**, optional, for web, X and Instagram research

## License

MIT (`LICENSE`). The fonts in `video-editor/assets/brand/fonts/` are under the SIL Open Font License (the `OFL-*.txt` files).
