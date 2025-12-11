// Import polyfills FIRST before any other imports
import "./polyfills";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Script from "next/script";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ZKPassport SDK Example",
  description: "Example of using the ZKPassport SDK for identity verification",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script id="buffer-polyfill" strategy="beforeInteractive">
          {`
            // Inject Buffer polyfill immediately
            (function() {
              if (typeof window !== 'undefined' && !window.Buffer) {
                console.log('Initializing Buffer polyfill...');
              }
            })();
          `}
        </Script>
      </head>
      <body className={`${geistSans.className} antialiased`}>{children}</body>
    </html>
  );
}
