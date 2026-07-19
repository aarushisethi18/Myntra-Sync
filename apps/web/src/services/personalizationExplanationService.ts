import type { FashionDna } from "../types/catalog";
import type { LiveContext } from "./signalCollectionService";

export type HeroMessage = { title: string; description: string };
export type PersonalizationExplanation = {
  hero?: HeroMessage;
  carousel?: string;
  syncEdit: string[];
  syncSummary?: string;
};

function topAffinity(dna: FashionDna | null): string | undefined {
  return [...(dna?.brandAffinity ?? []), ...(dna?.categoryAffinity ?? []), ...(dna?.styleAffinity ?? [])]
    .sort((left, right) => right.score - left.score)[0]?.value;
}

/** Produces only messaging supported by live context, Fashion DNA, or a recommendation reason. */
export function createPersonalizationExplanation(context: LiveContext | null, dna: FashionDna | null, recommendationReason?: string): PersonalizationExplanation {
  const event = context?.calendar.events[0]?.title;
  const festival = context?.festival?.name;
  const rawWeather = context?.weather?.condition;
  const weather = rawWeather && rawWeather !== "Unknown" && rawWeather !== "Unavailable" ? rawWeather : undefined;
  const city = context?.location.city;
  const affinity = topAffinity(dna);
  const syncEdit = [
    city && weather ? `${city} weather: ${weather}` : undefined,
    festival ? `Festival: ${festival}` : undefined,
    event ? `Upcoming: ${event}` : undefined,
    affinity ? `Fashion DNA affinity: ${affinity}` : undefined,
  ].filter((signal): signal is string => Boolean(signal));
  const syncSummary = event ? `Your AI stylist is preparing looks for ${event}.` : festival ? `Your AI stylist is preparing looks for ${festival}.` : weather && city ? `Your AI stylist is adapting your edit to ${weather} weather in ${city}.` : affinity ? `Your AI stylist is leading with your ${affinity} Fashion DNA affinity.` : undefined;

  if (event) return { hero: { title: `Ready for ${event}`, description: "Your edit reflects your upcoming calendar event." }, carousel: recommendationReason || (affinity ? `Picked from your Fashion DNA: ${affinity}.` : `Selected for your upcoming event: ${event}.`), syncEdit, syncSummary };
  if (festival) return { hero: { title: `Celebrate ${festival}`, description: "Your edit reflects the upcoming festival." }, carousel: recommendationReason || (affinity ? `Picked from your Fashion DNA: ${affinity}.` : `Selected for ${festival}.`), syncEdit, syncSummary };
  if (weather) return { hero: { title: `Styled for ${weather} weather`, description: "Your edit reflects current live weather." }, carousel: recommendationReason || (affinity ? `Picked from your Fashion DNA: ${affinity}.` : `Selected for today’s weather: ${weather}.`), syncEdit, syncSummary };
  return { carousel: recommendationReason || (affinity ? `Picked from your Fashion DNA: ${affinity}.` : undefined), syncEdit, syncSummary };
}
