// @ts-nocheck
// NOTE: This test file requires devDependencies (vitest, @testing-library/react).
// Install them to enable full type checking and run tests locally.
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import CodeEditor from "./CodeEditor";

describe("CodeEditor", () => {
  test("renders without crashing", () => {
    render(<CodeEditor />);
    const editorElement = screen.getByTestId("code-editor");
    expect(editorElement).toBeInTheDocument();
  });

  test("displays the correct initial value", () => {
    const initialValue = 'console.log("Hello, World!");';
    render(<CodeEditor initialValue={initialValue} />);
    const editorElement = screen.getByTestId(
      "code-editor",
    ) as HTMLTextAreaElement;
    expect(editorElement.value).toBe(initialValue);
  });

  test("calls onChange handler when value changes", () => {
    const handleChange = vi.fn();
    render(<CodeEditor onChange={handleChange} />);
    const editorElement = screen.getByTestId(
      "code-editor",
    ) as HTMLTextAreaElement;
    fireEvent.input(editorElement, { target: { value: "New value" } });
    expect(handleChange).toHaveBeenCalledWith("New value");
  });
});
