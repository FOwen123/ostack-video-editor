#!/usr/bin/env bash
set -euo pipefail

# Links every skill in this repo into the skill folders agents read:
#   ~/.claude/skills  Claude Code
#   ~/.agents/skills  Codex and other Agent Skills harnesses
# Each link points into this repo, so `git pull` updates the installed skills.
# A skill folder that already exists and isn't one of these links is left alone.

REPO="$(cd "$(dirname "$0")/.." && pwd)"

for dest in "$HOME/.claude/skills" "$HOME/.agents/skills"; do
  mkdir -p "$dest"
  for skill in "$REPO"/skills/*/; do
    [ -f "$skill/SKILL.md" ] || continue
    name="$(basename "$skill")"
    link="$dest/$name"
    if [ -L "$link" ] || [ ! -e "$link" ]; then
      ln -sfn "${skill%/}" "$link"
      echo "linked $link"
    else
      echo "skipped $link (a different skill with this name is already there)"
    fi
  done
done
