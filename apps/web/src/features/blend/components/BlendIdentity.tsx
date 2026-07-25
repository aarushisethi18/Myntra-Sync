import { motion } from "framer-motion";
import type { BlendResult } from "../services/blendService";

interface Props {
  data: BlendResult;
}

const SCORE_CIRCUMFERENCE = 2 * Math.PI * 52;

export function BlendIdentity({ data }: Props) {
  const { blendName, blendDescription, score, people } = data;
  const dashOffset = SCORE_CIRCUMFERENCE - (score / 100) * SCORE_CIRCUMFERENCE;

  return (
    <section className="blend-identity">
      <div className="blend-identity__glow" aria-hidden="true" />

      {/* Kicker */}
      <motion.p
        className="blend-kicker"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        ✦ YOUR FASHION BLEND
      </motion.p>

      {/* People portraits */}
      <motion.div
        className="blend-identity__portraits"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        aria-hidden="true"
      >
        {people.map((person, i) => (
          <div
            key={person.name}
            className="blend-identity__avatar"
            style={{ transform: i === 0 ? "translateX(10px)" : "translateX(-10px)" }}
          >
            {person.image ? (
              <img src={person.image} alt="" />
            ) : (
              <span>{person.initials}</span>
            )}
          </div>
        ))}
        <motion.div
          className="blend-identity__spark"
          animate={{ scale: [0.85, 1.2, 0.85], rotate: [0, 120, 240, 360] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
        >
          ✦
        </motion.div>
      </motion.div>

      {/* Blend Name */}
      <motion.h1
        className="blend-identity__name"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {blendName || people.map((p) => p.name).join(" × ")}
      </motion.h1>

      {/* Description */}
      {blendDescription && (
        <motion.p
          className="blend-identity__desc"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {blendDescription}
        </motion.p>
      )}

      {/* Score ring */}
      <motion.div
        className="blend-identity__score"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.65, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="52" strokeWidth="5" />
          <motion.circle
            cx="60" cy="60" r="52" strokeWidth="5"
            strokeDasharray={SCORE_CIRCUMFERENCE}
            initial={{ strokeDashoffset: SCORE_CIRCUMFERENCE }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="blend-identity__score-text">
          <strong>{score}<small>%</small></strong>
          <span>fashion compatible</span>
        </div>
      </motion.div>

      {/* Style DNA chips */}
      {data.sharedDna.length > 0 && (
        <motion.div
          className="blend-identity__chips"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          {data.sharedDna.slice(0, 3).map((dna) => (
            <span key={dna.name} className="blend-identity__chip">
              {dna.name}
              <b>{dna.confidence}%</b>
            </span>
          ))}
        </motion.div>
      )}
    </section>
  );
}
