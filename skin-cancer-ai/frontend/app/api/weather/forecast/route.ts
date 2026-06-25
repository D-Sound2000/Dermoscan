export const dynamic = "force-dynamic";

const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export async function GET(request: Request) {
  const sourceUrl = new URL(request.url);
  const upstreamUrl = `${OPEN_METEO_FORECAST_URL}?${sourceUrl.searchParams.toString()}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(upstreamUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({
      reason: "Weather provider returned an invalid response.",
    }));

    return Response.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Weather provider request failed.";
    return Response.json({ reason: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
