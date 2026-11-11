import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "../providers/LanguageProvider";
import AuthProvider from "../providers/AuthProvider";
import { NavbarWrapper } from "../components/Navbar";
import { Toaster } from "sonner";
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VisulAI",
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    
      <html
        lang="en"
        className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
      >
        <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased bg-[var(--surface)] text-[var(--on-surface)] selection:bg-[var(--primary)] selection:text-black min-h-screen flex flex-col`}>
          <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--primary)]/10 blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[150px]" />
            <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] rounded-full bg-rose-500/5 blur-[100px]" />
          </div>
          <Toaster richColors position="top-center" />
          <AuthProvider>
          <LanguageProvider>
            <NavbarWrapper />
            <div className="relative z-10 flex-1 flex flex-col">
              {children}
            </div>
          </LanguageProvider>
          </AuthProvider>
        </body>
      </html>
  );
}
