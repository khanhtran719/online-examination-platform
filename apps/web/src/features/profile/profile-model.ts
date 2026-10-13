import type { Profile } from "@web/shared/api/dto";

export function displayNameError(value: string): string | null {
  const name = value.trim();
  if ([...name].length < 1 || [...name].length > 80) return "Tên hiển thị từ 1 đến 80 ký tự.";
  if (/\p{Cc}/u.test(name)) return "Tên hiển thị không được chứa ký tự điều khiển.";
  return null;
}

export function profileChanged(base: Profile | null, name: string, optIn: boolean): boolean {
  return !!base && (name.trim() !== base.displayName || optIn !== base.leaderboardOptIn);
}
