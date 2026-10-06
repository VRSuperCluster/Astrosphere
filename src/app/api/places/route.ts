import type { NextRequest } from "next/server";
import { z } from "zod";
import { MAX_PLACE_QUERY_LENGTH, MIN_PLACE_QUERY_LENGTH } from "@/lib/questionnaire/place";
import type { Place, PlacesResponse } from "@/types/places";

const OPEN_METEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const RESULT_COUNT = 8;
const TIMEOUT_MS = 5000;

/** Open-Meteo omits `results` entirely when nothing matches. */
const openMeteoSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        timezone: z.string().optional(),
        country: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
});

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < MIN_PLACE_QUERY_LENGTH || query.length > MAX_PLACE_QUERY_LENGTH) {
    return Response.json({ places: [] } satisfies PlacesResponse);
  }

  const url = new URL(OPEN_METEO_URL);
  url.search = new URLSearchParams({
    name: query,
    count: String(RESULT_COUNT),
    language: "en",
    format: "json",
  }).toString();

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!upstream.ok) throw new Error(`Open-Meteo ${upstream.status}`);

    const parsed = openMeteoSchema.parse(await upstream.json());
    // Without a zone the birth time can't be converted to UTC, so those results are useless.
    const places: Place[] = (parsed.results ?? []).flatMap((r) =>
      r.timezone
        ? [
            {
              id: r.id,
              name: r.name,
              region: r.admin1,
              country: r.country,
              latitude: r.latitude,
              longitude: r.longitude,
              timezone: r.timezone,
            },
          ]
        : [],
    );

    return Response.json({ places } satisfies PlacesResponse, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return Response.json({ error: "Geocoder unavailable" }, { status: 502 });
  }
}
