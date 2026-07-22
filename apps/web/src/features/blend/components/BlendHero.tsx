import { motion } from "framer-motion";
import { blendPeople } from "../blendData";

export function BlendHero() {
  return <section className="blend-hero">
    <motion.div className="hero-glow" animate={{ scale: [1, 1.16, 1], opacity: [.55, .9, .55] }} transition={{ duration: 5, repeat: Infinity }} />
    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .1 }} className="blend-kicker">A SHARED STYLE STORY</motion.p>
    <motion.h1 initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 18, delay: .2 }}>Aaranya<br /><em>Blend</em></motion.h1>
    <motion.p className="hero-copy" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .45 }}>Your style languages have found a shared dialect: polished, playful and quietly bold.</motion.p>
    <motion.div className="hero-people" initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .35, type: "spring" }}>
      {blendPeople.map((person, index) => <motion.figure key={person.name} whileHover={{ y: -8, rotate: index ? 3 : -3 }}><img src={person.image} alt={person.name} /><figcaption>{person.name}</figcaption></motion.figure>)}
      <span>✦</span>
    </motion.div>
    <motion.div className="score-orbit" initial={{ opacity: 0, scale: .7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .65, type: "spring" }}><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" /><motion.circle cx="60" cy="60" r="52" initial={{ pathLength: 0 }} animate={{ pathLength: .89 }} transition={{ duration: 1.7, delay: .75 }} /></svg><strong>89<small>%</small></strong><span>fashion compatible</span></motion.div>
    <motion.div className="hero-tags" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .9 }}><span>Neutral romance</span><span>Street polish</span><span>Soft structure</span></motion.div>
  </section>;
}
