import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const experiences = [
  {
    title: "Myntra Blend",
    subtitle: "A shared fashion identity, made for two.",
    href: "/blend",
    tone: "from-[#342044] via-[#6c365f] to-[#ed6e76]",
    icon: "*",
    visual: <><div className="absolute left-[13%] top-[14%] h-36 w-24 rotate-[-10deg] rounded-[34px] border border-white/30 bg-white/20 shadow-2xl backdrop-blur-xl" /><div className="absolute bottom-[10%] right-[14%] h-40 w-28 rotate-[12deg] rounded-[40px] border border-white/30 bg-[#ffc9a6]/35 shadow-2xl backdrop-blur-xl" /><span className="absolute left-[42%] top-[38%] grid h-14 w-14 place-items-center rounded-full bg-white text-xl text-[#e55079] shadow-xl">+</span></>,
  },
  {
    title: "Fashion Wrapped",
    subtitle: "Your style story, beautifully summarized.",
    href: "/wrapped",
    tone: "from-[#1d294f] via-[#76508e] to-[#e77b7d]",
    icon: "*",
    visual: <><div className="absolute right-[9%] top-[12%] h-48 w-36 rounded-[55%] bg-gradient-to-b from-[#ffe29c] to-[#fa949c] shadow-2xl" /><div className="absolute right-[28%] top-[25%] h-24 w-24 rounded-full border-[11px] border-white/70" /><div className="absolute bottom-[17%] left-[12%] rotate-[-8deg] rounded-2xl bg-white/20 px-4 py-3 text-[10px] font-bold backdrop-blur-md">YOUR 2026<br /><span className="font-editorial text-lg">Style story</span></div></>,
  },
];

export default function AIExperiences() {
  return (
    <section className="my-10 md:my-14" aria-labelledby="ai-experiences-title">
      <div className="mb-5 px-1">
        <p className="mb-2 text-[10px] font-extrabold tracking-[.2em] text-[#ff3f6c]">PERSONAL FASHION, POWERED BY AI</p>
        <h2 id="ai-experiences-title" className="font-editorial text-[30px] font-medium tracking-tight text-[#282c3f] md:text-[38px]">Explore your fashion identity</h2>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {experiences.map((item, index) => (
          <motion.div key={item.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ delay: index * .1 }} whileHover={{ y: -6 }}>
            <Link to={item.href} className={`group relative block h-[290px] overflow-hidden rounded-[28px] bg-gradient-to-br ${item.tone} p-7 text-white shadow-[0_18px_42px_rgba(44,30,62,.15)] transition-shadow duration-300 hover:shadow-[0_24px_56px_rgba(44,30,62,.24)] md:h-[310px] md:p-9`}>
              <div className="absolute inset-0 opacity-35" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,.42) 1px, transparent 0)", backgroundSize: "21px 21px" }} />
              <div className="relative z-10 flex h-full max-w-[60%] flex-col">
                <span className="mb-5 grid h-9 w-9 place-items-center rounded-xl border border-white/25 bg-white/15 text-lg backdrop-blur-md">{item.icon}</span>
                <h3 className="font-editorial text-[29px] leading-none md:text-[35px]">{item.title}</h3>
                <p className="mt-3 text-[13px] font-semibold leading-snug text-white/90 md:text-[14px]">{item.subtitle}</p>
                <span className="mt-auto inline-flex items-center gap-2 text-[12px] font-extrabold tracking-wide text-white">Explore experience <span className="transition-transform duration-200 group-hover:translate-x-1">-&gt;</span></span>
              </div>
              <div className="absolute bottom-0 right-0 z-[1] h-[90%] w-[52%] transition-transform duration-500 group-hover:scale-105">{item.visual}</div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
