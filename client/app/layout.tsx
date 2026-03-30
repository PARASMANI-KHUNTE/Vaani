import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Fraunces } from "next/font/google";
import { getServerSession } from "next-auth";
import { Providers } from "@/app/providers";
import { authOptions } from "@/lib/auth-options";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Canvas Chat",
  description: "A warm, polished real-time chat workspace for focused conversations.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable}`}>
        <Providers session={session}>
          <div className="min-h-screen bg-shell text-ink">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
