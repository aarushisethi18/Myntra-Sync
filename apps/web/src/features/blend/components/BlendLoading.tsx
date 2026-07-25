import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const STEPS = [
  { message: "Reading your wishlists", detail: "Scanning saved pieces…" },
  { message: "Comparing shopping behaviour", detail: "Checking browsing patterns…" },
  { message: "Analysing brand signals", detail: "Finding shared favourites…" },
  { message: "Mapping colour palettes", detail: "Matching your aesthetic frequencies…" },
  { message: "Computing compatibility", detail: "Building your Blend score…" },
  { message: "Curating coordinated looks", detail: "Generating outfits from the catalog…" },
  { message: "Naming your Blend identity", detail: "Almost ready…" },
];

const STEP_DURATION_MS = 800;

export function BlendLoading() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setStep((s) => Math.min(s + 1, STEPS.length - 1)),
      STEP_DURATION_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  const progress = Math.min(((step + 1) / STEPS.length) * 100, 96);
  const current = STEPS[step];

  return (
    <main className="blend-loading" aria-live="polite" aria-label="Generating your Blend">
      <motion.div
        className="blend-orb blend-orb-one"
        animate={{ x: [0, 90, -25, 0], y: [0, -45, 30, 0], scale: [1, 1.22, 0.94, 1] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      <motion.div
        className="blend-orb blend-orb-two"
        animate={{ x: [0, -70, 35, 0], y: [0, 45, -35, 0], scale: [1, 0.85, 1.16, 1] }}
        transition={{ duration: 7, repeat: Infinity }}
      />
      <div className="blend-noise" aria-hidden="true" />

      <section className="blend-loader-card">
        <p className="blend-kicker">MYNTRA SYNC · BLEND</p>

        {/* Pulsing logo spark */}
        <motion.div
          className="blend-loader-spark-ring"
          aria-hidden="true"
          animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        >
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            ✦
          </motion.span>
        </motion.div>

        {/* Step label */}
        <AnimatePresence mode="wait">
          <motion.h1
            key={current.message}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.38 }}
          >
            {current.message}
            <i>…</i>
          </motion.h1>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.p
            key={current.detail}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {current.detail}
          </motion.p>
        </AnimatePresence>

        {/* Step dots */}
        <div className="blend-loader-steps" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`blend-loader-dot ${i <= step ? "blend-loader-dot--done" : ""}`}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="loader-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <motion.span
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
        </div>
        <small>{Math.round(progress)}% complete</small>
      </section>
    </main>
  );
}
