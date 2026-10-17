# Deploying DermoScan (local & CI)

Quick steps to run locally using Docker Compose:

1. Copy `.env.example` to `.env` and fill values (e.g. `CHECKPOINT_PATH`).
2. Ensure `best_model.pth` is present in the `skin-cancer-ai` directory or update `CHECKPOINT_PATH`.
3. Run:

```bash
docker compose up --build
```

This exposes the backend at `http://localhost:8000` and the frontend at `http://localhost:3000`.

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` before
building to use real accounts. These values are embedded in the frontend
bundle; changing them requires rebuilding. Without them the existing local
demo client is used. Compose connects the frontend proxy to `http://backend:8000`
and passes `GEMINI_API_KEY` to the model service for report chat.

The current frontend includes `/model-card` and `/report?mole=<label>`. Check
both after deploying; an older deployment may not contain those routes.

For the existing Vercel Services configuration, deploy from `skin-cancer-ai/`,
where `vercel.json` describes both the Next.js frontend and FastAPI model.
Deploying only `frontend/` does not update the model's heatmap code. Confirm
the project and team before deploying, stage production with `--skip-domain`,
verify the staged build, and promote it to update the recording URL.
The model uses the Docker container runtime because the CPU PyTorch dependency
bundle exceeds the standard Python function limit. Set `PORT=8000` on the Vercel
project so its container router matches the backend's listening port.

Report assistant configuration
- Set `OPENROUTER_API_KEY` as a server Secret to use the default free Nemotron
  3.5 Lightning model, with a free Nemotron 3 Super fallback. The application
  rejects paid OpenRouter model IDs instead of silently switching to them.
- Alternatively set `GROQ_API_KEY` and `CHAT_PROVIDER=groq`. The default Groq
  model is `openai/gpt-oss-20b`; account usage limits still apply.
- `CHAT_PROVIDER=auto` chooses OpenRouter, then Groq, then the existing Gemini
  integration according to which server keys are configured. It does not switch
  between providers during a failed request.
- The same report-grounded instructions prohibit diagnosis, disease-probability
  interpretations of raw scores, invented image findings, and tumor-boundary
  claims about Grad-CAM. Empty responses and provider failures produce an error,
  not a fabricated AI reply. Free-model availability is not guaranteed.

The GitHub deployment workflow uses pinned Vercel CLI 64.5.0. Configure
`VERCEL_TOKEN` as a repository secret, and `VERCEL_ORG_ID` and
`VERCEL_PROJECT_ID` as repository variables (existing secrets with these ID
names also work). These credentials are not created or committed by the app.
The container workflow normalizes the GHCR owner to lowercase and needs
package write permission. To embed real auth in the published frontend image,
set the two `NEXT_PUBLIC_SUPABASE_*` repository variables as well.

Regression checks for rectangular heatmap alignment:

```bash
python -m unittest discover -s tests -v
```

Lesion history displays the `predicted_class` saved with each scan rather than
reclassifying its score using a separate threshold. Existing scan rows need
no migration for this change.

CI / Production notes
- Backend: the repository already contains `Dockerfile` and `railway.toml` — you can deploy the backend to Railway using the Dockerfile-based deployment.
- Frontend: deploy the Next.js frontend to Vercel (recommended) or build a Docker image and run behind a node server.

Secrets and env vars
- Set `GEMINI_API_KEY` for the chat support endpoint if you want AI-powered explanations.
- `CHECKPOINT_PATH` should reference an accessible checkpoint file — include it in your image or mount from provider storage.

Runtime model provisioning
- You can either commit `best_model.pth` into the repository (not recommended for large files) or host it in an object store (S3, Google Cloud Storage) and set `CHECKPOINT_URL` to the file URL. The server will attempt to download the checkpoint at startup when `CHECKPOINT_URL` is provided.

Automatic deploy
- Vercel: GitHub Actions deploy the frontend and model together using the Services configuration. Configure the credentials described above for the intended project.
- Containers: CI builds and pushes images to GitHub Container Registry (see `.github/workflows/build-and-push.yml`). Railway can be configured separately to pull the backend image; this repository does not automatically deploy Railway.

Required GitHub secrets for full automation
- `VERCEL_TOKEN` — authenticates the deployment workflow. The org/project IDs may be repository variables or secrets.
- `GEMINI_API_KEY` — set on the deployed backend/Vercel project to enable report chat.
- `CHECKPOINT_URL` — optional backend runtime setting for downloading a missing checkpoint; otherwise keep the model in the deployment image or mounted volume.

Railway notes
- Connect your repository in Railway or create a service that pulls the image from `ghcr.io/<owner>/dermoscan-backend:latest` (the CI pushes images there). Set `CHECKPOINT_URL` and other env vars in Railway service settings.

