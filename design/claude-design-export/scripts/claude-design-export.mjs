#!/usr/bin/env node
/**
 * Discover Claude Design Components, write skeleton Markdown, screenshot PNGs.
 *
 *   node claude-design-export.mjs --in DIR --out DIR [--width 1440] [--skip-png] [--skip-md]
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = { width: 1440, skipPng: false, skipMd: false, in: "", out: "" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--in") out.in = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--width") out.width = Number(argv[++i]);
    else if (a === "--skip-png") out.skipPng = true;
    else if (a === "--skip-md") out.skipMd = true;
    else if (a === "--help" || a === "-h") out.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  return out;
}

function slugify(name) {
  return name
    .replace(/\.dc\.html$/i, "")
    .replace(/\.html$/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "page";
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&middot;/g, "·")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8599;/g, "↗")
    .replace(/&hellip;/g, "…")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&times;/g, "×");
}

function innerDc(html) {
  const open = html.search(/<x-dc(?:\s[^>]*)?>/i);
  const close = html.lastIndexOf("</x-dc>");
  if (open < 0 || close < 0) return html;
  const gt = html.indexOf(">", open);
  return html.slice(gt + 1, close);
}

function stripTagsKeepText(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<helmet[\s\S]*?<\/helmet>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h1|h2|h3|li|section|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

function matchAll(re, html) {
  const out = [];
  const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m;
  while ((m = r.exec(html))) out.push(m);
  return out;
}

function classify(basename, html) {
  const base = basename.replace(/\.dc\.html$/i, "");
  if (
    /logo|icon|lockup|monogram/i.test(base) ||
    /name=["']design_doc_mode["'][^>]*content=["']canvas["']/i.test(html) ||
    /content=["']canvas["'][^>]*name=["']design_doc_mode["']/i.test(html)
  ) {
    return "brand";
  }
  const hasImport = /<dc-import\b/i.test(html);
  if (/^header$/i.test(base) || (/<header[\s>]/i.test(html) && !hasImport && !/<h1[\s>]/i.test(html))) {
    return "chrome";
  }
  if (/^footer$/i.test(base) || (/<footer[\s>]/i.test(html) && !hasImport && !/<h1[\s>]/i.test(html))) {
    return "chrome";
  }
  return "page";
}

function extractSlots(html) {
  return matchAll(
    /<image-slot\b([^>]*)>/gi,
    html,
  ).map((m) => {
    const attrs = m[1];
    const id = /(?:\bid=["']([^"']+)["'])/i.exec(attrs)?.[1] || "";
    const placeholder = /placeholder=["']([^"']*)["']/i.exec(attrs)?.[1] || "";
    const idAttr = /id=["']([^"']+)["']/i.exec(attrs)?.[1] || id;
    return { id: idAttr, placeholder: decodeEntities(placeholder) };
  });
}

function extractImports(html) {
  return [...new Set(matchAll(/<dc-import\b[^>]*\bname=["']([^"']+)["']/gi, html).map((m) => m[1]))];
}

function extractHeadings(html, tag) {
  return matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi"), html).map((m) =>
    stripTagsKeepText(m[1]).replace(/\s+/g, " "),
  );
}

function extractLinks(html) {
  return matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, html)
    .map((m) => ({
      href: /href=["']([^"']+)["']/i.exec(m[1])?.[1] || "",
      label: stripTagsKeepText(m[2]).replace(/\s+/g, " "),
    }))
    .filter((x) => x.label && x.href && !x.href.includes("{{") && !x.label.includes("{{"));
}

function extractLockupsLoose(html) {
  const unique = [...new Set(matchAll(/\bid=["'](\d+[a-z])["']/gi, html).map((m) => m[1]))];
  return unique.map((id) => {
    const idx = html.search(new RegExp(`id=["']${id}["']`));
    const window = idx < 0 ? "" : html.slice(Math.max(0, idx - 120), idx + 2200);
    const labelRaw =
      /class=["'][^"']*\bdv-olabel\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(window)?.[1] || "";
    const noteRaw =
      /class=["'][^"']*\blg-note\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(window)?.[1] || "";
    return {
      id,
      label: stripTagsKeepText(labelRaw).replace(new RegExp(`^${id}\\s*`, "i"), "").trim(),
      note: stripTagsKeepText(noteRaw),
    };
  });
}

function titleFrom(file, html) {
  const h1 = extractHeadings(html, "h1")[0];
  if (h1) return h1;
  return file.replace(/\.dc\.html$/i, "");
}

function yamlQuote(s) {
  if (s == null) return '""';
  const t = String(s);
  if (/[:#{}[\],&*?]|^\s|\s$/.test(t) || t.includes("\n")) {
    return JSON.stringify(t);
  }
  return t === "" ? '""' : t;
}

function toMd(entry) {
  const { kind, source, slug, title, chrome, slots, links, h2, paragraphs, lockups } = entry;
  const lines = [
    "---",
    `page: ${yamlQuote(title)}`,
    `kind: ${kind}`,
    `source: ${yamlQuote(source)}`,
    `slug: ${slug}`,
  ];
  if (chrome.length) lines.push(`chrome: [${chrome.join(", ")}]`);
  if (slots.length) {
    lines.push("image_slots:");
    for (const s of slots) {
      lines.push(`  - { id: ${yamlQuote(s.id)}, placeholder: ${yamlQuote(s.placeholder)} }`);
    }
  }
  lines.push("---", "", `# ${title}`, "");
  if (kind === "brand" && lockups.length) {
    lines.push("## Lockups", "");
    for (const l of lockups) {
      lines.push(`### ${l.id}${l.label ? ` — ${l.label}` : ""}`);
      if (l.note) lines.push("", l.note);
      lines.push("");
    }
  } else {
    if (paragraphs.length) {
      lines.push("## Copy", "");
      for (const p of paragraphs) lines.push(p, "");
    }
    if (links.length) {
      lines.push("## Links and CTAs", "");
      for (const l of links) lines.push(`- ${l.label} → \`${l.href}\``);
      lines.push("");
    }
    if (slots.length) {
      lines.push("## Image slots", "");
      for (const s of slots) {
        lines.push(`- \`${s.id || "(no id)"}\` — ${s.placeholder || "Drop an image"}`);
      }
      lines.push("");
    }
  }
  if (h2.length && kind !== "brand") {
    lines.push("## Sections (source H2)", "");
    for (const h of h2) lines.push(`- ${h}`);
    lines.push("");
  }
  return lines.join("\n");
}

function discover(designDir) {
  const files = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name === "_ds" || ent.name.startsWith(".")) continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.dc\.html$/i.test(ent.name)) files.push(p);
    }
  }
  walk(designDir);
  files.sort((a, b) => a.localeCompare(b));
  return files.map((abs) => {
    const source = path.relative(designDir, abs);
    const html = fs.readFileSync(abs, "utf8");
    const dc = innerDc(html);
    const kind = classify(path.basename(abs), html);
    const slug = slugify(path.basename(abs));
    const title = titleFrom(path.basename(abs), dc);
    const chrome = extractImports(dc);
    const slots = extractSlots(dc);
    const links = extractLinks(dc);
    const h1 = extractHeadings(dc, "h1");
    const h2 = extractHeadings(dc, "h2");
    const lockups = kind === "brand" ? extractLockupsLoose(dc) : [];
    const paragraphs = matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, dc)
      .map((m) => stripTagsKeepText(m[1]).replace(/\s+/g, " "))
      .filter((p) => p.length > 20);
    return {
      abs,
      source,
      slug,
      kind,
      title: h1[0] || title,
      chrome,
      slots,
      links,
      h2,
      paragraphs,
      lockups,
      md: `${slug}.md`,
      png: `${slug}.png`,
    };
  });
}

function writeIndex(outDir, entries) {
  const rows = entries
    .map((e) => `| [${e.md}](${e.md}) | [${e.png}](${e.png}) | ${e.kind} | ${e.title.replace(/\|/g, "\\|")} |`)
    .join("\n");
  const md = `# Design export

Source: Claude Design Components (\`*.dc.html\`).

Use the Markdown + PNG pair together. Original HTML is only for exact CSS.

| Markdown | PNG | Kind | Title |
| --- | --- | --- | --- |
${rows}
`;
  fs.writeFileSync(path.join(outDir, "INDEX.md"), md);
}

function startServer(root) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const raw = decodeURIComponent((req.url || "/").split("?")[0]);
        const rel = raw === "/" ? "index.html" : raw.replace(/^\//, "");
        const file = path.normalize(path.join(root, rel));
        if (!file.startsWith(path.normalize(root))) {
          res.writeHead(403);
          res.end();
          return;
        }
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
          res.writeHead(404);
          res.end("not found");
          return;
        }
        const ext = path.extname(file).toLowerCase();
        const types = {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".json": "application/json",
          ".png": "image/png",
          ".svg": "image/svg+xml",
          ".woff2": "font/woff2",
        };
        res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
        fs.createReadStream(file).pipe(res);
      } catch (err) {
        res.writeHead(500);
        res.end(String(err));
      }
    });
    server.listen(0, "0.0.0.0", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
    server.on("error", reject);
  });
}

function isWsl() {
  try {
    return fs.existsSync("/proc/sys/fs/binfmt_misc/WSLInterop");
  } catch {
    return false;
  }
}

function winToWsl(p) {
  const m = String(p).trim().match(/^([A-Za-z]):\\(.*)$/);
  if (!m) return p.replace(/\\/g, "/");
  return `/mnt/${m[1].toLowerCase()}/${m[2].replace(/\\/g, "/")}`;
}

function wslToWin(p) {
  const m = p.match(/^\/mnt\/([a-z])\/(.*)$/i);
  if (!m) return p;
  return `${m[1].toUpperCase()}:\\${m[2].replace(/\//g, "\\")}`;
}

function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
    "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ];
  return candidates.find((c) => fs.existsSync(c)) || "";
}

function windowsTempDir() {
  const cmd = ["/mnt/c/Windows/System32/cmd.exe", "/mnt/c/Windows/SysWOW64/cmd.exe"].find((c) =>
    fs.existsSync(c),
  );
  if (cmd) {
    try {
      const t = execSync(`"${cmd}" /c echo %TEMP%`, { encoding: "utf8" }).trim();
      if (t && t !== "%TEMP%") return winToWsl(t);
    } catch {
      /* ignore */
    }
  }
  return os.tmpdir();
}

