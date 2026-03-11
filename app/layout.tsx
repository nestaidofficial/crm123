import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
// Validate env at startup (throws if required vars missing/invalid)
import "@/lib/env";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Nessa CRM - Home Health Care Management",
  description: "All-in-one software platform for managing home health care agencies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased h-full text-neutral-900`} suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
