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

/** Slug from path relative to the design root (handles nested duplicates). */
function slugFromSource(sourceRel) {
  return slugify(sourceRel.replace(/\.dc\.html$/i, "").split(/[\\/]+/).join("-"));
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
  if (/^header$/i.test(base) || /^footer$/i.test(base)) return "chrome";

  // Standalone chrome only: one of header/footer, no page imports, no page headings/sections.
  const hasImport = /<dc-import\b/i.test(html);
  if (!hasImport) {
    const hasHeader = /<header[\s>]/.test(html);
    const hasFooter = /<footer[\s>]/.test(html);
    const hasPageStructure = /<h[12][\s>]|<section[\s>]/i.test(html);
    if (hasHeader && !hasFooter && !hasPageStructure) return "chrome";
    if (hasFooter && !hasHeader && !hasPageStructure) return "chrome";
  }
  return "page";
}

function extractImports(html) {
  return [...new Set(matchAll(/<dc-import\b[^>]*\bname=["']([^"']+)["']/gi, html).map((m) => m[1]))];
}

function extractHeadings(html, tag) {
  return matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi"), html).map((m) =>
    stripTagsKeepText(m[1]).replace(/\s+/g, " "),
  );
}

/** Reading-order blocks for Markdown body generation. */
function extractBlocks(html) {
  const blocks = [];
  const re =
    /<(h1|h2|p)\b[^>]*>([\s\S]*?)<\/\1>|<a\b([^>]*)>([\s\S]*?)<\/a>|<image-slot\b([^>]*)>(?:[\s\S]*?<\/image-slot>)?/gi;
  let m;
  while ((m = re.exec(html))) {
    if (m[1]) {
      const text = stripTagsKeepText(m[2]).replace(/\s+/g, " ");
      if (!text) continue;
      if (m[1] === "p" && text.length <= 20) continue;
      blocks.push({ type: m[1], text });
      continue;
    }
    if (m[3] != null) {
      const href = /href=["']([^"']+)["']/i.exec(m[3])?.[1] || "";
      const label = stripTagsKeepText(m[4]).replace(/\s+/g, " ");
      if (label && href && !href.includes("{{") && !label.includes("{{") && !href.startsWith("#")) {
        blocks.push({ type: "a", label, href });
      }
      continue;
    }
    if (m[5] != null) {
      const attrs = m[5];
      const id = /id=["']([^"']+)["']/i.exec(attrs)?.[1] || "";
      const placeholder = decodeEntities(/placeholder=["']([^"']*)["']/i.exec(attrs)?.[1] || "");
      blocks.push({ type: "slot", id, placeholder });
    }
  }
  return blocks;
}

