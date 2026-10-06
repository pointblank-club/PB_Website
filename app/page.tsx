import type { Metadata } from "next";
import HomeClient from "@/components/homepage/HomeClient";
import { safeJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import HeroSection from "@/components/homepage/HeroSection";
import Recruitment from "@/components/ui/Recruitment";
import MissionVisionSection from "@/components/homepage/MissionVisionSection";
import CardStack from "@/components/homepage/CardStack";
import DomainsSection from "@/components/homepage/DomainsSection";
import ActivitiesSection from "@/components/homepage/ActivitiesSection";
import FoundingMembersSection from "@/components/homepage/FoundingMembersSection";
import StayConnectedSection from "@/components/homepage/StayConnectedSection";

const SITE_URL = "https://www.pointblank.club";

export const metadata = buildMetadata({
  path: "/",
  absoluteTitle: "Point Blank | Student Run Open Source Community from India",
  description:
    "Point Blank is a student run open source community. We are a group of tech enthusiasts who love to learn and grow together.",
});


export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Point Blank",
    url: SITE_URL,
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(jsonLd),
        }}
      />
      <HomeClient />
      <div className="relative">
        <Recruitment />
        <HeroSection />
      </div>
      <MissionVisionSection />
      <CardStack />
      <DomainsSection />
      <ActivitiesSection />
      <FoundingMembersSection />
      <StayConnectedSection />
    </>
  );
}