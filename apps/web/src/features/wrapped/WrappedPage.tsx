import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { demoWrapped } from "./demoData";
import { fetchWrapped, type WrappedData } from "./wrappedService";
import "./wrapped.css";

type Story = { eyebrow: string; title: React.ReactNode; body?: React.ReactNode; className?: string };
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function WrappedPage() {
  const { session } = useAuth(); const [params] = useSearchParams(); const navigate = useNavigate();
  const demo = params.get("mode") === "demo"; const [data, setData] = useState<WrappedData | null>(demo ? demoWrapped : null); const [error, setError] = useState(""); const [index, setIndex] = useState(0);
  useEffect(() => { if (demo || !session) return; let alive = true; fetchWrapped(session).then((result) => { if (alive) setData(result); }).catch((reason: unknown) => { if (alive) setError(reason instanceof Error ? reason.message : "Unable to load Wrapped."); }); return () => { alive = false; }; }, [demo, session]);
  const stories = useMemo<Story[]>(() => data ? buildStories(data, demo) : [], [data, demo]);
  const next = useCallback(() => setIndex((current) => Math.min(current + 1, stories.length - 1)), [stories.length]);
  const previous = useCallback(() => setIndex((current) => Math.max(current - 1, 0)), []);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.key === "ArrowRight" || event.key === " ") next(); if (event.key === "ArrowLeft") previous(); if (event.key === "Escape") navigate("/"); }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [navigate, next, previous]);
  if (!data && !error) return <Loading />;
  if (error) return <main className="wrapped-shell"><div className="wrapped-error"><Link to="/">← Myntra Sync</Link><h1>Your story needs a moment.</h1><p>{error}</p><button onClick={() => navigate("/wrapped?mode=demo")}>View demo experience</button></div></main>;
  if (!data) return null;
  const story = stories[index];
  return <main className="wrapped-shell" style={{ ["--story" as string]: `${index}` }}>
    <div className="wrapped-blobs"><i /><i /><i /></div>
    <header className="wrapped-header"><Link to="/" aria-label="Back to Myntra Sync"><b>m</b> myntra <em>sync</em></Link>{demo && <span>DEMO EXPERIENCE</span>}<button onClick={() => navigate("/")}>Exit</button></header>
    <div className="wrapped-progress">{stories.map((_, item) => <i key={item} className={item <= index ? "is-active" : ""} />)}</div>
    <button className="wrapped-tap wrapped-prev" onClick={previous} aria-label="Previous story" disabled={index === 0} />
    <button className="wrapped-tap wrapped-next" onClick={next} aria-label="Next story" disabled={index === stories.length - 1} />
    <AnimatePresence mode="wait"><motion.section key={index} className={`wrapped-story ${story.className ?? ""}`} initial={{ opacity: 0, y: 34, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 1.02 }} transition={{ duration: .45, ease: "easeOut" }}><p className="wrapped-eyebrow">{story.eyebrow}</p><h1>{story.title}</h1>{story.body}</motion.section></AnimatePresence>
    <div className="wrapped-controls"><span>{index + 1} / {stories.length}</span><button onClick={next}>{index === stories.length - 1 ? "Replay your story" : "Next"} <b>→</b></button></div>
  </main>;
}

