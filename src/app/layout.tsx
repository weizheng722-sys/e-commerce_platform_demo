import type { Metadata } from "next";
import { CartProvider } from "@/features/cart/cart-context";
import "./globals.css";

const siteUrl = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FreshBox | Good food, on your schedule",
    template: "%s | FreshBox",
  },
  description:
    "Fresh, feel-good food boxes and everyday essentials, delivered on a schedule that works for you.",
  openGraph: {
    title: "FreshBox | Good food, on your schedule",
    description: "A little more goodness in your week.",
    siteName: "FreshBox",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><CartProvider>{children}</CartProvider></body>
    </html>
  );
}
