// Build the Biała Lista story creative (1080x1920) for eKsięgowy AI.
// Layout mirrors the ai-budget-assistant creatives:
//   - top-right  : APP icon/logo (eKsięgowy)        -> assets/app-logo.png
//   - bottom     : COMPANY logo (MICODE) + domain   -> assets/micode.png
//   - center     : app screenshot in a browser frame, emerald "safety" theme
//
// Assets are pre-trimmed PNGs (see README / generate step). Run: node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const asset = (p) => `data:image/png;base64,${fs.readFileSync(path.join(__dirname, p)).toString('base64')}`;

const shot = asset('assets/shot-chat.png');      // screenshot, sidebar cropped (bigger content)
const appIcon = asset('assets/app-icon.png');    // eKsięgowy emblem (app icon)
const coLogo = asset('assets/micode.png');       // MICODE (company)

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

  /* APP icon — top-right corner, circular badge */
  .app-badge{position:absolute;top:50px;right:56px;width:132px;height:132px;border-radius:50%;
    background:#fff;display:flex;align-items:center;justify-content:center;
    box-shadow:0 12px 30px rgba(0,0,0,.42);}
  .app-badge img{width:86px;height:86px;object-fit:contain;display:block;}

  .eyebrow{position:absolute;top:104px;left:64px;text-align:left;
    color:#34D399;font-size:34px;font-weight:700;letter-spacing:9px;}
  .eyebrow .u{display:block;width:120px;height:5px;border-radius:3px;
    background:linear-gradient(90deg,#34D399,#0EA5A5);margin:20px 0 0;}

  h1{position:absolute;top:262px;left:64px;right:64px;text-align:center;
    font-size:92px;line-height:1.03;font-weight:800;letter-spacing:-1.5px;}
  h1 .g{background:linear-gradient(90deg,#34D399,#22D3EE);-webkit-background-clip:text;
    background-clip:text;color:transparent;}

  .verified{position:absolute;top:520px;left:50%;transform:translateX(-50%);z-index:6;
    display:flex;align-items:center;gap:14px;
    background:#10B981;color:#04241A;font-size:32px;font-weight:800;
    padding:16px 34px;border-radius:999px;box-shadow:0 14px 34px rgba(16,185,129,.42);}
  .verified .tick{display:inline-flex;width:38px;height:38px;border-radius:50%;
    background:#04241A;color:#10B981;align-items:center;justify-content:center;font-size:26px;}

  .window{position:absolute;top:572px;left:32px;right:32px;border-radius:26px;overflow:hidden;
    background:#0d1b2e;box-shadow:0 44px 90px rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.08);}
  .bar{height:54px;background:#0f1c30;display:flex;align-items:center;gap:12px;padding:0 24px;
    border-bottom:1px solid rgba(255,255,255,.05);}
  .dot{width:14px;height:14px;border-radius:50%;}
  .shot{display:block;width:100%;}

  .chips{position:absolute;top:1258px;left:0;right:0;display:flex;justify-content:center;gap:24px;}
  .chip{border:2px solid rgba(52,211,153,.55);color:#D1FAE5;font-size:33px;font-weight:600;
    padding:16px 36px;border-radius:999px;background:rgba(16,185,129,.06);}

  .cta{position:absolute;top:1398px;left:80px;right:80px;text-align:center;}
  .cta .big{font-size:50px;font-weight:800;line-height:1.12;letter-spacing:-.5px;}
  .cta .sub{display:block;margin-top:22px;font-size:31px;font-weight:500;color:#9FB3C8;line-height:1.35;}

  /* COMPANY logo — bottom */
  .company{position:absolute;bottom:76px;left:0;right:0;
    display:flex;flex-direction:column;align-items:center;gap:20px;}
  .company .disc{width:112px;height:112px;border-radius:50%;
    border:3px solid rgba(255,255,255,.85);box-shadow:0 10px 26px rgba(0,0,0,.45);display:block;}
  .company .domain{color:#94A3B8;font-size:30px;font-weight:600;letter-spacing:4px;}
</style></head><body>
  <div class="stage">
    <div class="glow glow-a"></div>
    <div class="glow glow-b"></div>

    <div class="app-badge"><img src="${appIcon}" alt="eKsięgowy AI"/></div>
    <div class="eyebrow">BIAŁA LISTA VAT<span class="u"></span></div>

    <h1>Sprawdź konto,<br><span class="g">zanim zapłacisz</span></h1>

    <div class="verified"><span class="tick">✓</span>Konto na Białej Liście</div>
    <div class="window">
      <div class="bar">
        <span class="dot" style="background:#ff5f57"></span>
        <span class="dot" style="background:#febc2e"></span>
        <span class="dot" style="background:#28c840"></span>
      </div>
      <img class="shot" src="${shot}"/>
    </div>

    <div class="chips">
      <span class="chip">Rejestr MF</span>
      <span class="chip">Ochrona KUP</span>
      <span class="chip">Zero ryzyka VAT</span>
    </div>

    <div class="cta">
      <div class="big">Bezpieczna płatność w 3 sekundy</div>
      <span class="sub">Zapytaj AI, zanim zrobisz przelew — bez wchodzenia na rządowe strony</span>
    </div>

    <div class="company">
      <img class="disc" src="${coLogo}" alt="MICODE"/>
      <div class="domain">eksiegowyai.pl</div>
    </div>
  </div>
</body></html>`;

const htmlPath = path.join(__dirname, 'biala-lista-story-pl.html');
fs.writeFileSync(htmlPath, html, 'utf8');

const outDir = path.join(__dirname, 'renders', 'pl');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'biala-lista-story-pl.png');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2 });
await page.goto('file:///' + htmlPath.replace(/\\/g, '/'));
await page.waitForTimeout(300);
const buf = await page.locator('.stage').screenshot();
await browser.close();

await sharp(buf).resize(1080, 1920).png().toFile(outPath);
console.log('WROTE', outPath);
