// Build the Biała Lista static creatives for eKsięgowy AI, in the IG-correct set:
//   - story-pl    1080x1920  (9:16, safe-zone — Stories / Reel cover)
//   - post-4x5-pl 1080x1350  (4:5  — feed post, not cropped)
// Layout mirrors the ai-budget creatives: app icon (top), MICODE company logo
// (bottom), emerald "safety" theme, masked chat screenshot. Run: node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const asset = (p) => `data:image/png;base64,${fs.readFileSync(path.join(__dirname, p)).toString('base64')}`;
const shot = asset('assets/shot-chat.png');
const appIcon = asset('assets/app-icon.png');
const coLogo = asset('assets/micode.png');

// per-format geometry (px). 9:16 keeps IG safe margins; 4:5 fills the frame.
const FORMATS = [
  {
    name: 'biala-lista-story-pl', W: 1080, H: 1920,
    v: { badgeTop: 150, badgeRight: 52, badge: 116, badgeImg: 76, ebTop: 206, ebLeft: 64, ebFont: 33,
      h1Top: 288, h1Font: 80, vfTop: 486, vfFont: 31, winTop: 530, winSide: 128, barH: 50,
      chipsTop: 1088, chipFont: 30, chipPy: 13, chipPx: 30, chipsGap: 20,
      ctaTop: 1176, ctaBig: 44, ctaSub: 29, coBottom: 452, coDisc: 96, coDomain: 28 },
  },
  {
    name: 'biala-lista-post-4x5-pl', W: 1080, H: 1350,
    v: { badgeTop: 40, badgeRight: 44, badge: 104, badgeImg: 68, ebTop: 52, ebLeft: 56, ebFont: 31,
      h1Top: 118, h1Font: 74, vfTop: 296, vfFont: 29, winTop: 344, winSide: 44, barH: 48,
      chipsTop: 998, chipFont: 28, chipPy: 12, chipPx: 27, chipsGap: 18,
      ctaTop: 1080, ctaBig: 41, ctaSub: 27, coBottom: 26, coDisc: 84, coDomain: 26 },
  },
];

const makeHtml = ({ W, H, v }) => `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:${W}px;height:${H}px;}
  .stage{position:relative;width:${W}px;height:${H}px;overflow:hidden;
    background:
      radial-gradient(130% 90% at 12% 6%, rgba(16,185,129,.10), transparent 55%),
      radial-gradient(120% 80% at 92% 100%, rgba(13,148,136,.12), transparent 55%),
      linear-gradient(180deg,#0A1626 0%, #0B1A2E 55%, #0A1322 100%);
    font-family:'Segoe UI',-apple-system,Roboto,'Helvetica Neue',Arial,sans-serif;color:#fff;}
  .glow{position:absolute;border-radius:50%;filter:blur(90px);}
  .glow-a{width:640px;height:640px;left:-180px;top:-160px;background:#10B981;opacity:.20;}
  .glow-b{width:720px;height:720px;right:-240px;bottom:-220px;background:#0EA5A5;opacity:.13;}

  .app-badge{position:absolute;top:${v.badgeTop}px;right:${v.badgeRight}px;width:${v.badge}px;height:${v.badge}px;border-radius:50%;
    background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 30px rgba(0,0,0,.42);}
  .app-badge img{width:${v.badgeImg}px;height:${v.badgeImg}px;object-fit:contain;display:block;}

  .eyebrow{position:absolute;top:${v.ebTop}px;left:${v.ebLeft}px;color:#34D399;font-size:${v.ebFont}px;font-weight:700;letter-spacing:9px;}
  .eyebrow .u{display:block;width:120px;height:5px;border-radius:3px;background:linear-gradient(90deg,#34D399,#0EA5A5);margin:18px 0 0;}

  h1{position:absolute;top:${v.h1Top}px;left:64px;right:64px;text-align:center;font-size:${v.h1Font}px;line-height:1.03;font-weight:800;letter-spacing:-1.5px;}
  h1 .g{background:linear-gradient(90deg,#34D399,#22D3EE);-webkit-background-clip:text;background-clip:text;color:transparent;}

  .verified{position:absolute;top:${v.vfTop}px;left:50%;transform:translateX(-50%);z-index:6;display:flex;align-items:center;gap:14px;
    background:#10B981;color:#04241A;font-size:${v.vfFont}px;font-weight:800;padding:15px 32px;border-radius:999px;box-shadow:0 14px 34px rgba(16,185,129,.42);}
  .verified .tick{display:inline-flex;width:36px;height:36px;border-radius:50%;background:#04241A;color:#10B981;align-items:center;justify-content:center;font-size:24px;}

  .window{position:absolute;top:${v.winTop}px;left:${v.winSide}px;right:${v.winSide}px;border-radius:24px;overflow:hidden;background:#0d1b2e;box-shadow:0 44px 90px rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.08);}
  .bar{height:${v.barH}px;background:#0f1c30;display:flex;align-items:center;gap:11px;padding:0 22px;border-bottom:1px solid rgba(255,255,255,.05);}
  .dot{width:13px;height:13px;border-radius:50%;}
  .shot{display:block;width:100%;}

  .chips{position:absolute;top:${v.chipsTop}px;left:0;right:0;display:flex;justify-content:center;gap:${v.chipsGap}px;}
  .chip{border:2px solid rgba(52,211,153,.55);color:#D1FAE5;font-size:${v.chipFont}px;font-weight:600;padding:${v.chipPy}px ${v.chipPx}px;border-radius:999px;background:rgba(16,185,129,.06);}

  .cta{position:absolute;top:${v.ctaTop}px;left:80px;right:80px;text-align:center;}
  .cta .big{font-size:${v.ctaBig}px;font-weight:800;line-height:1.12;letter-spacing:-.5px;}
  .cta .sub{display:block;margin-top:16px;font-size:${v.ctaSub}px;font-weight:500;color:#9FB3C8;line-height:1.3;}

  .company{position:absolute;bottom:${v.coBottom}px;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:16px;}
  .company .disc{width:${v.coDisc}px;height:${v.coDisc}px;border-radius:50%;border:3px solid rgba(255,255,255,.85);box-shadow:0 10px 26px rgba(0,0,0,.45);display:block;}
  .company .domain{color:#94A3B8;font-size:${v.coDomain}px;font-weight:600;letter-spacing:4px;}
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
    <div class="cta"><div class="big">Bezpieczna płatność w 3 sekundy</div><span class="sub">Zapytaj AI, zanim zrobisz przelew</span></div>
    <div class="company"><img class="disc" src="${coLogo}"/><div class="domain">eksiegowyai.pl</div></div>
  </div>
</body></html>`;

const outDir = path.join(__dirname, 'renders', 'pl');
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
for (const fmt of FORMATS) {
  const htmlPath = path.join(__dirname, `${fmt.name}.html`);
  fs.writeFileSync(htmlPath, makeHtml(fmt), 'utf8');
  const page = await browser.newPage({ viewport: { width: fmt.W, height: fmt.H }, deviceScaleFactor: 2 });
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'));
  await page.waitForTimeout(200);
  const buf = await page.locator('.stage').screenshot();
  await page.close();
  await sharp(buf).resize(fmt.W, fmt.H).png().toFile(path.join(outDir, `${fmt.name}.png`));
  console.log('WROTE', `${fmt.name}.png`, `${fmt.W}x${fmt.H}`);
}
await browser.close();
