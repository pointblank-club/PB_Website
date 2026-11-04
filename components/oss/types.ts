// ─── API response shapes (new API) ───────────────────────────────────────────

export type ContributionTag = "gsoc" | "lfx" | "both" | "none";
export type ContributionPlatform = "github" | "gitlab" | "linux";

/** GET /api/contributions?view=stats */
export interface StatsResponse {
  totalMergedPRs: number;
  github: number;
  gitlab: number;
  linux: number;
}

/** One entry from GET /api/contributions?view=orgs */
export interface OrgEntry {
  orgLogin: string;
  totalMergedPRs: number;
  contributorCount: number;
  /** GitHub/GitLab usernames */
  contributors: string[];
  /** Display names of members */
  memberNames: string[];
  platforms: ContributionPlatform[];
  orgAvatar?: string;
  orgUrl?: string;
  tag: ContributionTag;
}

/** GET /api/contributions?view=orgs */
export interface OrgsResponse {
  data: OrgEntry[];
}

/** One entry from GET /api/contributions?view=contributors */
export interface ContributorEntry {
  username: string;
  memberName: string;
  totalMergedPRs: number;
  totalCommits: number;
  totalOrgs: number;
  orgs: string[];
  platforms: ContributionPlatform[];
  tags: ContributionTag[];
}

/** GET /api/contributions?view=contributors */
export interface ContributorsResponse {
  data: ContributorEntry[];
}

// ─── View-model types (consumed by components) ───────────────────────────────

export interface OssOrganization {
  id: string;
  name: string;
  url?: string;
  avatarUrl?: string;
  platform?: ContributionPlatform;
  description?: string;
  tag: ContributionTag;
  prCount: number;
  commitCount: number;
  totalContributions: number;
  /** Slim contributor references attached to this org */
  contributors: OssContributorRef[];
}

export interface OssContributorRef {
  id: string;
  name: string;
  login: string;
  url?: string;
  platform?: ContributionPlatform;
}

export interface OssContributor {
  id: string;
  name: string;
  login?: string;
  bio?: string;
  url?: string;
  platform?: ContributionPlatform;
  prCount: number;
  totalContributions: number;
  /** Slim org references attached to this contributor */
  organizations: OssOrganizationRef[];
}

export interface OssOrganizationRef {
  id: string;
  name: string;
  prCount?: number;
  url?: string;
  platform?: ContributionPlatform;
}

export interface DashboardStats {
  totalMergedPRs: number;
  totalOrganizations: number;
  totalContributors: number;
}

// ─── Component prop / state types ────────────────────────────────────────────

export type DashboardTab = "dashboard" | "organizations" | "contributors";

export type OrganizationSortOptionId =
  | "totalContributions"
  | "prCount"
  | "name"
  | "contributors";

export type ContributorSortOptionId =
  | "totalContributions"
  | "prCount"
  | "name";

export type OrganizationTagFilter = "all" | ContributionTag;

/** Full organization view used in OssOrganizationsPanel / OssOrganizationCard */
export type OrganizationView = OssOrganization;

/** Full contributor view used in OssContributorsPanel / OssContributorCard */
export type ContributorView = OssContributor;