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

Archive images (51 JPGs) are served from `public/images/` and are sourced from:

```
UAC-1-11-10-1-1 Photocards Nigeria A box 1/
  African Architecture/   *.JPG
  African Dwellings/      *.JPG
```

If you need to re-copy them after a fresh clone:

```bash
cp "../UAC-1-11-10-1-1 Photocards Nigeria A box 1/African Architecture/"*.JPG public/images/
cp "../UAC-1-11-10-1-1 Photocards Nigeria A box 1/African Dwellings/"*.JPG public/images/
```

## Deployment

Pushes to `main` are built and deployed to GitHub Pages automatically by
`.github/workflows/deploy.yml`. The site is served at:

https://davidjboardman.github.io/west-africa-journey/

`vite.config.js` sets `base: '/west-africa-journey/'` to match the project
Pages subpath — update it if the repo is ever renamed or moved to a custom domain.
