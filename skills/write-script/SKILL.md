---
name: write-script
description: Write or rework the spoken script of a short, from research to a storyboard ready to record. Use when the user shares a source to turn into a script, asks to enhance, shorten or restructure a script, wants hook options, or wants a script in their voice; also for telling their own experience, and whenever the user edits a script you wrote, so their voice profile learns from it.
---

# Write script

A source (article, paper, launch page, a story from the user's life) becomes one file, `video-editor/projects/<job>/script.md`, that the user records from and that every later step reads: the teleprompter, the **hook** skill and the **edit-video** plan. Write in the user's voice ([VOICE.md](VOICE.md)).

Companion files:

- [SHAPES.md](SHAPES.md): the three shapes a script can take (news, journey, personal) and each one's spine, peaks, length and ending.
- [CHECKLIST.md](CHECKLIST.md): the checks every script passes before the user sees it.
- The voice, in two layers: [UNSLOP.md](UNSLOP.md), what makes any script sound machine-written, and [VOICE.md](VOICE.md), this creator's persona and how they talk, which grows with every script (step 8). Their views live in [OPINIONS.md](OPINIONS.md).

## Steps

### 1. Research and fact table

Read every source the user gave, then the company's or author's own page. Build the fact table: each claim the script might make, its source link, and the source's exact words. Mark a claim the source states as the company's own, unverified number (Nolla's 96%), so the script says so. For a personal story, the user is the source: list what you need from them (what happened, when, the numbers, what they felt) and ask; leave a gap marked `[ask]` until they answer.

When the user brings their own draft, sort its lines into three groups before editing, using [OPINIONS.md](OPINIONS.md) to recognise views they've held before: **opinion** (their view; it stays in their words), **fact** (checked like any claim) and **unsure** (a view phrased as a fact, such as "our brains are wired to save energy"). Ask which group each unsure line belongs to, in one question. Push back on a fact the sources contradict, with the source, and suggest a fix; never cut or soften an opinion on your own. Lines the user has already edited stay word for word; suggest a change to one instead of making it. Add each answer to OPINIONS.md.

Done when every claim in the script can point at a row of the fact table.

### 2. Angle

Write three lines and show them to the user with the shape:

- **Shape**: news, journey or personal ([SHAPES.md](SHAPES.md)); it sets the format. A news video can carry a journey section in its middle.
- **Contrast**: what the viewer assumes, and what is actually true.
- **Emotion**: the one feeling the video transfers (curiosity, awe, fear, shock, hope).

Set the length target from the shape. Estimate length at 3.2 words a second (the published final cuts run 2.6 to 4.0).

Done when the user agrees with the angle, or gave it in their message.

### 3. Hook options

Three hooks, each a spoken first line plus the frame-0 title (one or two lines at 100px) and the picture under it. Each drops the viewer into something already moving and signals within 5 seconds why to stay, and names the line that pays that promise off (**hook** skill, step 1). One of the three is the strongest version that still matches the fact table. The **hook** skill builds the chosen one.

Done when the user picks one.

### 4. Peak map

List the beats in order, one line each: its rough second, its type, and the words that carry it. Types are the beats in `video-editor/DESIGN.md` (Beats): a **peak** re-hooks (number, contrast, new problem, the biggest reveal, the doubt beat); a **release** explains the last peak. Peaks sit at most 15 seconds apart; each shape defines its peaks.

Done when the map fits the length target with no gap over 15 seconds between peaks.

### 5. Write

Write the lines from the peak map in the user's voice ([VOICE.md](VOICE.md)), then make the [UNSLOP.md](UNSLOP.md) pass; where the two disagree, VOICE.md wins. Mark each line FACE (on camera) or VO (voice-over under pictures or animation), and give each animated line its style: the video's lead style, or another when the line needs it (`animated-shots` skill, STYLES.md). Leave the style empty until the user picks a style frame, unless they named one. FACE goes on the turns: the hook when the face is in the thumbnail, the question that opens a section, the doubt beat, the ending.

Done when every beat of the map has its line.

### 6. Check

Run [CHECKLIST.md](CHECKLIST.md) and fix every failure. Show the user the result as a table (check, pass or fixed, the line it touched), with the word count and the estimated length.

Done when every check passes.

### 7. Write the file and hand off

Write `script.md` in the format below. Before a rewrite, rename the current one to `script-v<N>.md`; only `script.md` feeds anything. Then:

- When the user keeps scripts somewhere else too (a notes app, a board), update that copy, and when they have edited it, copy their lines back into `script.md` word for word.
- Write the post caption (`AGENTS.md`, Post captions): one or two lines plus "Comment X" when the script ends on it.

Done when the file exists, the card matches it, and the caption is written.

### 8. Learn the voice

Run this whenever the user changes a line you wrote, wherever they change it (`script.md`, their board, a chat message), and once more after the edit, against the transcript of what they actually said on camera. Compare their version with yours line by line. Set aside fact fixes, cuts for length, lines dropped in the edit and the transcript's misspellings of names; each other change shows how they talk:

- **Their own habit** (a phrase they swap in, a way they open or end): a row in VOICE.md's Learned table. When the same kind of change shows up a second time, write it as a rule under How they talk and drop its rows.
- **A general AI tell** they removed: a line in UNSLOP.md.
- **A view** they added or defended: OPINIONS.md (step 1).

Tell the user in one line what you recorded, so they can correct it.

Done when every change the user made is recorded or set aside as a fact or length fix.

## The script file

```markdown
# <Title>

Shape: news · Format: animation · Style: isometric · Length: ~190 words, ~60 s · Emotion: fear
Contrast: people assume X; actually Y.

## Hook

Chosen: "<spoken line>" · Title: <frame-0 title> · Picture: <what and from where>
Other options: ...

## Storyboard

| # | Shot | Line | On screen | Style | Sound | Beat |
|---|---|---|---|---|---|---|
| 1 | VO | Anthropic just watched an AI copy itself onto 8 machines. | "copy itself" → the 8-device network lighting up | isometric | whoosh | hook |
| 2 | FACE | So how does an AI even run on a TV box? | punch-in | | | release |
| 3 | VO | It finds the next machine, gets in, and copies itself. | "finds" → "gets in" → "copies": the three steps as a row | 2D | click | release |

## Facts

| Claim | Source | Source's words |
|---|---|---|

## Caption

...
```

`Shot` is exactly `FACE` or `VO`: the teleprompter reads those rows. `On screen` ties each visual to the words it lands on (`"cue words" → visual`); **find-pictures** and **edit-video** place visuals from it, and a peak gets a visual change. `Style` is the animated shot's style (2D, isometric or 3D), empty on FACE lines without animation; **animated-shots** builds each row in it. `Beat` is the type from the peak map; DESIGN.md's Beats table gives each one its screen and sound, which fill `On screen` and `Sound`.
