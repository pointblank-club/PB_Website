import type { OrganizationView } from "@/components/oss/types";
import OssAvatar from "@/components/oss/widgets/OssAvatar";
import { contributorLabel, getContributorGithubUrl } from "@/components/oss/utils";

export default function OssOrganizationCard({
  organization,
  flipped,
  onToggleFlip,
}: {
  organization: OrganizationView;
  flipped: boolean;
  onToggleFlip: () => void;
}) {
  const contributorCount = organization.contributors.length;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={
        flipped
          ? `Show ${organization.name} details`
          : `Show contributors for ${organization.name}`
      }
      onClick={onToggleFlip}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggleFlip();
        }
      }}
      className="relative h-full cursor-pointer perspective-distant"
    >
      <div
        className={`relative h-full rounded-[20px] border transition-transform duration-500 transform-3d ${
          flipped
            ? "border-pbgreen"
            : "border-transparent hover:border-pbgreen/60"
        }`}
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        <div className="flex h-full flex-col items-center rounded-[20px] bg-pbgray p-6 text-center backface-hidden sm:p-7">
          <OssAvatar
            login={organization.name}
            name={organization.name}
            platform={organization.platform}
            avatarUrl={organization.avatarUrl}
            shape="square"
            size={96}
          />
          <h3 className="mt-4 w-full truncate text-lg font-semibold text-white sm:text-xl">
            {organization.name}
          </h3>

          <div className="mt-5 flex w-full items-center justify-center gap-3 border-t border-zinc-800/60 pt-4">
            <span className="flex items-center gap-1.5 rounded-full border border-pbborder bg-pbdarkgray px-3.5 py-1.5 text-sm">
              <span className="font-medium text-pbgreen">
                {organization.prCount}
              </span>
              <span className="text-white">PRs</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-pbborder bg-pbdarkgray px-3.5 py-1.5 text-sm">
              <span className="font-medium text-pbgreen">
                {contributorCount}
              </span>
              <span className="text-white">
                {contributorCount === 1 ? "Contributor" : "Contributors"}
              </span>
            </span>
          </div>
        </div>

        <div
          className="absolute inset-0 flex flex-col items-center rounded-[20px] bg-pbgray p-6 text-center backface-hidden sm:p-7"
          style={{ transform: "rotateY(180deg)" }}
        >
          <h4 className="text-lg font-medium text-pbgreen sm:text-xl">
            Contributors
          </h4>
          <div className="mt-4 h-px w-full bg-zinc-800/60" />
          <div className="mt-4 flex max-h-full flex-wrap items-start justify-center gap-2 overflow-y-auto">
            {organization.contributors.length === 0 ? (
              <span className="text-xs text-zinc-600">No contributors yet</span>
            ) : (
              organization.contributors.map((contributor) => {
                const contributorUrl = getContributorGithubUrl(contributor);
                const label = contributorLabel(contributor);

                if (contributorUrl) {
                  return (
                    <a
                      key={contributor.id}
                      href={contributorUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      aria-label={`Open ${label}'s profile`}
                      className="rounded-full border border-pbborder bg-pbdarkgray px-3 py-1.5 text-xs text-white transition-colors hover:border-pbgreen hover:text-pbgreen"
                    >
                      {label}
                    </a>
                  );
                }

                return (
                  <span
                    key={contributor.id}
                    className="rounded-full border border-pbborder bg-pbdarkgray px-3 py-1.5 text-xs text-white"
                  >
                    {label}
                  </span>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
