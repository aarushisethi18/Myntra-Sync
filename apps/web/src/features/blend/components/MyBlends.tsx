import { motion } from "framer-motion";
import type { BlendSession } from "../types";

interface Props {
  blends: BlendSession[];
  onOpen: (code: string) => void;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function MyBlends({ blends, onOpen }: Props) {
  if (!blends.length) return null;

  return (
    <section className="my-blends">
      <p className="blend-kicker">YOUR BLENDS</p>
      <div className="my-blends__rail">
        {blends.map((blend, i) => {
          const lastOpened = blend.lastOpenedAt || blend.createdAt;
          return (
            <motion.article
              key={blend.id}
              className="my-blends__card"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => onOpen(blend.inviteCode)}
              tabIndex={0}
              role="button"
              aria-label={`Open Blend with ${blend.partnerName || "partner"}`}
              onKeyDown={(e) => { if (e.key === "Enter") onOpen(blend.inviteCode); }}
            >
              <div className="my-blends__header">
                <div className="my-blends__initials">
                  {blend.partnerName ? blend.partnerName.slice(0, 2).toUpperCase() : "B+"}
                </div>
                {blend.compatibilityScore && (
                  <span className="my-blends__score">{blend.compatibilityScore}%</span>
                )}
              </div>
              <div className="my-blends__body">
                <h3 className="my-blends__name">
                  {blend.blendName || `Blend with ${blend.partnerName || "Partner"}`}
                </h3>
                {blend.partnerName && (
                  <p className="my-blends__partner">with {blend.partnerName}</p>
                )}
              </div>
              <div className="my-blends__footer">
                <time className="my-blends__time">{formatRelativeTime(lastOpened)}</time>
                <span className="my-blends__cta">View →</span>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
