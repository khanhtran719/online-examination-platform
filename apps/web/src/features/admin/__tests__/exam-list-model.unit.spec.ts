import { describe, expect, it } from "vitest";

import type { AdminExam } from "@web/shared/api/dto";

import { examPublication, filterLoadedExams } from "../exam-list-model";

const rows = [
  {
    id: "one",
    title: "IELTS Reading",
    category: "IELTS",
    archived: false,
    published: true,
    publishedVersionId: "v1",
  },
  {
    id: "two",
    title: "Cloud fundamentals",
    category: "IT_CERTIFICATION",
    archived: false,
    published: false,
    publishedVersionId: "older",
  },
  {
    id: "three",
    title: "IELTS archived",
    category: "IELTS",
    archived: true,
    published: true,
    publishedVersionId: "old",
  },
] as AdminExam[];

describe("loaded exam filters", () => {
  it("combines filters without changing cursor/source order or mutating rows", () => {
    expect(
      filterLoadedExams(rows, { search: "  iElTs ", status: "all", category: "IELTS" }).map(
        (row) => row.id,
      ),
    ).toEqual(["one", "three"]);
    expect(
      filterLoadedExams(rows, { search: "cloud", status: "draft", category: "all" }).map(
        (row) => row.id,
      ),
    ).toEqual(["two"]);
    expect(rows.map((row) => row.id)).toEqual(["one", "two", "three"]);
    expect(filterLoadedExams([], { search: "", status: "all", category: "all" })).toEqual([]);
  });

  it("gives archive priority and retains previous publication provenance for an unpublished draft", () => {
    expect(examPublication(rows[2]!)).toBe("archived");
    expect(examPublication(rows[1]!)).toBe("draft");
    expect(
      filterLoadedExams(rows, { search: "", status: "published", category: "all" }).map(
        (row) => row.id,
      ),
    ).toEqual(["one"]);
  });
});
