"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CloudSun,
  Droplets,
  HatGlasses,
  MapPin,
  Shirt,
  ShieldCheck,
  SunMedium,
  Umbrella,
  Wind,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

type AdvisoryLevel = "Low" | "Moderate" | "High" | "Very High";

type WeatherMetric = {
  time: string;
  uv: number;
};

type LocationSuggestion = {
  name: string;
  admin1?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
};

type WeatherSafetyResponse = {
  city: string;
  condition: string;
  temperature: number;
  feels_like: number;
  uv_index: number;
  humidity: number;
  wind_mph: number;
  cloud_cover: number;
  peak_window: string;
  best_time: string;
  best_outdoor_window: string;
  sunscreen_advice: string;
  clothing_advice: string;
  hydration_advice: string;
  air_quality_index?: number;
  air_quality_category?: string;
  risk_level: string;
  skin_safety_score: number;
  verdict: string;
  recommendation: string;
  actions: string[];
  hourly_uv: WeatherMetric[];
};

const GEOCODING_ENDPOINT = "/api/weather/search";
const OPEN_METEO_ENDPOINT = "/api/weather/forecast";

function _weatherCodeLabel(code: number) {
  const labels: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Rain showers",
    82: "Heavy showers",
    95: "Thunderstorm",
  };
  return labels[code] ?? "Mixed conditions";
}

const BURN_TIME_FACTORS: number[] = [0, 0.5, 0.75, 1.1, 1.8, 2.8, 4.5];

function calculateBurnTime(uvIndex: number, skinType: number): number | null {
  if (uvIndex <= 0) return null;
  const factor = BURN_TIME_FACTORS[skinType] ?? 1.1;
  return Math.round((200 / uvIndex) * factor);
}

function getProtectionActions(uvIndex: number, skinType: number = 3, timeOutside: number = 60): string[] {
  const burnTime = calculateBurnTime(uvIndex, skinType);
  const reapplyMin = skinType <= 2 ? 60 : skinType <= 4 ? 80 : 110;
  const actions: string[] = [];

  if (burnTime !== null && uvIndex >= 3) {
    actions.push(
      `At UV ${uvIndex.toFixed(1)}, skin type ${skinType} burns unprotected in ~${burnTime} min — apply sunscreen before leaving home`,
    );
  } else {
    actions.push(`UV is low right now — SPF 15+ on exposed areas covers you for most outings`);
  }

  if (uvIndex >= 8) {
    actions.push(`Set a ${reapplyMin}-min phone timer to reapply sunscreen — skin damage starts before you feel any burning`);
    actions.push(`A wide-brim hat blocks ~70% of UV reaching your face and neck; UV400 sunglasses prevent cumulative eye damage`);
  } else if (uvIndex >= 6) {
    actions.push(`Reapply SPF 30+ every ${reapplyMin} min — or immediately after sweating or any water contact`);
    actions.push(`Even brief shade breaks reduce your total UV dose significantly — aim for shade between 11 AM and 3 PM`);
  } else if (uvIndex >= 3) {
    actions.push(`Apply sunscreen 15 min before going out — it needs time to bond to skin before it starts protecting you`);
    actions.push(`UV400 sunglasses reduce long-term cataract risk even on partly cloudy days (clouds pass up to 80% of UV)`);
  } else {
    actions.push(`Routine SPF 15 on exposed skin is sufficient for today's UV level`);
    actions.push(`Cloud cover can drop rapidly — recheck UV if conditions change`);
  }

  if (timeOutside >= 120) {
    const waterOz = Math.ceil(timeOutside / 20) * 8;
    actions.push(
      `For ${timeOutside >= 240 ? "4+" : "2+"} hrs outside: pre-hydrate with 16 oz before leaving and bring at least ${waterOz} oz of water`,
    );
  } else {
    const waterOz = timeOutside <= 30 ? 8 : 16;
    actions.push(
      `Bring at least ${waterOz} oz of water for a ${timeOutside}-min outing — thirst is a late signal of dehydration`,
    );
  }

  return actions.slice(0, 3);
}

