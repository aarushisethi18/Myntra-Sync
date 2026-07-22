import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { BlendLoading } from "../components/BlendLoading";
import { demoResult } from "../demoResult";
import { blendService, type BlendResult } from "../services/blendService";
import "../styles/blend.css";

type Stage = "landing" | "creating" | "waiting" | "joining" | "loading" | "result" | "error";
const POLL_INTERVAL_MS = 2500;

function messageFor(error: unknown) { return error instanceof Error ? error.message : "Something interrupted your Blend. Please try again."; }

export default function BlendFlowPage() {
  const { inviteCode } = useParams();
  const { session } = useAuth();
  const [stage, setStage] = useState<Stage>(inviteCode ? "joining" : "landing");
  const [code, setCode] = useState(inviteCode ?? "");
  const [result, setResult] = useState<BlendResult | null>(null);
  const [host, setHost] = useState("Your fashion partner");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const inviteUrl = code ? `${window.location.origin}/blend/invite/${code}` : "";
  const showToast = useCallback((text: string) => { setToast(text); window.setTimeout(() => setToast(""), 3200); }, []);

  const fetchResult = useCallback(async () => {
    if (!session || !code) return;
    setStage("loading");
    try { setResult(await blendService.result(code, session)); setStage("result"); }
    catch (reason) { setError(messageFor(reason)); setStage("error"); }
  }, [code, session]);

  const create = useCallback(async () => {
    if (!session) return;
    setStage("creating");
    try { const next = await blendService.create(session); setCode(next.inviteCode); setStage("waiting"); showToast("Blend created! Your invite is ready."); }
    catch (reason) { setError(messageFor(reason)); setStage("error"); }
  }, [session, showToast]);

  const copy = useCallback(async () => {
    try { await navigator.clipboard.writeText(inviteUrl); showToast("Invite link copied."); }
    catch { showToast("Copy the invite link from the address bar."); }
  }, [inviteUrl, showToast]);

  const share = useCallback(async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Blend with me on Myntra Sync", text: "Let's discover our shared fashion personality.", url: inviteUrl }); showToast("Invite shared."); return; }
      catch { /* Sharing was dismissed; copying is a graceful fallback. */ }
    }
    await copy();
  }, [copy, inviteUrl, showToast]);

  const join = useCallback(async () => {
    if (!session || !code) return;
    setStage("loading");
    try { await blendService.accept(code, session); await fetchResult(); }
    catch (reason) { setError(messageFor(reason)); setStage("error"); }
  }, [code, fetchResult, session]);

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

  useEffect(() => {
    if (!inviteCode || !session) return;
    void blendService.inspect(inviteCode, session).then((invite) => {
      setHost(invite.hostName ?? "Your fashion partner");
      if (invite.status === "joined") { setCode(inviteCode); void fetchResult(); }
      else if (invite.status === "expired") { setError("This Blend invite has expired."); setStage("error"); }
      else setStage("joining");
    }).catch((reason) => { setError(messageFor(reason)); setStage("error"); });
  }, [fetchResult, inviteCode, session]);

  const regenerate = useCallback(async () => {
    if (!session || !code) return;
    setStage("loading");
    try { setResult(await blendService.regenerate(code, session, { occasion: "Weekend plans", mood: "Effortless", budget: "", weather: "" })); setStage("result"); }
    catch (reason) { setError(messageFor(reason)); setStage("error"); }
  }, [code, session]);
  const demo = () => { setResult(demoResult); setStage("result"); };

  return <><AnimatePresence mode="wait">
    {stage === "loading" && <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><BlendLoading /></motion.div>}
    {stage === "landing" && <Landing key="landing" onCreate={create} onDemo={demo} />}
    {stage === "creating" && <Landing key="creating" onCreate={create} onDemo={demo} busy />}
    {stage === "waiting" && <Waiting key="waiting" url={inviteUrl} onCopy={copy} onShare={share} />}
    {stage === "joining" && <Invite key="invite" host={host} onJoin={join} />}
    {stage === "error" && <ErrorView key="error" message={error} retry={inviteCode ? join : create} />}
    {stage === "result" && result && <Results key="result" data={result} demo={result.sessionId === "demo"} onRegenerate={result.sessionId === "demo" ? demo : regenerate} />}
  </AnimatePresence>{toast && <motion.div className="blend-toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>{toast}</motion.div>}</>;
}

