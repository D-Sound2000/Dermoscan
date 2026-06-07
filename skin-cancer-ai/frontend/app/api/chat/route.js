const BACKEND_URL = process.env.DERMOSCAN_API_URL ?? "http://localhost:8000";

export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.message !== "string" || typeof body.reportId !== "string") {
    return Response.json({ detail: "message and reportId are required." }, { status: 400 });
  }

  const backendResponse = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: body.message,
      reportId: body.reportId,
    }),
  });

  const payload = await backendResponse.json().catch(() => ({
    detail: "The DermoScan backend returned an invalid response.",
  }));

  return Response.json(payload, { status: backendResponse.status });
}