function getSunscreenAdvice(uvIndex: number, skinType: number = 3): string {
  const reapplyMin = skinType <= 2 ? "60–80" : skinType <= 4 ? "80–90" : "90–110";
  const sensitive = skinType <= 2;
  const moderate = skinType <= 4;

  if (sensitive) {
    if (uvIndex >= 8) {
      return `SPF 50+ is critical for your skin type — apply 15 min before going out and reapply every ${reapplyMin} min. Don't skip ears, back of neck, or the part in your hair.`;
    }
    if (uvIndex >= 3) {
      return `Fair skin (type ${skinType}) burns quickly — use SPF 50 and reapply every ${reapplyMin} min. Include lips with an SPF lip balm.`;
    }
    return `Even at low UV, SPF 30+ is recommended for skin type ${skinType}. Apply 15 min before any outdoor exposure.`;
  }

  if (moderate) {
    if (uvIndex >= 8) {
      return `SPF 50+ on all exposed skin. Reapply every ${reapplyMin} min — commonly missed: ears, back of hands, and the hairline.`;
    }
    if (uvIndex >= 3) {
      return `SPF 30+ applied 15 min before going out. Reapply every ${reapplyMin} min, or sooner after sweating. SPF 50 is better for extended outings.`;
    }
    return `SPF 15–30 is sufficient for brief, incidental sun exposure today.`;
  }

  if (uvIndex >= 8) {
    return `SPF 30+ is still important — UV radiation causes long-term cell damage regardless of visible burning. Reapply every ${reapplyMin} min.`;
  }
  if (uvIndex >= 3) {
    return `SPF 15–30 on exposed areas. Even deeply pigmented skin accumulates UV damage over time — especially on the face and hands.`;
  }
  return `SPF 15 on face and neck for extended outings. UV causes gradual collagen breakdown regardless of skin tone.`;
}

function getClothingAdvice(
  temperature: number,
  uvIndex: number,
  condition: string,
) {
  const clothing = [];
  const isCool = temperature <= 60;
  const isWarm = temperature >= 80;
  const isRainy = /rain|drizzle|thunderstorm|snow/i.test(condition);

  if (uvIndex >= 6) {
    clothing.push("light long sleeves or UPF fabric");
    clothing.push("wide-brim hat and UV sunglasses");
  } else if (uvIndex >= 3) {
    clothing.push("a hat or cap and sunglasses");
    clothing.push("a lightweight layer for changing conditions");
  } else {
    clothing.push("sunglasses and a sun hat");
    clothing.push("a comfortable layer if it cools later");
  }

  if (isRainy) {
    clothing.push("waterproof outerwear");
  } else if (isCool) {
    clothing.push("a windproof jacket or light layer");
  } else if (isWarm) {
    clothing.push("breathable, moisture-wicking fabrics");
  }

  return `Wear ${clothing.join(", ")} for the current conditions.`;
}

function getHydrationAdvice(temperature: number, humidity: number, timeOutside: number = 60): string {
  let intervalMin: number;
  let amount: string;

  if (temperature >= 95 || (temperature >= 85 && humidity >= 65)) {
    intervalMin = 20;
    amount = "8–10 oz (1 cup)";
  } else if (temperature >= 85) {
    intervalMin = 30;
    amount = "8 oz (1 cup)";
  } else if (temperature >= 75) {
    intervalMin = 40;
    amount = "8 oz";
  } else {
    intervalMin = 60;
    amount = "6–8 oz";
  }

  const parts: string[] = [`Drink ${amount} every ${intervalMin} min while outside.`];
  if (timeOutside >= 60) parts.push(`Pre-hydrate with 16 oz before leaving.`);
  if (timeOutside >= 120) parts.push(`After 2+ hrs, add a sports drink or electrolyte packet — water alone doesn't replace lost sodium.`);

  return parts.join(" ");
}

