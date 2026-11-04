export interface RawContribution {
    memberName:   string;
    username:     string;
    platform:     "github" | "gitlab" | "linux";
    repoFullName: string;
    orgLogin:     string;
    orgAvatarUrl: string;
    orgHtmlUrl:   string;
    title:        string;
    url:          string;
    mergedAt:     Date;
  }
  
  export interface RepoDetails {
    full_name:        string;
    stargazers_count: number;
    private:          boolean;
    fork:             boolean;
    size:             number;
    owner: {
      login:      string;
      type:       string;
      avatar_url: string;
    };
    parent_full_name?: string;
  }
  
  export interface OrgDetails {
    login:        string;
    public_repos: number;
    followers:    number;
  }