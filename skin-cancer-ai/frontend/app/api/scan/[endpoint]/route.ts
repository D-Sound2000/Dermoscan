export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BACKEND_URL = process.env.DERMOSCAN_API_URL ?? process.env.MODEL_URL;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

type ScanEndpoint = "predict" | "predict-with-heatmap";

function isScanEndpoint(value: string): value is ScanEndpoint {
  return value === "predict" || value === "predict-with-heatmap";
}

function validateImage(file: File) {
  if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
    return `Unsupported file type '${file.type}'. Upload a JPEG or PNG.`;
  }

  if (file.size === 0) {
    return "Uploaded file is empty.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image is too large. Upload an image under 4 MB.";
  }

  return null;
}

async function callPythonBackend(endpoint: ScanEndpoint, file: File) {
  if (!BACKEND_URL) {
    throw new Error("The DermoScan model service is not configured.");
  }

  const formData = new FormData();
  formData.append("file", file, file.name);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/${endpoint}`, {
      method: "POST",
      body: formData,
      cache: "no-store",
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new Error("The model service returned an invalid response.");
    }

    const payload = await response.json();
    return { payload, status: response.status };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(
  request: Request,
  { params }: { params: { endpoint: string } },
) {
  if (!isScanEndpoint(params.endpoint)) {
    return Response.json({ detail: "Unknown scan endpoint." }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return Response.json({ detail: "file is required." }, { status: 400 });
  }

  const validationError = validateImage(file);
  if (validationError) {
    return Response.json({ detail: validationError }, { status: 415 });
  }

  try {
    const backendResult = await callPythonBackend(params.endpoint, file);
    return Response.json(backendResult.payload, { status: backendResult.status });
  } catch (error) {
    const detail = error instanceof Error && error.name !== "AbortError"
      ? error.message
      : "The DermoScan model service timed out. Please try again.";
    return Response.json({ detail }, { status: 503 });
  }
}
