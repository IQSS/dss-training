// comb.js — the card beside the honeycomb, and the language chips. Reads the JSON that src/render.mjs wrote
// into the page (#dss-catalogue). Without JavaScript the page still works, and better than it used to: every
// hexagon is a real link to its material, and every item is listed with its links beneath the comb.
(() => {
  const el = document.getElementById("dss-catalogue");
  if (!el) return;
  const D = JSON.parse(el.textContent);
  const card = document.getElementById("card");
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const kindLang = it => [D.kinds[it.kind], it.lang !== "tools" ? D.languages[it.lang] : null].filter(Boolean).join(" · ");
  // The card describes; it carries no links of its own. The hexagon is the link, and every material is listed
  // again with all of its links in the catalogue below the comb.
  const itemCard = it => `<p class="eyebrow">${esc(kindLang(it))}</p><h4>${esc(it.title)}</h4><p>${esc(it.blurb)}</p><p class="when">Last updated ${it.year}</p>`;

  function show(key) {
    document.querySelectorAll(".hex.on").forEach(e => e.classList.remove("on"));
    const h = document.querySelector(`.hex[data-key="${key}"]`);
    if (h) h.classList.add("on");
    if (key === "hub") {
      const b = D.hub;
      card.innerHTML = `<p class="eyebrow">${esc(b.eyebrow)}</p><h4>${esc(b.title)}</h4><p>${esc(b.text)}</p>`;
    } else if (D.items[key]) {
      card.innerHTML = itemCard(D.items[key]);
    }
  }

  // Pointing at a hexagon previews it; clicking opens it, which the browser does by itself because the hexagon
  // is an <a>. The preview is sticky: the last hexagon you passed stays in the card, so you can read it after
  // the cursor has moved away -- the card sits off to the side, so reverting on mouse-out would empty it just
  // as you moved over to read.
  // Keyboard focus previews too, so tabbing the comb reads the same way as pointing at it.
  // Touch has no hover: a first tap previews and a second tap on the same hexagon opens. Without this a phone
  // would jump straight to the material having never shown the description.
  const coarse = window.matchMedia("(hover: none)").matches;
  let pinned = null;
  document.querySelectorAll(".hex[data-key]").forEach(h => {
    const key = h.dataset.key;
    if (!coarse) h.addEventListener("mouseenter", () => show(key));
    h.addEventListener("focus", () => show(key));
    h.addEventListener("click", e => {
      if (coarse && pinned !== key) { e.preventDefault(); show(key); pinned = key; }
    });
  });

  document.querySelectorAll(".chips button").forEach(b => b.addEventListener("click", () => {
    document.body.dataset.filter = b.dataset.filter;
    document.querySelectorAll(".chips button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  }));
})();
