export const LINK_CATEGORIES = [
  "GSoC",
  "LFX",
  "SIH",
  "LIFT",
  "Hackathons",
  "CP",
  "ACM",
] as const;
export type LinkCategory = (typeof LINK_CATEGORIES)[number];

const LINK_CONFIG: Record<
  LinkCategory,
  { label: string; placeholder: string; officialHosts: string[] }
> = {
  GSoC: {
    label: "GSoC project link",
    placeholder: "https://summerofcode.withgoogle.com/archive/2024/projects/...",
    officialHosts: ["summerofcode.withgoogle.com"],
  },
  LFX: {
    label: "LFX mentorship link",
    placeholder: "https://mentorship.lfx.linuxfoundation.org/project/...",
    officialHosts: ["linuxfoundation.org"],
  },
  SIH: {
    label: "SIH result link",
    placeholder: "https://... (official SIH result / announcement page)",
    officialHosts: [],
  },
  LIFT: {
    label: "LIFT link",
    placeholder: "https://... (official page for this achievement)",
    officialHosts: [],
  },
  Hackathons: {
    label: "Hackathon result link",
    placeholder: "https://... (organizer's results page or project submission)",
    officialHosts: [],
  },
  CP: {
    label: "Contest / profile link",
    placeholder: "https://codeforces.com/profile/... or contest standings",
    officialHosts: [],
  },
  ACM: {
    label: "ACM link",
    placeholder: "https://... (official page for this achievement)",
    officialHosts: [],
  },
};

export function supportsLink(category: string): category is LinkCategory {
  return (LINK_CATEGORIES as readonly string[]).includes(category);
}

export function linkConfig(category: LinkCategory) {
  return LINK_CONFIG[category];
}

/** Returns a warning string if `url` is set but looks wrong, else null. */
export function officialLinkWarning(
  category: string,
  url: string | undefined,
): string | null {
  if (!supportsLink(category) || !url?.trim()) return null;
  let host: string;
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:") return "Link must start with https://";
    host = u.hostname.toLowerCase();
  } catch {
    return "This doesn't look like a valid URL";
  }
  const { officialHosts } = LINK_CONFIG[category];
  if (officialHosts.length === 0) return null; // no domain rule for this category
  const ok = officialHosts.some((h) => host === h || host.endsWith(`.${h}`));
  return ok
    ? null
    : `This doesn't look like an official ${category} link (expected ${officialHosts[0]}). You can still save it.`;
}