function chooseBestOutdoorWindow(times: string[], uvValues: number[]) {
  const daySlots = times
    .map((time, index) => ({
      time: String(time),
      uv: uvValues[index] ?? 0,
    }))
    .filter(({ time }) => {
      const hour = Number(time.slice(11, 13));
      return hour >= 8 && hour <= 18;
    });

  if (!daySlots.length) {
    return "later today when the sun is lower";
  }

  const safeSlots = daySlots.filter((slot) => slot.uv <= 3);
  if (safeSlots.length) {
    return `${safeSlots[0].time.slice(11, 16)} when UV is lowest today`;
  }

  const bestSlot = daySlots.reduce((best, slot) => (slot.uv < best.uv ? slot : best), daySlots[0]);
  return `${bestSlot.time.slice(11, 16)} when UV is most moderate`;
}

const initialForecast: WeatherSafetyResponse = {
  city: "San Jose, CA",
  condition: "Clear afternoon",
  temperature: 78,
  feels_like: 81,
  uv_index: 7.6,
  humidity: 42,
  wind_mph: 9,
  cloud_cover: 18,
  peak_window: "11:00 - 15:00",
  best_time: "5:00 PM",
  air_quality_index: undefined,
  air_quality_category: "Good",
  best_outdoor_window: "Late afternoon around 5:00 PM",
  sunscreen_advice: "SPF 30+, reapply every 2 hours, and cover exposed skin.",
  clothing_advice: "Light layers with a brimmed hat, sunglasses, and UV-protective fabric.",
  hydration_advice: "Stay hydrated and avoid long sun exposure during peak hours.",
  risk_level: "High",
  skin_safety_score: 53,
  verdict: "Go prepared",
  recommendation: "Short outdoor plans are okay with strong sun protection.",
  actions: [
    "Use broad-spectrum SPF 30+",
    "Wear a hat, sunglasses, and light long sleeves",
    "Seek shade around midday",
  ],
  hourly_uv: [
    { time: "09:00", uv: 3 },
    { time: "11:00", uv: 6 },
    { time: "13:00", uv: 8 },
    { time: "15:00", uv: 7 },
    { time: "17:00", uv: 3 },
  ],
};

