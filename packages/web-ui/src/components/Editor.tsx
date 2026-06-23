import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import CodeMirror from "@uiw/react-codemirror";

const latexLanguage = StreamLanguage.define(stex);

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  editable: boolean;
}

export function Editor({ value, onChange, editable }: EditorProps) {
  return (
    <CodeMirror
      value={value}
      height="100%"
      editable={editable}
      extensions={[latexLanguage]}
      onChange={onChange}
      basicSetup={{ lineNumbers: true, foldGutter: false }}
      style={{ height: "100%", fontSize: 13 }}
    />
  );
}
