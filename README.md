# barbu.at

Personal site, built with React + TypeScript + Vite and served via GitHub Pages at <https://barbu.at>.

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally
npm run lint     # oxlint
```

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes `dist/` to GitHub Pages.

One-time setup in the GitHub repo:

1. **Settings → Pages → Build and deployment → Source:** select **GitHub Actions**.
2. **Settings → Pages → Custom domain:** make sure `barbu.at` is still set (with an Actions deployment the `CNAME` file is not used; the setting is what counts).

`public/CNAME` is copied into `dist/` and only kept for reference.
