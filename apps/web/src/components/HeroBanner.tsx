import type { Product } from "../types/catalog";
import type { HeroMessage } from "../services/personalizationExplanationService";

type HeroBannerProps = { message?: HeroMessage; signals: string[]; products: Product[]; onShop: () => void; loading?: boolean };

function contextProducts(products: Product[], message?: HeroMessage, signals: string[] = []) {
  const context = `${message?.title ?? ""} ${message?.description ?? ""} ${signals.join(" ")}`.toLowerCase();
  const terms = context.includes("party") ? ["party", "dress", "jacket", "heel"]
    : context.includes("office") || context.includes("meeting") || context.includes("interview") ? ["formal", "blazer", "shirt", "trouser"]
    : context.includes("rain") || context.includes("monsoon") ? ["rain", "jacket", "sneaker", "outdoor"]
    : context.includes("independence") || context.includes("festival") ? ["ethnic", "kurta", "traditional"]
    : ["casual", "denim", "sneaker", "street"];
  const matched = products.filter((product) => terms.some((term) => `${product.title} ${product.category} ${product.style} ${product.occasions?.join(" ")}`.toLowerCase().includes(term)));
  return (matched.length >= 3 ? matched : products).slice(0, 4);
}

export default function HeroBanner({ message, signals, products, onShop, loading = false }: HeroBannerProps) {
  const heroProducts = contextProducts(products, message, signals);
  if (loading) return <section className="relative h-[480px] w-full overflow-hidden rounded-[28px] shimmer-bg md:h-[560px]" aria-label="Loading personalized hero" />;

  return (
    <section className="group relative isolate h-[480px] w-full overflow-hidden rounded-[28px] bg-[#15151d] shadow-[0_24px_60px_rgba(28,25,37,0.16)] md:h-[560px]" aria-label="Personalized AI fashion campaign">
      <div className="absolute inset-0 grid grid-cols-2 gap-1 opacity-90 transition-transform duration-[1800ms] ease-out group-hover:scale-[1.025] md:grid-cols-4">
        {heroProducts.map((product, index) => (
          <div key={product.id} className={`relative overflow-hidden ${index > 1 ? "hidden md:block" : ""}`}>
            <img src={product.image} alt="" className="h-full w-full object-cover transition-transform duration-[1800ms] group-hover:scale-110" loading={index > 1 ? "lazy" : "eager"} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#14131c]/75 via-transparent to-black/10" />
          </div>
        ))}
        {heroProducts.length === 0 && <div className="col-span-full bg-[#2a2430]" />}
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,17,25,.97)_0%,rgba(18,17,25,.83)_34%,rgba(18,17,25,.26)_66%,rgba(18,17,25,.08)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,13,20,.12),rgba(14,13,20,.5))]" />

      <div className="relative z-10 flex h-full max-w-[700px] flex-col justify-end px-6 pb-8 pt-16 text-white sm:px-10 md:px-16 md:pb-14 lg:px-20">
        <div className="mb-5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.21em] text-white/90">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-md">Myntra Sync</span>
          <span className="text-[#ffb2c5]">AI-powered edit</span>
        </div>
        <h1 className="max-w-[620px] font-editorial text-[39px] font-medium leading-[.98] tracking-[-.04em] text-white drop-shadow-sm sm:text-[50px] md:text-[62px]">{message?.title ?? "Fashion, tuned to your moment."}</h1>
        <p className="mt-5 max-w-[490px] text-[14px] leading-relaxed text-white/78 md:text-[16px]">{message?.description ?? "A personal AI edit shaped by your day, your context, and your Fashion DNA."}</p>
        {signals.length > 0 && <div className="mt-5 flex flex-wrap gap-2" aria-label="Live personalization signals">{signals.slice(0, 3).map((signal) => <span key={signal} className="rounded-full border border-white/15 bg-black/15 px-3 py-1.5 text-[10px] font-semibold text-white/90 backdrop-blur-md">{signal}</span>)}</div>}
        <button onClick={onShop} className="mt-7 inline-flex w-fit items-center gap-3 rounded-full bg-white px-6 py-3.5 text-[12px] font-extrabold tracking-wide text-[#282c3f] shadow-[0_8px_24px_rgba(0,0,0,.2)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ff3f6c] hover:text-white hover:shadow-[0_12px_28px_rgba(255,63,108,.35)] active:translate-y-0">Shop your edit <span aria-hidden="true">-&gt;</span></button>
      </div>
    </section>
  );
}
