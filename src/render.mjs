// render.mjs — builds the page's generated parts from catalogue.yml. Quarto runs it before every render
// (project.pre-render in _quarto.yml); `node src/render.mjs` runs it alone. Writes into _includes/ (gitignored):
// comb.qmd (the language chips, the honeycomb, the card beside it, and the JSON the card script reads),
// workshops.qmd and guides.qmd (the catalogue rows), elsewhere.qmd (the link lists). Icons are Lucide, read from
// lucide-static in node_modules; the hex labels are live Montserrat text in the SVG. Fails loudly on a catalogue
// error: an unknown id, an item with no hex, an item missing from the catalogue lists.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "_includes");
const cat = parse(readFileSync(join(ROOT, "catalogue.yml"), "utf8"));
const items = Object.fromEntries(cat.items.map(i => [i.id, i]));
const groups = Object.fromEntries((cat.comb.groups || []).map(g => [g.id, g]));
const LANG = cat.languages;
const CHARCOAL = "#4A4A4A";

// ---- checks ----
const fail = msg => { throw new Error("catalogue.yml: " + msg); };
const seenInComb = new Map();
for (const row of cat.comb.rows) for (const slot of row) {
  if (slot === "hub") continue;
  const ids = groups[slot] ? groups[slot].items : items[slot] ? [slot] : fail(`unknown id in comb.rows: ${slot}`);
  for (const id of ids) { if (!items[id]) fail(`unknown id in group ${slot}: ${id}`); seenInComb.set(id, (seenInComb.get(id) || 0) + 1); }
}
const seenInList = new Map();
for (const id of [...cat.workshops.flatMap(w => w.items), ...cat.guides]) { if (!items[id]) fail(`unknown id in workshops/guides: ${id}`); seenInList.set(id, (seenInList.get(id) || 0) + 1); }
for (const it of cat.items) {
  if (!seenInComb.has(it.id)) fail(`${it.id} has no hex: add it to a comb row or a group`);
  if (seenInComb.get(it.id) > 1) fail(`${it.id} appears in the comb more than once`);
  if (!seenInList.has(it.id)) fail(`${it.id} is not in workshops or guides`);
  if (!LANG[it.lang]) fail(`${it.id}: unknown lang ${it.lang}`);
  if (!cat.kinds[it.kind]) fail(`${it.id}: unknown kind ${it.kind}`);
  if (!it.links?.length) fail(`${it.id}: needs at least one link`);
}
for (const l of [...cat.elsewhere.harvard, ...cat.elsewhere.afield]) {
  const extra = Object.keys(l).filter(k => !["title", "text", "url"].includes(k));
  if (extra.length || !l.title || !l.url) fail(`elsewhere entry ${JSON.stringify(l)}: only title, text, url are allowed (quote a value that contains a comma)`);
}

// ---- drawing ----
const R = 100, W = Math.sqrt(3) * R;
const f1 = v => v.toFixed(1);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const mix = (hex, f, to = 255) => { // f of the color, the rest white (or black)
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * f + to * (1 - f)));
  return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
};
const darken = hex => mix(hex, 0.78, 0);
function icon(name, size, stroke) {
  let src;
  try { src = readFileSync(join(ROOT, "node_modules", "lucide-static", "icons", name + ".svg"), "utf8"); }
  catch { fail(`no Lucide icon named ${name} (see lucide.dev/icons)`); }
  const start = src.indexOf("<svg"), open = src.indexOf(">", start), close = src.lastIndexOf("</svg>");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f1(size)}" height="${f1(size)}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${src.slice(open + 1, close).trim()}</svg>`;
}
const pts = (cx, cy, r) => Array.from({ length: 6 }, (_, k) => { const a = Math.PI / 180 * (60 * k - 30); return f1(cx + r * Math.cos(a)) + "," + f1(cy + r * Math.sin(a)); }).join(" ");
function hex({ cx, cy, fill, stroke, ink, label, iconName, big = false, badge = null, key, langs, kinds, title }) {
  const r = R * 0.95, lines = label.split("|"), fs = R * (big ? 0.19 : lines.length > 2 ? 0.15 : 0.165), isz = R * (big ? 0.66 : 0.6);
  const y0 = cy + R * (lines.length === 1 ? 0.3 : lines.length === 2 ? 0.2 : 0.14) + fs;
  return `<g class="hex" data-key="${key}" data-lang="${langs}" data-kind="${kinds}" tabindex="0" role="button" aria-label="${esc(title)}">` +
    `<polygon points="${pts(cx, cy, r)}" fill="${fill}" stroke="${stroke}" stroke-width="${f1(R * 0.04)}" stroke-linejoin="round"/>` +
    `<g transform="translate(${f1(cx - isz / 2)} ${f1(cy - R * 0.64)})">${icon(iconName, isz, ink)}</g>` +
    `<text x="${f1(cx)}" y="${f1(y0)}" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="${big ? 600 : 500}" font-size="${f1(fs)}" fill="${ink}">` +
    lines.map((l, i) => `<tspan x="${f1(cx)}" dy="${i ? f1(fs * 1.18) : 0}">${esc(l)}</tspan>`).join("") + `</text>` +
    (badge ? `<circle cx="${f1(cx + 0.5 * R)}" cy="${f1(cy - 0.42 * R)}" r="15" fill="#fff" stroke="${stroke}" stroke-width="2"/>` +
      `<text x="${f1(cx + 0.5 * R)}" y="${f1(cy - 0.42 * R + 5.5)}" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="600" font-size="15" fill="${fill}">${badge}</text>` : "") +
    `</g>`;
}
function comb() {
  const rows = cat.comb.rows, width = (Math.max(...rows.map(r => r.length)) + 0.5) * W, height = (1.5 * rows.length + 0.5) * R;
  const out = [];
  rows.forEach((row, ri) => row.forEach((slot, ci) => {
    const cx = W / 2 + ci * W + (ri % 2 ? W / 2 : 0), cy = R + ri * 1.5 * R;
    if (slot === "hub") {
      const h = cat.comb.hub;
      return out.push(hex({ cx, cy, fill: "#fff", stroke: CHARCOAL, ink: CHARCOAL, label: h.hex, iconName: h.icon, big: true, key: "hub", langs: Object.keys(LANG).join(" "), kinds: Object.keys(cat.kinds).join(" "), title: h.title }));
    }
    const g = groups[slot];
    if (g) { const col = LANG[g.lang].color; return out.push(hex({ cx, cy, fill: col, stroke: darken(col), ink: "#fff", label: g.hex, iconName: g.icon, badge: g.items.length, key: g.id, langs: g.lang, kinds: [...new Set(g.items.map(id => items[id].kind))].join(" "), title: `${g.hex.replace(/\|/g, " ")}: ${g.items.length} items` })); }
    const it = items[slot], col = LANG[it.lang].color;
    out.push(hex({ cx, cy, fill: col, stroke: darken(col), ink: "#fff", label: it.hex, iconName: it.icon, key: it.id, langs: it.lang, kinds: it.kind, title: it.title }));
  }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f1(width)} ${f1(height)}" role="group" aria-label="Our workshops and guides, one hexagon each, and a request for a workshop of your own in the center">${out.join("")}</svg>`;
}

