# Netlify setup notes

1. Connect the GitHub repository to Netlify
   - In Netlify, choose "New site from Git" and connect your GitHub account (Dcee-boop or the org repo).
   - Select the repository and branch you want to auto-deploy (e.g. `main`).

2. Build settings
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Netlify will use `netlify.toml` to pick up the Next.js plugin.

3. Install plugin locally (recommended)
   - Run: `npm install -D @netlify/plugin-nextjs`
   - Commit `package.json` changes so Netlify can install the plugin during build.

4. If you prefer deploys via GitHub Actions (optional)
   - Create a Netlify Personal Access Token in Netlify (User settings -> Applications).
   - Add two GitHub repo secrets: `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`.
   - I can add an example GitHub Action workflow that uses `npx netlify-cli` to deploy when you want.

5. Notes about Next.js features
   - If your site uses SSR/Edge functions, the `@netlify/plugin-nextjs` plugin is recommended.
   - If your site is a static export, you can set `next export` and publish the `out` folder instead.

If you want, I can also:
- Add the `@netlify/plugin-nextjs` devDependency to `package.json` now.
- Create a GitHub Actions workflow that deploys using Netlify CLI (you'll need to add the two secrets).
