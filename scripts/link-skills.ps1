# Windows twin of link-skills.sh: links every skill in this repo into the skill folders agents read:
#   ~\.claude\skills  Claude Code
#   ~\.agents\skills  Codex and other Agent Skills harnesses
# Uses directory junctions, which need no admin rights or Developer Mode, so `git pull` updates the
# installed skills. A skill folder that already exists and isn't a link is left alone.
#
#   powershell -ExecutionPolicy Bypass -File scripts\link-skills.ps1

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot

foreach ($dest in @("$HOME\.claude\skills", "$HOME\.agents\skills")) {
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  foreach ($skill in Get-ChildItem -Directory (Join-Path $repo "skills")) {
    if (-not (Test-Path (Join-Path $skill.FullName "SKILL.md"))) { continue }
    $link = Join-Path $dest $skill.Name
    $item = Get-Item $link -ErrorAction SilentlyContinue
    if ($item -and -not $item.LinkType) {
      Write-Host "skipped $link (a different skill with this name is already there)"
      continue
    }
    if ($item) { $item.Delete() }  # an old link: removes the link only, never the repo's files
    New-Item -ItemType Junction -Path $link -Target $skill.FullName | Out-Null
    Write-Host "linked $link"
  }
}
