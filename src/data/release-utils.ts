import type { MajorRelease, MinorRelease, TocItem } from "./release-types";

export function getMajorVersion(version: string): string {
  return version.split(".").slice(0, 2).join(".");
}

export function createMajorReleaseId(version: string): string {
  return `version-${version.replaceAll(".", "-")}`;
}

export function getLatestMinorRelease(releases: MajorRelease[]): MinorRelease {
  const latest = releases[0]?.releases[0];

  if (!latest) {
    throw new Error("Release archive must contain at least one release.");
  }

  return latest;
}

export function getTocItems(releases: MajorRelease[]): TocItem[] {
  return releases.map((release) => ({
    id: createMajorReleaseId(release.version),
    label: release.version,
    name: release.name,
  }));
}

export function isReleaseArchiveSorted(releases: MajorRelease[]): boolean {
  return releases.every((release, index) => {
    const previousMajor = releases[index - 1];
    const isMajorSorted =
      !previousMajor || Date.parse(previousMajor.releasedAt) >= Date.parse(release.releasedAt);
    const areMinorReleasesSorted = release.releases.every((minorRelease, minorIndex) => {
      const previousMinor = release.releases[minorIndex - 1];
      return (
        !previousMinor ||
        Date.parse(previousMinor.releasedAt) >= Date.parse(minorRelease.releasedAt)
      );
    });

    return isMajorSorted && areMinorReleasesSorted;
  });
}
