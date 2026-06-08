import { describe, expect, test } from "vitest";
import { releaseData } from "./release-data";
import {
  createMajorReleaseId,
  getLatestMinorRelease,
  getMajorVersion,
  getTocItems,
  isReleaseArchiveSorted,
} from "./release-utils";

const allMinorReleases = releaseData.flatMap((majorRelease) => majorRelease.releases);

describe("release data", () => {
  test("contains the full Java Edition release history from 1.0 through the latest release", () => {
    expect(releaseData.length).toBeGreaterThanOrEqual(23);
    expect(allMinorReleases.length).toBe(101);
    expect(getLatestMinorRelease(releaseData).version).toBe("26.1.2");
    expect(allMinorReleases.at(-1)?.version).toBe("1.0");
  });

  test("only contains official release versions", () => {
    for (const release of allMinorReleases) {
      expect(release.version).not.toMatch(/snapshot|pre|rc|alpha|beta/i);
      expect(release.releasedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(release.summary.length).toBeGreaterThan(0);
      expect(release.changes.length).toBeGreaterThan(0);
    }
  });

  test("groups versions by the first two numeric segments", () => {
    expect(getMajorVersion("26.1.2")).toBe("26.1");
    expect(getMajorVersion("1.21.11")).toBe("1.21");
    expect(getMajorVersion("1.0")).toBe("1.0");
  });

  test("uses stable unique section ids for major releases", () => {
    const ids = releaseData.map((release) => createMajorReleaseId(release.version));

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("version-26-1");
    expect(ids.at(-1)).toBe("version-1-0");
  });

  test("keeps major releases and nested minor releases in newest-first order", () => {
    expect(isReleaseArchiveSorted(releaseData)).toBe(true);
  });

  test("builds TOC items from major releases only", () => {
    const tocItems = getTocItems(releaseData);

    expect(tocItems).toHaveLength(releaseData.length);
    expect(tocItems[0]).toEqual({
      id: "version-26-1",
      label: "26.1",
      name: releaseData[0].name,
    });
    expect(tocItems.map((item) => item.label)).not.toContain("26.1.2");
  });
});
