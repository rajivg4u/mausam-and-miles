<<<<<<< HEAD

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mausam & Miles | Weather and Travel Explorer",
  description:
    "Explore Indian destinations, weather forecasts, nearby attractions and trip budgets."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
=======

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mausam & Miles | Weather and Travel Explorer",
  description:
    "Explore Indian destinations, weather forecasts, nearby attractions and trip budgets."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
>>>>>>> e8c6f1a (Fix Vercel build errors)
