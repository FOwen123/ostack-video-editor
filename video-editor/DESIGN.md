# Design: face-cam shorts

The look of the vertical videos (1080 × 1920, Instagram Reels and TikTok). This file describes what the video looks like and is written for any editor or AI, whatever the tool. How we build it with CapCut and Remotion lives in the skills under `skills/`.

The script's shape picks the format (Formats, below): news and education videos open on and mostly carry full-screen animation; personal and opinion videos keep the speaker as the subject, opening on the face with few graphics. Still pictures (official logos, press images, charts, screenshots) cut in on the words they show, each with a soft mouse-click sound, plus plain-text subtitles. Animated cards and highlighters appear only when asked for; their style is below. Every visual lands on the word it shows, never before it.

## Palette

| Token | Hex | Role |
|---|---|---|
| Black | `#000000` | Card fill, top fade behind the hook |
| Paper | `#FEFCF9` | All primary text, card outlines, subtitles |
| Muted | `#C4BCB0` | Secondary text, body copy on cards |
| Highlight | `#8ECC9F` | Only as a highlighter block behind a key word, and the fill of a "chosen" chip. Text on it is Black |
| Line | Paper at 16% | Dividers inside cards |
| Alert | `#E5484D` | Only for a breached, stolen or lost state in a story video: a map pin, a record card's outline, a loss counter |
| Accent | one per video | Animated shots only: the glow of the thing the story follows (a robot's light, an infected device). Picked in the style frame; amber `#FFB547` on Korea and the self-replicating AI video |

Green never becomes a card, a background, a veil, or a text color. One highlighted word or chip per frame.

Alert red follows the same limits: never a fill, background or subtitle highlight, one alert element per frame, and never in the same frame as a green highlight.

For a news video about another company's product, ask whether to use that product's palette for its cards (as with the OpenAI DevDay video) or this one. The hook, subtitles and layout stay the same either way.

## Type

All fonts are free (SIL OFL).

| Use | Font |
|---|---|
| Headlines, hook, big numbers | DM Serif Display, regular. The highlighted word in italic |
| Body, labels, chips, UI | DM Sans. Small labels in uppercase, tracked about 3.5px at 22px |
| Chinese | Noto Sans TC |
| Subtitles | DM Sans Bold (English), Noto Sans TC Bold (Chinese) |

Use static Bold font files for subtitles. Variable fonts render too thin in some editors, CapCut included.

DM Serif Display is wide: two-line hooks fit at about 84 to 124px, a single word up to about 300px.

A small leaf-shaped dot (Highlight green, two opposite corners rounded) marks labels.

## Formats

Each line of the script is FACE (the speaker on camera) or VO (voice-over under pictures or animation). A video uses one of these formats, or mixes the last two. The shape sets the default (`write-script` shapes.md) and the user can override it per video:

1. **Face cam with pictures**: the speaker fills the frame; pictures cut into the headroom. Personal and opinion videos.
2. **Split screen**: shots in the top half (1080 × 960), the speaker in the bottom half, subtitles on the seam between them (the Anatomy video).
3. **Full-screen animation**: VO lines play over full-frame animated shots; FACE lines show the speaker cut out over a still background image from the same world (the Korea and self-replicating AI videos). News and education videos.

### Face lighting

When the speaker is in their own room (formats 1 and 2), the grade gives natural light and a brighter face. When they sit over a dark background (format 3's FACE lines), the footage keeps its own lighting, with no grade.

## Layout

The frame, top to bottom, in format 1:

| Zone | Where | What goes there |
|---|---|---|
| Headroom | Top ~700px, above the face | Hook, memes, pictures |
| Face and body | Middle | The speaker. Graphics cover the face only when the moment calls for it: a hook that hides the face, a reveal, a punchline, a full-width card during an explanation |
| Cards | Centered, 920px wide | Explanation cards, over the chest or upper frame |
| Subtitles | English at ~77% down, Chinese at ~85% | Clear of the app's bottom UI |

Keep text 80px from the left and right edges.
Keep everything inside y 285–1635: the Instagram feed shows a Reel cropped to 4:5 until it's tapped, so anything above or below that is cut (1031). Headroom pictures go at y 300–660, over the hair; full-screen shots stay between y 300 and the English subtitle (~1450).

### Hook

- Fully visible on the very first frame, because that frame is the thumbnail.
- Inside the 3:4 grid area: Instagram's profile grid shows only y 240–1680 of the 1920 frame, so the whole hook sits between about y 260 and 1000. Overlapping the face is fine; a cut-off headline is not. A full-screen animated hook (no face) instead centres its title and picture as one group on y 960, the middle of the grid tile, kept above the subtitles (y 1390).
- Centered left to right in the headroom above the face, over a black fade from the top (85% → 60% at 380px → clear at 700px).
- Structure: the subject's official picture (or two pictures with an arrow, A → B, or a meme from `assets/meme` that states the feeling: the RIP grave for "Software is dead???", i-wake-up for Black October), then one line of plain warm-white serif text under it, e.g. "Google is back???". Question marks are optional ("Self-replicating AI virus"). No highlighter, no label.
- A format 3 video opens on its first animated shot, with the title over that shot's first frame in the same position and fade. A format 1 video opens on the face.
- Still: no push-in, no animation on frame 0.

### Memes and pictures

The picture only, uncropped, with 20px rounded corners, sized to fit a 940 × 520 box in the headroom (wide screenshots up to 1000px). It hard-cuts in with a mouse-click sound and stays still. It never fills the screen. Websites are captured in desktop view.

## Cards

- Black fill, 28px corner radius, soft drop shadow.
- Headline in Paper serif, body in Muted sans, one highlighted word.
- Chips are outlined in Paper; the chosen one fills with Highlight.

## Animated shots

Full-frame illustrated or 3D shots that carry VO lines (format 3), or the top half in format 2. The subtitles still say the words, so the shot shows the idea, not the sentence:

- **Style**: chosen fresh for each video from its subject (2D, isometric, 3D or another), one lead style per video; a shot may borrow another when its line needs it, in the same palette and type. Diagrams, charts and text always face the camera flat (`animated-shots` skill, styles.md).
- **Header** (default on every section): one or two words in DM Serif Display capitals that name which part of the video this is ("SEP 17", "D-DAY", "AI WORM", "SELF-LEARNING"). It labels the section and adds what the subtitles don't say; a header that repeats the spoken line is useless, so pick the section's name instead. A logo may slide in beside it on the word that names it.
- **Labels**: only the ones the viewer needs to follow the picture. Pills, source lines, dates, company tags and step chips stay off the shot.
- **Arrows**: a plain arrow points at the thing; the words come from the voice.
- **Timing**: a label, logo or object appears on the word that names it (the Llama label waits for "Llama").
- **One shot per line**: each animation plays only on the line it explains.
- **Variety**: change the scene or the camera angle on each new problem or section, so no stretch holds one view.
- **Correct**: every diagram is true to the idea it teaches. A chart rises and falls as its data does, an arrow points at the thing it names, a worked example is one a real user would type ("How do I make pasta?", not "2+2"), and a technical step shows what actually happens (1019's dot product, 1020's GPT chart).
- **Frame**: everything sits inside 1080 × 1920, clear of the subtitle zone, and no element overlaps another.

## Motion (only when asked): settle, don't pop

- **Enter:** rise 28px and un-blur from 10px to 0 over about 14 frames (30fps), no overshoot.
- **Highlighter:** sweeps left to right across its word over 10 frames, landing on the spoken word. The word turns Black and italic.
- **Chips and pictures:** the only things with a small snap.
- **Exit:** the last 8 frames drift up 12px and fade.
- **Subtitles:** hard cuts, no animation.

## Face-cam zoom (optional)

Camera movement on the speaker's clip, separate from overlays. Use it at a turn in the explanation (a new point, the punchline), not on every sentence:

- **Punch-in:** a hard cut from 100% to about 112%, centered on the face, held until the next turn, then back to 100%.
- **Slow push:** 100% to about 106% across one line, for a build-up.
- Never on the hook frame. The face stays fully in frame, and the eyes stay above the subtitles.

## Sound

- Voice at −14 LUFS integrated, true peak under 0 dB. No noise reduction or EQ: the mic recording is clean as it is.
- Sound effects sit just under the voice (about −17 LUFS). Turn one down further when it lands on a loud word. Optionally, when the user wants them to carry after Instagram's re-encode, set each effect's loudest moment 1 to 3 dB under the voice instead, with the mix's true peak still under −1 dB.
- Each effect is tied to the visual it belongs to, and sounds on the frame that visual appears.

### Music (only when the user asks)

The user usually adds music in Instagram's editor when posting, so the edit has none. When they ask for music in the edit:

- Instrumental only, picked by mood: darker and confident for claims and news, calmer for explainers.
- The bed sits 9 to 14 dB under the voice (start at about 11) and dips further while the speaker talks.
- Never fade or cover the last spoken word.

### Beats

Every line of the storyboard has a beat. Each beat gets the same screen and sound in every video:

| Beat | Screen | Sound |
|---|---|---|
| Hook | Frame 0, still: picture or animated shot, plus the title | None |
| Peak: number | The number big in DM Serif, or a picture cuts in | Click |
| Peak: contrast | A vs B: two pictures, or a split | Click |
| Peak: new problem | A new scene or camera angle | Whoosh |
| Biggest reveal (once per video) | A hard cut on the word | Riser into it, impact on it |
| Release | The current shot continues: a slow push or camera move | None |
| Doubt beat | FACE, punch-in | None |
| Section turn | The new section's header (1–2 words, see Animated shots) in animated videos; a picture cut otherwise | Whoosh |
| Ending | A callback to frame 0 | None |
| Meme or punchline (optional) | The meme | Shocked |

At most two impacts and one riser per video. A cut between takes from different sessions can carry a whoosh to smooth the change. Sounds come from `assets/sound-effects` (click: `mouse-click-sound`, whoosh: `whoosh-clean`, impact: `vine-boom-sound-effect_KT89XIq`, shocked: `shocked-sound-effect`); there is no riser yet, so ask the user for one.

## Subtitles

- English on top, Traditional Chinese below, on separate tracks, both Paper.
- English: two or three spoken words per cue, on one line, so the line switches fast (the retention test started with 1008 Sabi). Three words only when two would leave a single word alone. A name or number that belongs together stays in one cue ("GPT-6.1 Sol", "$4 million"). Each cue holds until the next starts.
- Numbers show as digits ("7 banks", "4 GB"), and numbered points as "1", "2", "3", never "1st".
- Chinese: one meaning unit per line, spanning two or three English cues (about 1.2 to 2 seconds, up to about 12 characters). It starts and ends on English cue boundaries. Never split a Chinese word or reorder words across lines to mirror English word order. Chinese grammar runs in a different order, so word-by-word lines read wrong ("能把 / 你的想法 / 轉成文字").
- Emphasis (optional): one key word per sentence may go bigger or bolder in the same font. No second font, and no animation.
- Fix name spellings by hand. Speech recognition gets product names wrong.
