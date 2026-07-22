import { motion } from "framer-motion";
import { compatibility } from "../blendData";

export function Compatibility() {
  return <section className="blend-section compatibility-section"><div className="section-intro"><p className="blend-kicker">02 · IN SYNC</p><h2>It’s more than a<br /><em>good match.</em></h2><p className="section-copy">Your strongest connection is colour: both of you return to softened neutrals, black and one unexpected pop.</p></div><div className="compatibility-visual"><div className="radar"><span>89<small>%</small></span><i /><i /><i /></div><div className="compatibility-bars">{compatibility.map((item, index) => <div key={item.name} className="compatibility-row"><div><span>{item.name}</span><b>{item.value}</b></div><span className="compatibility-track"><motion.i initial={{ width: 0 }} whileInView={{ width: `${item.value}%` }} viewport={{ once: true }} transition={{ duration: .8, delay: index * .08 }} style={{ background: item.color }} /></span></div>)}</div></div></section>;
}
