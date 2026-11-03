// Record an HTML figure (an Anatomy page, or any animated page) to a 30fps MP4.
//
//   node record.mjs <file.html | url> <out.mp4> <seconds> [--speed 2] [--size 1080x960]
//     [--select .iso-plate] [--region x,y,w,h] [--width 760] [--preroll 1500] [--scroll 3000] [--actions '[[0,"key"," "],[4000,"eval","..."]]']
//
// The page runs on a virtual clock (performance.now, Date.now, requestAnimationFrame,
// setTimeout) that advances exactly one frame per capture, so heavy WebGL pages never
// drop frames. --speed 2 plays the page twice as fast (a long launch fits its line).
// Actions fire at page-clock ms: "key" presses a key on the focused figure, "eval" runs JS.
// The selected element is scaled to fit --size and padded with its background (else the page's).
// --scroll pans the shot that many CSS px down the page across the recording, eased in and out.
import { spawn } from "node:child_process";
import { launch } from "./chrome.mjs";

const [src, out, secs, ...rest] = process.argv.slice(2);
if (!secs) { console.error("usage: node record.mjs <file.html|url> <out.mp4> <seconds> [options]"); process.exit(2); }
const opt = (name, dflt) => { const i = rest.indexOf(`--${name}`); return i < 0 ? dflt : rest[i + 1]; };
const speed = Number(opt("speed", 1));
const [W, H] = opt("size", "1080x960").split("x").map(Number);
const select = opt("select", ".iso-plate");
const scroll = Number(opt("scroll", 0));
const actions = JSON.parse(opt("actions", "[]")).sort((a, b) => a[0] - b[0]);
const url = /^https?:/.test(src) ? src : new URL(src, `file://${process.cwd()}/`).href;
const FPS = 30, DPR = 2;

const CLOCK = `(()=>{let t=0,n=0;const timers=new Map(),rafs=new Map(),D=Date.now();
performance.now=()=>t;Date.now=()=>D+t;
window.requestAnimationFrame=cb=>{rafs.set(++n,cb);return n};window.cancelAnimationFrame=i=>rafs.delete(i);
window.setTimeout=(cb,ms=0,...a)=>{timers.set(++n,{at:t+ms,cb:()=>cb(...a)});return n};window.clearTimeout=i=>timers.delete(i);
window.setInterval=(cb,ms=0,...a)=>{const k=++n;const run=()=>{timers.set(k,{at:t+Math.max(ms,1),cb:()=>{run();cb(...a)}})};run();return k};window.clearInterval=i=>timers.delete(i);
window.__step=ms=>{const end=t+ms;for(;;){let due=null;for(const e of timers)if(e[1].at<=end&&(!due||e[1].at<due[1].at))due=e;if(!due)break;timers.delete(due[0]);t=Math.max(t,due[1].at);due[1].cb()}
t=end;const cbs=[...rafs.values()];rafs.clear();cbs.forEach(cb=>cb(t))}})();`;

const port = 9300 + Math.floor(Math.random() * 500);
const chrome = launch(port, ["--hide-scrollbars", "--enable-unsafe-swiftshader"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 50 && !ws; i++) {
  try { ws = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === "page").webSocketDebuggerUrl; }
  catch { await sleep(200); }
}
const sock = new WebSocket(ws); await new Promise((r) => (sock.onopen = r));
let id = 0; const wait = {};
sock.onmessage = (m) => { const d = JSON.parse(m.data); if (wait[d.id]) { wait[d.id](d.result ?? d); delete wait[d.id]; } };
const send = (method, params = {}) => new Promise((r) => { wait[++id] = r; sock.send(JSON.stringify({ id, method, params })); });
const run = async (js) => (await send("Runtime.evaluate", { expression: js, returnByValue: true, awaitPromise: true })).result?.value;

await send("Page.enable");  // without it the clock script is never injected
await send("Page.addScriptToEvaluateOnNewDocument", { source: CLOCK });
await send("Emulation.setDeviceMetricsOverride", { width: Number(opt("width", 760)), height: 2400, deviceScaleFactor: DPR, mobile: false });
await send("Page.navigate", { url }); await sleep(4000);
await run(`document.fonts.ready.then(()=>1)`);
await run(`window.__step(50)`);
const box = await run(`(()=>{const el=document.querySelector(${JSON.stringify(select)})||document.body;el.scrollIntoView({block:"start"});
  const f=document.querySelector('[tabindex="0"]');f&&f.focus({preventScroll:true});
  const r=el.getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height,
  bg:[el,document.body].map(e=>getComputedStyle(e).backgroundColor).find(c=>!/rgba\\(.*, 0\\)|transparent/.test(c)).match(/\\d+/g).slice(0,3).map(Number)}})()`);
const region = opt("region");  // x,y,w,h in CSS px inside the selected element
if (region) { const [x, y, w, h] = region.split(",").map(Number); Object.assign(box, { x: box.x + x, y: box.y + y, w, h }); }
const fit = Math.min(W / box.w, H / box.h);
const bg = box.bg.map((c) => c.toString(16).padStart(2, "0")).join("");

const ff = spawn("ffmpeg", ["-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", `${FPS}`, "-i", "-",
  "-vf", `scale=${W}:${H}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x${bg},setsar=1,format=yuv420p`,
  "-c:v", "libx264", "-crf", "16", "-preset", "medium", out], { stdio: ["pipe", "inherit", "inherit"] });
const KEYS = { " ": ["Space", 32], Enter: ["Enter", 13], Escape: ["Escape", 27], ArrowRight: ["ArrowRight", 39], ArrowLeft: ["ArrowLeft", 37] };
const frames = Math.round(Number(secs) * FPS);
let clock = -Number(opt("preroll", 0));  // run the page this long before the first frame (actions may use negative ms)
for (let f = 0; f < frames; ) {
  while (actions.length && actions[0][0] <= clock) {
    const [, kind, arg] = actions.shift();
    if (kind === "eval") await run(arg);
    else {
      const [code, vk] = KEYS[arg] ?? [`Key${arg.toUpperCase()}`, arg.toUpperCase().charCodeAt(0)];
      for (const type of ["keyDown", "keyUp"])
        await send("Input.dispatchKeyEvent", { type, key: arg, code, windowsVirtualKeyCode: vk, text: type === "keyDown" && arg.length === 1 ? arg : undefined });
    }
  }
  const dy = scroll * (1 - Math.cos((Math.PI * f) / Math.max(frames - 1, 1))) / 2;
  if (scroll) await run(`scrollTo(0, ${box.y + dy - 200})`);  // keep the viewport on the shot so lazy images load
  await run(`window.__step(${(1000 / FPS) * speed})`);
  clock += (1000 / FPS) * speed;
  const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 95, captureBeyondViewport: true,
    clip: { x: box.x, y: box.y + dy, width: box.w, height: box.h, scale: fit / DPR } });
  if (clock <= 1e-6) continue;  // pre-roll frames are drawn (pages start their visible-only animations) but not kept
  f++;
  if (!ff.stdin.write(Buffer.from(data, "base64"))) await new Promise((r) => ff.stdin.once("drain", r));
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
console.log(`${out}: ${frames} frames, plate ${Math.round(box.w)}x${Math.round(box.h)} at ${Math.round(box.x)},${Math.round(box.y)}, ${fit.toFixed(2)}x`);
sock.close(); chrome.kill(); process.exit(0);
