# UAC Journey Demo

Interactive map of Jack Barker's photographic journey through West Africa, January–March 1958.
Built with React + Vite + react-leaflet.

## Running the dev server

This project requires **Node.js ≥ 22.12** (Vite 8 requirement).
If you use nvm, the `.nvmrc` file will select the right version automatically:

```bash
nvm use        # picks up .nvmrc → Node 22
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## Images

The photocard scans are 6240x4160, around 5 MB each. They are **not** served
directly — a single stop's four cards would cost roughly 20 MB, which is what
made navigation stall. Instead:

```
photo-originals/            full-resolution scans, outside public/ so they
                            are never copied into the build
public/photos/thumb/        400px wide webp  (~6 KB)  — the panel grid
public/photos/display/      1800px wide webp (~78 KB) — the lightbox
```

Regenerate the derivatives after adding or changing a photocard (needs
`brew install webp`; `sips` is built into macOS):

```bash
./scripts/build-photo-derivatives.sh
```

The script reads the card ids referenced in `src/data/archives.js`, so only
cards the journey actually uses are shipped. Together they come to about 4.6 MB,
against 413 MB for the originals.

Originals are sourced from the archive boxes alongside this repo:

```
UAC-1-11-10-1-1 Photocards Nigeria A box 1/
  African Architecture/   *.JPG
  African Dwellings/      *.JPG
UAC-1-11-10-1-12 Sierra Leone 2nd series B-G box 25/
```

To re-populate them after a fresh clone:

```bash
mkdir -p photo-originals
cp "../UAC-1-11-10-1-1 Photocards Nigeria A box 1/African Architecture/"*.JPG photo-originals/
cp "../UAC-1-11-10-1-1 Photocards Nigeria A box 1/African Dwellings/"*.JPG photo-originals/
./scripts/build-photo-derivatives.sh
```

## Basemap API key

CARTO's basemap tiles now require an API key; the keyless endpoints return tiles
stamped "API KEY REQUIRED" across the whole image.

The key is **not committed**. For local development:

```bash
cp .env.example .env.local   # then paste the key in
```

`.env.local` is gitignored via the `*.local` rule. For the GitHub Pages build,
set a repository secret named `CARTO_KEY` (Settings → Secrets and variables →
Actions); `.github/workflows/deploy.yml` passes it to Vite as `VITE_CARTO_KEY`.

Without a key the app still runs — it logs a warning and the basemap comes back
watermarked.

Note that the key is baked into the built bundle and sent with every tile
request, so it is public once deployed. Keeping it out of this repo only stops it
being scraped from public source. The control that actually protects it is
restricting it to the site's domain in the CARTO dashboard.

## Navigation timing

The map flight, the route line drawing itself, the timeline progress bar and the
info panel all run on one clock: `NAV_MS` in `src/lib/timing.js`. It is applied
to CSS as the `--nav-duration` custom property from `App.jsx`. Change it in one
place and everything stays in step.

## Deployment

Pushes to `main` are built and deployed to GitHub Pages automatically by
`.github/workflows/deploy.yml`. The site is served at:

https://davidjboardman.github.io/west-africa-journey/

`vite.config.js` sets `base: '/west-africa-journey/'` to match the project
Pages subpath — update it if the repo is ever renamed or moved to a custom domain.
