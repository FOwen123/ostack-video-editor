"""Find and download freely licensed pictures from Wikimedia Commons.

    python3 commons.py search "<words>"          # file titles (photos and logos)
    python3 commons.py get "File:<title>" <out>  # download ~1400px, print the licence

Use for logos and general photos when the company's own pages have nothing.
Always note the licence (CC0, public domain, CC BY, CC BY-SA) for the report.
"""
import json
import sys
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php?"
UA = {"User-Agent": "ContentEditor/1.0 (video-editor)"}


def api(**params):
    req = urllib.request.Request(API + urllib.parse.urlencode({**params, "format": "json"}), headers=UA)
    return json.loads(urllib.request.urlopen(req).read().decode("utf-8", "replace"), strict=False)


def search(words, limit=10):
    hits = api(action="query", list="search", srnamespace=6, srlimit=limit, srsearch=words)["query"]["search"]
    return [h["title"] for h in hits if h["title"].lower().endswith((".jpg", ".jpeg", ".png", ".svg", ".webp"))]


def get(title, out, width=1400):
    page = list(api(action="query", prop="imageinfo", iiprop="url|extmetadata|size", iiurlwidth=width,
                    titles=title)["query"]["pages"].values())[0]
    info = page["imageinfo"][0]
    url = info.get("thumburl") or info["url"]
    with open(out, "wb") as f:
        f.write(urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read())
    licence = info["extmetadata"].get("LicenseShortName", {}).get("value", "unknown")
    return licence


if __name__ == "__main__":
    cmd, *rest = sys.argv[1:]
    if cmd == "search":
        print("\n".join(search(" ".join(rest))))
    else:
        print(f"{rest[1]} | {get(rest[0], rest[1])} | {rest[0]}")
