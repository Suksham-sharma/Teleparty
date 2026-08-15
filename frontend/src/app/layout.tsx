import { Toaster } from "sonner";
import "./globals.css";
import "./plyr.css";
import { Outfit, JetBrains_Mono } from "next/font/google";

// Outfit carries both display and UI — there is no serif in this system.
// docs/DESIGN.md §3.
const display = Outfit({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  variable: "--font-display",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata = {
  title: "watchparty — best nights in",
  description:
    "Start a room, send one link, press play. Everyone stays on the same frame to the second — no app, no account.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${mono.variable}`}
    >
      <body className="bg-black font-sans text-ash antialiased">
        {children}
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
