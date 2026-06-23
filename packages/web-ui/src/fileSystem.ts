export interface OpenedFile {
  name: string;
  content: string;
  handle: FileSystemFileHandle | null;
}

export interface SavedFile {
  name: string;
  handle: FileSystemFileHandle | null;
}

const TEX_TYPES: FilePickerAcceptType[] = [
  {
    description: "LaTeX source files",
    accept: { "text/x-tex": [".tex"] },
  },
];

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/** Opens a .tex file the user picks. Returns null if they cancel the dialog. */
export async function openTexFile(): Promise<OpenedFile | null> {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({ types: TEX_TYPES, multiple: false });
      const file = await handle.getFile();
      return { name: file.name, content: await file.text(), handle };
    } catch (err) {
      if (isAbort(err)) return null;
      throw err;
    }
  }

  // Fallback for browsers without File System Access API (Firefox, Safari):
  // a plain file input restricted to .tex, with no writable handle, so Save
  // will fall back to Save As for these browsers.
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".tex";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      if (!file.name.toLowerCase().endsWith(".tex")) {
        reject(new Error("Only .tex files are supported"));
        return;
      }
      file
        .text()
        .then((content) => resolve({ name: file.name, content, handle: null }))
        .catch(reject);
    };
    input.click();
  });
}

export async function saveToHandle(handle: FileSystemFileHandle, content: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

/** Prompts for a save location. Returns null if the user cancels the dialog. */
export async function saveAsTexFile(content: string, suggestedName: string): Promise<SavedFile | null> {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({ suggestedName, types: TEX_TYPES });
      await saveToHandle(handle, content);
      return { name: handle.name, handle };
    } catch (err) {
      if (isAbort(err)) return null;
      throw err;
    }
  }

  // Fallback: trigger a browser download. This can't truly overwrite a file
  // on disk, so there's no handle to hand back for subsequent plain Saves.
  const blob = new Blob([content], { type: "text/x-tex" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedName;
  link.click();
  URL.revokeObjectURL(url);
  return { name: suggestedName, handle: null };
}
