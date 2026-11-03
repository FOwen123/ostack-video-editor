// Screenshot the exact paragraph you quote from an article, at 2x.
//
//   node shot.mjs <url> "<text in the paragraph>" <out.png> [--dark]
//
// Loads the live page in headless Chrome (DevTools Protocol), finds the first
// <p>/<li> containing the text, and captures just that block with a little
// padding. --dark flips the page to a dark theme (photos keep their colours),
// for sites like Substack that have no dark mode on the web.
import { launch } from "./chrome.mjs";
import { writeFileSync } from "node:fs";

const [url, text, out, flag] = process.argv.slice(2);
if (!out) { console.error('usage: node shot.mjs <url> "<text>" <out.png> [--dark]'); process.exit(2); }
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = launch(port, ["--disable-gpu", "--hide-scrollbars"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 50 && !ws; i++) {
  try { ws = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === "page").webSocketDebuggerUrl; }
  catch { await sleep(200); }
}
const sock = new WebSocket(ws); await new Promise((r) => (sock.onopen = r));
let id = 0; const wait = {};
sock.onmessage = (m) => { const d = JSON.parse(m.data); if (wait[d.id]) { wait[d.id](d.result); delete wait[d.id]; } };
const send = (method, params = {}) => new Promise((r) => { wait[++id] = r; sock.send(JSON.stringify({ id, method, params })); });
const quit = (code) => { sock.close(); chrome.kill(); process.exit(code); };

await send("Emulation.setDeviceMetricsOverride", { width: 760, height: 1200, deviceScaleFactor: 2, mobile: false });
await send("Page.navigate", { url }); await sleep(6000);
const dark = flag === "--dark"
  ? "const s=document.createElement('style');s.textContent='html{filter:invert(1) hue-rotate(180deg);background:#fff}img,video{filter:invert(1) hue-rotate(180deg)}';document.head.append(s);"
  : "";
const r = await send("Runtime.evaluate", { returnByValue: true, expression:
  `(()=>{${dark}const el=[...document.querySelectorAll('p,li')].find(e=>e.innerText.includes(${JSON.stringify(text)}));` +
  `if(!el)return null;el.scrollIntoView({block:'center'});const b=el.getBoundingClientRect();` +
  `return {x:b.x+scrollX,y:b.y+scrollY,w:b.width,h:b.height}})()` });
const b = r.result.value;
if (!b) { console.error(`text not found on page: ${text}`); quit(1); }
await sleep(800);
const pad = 24;
const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true,
  clip: { x: b.x - pad, y: b.y - pad, width: b.w + 2 * pad, height: b.h + 2 * pad, scale: 1 } });
writeFileSync(out, Buffer.from(data, "base64"));
console.log(`${out}: ${Math.round((b.w + 2 * pad) * 2)}x${Math.round((b.h + 2 * pad) * 2)}`);
quit(0);
