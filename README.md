# ostack-video-editor

Agent skills and tools for making vertical face-cam shorts (1080 × 1920) for Instagram Reels and TikTok: from research and script, through recording, to an edited CapCut draft or a fully animated video, with pictures, animation in 2D, isometric or 3D, sound, and English + Traditional Chinese subtitles. Written for Claude Code and Codex.

## Skills

| Skill | What it does |
| --- | --- |
| [write-script](skills/write-script/SKILL.md) | Research to a script ready to record: fact table, angle, hook options, a peak map, the script in your voice (a general anti-AI layer plus a persona profile that learns from every edit), a checklist pass, and one `script.md` with the storyboard. Three shapes: news, journey (how something works) and personal story. |
| [hook](skills/hook/SKILL.md) | The opening picture and title, built so frame 0 works as the thumbnail and fits Instagram's profile-grid crop. |
| [edit-video](skills/edit-video/SKILL.md) | Raw clips in CapCut to a new draft: transcribe, fact-check, cut the gaps, grade, clean and level the audio, place pictures and animation, subtitles, and the checks. |
| [find-pictures](skills/find-pictures/SKILL.md) | The still picture for each point, from official sources or Wikimedia with licence, placed on the words it shows. |
| [animated-shots](skills/animated-shots/SKILL.md) | Everything animated in Remotion: shots inside a video or a whole animated video, in a style picked fresh per video ([styles](skills/animated-shots/STYLES.md)), built by parallel builders and checked by two judges, one running a mute test; plus cards and memes when asked. |

How they fit: **write-script** writes the script and the storyboard, then stops. **hook** builds the opening from it. **edit-video** owns the CapCut timeline and calls **find-pictures** for stills and **animated-shots** for animation; a fully animated video's timeline belongs to **animated-shots** instead. All of them follow [`video-editor/DESIGN.md`](video-editor/DESIGN.md), the look: palette, fonts, formats, beats, sound and subtitles. Change it to make the videos yours.

## Make it yours

- `video-editor/DESIGN.md`: palette, fonts, layout, sound and subtitle rules.
- `skills/write-script/VOICE.md`: who you are and how you talk on camera. Start it from your published videos; after that it learns from every line you change in a script.
- `skills/write-script/OPINIONS.md`: your opinions, so scripts keep them in your words. It fills in as you work.
- `video-editor/assets/sound-effects/` and `video-editor/assets/meme/`: add your own (the README in each lists the names the skills expect).

## What's here

