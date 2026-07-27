import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Last-Minute Hotel Deals",
  description: "Find the best last-minute hotel deals in any city",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  );
}
