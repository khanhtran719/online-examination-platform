export function progressCopy(input: {
  loaded: number;
  answered: number;
  versionTotal: number | null;
}): string {
  const loadedLine = `Đã trả lời ${input.answered} trên ${input.loaded} câu đã tải.`;
  if (input.versionTotal === null) {
    return `${loadedLine} Chưa có tổng số câu của đúng phiên bản.`;
  }
  return `${loadedLine} Phiên bản này có ${input.versionTotal} câu; câu chưa tải không tính là bỏ trống.`;
}
