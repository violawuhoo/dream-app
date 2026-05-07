import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dream App",
  description: "An AI-native dream journaling app",
  appleWebApp: {
    capable: true,
    title: "Dream App",
    statusBarStyle: "black-translucent",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
