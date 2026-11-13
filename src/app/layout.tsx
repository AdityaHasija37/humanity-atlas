import type { Metadata, Viewport } from "next";
import { Inter, Newsreader, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], style: ["normal", "italic"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Humanity Atlas: How Much Earth Do We Need?",
  description:
    "An interactive thought experiment: how much land would it take to house, feed and sustain everyone on Earth? Transparent assumptions, FAO baselines, reproducible arithmetic.",
  openGraph: {
    title: "Humanity Atlas: How Much Earth Do We Need?",
    description: "Housing, cities, food and forests: a scenario lab with documented assumptions.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f3ea",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable} ${mono.variable} antialiased`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