| Path | What |
| --- | --- |
| `AGENTS.md` | Instructions every agent reads first (`CLAUDE.md` points to it) |
| `skills/` | The skills above, one folder each: `SKILL.md`, reference files in capitals, `agents/openai.yaml` for Codex ([index](skills/README.md)) |
| `.claude-plugin/` | The Claude Code plugin and marketplace manifests |
| `scripts/link-skills.sh` | Links the skills into your agent's skills folders |
| `video-editor/DESIGN.md` | The look, for any editor or AI |
| `video-editor/scripts/` | Python, Swift and Node tools the skills run (usage in each file's docstring; `python3 <script> --test` for the self-checks, `test_*.py` for the tests) |
| `video-editor/assets/` | Fonts (SIL OFL); folders for your sound effects and memes |
| `video-editor/projects/_template/` | Copy to `projects/<MMDD>/` for each new video; holds `cues.py` and `sfx.py` for animated shots |
| `video-editor/projects/0926/remotion/` | The Remotion project (pnpm): `Picture.tsx` (still pictures and hooks), `Jev.tsx` (card parts), `Subtitles.tsx` (subtitles for a video rendered whole), and the style kits listed in `STYLES.md` |

Your video jobs (footage, CapCut drafts, renders) stay out of git (`.gitignore`).

## Install

### 1. Clone the workspace

The skills run the tools in this repo (`video-editor/scripts/`, the Remotion project), so every route starts here, and you open your agent in this folder:

```sh
git clone https://github.com/FOwen123/ostack-video-editor.git
cd ostack-video-editor
(cd video-editor/projects/0926/remotion && pnpm install)
```

### 2. Add the skills to your agent

A plugin updates itself; the other routes copy files you update by hand. Pick one route per agent, because two routes give you every skill twice.

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude plugin marketplace add FOwen123/ostack-video-editor
claude plugin install ostack-video-editor@ostack
```

Or, inside Claude Code 2.1.275 or later: `/plugin install ostack-video-editor --marketplace FOwen123/ostack-video-editor`. Update with `claude plugin marketplace update ostack`.

</details>

<details>
<summary><strong>Codex</strong></summary>

```bash
codex plugin marketplace add FOwen123/ostack-video-editor
codex plugin add ostack-video-editor@ostack
```

Updates itself at startup.

</details>

<details>
<summary><strong>GitHub Copilot</strong> (CLI and VS Code; not tested yet)</summary>

```bash
copilot plugin marketplace add FOwen123/ostack-video-editor
copilot plugin install ostack-video-editor@ostack
```

In VS Code, run **Chat: Install Plugin From Source** and enter `https://github.com/FOwen123/ostack-video-editor`.

</details>

<details>
<summary><strong>Gemini CLI</strong> (manual updates; not tested yet)</summary>

```bash
gemini skills install https://github.com/FOwen123/ostack-video-editor.git --path skills
```

Re-run it to update.

</details>

<details>
<summary><strong>Cursor, OpenCode, Windsurf, Amp and other agents</strong> (manual updates)</summary>

```bash
npx skills@latest add FOwen123/ostack-video-editor -a <agent>   # e.g. cursor, opencode, windsurf, amp; omit -a to choose
```

Update with `npx skills@latest update`; re-run `add` to pick up new skills.

</details>

<details>
<summary><strong>Linked from your clone</strong> (Claude Code and Codex; updates with <code>git pull</code>)</summary>

```bash
./scripts/link-skills.sh   # links each skill into ~/.claude/skills and ~/.agents/skills
```

On Windows, in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\link-skills.ps1
```

Handy when you change the skills yourself: edits in the clone take effect straight away.

</details>

Plugin installs pick up a new release only when `version` in `.claude-plugin/plugin.json` changes, so bump it with every change you want users to get.

## Requirements

- macOS or Windows, with CapCut desktop 9.4
- `ffmpeg`, Python 3, Node and pnpm, Google Chrome (for `record.mjs` and `shot.mjs`)
- `whisper-cli` (whisper.cpp) with the model at `~/.cache/whisper/ggml-large-v3-turbo.bin`
- For the head-follow zoom and cutting the speaker out over a background: on macOS, nothing more (the Swift tools use Apple's Vision); elsewhere, `pip install mediapipe` for `facetrack.py` and `keyface.py` (their models download on first use)

**On Windows**

- Run your agent with Git Bash as its shell (Claude Code does by default): the skills' commands are bash. Where they say `python3`, Windows' Python may only answer to `python`; `AGENTS.md` tells the agent to swap it.
- Turn on Python's UTF-8 mode once, so the Chinese subtitles and CapCut's drafts read and write correctly: `setx PYTHONUTF8 1`, then open a new terminal.
- CapCut's drafts are found at `%LOCALAPPDATA%\CapCut\User Data\Projects\com.lveditor.draft`; set `CAPCUT_DRAFTS` if yours are elsewhere, and `CHROME` if Chrome isn't in its usual place.
- Some CapCut versions encrypt their drafts. The scripts check, and stop with a message rather than writing over one they can't read.
- Windows support is new and hasn't been run on a Windows machine yet: please open an issue with anything that breaks.

Skills from other authors that these call, installed separately:

- **agent-reach**, optional, for web, X and Instagram research

## License

MIT (`LICENSE`). The fonts in `video-editor/assets/brand/fonts/` are under the SIL Open Font License (the `OFL-*.txt` files).
