import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BlendLoading } from "../components/BlendLoading";
import { BlendHero } from "../components/BlendHero";
import { ClosingSections } from "../components/ClosingSections";
import { Compatibility } from "../components/Compatibility";
import { OutfitGenerator } from "../components/OutfitGenerator";
import { PaletteMoodboard } from "../components/PaletteMoodboard";
import { StyleDNA } from "../components/StyleDNA";
import { useBlendExperience } from "../hooks/useBlendExperience";
import "../styles/blend.css";

export default function BlendPage() {
  const experience = useBlendExperience();
  if (experience.status === "empty") return <main className="blend-empty"><p className="blend-kicker">BLEND</p><h1>Your perfect fashion partner is one invite away.</h1><button className="blend-primary">Invite friend <span>→</span></button></main>;
  if (experience.status === "error") return <main className="blend-empty"><p className="blend-kicker">A TINY STYLE DETOUR</p><h1>We lost the thread, not the magic.</h1><button className="blend-primary" onClick={() => experience.setStatus("ready")}>Try again <span>↻</span></button></main>;
  return <AnimatePresence mode="wait">{experience.status === "loading" ? <motion.div key="loading" exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: .45 }}><BlendLoading /></motion.div> : <motion.main key="blend" className="blend-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><header className="blend-nav"><Link to="/" className="blend-logo"><i>m</i> Myntra <em>Sync</em></Link><span>FASHION IS BETTER TOGETHER</span><button onClick={() => experience.setStatus("empty")}>Manage blend</button></header><BlendHero /><StyleDNA /><Compatibility /><PaletteMoodboard /><OutfitGenerator controls={experience.controls} occasions={experience.occasions} outfits={experience.outfits} saved={experience.saved} setControls={experience.setControls} toggleSave={experience.toggleSave} onRegenerate={experience.regenerate} /><ClosingSections /><footer className="blend-footer">Made with a little <span>✦</span> by Myntra Sync</footer></motion.main>}</AnimatePresence>;
}
