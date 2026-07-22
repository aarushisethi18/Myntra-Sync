import { AnimatePresence, motion } from "framer-motion";
import type { BlendOutfit } from "../blendData";
import type { BlendControls } from "../types";

const moods = ["Effortless", "Romantic", "Bold"];
const budgets = ["₹2,500", "₹5,000", "Luxury"];
const weather = ["Warm", "Rain", "Cool"];

function SelectPill({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="blend-select"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

export function OutfitGenerator({ controls, occasions, outfits, saved, setControls, toggleSave, onRegenerate }: { controls: BlendControls; occasions: string[]; outfits: BlendOutfit[]; saved: string[]; setControls: (next: BlendControls) => void; toggleSave: (id: string) => void; onRegenerate: () => void }) {
  const update = (key: keyof BlendControls, value: string) => setControls({ ...controls, [key]: value });
  return <section className="blend-section outfit-section"><div className="outfit-heading"><div><p className="blend-kicker">04 · LOOKS MADE FOR TWO</p><h2>Wear the<br /><em>same story differently.</em></h2></div><button className="blend-primary" onClick={onRegenerate}>Regenerate <span>↻</span></button></div><div className="blend-controls"><SelectPill label="Occasion" value={controls.occasion} options={occasions} onChange={(value) => update("occasion", value)} /><SelectPill label="Mood" value={controls.mood} options={moods} onChange={(value) => update("mood", value)} /><SelectPill label="Weather" value={controls.weather} options={weather} onChange={(value) => update("weather", value)} /><SelectPill label="Budget" value={controls.budget} options={budgets} onChange={(value) => update("budget", value)} /></div><motion.div className="outfit-rail" layout><AnimatePresence mode="popLayout">{outfits.map((outfit, index) => <motion.article className="outfit-card" layout key={outfit.id} initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .94 }} transition={{ delay: index * .07 }} whileHover={{ y: -10 }}><div className="outfit-image"><img src={outfit.image} alt={outfit.title} /><span>{outfit.match}% match</span><button aria-label="Save outfit" onClick={() => toggleSave(outfit.id)}>{saved.includes(outfit.id) ? "♥" : "♡"}</button></div><div className="outfit-body"><p>{outfit.occasion} · {outfit.weather}</p><h3>{outfit.title}</h3><ul>{outfit.pieces.map((piece) => <li key={piece}>{piece}</li>)}</ul><div className="blend-meter"><span style={{ width: `${outfit.yours}%` }} /><b>{outfit.yours}% you</b><em>{100 - outfit.yours}% friend</em></div><blockquote>“{outfit.explanation}”</blockquote><footer><strong>{outfit.price}</strong><button>Shop look →</button></footer></div></motion.article>)}</AnimatePresence></motion.div></section>;
}
