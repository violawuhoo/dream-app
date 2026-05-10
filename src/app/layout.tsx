import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased overflow-x-hidden selection:bg-accent-light/30">
        {children}
      </body>
    </html>
  );
}
