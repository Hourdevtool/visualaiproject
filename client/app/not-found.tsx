import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--surface)] flex flex-col justify-center items-center relative overflow-hidden font-sans text-gray-300">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] rounded-full bg-rose-500/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] rounded-full bg-[var(--primary)]/5 blur-[100px]" />
      </div>

      <div className="z-10 text-center flex flex-col items-center">
        <h1 className="text-[150px] font-bold font-['Space_Grotesk'] leading-none text-transparent bg-clip-text bg-gradient-to-b from-gray-200 to-gray-800 opacity-80">
          404
        </h1>
        <h2 className="text-2xl font-bold text-white mt-4 tracking-widest uppercase">
          Signal Lost
        </h2>
        <p className="text-sm text-gray-400 mt-4 max-w-md">
          The quadrant you are attempting to access does not exist or your clearance level is insufficient. Return to active sectors.
        </p>
        
        <Link 
          href="/"
          className="mt-10 px-8 py-3 relative overflow-hidden bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)] border border-[var(--outline-variant)] text-white flex justify-center items-center rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all transform hover:scale-[1.02] hover:border-[var(--primary)] group"
        >
          <span className="relative z-10 font-bold tracking-widest text-xs uppercase group-hover:text-[var(--primary)] transition-colors">Return Home</span>
        </Link>
      </div>

      <div className="absolute bottom-8 text-[10px] tracking-[0.2em] text-gray-600 font-bold uppercase">
        Error Log :: 404_NOT_FOUND
      </div>
    </div>
  );
}
