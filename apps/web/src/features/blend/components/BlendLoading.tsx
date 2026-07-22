import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { blendPeople } from "../blendData";

const messages = ["Analyzing wardrobes", "Matching aesthetics", "Finding shared colours", "Comparing style rituals", "Generating coordinated looks", "Creating your Blend"];

export function BlendLoading() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setStep((value) => Math.min(value + 1, messages.length - 1)), 700);
    return () => window.clearInterval(id);
  }, []);
  const progress = Math.min(((step + 1) / messages.length) * 100, 96);

  return <main className="blend-loading">
    <motion.div className="blend-orb blend-orb-one" animate={{ x: [0, 90, -25, 0], y: [0, -45, 30, 0], scale: [1, 1.22, .94, 1] }} transition={{ duration: 6, repeat: Infinity }} />
    <motion.div className="blend-orb blend-orb-two" animate={{ x: [0, -70, 35, 0], y: [0, 45, -35, 0], scale: [1, .85, 1.16, 1] }} transition={{ duration: 7, repeat: Infinity }} />
    <div className="blend-noise" />
    <section className="blend-loader-card">
      <p className="blend-kicker">MYNTRA SYNC PRESENTS</p>
      <div className="loader-portraits" aria-hidden="true">
        {blendPeople.map((person, index) => <motion.img key={person.name} src={person.image} alt="" animate={{ x: index ? [-8, -20, -8] : [8, 20, 8], rotate: index ? [4, 0, 4] : [-4, 0, -4] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />)}
        <motion.span className="loader-spark" animate={{ scale: [.8, 1.2, .8], rotate: [0, 90, 180] }} transition={{ duration: 1.8, repeat: Infinity }}>✦</motion.span>
      </div>
      <div className="loader-ring"><motion.span animate={{ rotate: 360 }} transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }} /></div>
      <AnimatePresence mode="wait"><motion.h1 key={messages[step]} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .35 }}>{messages[step]}<i>...</i></motion.h1></AnimatePresence>
      <p>Two style stories, becoming one.</p>
      <div className="loader-progress"><motion.span animate={{ width: `${progress}%` }} transition={{ duration: .55, ease: "easeOut" }} /></div>
      <small>{Math.round(progress)}% complete</small>
    </section>
  </main>;
}