function buildStories(data: WrappedData, demo: boolean): Story[] {
  const palette = data.palette.length ? data.palette : [{ name: "Your next colour", hex: "#f3a4b5" }]; const maximum = Math.max(...data.categories.map((item) => item.value), 1);
  return [
    { eyebrow: demo ? "YOUR DEMO FASHION WRAPPED" : "YOUR FASHION WRAPPED", title: <>{data.name}, here’s your<br /><em>fashion story.</em></>, body: <p className="wrapped-lead">A year of little decisions, great outfits, and a style that became more you.</p>, className: "opening" },
    { eyebrow: "YOUR SHOPPING PERSONALITY", title: <>You’re a<br /><em>{data.personality}.</em></>, body: <p className="wrapped-lead">{data.personalityExplanation}</p> },
    { eyebrow: "STYLE EVOLUTION", title: <>Your year in<br /><em>style chapters.</em></>, body: <div className="evolution">{data.evolution.map((item, i) => <div key={item.month}><b>{item.month}</b><span>{item.label}</span>{i < data.evolution.length - 1 && <i>↓</i>}</div>)}</div> },
    { eyebrow: "YOUR COLOUR LANGUAGE", title: <>A palette that<br /><em>felt like you.</em></>, body: <><div className="palette-swatches">{palette.map((item, i) => <motion.div key={item.name} style={{ background: item.hex }} initial={{ y: 80 }} animate={{ y: 0 }} transition={{ delay: i * .08 }}><span>{item.name}</span></motion.div>)}</div><p className="wrapped-note">These are the shades you returned to, again and again.</p></> },
    { eyebrow: "BRAND AFFINITY", title: <>The labels that<br /><em>understood you.</em></>, body: <div className="brand-grid">{data.brands.length ? data.brands.map((brand) => <div key={brand.name}><strong>{brand.name}</strong><span>{brand.count} style moments</span></div>) : <p>Your favourite labels will appear as your story grows.</p>}</div> },
    { eyebrow: "THE NUMBERS, BUT MAKE IT FASHION", title: <>Your year<br /><em>at a glance.</em></>, body: <div className="stat-grid"><Stat number={data.statistics.orders} label="orders" /><Stat number={data.statistics.wishlist} label="wishlist saves" /><Stat number={data.statistics.categories} label="categories explored" /><Stat number={money.format(data.statistics.averageSpend)} label="average spend" /><Stat number={data.statistics.peakMonth} label="peak month" /></div> },
    { eyebrow: "YOUR FAVOURITE EDITS", title: <>You made room<br /><em>for these.</em></>, body: <div className="category-chart">{data.categories.length ? data.categories.map((item) => <div key={item.name}><span>{item.name}</span><i><b style={{ width: `${(item.value / maximum) * 100}%` }} /></i><strong>{item.value}</strong></div>) : <p>Explore the catalogue to begin discovering your favourite edits.</p>}</div> },
    { eyebrow: "BLEND HIGHLIGHTS", title: <>{data.blend.headline}<br /><em>in sync.</em></>, body: <div className="blend-highlight"><b>{data.blend.count}</b><span>Blend {data.blend.count === 1 ? "moment" : "moments"}</span><p>{data.blend.dna.length ? `Your shared DNA is ${data.blend.dna.join(" + ")}.` : "Create a Blend to find the style signals you share."}</p><Link to="/blend">Create Blend →</Link></div> },
    { eyebrow: "A NOTE FROM YOUR AI FASHION COACH", title: <>What your<br /><em>style is saying.</em></>, body: <blockquote className="coach">“{data.coach}”</blockquote> },
    { eyebrow: "NEXT YEAR’S EDIT", title: <>The forecast is<br /><em>looking good.</em></>, body: <p className="forecast">{data.forecast}</p> },
    { eyebrow: "YOUR FASHION TROPHIES", title: <>A few things you<br /><em>did beautifully.</em></>, body: <div className="badges">{data.achievements.map((item, i) => <motion.div key={item} initial={{ rotate: -8, opacity: 0 }} animate={{ rotate: i % 2 ? 4 : -3, opacity: 1 }} transition={{ delay: i * .1 }}><i>{["✦", "◌", "✺", "♥"][i % 4]}</i>{item}</motion.div>)}</div> },
    { eyebrow: "UNTIL NEXT TIME", title: <>Thanks for making fashion<br /><em>uniquely yours.</em></>, body: <div className="closing-actions"><button onClick={() => navigator.share?.({ title: "My Myntra Fashion Wrapped", text: "My fashion story, beautifully summarized." })}>Share Wrapped</button><Link to="/">Explore recommendations</Link><Link to="/blend">Create Blend</Link></div>, className: "closing" },
  ];
}
function Stat({ number, label }: { number: string | number; label: string }) { return <div><strong>{number}</strong><span>{label}</span></div>; }
function Loading() { return <main className="wrapped-shell wrapped-loading"><div className="wrapped-loader"><i /><i /><i /></div><p>Reading the style moments that made your year.</p></main>; }
