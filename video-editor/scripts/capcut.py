"""Where CapCut keeps its drafts, on macOS and Windows, and how to read one.

    python3 capcut.py --test

ROOT is CapCut's drafts folder: $CAPCUT_DRAFTS when set, else the default for this system.
A draft's timeline is draft_info.json on macOS and draft_content.json on Windows; draft_file()
picks whichever the folder has. read() stops with a clear message on an encrypted draft (some
CapCut and JianYing versions encrypt the file), so no script writes over one it can't read.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

if sys.platform == "win32" and not sys.flags.utf8_mode:
    # Windows' default text encoding garbles the Chinese subtitles and draft text.
    raise SystemExit("set PYTHONUTF8=1 first (Windows: setx PYTHONUTF8 1, then open a new terminal)")

NAMES = ("draft_info.json", "draft_content.json")


def default_root(platform=sys.platform, env=os.environ, home=Path.home()):
    if env.get("CAPCUT_DRAFTS"):
        return Path(env["CAPCUT_DRAFTS"])
    if platform == "win32":
        return Path(env.get("LOCALAPPDATA", home / "AppData/Local")) / "CapCut/User Data/Projects/com.lveditor.draft"
    return home / "Movies/CapCut/User Data/Projects/com.lveditor.draft"


ROOT = default_root()


def draft_file(folder):
    """The draft's timeline file name: the one of NAMES that exists in the folder."""
    for name in NAMES:
        if (Path(folder) / name).exists():
            return name
    raise SystemExit(f"no {' or '.join(NAMES)} in {folder}: is the draft name right, and CAPCUT_DRAFTS ({ROOT}) CapCut's drafts folder?")


def running():
    """Whether CapCut is open: it rewrites its drafts and registry on quit, undoing a script's edit."""
    if sys.platform == "win32":
        out = subprocess.run(["tasklist", "/FI", "IMAGENAME eq CapCut.exe", "/NH"], capture_output=True, text=True).stdout
        return "CapCut.exe" in out
    return subprocess.run(["pgrep", "-x", "CapCut"], capture_output=True).returncode == 0


def read(path):
    text = Path(path).read_text(encoding="utf-8")
    if not text.lstrip().startswith("{"):
        raise SystemExit(f"{path} isn't plain JSON (this CapCut version encrypts drafts); these scripts can't edit it")
    return json.loads(text)


if __name__ == "__main__" and sys.argv[1:] == ["--test"]:
    import tempfile

    home = Path("/home/u")
    assert default_root("darwin", {}, home) == home / "Movies/CapCut/User Data/Projects/com.lveditor.draft"
    assert default_root("win32", {"LOCALAPPDATA": "C:/Users/u/AppData/Local"}, home) == Path("C:/Users/u/AppData/Local/CapCut/User Data/Projects/com.lveditor.draft")
    assert default_root("win32", {"CAPCUT_DRAFTS": "D:/drafts"}, home) == Path("D:/drafts")
    with tempfile.TemporaryDirectory() as d:
        (Path(d) / "draft_content.json").write_text('{"duration": 1}')
        assert draft_file(d) == "draft_content.json" and read(Path(d) / "draft_content.json") == {"duration": 1}
        (Path(d) / "draft_info.json").write_text("U2FsdGVkX1+encrypted")
        assert draft_file(d) == "draft_info.json"
        try:
            read(Path(d) / "draft_info.json")
            raise AssertionError("an encrypted draft must stop")
        except SystemExit as e:
            assert "encrypts" in str(e)
    print("ok")
