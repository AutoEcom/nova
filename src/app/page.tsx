import { Hero } from "@/components/Hero";
import { CommandLayer } from "@/components/CommandLayer";
import { SeeItInAction } from "@/components/SeeItInAction";
import { MeetTheAgents } from "@/components/MeetTheAgents";
import { Tokenomics } from "@/components/Tokenomics";
import { Roadmap } from "@/components/Roadmap";
import { StickyCTA } from "@/components/StickyCTA";

export default function Home() {
  return (
    <>
      <main className="flex-1">
        <Hero />
        <CommandLayer />
        <SeeItInAction />
        <MeetTheAgents />
        <Tokenomics />
        <Roadmap />
      </main>
      <StickyCTA />
    </>
  );
}
