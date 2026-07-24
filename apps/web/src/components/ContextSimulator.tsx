import { useState } from "react";
import type { RecommendationOverride } from "../services/catalogService";

type Preset = {
  name: string;
  icon: string;
  city: string;
  state: string;
  country: string;
  temperature: number;
  weather_condition: string;
  current_season: string;
  current_festival: string | null;
  festival_days_remaining: number | null;
  event_title: string | null;
  event_type: string | null;
};

const PRESETS: Preset[] = [
  {
    name: "Monsoon in Mumbai",
    icon: "🌧️",
    city: "Mumbai",
    state: "Maharashtra",
    country: "IN",
    temperature: 27,
    weather_condition: "Rainy",
    current_season: "Monsoon",
    current_festival: null,
    festival_days_remaining: null,
    event_title: "Monsoon Cafe Walk",
    event_type: "Casual",
  },
  {
    name: "Diwali in Delhi",
    icon: "🪔",
    city: "Delhi",
    state: "Delhi",
    country: "IN",
    temperature: 20,
    weather_condition: "Foggy",
    current_season: "Autumn",
    current_festival: "Diwali",
    festival_days_remaining: 3,
    event_title: "Diwali Card Party",
    event_type: "Festive",
  },
  {
    name: "Holi in Jaipur",
    icon: "☀️",
    city: "Jaipur",
    state: "Rajasthan",
    country: "IN",
    temperature: 32,
    weather_condition: "Sunny",
    current_season: "Summer",
    current_festival: "Holi",
    festival_days_remaining: 1,
    event_title: "Holi Fest",
    event_type: "Festive",
  },
  {
    name: "Winter in Srinagar",
    icon: "❄️",
    city: "Srinagar",
    state: "Jammu and Kashmir",
    country: "IN",
    temperature: 4,
    weather_condition: "Snowing",
    current_season: "Winter",
    current_festival: null,
    festival_days_remaining: null,
    event_title: "Winter Vacation",
    event_type: "Travel",
  },
  {
    name: "Job Interview",
    icon: "💼",
    city: "Bangalore",
    state: "Karnataka",
    country: "IN",
    temperature: 24,
    weather_condition: "Clear",
    current_season: "Summer",
    current_festival: null,
    festival_days_remaining: null,
    event_title: "Tech Interview",
    event_type: "Formal",
  },
  {
    name: "Wedding Guest",
    icon: "💍",
    city: "Udaipur",
    state: "Rajasthan",
    country: "IN",
    temperature: 28,
    weather_condition: "Clear",
    current_season: "Autumn",
    current_festival: null,
    festival_days_remaining: null,
    event_title: "Sister's Wedding",
    event_type: "Wedding",
  },
];

