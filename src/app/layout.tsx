import Providers from "@/components/Providers";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata = {
  title: "R10 Token",
  description: "R10 Token",
  icons: { icon: "/images/favicon.avif" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={plusJakartaSans.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
