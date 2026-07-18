import type { ContextResponse } from "../types/context";

export default function WeatherCard({ weather }: { weather?: ContextResponse["weather"] }) {
  return <article className="weather-card"><span className="weather-icon" aria-hidden="true">☀</span><div><p className="card-label">Today's weather</p><h3>{weather?.condition || "Weather unavailable"}</h3><p>{weather ? `${weather.temperature}°C${weather.city ? ` · ${weather.city}` : ""}` : "Check back later for an update"}</p></div></article>;
}
