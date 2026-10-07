const ZONES = ["Asia/Ho_Chi_Minh", "Asia/Bangkok", "Asia/Tokyo", "UTC", "America/New_York", "Europe/London"];

export function timezoneChoices(current: string): string[] {
  return current && !ZONES.includes(current) ? [current, ...ZONES] : ZONES;
}

function zoneParts(instant: Date, timeZone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  return map;
}

export function utcToZonedInput(iso: string, timeZone: string): string {
  const map = zoneParts(new Date(iso), timeZone);
  const hour = map.hour === "24" ? "00" : map.hour;
  return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}`;
}

export function zonedInputToUtc(local: string, timeZone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(local);
  if (!match) throw new Error("Invalid local time");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? "0");
  const desired = Date.UTC(year, month - 1, day, hour, minute, second);
  let instant = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const map = zoneParts(new Date(instant), timeZone);
    const seen = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour === "24" ? "0" : map.hour),
      Number(map.minute),
      Number(map.second),
    );
    instant += desired - seen;
  }
  return new Date(instant).toISOString();
}
