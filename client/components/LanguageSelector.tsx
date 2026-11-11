"use client";

import { useLanguage } from "../providers/LanguageProvider";
import { Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        title="Change Language"
      >
        <Globe size={18} />
        <span className="text-xs font-semibold uppercase">{language}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-[var(--surface-container)] border border-[var(--outline-variant)] rounded-xl shadow-ambient overflow-hidden z-50">
          <button
            onClick={() => { setLanguage("en"); setIsOpen(false); }}
            className={`w-full text-left px-4 py-2 text-sm transition-colors ${language === 'en' ? 'bg-[var(--surface-variant)] text-white font-medium' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
          >
            English
          </button>
          <button
            onClick={() => { setLanguage("th"); setIsOpen(false); }}
            className={`w-full text-left px-4 py-2 text-sm transition-colors ${language === 'th' ? 'bg-[var(--surface-variant)] text-white font-medium' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
          >
            ภาษาไทย
          </button>
        </div>
      )}
    </div>
  );
}
