import type { Metadata, Viewport } from "next";
import { Anek_Malayalam, Noto_Serif_Malayalam, Poppins } from "next/font/google";
import "./globals.css";

// English is set in Poppins. Poppins has no Malayalam glyphs, so Malayalam falls through to the next font in
// the stack (--font-sans and --font-display in globals.css): Anek Malayalam in titles, Noto Serif Malayalam in text.
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"], display: "swap" });
const malayalamTitle = Anek_Malayalam({ variable: "--font-ml-title", subsets: ["malayalam"], display: "swap" });
const malayalamText = Noto_Serif_Malayalam({ variable: "--font-ml-text", subsets: ["malayalam"], display: "swap" });

// Every page reads D1 at request time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.giokerala.org"),
  title: { default: "GIO Kerala | Girls Islamic Organization", template: "%s | GIO Kerala" },
  description: "Girls Islamic Organization (GIO) Kerala: Islamic students' and young women's organisation in Kerala.",
  // Favicons come from the files app/icon.png, app/apple-icon.png and app/favicon.ico.
};

export const viewport: Viewport = { themeColor: "#0a64a6" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} ${malayalamTitle.variable} ${malayalamText.variable} antialiased`}>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
