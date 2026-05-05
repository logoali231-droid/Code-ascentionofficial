import { render, screen } from '@testing-library/react';
import CodeEditor from './CodeEditor';

describe('CodeEditor', () => {
    test('renders without crashing', () => {
        render(<CodeEditor />);
        const editorElement = screen.getByTestId('code-editor');
        expect(editorElement).toBeInTheDocument();
    });

    test('displays the correct initial value', () => {
        const initialValue = 'console.log("Hello, World!");';
        render(<CodeEditor initialValue={initialValue} />);
        const editorElement = screen.getByTestId('code-editor');
        expect(editorElement.value).toBe(initialValue);
    });

    test('calls onChange handler when value changes', () => {
        const handleChange = jest.fn();
        render(<CodeEditor onChange={handleChange} />);
        const editorElement = screen.getByTestId('code-editor');
        editorElement.value = 'New value';
        editorElement.dispatchEvent(new Event('input'));
        expect(handleChange).toHaveBeenCalledWith('New value');
    });
});