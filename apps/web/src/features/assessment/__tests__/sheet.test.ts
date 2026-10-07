import { describe, expect, it } from "vitest";
import { passesSheetFilter, sheetLabel } from "../sheet";

describe("answer sheet", () => {
  it("does not call an unloaded answer answered", () => {
    expect(
      sheetLabel({ known: false, selectedCount: 0, marked: false, dirty: false, current: false }),
    ).toBe("Chưa tải đáp án");
  });

  it("keeps pending, marked, and answered as separate facts", () => {
    expect(
      sheetLabel({ known: true, selectedCount: 2, marked: true, dirty: true, current: true }),
    ).toBe("Đang chọn, Chưa lưu, Đánh dấu, Đã trả lời");
  });

  it("filters marked questions without treating the filter as a submission", () => {
    expect(passesSheetFilter(true, false)).toBe(false);
    expect(passesSheetFilter(true, true)).toBe(true);
    expect(passesSheetFilter(false, false)).toBe(true);
  });
});
