import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { Dialog } from "../ui/ui";

afterEach(cleanup);
it("keeps focus in an edited dialog when the parent rerenders with a new close callback", async () => {
  const close = vi.fn();
  const view = render(
    <Dialog title="Sửa" onClose={() => close()}>
      <button>Hủy</button>
      <input aria-label="Tên" />
    </Dialog>,
  );
  const input = screen.getByLabelText("Tên");
  await userEvent.click(input);
  view.rerender(
    <Dialog title="Sửa" onClose={() => close()}>
      <button>Hủy</button>
      <input aria-label="Tên" />
    </Dialog>,
  );
  expect(document.activeElement).toBe(input);
});
it("contains keyboard focus when all actions are disabled during a write", () => {
  render(
    <>
      <button>Nền</button>
      <Dialog title="Đang gửi">
        <button disabled>Đợi</button>
      </Dialog>
    </>,
  );
  const dialog = screen.getByRole("dialog");
  expect(document.activeElement).toBe(dialog);
  const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
  document.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(dialog);
});
it("restores the trigger on Escape and prevents background focus entering the modal", () => {
  const close = vi.fn();
  const trigger = document.createElement("button");
  document.body.append(trigger);
  trigger.focus();
  const view = render(
    <Dialog title="Xác nhận" onClose={close}>
      <button>Giữ</button>
    </Dialog>,
  );
  trigger.focus();
  expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(close).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});
it("lets only the upper dialog contain focus and handle Escape when an async warning overlays a sheet", () => {
  const closeSheet = vi.fn();
  const closeWarning = vi.fn();
  const sheet = (
    <Dialog title="Phiếu câu hỏi" onClose={closeSheet}>
      <button>Câu 1</button>
    </Dialog>
  );
  const view = render(<>{sheet}</>);
  const question = screen.getByRole("button", { name: "Câu 1" });
  view.rerender(
    <>
      {sheet}
      <Dialog title="Xung đột đáp án" onClose={closeWarning}>
        <button>Dùng bản máy chủ</button>
      </Dialog>
    </>,
  );
  const server = screen.getByRole("button", { name: "Dùng bản máy chủ" });
  expect(document.activeElement).toBe(server);
  question.focus();
  expect(document.activeElement).toBe(server);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(closeWarning).toHaveBeenCalledTimes(1);
  expect(closeSheet).not.toHaveBeenCalled();
  view.rerender(<>{sheet}</>);
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Câu 1" }));
});
