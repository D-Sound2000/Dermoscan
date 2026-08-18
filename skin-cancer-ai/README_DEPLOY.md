# Deploying DermoScan (local & CI)

Quick steps to run locally using Docker Compose:

1. Copy `.env.example` to `.env` and fill values (e.g. `CHECKPOINT_PATH`).
2. Ensure `best_model.pth` is present in the `skin-cancer-ai` directory or update `CHECKPOINT_PATH`.
3. Run:

```bash
docker compose up --build
```

This exposes the backend at `http://localhost:8000` and the frontend at `http://localhost:3000`.

CI / Production notes
- Backend: the repository already contains `Dockerfile` and `railway.toml` — you can deploy the backend to Railway using the Dockerfile-based deployment.
- Frontend: deploy the Next.js frontend to Vercel (recommended) or build a Docker image and run behind a node server.

Secrets and env vars
- Set `GEMINI_API_KEY` for the chat support endpoint if you want AI-powered explanations.
- `CHECKPOINT_PATH` should reference an accessible checkpoint file — include it in your image or mount from provider storage.

Runtime model provisioning
- You can either commit `best_model.pth` into the repository (not recommended for large files) or host it in an object store (S3, Google Cloud Storage) and set `CHECKPOINT_URL` to the file URL. The server will attempt to download the checkpoint at startup when `CHECKPOINT_URL` is provided.

Automatic deploy (what I configured)
- Frontend: GitHub Actions deploy to Vercel. Add these repository secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- Backend: CI builds and pushes images to GitHub Container Registry (see `.github/workflows/build-and-push.yml`). You can configure Railway to deploy the backend from the GHCR image (recommended) or provide `RAILWAY_API_KEY` for the Railway CLI to deploy from the image.

Required GitHub secrets for full automation
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — for frontend auto-deploy.
- `GEMINI_API_KEY` — enables `/api/chat` functionality (optional).
- `CHECKPOINT_URL` — (optional) if you want the backend to download the model at startup; otherwise ensure the model is present in the deployment image or mounted volume.

Railway notes
- Connect your repository in Railway or create a service that pulls the image from `ghcr.io/<owner>/dermoscan-backend:latest` (the CI pushes images there). Set `CHECKPOINT_URL` and other env vars in Railway service settings.