function getAdvisory(
  uvIndex: number,
  temperature: number,
  cloudCover: number,
  humidity: number,
  windMph: number,
  hour: number,
  airQualityIndex?: number,
  skinType: number = 3,
  timeOutside: number = 60,
) {
  const uvPenalty = Math.min(uvIndex * 7.8, 70);
  const heatPenalty = temperature >= 95 ? 16 : temperature >= 88 ? 10 : temperature >= 80 ? 6 : temperature >= 72 ? 3 : 0;
  const humidityPenalty = humidity >= 80 ? 5 : humidity >= 65 ? 3 : humidity >= 50 ? 1 : 0;
  const windBonus = windMph >= 20 ? -3 : windMph >= 12 ? -1 : 0;
  const cloudBonus = cloudCover >= 70 ? 4 : cloudCover >= 40 ? 2 : 0;
  const middayPenalty = hour >= 10 && hour <= 16 && uvIndex >= 3 ? 6 : 0;
  const airQualityPenalty = airQualityIndex === undefined
    ? 0
    : airQualityIndex >= 150
      ? 7
      : airQualityIndex >= 100
        ? 5
        : airQualityIndex >= 50
          ? 3
          : 0;
  const skinPenalty = ([0, 20, 12, 5, 0, -4, -8] as number[])[skinType] ?? 0;
  const timePenalty = timeOutside <= 15 ? 0 : timeOutside <= 60 ? 4 : timeOutside <= 120 ? 10 : 18;

  const rawScore = 100 - uvPenalty - heatPenalty - humidityPenalty - middayPenalty - airQualityPenalty + cloudBonus + windBonus - skinPenalty - timePenalty;
  const score = Math.max(10, Math.min(98, Math.round(rawScore)));

  if (uvIndex >= 11 || score <= 30) {
    return {
      level: "Extreme" as AdvisoryLevel,
      score,
      verdict: "Avoid prolonged exposure",
      summary: "UV is extremely high; stay indoors during peak sun hours and protect exposed skin.",
      tone: "from-red-500 to-rose-500",
    };
  }

  if (uvIndex >= 8 || score <= 45) {
    return {
      level: "Very High" as AdvisoryLevel,
      score,
      verdict: "Limit direct sun",
      summary: "Outdoor time is safest in shade. Use high SPF and protective clothing.",
      tone: "from-orange-300 to-red-400",
    };
  }

  if (uvIndex >= 6 || score <= 60) {
    return {
      level: "High" as AdvisoryLevel,
      score,
      verdict: "Go prepared",
      summary: "Strong sun protection is recommended. Seek shade during midday.",
      tone: "from-amber-200 to-orange-400",
    };
  }

  if (uvIndex >= 3) {
    return {
      level: "Moderate" as AdvisoryLevel,
      score,
      verdict: "Use sunscreen",
      summary: "Normal outdoor activity is okay with sunscreen and protective gear.",
      tone: "from-cyan-200 to-amber-200",
    };
  }

  return {
    level: "Low" as AdvisoryLevel,
    score,
    verdict: "Generally safe",
    summary: "Low UV risk today. Use protection during longer outdoor plans.",
    tone: "from-emerald-200 to-cyan-200",
  };
}

type WeatherSafetyAdvisorProps = {
  initialLocation?: { name: string; latitude: number; longitude: number } | null;
  skinType?: number | null;
};

const TIME_OUTSIDE_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 60, label: "1 hr" },
  { value: 120, label: "2 hrs" },
  { value: 240, label: "4+ hrs" },
] as const;

