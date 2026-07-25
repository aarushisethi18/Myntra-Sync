import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { SharedClosetItem } from "../types";
import { blendService } from "../services/blendService";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  code: string;
  session: Session;
  items: SharedClosetItem[];
  currentUserId: string;
  onRemove?: (id: string) => void;
}

interface OccasionGroup {
  label: string;
  type: string;
  items: SharedClosetItem[];
  latestAt: string;
}

// ─── Occasion metadata ───────────────────────────────────────────────────────

const OCCASION_META: {
  test: (s: string) => boolean;
  icon: string;
  gradient: string;
  accent: string;
}[] = [
  { test: (s) => /wedding|marriage|nikah|engagement/.test(s),      icon: "◆",  gradient: "linear-gradient(135deg,#f5d0e8,#e8b4d4)", accent: "#9b3c72" },
  { test: (s) => /brunch|lunch|breakfast|cafe/.test(s),             icon: "◐",  gradient: "linear-gradient(135deg,#faebd7,#f5d49b)", accent: "#8b6914" },
  { test: (s) => /airport|travel|flight|trip|vacation|goa|beach/.test(s), icon: "▷", gradient: "linear-gradient(135deg,#c9e8f5,#a8d4ed)", accent: "#1a6a99" },
  { test: (s) => /office|work|meeting|corporate|formal/.test(s),    icon: "▣",  gradient: "linear-gradient(135deg,#dce8f0,#c2d8e8)", accent: "#2c5f7a" },
  { test: (s) => /date/.test(s),                                    icon: "♡",  gradient: "linear-gradient(135deg,#f8d7da,#f3b8c0)", accent: "#9c2f40" },
  { test: (s) => /concert|music|gig|festival|pooja|diwali/.test(s), icon: "♪",  gradient: "linear-gradient(135deg,#e8d5f5,#d4b8ed)", accent: "#6b3a9c" },
  { test: (s) => /college|university|class|campus/.test(s),         icon: "◎",  gradient: "linear-gradient(135deg,#d5ead5,#b8dab8)", accent: "#2d6a2d" },
  { test: (s) => /gym|workout|sports|fitness|yoga/.test(s),         icon: "△",  gradient: "linear-gradient(135deg,#fde8d5,#f5ccaa)", accent: "#9c4a14" },
  { test: (s) => /movie|cinema|show|theatre/.test(s),               icon: "▷",  gradient: "linear-gradient(135deg,#2a232e,#3d3045)", accent: "#e7c67f" },
  { test: (s) => /party|birthday|club|night/.test(s),               icon: "★",  gradient: "linear-gradient(135deg,#f5e8d5,#f0d4a0)", accent: "#7a5414" },
  { test: (s) => /casual|everyday|weekend|daily/.test(s),           icon: "○",  gradient: "linear-gradient(135deg,#ece8e4,#ddd8d0)", accent: "#5c5048" },
];

