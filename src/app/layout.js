import "./globals.css";
import AppLayout from "@/components/layout/AppLayout";
import UpdateChecker from "@/components/layout/UpdateChecker";
import CapacitorAppListener from "@/components/layout/CapacitorAppListener";

export const metadata = {
  title: "FlatSplit",
  description: "Flat expense management app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "FlatSplit",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: '/icons/icon-192x192.png',
  },
};

export const viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark') {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch (e) {}

              // Forcibly unregister stale service workers
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister();
                  }
                });
              }
            })();
          `
        }} />
      </head>
      <body>
        <UpdateChecker />
        <CapacitorAppListener />
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
