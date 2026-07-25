import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { OutfitVote } from "../types";
import { blendService } from "../services/blendService";

const VOTE_OPTIONS = [
  { key: "love" as const, emoji: "❤️", label: "Love it" },
  { key: "wear_soon" as const, emoji: "🔥", label: "Wear soon" },
  { key: "skip" as const, emoji: "👎", label: "Skip" },
];

interface Props {
  outfitKey: string;
  outfitTitle: string;
  code: string;
  session: Session;
  votes: OutfitVote[];
  currentUserId: string;
  onVote?: (vote: OutfitVote) => void;
}

function voteMatch(votes: OutfitVote[], key: string): { bothVoted: boolean; agree: boolean; emoji: string } {
  const matching = votes.filter((v) => v.vote === key);
  if (matching.length >= 2) return { bothVoted: true, agree: true, emoji: key === "love" ? "💜" : key === "wear_soon" ? "🔥" : "👋" };
  return { bothVoted: false, agree: false, emoji: "" };
}

export function OutfitVoting({ outfitKey, outfitTitle, code, session, votes, currentUserId, onVote }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [optimisticVote, setOptimisticVote] = useState<string | null>(null);

  const myVote = votes.find((v) => v.userId === currentUserId);
  const partnerVote = votes.find((v) => v.userId !== currentUserId);
  const activeVote = optimisticVote ?? myVote?.vote ?? null;

  const handleVote = async (voteKey: "love" | "wear_soon" | "skip") => {
    if (submitting) return;
    setOptimisticVote(voteKey);
    setSubmitting(true);
    try {
      const result = await blendService.vote(code, session, { outfitKey, vote: voteKey });
      onVote?.(result);
    } catch {
      setOptimisticVote(null); // revert on error
    } finally {
      setSubmitting(false);
    }
  };

  // Check for match between users
  const matchResult = votes.length >= 2
    ? VOTE_OPTIONS.find(({ key }) => voteMatch(votes, key).agree)
    : null;

  return (
    <div className="outfit-voting">
      <p className="outfit-voting__label">Vote on this look:</p>

      <div className="outfit-voting__buttons" role="group" aria-label={`Vote on ${outfitTitle}`}>
        {VOTE_OPTIONS.map(({ key, emoji, label }) => (
          <motion.button
            key={key}
            className={`outfit-voting__btn ${activeVote === key ? "outfit-voting__btn--active" : ""}`}
            whileTap={{ scale: 0.92 }}
            onClick={() => handleVote(key)}
            disabled={submitting}
            aria-pressed={activeVote === key}
            title={label}
          >
            {emoji}
            <span>{label}</span>
          </motion.button>
        ))}
      </div>

      {/* Partner vote indicator */}
      {partnerVote && (
        <p className="outfit-voting__partner">
          {partnerVote.userName ? `${partnerVote.userName} voted: ` : "Partner: "}
          {VOTE_OPTIONS.find((v) => v.key === partnerVote.vote)?.emoji}
          {" "}
          {VOTE_OPTIONS.find((v) => v.key === partnerVote.vote)?.label}
        </p>
      )}

      {/* Match message */}
      <AnimatePresence>
        {matchResult && (
          <motion.p
            className="outfit-voting__match"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            ✨ You both {matchResult.key === "love" ? "love" : matchResult.key === "wear_soon" ? "want to wear" : "skipped"} this look!
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
