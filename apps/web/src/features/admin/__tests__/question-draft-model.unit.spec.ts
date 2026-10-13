import { expect, it } from "vitest";

import {
  fieldsOfQuestion,
  moveQuestionOption,
  questionBody,
  removeQuestionOption,
} from "../question-draft-model";

it("moves/removes options while their answer identity follows the same content", () => {
  const fields = fieldsOfQuestion(null);
  fields.options = [
    { id: "a", text: "A" },
    { id: "b", text: "B" },
    { id: "c", text: "C" },
  ];
  fields.correctIds = ["b"];
  const moved = moveQuestionOption(fields, "b", -1);
  expect(questionBody(moved, 4).correctOptionPositions).toEqual([1]);
  expect(questionBody(moved, 4).options.map((o) => o.text)).toEqual(["B", "A", "C"]);
  const removed = removeQuestionOption(moved, "a");
  expect(questionBody(removed, 4).correctOptionPositions).toEqual([1]);
  expect(removed.options.map((o) => o.id)).toEqual(["b", "c"]);
});
it("removing a keyed option requires explicit key selection instead of silently marking another correct", () => {
  const fields = fieldsOfQuestion(null);
  fields.options.push({ id: "c", text: "C" });
  expect(
    questionBody(removeQuestionOption(fields, fields.options[0]!.id), 1).correctOptionPositions,
  ).toEqual([]);
});
