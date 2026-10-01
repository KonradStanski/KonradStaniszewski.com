import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outPath = path.resolve(__dirname, "../public/og-image.png");

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body { margin: 0; padding: 0; width: 1200px; height: 630px; }
  body {
    font-family: -apple-system, "Helvetica Neue", Inter, system-ui, sans-serif;
    color: #f8fafc;
    position: relative;
    overflow: hidden;
    background: radial-gradient(1200px 630px at 15% 20%, #a855f7 0%, transparent 60%),
                radial-gradient(900px 600px at 85% 80%, #0ea5e9 0%, transparent 55%),
                linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  }
  .dots {
    position: absolute; inset: 0;
    background-image:
      radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
      radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px);
    background-size: 28px 28px;
    background-position: 0 0, 14px 14px;
  }
  .content {
    position: absolute; inset: 0;
    padding: 80px 90px;
    display: flex; flex-direction: column; justify-content: center;
  }
  .kicker {
    font-size: 28px;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #7dd3fc;
    margin-bottom: 28px;
  }
  .name {
    font-size: 112px;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.02;
    color: #ffffff;
    margin: 0;
  }
  .tagline {
    margin-top: 36px;
    font-size: 34px;
    font-weight: 400;
    color: #cbd5e1;
    max-width: 900px;
    line-height: 1.35;
  }
  .footer {
    position: absolute;
    left: 90px; right: 90px; bottom: 60px;
    display: flex; align-items: center; justify-content: space-between;
    font-size: 24px;
    color: #94a3b8;
  }
  .footer .url { font-weight: 600; color: #e2e8f0; }
  .footer .dot { color: #7dd3fc; margin: 0 14px; }
</style>
</head>
<body>
  <div class="dots"></div>
  <div class="content">
    <div class="kicker">Software Engineer</div>
    <h1 class="name">Konrad<br/>Staniszewski</h1>
    <p class="tagline">Writing about software engineering and creative projects.</p>
  </div>
  <div class="footer">
    <span class="url">konradstaniszewski.com</span>
    <span><span class="dot">•</span>blog &nbsp;<span class="dot">•</span>projects</span>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "networkidle" });
await page.screenshot({ path: outPath, type: "png" });
await browser.close();
console.log(`Wrote ${outPath}`);
