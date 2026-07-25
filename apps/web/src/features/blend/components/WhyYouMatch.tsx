import { motion } from "framer-motion";

interface Props {
  insights: string[];
  breakdown: { name: string; value: number; color: string }[];
  reasons: string[];
}

const ICONS = ["◈", "◎", "◆", "○", "◐", "★"];

export function WhyYouMatch({ insights, breakdown, reasons }: Props) {
  if (!insights.length && !breakdown.length) return null;

  return (
    <section className="blend-section why-you-match">
      <div className="section-intro">
        <p className="blend-kicker">WHY YOU MATCH</p>
        <h2>
          It runs<br />
          <em>deeper than taste.</em>
        </h2>
        <p className="section-copy">
          Your compatibility is built on real signals — what you browse, save, buy, and when.
        </p>
      </div>

      {/* Merged compatibility metrics band */}
      {breakdown.length > 0 && (
        <div className="why-match__metrics">
          {breakdown.map((item, i) => (
            <motion.div
              key={item.name}
              className="why-match__metric-row"
              initial={{ opacity: 0, x: -14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="why-match__metric-label">
                <span>{item.name}</span>
                <b style={{ color: item.color }}>{Math.round(item.value)}%</b>
              </div>
              <div className="why-match__metric-track">
                <motion.div
                  className="why-match__metric-fill"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${item.value}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 + 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  style={{ background: item.color }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* AI behavioral insights */}
      {insights.length > 0 && (
        <div className="why-match__grid">
          {insights.map((insight, i) => (
            <motion.article
              key={i}
              className="why-match__card"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="why-match__icon">{ICONS[i % ICONS.length]}</span>
              <p>{insight}</p>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}
