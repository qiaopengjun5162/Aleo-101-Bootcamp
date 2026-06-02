import { useState } from "react";
import { Header, type Tab } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { InputPage } from "./pages/InputPage";
import { ManagePage } from "./pages/ManagePage";

export function App() {
  const [tab, setTab] = useState<Tab>("hero");

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header tab={tab} onTabChange={setTab} />
      <main>
        {tab === "hero" ? <HeroSection onStart={() => setTab("input")} /> : null}
        {tab === "input" ? <InputPage /> : null}
        {tab === "manage" ? <ManagePage /> : null}
      </main>
    </div>
  );
}
