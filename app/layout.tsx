import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { ToastProvider } from "@/components/toast";

// Aplica o tema salvo (ou a preferência do sistema) antes da primeira
// pintura, para não piscar claro→escuro (ou vice-versa) ao carregar.
const TEMA_INIT_SCRIPT = `
try {
  var raw = localStorage.getItem("betesporte_config");
  var tema = raw ? (JSON.parse(raw).preferencias || {}).tema : "sistema";
  var escuro = tema === "escuro" || (tema !== "claro" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (escuro) document.documentElement.classList.add("dark");
} catch (e) {}
`;

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BETesporte - Gestão de Influenciadores",
  description: "Sistema de gestão de influenciadores",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "BETesporte" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0071e3",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Script id="tema-init" strategy="beforeInteractive">
          {TEMA_INIT_SCRIPT}
        </Script>
        <ToastProvider>
          {children}
          <PwaRegister />
        </ToastProvider>
      </body>
    </html>
  );
}