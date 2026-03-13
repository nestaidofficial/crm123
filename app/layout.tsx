import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
// Validate env at startup (throws if required vars missing/invalid)
import "@/lib/env";

const geist = Geist({subsets:['latin','latin-ext'],variable:'--font-geist'});

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
    <html lang="en" className={`h-full ${geist.variable}`} suppressHydrationWarning>
      <body className="font-geist antialiased h-full text-neutral-900" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
