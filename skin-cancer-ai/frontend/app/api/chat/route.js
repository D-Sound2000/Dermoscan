const BACKEND_URL = process.env.DERMOSCAN_API_URL ?? process.env.MODEL_URL ?? "http://localhost:8000";
export const maxDuration = 45;

export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.message !== "string" || typeof body.reportId !== "string") {
    return Response.json({ detail: "message and reportId are required." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 40000);

  try {
    const backendResponse = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: body.message.trim(),
        reportId: body.reportId.trim(),
        report: body.report && typeof body.report === "object" ? body.report : null,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const payload = await backendResponse.json().catch(() => ({
      detail: "The DermoScan backend returned an invalid response.",
    }));

    return Response.json(payload, { status: backendResponse.status });
  } catch (error) {
    const detail = error instanceof Error && error.name === "AbortError"
      ? "The report assistant timed out. Please try again."
      : "The report assistant is temporarily unavailable.";
    return Response.json({ detail }, { status: 503 });
  } finally {
    clearTimeout(timeout);
  }
}