export function WeatherSafetyAdvisor({ initialLocation, skinType }: WeatherSafetyAdvisorProps = {}) {
  const [city, setCity] = useState(initialLocation?.name ?? initialForecast.city);
  const [searchQuery, setSearchQuery] = useState(initialLocation?.name ?? initialForecast.city);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [forecast, setForecast] = useState<WeatherSafetyResponse>(initialForecast);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<"F" | "C">("F");
  const [timeOutside, setTimeOutside] = useState(60);
  const reduceMotion = useReducedMotion();

  const resolvedSkinType = skinType ?? 3;

  const advisory = useMemo(
    () => getAdvisory(
      forecast.uv_index,
      forecast.temperature,
      forecast.cloud_cover,
      forecast.humidity,
      forecast.wind_mph,
      new Date().getHours(),
      forecast.air_quality_index,
      resolvedSkinType,
      timeOutside,
    ),
    [forecast, resolvedSkinType, timeOutside],
  );

  const burnTime = useMemo(
    () => calculateBurnTime(forecast.uv_index, resolvedSkinType),
    [forecast.uv_index, resolvedSkinType],
  );
  const displayTemp = unit === "F" ? forecast.temperature : Math.round((forecast.temperature - 32) * (5 / 9));
  const displayFeelsLike = unit === "F" ? forecast.feels_like : Math.round((forecast.feels_like - 32) * (5 / 9));
  const safetyProgress = Math.max(0, Math.min(100, advisory.score));
  const circleRadius = 52;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference * (1 - safetyProgress / 100);

  const fetchWeather = async (location: string, coordinates?: { latitude: number; longitude: number }) => {
    const query = location.trim();
    if (!query) {
      setError("Enter a city name or location to update the forecast.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let cityLabel = query;
      let latitude: number;
      let longitude: number;

      if (coordinates) {
        latitude = coordinates.latitude;
        longitude = coordinates.longitude;
      } else {
        const geocodeUrl = `${GEOCODING_ENDPOINT}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodePayload = await geocodeResponse.json();

        if (!geocodeResponse.ok) {
          throw new Error(geocodePayload?.reason || "Unable to resolve location.");
        }

        const results = geocodePayload?.results ?? [];
        if (!results.length) {
          throw new Error(`Could not find location '${query}'.`);
        }

        const locationResult = results[0];
        cityLabel = [locationResult.name, locationResult.admin1, locationResult.country_code]
          .filter(Boolean)
          .join(", ");
        latitude = Number(locationResult.latitude);
        longitude = Number(locationResult.longitude);
      }

      const currentHour = new Date().getHours();
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,cloud_cover",
        hourly: "uv_index",
        forecast_days: "1",
        temperature_unit: "fahrenheit",
        wind_speed_unit: "mph",
        timezone: "auto",
      });

      const weatherUrl = `${OPEN_METEO_ENDPOINT}?${params.toString()}`;
      const weatherResponse = await fetch(weatherUrl);
      const weatherPayload = await weatherResponse.json();

      if (!weatherResponse.ok) {
        throw new Error(weatherPayload?.reason || "Unable to fetch weather data.");
      }

      const current = weatherPayload?.current ?? {};
      const hourly = weatherPayload?.hourly ?? {};
      const times = hourly.time ?? [];
      const uvValues = (hourly.uv_index ?? []).map((value: unknown) => Number(value ?? 0));

      if (!current || !uvValues.length) {
        throw new Error("Weather provider response is missing required fields.");
      }

      const currentTime = String(current.time ?? "");
      const currentHourPrefix = currentTime.slice(0, 13);
      let currentUv = uvValues[0];
      for (let i = 0; i < times.length; i += 1) {
        if (String(times[i]).startsWith(currentHourPrefix)) {
          currentUv = uvValues[i];
          break;
        }
      }

      const lowestUv = uvValues.reduce((min, value) => Math.min(min, value), Number.POSITIVE_INFINITY);
      const bestTimeIndex = uvValues.indexOf(lowestUv);
      const bestTime = bestTimeIndex >= 0 && times[bestTimeIndex]
        ? String(times[bestTimeIndex]).slice(11, 16)
        : "Late afternoon";
      const bestOutdoorWindow = chooseBestOutdoorWindow(times, uvValues);

      const peakUv = Math.max(...uvValues);
      const peakIndexes = uvValues
        .map((value, index) => (value === peakUv ? index : -1))
        .filter((index) => index >= 0);
      const startTime = peakIndexes.length
        ? String(times[peakIndexes[0]]).slice(11, 16)
        : "11:00";
      const endIndex = Math.min((peakIndexes[peakIndexes.length - 1] ?? 12) + 1, times.length - 1);
      const endTime = times.length ? String(times[endIndex]).slice(11, 16) : "15:00";

      const temperature = Number(current.temperature_2m ?? 0);
      const feelsLike = Number(current.apparent_temperature ?? temperature);
      const humidity = Number(current.relative_humidity_2m ?? 0);
      const windMph = Number(current.wind_speed_10m ?? 0);
      const cloudCover = Number(current.cloud_cover ?? 0);
      const condition = _weatherCodeLabel(Number(current.weather_code ?? 0));

      const airQualityIndex = undefined;
      const airQualityCategory = undefined;

      const advisoryData = getAdvisory(currentUv, temperature, cloudCover, humidity, windMph, currentHour, airQualityIndex, resolvedSkinType, timeOutside);
      const sunscreenAdvice = getSunscreenAdvice(currentUv, resolvedSkinType);
      const clothingAdvice = getClothingAdvice(temperature, currentUv, condition);
      const hydrationAdvice = getHydrationAdvice(temperature, humidity, timeOutside);

      const sampleIndexes = [9, 11, 13, 15, 17];
      const hourlyUv = sampleIndexes
        .filter((index) => index < times.length)
        .map((index) => ({
          time: String(times[index]).slice(11, 16),
          uv: Math.round((uvValues[index] ?? 0) * 10) / 10,
        }));

      setCity(cityLabel);
      setSearchQuery(cityLabel);
      setForecast({
        city: cityLabel,
        condition,
        temperature: Math.round(temperature * 10) / 10,
        feels_like: Math.round(feelsLike * 10) / 10,
        uv_index: Math.round(currentUv * 10) / 10,
        humidity: Math.round(humidity),
        wind_mph: Math.round(windMph * 10) / 10,
        cloud_cover: Math.round(cloudCover),
        peak_window: `${startTime} - ${endTime}`,
        best_time: bestTime,
        best_outdoor_window: bestOutdoorWindow,
        sunscreen_advice: sunscreenAdvice,
        clothing_advice: clothingAdvice,
        hydration_advice: hydrationAdvice,
        air_quality_index: airQualityIndex,
        air_quality_category: airQualityCategory,
        risk_level: advisoryData.level,
        skin_safety_score: advisoryData.score,
        verdict: advisoryData.verdict,
        recommendation: advisoryData.summary,
        actions: getProtectionActions(currentUv, resolvedSkinType, timeOutside),
        hourly_uv: hourlyUv,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        message === "Failed to fetch"
          ? "Unable to reach the weather service. Check your connection and try again."
          : message,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const suggestionsUrl = `${GEOCODING_ENDPOINT}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    const response = await fetch(suggestionsUrl);
    const payload = await response.json();
    const results = payload?.results ?? [];

    setSuggestions(
      results.map((item: any) => ({
        name: item.name,
        admin1: item.admin1,
        country_code: item.country_code,
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
      })),
    );
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        fetchSuggestions(searchQuery);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSuggestion = (item: LocationSuggestion) => {
    const label = [item.name, item.admin1, item.country_code].filter(Boolean).join(", ");
    setSearchQuery(label);
    setShowSuggestions(false);
    fetchWeather(label, { latitude: item.latitude, longitude: item.longitude });
  };

  useEffect(() => {
    if (initialLocation) {
      fetchWeather(initialLocation.name, { latitude: initialLocation.latitude, longitude: initialLocation.longitude });
    } else {
      fetchWeather(city);
    }
  }, []);

  useEffect(() => {
    setForecast((prev) => ({
      ...prev,
      sunscreen_advice: getSunscreenAdvice(prev.uv_index, resolvedSkinType),
      hydration_advice: getHydrationAdvice(prev.temperature, prev.humidity, timeOutside),
      actions: getProtectionActions(prev.uv_index, resolvedSkinType, timeOutside),
    }));
  }, [timeOutside, resolvedSkinType]);

  return (
    <section id="safety" className="relative overflow-hidden bg-[#020303] px-5 py-20 text-[#f5fbfa] md:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_82%_20%,rgba(249,115,22,0.13),transparent_30%)]" />
      <div className="relative mx-auto w-full max-w-6xl space-y-10">

        {/* Controls */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex min-w-[200px] flex-1 items-center gap-2 rounded-[1.15rem] border border-white/[0.08] bg-white/[0.05] px-3 py-2.5">
              <MapPin className="size-4 flex-shrink-0 text-cyan-100/50" />
              <div className="relative flex-1">
                <input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  aria-label="Weather location"
                  placeholder="City, Region"
                  className="min-w-0 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                />
                {showSuggestions && suggestions.length > 0 ? (
                  <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-3xl border border-white/[0.08] bg-[#020303]/95 p-2 shadow-2xl shadow-black/40">
                    {suggestions.map((item) => {
                      const label = [item.name, item.admin1, item.country_code].filter(Boolean).join(", ");
                      return (
                        <button
                          key={label}
                          type="button"
                          onMouseDown={() => handleSelectSuggestion(item)}
                          className="w-full rounded-2xl px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => fetchWeather(searchQuery)}
                disabled={isLoading}
                className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading ? "…" : "Update"}
              </button>
            </div>

            <div className="grid grid-cols-2 rounded-full border border-white/[0.08] bg-white/[0.05] p-1">
              {(["F", "C"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setUnit(option)}
                  className={`h-8 rounded-full px-4 text-xs font-semibold transition ${
                    unit === option ? "bg-cyan-200 text-slate-950" : "text-white/50 hover:text-white"
                  }`}
                >
                  °{option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/35">Time outside:</span>
            {TIME_OUTSIDE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTimeOutside(value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  timeOutside === value
                    ? "bg-cyan-200 text-slate-950"
                    : "border border-white/[0.08] bg-white/[0.03] text-white/45 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-amber-300/80">{error}</p>}
        </div>

        {/* Score + Weather — equal two columns */}
        <div className="grid gap-5 lg:grid-cols-2">
          <motion.article
            className="rounded-[2rem] border border-white/[0.08] bg-white/[0.08] p-6 shadow-2xl shadow-black/30"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/62">Skin safety score</p>
            <div className="mt-4 flex items-center gap-5">
              <div className="relative grid size-28 flex-shrink-0 place-items-center">
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${advisory.tone} opacity-15`} />
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={circleCircumference}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 60 60)"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#fb7185" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="relative text-3xl font-semibold text-white">{advisory.score}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/72">
                    UV {forecast.uv_index.toFixed(1)}
                  </span>
                  <span className="rounded-full border border-orange-200/20 bg-orange-300/10 px-3 py-1 text-xs font-semibold text-orange-100">
                    {advisory.level} risk
                  </span>
                  {forecast.air_quality_category ? (
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/72">
                      AQ {forecast.air_quality_category}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-2xl font-semibold text-white">{advisory.verdict}</h3>
                <p className="mt-2 text-sm leading-6 text-white/62">{advisory.summary}</p>
              </div>
            </div>
            <div className="mt-4 space-y-1.5 border-t border-white/[0.06] pt-4">
              <p className="text-sm text-white/55">
                Peak UV: <strong className="text-white/80">{forecast.peak_window}</strong>
                {" · "}Best window: <strong className="text-white/80">{forecast.best_time}</strong>
              </p>
              {burnTime !== null && forecast.uv_index >= 3 && (
                <p className="text-sm text-amber-300/75">
                  Unprotected burn time (type {resolvedSkinType}):{" "}
                  <strong className="text-amber-200">~{burnTime} min</strong>
                </p>
              )}
            </div>
          </motion.article>

          <motion.article
            className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.08] p-6 shadow-2xl shadow-black/30"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: reduceMotion ? 0 : 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/55 to-transparent" />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/62">Current weather</p>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-5xl font-semibold text-white">
                  {displayTemp}°{unit}
                </h3>
                <p className="mt-2 text-sm text-white/58">
                  Feels like {displayFeelsLike}°{unit} · {forecast.condition}
                </p>
              </div>
              <div className="grid size-14 place-items-center rounded-full border border-cyan-100/20 bg-cyan-100/10 text-cyan-100">
                <CloudSun className="size-7" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <WeatherMetric icon={Droplets} label="Humidity" value={`${forecast.humidity}%`} />
              <WeatherMetric icon={Wind} label="Wind" value={`${forecast.wind_mph} mph`} />
              <WeatherMetric icon={Umbrella} label="Clouds" value={`${forecast.cloud_cover}%`} />
            </div>
          </motion.article>
        </div>

        {/* UV Timeline — full width */}
        <article className="rounded-[2rem] border border-white/[0.08] bg-white/[0.06] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/62">UV timeline</p>
              <h3 className="mt-1.5 text-xl font-semibold text-white">Hourly UV levels</h3>
            </div>
            <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
              Best: {forecast.best_time}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {forecast.hourly_uv.map((item) => {
              const highlight = item.time === forecast.best_time;
              const fillPct = Math.min(90, Math.max(12, (item.uv / 11) * 90));
              const fillGradient = highlight
                ? "from-cyan-400/30 to-cyan-400/0"
                : item.uv >= 8
                ? "from-red-500/35 to-red-500/0"
                : item.uv >= 6
                ? "from-orange-400/35 to-orange-400/0"
                : item.uv >= 3
                ? "from-amber-400/30 to-amber-400/0"
                : "from-emerald-400/25 to-emerald-400/0";
              const labelText = item.uv >= 11 ? "Extreme" : item.uv >= 8 ? "Very High" : item.uv >= 6 ? "High" : item.uv >= 3 ? "Moderate" : "Low";
              const labelColor = highlight
                ? "text-cyan-300"
                : item.uv >= 8
                ? "text-red-400"
                : item.uv >= 6
                ? "text-orange-400"
                : item.uv >= 3
                ? "text-amber-400"
                : "text-emerald-400";

              return (
                <div
                  key={item.time}
                  className={`relative flex h-36 flex-col items-center justify-between overflow-hidden rounded-[1.3rem] border p-4 transition ${
                    highlight
                      ? "border-cyan-300/30 bg-cyan-300/[0.06]"
                      : "border-white/[0.07] bg-black/20"
                  }`}
                >
                  <div
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${fillGradient} transition-all`}
                    style={{ height: `${fillPct}%` }}
                  />
                  <span className="relative z-10 text-xs text-white/40">{item.time}</span>
                  <strong className="relative z-10 text-3xl font-bold tracking-tight text-white">{item.uv}</strong>
                  <span className={`relative z-10 text-[10px] font-semibold uppercase tracking-wider ${labelColor}`}>
                    {highlight ? "Best" : labelText}
                  </span>
                </div>
              );
            })}
          </div>
        </article>

        {/* Protection Plan — 3 equal columns */}
        <div>
          <div className="mb-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/62">Protection plan</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">What to take outside</h3>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="flex flex-col gap-4 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.04] p-6">
              <span className="grid h-11 w-11 place-items-center rounded-[0.85rem] bg-amber-100/10 text-amber-200">
                <SunMedium className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200/80">Sunscreen</p>
                <p className="mt-3 text-sm leading-6 text-white/68">{forecast.sunscreen_advice}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.04] p-6">
              <span className="grid h-11 w-11 place-items-center rounded-[0.85rem] bg-cyan-100/10 text-cyan-100">
                <Shirt className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100/80">Clothing</p>
                <p className="mt-3 text-sm leading-6 text-white/68">{forecast.clothing_advice}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.04] p-6">
              <span className="grid h-11 w-11 place-items-center rounded-[0.85rem] bg-blue-400/10 text-blue-300">
                <Droplets className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300/80">Hydration</p>
                <p className="mt-3 text-sm leading-6 text-white/68">{forecast.hydration_advice}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Precautions — full width */}
        <div className="rounded-[2rem] border border-cyan-200/10 bg-white/[0.04] p-6">
          <div className="mb-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/62">Key precautions</p>
            <h3 className="mt-1.5 text-xl font-semibold text-white">Top actions for today</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {forecast.actions.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-3xl border border-white/[0.08] bg-white/5 p-4">
                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-2xl bg-cyan-100/10 text-cyan-100">
                  <ShieldCheck className="size-4" />
                </span>
                <p className="text-sm leading-6 text-white/75">{item}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

function WeatherMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1rem] border border-white/[0.08] bg-black/20 p-3">
      <Icon className="size-4 text-cyan-100/70" />
      <strong className="mt-3 block text-sm text-white">{value}</strong>
      <span className="mt-1 block text-[11px] text-white/45">{label}</span>
    </div>
  );
}
