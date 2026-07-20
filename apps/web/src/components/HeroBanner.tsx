import heroImage from "../assets/hero.png";
import type { HeroMessage } from "../services/personalizationExplanationService";

export default function HeroBanner({ message, signals, onShop, loading = false }: { message?: HeroMessage; signals: string[]; onShop: () => void; loading?: boolean }) {
  if (loading) {
    return (
      <section className="relative w-full h-[58vh] min-h-[380px] max-h-[580px] rounded-2xl md:rounded-3xl overflow-hidden shimmer-bg shadow-sm" aria-label="Loading personalized hero" />
    );
  }

  return (
    <section className="relative w-full h-[58vh] min-h-[380px] max-h-[580px] rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(40,44,63,0.06)] group animate-fade-in-up">
      {/* Background Image with Ken Burns effect on load */}
      <img 
        src={heroImage} 
        alt="Myntra Sync personalized fashion collection" 
        className="absolute inset-0 w-full h-full object-cover object-[center_30%] scale-100 group-hover:scale-[1.02] transition-transform duration-1000 ease-out" 
      />
      
      {/* Dark editorial gradient scrim overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#170a11]/90 via-[#170a11]/50 to-transparent md:bg-gradient-to-r md:from-[#170a11]/85 md:via-[#170a11]/40 md:to-[#170a11]/10 z-10" />

      {/* Content Area */}
      <div className="relative z-20 h-full flex flex-col justify-center items-start px-6 md:px-16 lg:px-24 py-8 max-w-[700px] text-white">
        <div className="flex items-center gap-2 mb-3 animate-fade-in-up">
          <span className="text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.25em] text-[#FF3F6C] bg-[#FF3F6C]/10 px-2.5 py-1 rounded-full border border-[#FF3F6C]/20 backdrop-blur-sm">
            Myntra Sync
          </span>
          <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-[#FF905A]">
            AI Style Edit
          </span>
        </div>

        <h1 className="font-editorial text-[32px] md:text-[48px] lg:text-[56px] leading-[1.05] font-medium tracking-tight mb-4 max-w-[620px] drop-shadow-sm">
          {message?.title ?? "Your next look starts here."}
        </h1>

        <p className="text-[14px] md:text-[16px] leading-[1.55] font-light text-[#F5F5F6]/90 mb-6 max-w-[480px] font-sans-tight">
          {message?.description ?? "Fresh drops and fashion made personal, synchronized with your day."}
        </p>

        {/* Live Personalization Context Signals */}
        {signals.length > 0 && (
          <div 
            className="flex flex-wrap gap-2 mb-8" 
            aria-label="Live personalization signals"
          >
            {signals.map((signal, index) => (
              <span 
                key={signal}
                style={{ animationDelay: `${index * 80}ms` }}
                className="text-[10px] md:text-[11px] font-semibold text-white/95 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md shadow-sm transition-all duration-300 hover:bg-[#FF3F6C] hover:border-[#FF3F6C] hover:scale-105"
              >
                {signal}
              </span>
            ))}
          </div>
        )}

        {/* CTA Button */}
        <button 
          onClick={onShop}
          className="flex items-center gap-2 px-6 py-3 bg-white text-[#282C3F] font-bold text-[13px] tracking-wide rounded-full shadow-[0_4px_16px_rgba(255,255,255,0.25)] hover:bg-[#FF3F6C] hover:text-white hover:shadow-[0_6px_20px_rgba(255,63,108,0.4)] transition-all duration-300 active:scale-97 cursor-pointer"
        >
          <span>Shop the edit</span>
          <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </section>
  );
}
