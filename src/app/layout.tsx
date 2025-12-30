import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Playmaker - AI Sports Assistant",
  description: "Your AI-powered sports companion with live scores, real-time stats, and instant insights.",
  keywords: ["sports", "AI", "live scores", "NFL", "NBA", "stats", "assistant"],
  authors: [{ name: "Playmaker" }],
  openGraph: {
    title: "Playmaker - AI Sports Assistant",
    description: "Your AI-powered sports companion with live scores, real-time stats, and instant insights.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
