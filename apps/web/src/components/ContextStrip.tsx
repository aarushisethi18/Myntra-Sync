export default function ContextStrip({ signals, summary, loading = false }: { signals: string[]; summary?: string; loading?: boolean }) {
  if (loading) {
    return (
      <aside className="flex items-center gap-4 border border-[#FFD2DF] bg-[#FFF0F4]/40 p-4 rounded-xl md:rounded-2xl shimmer-bg w-full my-6 min-h-[78px]" aria-label="Loading live context" />
    );
  }

  // Helper to determine tailwind classes for a contextual chip based on its text
  const getChipStyle = (signal: string) => {
    const txt = signal.toLowerCase();
    if (txt.includes("weather") || txt.includes("temperature") || txt.includes("°c")) {
      return "bg-[#E0F2FE]/70 text-[#0369A1] border-[#BAE6FD]"; // blue
    }
    if (txt.includes("festival") || txt.includes("raksha bandhan") || txt.includes("diwali")) {
      return "bg-[#FFF0F2] text-[#E11D48] border-[#FECDD3]"; // pink-red
    }
    if (txt.includes("upcoming") || txt.includes("meeting") || txt.includes("calendar")) {
      return "bg-[#ECFDF5]/80 text-[#047857] border-[#A7F3D0]"; // emerald
    }
    if (txt.includes("affinity") || txt.includes("fashion dna") || txt.includes("dna")) {
      return "bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]"; // purple
    }
    return "bg-[#F5F5F6] text-[#282C3F] border-[#EAEAEC]"; // default light gray
  };

  return (
    <aside className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:px-7 md:py-4.5 border border-[#FFD2DF]/70 bg-gradient-to-r from-[#FFF0F4] via-[#FFF3F6] to-[#FAFAFA] rounded-2xl shadow-[0_8px_24px_rgba(255,63,108,0.03)] my-7 animate-fade-in-up">
      {/* Assistant Spark Logo & Messaging */}
      <div className="flex items-start gap-4">
        <span className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF3F6C] to-[#FF905A] text-white shadow-[0_4px_12px_rgba(255,63,108,0.18)]">
          <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 2zm0 3.7l-1.5 3.1-3.4.5 2.5 2.4-.6 3.4 3-1.6 3 1.6-.6-3.4 2.5-2.4-3.4-.5L12 5.7z"/>
          </svg>
        </span>
        <div className="space-y-0.5">
          <h4 className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#FF3F6C]">
            AI Style Stylist
          </h4>
          <h3 className="text-[14px] font-bold text-[#282C3F] font-sans-tight">
            Your Personal Sync Edit
          </h3>
          {summary && (
            <p className="text-[12.5px] text-[#5F5760] font-medium leading-relaxed max-w-[680px]">
              {summary}
            </p>
          )}
          
          {/* Signal Chips */}
          {signals.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {signals.map((signal, index) => (
                <small 
                  key={signal}
                  style={{ animationDelay: `${(index + 2) * 60}ms` }}
                  className={`text-[10px] font-bold border rounded-full px-2.5 py-1 flex items-center gap-1.5 transition-all duration-300 hover:scale-103 shadow-sm animate-fade-in-up ${getChipStyle(signal)}`}
                >
                  <span className="w-1 h-1 rounded-full bg-current opacity-70" />
                  {signal}
                </small>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <button className="flex-shrink-0 ml-auto md:ml-0 flex items-center gap-1.5 text-[#FF3F6C] hover:text-[#FF905A] font-extrabold text-[12.5px] tracking-wide transition-all duration-200 group bg-[#FF3F6C]/5 hover:bg-[#FF3F6C]/10 px-4 py-2 rounded-full cursor-pointer">
        <span>Explore details</span>
        <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </aside>
  );
}