async function waitHttp(url, ms = 15000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status === 404) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function loadPuppeteer() {
  try {
    return await import("puppeteer-core");
  } catch {
    throw new Error(
      "puppeteer-core is missing. Run `npm install` in design/claude-design-export/scripts/",
    );
  }
}

async function launchChrome(chromePath) {
  const puppeteer = await loadPuppeteer();
  const isExe = /\.exe$/i.test(chromePath);
  const debugPort = 9222 + Math.floor(Math.random() * 1000);
  const tmpBase = isExe && isWsl() ? windowsTempDir() : os.tmpdir();
  const userData = fs.mkdtempSync(path.join(tmpBase, "cde-chrome-"));
  const userDataArg = isExe ? wslToWin(userData) : userData;
  const child = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--remote-debugging-port=${debugPort}`,
      "--remote-allow-origins=*",
      `--user-data-dir=${userDataArg}`,
      "--no-first-run",
      "--disable-extensions",
    ],
    { stdio: "ignore" },
  );
  await waitHttp(`http://127.0.0.1:${debugPort}/json/version`);
  const browser = await puppeteer.connect({
    browserURL: `http://127.0.0.1:${debugPort}`,
    defaultViewport: null,
  });
  return {
    browser,
    async close() {
      try {
        await browser.disconnect();
      } catch {
        /* ignore */
      }
      try {
        child.kill();
      } catch {
        /* ignore */
      }
    },
  };
}

