import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { addToBag, addToWishlist } from "../../../services/catalogService";
import { BlendIdentity } from "../components/BlendIdentity";
import { BlendLoading } from "../components/BlendLoading";
import { MyBlends } from "../components/MyBlends";
import { OutfitVoting } from "../components/OutfitVoting";
import { SaveClosetModal } from "../components/SaveClosetModal";
import { SharedAesthetic } from "../components/SharedAesthetic";
import { SharedCloset } from "../components/SharedCloset";
import { SharedWishlist } from "../components/SharedWishlist";
import { TwinLook } from "../components/TwinLook";
import { WhyYouMatch } from "../components/WhyYouMatch";
import { blendService, type BlendResult } from "../services/blendService";
import type { BlendSession, OutfitVote, SharedClosetItem } from "../types";
import type { Session } from "@supabase/supabase-js";
import "../styles/blend.css";

type Stage = "landing" | "creating" | "waiting" | "joining" | "loading" | "result" | "error";
const POLL_INTERVAL_MS = 2500;
const COLLAB_POLL_MS = 5000;

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "Something interrupted your Blend. Please try again.";
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BlendFlowPage() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { session, user } = useAuth();

  const [stage, setStage] = useState<Stage>(inviteCode ? "joining" : "landing");
  const [code, setCode] = useState(inviteCode ?? "");
  const [result, setResult] = useState<BlendResult | null>(null);
  const [host, setHost] = useState("Your fashion partner");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [myBlends, setMyBlends] = useState<BlendSession[]>([]);
  const [closetItems, setClosetItems] = useState<SharedClosetItem[]>([]);
  const [votes, setVotes] = useState<OutfitVote[]>([]);

  // ── More Looks state ─────────────────────────────────────────────────────
  const [displayedOutfits, setDisplayedOutfits] = useState<BlendResult["outfits"]>([]);
  const [loadingMoreLooks, setLoadingMoreLooks] = useState(false);

  // ── Save Closet Modal state ──────────────────────────────────────────────
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const pendingSaveProduct = useRef<{
    id: string;
    title: string;
    brand: string;
    category: string;
    price: number;
    image: string;
  } | null>(null);

  const inviteUrl = code ? `${window.location.origin}/blend/invite/${code}` : "";
  const showToast = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 3200);
  }, []);

  // ── Sync displayedOutfits when result first loads ─────────────────────────
  useEffect(() => {
    if (result?.outfits) setDisplayedOutfits(result.outfits);
  }, [result?.sessionId]); // only on new session, not every refetch

  // ── Fetch My Blends on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    blendService.myBlends(session).then(setMyBlends).catch(() => {/* silent */});
  }, [session]);

  // ── Load collaborative data when result is available ─────────────────────
  useEffect(() => {
    if (!result || !session || !code) return;
    blendService.getCloset(code, session).then(setClosetItems).catch(() => {});
    blendService.getVotes(code, session).then(setVotes).catch(() => {});
  }, [result, session, code]);

  // ── Poll for live collaborative updates (closet + votes) ─────────────────
  useEffect(() => {
    if (stage !== "result" || !session || !code) return;
    const timer = window.setInterval(async () => {
      try {
        const [freshCloset, freshVotes] = await Promise.all([
          blendService.getCloset(code, session),
          blendService.getVotes(code, session),
        ]);
        setClosetItems(freshCloset);
        setVotes(freshVotes);
      } catch { /* silent background sync */ }
    }, COLLAB_POLL_MS);
    return () => window.clearInterval(timer);
  }, [code, session, stage]);

  const fetchResult = useCallback(async () => {
    if (!session || !code) return;
    setStage("loading");
    try {
      const data = await blendService.result(code, session);
      setResult(data);
      setStage("result");
    } catch (reason) {
      setError(messageFor(reason));
      setStage("error");
    }
  }, [code, session]);

  const create = useCallback(async () => {
    if (!session) return;
    setStage("creating");
    try {
      const next = await blendService.create(session);
      setCode(next.inviteCode);
      setStage("waiting");
      showToast("Blend created! Your invite is ready.");
    } catch (reason) {
      setError(messageFor(reason));
      setStage("error");
    }
  }, [session, showToast]);

  const copy = useCallback(async () => {
    try { await navigator.clipboard.writeText(inviteUrl); showToast("Invite link copied."); }
    catch { showToast("Copy the invite link from the address bar."); }
  }, [inviteUrl, showToast]);

  const share = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Blend with me on Myntra Sync", text: "Let's discover our shared fashion personality.", url: inviteUrl });
        showToast("Invite shared.");
        return;
      } catch { /* fallback to copy */ }
    }
    await copy();
  }, [copy, inviteUrl, showToast]);

  const join = useCallback(async () => {
    if (!session || !code) return;
    setStage("loading");
    try {
      await blendService.accept(code, session);
      await fetchResult();
    } catch (reason) {
      setError(messageFor(reason));
      setStage("error");
    }
  }, [code, fetchResult, session]);

  // ── Show More Looks — only regenerates outfits, not the whole Blend ──────
  const handleShowMoreLooks = useCallback(async () => {
    if (!session || !code) return;
    setLoadingMoreLooks(true);
    try {
      const excludeIds = displayedOutfits
        .map((o) => o.id)
        .filter((id) => id && !id.startsWith("outfit-"));
      const newLooks = await blendService.getMoreLooks(code, session, {
        excludeProductIds: excludeIds,
      });
      if (newLooks && newLooks.length > 0) {
        setDisplayedOutfits((prev) => [...prev, ...newLooks]);
        showToast(`✨ ${newLooks.length} new look${newLooks.length === 1 ? "" : "s"} added`);
      } else {
        showToast("No new looks found right now. Try again later!");
      }
    } catch {
      showToast("Could not load more looks right now.");
    } finally {
      setLoadingMoreLooks(false);
    }
  }, [code, session, displayedOutfits, showToast]);

  // ── Poll for partner joining ──────────────────────────────────────────────
  useEffect(() => {
    if (stage !== "waiting" || !session || !code) return;
    let active = true;
    const checkStatus = async () => {
      try {
        const invite = await blendService.inspect(code, session);
        if (active && invite.status === "joined") await fetchResult();
      } catch (reason) {
        if (active) { setError(messageFor(reason)); setStage("error"); }
      }
    };
    void checkStatus();
    const timer = window.setInterval(() => { void checkStatus(); }, POLL_INTERVAL_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [code, fetchResult, session, stage]);

  // ── Handle incoming invite URL ────────────────────────────────────────────
  useEffect(() => {
    if (!inviteCode || !session) return;
    void blendService.inspect(inviteCode, session).then((invite) => {
      setHost(invite.hostName ?? "Your fashion partner");
      if (invite.status === "joined") { setCode(inviteCode); void fetchResult(); }
      else if (invite.status === "expired") { setError("This Blend invite has expired."); setStage("error"); }
      else setStage("joining");
    }).catch((reason) => { setError(messageFor(reason)); setStage("error"); });
  }, [fetchResult, inviteCode, session]);

  // ── Save to closet modal flow ─────────────────────────────────────────────
  const handleOpenSaveModal = useCallback((product: {
    id: string; title: string; brand: string; category: string; price: number; image: string;
  }) => {
    pendingSaveProduct.current = product;
    setIsSaveModalOpen(true);
  }, []);

  const handleClosetModalConfirm = useCallback(async (data: {
    occasionType: string; occasionLabel: string; notes: string;
  }) => {
    if (!session || !code || !pendingSaveProduct.current) return;
    setIsSaveModalOpen(false);
    const product = pendingSaveProduct.current;
    pendingSaveProduct.current = null;
    try {
      const snapshot = {
        name: product.title, brand: product.brand, category: product.category,
        price: product.price, image: product.image,
      };
      const saved = await blendService.saveToCloset(code, session, {
        productId: product.id || undefined,
        productSnapshot: snapshot,
        occasion: data.occasionLabel,
        occasionType: data.occasionType,
        occasionLabel: data.occasionLabel,
        notes: data.notes,
      });
      setClosetItems((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      showToast(`❤ "${product.title}" saved to your Shared Closet`);
    } catch {
      showToast("Could not save to closet. Please try again.");
    }
  }, [session, code, showToast]);

  // ── Outfit-card legacy Save to Closet (outfits without product IDs) ───────
  const handleSaveOutfitToCloset = useCallback(async (outfit: BlendResult["outfits"][0]) => {
    handleOpenSaveModal({
      id: outfit.id ?? "",
      title: outfit.title,
      brand: outfit.brand ?? "",
      category: outfit.category ?? "",
      price: Number(outfit.price?.replace?.(/[^\d.]/g, "") ?? 0),
      image: outfit.image ?? "",
    });
  }, [handleOpenSaveModal]);

  // ── Vote handler ──────────────────────────────────────────────────────────
  const handleVote = useCallback((vote: OutfitVote) => {
    setVotes((prev) => {
      const without = prev.filter((v) => !(v.outfitKey === vote.outfitKey && v.userId === vote.userId));
      return [...without, vote];
    });
  }, []);

  // ── Product action handlers (wishlist / bag) ──────────────────────────────
  const handleAddToWishlist = useCallback(async (productId: string) => {
    if (!session) return;
    try {
      await addToWishlist(session, productId);
      showToast("♥ Added to your Wishlist");
    } catch {
      showToast("Could not add to wishlist.");
    }
  }, [session, showToast]);

  const handleAddToBag = useCallback(async (productId: string) => {
    if (!session) return;
    try {
      await addToBag(session, productId, "M");
      showToast("👜 Added to your Bag");
    } catch {
      showToast("Could not add to bag.");
    }
  }, [session, showToast]);

  const currentUserId = user?.id ?? "";

  return (
    <>
      <AnimatePresence mode="wait">
        {stage === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <BlendLoading />
          </motion.div>
        )}
        {(stage === "landing" || stage === "creating") && (
          <Landing
            key="landing"
            onCreate={create}
            busy={stage === "creating"}
            myBlends={myBlends}
            onOpenBlend={(blendCode) => {
              setCode(blendCode);
              void fetchResult();
            }}
          />
        )}
        {stage === "waiting" && (
          <Waiting key="waiting" url={inviteUrl} onCopy={copy} onShare={share} />
        )}
        {stage === "joining" && (
          <Invite key="invite" host={host} onJoin={join} />
        )}
        {stage === "error" && (
          <ErrorView key="error" message={error} retry={inviteCode ? join : create} />
        )}
        {stage === "result" && result && (
          <Results
            key="result"
            data={result}
            displayedOutfits={displayedOutfits}
            loadingMoreLooks={loadingMoreLooks}
            code={code}
            session={session!}
            currentUserId={currentUserId}
            closetItems={closetItems}
            votes={votes}
            onShowMoreLooks={handleShowMoreLooks}
            onSaveToCloset={handleSaveOutfitToCloset}
            onSaveProductToCloset={handleOpenSaveModal}
            onVote={handleVote}
            onClosetRemove={(id) => setClosetItems((prev) => prev.filter((c) => c.id !== id))}
            onAddToWishlist={handleAddToWishlist}
            onAddToBag={handleAddToBag}
          />
        )}
      </AnimatePresence>

      {/* Save Closet Modal */}
      <SaveClosetModal
        isOpen={isSaveModalOpen}
        onClose={() => {
          setIsSaveModalOpen(false);
          pendingSaveProduct.current = null;
        }}
        onConfirm={handleClosetModalConfirm}
        title={pendingSaveProduct.current
          ? `✨ Save "${pendingSaveProduct.current.title}" to Shared Closet`
          : "✨ Save to Shared Closet"}
      />

      {toast && (
        <motion.div
          className="blend-toast"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
        >
          {toast}
        </motion.div>
      )}
    </>
  );
}

// ─── Landing ──────────────────────────────────────────────────────────────────
function Landing({
  onCreate, busy, myBlends, onOpenBlend,
}: {
  onCreate: () => void;
  busy: boolean;
  myBlends: BlendSession[];
  onOpenBlend: (code: string) => void;
}) {
  return (
    <main className="blend-landing">
      <Link to="/" className="blend-logo">
        <i>m</i> Myntra <em>Sync</em>
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="blend-landing-card"
      >
        <p className="blend-kicker">FASHION IS BETTER TOGETHER</p>
        <h1>Blend your<br /><em>fashion personalities.</em></h1>
        <p>
          Invite your friend, discover how your real shopping signals connect,
          and explore coordinated outfits made for your plans.
        </p>
        <div className="blend-actions">
          <button className="blend-primary" disabled={busy} onClick={onCreate} id="blend-create-btn">
            {busy ? "Creating your Blend…" : "Create Blend"}
          </button>
        </div>
        <ol>
          <li>Invite your friend via a unique link</li>
          <li>We analyse real wishlists &amp; browsing data</li>
          <li>Explore your Blend identity &amp; shared looks</li>
        </ol>
      </motion.section>

      {/* My Blends history */}
      {myBlends.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="blend-landing-history"
        >
          <MyBlends blends={myBlends} onOpen={onOpenBlend} />
        </motion.div>
      )}
    </main>
  );
}

// ─── Waiting ──────────────────────────────────────────────────────────────────
function Waiting({ url, onCopy, onShare }: { url: string; onCopy: () => void; onShare: () => void }) {
  return (
    <main className="blend-landing">
      <section className="blend-landing-card blend-waiting">
        <motion.span
          animate={{ scale: [0.9, 1.12, 0.9] }}
          transition={{ repeat: Infinity, duration: 2.4 }}
          className="blend-spark"
        >
          ✦
        </motion.span>
        <p className="blend-kicker">BLEND CREATED</p>
        <h1>Waiting for your<br /><em>friend…</em></h1>
        <p>We'll automatically start blending the moment they join using real data from both of you.</p>
        <code>{url}</code>
        <div className="blend-actions">
          <button className="blend-primary" onClick={onCopy}>Copy link</button>
          <button className="blend-secondary" onClick={onShare}>Share</button>
        </div>
      </section>
    </main>
  );
}

// ─── Invite ───────────────────────────────────────────────────────────────────
function Invite({ host, onJoin }: { host: string; onJoin: () => void }) {
  return (
    <main className="blend-landing">
      <section className="blend-landing-card">
        <p className="blend-kicker">YOU HAVE BEEN INVITED</p>
        <h1>Make it<br /><em>your shared style.</em></h1>
        <p>
          {host} has invited you to create a fashion Blend.
          We'll compare your real wishlists and browsing signals only after you join.
        </p>
        <button className="blend-primary" onClick={onJoin} id="blend-join-btn">Join Blend</button>
      </section>
    </main>
  );
}

// ─── Error ────────────────────────────────────────────────────────────────────
function ErrorView({ message, retry }: { message: string; retry: () => void }) {
  const expired = /expired|invalid/i.test(message);
  return (
    <main className="blend-landing">
      <section className="blend-landing-card">
        <p className="blend-kicker">A SMALL STYLE DETOUR</p>
        <h1>{expired ? "This Blend invite has expired." : "We could not reach Blend."}</h1>
        <p>{expired ? "Create a new Blend and send a fresh invite." : message}</p>
        <button className="blend-primary" onClick={retry}>Retry</button>
      </section>
    </main>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────
type ProductForCloset = {
  id: string; title: string; brand: string; category: string; price: number; image: string;
};

function Results({
  data, displayedOutfits, loadingMoreLooks, code, session, currentUserId, closetItems, votes,
  onShowMoreLooks, onSaveToCloset, onSaveProductToCloset, onVote, onClosetRemove,
  onAddToWishlist, onAddToBag,
}: {
  data: BlendResult;
  displayedOutfits: BlendResult["outfits"];
  loadingMoreLooks: boolean;
  code: string;
  session: Session;
  currentUserId: string;
  closetItems: SharedClosetItem[];
  votes: OutfitVote[];
  onShowMoreLooks: () => void;
  onSaveToCloset: (outfit: BlendResult["outfits"][0]) => void;
  onSaveProductToCloset: (product: ProductForCloset) => void;
  onVote: (vote: OutfitVote) => void;
  onClosetRemove: (id: string) => void;
  onAddToWishlist: (productId: string) => Promise<void>;
  onAddToBag: (productId: string) => Promise<void>;
}) {
  // ── Mutual Favorites — outfits independently loved by BOTH members ─────────
  const mutualFavorites = displayedOutfits.filter((outfit) => {
    const loveVotes = votes.filter((v) => v.outfitKey === outfit.id && v.vote === "love");
    const uniqueLovers = new Set(loveVotes.map((v) => v.userId));
    return uniqueLovers.size >= 2;
  });

  // ── Dedup wishlist — hide products already shown in outfits or closet ──────
  const outfitProductIds = new Set(displayedOutfits.map((o) => o.id).filter(Boolean));
  const closetProductIds = new Set(
    closetItems.map((c) => c.productId).filter(Boolean) as string[]
  );
  const usedIds = new Set([...outfitProductIds, ...closetProductIds]);
  const deduplicatedWishlist = (data.sharedWishlist ?? []).filter(
    (item) => !usedIds.has(item.id)
  );

  // ── Section visibility guards ──────────────────────────────────────────────
  const hasPalette = (data.palette?.length ?? 0) >= 2;
  const hasStyleDna = (data.sharedDna?.length ?? 0) > 0;
  const hasAesthetic = hasPalette || hasStyleDna;
  const hasWhyMatch = (data.whyYouMatch?.length ?? 0) > 0 || (data.breakdown?.length ?? 0) > 0;

  return (
    <main className="blend-page">
      {/* Nav */}
      <header className="blend-nav">
        <Link to="/" className="blend-logo"><i>m</i> Myntra <em>Sync</em></Link>
        <span>YOUR SHARED STYLE STORY</span>
        <Link to="/blend">New Blend</Link>
      </header>

      {/* ① Blend Identity */}
      <BlendIdentity data={data} />

      {/* ② Why You Match — AI insights + merged compatibility metrics */}
      {hasWhyMatch && (
        <WhyYouMatch
          insights={data.whyYouMatch ?? []}
          breakdown={data.breakdown ?? []}
          reasons={data.reasons ?? []}
        />
      )}

      {/* ③ Shared Aesthetic — editorial collage + palette + signals */}
      {hasAesthetic && <SharedAesthetic data={data} />}

      {/* ④ Coordinated Outfits — Show More Looks lives here */}
      <section className="blend-section outfit-section">
        <div className="outfit-heading">
          <div>
            <p className="blend-kicker">COORDINATED OUTFITS</p>
            <h2>Wear the<br /><em>same story differently.</em></h2>
          </div>
          <button
            className="blend-primary"
            onClick={onShowMoreLooks}
            disabled={loadingMoreLooks}
            id="blend-more-looks-btn"
          >
            {loadingMoreLooks ? "Finding looks…" : "✨ Show More Looks"}
          </button>
        </div>

        <div className="outfit-rail">
          <AnimatePresence>
            {displayedOutfits.map((outfit, idx) => {
              const outfitVotes = votes.filter((v) => v.outfitKey === outfit.id);
              const isSaved = closetItems.some((c) => {
                const snap = c.productSnapshot as Record<string, unknown>;
                return snap.name === outfit.title || c.productId === outfit.id;
              });

              return (
                <motion.article
                  className="outfit-card"
                  key={outfit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  layout
                >
                  <div className="outfit-image">
                    {outfit.image && <img src={outfit.image} alt={outfit.title} />}
                    {outfit.match > 0 && (
                      <span className="outfit-match-badge">{Math.round(outfit.match)}% match</span>
                    )}
                  </div>
                  <div className="outfit-body">
                    <p>{outfit.occasion} · {outfit.weather}</p>
                    <h3>{outfit.title}</h3>

                    {/* Compact piece chips — no extra card height */}
                    {outfit.pieces?.length > 0 && (
                      <div className="outfit-pieces-chips">
                        {outfit.pieces.slice(0, 4).map((piece) => (
                          <span key={piece} className="outfit-piece-chip">{piece}</span>
                        ))}
                      </div>
                    )}

                    <blockquote>{outfit.explanation}</blockquote>

                    <OutfitVoting
                      outfitKey={outfit.id}
                      outfitTitle={outfit.title}
                      code={code}
                      session={session}
                      votes={outfitVotes}
                      currentUserId={currentUserId}
                      onVote={onVote}
                    />

                    <TwinLook
                      outfitKey={outfit.id}
                      code={code}
                      session={session}
                      onSaveToCloset={onSaveProductToCloset}
                      onAddToWishlist={onAddToWishlist}
                      onAddToBag={onAddToBag}
                    />

                    <footer>
                      <strong>{outfit.price}</strong>
                      <button
                        className={isSaved ? "outfit-body__saved-btn" : ""}
                        onClick={() => !isSaved && onSaveToCloset(outfit)}
                        disabled={isSaved}
                      >
                        {isSaved ? "❤ Saved" : "❤ Save to Closet"}
                      </button>
                    </footer>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>

          {/* Skeleton cards while loading more looks */}
          {loadingMoreLooks && Array.from({ length: 2 }).map((_, i) => (
            <article className="outfit-card outfit-card--skeleton" key={`skeleton-${i}`}>
              <div className="outfit-image outfit-skeleton__image" />
              <div className="outfit-body">
                <div className="outfit-skeleton__line outfit-skeleton__line--short" />
                <div className="outfit-skeleton__line" />
                <div className="outfit-skeleton__line outfit-skeleton__line--med" />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ⑤ Mutual Favorites — only rendered when both members voted ❤ Love */}
      {mutualFavorites.length > 0 && (
        <motion.section
          className="blend-section mutual-favorites-section"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="section-intro">
            <p className="blend-kicker">MUTUAL FAVORITES</p>
            <h2>
              Looks you<br />
              <em>both loved.</em>
            </h2>
            <p className="section-copy">
              Every outfit here was independently loved by both of you.
            </p>
          </div>
          <div className="outfit-rail">
            <AnimatePresence>
              {mutualFavorites.map((outfit, idx) => {
                const isSaved = closetItems.some((c) => {
                  const snap = c.productSnapshot as Record<string, unknown>;
                  return snap.name === outfit.title || c.productId === outfit.id;
                });
                return (
                  <motion.article
                    className="outfit-card outfit-card--loved"
                    key={`fav-${outfit.id}`}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    layout
                  >
                    <div className="outfit-image">
                      {outfit.image && <img src={outfit.image} alt={outfit.title} />}
                      <span className="outfit-loved-badge">❤ Loved by both</span>
                    </div>
                    <div className="outfit-body">
                      <p>{outfit.occasion} · {outfit.weather}</p>
                      <h3>{outfit.title}</h3>
                      {outfit.pieces?.length > 0 && (
                        <div className="outfit-pieces-chips">
                          {outfit.pieces.slice(0, 4).map((piece) => (
                            <span key={piece} className="outfit-piece-chip">{piece}</span>
                          ))}
                        </div>
                      )}
                      <footer>
                        <strong>{outfit.price}</strong>
                        <button
                          className={isSaved ? "outfit-body__saved-btn" : ""}
                          onClick={() => !isSaved && onSaveToCloset(outfit)}
                          disabled={isSaved}
                        >
                          {isSaved ? "❤ Saved" : "❤ Save to Closet"}
                        </button>
                      </footer>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.section>
      )}

      {/* ⑥ Shared Closet */}
      <SharedCloset
        code={code}
        session={session}
        items={closetItems}
        currentUserId={currentUserId}
        onRemove={onClosetRemove}
      />

      {/* ⑦ ✨ Things You'll Both Love (deduped, renamed from Shared Wishlist) */}
      {deduplicatedWishlist.length > 0 && (
        <SharedWishlist
          items={deduplicatedWishlist}
          onSaveToCloset={onSaveProductToCloset}
          onAddToWishlist={onAddToWishlist}
          onAddToBag={onAddToBag}
        />
      )}

      {/* ⑧ Continue Exploring — distinct closing card, no duplicate score or CTA */}
      <div className="blend-explore-cta">
        <div className="blend-explore-cta__text">
          <p className="blend-kicker" style={{ color: "#e7c67f" }}>CONTINUE EXPLORING</p>
          <h2>You're building a<br /><em>shared wardrobe,</em></h2>
          <p>one look at a time.</p>
        </div>
        <div className="blend-explore-cta__actions">
          <button
            className="blend-primary"
            onClick={() =>
              document.querySelector<HTMLElement>(".shared-closet")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            ❤ View Shared Closet
          </button>
          <button
            className="blend-secondary"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            ↑ Back to Top
          </button>
        </div>
      </div>

      <footer className="blend-footer">
        Made with ♥ by <span>Myntra Sync</span>
      </footer>
    </main>
  );
}
