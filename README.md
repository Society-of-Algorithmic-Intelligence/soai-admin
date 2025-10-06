## SoAI Admin

Admin console for managing members, news, and events.

### Stack
- React 19 + Vite + TypeScript
- Tailwind CSS 4 + shadcn/ui components
- Router: `react-router-dom` (SPA)

### Requirements
- Node.js 20+
- Backend API URL (Cloudflare Worker): set `VITE_API_BASE`

### Development
```bash
npm ci
echo VITE_API_BASE=http://127.0.0.1:8787 > .env
npm run dev
```

### Build & Preview
```bash
npm run build
npm run preview
```

### Environment
- `VITE_API_BASE` (required): absolute base URL of the backend (e.g., `https://soai-be.soc-ai.workers.dev`).
  - Note: VITE_* values are public in the built bundle. Do not put secrets here.

### Deploy to GitHub Pages
Vite base is set to `/soai-admin/`; router uses `basename={import.meta.env.BASE_URL}`.

1) Add a repo Secret or Variable `VITE_API_BASE` to GitHub → Settings → Actions → Secrets and variables.
2) Workflow example (`.github/workflows/deploy.yml`):
```yaml
name: Deploy
on: { push: { branches: [ main ] }, workflow_dispatch: {} }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
        env: { VITE_API_BASE: ${{ secrets.VITE_API_BASE }} }
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4
```

SPA fallback: `public/404.html` redirects to `/soai-admin/` to avoid 404 on deep links.

### Auth (email code)
1) Enter admin email → request code (`POST /api/admin/login/request`).
2) Verify code → token stored → admin routes use `Authorization: Bearer <token>`.

### Troubleshooting
- Requests go to `github.io` instead of backend: set `VITE_API_BASE` at build time.
- 404 on refresh: ensure 404.html exists and Vite base is `/soai-admin/`.