const HEIGHT_CSS = `
  html, body { height: auto !important; min-height: 100% !important; }
  #dc-root, #dc-root > .sc-host { height: auto !important; min-height: 0 !important; overflow: visible !important; }
  ::-webkit-scrollbar { display: none !important; }
`;

async function waitReady(page, kind) {
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  if (kind === "page") {
    await page.waitForSelector("header", { timeout: 20000 }).catch(() => {});
    await page.waitForSelector("footer", { timeout: 20000 }).catch(() => {});
  } else if (kind === "chrome") {
    await Promise.race([
      page.waitForSelector("header", { timeout: 20000 }),
      page.waitForSelector("footer", { timeout: 20000 }),
    ]).catch(() => {});
  } else {
    await page.waitForSelector(".dv-turn, .dv-opt, header, footer", { timeout: 20000 }).catch(() => {});
  }
  await page
    .waitForFunction(
      () => [...document.images].every((img) => img.complete),
      { timeout: 15000 },
    )
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 400));
}

async function screenshotEntries({ entries, designDir, outDir, width, port }) {
  const chrome = findChrome();
  if (!chrome) {
    throw new Error("No Chrome found. Set CHROME_PATH or install Chrome.");
  }
  const session = await launchChrome(chrome);
  const page = await session.browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  try {
    for (const e of entries) {
      const url = `http://127.0.0.1:${port}/${encodeURI(e.source.split(path.sep).join("/"))}`;
      process.stdout.write(`png ${e.slug} … `);
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      await waitReady(page, e.kind);
      await page.addStyleTag({ content: HEIGHT_CSS });
      await new Promise((r) => setTimeout(r, 200));
      const dest = path.join(outDir, e.png);
      if (e.kind === "chrome") {
        const sel = (await page.$("header")) ? "header" : "footer";
        const handle = await page.$(sel);
        if (handle) {
          const box = await handle.boundingBox();
          await page.screenshot({
            path: dest,
            type: "png",
            clip: {
              x: 0,
              y: Math.max(0, box.y),
              width,
              height: Math.max(1, Math.ceil(box.height) + 2),
            },
          });
        } else {
          await page.screenshot({ path: dest, fullPage: true, type: "png" });
        }
      } else {
        await page.screenshot({ path: dest, fullPage: true, type: "png" });
      }
      if (e.kind === "brand" && e.lockups.length) {
        const dir = path.join(outDir, e.slug);
        fs.mkdirSync(dir, { recursive: true });
        e.lockupPngs = [];
        for (const l of e.lockups) {
          const node = await page.$(`[id="${l.id}"]`);
          if (!node) continue;
          const crop = path.join(dir, `${l.id}.png`);
          await node.screenshot({ path: crop, type: "png" });
          e.lockupPngs.push(`${e.slug}/${l.id}.png`);
        }
      }
      console.log(e.png);
    }
  } finally {
    await page.close().catch(() => {});
    await session.close();
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.in) {
    console.log(
      "Usage: node claude-design-export.mjs --in DIR --out DIR [--width 1440] [--skip-png] [--skip-md]",
    );
    process.exit(args.help ? 0 : 1);
  }
  const designDir = path.resolve(args.in);
  const outDir = path.resolve(args.out || path.join(designDir, "ai-export"));
  if (!fs.existsSync(designDir)) throw new Error(`Not found: ${designDir}`);
  fs.mkdirSync(outDir, { recursive: true });

  const entries = discover(designDir);
  if (!entries.length) throw new Error(`No *.dc.html under ${designDir}`);
  console.log(`discovered ${entries.length} screens`);

  if (!args.skipMd) {
    for (const e of entries) {
      fs.writeFileSync(path.join(outDir, e.md), toMd(e));
    }
    writeIndex(outDir, entries);
  }

  if (!args.skipPng) {
    const { server, port } = await startServer(designDir);
    try {
      await screenshotEntries({ entries, designDir, outDir, width: args.width, port });
    } finally {
      server.close();
    }
  }

  const manifest = {
    source: designDir,
    out: outDir,
    generatedAt: new Date().toISOString(),
    width: args.width,
    pages: entries.map((e) => ({
      source: e.source,
      slug: e.slug,
      kind: e.kind,
      title: e.title,
      md: args.skipMd ? null : e.md,
      png: args.skipPng ? null : e.png,
      lockups: e.lockupPngs || e.lockups.map((l) => l.id),
    })),
  };
  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  const missingPng = args.skipPng ? [] : entries.filter((e) => !fs.existsSync(path.join(outDir, e.png)));
  if (missingPng.length) {
    throw new Error(`Missing PNG: ${missingPng.map((e) => e.slug).join(", ")}`);
  }
  console.log(`wrote ${outDir}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
