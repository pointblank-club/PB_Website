import type { Metadata } from "next";
import HomeClient from "@/components/homepage/HomeClient";
import { safeJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { useEffect } from "react";
import HeroSection from "@/components/homepage/HeroSection";
import Recruitment from "@/components/ui/Recruitment";
import MissionVisionSection from "@/components/homepage/MissionVisionSection";
import CardStack from "@/components/homepage/CardStack";
import DomainsSection from "@/components/homepage/DomainsSection";
import ActivitiesSection from "@/components/homepage/ActivitiesSection";
import FoundingMembersSection from "@/components/homepage/FoundingMembersSection";
import StayConnectedSection from "@/components/homepage/StayConnectedSection";
import { useLoadingStore } from "@/lib/store/loading";

const SITE_URL = "https://www.pointblank.club";

export const metadata = buildMetadata({
  path: "/",
  absoluteTitle: "Point Blank · Student run Open Source Community, India",
  description:
    "Point Blank · student-run open source community from India. IndiaFOSS Student Community of the Year. Systems, Open Source, ML, DevOps, CyberSec, CP.",
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