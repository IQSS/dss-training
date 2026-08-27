// comb.js — the card beside the honeycomb, and the language chips. Reads the JSON that build/render.mjs wrote
// into the page (#dss-catalogue). Without JavaScript the page still works: every item is listed beneath the comb.
(() => {
  const el = document.getElementById("dss-catalogue");
  if (!el) return;
  const D = JSON.parse(el.textContent);
  const card = document.getElementById("card");
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const meta = it => [D.kinds[it.kind], it.lang !== "tools" ? D.languages[it.lang] : null, it.year].filter(Boolean).join(" · ");
  const link = (l, i) => `<a class="dss-btn${i ? " ghost" : ""}" href="${l.url}">${esc(l.text)}</a>`;
  const itemCard = it => `<p class="eyebrow">${esc(meta(it))}</p><h4>${esc(it.title)}</h4><p>${esc(it.blurb)}</p><div class="links">${it.links.map(link).join("")}</div>`;
  const rows = ids => `<ul class="rows">${ids.map(id => { const it = D.items[id]; return `<li><a href="${it.links[0].url}">${esc(it.title)}</a><span>${esc(meta(it))}</span></li>`; }).join("")}</ul>`;

  function show(key) {
    document.querySelectorAll(".hex.on").forEach(e => e.classList.remove("on"));
    const el = document.querySelector(`.hex[data-key="${key}"]`);
    if (el) el.classList.add("on");
    if (key === "hub") {
      const h = D.hub;
      card.innerHTML = `<p class="eyebrow">${esc(h.eyebrow)}</p><h4>${esc(h.title)}</h4><p>${esc(h.text)}</p><div class="links"><a class="dss-btn" href="${D.urls.request}">${esc(h.button)}</a></div>`;
    } else if (D.groups[key]) {
      const g = D.groups[key];
      card.innerHTML = `<p class="eyebrow">${g.items.length} items</p><h4>${esc(g.hex.replace(/\|/g, " "))}</h4><p>${esc(g.blurb)}</p>${rows(g.items)}`;
    } else if (D.items[key]) {
      card.innerHTML = itemCard(D.items[key]);
    }
  }
  document.querySelectorAll(".hex[data-key]").forEach(h => {
    const go = () => show(h.dataset.key);
    h.addEventListener("click", go);
    h.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });
  document.querySelectorAll(".chips button").forEach(b => b.addEventListener("click", () => {
    document.body.dataset.filter = b.dataset.lang;
    document.querySelectorAll(".chips button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  }));
})();
