// Build the Biała Lista REEL (1080x1920, ~7s) for eKsięgowy AI.
// Same still composition + staged CSS animations. Frames are rendered
// deterministically (Web Animations API currentTime) then encoded with ffmpeg.
//
// Env: FFMPEG=<path to ffmpeg.exe>  FRAMES=<scratch frames dir>
// Run:  FFMPEG=... FRAMES=... node build-reel.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const asset = (p) => `data:image/png;base64,${fs.readFileSync(path.join(__dirname, p)).toString('base64')}`;
const shot = asset('assets/shot-chat.png');
const appIcon = asset('assets/app-icon.png');
const coLogo = asset('assets/micode.png');

const FPS = 30;
const DUR = 7.0;                     // seconds
const FRAMES = Math.round(FPS * DUR);
const FFMPEG = process.env.FFMPEG;
const FRAMES_DIR = process.env.FRAMES;
if (!FFMPEG || !FRAMES_DIR) { console.error('need FFMPEG and FRAMES env'); process.exit(1); }
fs.mkdirSync(FRAMES_DIR, { recursive: true });
for (const f of fs.readdirSync(FRAMES_DIR)) if (f.endsWith('.png')) fs.unlinkSync(path.join(FRAMES_DIR, f));

const EASE = 'cubic-bezier(.2,.7,.2,1)';
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:1080px;height:1920px;}
  .stage{position:relative;width:1080px;height:1920px;overflow:hidden;
    background:
      radial-gradient(130% 90% at 12% 6%, rgba(16,185,129,.10), transparent 55%),
      radial-gradient(120% 80% at 92% 100%, rgba(13,148,136,.12), transparent 55%),
      linear-gradient(180deg,#0A1626 0%, #0B1A2E 55%, #0A1322 100%);
    font-family:'Segoe UI',-apple-system,Roboto,'Helvetica Neue',Arial,sans-serif;color:#fff;}
  .glow{position:absolute;border-radius:50%;filter:blur(90px);}
  .glow-a{width:640px;height:640px;left:-180px;top:-160px;background:#10B981;opacity:.20;}
  .glow-b{width:720px;height:720px;right:-240px;bottom:-220px;background:#0EA5A5;opacity:.13;}

  .app-badge{position:absolute;top:50px;right:56px;width:132px;height:132px;border-radius:50%;
    background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 30px rgba(0,0,0,.42);}
  .app-badge img{width:86px;height:86px;object-fit:contain;display:block;}

  .eyebrow{position:absolute;top:104px;left:64px;color:#34D399;font-size:34px;font-weight:700;letter-spacing:9px;}
  .eyebrow .u{display:block;width:120px;height:5px;border-radius:3px;background:linear-gradient(90deg,#34D399,#0EA5A5);margin:20px 0 0;}

  h1{position:absolute;top:262px;left:64px;right:64px;text-align:center;font-size:92px;line-height:1.03;font-weight:800;letter-spacing:-1.5px;}
  h1 .g{background:linear-gradient(90deg,#34D399,#22D3EE);-webkit-background-clip:text;background-clip:text;color:transparent;}

  .verified{position:absolute;top:520px;left:50%;transform:translateX(-50%);z-index:6;display:flex;align-items:center;gap:14px;
    background:#10B981;color:#04241A;font-size:32px;font-weight:800;padding:16px 34px;border-radius:999px;box-shadow:0 14px 34px rgba(16,185,129,.42);}
  .verified .tick{display:inline-flex;width:38px;height:38px;border-radius:50%;background:#04241A;color:#10B981;align-items:center;justify-content:center;font-size:26px;}

  .window{position:absolute;top:572px;left:32px;right:32px;border-radius:26px;overflow:hidden;background:#0d1b2e;box-shadow:0 44px 90px rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.08);}
  .bar{height:54px;background:#0f1c30;display:flex;align-items:center;gap:12px;padding:0 24px;border-bottom:1px solid rgba(255,255,255,.05);}
  .dot{width:14px;height:14px;border-radius:50%;}
  .shot{display:block;width:100%;transform-origin:50% 26%;}

  .chips{position:absolute;top:1258px;left:0;right:0;display:flex;justify-content:center;gap:24px;}
  .chip{border:2px solid rgba(52,211,153,.55);color:#D1FAE5;font-size:33px;font-weight:600;padding:16px 36px;border-radius:999px;background:rgba(16,185,129,.06);}

  .cta{position:absolute;top:1398px;left:80px;right:80px;text-align:center;}
  .cta .big{font-size:50px;font-weight:800;line-height:1.12;letter-spacing:-.5px;}
  .cta .sub{display:block;margin-top:22px;font-size:31px;font-weight:500;color:#9FB3C8;line-height:1.35;}

  .company{position:absolute;bottom:76px;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:20px;}
  .company .disc{width:112px;height:112px;border-radius:50%;border:3px solid rgba(255,255,255,.85);box-shadow:0 10px 26px rgba(0,0,0,.45);display:block;}
  .company .domain{color:#94A3B8;font-size:30px;font-weight:600;letter-spacing:4px;}

  /* ---- animations ---- */
  @keyframes fadeUp{from{opacity:0;transform:translateY(42px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeDown{from{opacity:0;transform:translateY(-28px)}to{opacity:1;transform:translateY(0)}}
  @keyframes winIn{from{opacity:0;transform:translateY(70px) scale(.955)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes pop{0%{opacity:0;transform:translateX(-50%) scale(.4)}70%{opacity:1;transform:translateX(-50%) scale(1.12)}100%{opacity:1;transform:translateX(-50%) scale(1)}}
  @keyframes kb{from{transform:scale(1)}to{transform:scale(1.07)}}
  @keyframes badgeIn{from{opacity:0;transform:scale(.3) rotate(-25deg)}to{opacity:1;transform:scale(1) rotate(0)}}

  .app-badge{animation:badgeIn .7s ${EASE} .2s both;}
  .eyebrow{animation:fadeDown .7s ${EASE} 0s both;}
  h1{animation:fadeUp .8s ${EASE} .35s both;}
  .window{animation:winIn .9s ${EASE} .9s both;}
  .shot{animation:kb 6.2s ease-out 1.8s both;}
  .verified{animation:pop .7s ${EASE} 2.2s both;}
  .chips .chip:nth-child(1){animation:fadeUp .6s ${EASE} 3.0s both;}
  .chips .chip:nth-child(2){animation:fadeUp .6s ${EASE} 3.15s both;}
  .chips .chip:nth-child(3){animation:fadeUp .6s ${EASE} 3.3s both;}
  .cta .big{animation:fadeUp .6s ${EASE} 3.9s both;}
  .cta .sub{animation:fadeUp .6s ${EASE} 4.25s both;}
  .company{animation:fadeUp .7s ${EASE} 4.8s both;}
</style></head><body>
  <div class="stage">
    <div class="glow glow-a"></div><div class="glow glow-b"></div>
    <div class="app-badge"><img src="${appIcon}"/></div>
    <div class="eyebrow">BIAŁA LISTA VAT<span class="u"></span></div>
    <h1>Sprawdź konto,<br><span class="g">zanim zapłacisz</span></h1>
    <div class="verified"><span class="tick">✓</span>Konto na Białej Liście</div>
    <div class="window">
      <div class="bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span></div>
      <img class="shot" src="${shot}"/>
    </div>
    <div class="chips"><span class="chip">Rejestr MF</span><span class="chip">Ochrona KUP</span><span class="chip">Zero ryzyka VAT</span></div>
    <div class="cta"><div class="big">Bezpieczna płatność w 3 sekundy</div><span class="sub">Zapytaj AI, zanim zrobisz przelew — bez wchodzenia na rządowe strony</span></div>
    <div class="company"><img class="disc" src="${coLogo}"/><div class="domain">eksiegowyai.pl</div></div>
  </div>
</body></html>`;

const htmlPath = path.join(__dirname, 'biala-lista-reel-pl.html');
fs.writeFileSync(htmlPath, html, 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto('file:///' + htmlPath.replace(/\\/g, '/'));
const stage = page.locator('.stage');
for (let i = 0; i < FRAMES; i++) {
  const tMs = (i / FPS) * 1000;
  await page.evaluate((t) => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; } }, tMs);
  await stage.screenshot({ path: path.join(FRAMES_DIR, `f${String(i).padStart(4, '0')}.png`) });
}
await browser.close();
console.log('frames rendered:', FRAMES);

const outDir = path.join(__dirname, 'renders', 'pl');
fs.mkdirSync(outDir, { recursive: true });
const mp4 = path.join(outDir, 'biala-lista-reel-pl.mp4');
const gif = path.join(outDir, 'biala-lista-reel-pl.gif');

const run = (args) => { const r = spawnSync(FFMPEG, args, { stdio: 'inherit' }); if (r.status !== 0) throw new Error('ffmpeg failed'); };
// 9:16 mp4 (Instagram/TikTok Reels)
run(['-y', '-framerate', String(FPS), '-i', path.join(FRAMES_DIR, 'f%04d.png'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-preset', 'slow', '-movflags', '+faststart', mp4]);
// preview gif (downscaled, palette)
run(['-y', '-i', mp4, '-vf', 'fps=20,scale=540:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse', gif]);
console.log('WROTE', mp4);
console.log('WROTE', gif);
