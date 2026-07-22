import { motion } from "framer-motion";
import { moodboardImages } from "../blendData";

const palette = [{ n: "Rose cloud", c: "#e9b6ba" }, { n: "Espresso", c: "#563e37" }, { n: "Butter", c: "#f2d580" }, { n: "Ink", c: "#24242d" }, { n: "Moss", c: "#738174" }];
export function PaletteMoodboard() {
  return <section className="blend-section palette-section"><div className="palette-copy"><p className="blend-kicker">03 · YOUR SHARED SHADE CARD</p><h2>Colours that<br /><em>feel like both of you.</em></h2><div className="palette-list">{palette.map((color, index) => <motion.button key={color.n} whileHover={{ x: 8 }} initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * .08 }}><i style={{ background: color.c }} /><span>{color.n}</span><small>{color.c}</small></motion.button>)}</div></div><div className="moodboard"><div className="moodboard-title"><span>THE AARANYA BOARD</span><b>Old money × street luxe</b></div>{moodboardImages.map((image, index) => <motion.img key={image} src={image} alt="Aaranya blend fashion inspiration" initial={{ opacity: 0, scale: .9 }} whileInView={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.04 }} viewport={{ once: true }} transition={{ delay: index * .07 }} />)}</div></section>;
}
