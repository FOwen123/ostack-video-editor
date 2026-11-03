# Judges

Two judges, each a fresh subagent with one lens. Each gets the frames and what its lens needs, never your plans or notes, so it sees what a viewer sees: three frames per two seconds in order with timestamps, plus a run of consecutive frames across each shot's fastest second. Each returns its issues as `shot · time range · what's wrong · how it should look`. Keep them in `projects/<job>/anim/ISSUES.md` (shot, time, owner, judge, status).

## Mute test

Does the picture tell the line without the voice?

1. Render silent and without subtitles, which would give the words away.
2. Ask the judge: "Tell me, second by second, what is happening and what it teaches. Flag any moment you can't read."
3. List the script's claims, one per sentence. A claim counts when the judge's account names it or describes how it works.
4. Pass: at least 80% recovered. Each missed claim goes back to its shot with the judge's words.

## Finish and facts

Given `DESIGN.md`, the standing notes (SKILL.md, step 3) and the script's fact table:

- every frame inside the safe area and clear of the subtitles, each element touching only what it is part of, text flat and at least 54px, real logos and objects, the face covered only where the shot means it;
- motion alive: several things moving, a camera that answers events and keeps moving in 3D, and no flicker, pop or empty first frame;
- every number, chart, arrow, label and worked example true to its source: a chart rises and falls as its data does, an arrow points at the thing it names, a technical step shows what actually happens.

Shots over the speaker are judged composited over a frame of the real take.

## Requests

Yours, not a judge's: you already hold the user's messages. List every request for this video, from their messages and the storyboard, and point each at the frame that shows it done, or mark it missing. Frame 0 is the thumbnail: title inside the profile-grid crop (**hook** skill), and the speaker's eyes open if the face shows.
