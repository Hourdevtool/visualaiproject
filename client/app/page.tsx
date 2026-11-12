"use client";
import Image from "next/image";
import { ArrowRight, BarChart2, Sparkles, Cpu, Layers, Activity } from "lucide-react";
import { useLanguage } from "../providers/LanguageProvider";
import { motion, Variants } from "framer-motion";
import { useRef, useState } from "react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export default function Home() {
  const { t } = useLanguage();
  const gridRef = useRef<HTMLDivElement>(null);
  const lastGridPos = useRef({ x: -100, y: -100 });
  const [gridPos, setGridPos] = useState({ x: -100, y: -100, rawX: -100, rawY: -100 });
  const [isGridHovered, setIsGridHovered] = useState(false);
  const [trail, setTrail] = useState<{ id: number, x: number, y: number }[]>([]);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      const snappedX = Math.floor(x / 24) * 24;
      const snappedY = Math.floor(y / 24) * 24;

      setGridPos({
        x: snappedX,
        y: snappedY,
        rawX: x,
        rawY: y
      });
      setIsGridHovered(true);

      // Add to trail if moved to a new cell
      if (snappedX !== lastGridPos.current.x || snappedY !== lastGridPos.current.y) {
        lastGridPos.current = { x: snappedX, y: snappedY };
        const newId = Date.now() + Math.random();

        setTrail(prev => [...prev.slice(-15), { x: snappedX, y: snappedY, id: newId }]);

        setTimeout(() => {
          setTrail(prev => prev.filter(t => t.id !== newId));
        }, 800);
      }

    } else {
      setIsGridHovered(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[#e2e2e2] font-sans selection:bg-[var(--primary-container)] selection:text-white overflow-hidden">


      <main className="pt-24 pb-20 relative z-10">
        {/* Hero Section */}
        <section
          className="relative px-8 lg:px-16 py-24 min-h-[75vh] flex items-center"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setIsGridHovered(false)}
        >
          <div ref={gridRef} className="absolute inset-0 z-0 overflow-hidden rounded-3xl mx-4 lg:mx-8 border border-[var(--outline-variant)] bg-[var(--surface-container)]/30">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface)] via-[var(--surface)]/80 to-transparent z-20 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-transparent to-transparent z-20 pointer-events-none" />
            <Image
              src={`${BASE_PATH}/images/hero.png`}
              alt="Hero Background"
              fill
              className="object-cover object-right-top opacity-40 mix-blend-luminosity z-0"
              priority
            />
            {/* Grid Overlay Graphic */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-10 mix-blend-overlay pointer-events-none"></div>
            <div className="absolute inset-0 z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

            {/* Interactive Hover Grid Cell */}
            {isGridHovered && (
              <div
                className="absolute z-10 w-[24px] h-[24px] bg-[var(--primary)]/60 pointer-events-none transition-all duration-75 ease-out mix-blend-screen"
                style={{
                  left: gridPos.x,
                  top: gridPos.y,
                  boxShadow: '0 0 20px var(--primary), inset 0 0 10px var(--primary)'
                }}
              />
            )}

            {/* Fading Trail */}
            {trail.map(t => (
              <div
                key={t.id}
                className="absolute z-10 w-[24px] h-[24px] bg-[var(--primary)]/40 pointer-events-none mix-blend-screen animate-grid-trail"
                style={{
                  left: t.x,
                  top: t.y,
                  boxShadow: '0 0 10px var(--primary), inset 0 0 5px var(--primary)'
                }}
              />
            ))}

            {/* Interactive Soft Glow Following Cursor */}
            {isGridHovered && (
              <div
                className="absolute z-10 w-[200px] h-[200px] bg-[var(--primary)]/15 rounded-full blur-[40px] pointer-events-none transition-all duration-75 ease-out"
                style={{
                  left: gridPos.rawX - 100,
                  top: gridPos.rawY - 100
                }}
              />
            )}
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative z-20 max-w-2xl space-y-8 pl-8 lg:pl-16"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase text-[var(--primary)] shadow-[0_0_15px_rgba(255,177,197,0.2)]">
              <Sparkles size={12} className="animate-pulse" />
              <span>{t('hero.badge')}</span>
            </motion.div>

            <motion.h1 variants={itemVariants} className="display-lg">
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 block pb-2">{t('hero.title1')}</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-rose-400 block">
                {t('hero.title2')}
                <span className="text-white">{t('hero.title3')}</span>
              </span>
            </motion.h1>

            <motion.p variants={itemVariants} className="body-md text-gray-400 max-w-lg leading-relaxed">
              {t('hero.description')}
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 pt-6">
              <button className="btn btn-primary group relative overflow-hidden">
                <span className="relative z-10 flex items-center">
                  <Cpu size={18} className="mr-2" /> {t('hero.btnStart')}
                </span>
                <div className="absolute inset-0 h-full w-0 bg-white/20 transition-[width] duration-300 ease-out group-hover:w-full"></div>
              </button>
              <button className="btn bg-[var(--surface-container-highest)] border border-[var(--outline-variant)] hover:bg-[var(--surface-variant)] text-white transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                {t('hero.btnDocs')}
              </button>
            </motion.div>
          </motion.div>
        </section>

        {/* Public Projects Section */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="px-8 lg:px-16 py-24 max-w-7xl mx-auto"
        >
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="headline-lg text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 mb-2">{t('projects.title')}</h2>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                <p className="label-md text-gray-400 uppercase tracking-widest">{t('projects.subtitle')}</p>
              </div>
            </div>
            <a href="#" className="text-sm font-semibold text-[var(--primary)] hover:text-rose-300 flex items-center transition-colors group">
              {t('projects.explore')} <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Large Card */}
            <motion.div
              whileHover={{ y: -5 }}
              className="lg:col-span-5 relative rounded-3xl overflow-hidden group cursor-pointer border border-[var(--outline-variant)] min-h-[500px] shadow-2xl"
            >
              <Image
                src={`${BASE_PATH}/images/tokyo.png`}
                alt="Tokyo Midnight 2077"
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-1"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent transition-opacity group-hover:opacity-80" />
              <div className="absolute inset-0 border border-white/10 rounded-3xl z-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 p-8 w-full z-10">
                <div className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-bold tracking-widest text-white mb-4 uppercase">
                  {t('projects.card1.badge')}
                </div>
                <h3 className="text-3xl font-bold text-white mb-4 drop-shadow-md">{t('projects.card1.title')}</h3>
                <div className="flex items-center space-x-3 bg-black/40 backdrop-blur-sm p-3 rounded-2xl border border-white/10 w-fit">
                  <div className="flex -space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 border-2 border-[#131313]" />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-rose-600 border-2 border-[#131313]" />
                  </div>
                  <span className="text-xs font-medium text-gray-300">{t('projects.card1.desc')}</span>
                </div>
              </div>
            </motion.div>

            {/* Right Column (Grid of smaller cards) */}
            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Row Cards */}
              <motion.div whileHover={{ y: -5, scale: 1.02 }} className="relative rounded-3xl overflow-hidden group cursor-pointer border border-[var(--outline-variant)] h-[240px]">
                <Image src={`${BASE_PATH}/images/orbital.png`} alt="Orbital Path V2" fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/10" />
                <div className="absolute bottom-0 left-0 p-6 z-10">
                  <div className="text-[10px] font-bold tracking-widest text-[var(--primary)] mb-2 uppercase flex items-center"><Activity size={12} className="mr-1" /> {t('projects.card2.badge')}</div>
                  <h3 className="text-xl font-bold text-white">{t('projects.card2.title')}</h3>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -5, scale: 1.02 }} className="relative rounded-3xl overflow-hidden group cursor-pointer border border-[var(--outline-variant)] h-[240px]">
                <Image src={`${BASE_PATH}/images/deep_space.png`} alt="Deep Space Sigma" fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/10" />
                <div className="absolute bottom-0 left-0 p-6 z-10">
                  <div className="text-[10px] font-bold tracking-widest text-indigo-400 mb-2 uppercase flex items-center"><Layers size={12} className="mr-1" /> {t('projects.card3.badge')}</div>
                  <h3 className="text-xl font-bold text-white">{t('projects.card3.title')}</h3>
                </div>
              </motion.div>

              {/* Bottom Wide Card */}
              <motion.div whileHover={{ y: -5 }} className="md:col-span-2 relative rounded-3xl overflow-hidden group cursor-pointer border border-[var(--outline-variant)] h-[240px]">
                <Image src={`${BASE_PATH}/images/monolith.png`} alt="Monolith Study" fill className="object-cover transition-transform duration-1000 group-hover:scale-105 group-hover:rotate-1" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 p-8 w-full flex justify-between items-end z-10">
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-emerald-400 mb-2 uppercase">{t('projects.card4.badge')}</div>
                    <h3 className="text-2xl font-bold text-white">{t('projects.card4.title')}</h3>
                  </div>
                  <div className="p-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 transition-transform group-hover:rotate-12 group-hover:scale-110">
                    <BarChart2 size={24} className="text-white" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* FAQ Section */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="px-8 lg:px-16 py-24 max-w-7xl mx-auto border-t border-[var(--outline-variant)] relative"
        >
          <div className="absolute top-0 right-1/4 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <h2 className="headline-lg text-white mb-6 leading-tight">{t('faq.title1')}<br /><span className="text-[var(--primary)]">{t('faq.title2')}</span></h2>
              <p className="text-gray-400 mb-8 max-w-sm">
                {t('faq.desc')}
              </p>
              <button className="px-6 py-3 bg-[var(--surface-container)] border border-[var(--outline-variant)] rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-white/10 hover:border-white/30 transition-all flex items-center">
                {t('faq.btnContact')} <ArrowRight size={14} className="ml-2" />
              </button>
            </div>

            <div className="lg:col-span-8 space-y-4">
              {/* Active FAQ Item */}
              <motion.div whileHover={{ x: 5 }} className="p-8 rounded-3xl bg-gradient-to-r from-[var(--surface-container)] to-[var(--surface)] border border-[var(--outline-variant)] border-l-4 border-l-[var(--primary)] shadow-lg shadow-black/50">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center"><div className="w-2 h-2 rounded-full bg-[var(--primary)] mr-3" /> {t('faq.q1')}</h3>
                <p className="text-sm text-gray-400 leading-relaxed pl-5">
                  {t('faq.a1')}
                </p>
              </motion.div>

              {/* Inactive FAQ Items */}
              <motion.div whileHover={{ x: 5 }} className="p-8 rounded-3xl bg-[var(--surface-container-low)] border border-[var(--outline-variant)] hover:bg-[var(--surface-container)] transition-colors cursor-pointer group">
                <h3 className="text-lg font-semibold text-gray-300 group-hover:text-white transition-colors">{t('faq.q2')}</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  {t('faq.a2')}
                </p>
              </motion.div>

              <motion.div whileHover={{ x: 5 }} className="p-8 rounded-3xl bg-[var(--surface-container-low)] border border-[var(--outline-variant)] hover:bg-[var(--surface-container)] transition-colors cursor-pointer group">
                <h3 className="text-lg font-semibold text-gray-300 group-hover:text-white transition-colors">{t('faq.q3')}</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  {t('faq.a3')}
                </p>
              </motion.div>

              <motion.div whileHover={{ x: 5 }} className="p-8 rounded-3xl bg-[var(--surface-container-low)] border border-[var(--outline-variant)] hover:bg-[var(--surface-container)] transition-colors cursor-pointer group">
                <h3 className="text-lg font-semibold text-gray-300 group-hover:text-white transition-colors">{t('faq.q4')}</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  {t('faq.a4')}
                </p>
              </motion.div>
            </div>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="px-8 lg:px-16 py-8 border-t border-[var(--outline-variant)] bg-black/20 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 backdrop-blur-md">
        <div className="mb-4 md:mb-0 flex items-center">
          <div className="w-4 h-4 rounded bg-[var(--primary)]/20 flex items-center justify-center mr-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
          </div>
          {t('footer.copyright')}
        </div>
        <div className="flex space-x-8">
          <a href="#" className="hover:text-white transition-colors">{t('footer.privacy')}</a>
          <a href="#" className="hover:text-white transition-colors">{t('footer.terms')}</a>
          <a href="#" className="hover:text-[var(--primary)] transition-colors flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" /> {t('footer.api')}
          </a>
          <a href="#" className="hover:text-white transition-colors">{t('footer.contact')}</a>
        </div>
      </footer>
    </div>
  );
}
