import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { BlendResult } from "../services/blendService";

interface Props {
  data: BlendResult;
}

// --- Signal icon helper -------------------------------------------------------
function signalIcon(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("ethnic") || lower.includes("save") || lower.includes("outfit")) return "?";
  if (lower.includes("colour") || lower.includes("color") || lower.includes("shade")) return "??";
  if (lower.includes("budget") || lower.includes("shopping")) return "??";
  if (lower.includes("browse") || lower.includes("categor")) return "??";
  return "?";
}

// --- Collage layout configs ---------------------------------------------------
type LayoutCell = { gridArea: string };
type Layout = { template: string; cells: LayoutCell[] };

const COLLAGE_LAYOUTS: Record<number, Layout> = {
  5: {
    template: `"a a b" "a a c" "d e c"`,
    cells: [{ gridArea: "a" }, { gridArea: "b" }, { gridArea: "c" }, { gridArea: "d" }, { gridArea: "e" }],
  },
  4: {
    template: `"a a b" "a a c" "d d c"`,
    cells: [{ gridArea: "a" }, { gridArea: "b" }, { gridArea: "c" }, { gridArea: "d" }],
  },
  3: {
    template: `"a a b" "a a c"`,
    cells: [{ gridArea: "a" }, { gridArea: "b" }, { gridArea: "c" }],
  },
  2: {
    template: `"a b"`,
    cells: [{ gridArea: "a" }, { gridArea: "b" }],
  },
};

function getLayout(count: number): Layout {
  if (count >= 5) return COLLAGE_LAYOUTS[5];
  if (count === 4) return COLLAGE_LAYOUTS[4];
  if (count === 3) return COLLAGE_LAYOUTS[3];
  return COLLAGE_LAYOUTS[2];
}

// --- Animated colour swatch ---------------------------------------------------
function ColorSwatch({ name, hex }: { name: string; hex: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="sa-swatch-wrap"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        className="sa-swatch"
        style={{ background: hex }}
        whileHover={{ scale: 1.18 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      />
      <span className="sa-swatch-name">{name}</span>
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="sa-swatch-tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            Frequently worn by both
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Main component -----------------------------------------------------------
export function SharedAesthetic({ data }: Props) {
  const images = (data.moodboard.images ?? []).filter(Boolean);
  const palette = data.palette ?? [];
  const sharedDna = data.sharedDna ?? [];
  const signals = data.moodboard.styleSignals ?? [];
  const brands = data.moodboard.sharedBrands ?? [];
  const aestheticDesc = data.moodboard.aestheticDescription;
  const hasMoodboard = images.length >= 2;
  const layout = getLayout(images.length);

  return (
    <section className="sa-section blend-section">

      {/* -- Two-column body -------------------------------------------------- */}
      <div className="sa-body">

        {/* LEFT — Heading + description + palette + DNA */}
        <div className="sa-left">
          <p className="blend-kicker">SHARED AESTHETIC</p>
          <h2>
            A style that<br />
            <em>feels like both of you.</em>
          </h2>

          {aestheticDesc && (
            <p className="sa-description">{aestheticDesc}</p>
          )}

          {palette.length > 0 && (
            <div className="sa-palette-swatches">
              {palette.slice(0, 5).map((c) => (
                <ColorSwatch key={c.name} name={c.name} hex={c.hex} />
              ))}
            </div>
          )}

          {sharedDna.length > 0 && (
            <div className="sa-dna-chips">
              {sharedDna.map((tag) => (
                <span key={tag.name} className="sa-dna-chip">
                  {tag.name}
                  <b>{tag.confidence}%</b>
                </span>
              ))}
            </div>
          )}

          {brands.length >= 2 && (
            <div className="sa-brands-block">
              <p className="sa-brands-label">MOST LOVED BRANDS</p>
              <div className="sa-brands-row">
                {brands.map((brand) => (
                  <span key={brand} className="sa-brand-pill">{brand}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Editorial collage */}
        <div className="sa-right">
          {hasMoodboard ? (
            <div className="sa-collage-wrap">
              <div
                className="sa-collage"
                style={{ gridTemplateAreas: layout.template }}
              >
                {images.slice(0, layout.cells.length).map((src, i) => (
                  <motion.div
                    key={src}
                    className="sa-collage__cell"
                    style={{ gridArea: layout.cells[i].gridArea }}
                    initial={{ opacity: 0, scale: 0.97 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.09, duration: 0.55, ease: "easeOut" }}
                    whileHover={{ scale: 1.04, zIndex: 2 }}
                  >
                    <img
                      src={src}
                      alt={`Shared style pick ${i + 1}`}
                      className="sa-collage__img"
                      loading="lazy"
                    />
                  </motion.div>
                ))}
              </div>

              {sharedDna.length > 0 && (
                <motion.div
                  className="sa-glass-card"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  <p className="sa-glass-label">SHARED STYLE PROFILE</p>
                  <div className="sa-glass-chips">
                    {sharedDna.slice(0, 5).map((tag) => (
                      <span key={tag.name} className="sa-glass-chip">{tag.name}</span>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="sa-collage-fallback">
              <div className="sa-fallback-gradient" />
              {sharedDna.length > 0 && (
                <div className="sa-glass-card sa-glass-card--center">
                  <p className="sa-glass-label">SHARED STYLE PROFILE</p>
                  <div className="sa-glass-chips">
                    {sharedDna.slice(0, 5).map((tag) => (
                      <span key={tag.name} className="sa-glass-chip">{tag.name}</span>
                    ))}
                  </div>
                  <p className="sa-fallback-note">{data.moodboard.visualStyle}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* -- Style signal cards ----------------------------------------------- */}
      {signals.length > 0 && (
        <div className="sa-signals">
          {signals.map((signal, i) => (
            <motion.div
              key={signal}
              className="sa-signal-card"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.45 }}
              whileHover={{ y: -3 }}
            >
              <span className="sa-signal-icon">{signalIcon(signal)}</span>
              <p className="sa-signal-text">{signal}</p>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
