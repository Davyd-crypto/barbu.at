# barbu.at

Personal site, built with React + TypeScript + Vite and served via GitHub Pages at <https://barbu.at>.

## Development

```sh
npm install
npm run dev         # local dev server, /prototypes opens without a password
npm run dev:locked  # local dev server, /prototypes asks for the password like on barbu.at
npm run build       # type-check + production build into dist/ (needs PROTOTYPES_PASSWORD)
npm run preview     # serve the production build locally
npm run lint        # oxlint
```

## /prototypes

Password-protected area. There is no backend, so the content is protected by encryption instead of a login check:

- `src/prototypes/` is built separately (`vite.prototypes.config.ts`) and encrypted with `PROTOTYPES_PASSWORD` (PBKDF2-SHA256, 600,000 iterations → AES-256-GCM) into `dist/prototypes.bin`. The plaintext bundle is never written to disk and is not part of the public JS.
- The page asks for the password and decrypts in the browser. A wrong password cannot decrypt anything.
- Add a prototype: create a component in `src/prototypes/` and register it in `PROTOTYPES` in `src/prototypes/index.tsx`. It can use `react`, `react-dom` and `react-router` (shared with the main app); avoid dynamic `import()` there, the bundle must be a single file.

Limits:

- The source in `src/prototypes/` is readable by anyone in this public repository. The password only protects the deployed site.
- `prototypes.bin` is public, so the password can be guessed offline. The build requires at least 6 characters; a long random password (16+ characters) is much harder to guess.

### Password

The password lives in two places, both set by you and never committed:

- **Locally:** copy `.env.example` to `.env` or `.env.local` and fill in `PROTOTYPES_PASSWORD` (both are gitignored). Used by `npm run build` and `npm run dev:locked`.
- **GitHub Actions:** repository secret `PROTOTYPES_PASSWORD` (Settings → Secrets and variables → Actions). Without it the deploy build fails.

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes `dist/` to GitHub Pages.

One-time setup in the GitHub repo:

1. **Settings → Pages → Build and deployment → Source:** select **GitHub Actions**.
2. **Settings → Pages → Custom domain:** make sure `barbu.at` is still set (with an Actions deployment the `CNAME` file is not used; the setting is what counts).
3. **Settings → Secrets and variables → Actions:** add `PROTOTYPES_PASSWORD`.

`public/CNAME` is copied into `dist/` and only kept for reference. Deep links (e.g. `/prototypes/example`) work through `404.html`, which the build copies from `index.html`.
