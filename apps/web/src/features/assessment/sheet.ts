export function sheetLabel(input: {
  known: boolean;
  selectedCount: number;
  marked: boolean;
  dirty: boolean;
  current: boolean;
}): string {
  if (!input.known) return "Chưa tải đáp án";
  const parts: string[] = [];
  if (input.current) parts.push("Đang chọn");
  if (input.dirty) parts.push("Chưa lưu");
  if (input.marked) parts.push("Đánh dấu");
  parts.push(input.selectedCount > 0 ? "Đã trả lời" : "Chưa trả lời");
  return parts.join(", ");
}

export function passesSheetFilter(markedOnly: boolean, marked: boolean): boolean {
  return !markedOnly || marked;
}
