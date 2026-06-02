"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CloudSun,
  Droplets,
  Glasses,
  HatGlasses,
  MapPin,
  Shirt,
  ShieldCheck,
  Sparkles,
  SunMedium,
  ThermometerSun,
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

const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
const OPEN_METEO_ENDPOINT = "https://api.open-meteo.com/v1/forecast";

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

function getProtectionActions(uvIndex: number) {
  if (uvIndex >= 8) {
    return [
      "Avoid direct sun during peak UV hours",
      "Use broad-spectrum SPF 50 and reapply every 2 hours",
      "Wear a wide-brim hat, UV sunglasses, and UPF clothing",
    ];
  }

  if (uvIndex >= 6) {
    return [
      "Use broad-spectrum SPF 30+",
      "Wear a hat, sunglasses, and light long sleeves",
      "Seek shade around midday",
    ];
  }

  if (uvIndex >= 3) {
    return [
      "Apply SPF 30+ before longer outdoor activity",
      "Bring sunglasses or a cap",
      "Check exposed skin after extended sun exposure",
    ];
  }

  return [
    "Use sunscreen for long outings",
    "Hydrate and monitor heat comfort",
    "Keep routine skin self-checks",
  ];
}

function getSunscreenAdvice(uvIndex: number) {
  if (uvIndex >= 11) {
    return "Use SPF 50+ broad-spectrum sunscreen, reapply every 2 hours, and limit sun exposure.";
  }

  if (uvIndex >= 8) {
    return "Choose SPF 50+ and reapply often; seek shade during the strongest midday sun.";
  }

  if (uvIndex >= 6) {
    return "Use SPF 30+ broad-spectrum sunscreen and reapply after sweating or swimming.";
  }

  if (uvIndex >= 3) {
    return "Apply SPF 30 on exposed skin before spending over 20 minutes outdoors.";
  }

  return "Use daily protection like SPF 15+ on exposed skin when spending extended time outside.";
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

function getHydrationAdvice(temperature: number, humidity: number) {
  if (temperature >= 90 || humidity >= 75) {
    return "Drink water regularly, avoid peak heat hours, and take frequent shade breaks.";
  }

  if (temperature >= 80) {
    return "Stay hydrated and rest in shade during longer outdoor sessions.";
  }

  return "Keep water available and stay mindful of comfort during outdoor activity.";
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

  const rawScore = 100 - uvPenalty - heatPenalty - humidityPenalty - middayPenalty - airQualityPenalty + cloudBonus + windBonus;
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

export function WeatherSafetyAdvisor() {
  const [city, setCity] = useState(initialForecast.city);
  const [searchQuery, setSearchQuery] = useState(initialForecast.city);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [forecast, setForecast] = useState<WeatherSafetyResponse>(initialForecast);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<"F" | "C">("F");
  const reduceMotion = useReducedMotion();

  const advisory = useMemo(
    () => getAdvisory(
      forecast.uv_index,
      forecast.temperature,
      forecast.cloud_cover,
      forecast.humidity,
      forecast.wind_mph,
      new Date().getHours(),
      forecast.air_quality_index,
    ),
    [forecast],
  );
  const displayTemp = unit === "F" ? forecast.temperature : Math.round((forecast.temperature - 32) * (5 / 9));
  const displayFeelsLike = unit === "F" ? forecast.feels_like : Math.round((forecast.feels_like - 32) * (5 / 9));

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
        hourly: "uv_index,pm2_5,pm10",
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
      const pm25Values = (hourly.pm2_5 ?? []).map((value: unknown) => Number(value ?? 0));
      const pm10Values = (hourly.pm10 ?? []).map((value: unknown) => Number(value ?? 0));

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

      const airQualityIndex = pm25Values[bestTimeIndex] ?? pm25Values[0] ?? pm10Values[bestTimeIndex] ?? pm10Values[0] ?? undefined;
      const airQualityCategory = airQualityIndex === undefined
        ? undefined
        : airQualityIndex <= 12
          ? "Good"
          : airQualityIndex <= 35
            ? "Moderate"
            : airQualityIndex <= 55
              ? "Unhealthy for sensitive groups"
              : airQualityIndex <= 150
                ? "Unhealthy"
                : "Very Unhealthy";

      const advisoryData = getAdvisory(currentUv, temperature, cloudCover, humidity, windMph, currentHour, airQualityIndex);
      const sunscreenAdvice = getSunscreenAdvice(currentUv);
      const clothingAdvice = getClothingAdvice(temperature, currentUv, condition);
      const hydrationAdvice = getHydrationAdvice(temperature, humidity);

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
        actions: getProtectionActions(currentUv),
        hourly_uv: hourlyUv,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        message === "Failed to fetch"
          ? "Unable to reach Open-Meteo. Check your internet connection and try again."
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
    fetchWeather(city);
  }, []);

  return (
    <section id="safety" className="relative overflow-hidden bg-[#020303] px-5 py-20 text-[#f5fbfa] md:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_82%_20%,rgba(249,115,22,0.13),transparent_30%)]" />
      <div className="relative mx-auto grid w-full max-w-6xl gap-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(22rem,0.58fr)] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/70">
              <SunMedium className="size-3.5" />
              UV & Skin Safety
            </div>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-normal text-white md:text-6xl">
              Check today&apos;s outdoor skin risk before you head out.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/62">
              Weather, UV intensity, and heat are translated into a simple safety score and protection plan.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.06] p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-2 rounded-[1.15rem] border border-white/[0.08] bg-black/25 px-3 py-2">
                <MapPin className="size-4 text-cyan-100/70" />
                <div className="relative flex-1">
                  <input
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    aria-label="Weather location"
                    placeholder="San Jose, CA"
                    className="min-w-0 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
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
                  className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-200/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "Updating…" : "Update"}
                </button>
              </div>

              <div className="grid grid-cols-2 rounded-full border border-white/[0.08] bg-white/[0.06] p-1">
                {(["F", "C"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setUnit(option)}
                    className={`h-8 rounded-full px-3 text-xs font-semibold transition ${
                      unit === option ? "bg-cyan-200 text-slate-950" : "text-white/58 hover:text-white"
                    }`}
                  >
                    °{option}
                  </button>
                ))}
              </div>
            </div>
            {error ? (
              <p className="mt-3 text-sm text-amber-200">{error}</p>
            ) : (
              <p className="mt-3 text-sm text-white/60">Live weather from Open-Meteo for your selected city.</p>
            )}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(20rem,0.72fr)_minmax(0,1fr)]">
          <motion.article
            className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.08] p-5 shadow-2xl shadow-black/30"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/55 to-transparent" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/62">Current weather</p>
                <h3 className="mt-3 text-5xl font-semibold text-white">
                  {displayTemp}°{unit}
                </h3>
                <p className="mt-2 text-sm text-white/58">
                  Feels like {displayFeelsLike}°{unit} · {forecast.condition}
                </p>
              </div>
              <div className="grid size-16 place-items-center rounded-full border border-cyan-100/20 bg-cyan-100/10 text-cyan-100">
                <CloudSun className="size-8" />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <WeatherMetric icon={Droplets} label="Humidity" value={`${forecast.humidity}%`} />
              <WeatherMetric icon={Wind} label="Wind" value={`${forecast.wind_mph} mph`} />
              <WeatherMetric icon={Umbrella} label="Clouds" value={`${forecast.cloud_cover}%`} />
            </div>
          </motion.article>

          <motion.article
            className="rounded-[2rem] border border-white/[0.08] bg-white/[0.08] p-5 shadow-2xl shadow-black/30"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: reduceMotion ? 0 : 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="grid gap-5 md:grid-cols-[12rem_1fr]">
              <div className="relative grid aspect-square place-items-center rounded-full border border-white/[0.08] bg-black/25">
                <div
                  className={`absolute inset-3 rounded-full bg-gradient-to-br ${advisory.tone} opacity-90`}
                  style={{ clipPath: `polygon(50% 50%, 50% 0, ${50 + advisory.score / 2}% 0, 100% 100%, 0 100%)` }}
                />
                <div className="relative grid size-32 place-items-center rounded-full border border-white/[0.12] bg-[#020303] text-center">
                  <span className="text-4xl font-semibold text-white">{advisory.score}</span>
                  <span className="-mt-8 font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">Safety score</span>
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
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
                <h3 className="mt-4 text-3xl font-semibold text-white">{advisory.verdict}</h3>
                <p className="mt-3 text-sm leading-6 text-white/62">{advisory.summary}</p>
                <div className="mt-5 rounded-[1.2rem] border border-white/[0.08] bg-black/20 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100/55">Peak exposure</p>
                  <p className="mt-2 text-sm text-white/72">Avoid prolonged direct sun from {forecast.peak_window}.</p>
                  <p className="mt-2 text-sm text-white/72">Best time to go outside: {forecast.best_time}.</p>
                  <p className="mt-2 text-sm text-white/72">Lower UV window: {forecast.best_outdoor_window}.</p>
                </div>
              </div>
            </div>
          </motion.article>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.48fr)]">
          <article className="rounded-[2rem] border border-white/[0.08] bg-white/[0.06] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/62">UV timeline</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Best time to be outside</h3>
              </div>
              <Sparkles className="size-5 text-cyan-100/70" />
            </div>
            <div className="mt-5 grid grid-cols-5 gap-2">
              {forecast.hourly_uv.map((item) => (
                <div key={item.time} className="flex min-h-44 flex-col justify-end rounded-[1.2rem] border border-white/[0.08] bg-black/20 p-3">
                  <div className="flex flex-1 items-end">
                    <div
                      className="w-full rounded-full bg-gradient-to-t from-cyan-300 to-orange-300"
                      style={{ height: `${Math.max(18, item.uv * 14)}px` }}
                    />
                  </div>
                  <strong className="mt-3 block text-sm text-white">UV {item.uv}</strong>
                  <span className="mt-1 text-xs text-white/45">{item.time}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-white/[0.08] bg-white/[0.06] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/62">Protection plan</p>
            <div className="mt-5 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.1rem] border border-white/[0.08] bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-cyan-100">
                    <SunMedium className="size-4" />
                    <p className="text-sm font-semibold text-white">Sunscreen</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/72">{forecast.sunscreen_advice}</p>
                </div>
                <div className="rounded-[1.1rem] border border-white/[0.08] bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-cyan-100">
                    <Shirt className="size-4" />
                    <p className="text-sm font-semibold text-white">What to wear</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/72">{forecast.clothing_advice}</p>
                </div>
                <div className="rounded-[1.1rem] border border-white/[0.08] bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-cyan-100">
                    <Droplets className="size-4" />
                    <p className="text-sm font-semibold text-white">Hydration</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/72">{forecast.hydration_advice}</p>
                </div>
              </div>
              <div className="grid gap-3">
                {forecast.actions.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[1.1rem] border border-white/[0.08] bg-black/20 p-3">
                    <span className="grid size-10 place-items-center rounded-full bg-cyan-100/10 text-cyan-100">
                      <ShieldCheck className="size-4" />
                    </span>
                    <span>
                      <p className="text-sm text-white">{item}</p>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </article>
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