function getOccasionMeta(type: string, label: string) {
  const norm = `${type} ${label}`.toLowerCase();
  return (
    OCCASION_META.find((m) => m.test(norm)) ?? {
      icon: "◈",
      gradient: "linear-gradient(135deg,#e8e4f0,#d4cee8)",
      accent: "#5b3459",
    }
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRelativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return "Just now";
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(isoString).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

function UserAvatar({ name, size = 24 }: { name: string; size?: number }) {
  const initials = name
    ? name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "U";
  return (
    <div
      className="sc-avatar"
      title={name}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

// ─── Collection Card ─────────────────────────────────────────────────────────

function CollectionCard({
  group,
  onClick,
  index,
}: {
  group: OccasionGroup;
  onClick: () => void;
  index: number;
}) {
  const meta = getOccasionMeta(group.type, group.label);
  const snap0 = group.items[0]?.productSnapshot as Record<string, string | number> | undefined;
  const snap1 = group.items[1]?.productSnapshot as Record<string, string | number> | undefined;
  const snap2 = group.items[2]?.productSnapshot as Record<string, string | number> | undefined;
  const previewImages = [snap0?.image, snap1?.image, snap2?.image].filter(Boolean) as string[];

  // Unique contributors
  const contributors = Array.from(
    new Map(
      group.items.map((it) => [it.savedBy, it.savedByName || (it.savedBy ? "Member" : "You")])
    ).entries()
  );

  return (
    <motion.article
      className="sc-collection-card"
      onClick={onClick}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, boxShadow: "0 28px 60px rgba(70,43,51,.18)" }}
      whileTap={{ scale: 0.985 }}
      style={{ "--card-gradient": meta.gradient, "--card-accent": meta.accent } as React.CSSProperties}
    >
      {/* Hero image collage */}
      <div className="sc-collection-card__hero">
        <div className="sc-collection-card__bg" style={{ background: meta.gradient }} />

        {previewImages.length === 0 && (
          <div className="sc-collection-card__no-image">
            <span className="sc-collection-card__icon">{meta.icon}</span>
          </div>
        )}

        {previewImages.length === 1 && (
          <img
            className="sc-collection-card__img sc-collection-card__img--solo"
            src={previewImages[0]}
            alt={group.label}
          />
        )}

        {previewImages.length === 2 && (
          <div className="sc-collection-card__collage sc-collection-card__collage--2">
            {previewImages.map((src, i) => (
              <img key={i} src={src} alt="" />
            ))}
          </div>
        )}

        {previewImages.length >= 3 && (
          <div className="sc-collection-card__collage sc-collection-card__collage--3">
            <img className="sc-collection-card__collage-main" src={previewImages[0]} alt="" />
            <div className="sc-collection-card__collage-stack">
              <img src={previewImages[1]} alt="" />
              <img src={previewImages[2]} alt="" />
            </div>
          </div>
        )}

        {/* Occasion icon badge */}
        <div className="sc-collection-card__badge" style={{ background: meta.accent }}>
          {meta.icon}
        </div>

        {/* Count pill */}
        {group.items.length > 3 && (
          <div className="sc-collection-card__more-pill">
            +{group.items.length - 3}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="sc-collection-card__body">
        <div className="sc-collection-card__meta">
          <h3 className="sc-collection-card__title">{group.label}</h3>
          <p className="sc-collection-card__count">
            {group.items.length} {group.items.length === 1 ? "look" : "looks"}
          </p>
        </div>

        <div className="sc-collection-card__footer">
          {/* Contributor avatars */}
          <div className="sc-collection-card__contributors">
            {contributors.slice(0, 3).map(([id, name]) => (
              <UserAvatar key={id} name={name} size={22} />
            ))}
          </div>

          <div className="sc-collection-card__time-cta">
            <span className="sc-collection-card__time">{getRelativeTime(group.latestAt)}</span>
            <span className="sc-collection-card__cta">
              View Collection
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

// ─── Collection Drawer ────────────────────────────────────────────────────────

function CollectionDrawer({
  group,
  currentUserId,
  removingId,
  onRemove,
  onClose,
}: {
  group: OccasionGroup;
  currentUserId: string;
  removingId: string | null;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const meta = getOccasionMeta(group.type, group.label);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <motion.div
      className="sc-drawer-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleBackdropClick}
    >
      <motion.div
        ref={drawerRef}
        className="sc-drawer"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        {/* Drawer header */}
        <div className="sc-drawer__header" style={{ background: meta.gradient }}>
          <div className="sc-drawer__header-icon" style={{ background: meta.accent }}>
            {meta.icon}
          </div>
          <div className="sc-drawer__header-text">
            <p className="sc-drawer__header-kicker">SHARED COLLECTION</p>
            <h2 className="sc-drawer__header-title">{group.label}</h2>
            <p className="sc-drawer__header-count">
              {group.items.length} {group.items.length === 1 ? "saved look" : "saved looks"}
            </p>
          </div>
          <button className="sc-drawer__close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Item grid */}
        <div className="sc-drawer__content">
          <div className="sc-drawer__grid">
            <AnimatePresence>
              {group.items.map((item, i) => {
                const snap = item.productSnapshot as Record<string, string | number>;
                const isOwn = item.savedBy === currentUserId;
                return (
                  <motion.article
                    key={item.id}
                    className="sc-item-card"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05 }}
                    layout
                  >
                    {/* Product image */}
                    <div className="sc-item-card__img-wrap">
                      {snap.image ? (
                        <img
                          className="sc-item-card__img"
                          src={String(snap.image)}
                          alt={String(snap.name || "")}
                        />
                      ) : (
                        <div className="sc-item-card__img-placeholder">
                          <span>{meta.icon}</span>
                        </div>
                      )}
                      {isOwn && (
                        <button
                          className="sc-item-card__remove"
                          disabled={removingId === item.id}
                          onClick={() => onRemove(item.id)}
                          aria-label="Remove"
                          title="Remove from closet"
                        >
                          {removingId === item.id ? (
                            <span className="sc-item-card__removing">…</span>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Product info */}
                    <div className="sc-item-card__body">
                      {snap.brand && (
                        <p className="sc-item-card__brand">{String(snap.brand)}</p>
                      )}
                      <h4 className="sc-item-card__name">
                        {String(snap.name || snap.title || "Saved piece")}
                      </h4>
                      {snap.price && (
                        <p className="sc-item-card__price">
                          ₹{Number(snap.price).toLocaleString("en-IN")}
                        </p>
                      )}

                      {item.notes && (
                        <div className="sc-item-card__note">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <rect x="1" y="1" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                            <path d="M3 4h4M3 6h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                          <span>{item.notes}</span>
                        </div>
                      )}

                      <div className="sc-item-card__saved-by">
                        <UserAvatar name={item.savedByName || (isOwn ? "You" : "Partner")} size={18} />
                        <div>
                          <p className="sc-item-card__saved-name">
                            {item.savedByName || (isOwn ? "You" : "Partner")}
                          </p>
                          <p className="sc-item-card__saved-time">
                            {getRelativeTime(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyCloset() {
  return (
    <motion.div
      className="sc-empty"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="sc-empty__icon">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect x="4" y="10" width="28" height="22" rx="4" stroke="#c9a0b4" strokeWidth="1.5" />
          <path d="M12 10V8a6 6 0 1 1 12 0v2" stroke="#c9a0b4" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="18" cy="21" r="3" stroke="#c9a0b4" strokeWidth="1.5" />
        </svg>
      </div>
      <h3 className="sc-empty__title">Your Shared Wardrobe Awaits</h3>
      <p className="sc-empty__body">
        Save outfits from Coordinated Looks or Twin Look to start building
        your collaborative fashion collection.
      </p>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SharedCloset({ code, session, items, currentUserId, onRemove }: Props) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Group items by occasion label
  const groups = items.reduce<Record<string, OccasionGroup>>((acc, item) => {
    const label = item.occasionLabel || item.occasion || "Casual";
    const type = item.occasionType || "Casual";
    if (!acc[label]) {
      acc[label] = { label, type, items: [], latestAt: item.createdAt };
    }
    acc[label].items.push(item);
    // Track newest item in group
    if (item.createdAt > acc[label].latestAt) {
      acc[label].latestAt = item.createdAt;
    }
    return acc;
  }, {});

  const groupList = Object.values(groups).sort(
    (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
  );

  const handleRemove = async (itemId: string) => {
    setRemovingId(itemId);
    try {
      await blendService.removeFromCloset(code, session, itemId);
      onRemove?.(itemId);

      // Auto-close drawer if last item in group was removed
      if (openGroup) {
        const remaining = groups[openGroup]?.items.filter((it) => it.id !== itemId) ?? [];
        if (remaining.length === 0) setOpenGroup(null);
      }
    } finally {
      setRemovingId(null);
    }
  };

  const openGroupData = openGroup ? groups[openGroup] : null;

  return (
    <section className="blend-section shared-closet">
      {/* Section header */}
      <div className="sc-header">
        <div className="sc-header__text">
          <p className="blend-kicker">SHARED CLOSET</p>
          <h2>
            Your joint<br />
            <em>wardrobe story.</em>
          </h2>
          <p className="section-copy">
            A collaborative wardrobe organized by occasion.
            Save outfits, build collections, and dress together.
          </p>
        </div>

        {groupList.length > 0 && (
          <div className="sc-header__stats">
            <div className="sc-stat">
              <strong>{items.length}</strong>
              <span>saved {items.length === 1 ? "look" : "looks"}</span>
            </div>
            <div className="sc-stat">
              <strong>{groupList.length}</strong>
              <span>{groupList.length === 1 ? "collection" : "collections"}</span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <EmptyCloset />
      ) : (
        <motion.div
          className="sc-collections-grid"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.06 } }, hidden: {} }}
        >
          {groupList.map((group, i) => (
            <CollectionCard
              key={group.label}
              group={group}
              index={i}
              onClick={() => setOpenGroup(group.label)}
            />
          ))}
        </motion.div>
      )}

      {/* Side Drawer */}
      <AnimatePresence>
        {openGroupData && (
          <CollectionDrawer
            group={openGroupData}
            currentUserId={currentUserId}
            removingId={removingId}
            onRemove={handleRemove}
            onClose={() => setOpenGroup(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
