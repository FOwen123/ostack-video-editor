# Editing a CapCut draft safely

Read before any script or hand edit writes to a CapCut draft (CapCut 9.4).

Drafts live in CapCut's drafts folder (`capcut.py` finds it): `~/Movies/CapCut/User Data/Projects/com.lveditor.draft/<draft>/` on macOS, `%LOCALAPPDATA%\CapCut\User Data\Projects\com.lveditor.draft\<draft>\` on Windows, or `$CAPCUT_DRAFTS`. Never copy them into `video-editor/projects/`. The timeline file is `draft_info.json` on macOS and `draft_content.json` on Windows; below, "the draft file" means whichever the draft has.

1. **Quit CapCut first.** It rewrites its draft files and registry on quit and would undo your edit. macOS: `osascript -e 'quit app "CapCut"'` reports "User canceled" but still quits a few seconds later: poll `pgrep -x CapCut` until it's gone. Windows: `taskkill /IM CapCut.exe`, then poll `tasklist /FI "IMAGENAME eq CapCut.exe"` until it's gone.
2. **Write both copies.** The main timeline keeps an identical copy of the draft file at `Timelines/<main_timeline_id>/` (id in `Timelines/project.json`). Change one and not the other and CapCut shows the old version.
3. **Keep backups.** Leave CapCut's `.bak` copy of the draft file alone, back up `root_meta_info.json` next to itself before editing it, and write atomically (temp file, then rename).
4. **Prefer a new draft** for big changes (`tighten.py` does this; name it the next `-vN`). Small fixes (a caption's text, swapping an overlay file for a re-render with the same name and length) can go in place. To discard a draft you just built and the user hasn't opened, move its folder to the Trash (the Recycle Bin on Windows) and remove its entry from `root_meta_info.json` (back that file up first); never delete the user's drafts.
5. **Reopen and check.** Restart CapCut, open the draft and scrub to each changed moment. A black box usually means CapCut is still loading a swapped file: restart once more before digging in.

Caption positions: set each track's `clip.transform.y` in the JSON (English −0.54, Chinese −0.70). Dragging a caption with "Apply to all" in CapCut moves both tracks onto each other.
