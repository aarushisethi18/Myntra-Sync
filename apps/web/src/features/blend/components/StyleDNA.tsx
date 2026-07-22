import { motion } from "framer-motion";
import { blendPeople } from "../blendData";

function DNAProfile({ name, image, labels, blend }: { name: string; image?: string; labels: { name: string; confidence: number }[]; blend?: boolean }) {
  return <motion.article className={`dna-card ${blend ? "dna-card-blend" : ""}`} whileHover={{ y: -7 }}><div className="dna-heading">{image && <img src={image} alt="" />}<div><small>{blend ? "TOGETHER" : "STYLE DNA"}</small><h3>{name}</h3></div></div><div className="dna-chips">{labels.map((label, index) => <motion.span key={label.name} initial={{ opacity: 0, scale: .7 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: index * .08 }}>{label.name}<b>{label.confidence}%</b></motion.span>)}</div><p>{blend ? "You make each other braver. Your shared mood is composed but never predictable." : "Signals from brands, saved pieces and your everyday styling rituals."}</p></motion.article>;
}

export function StyleDNA() {
  const blendLabels = [{ name: "Elevated casual", confidence: 94 }, { name: "Modern classic", confidence: 90 }, { name: "Off-duty luxe", confidence: 82 }];
  return <section className="blend-section dna-section"><div className="section-intro"><p className="blend-kicker">01 · THE SCIENCE OF YOU</p><h2>Two tastes. One<br /><em>style frequency.</em></h2></div><div className="dna-grid">{blendPeople.map((person) => <DNAProfile key={person.name} {...person} />)}<DNAProfile name="Aaranya DNA" labels={blendLabels} blend /></div></section>;
}
