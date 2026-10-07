import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CandidateQuestion } from "../../../shared/api/dto";
import { QuestionView } from "../question-view";

const question: CandidateQuestion = {
  id: "00000000-0000-4000-8000-000000000010",
  sectionId: "00000000-0000-4000-8000-000000000301",
  position: 3,
  type: "MULTIPLE_CHOICE",
  prompt: "Select every private address block.\n<script>alert(1)</script>",
  points: 2,
  options: [
    { id: "00000000-0000-4000-8000-0000000000a1", position: 1, text: "10.0.0.0/8" },
    {
      id: "00000000-0000-4000-8000-0000000000a2",
      position: 2,
      text: "<img src=x onerror=alert(1)>",
    },
  ],
};

afterEach(() => {
  cleanup();
});

describe("QuestionView", () => {
  it("renders prompt and options as text", () => {
    const { container } = render(
      <QuestionView
        question={question}
        selected={[]}
        marked={false}
        disabled={false}
        onSelected={vi.fn()}
        onMarked={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeTruthy();
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("clears through the same callback and does not say the answer is saved", async () => {
    const onClear = vi.fn();
    render(
      <QuestionView
        question={{ ...question, type: "SINGLE_CHOICE" }}
        selected={[question.options[0]?.id ?? ""]}
        marked={false}
        disabled={false}
        onSelected={vi.fn()}
        onMarked={vi.fn()}
        onClear={onClear}
      />,
    );
    expect(screen.queryByText(/Đã lưu/)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Xóa đáp án" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