/** Lockups: only `.dv-opt` elements with ids like `3a`. */
function extractLockups(html) {
  const ids = [
    ...matchAll(
      /<[^>]*\bclass=["'][^"']*\bdv-opt\b[^"']*["'][^>]*\bid=["'](\d+[a-z])["']/gi,
      html,
    ).map((m) => m[1]),
    ...matchAll(
      /<[^>]*\bid=["'](\d+[a-z])["'][^>]*\bclass=["'][^"']*\bdv-opt\b[^"']*["']/gi,
      html,
    ).map((m) => m[1]),
  ];
  const unique = [...new Set(ids)];
  return unique.map((id) => {
    const idx = html.search(new RegExp(`\\bid=["']${id}["']`));
    // Only look forward from the id so we do not pick a previous sibling's note.
    const after = idx < 0 ? "" : html.slice(idx, idx + 2200);
    const labelRaw =
      /class=["'][^"']*\bdv-olabel\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(after)?.[1] || "";
    const noteRaw =
      /class=["'][^"']*\blg-note\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(after)?.[1] || "";
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
  const { kind, source, slug, title, chrome, blocks, lockups } = entry;
  const slots = blocks.filter((b) => b.type === "slot");
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
  }

  for (const b of blocks) {
    if (b.type === "h1") continue;
    if (b.type === "h2") {
      lines.push(`## ${b.text}`, "");
      continue;
    }
    if (b.type === "p") {
      lines.push(b.text, "");
      continue;
    }
    if (b.type === "a") {
      lines.push(`- ${b.label} → \`${b.href}\``, "");
      continue;
    }
    if (b.type === "slot") {
      lines.push(
        `- Image slot \`${b.id || "(no id)"}\` — ${b.placeholder || "Drop an image"}`,
        "",
      );
    }
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

  const seenSlugs = new Map();
  return files.map((abs) => {
    const source = path.relative(designDir, abs);
    const html = fs.readFileSync(abs, "utf8");
    const dc = innerDc(html);
    const kind = classify(path.basename(abs), html);
    const slug = slugFromSource(source);
    if (seenSlugs.has(slug)) {
      throw new Error(
        `Duplicate slug "${slug}" for ${source} and ${seenSlugs.get(slug)}. Rename one of the sources.`,
      );
    }
    seenSlugs.set(slug, source);
    const blocks = extractBlocks(dc);
    const title =
      blocks.find((b) => b.type === "h1")?.text || titleFrom(path.basename(abs), dc);
    const chrome = extractImports(dc);
    const lockups = kind === "brand" ? extractLockups(dc) : [];
    return {
      abs,
      source,
      slug,
      kind,
      title,
      chrome,
      blocks,
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

function isInsideRoot(root, candidate) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  const rel = path.relative(resolvedRoot, resolved);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function startServer(root) {
  const resolvedRoot = path.resolve(root);
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const raw = decodeURIComponent((req.url || "/").split("?")[0]);
        const rel = raw === "/" ? "index.html" : raw.replace(/^\//, "");
        if (rel.split(/[\\/]/).includes("..")) {
          res.writeHead(403);
          res.end();
          return;
        }
        const file = path.resolve(resolvedRoot, rel);
        if (!isInsideRoot(resolvedRoot, file)) {
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
    // Loopback only — Windows Chrome on mirrored WSL still reaches 127.0.0.1.
    server.listen(0, "127.0.0.1", () => {
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

  const cleanupFailedStart = () => {
    try {
      child.kill();
    } catch {
      /* ignore */
    }
    try {
      fs.rmSync(userData, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  };

  try {
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
        try {
          fs.rmSync(userData, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
      },
    };
  } catch (err) {
    cleanupFailedStart();
    throw err;
  }
}

const HEIGHT_CSS = `
  html, body { height: auto !important; min-height: 100% !important; }
  #dc-root, #dc-root > .sc-host { height: auto !important; min-height: 0 !important; overflow: visible !important; }
  ::-webkit-scrollbar { display: none !important; }
`;

async function waitReady(page, kind) {
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  // DC boot replaces <x-dc> with #dc-root.
  await page.waitForSelector("#dc-root", { timeout: 20000 });
  if (kind === "page") {
    await page.waitForSelector("header", { timeout: 20000 });
    await page.waitForSelector("footer", { timeout: 20000 });
  } else if (kind === "chrome") {
    await Promise.race([
      page.waitForSelector("header", { timeout: 20000 }),
      page.waitForSelector("footer", { timeout: 20000 }),
    ]);
  } else {
    await page.waitForSelector(".dv-turn, .dv-opt", { timeout: 20000 });
  }
  await page.waitForFunction(() => [...document.images].every((img) => img.complete), {
    timeout: 15000,
  });
  await new Promise((r) => setTimeout(r, 400));
}

async function screenshotEntries({ entries, outDir, width, port }) {
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
        const box = handle ? await handle.boundingBox() : null;
        if (handle && box) {
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
          const node = await page.$(`.dv-opt[id="${l.id}"]`);
          if (!node) {
            throw new Error(`Missing lockup node: ${e.slug}/${l.id}`);
          }
          const crop = path.join(dir, `${l.id}.png`);
          await node.screenshot({ path: crop, type: "png" });
          if (!fs.existsSync(crop)) {
            throw new Error(`Missing lockup crop: ${crop}`);
          }
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
      await screenshotEntries({ entries, outDir, width: args.width, port });
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

  if (!args.skipPng) {
    const missingPng = entries.filter((e) => !fs.existsSync(path.join(outDir, e.png)));
    if (missingPng.length) {
      throw new Error(`Missing PNG: ${missingPng.map((e) => e.slug).join(", ")}`);
    }
    const missingLockups = [];
    for (const e of entries) {
      if (e.kind !== "brand" || !e.lockups.length) continue;
      for (const l of e.lockups) {
        const crop = path.join(outDir, e.slug, `${l.id}.png`);
        if (!fs.existsSync(crop)) missingLockups.push(`${e.slug}/${l.id}.png`);
      }
    }
    if (missingLockups.length) {
      throw new Error(`Missing lockup crops: ${missingLockups.join(", ")}`);
    }
  }
  console.log(`wrote ${outDir}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
