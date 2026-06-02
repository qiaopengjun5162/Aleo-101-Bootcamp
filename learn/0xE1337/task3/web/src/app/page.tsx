import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Hero } from "@/components/hero/Hero";
import { PublicVsPrivate } from "@/components/compare/PublicVsPrivate";
import { IssuePanel } from "@/components/issue/IssuePanel";
import { GatePanel } from "@/components/gate/GatePanel";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <div className="container">
          <hr className="divider" />
        </div>
        <PublicVsPrivate />
        <IssuePanel />
        <GatePanel />
      </main>
      <SiteFooter />
    </>
  );
}