function Landing({ onCreate, onDemo, busy = false }: { onCreate: () => void; onDemo: () => void; busy?: boolean }) { return <main className="blend-landing"><Link to="/" className="blend-logo"><i>m</i> Myntra <em>Sync</em></Link><motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="blend-landing-card"><p className="blend-kicker">FASHION IS BETTER TOGETHER</p><h1>Blend your<br /><em>fashion personalities.</em></h1><p>Invite your friend, discover how your tastes connect, and generate coordinated outfits made for your plans.</p><div className="blend-actions"><button className="blend-primary" disabled={busy} onClick={onCreate}>{busy ? "Creating your Blend..." : "Create Blend"}</button><button className="blend-secondary" onClick={onDemo}>View Demo</button></div><ol><li>Invite your friend</li><li>Discover compatibility</li><li>Shop coordinated looks</li></ol></motion.section></main>; }
function Waiting({ url, onCopy, onShare }: { url: string; onCopy: () => void; onShare: () => void }) { return <main className="blend-landing"><section className="blend-landing-card blend-waiting"><motion.span animate={{ scale: [.9, 1.12, .9] }} transition={{ repeat: Infinity, duration: 2.4 }} className="blend-spark">*</motion.span><p className="blend-kicker">BLEND CREATED</p><h1>Waiting for your<br /><em>friend...</em></h1><p>Invite sent. We'll automatically start blending once they join.</p><code>{url}</code><div className="blend-actions"><button className="blend-primary" onClick={onCopy}>Copy link</button><button className="blend-secondary" onClick={onShare}>Share</button></div></section></main>; }
function Invite({ host, onJoin }: { host: string; onJoin: () => void }) { return <main className="blend-landing"><section className="blend-landing-card"><p className="blend-kicker">YOU HAVE BEEN INVITED</p><h1>Make it<br /><em>your shared style.</em></h1><p>{host} has invited you to create a fashion Blend. We will compare your live style context only after you join.</p><button className="blend-primary" onClick={onJoin}>Join Blend</button></section></main>; }
function ErrorView({ message, retry }: { message: string; retry: () => void }) { const expired = /expired|invalid/i.test(message); return <main className="blend-landing"><section className="blend-landing-card"><p className="blend-kicker">A SMALL STYLE DETOUR</p><h1>{expired ? "This Blend invite has expired." : "We could not reach Blend."}</h1><p>{expired ? "Create a new Blend and send a fresh invite." : message}</p><button className="blend-primary" onClick={retry}>Retry</button></section></main>; }
function Results({ data, demo, onRegenerate }: { data: BlendResult; demo: boolean; onRegenerate: () => void }) { const [saved, setSaved] = useState<string[]>([]); const images = data.moodboard.images ?? []; return <main className="blend-page"><header className="blend-nav"><Link to="/" className="blend-logo"><i>m</i> Myntra <em>Sync</em></Link><span>{demo ? "DEMO EXPERIENCE" : "YOUR SHARED STYLE STORY"}</span><Link to="/blend">New Blend</Link></header><section className="blend-hero"><p className="blend-kicker">{demo ? "DEMO EXPERIENCE" : "NOW IN SYNC"}</p><h1>{data.people.map((person) => person.name).join(" and ")}<br /><em>Blend</em></h1><p className="hero-copy">{data.reasons[0] ?? "Your fashion personalities have found a shared frequency."}</p><div className="score-orbit"><strong>{data.score}<small>%</small></strong><span>fashion compatible</span></div></section><section className="blend-section dna-section"><p className="blend-kicker">STYLE DNA</p><h2>Two tastes. One<br /><em>style frequency.</em></h2><div className="dna-grid">{[...data.people, { name: "Together", initials: "", image: "", labels: data.sharedDna }].map((person) => <article className="dna-card" key={person.name}><div className="dna-heading"><div><small>STYLE DNA</small><h3>{person.name}</h3></div></div><div className="dna-chips">{person.labels.map((tag) => <span key={tag.name}>{tag.name}<b>{tag.confidence}%</b></span>)}</div></article>)}</div></section><section className="blend-section compatibility-section"><div><p className="blend-kicker">COMPATIBILITY</p><h2>It is more than a<br /><em>good match.</em></h2><p className="section-copy">{data.reasons.join(" ")}</p></div><div className="compatibility-visual">{data.breakdown.map((item) => <div className="compatibility-row" key={item.name}><div><span>{item.name}</span><b>{item.value}%</b></div><span className="compatibility-track"><motion.i initial={{ width: 0 }} whileInView={{ width: `${item.value}%` }} style={{ background: item.color }} /></span></div>)}</div></section><section className="blend-section palette-section"><div><p className="blend-kicker">SHARED AESTHETIC</p><h2>Colours that<br /><em>feel like both of you.</em></h2><div className="palette-list">{data.palette.map((color) => <div key={color.name}><i style={{ background: color.hex }} /><span>{color.name}</span><small>{color.hex}</small></div>)}</div></div><div className="moodboard"><div className="moodboard-title"><span>YOUR MOODBOARD</span><b>{data.moodboard.visualStyle}</b></div>{images.map((image) => <img key={image} src={image} alt="Shared fashion inspiration" />)}</div></section><section className="blend-section outfit-section"><div className="outfit-heading"><div><p className="blend-kicker">COORDINATED OUTFITS</p><h2>Wear the<br /><em>same story differently.</em></h2></div><button className="blend-primary" onClick={onRegenerate}>Regenerate</button></div><div className="outfit-rail">{data.outfits.map((outfit) => <article className="outfit-card" key={outfit.id}><div className="outfit-image">{outfit.image && <img src={outfit.image} alt={outfit.title} />}<span>{outfit.match}% match</span></div><div className="outfit-body"><p>{outfit.occasion} - {outfit.weather}</p><h3>{outfit.title}</h3><ul>{outfit.pieces.map((piece) => <li key={piece}>{piece}</li>)}</ul><blockquote>{outfit.explanation}</blockquote><footer><strong>{outfit.price}</strong><button onClick={() => setSaved((current) => current.includes(outfit.id) ? current.filter((id) => id !== outfit.id) : [...current, outfit.id])}>{saved.includes(outfit.id) ? "Saved" : "Save outfit"}</button></footer></div></article>)}</div></section></main>; }