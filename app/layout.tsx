export const metadata = {
  title: "Prompt → Preview Orchestrator",
  description: "Turn natural-language prompts into live previews",
};

import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" }}>
        {children}
      </body>
    </html>
  );
}
