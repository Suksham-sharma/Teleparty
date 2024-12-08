import { Toaster } from "sonner";
import "./globals.css";
import "./plyr.css";
import { Inter } from "next/font/google";
import Wrapper from "./_components/wrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "ChronoTask - Think, plan, and track all in one place",
  description:
    "Efficiently manage your tasks and boost productivity with ChronoTask.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Wrapper>
          {children} <Toaster richColors />
        </Wrapper>
      </body>
    </html>
  );
}
