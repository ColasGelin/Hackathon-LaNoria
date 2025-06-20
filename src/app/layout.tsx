import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hackathon Lanoria",
  description: "Hackathon Lanoria PWA App with Camera",
  manifest: "/manifest.json",
  themeColor: "#171717",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lanoria",
    startupImage: [
      "/icon-512x512.png",
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Hackathon Lanoria",
    title: "Hackathon Lanoria",
    description: "Hackathon Lanoria PWA App with Camera",
  },
  twitter: {
    card: "summary",
    title: "Hackathon Lanoria",
    description: "Hackathon Lanoria PWA App with Camera",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Essential PWA meta tags */}
        <meta name="application-name" content="Lanoria" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Apple specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Lanoria" />
        <meta name="apple-touch-fullscreen" content="yes" />
        
        {/* Camera permissions */}
        <meta name="permissions" content="camera" />
        
        {/* Disable various iOS Safari features */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Theme and display */}
        <meta name="theme-color" content="#171717" />
        <meta name="msapplication-TileColor" content="#171717" />
        
        {/* Icons and manifest */}
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512x512.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/icon-192x192.png" />
        
        {/* Apple startup images */}
        <link rel="apple-touch-startup-image" href="/icon-512x512.png" />
        
        {/* Prevent zoom and ensure proper viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    }, function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
              
              // Prevent zoom on iOS
              document.addEventListener('gesturestart', function (e) {
                e.preventDefault();
              });
              
              // Prevent double-tap zoom
              let lastTouchEnd = 0;
              document.addEventListener('touchend', function (event) {
                const now = (new Date()).getTime();
                if (now - lastTouchEnd <= 300) {
                  event.preventDefault();
                }
                lastTouchEnd = now;
              }, false);
            `,
          }}
        />
      </body>
    </html>
  );
}