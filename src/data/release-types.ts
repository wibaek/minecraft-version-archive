export type ReleaseLabel = "major" | "content" | "fix" | "technical" | "security";

export type MinorRelease = {
  version: string;
  releasedAt: string;
  label: ReleaseLabel;
  summary: string;
  changes: string[];
};

export type MajorRelease = {
  version: string;
  name: string;
  releasedAt: string;
  summary: string;
  highlights: string[];
  releases: MinorRelease[];
};

export type TocItem = {
  id: string;
  label: string;
  name: string;
};
