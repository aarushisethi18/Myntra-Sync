import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CHIPS = [
  "Wedding", "Brunch", "Airport", "Office", "Date Night", "Concert",
  "College", "Vacation", "Festival", "Casual", "Gym", "Movie Night", "Party"
];

interface SaveClosetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { occasionType: string; occasionLabel: string; notes: string }) => void;
  title?: string;
}

export function SaveClosetModal({ isOpen, onClose, onConfirm, title = "✨ Save to Shared Closet" }: SaveClosetModalProps) {
  const [selectedChip, setSelectedChip] = useState("Casual");
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const type = isCustom ? "Custom" : selectedChip;
    const label = isCustom ? customValue.trim() : selectedChip;
    if (isCustom && !label) {
      alert("Please enter a custom occasion name.");
      return;
    }
    onConfirm({
      occasionType: type,
      occasionLabel: label || "Casual",
      notes: notes.trim(),
    });
  };

  return (
    <AnimatePresence>
      <div className="blend-modal-backdrop" onClick={onClose} role="presentation">
        <motion.div
          className="blend-modal-content"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="blend-modal-header">
            <h3>{title}</h3>
            <button className="blend-modal-close" onClick={onClose} aria-label="Close modal">×</button>
          </header>

          <form onSubmit={handleSubmit} className="blend-modal-form">
            <div className="blend-modal-field">
              <label className="blend-modal-label">Where does this outfit belong?</label>
              
              <div className="blend-modal-chips">
                {CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className={`blend-modal-chip ${(!isCustom && selectedChip === chip) ? "blend-modal-chip--active" : ""}`}
                    onClick={() => {
                      setIsCustom(false);
                      setSelectedChip(chip);
                    }}
                  >
                    {chip}
                  </button>
                ))}
                
                <button
                  type="button"
                  className={`blend-modal-chip blend-modal-chip--custom ${isCustom ? "blend-modal-chip--active" : ""}`}
                  onClick={() => setIsCustom(true)}
                >
                  + Custom Occasion
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isCustom && (
                <motion.div
                  className="blend-modal-field"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <label className="blend-modal-label" htmlFor="custom-occ">Occasion Name</label>
                  <input
                    id="custom-occ"
                    type="text"
                    className="blend-modal-input"
                    placeholder="e.g. Riya's Wedding, Goa Trip, Freshers Party"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    required
                    autoFocus
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="blend-modal-field">
              <label className="blend-modal-label" htmlFor="occ-notes">Optional Notes</label>
              <textarea
                id="occ-notes"
                className="blend-modal-textarea"
                placeholder="e.g. Perfect for Riya's wedding, brunch with the girls, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <footer className="blend-modal-footer">
              <button type="button" className="blend-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="blend-primary">Confirm &amp; Save</button>
            </footer>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
