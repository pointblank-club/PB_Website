import type { Metadata } from "next";
import OssDashboard from "@/components/oss/OssDashboard";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  getGlobalStats,
  getOrgBreakdown,
  getContributorStats,
} from "@/lib/server/contributionsV2";
import { ensureOrgTagCache } from "@/lib/data/orgs";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  path: "/oss",
  title: "OSS",
  description:
    "Open source contributions and merged pull requests of Point Blank members.",
});

export default async function OssPage() {
  await ensureOrgTagCache();

  const [stats, orgs, contributors] = await Promise.all([
    getGlobalStats(),
    getOrgBreakdown(),
    getContributorStats(),
  ]);

  const initialData = JSON.parse(
    JSON.stringify({ stats, orgs: { data: orgs }, contributors: { data: contributors } }),
  );

  return (
    <section className="w-full" id="oss">
      <OssDashboard endpoint="/api/contributionsV2" initialData={initialData} />
    </section>
  );
}