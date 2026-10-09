import { createHash } from "node:crypto";
/** Fixed SQS Number attribute checksum; never modifies the immutable event envelope. */
export function generationDigest(value: string): string {
  const parts: Buffer[] = [];
  for (const field of ["gradingGeneration", "Number"]) {
    const bytes = Buffer.from(field);
    const size = Buffer.alloc(4);
    size.writeUInt32BE(bytes.length);
    parts.push(size, bytes);
  }
  const bytes = Buffer.from(value);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(bytes.length);
  parts.push(Buffer.from([1]), size, bytes);
  return createHash("md5").update(Buffer.concat(parts)).digest("hex");
}