// ---- the page parts ----
// Links to materials and to other groups' sites open in a new tab (this page is an index, and stays put); links to
// DSS's and IQSS's own pages, in the navbar, footer, and the events band, stay in the tab. The card script does the same.
const qmd = html => "```{=html}\n" + html + "\n```\n";
const chip = (v, l, on = false) => `<button type="button" data-filter="${v}" aria-pressed="${on}">${esc(l)}</button>`;
const chips = `<div class="chips" role="group" aria-label="Show only"><span class="lbl">Show</span>` + chip("all", "All", true) +
  Object.entries(LANG).map(([k, v]) => chip("lang:" + k, v.name)).join("") + `<span class="sep" aria-hidden="true"></span>` +
  Object.entries(cat.kinds).map(([k, v]) => chip("kind:" + k, v + "s")).join("") + `</div>`;
const data = { languages: Object.fromEntries(Object.entries(LANG).map(([k, v]) => [k, v.name])), kinds: cat.kinds, urls: cat.urls, items, groups, hub: cat.comb.hub };
const combPart = chips +
  `<div class="stage"><div class="graphic">${comb()}</div><div class="hexcard" id="card" aria-live="polite"><p class="eyebrow">How this works</p><h4><span class="arrow">${icon("arrow-left", 22, "#1e1e1e")}</span>Click a hexagon</h4><p>Each one is a workshop or a guide. Click it and its description and links appear here. The buttons above the grid filter by language or by kind; the center hexagon is for groups who would like a workshop of their own, when live workshops return in 2027.</p></div></div>` +
  `<script type="application/json" id="dss-catalogue">${JSON.stringify(data).replace(/</g, "\\u003c")}</script><script src="assets/comb.js" defer></script>`;

const SHORT = { "Open the notes": "Notes", "Download the materials (zip)": "Materials (zip)", "Code on GitHub": "Code", "Data on Dataverse": "Data" };
const row = (it, showLang) => `<article class="item" data-lang="${it.lang}" data-kind="${it.kind}">
  <h4><a href="${it.links[0].url}" target="_blank" rel="noopener">${esc(it.title)}</a></h4>
  <p class="meta"><i class="dot" style="background:${LANG[it.lang].color}"></i>${[showLang && it.lang !== "tools" ? LANG[it.lang].name : null, cat.kinds[it.kind].toLowerCase(), it.year].filter(Boolean).join(" · ")}</p>
  <p>${esc(it.blurb)}</p>
  <p class="rowlinks">${it.links.map(l => `<a href="${l.url}" target="_blank" rel="noopener">${esc(SHORT[l.text] || l.text)}</a>`).join("")}</p>
</article>`;
const workshopsPart = cat.workshops.map(w => `<h3 class="sub" data-lang="${w.lang}" data-kind="workshop">${esc(w.heading)}</h3><div class="rows2">${w.items.map(id => row(items[id], false)).join("")}</div>`).join("");
const guidesPart = `<div class="rows2">${cat.guides.map(id => row(items[id], true)).join("")}</div>`;
const linkList = list => `<ul class="elsewhere">${list.map(l => `<li><a href="${l.url}" target="_blank" rel="noopener">${esc(l.title)}</a><span>${esc(l.text)}</span></li>`).join("")}</ul>`;
const elsewherePart = linkList(cat.elsewhere.harvard) + `<h3 class="sub">Further afield</h3>` + linkList(cat.elsewhere.afield);

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "comb.qmd"), qmd(combPart));
writeFileSync(join(OUT, "workshops.qmd"), qmd(workshopsPart));
writeFileSync(join(OUT, "guides.qmd"), qmd(guidesPart));
writeFileSync(join(OUT, "elsewhere.qmd"), qmd(elsewherePart));
console.log(`render.mjs: ${cat.items.length} items, ${cat.comb.rows.flat().length} hexagons, written to _includes/`);
