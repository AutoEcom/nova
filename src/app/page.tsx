import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Tokenomics } from "@/components/Tokenomics";
import { Roadmap } from "@/components/Roadmap";
import { Ecosystem } from "@/components/Ecosystem";
import { Footer } from "@/components/Footer";
import { StickyCTA } from "@/components/StickyCTA";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Tokenomics />
        <Roadmap />
        <Ecosystem />
      </main>
      <Footer />
      <StickyCTA />
    </>
  );
}
