import type { ImportEntry, ImportRequest, QuestionType, QuestionWriteRequest } from "./api/dto";
import { normalizeEmail } from "./format";

export interface FieldErrors {
  [field: string]: string;
}

export function validateRegister(input: {
  email: string;
  displayName: string;
  password: string;
  confirmPassword: string;
}): { errors: FieldErrors; body: { email: string; displayName: string; password: string } | null } {
  const errors: FieldErrors = {};
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+$/.test(email) || email.length > 254) errors.email = "Nhập email hợp lệ.";
  const displayName = input.displayName.trim();
  if (displayName.length < 1 || displayName.length > 80) errors.displayName = "Tên hiển thị từ 1 đến 80 ký tự.";
  if ([...input.password].length < 15 || [...input.password].length > 128) {
    errors.password = "Mật khẩu từ 15 đến 128 ký tự.";
  }
  if (input.password !== input.confirmPassword) errors.confirmPassword = "Mật khẩu nhập lại chưa khớp.";
  if (Object.keys(errors).length > 0) return { errors, body: null };
  return { errors, body: { email, displayName, password: input.password } };
}

export function validateLogin(input: { email: string; password: string }): {
  errors: FieldErrors;
  body: { email: string; password: string } | null;
} {
  const errors: FieldErrors = {};
  const email = normalizeEmail(input.email);
  if (!email || email.length > 254) errors.email = "Nhập email.";
  if (input.password.length < 1 || input.password.length > 128) errors.password = "Nhập mật khẩu.";
  if (Object.keys(errors).length > 0) return { errors, body: null };
  return { errors, body: { email, password: input.password } };
}

export function validateFinalPassword(password: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = {};
  if ([...password].length < 15 || [...password].length > 128) errors.password = "Mật khẩu từ 15 đến 128 ký tự.";
  if (password !== confirmPassword) errors.confirmPassword = "Mật khẩu nhập lại chưa khớp.";
  return errors;
}

export function questionIssues(input: QuestionWriteRequest): string[] {
  const issues: string[] = [];
  if (input.prompt.length < 1 || input.prompt.length > 8000) issues.push("Đề bài từ 1 đến 8000 ký tự.");
  if (input.options.length < 2 || input.options.length > 10) issues.push("Cần từ 2 đến 10 lựa chọn.");
  if (input.type === "TRUE_FALSE" && input.options.length !== 2) issues.push("Đúng/Sai cần đúng hai lựa chọn.");
  if (input.type === "SINGLE_CHOICE" && input.correctOptionPositions.length !== 1) {
    issues.push("Câu một lựa chọn cần đúng một đáp án.");
  }
  if (input.type === "MULTIPLE_CHOICE" && input.correctOptionPositions.length < 1) {
    issues.push("Câu nhiều lựa chọn cần ít nhất một đáp án đúng.");
  }
  if (input.options.some((option) => option.text.length < 1 || option.text.length > 2000)) {
    issues.push("Mỗi lựa chọn từ 1 đến 2000 ký tự.");
  }
  if (input.points < 1 || input.points > 1000) issues.push("Điểm từ 1 đến 1000.");
  return issues;
}

export function inspectImportText(text: string): {
  bytes: number;
  structural: string | null;
  request: ImportRequest | null;
  issues: { clientRef: string; field: string; message: string }[];
} {
  const bytes = new TextEncoder().encode(text).byteLength;
  if (bytes > 1_048_576) {
    return { bytes, structural: "Tệp vượt quá 1 MiB.", request: null, issues: [] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { bytes, structural: "JSON không hợp lệ.", request: null, issues: [] };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { bytes, structural: "JSON phải là một object.", request: null, issues: [] };
  }
  const record = parsed as Record<string, unknown>;
  if (record.schemaVersion !== 1 || !Array.isArray(record.questions)) {
    return { bytes, structural: "Cần schemaVersion 1 và mảng questions.", request: null, issues: [] };
  }
  const issues: { clientRef: string; field: string; message: string }[] = [];
  const questions: ImportEntry[] = [];
  const seen = new Set<string>();
  if (record.questions.length < 1 || record.questions.length > 100) {
    issues.push({ clientRef: "import", field: "questions", message: "Số câu phải từ 1 đến 100." });
  }
  for (const entry of record.questions) {
    if (!entry || typeof entry !== "object") {
      issues.push({ clientRef: "import", field: "questions", message: "Mỗi dòng phải là object." });
      continue;
    }
    const row = entry as Record<string, unknown>;
    const clientRef = typeof row.clientRef === "string" ? row.clientRef : "import";
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(clientRef)) {
      issues.push({ clientRef, field: "clientRef", message: "clientRef không hợp lệ." });
    }
    if (seen.has(clientRef)) issues.push({ clientRef, field: "clientRef", message: "clientRef bị trùng." });
    seen.add(clientRef);
    const type = row.type;
    if (type !== "SINGLE_CHOICE" && type !== "MULTIPLE_CHOICE" && type !== "TRUE_FALSE") {
      issues.push({ clientRef, field: "type", message: "Loại câu không hợp lệ." });
      continue;
    }
    const options = Array.isArray(row.options)
      ? row.options
          .filter((option): option is { position: number; text: string } => {
            return Boolean(option) && typeof option === "object";
          })
          .map((option) => ({ position: Number(option.position), text: String(option.text) }))
      : [];
    const correct = Array.isArray(row.correctOptionPositions)
      ? row.correctOptionPositions.filter((item): item is number => typeof item === "number")
      : [];
    const request: QuestionWriteRequest = {
      type: type as QuestionType,
      prompt: typeof row.prompt === "string" ? row.prompt : "",
      options,
      correctOptionPositions: correct,
      points: typeof row.points === "number" ? row.points : 0,
      explanation: typeof row.explanation === "string" ? row.explanation : row.explanation === null ? null : null,
      expectedRevision: 0,
    };
    for (const issue of questionIssues(request)) issues.push({ clientRef, field: "entry", message: issue });
    questions.push({
      clientRef,
      type,
      prompt: request.prompt,
      options,
      correctOptionPositions: correct,
      points: request.points,
      explanation: request.explanation,
    });
  }
  return {
    bytes,
    structural: null,
    request: { schemaVersion: 1, dryRun: true, questions },
    issues,
  };
}

export const IMPORT_TEMPLATE = `{
  "schemaVersion": 1,
  "dryRun": true,
  "questions": [
    {
      "clientRef": "q1",
      "type": "SINGLE_CHOICE",
      "prompt": "Choose A.",
      "options": [
        { "position": 1, "text": "A" },
        { "position": 2, "text": "B" }
      ],
      "correctOptionPositions": [1],
      "points": 1,
      "explanation": "A is correct."
    }
  ]
}`;
