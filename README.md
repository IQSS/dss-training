# DSS training materials

The training index of [IQSS Data Science Services](https://www.iq.harvard.edu/data-science-services): every workshop and beginner's guide we have published, on one page, at **https://iqss.github.io/dss-training/**.

The page is built from one file, `catalogue.yml`. Each entry is a workshop or guide with its title, language, year, a one-sentence description, and links; the build draws the honeycomb, the card beside it, and the catalogue beneath from those entries.

## Adding or changing a material

1. Add an entry under `items` in `catalogue.yml`. The fields are described at the top of the file; `icon` is any [Lucide](https://lucide.dev/icons) icon name; `hex` is the label on the hexagon, with `|` where the line breaks.
2. Give it a hexagon: put its id in one of the `comb.rows` (rows hold seven), or in a group's `items` if it shares a hexagon with something else.
3. Put its id in `workshops` (under the right language) or in `guides`.
4. Push to `main`. The site rebuilds and deploys itself in about a minute.

The build fails with a message if an item is missing from the comb or the lists, or names an icon that does not exist.

## Building locally

Requires [Quarto](https://quarto.org/) and Node 20 or later.

```sh
npm ci            # once: the icon set and the YAML reader
npm run build     # once: writes the generated parts to _includes/
quarto preview    # builds, serves, and rebuilds on save
quarto render     # builds to _site/
```

`quarto render` runs `node src/render.mjs` itself before each render, but it looks for the included files before that step runs, so the first build on a fresh checkout needs `npm run build` once.

## How it is put together

- `index.qmd` holds the page's prose and includes the generated parts.
- `src/render.mjs` turns `catalogue.yml` into the honeycomb (an inline SVG), the catalogue rows, and the link lists.
- `assets/comb.js` fills the card when a hexagon is clicked and applies the language chips. Without JavaScript the page still lists everything.
- `theme.scss` carries the look, matched to the IQSS site.
- `.github/workflows/publish.yml` deploys to GitHub Pages on every push to `main`.

Icons are from [Lucide](https://lucide.dev/) (ISC license).
