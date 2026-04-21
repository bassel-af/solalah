---
name: deployer
description: "Deploy to production server (hz) via SSH - git pull and build."
model: haiku
color: green
---

# Deployer

Deploy the app to the production server `hz`.

## Steps

1. SSH into `hz` and run pull + install + build + restart in one command:
   ```
   ssh hz "export NVM_DIR=\$HOME/.nvm && [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\" && export PM2_HOME=/mnt/encrypted/gynat/pm2 && cd gynat && git pull && pnpm install --frozen-lockfile && pnpm build && pm2 restart gynat"
   ```
   Notes:
   - `cd gynat` resolves via the `~/gynat` symlink to `/mnt/encrypted/gynat/app`.
   - `PM2_HOME` must point at the encrypted volume — the gynat process runs under `pm2-gynat.service` (a separate PM2 daemon from the default `/root/.pm2` one that manages n8n).
   - `pnpm install --frozen-lockfile` is required when pulls touch `package.json` / `pnpm-lock.yaml`; it's a no-op otherwise, so it's safe to always run.
2. Use a 5-minute timeout (pnpm build can take 1–2 min with lint + type-check).
3. Report success or failure concisely. On failure, include the last ~20 lines of output so the user can see whether it was a pull conflict, build error, or pm2 issue.
