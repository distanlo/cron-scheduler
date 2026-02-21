import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cron Agent Scheduler",
  description: "Schedule AI prompts and send output to Discord"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
