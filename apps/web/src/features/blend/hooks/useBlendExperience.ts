import { useCallback, useEffect, useMemo, useState } from "react";
import { blendOutfits, occasions } from "../blendData";
import type { BlendControls, BlendStatus } from "../types";

const defaults: BlendControls = { occasion: "Cafe", mood: "Effortless", budget: "₹5,000", weather: "Warm" };

export function useBlendExperience() {
  const [status, setStatus] = useState<BlendStatus>("loading");
  const [controls, setControls] = useState<BlendControls>(defaults);
  const [generation, setGeneration] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setStatus("ready"), 4400);
    return () => window.clearTimeout(timer);
  }, []);

  const outfits = useMemo(() => {
    const offset = generation % blendOutfits.length;
    return [...blendOutfits.slice(offset), ...blendOutfits.slice(0, offset)];
  }, [generation]);

  const regenerate = useCallback(() => {
    setStatus("loading");
    window.setTimeout(() => {
      setGeneration((value) => value + 1);
      setStatus("ready");
    }, 2200);
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }, []);

  return { controls, generation, occasions, outfits, regenerate, saved, setControls, setStatus, status, toggleSave };
}