export default function ContextSimulator({ onChange }: { onChange: (override: RecommendationOverride | null) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form states initialized to Delhi defaults
  const [city, setCity] = useState("Delhi");
  const [temperature, setTemperature] = useState(25);
  const [condition, setCondition] = useState("Sunny");
  const [season, setSeason] = useState("Summer");
  const [festival, setFestival] = useState("");
  const [eventTitle, setEventTitle] = useState("");

  const applyPreset = (preset: Preset) => {
      onChange({ weather: preset.weather_condition, temperature: preset.temperature, festival: preset.current_festival ?? undefined, eventTitle: preset.event_title ?? undefined, eventType: preset.event_type ?? undefined });
      // Update local states for visibility in editor inputs
      setCity(preset.city);
      setTemperature(preset.temperature);
      setCondition(preset.weather_condition);
      setSeason(preset.current_season);
      setFestival(preset.current_festival || "");
      setEventTitle(preset.event_title || "");

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onChange({ weather: condition, temperature: Number(temperature), festival: festival || undefined, eventTitle: eventTitle || undefined, eventType: eventTitle ? "Social" : undefined });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-white/95 backdrop-blur-md border border-[#EAEAEC] rounded-3xl shadow-2xl p-5 w-[350px] max-h-[80vh] overflow-y-auto mb-4 animate-fade-in-up space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <div>
              <h3 className="font-extrabold text-[14px] text-[#282C3F] flex items-center gap-1.5">
                ⚡ AI Context Simulator
              </h3>
              <p className="text-[10.5px] text-gray-500 mt-0.5">Test real-time catalog changes</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#94969F] hover:text-[#FF3F6C] font-bold text-[14px] cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Preset Buttons Grid */}
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-[#94969F] uppercase tracking-wider block">
              Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  disabled={loading}
                  className="flex items-center gap-1.5 p-2 bg-[#F5F5F6] hover:bg-[#FFF0F4] border border-transparent hover:border-[#FF245B]/20 rounded-xl text-left cursor-pointer transition-all disabled:opacity-50"
                >
                  <span className="text-[14px]">{p.icon}</span>
                  <div className="min-w-0">
                    <span className="text-[10.5px] font-bold text-[#282C3F] block truncate">
                      {p.name.split(" ")[0]}
                    </span>
                    <span className="text-[8.5px] text-gray-400 block truncate">
                      {p.city}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Editor */}
          <form onSubmit={handleCustomSubmit} className="space-y-2.5 pt-2 border-t border-gray-100">
            <label className="text-[10px] font-extrabold text-[#94969F] uppercase tracking-wider block">
              Custom Overrides
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9.5px] text-[#94969F] font-bold block mb-0.5">City</span>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-[#F5F5F6] border-0 rounded-lg p-2 text-[11px] text-[#282C3F] focus:outline-[#FF3F6C]"
                />
              </div>
              <div>
                <span className="text-[9.5px] text-[#94969F] font-bold block mb-0.5">Weather Cond.</span>
                <input
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full bg-[#F5F5F6] border-0 rounded-lg p-2 text-[11px] text-[#282C3F] focus:outline-[#FF3F6C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9.5px] text-[#94969F] font-bold block mb-0.5">Temp (°C)</span>
                <input
                  type="number"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full bg-[#F5F5F6] border-0 rounded-lg p-2 text-[11px] text-[#282C3F] focus:outline-[#FF3F6C]"
                />
              </div>
              <div>
                <span className="text-[9.5px] text-[#94969F] font-bold block mb-0.5">Season</span>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full bg-[#F5F5F6] border-0 rounded-lg p-2 text-[11px] text-[#282C3F] focus:outline-[#FF3F6C]"
                >
                  <option value="Summer">Summer</option>
                  <option value="Winter">Winter</option>
                  <option value="Monsoon">Monsoon</option>
                  <option value="Autumn">Autumn</option>
                </select>
              </div>
            </div>

            <div>
              <span className="text-[9.5px] text-[#94969F] font-bold block mb-0.5">Festival</span>
              <input
                value={festival}
                onChange={(e) => setFestival(e.target.value)}
                placeholder="e.g. Diwali, Holi or leave empty"
                className="w-full bg-[#F5F5F6] border-0 rounded-lg p-2 text-[11px] text-[#282C3F] focus:outline-[#FF3F6C]"
              />
            </div>

            <div>
              <span className="text-[9.5px] text-[#94969F] font-bold block mb-0.5">Upcoming Event</span>
              <input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="e.g. Friend's Wedding, Tech Interview"
                className="w-full bg-[#F5F5F6] border-0 rounded-lg p-2 text-[11px] text-[#282C3F] focus:outline-[#FF3F6C]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-[#FF3F6C] hover:bg-[#FF3F6C]/90 text-white rounded-lg text-[11.5px] font-bold tracking-wider uppercase cursor-pointer transition-colors shadow-md disabled:opacity-50 mt-2"
            >
              {loading ? "Applying…" : "Apply Custom"}
            </button>
            <button type="button" onClick={() => onChange(null)} className="w-full py-2 border border-[#EAEAEC] text-[#555] rounded-lg text-[11.5px] font-bold tracking-wider uppercase cursor-pointer transition-colors hover:border-[#FF3F6C] hover:text-[#FF3F6C]">
              Reset to Live Context
            </button>
          </form>
        </div>
      )}

      {/* Floating capsule button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-[#FF3F6C] to-[#FF905A] text-white font-extrabold text-[12px] uppercase tracking-wider px-5 py-3 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-white/20 cursor-pointer"
      >
        <span>{isOpen ? "✕" : "⚡"}</span>
        <span>{isOpen ? "Close Simulator" : "Context Simulator"}</span>
        {success && <span className="text-[13px]">✓ Applied!</span>}
      </button>
    </div>
  );
}
