// Rebuild the chat screenshot with MASKED sensitive data (account + NIP),
// faithfully styled to the eKsięgowy dark chat UI. Writes assets/shot-chat.png.
// Real NRB / NIP middle digits are hidden so nothing sensitive ships publicly.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const emblem = `data:image/png;base64,${fs.readFileSync(path.join(__dirname, 'assets/app-icon.png')).toString('base64')}`;

const ACC = 'PL58 1020 1811 •••• •••• •••• 7366';   // masked NRB (middle hidden)
const ACC2 = '1020 1811 •••• •••• •••• 7366';
const NIP = '957•••1371';                            // masked NIP (middle hidden)

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',-apple-system,Roboto,Arial,sans-serif;}
  .panel{width:1560px;height:900px;background:#0b1220;color:#e6ebf2;position:relative;overflow:hidden;}
  .hdr{height:74px;display:flex;align-items:center;gap:16px;padding:0 26px;background:#0d1526;
    border-bottom:1px solid rgba(255,255,255,.06);}
  .hdr .av{width:38px;height:38px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 auto;}
  .hdr .av img{width:26px;height:26px;object-fit:contain;}
  .hdr .t{flex:1;min-width:0;}
  .hdr .t .a{font-size:20px;font-weight:600;color:#e6ebf2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .hdr .t .b{font-size:14px;color:#8b97a8;margin-top:2px;}
  .hdr .r{display:flex;align-items:center;gap:12px;flex:0 0 auto;}
  .pill{font-size:15px;padding:9px 16px;border-radius:10px;background:#1a2740;color:#cdd6e4;border:1px solid rgba(255,255,255,.08);}
  .chip{font-size:15px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.05);color:#aab6c8;}
  .up{font-size:15px;color:#f4c04e;font-weight:600;}
  .lang{font-size:15px;color:#aab6c8;}

  .msgs{position:absolute;top:74px;bottom:78px;left:0;right:0;padding:34px 40px;}
  .row{display:flex;margin-bottom:26px;}
  .row.u{justify-content:flex-end;}
  .bub{max-width:78%;border-radius:18px;padding:20px 24px;font-size:23px;line-height:1.5;}
  .u .bub{background:#2b4c86;color:#eaf1ff;border-bottom-right-radius:6px;max-width:64%;}
  .a .bub{background:#161f30;color:#ccd6e4;border-bottom-left-radius:6px;}
  .bot{width:46px;height:46px;border-radius:12px;background:#1c2c4c;display:flex;align-items:center;justify-content:center;margin-right:16px;flex:0 0 auto;font-size:24px;}
  b{color:#fff;font-weight:700;}
  .h2{font-size:23px;font-weight:700;color:#e9eef5;margin:18px 0 10px;}
  ul{list-style:none;}
  li{font-size:22px;line-height:1.7;color:#b9c4d4;}
  li b{color:#e6ebf2;}
  code{font-family:Consolas,monospace;font-size:19px;background:rgba(255,255,255,.07);color:#9fb3c8;padding:3px 9px;border-radius:6px;}
  .note{margin-top:16px;color:#aeb9c9;}
  .ts{font-size:15px;color:#6b7789;margin-top:8px;}
  .u .ts{text-align:right;}

  .inp{position:absolute;bottom:0;left:0;right:0;height:78px;background:#0d1526;display:flex;align-items:center;padding:0 40px;
    border-top:1px solid rgba(255,255,255,.06);}
  .box{flex:1;height:52px;border-radius:14px;background:#131d30;display:flex;align-items:center;padding:0 20px;color:#6b7789;font-size:20px;gap:14px;}
  .box .ic{margin-left:auto;color:#8b97a8;font-size:20px;display:flex;gap:16px;}
</style></head><body>
  <div class="panel">
    <div class="hdr">
      <div class="av"><img src="${emblem}"/></div>
      <div class="t">
        <div class="a">Sprawdź, czy rachunek ${ACC}…</div>
        <div class="b">Ekspert od polskich podatków i księgowości</div>
      </div>
      <div class="r">
        <span class="pill">＋ Nowy czat</span>
        <span class="chip">⚡ Darmowy</span>
        <span class="up">Ulepsz</span>
        <span class="lang">🌐 PL ▾</span>
      </div>
    </div>

    <div class="msgs">
      <div class="row u">
        <div>
          <div class="bub">Sprawdź, czy rachunek ${ACC} należy do kontrahenta o NIP ${NIP} — chcę zapłacić fakturę na 18 400 zł.</div>
          <div class="ts">17:57</div>
        </div>
      </div>
      <div class="row a">
        <div class="bot">🤖</div>
        <div>
          <div class="bub">
            Rachunek bankowy <b>${ACC}</b> należy do kontrahenta o NIP <b>${NIP}</b> i znajduje się na <b>Białej Liście Ministerstwa Finansów</b>. Możesz bezpiecznie dokonać płatności na kwotę 18 400 zł.
            <div class="h2">Szczegóły weryfikacji:</div>
            <ul>
              <li><b>NIP:</b> ${NIP}</li>
              <li><b>Rachunek bankowy:</b> ${ACC2}</li>
              <li><b>Data weryfikacji:</b> 2026-07-15</li>
              <li><b>Identyfikator zapytania MF:</b> <code>zt2Zz-981c3bb</code></li>
            </ul>
            <div class="note">Proszę zachować identyfikator zapytania jako dowód weryfikacji na potrzeby ewentualnych kontroli.</div>
          </div>
          <div class="ts">17:57 · gpt-4o</div>
        </div>
      </div>
    </div>

    <div class="inp">
      <div class="box">🔖 Zapytaj o księgowość, podatki, wFirma…<span class="ic">🎤 ➤</span></div>
    </div>
  </div>
</body></html>`;

const htmlPath = path.join(__dirname, 'shot-chat.build.html');
fs.writeFileSync(htmlPath, html, 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1560, height: 900 }, deviceScaleFactor: 2 });
await page.goto('file:///' + htmlPath.replace(/\\/g, '/'));
await page.waitForTimeout(200);
const buf = await page.locator('.panel').screenshot();
await browser.close();
await sharp(buf).resize(1560, 900).png().toFile(path.join(__dirname, 'assets/shot-chat.png'));
fs.rmSync(htmlPath);
console.log('WROTE assets/shot-chat.png (masked)');
