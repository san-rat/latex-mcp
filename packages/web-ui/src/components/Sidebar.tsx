import type { ResourceFile } from "@latex-mcp/shared";

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  files: ResourceFile[];
  activePath: string;
  rootPath: string;
  dirty: boolean;
  onSelectFile: (path: string) => void;
  onAddFile: () => void;
  onDeleteFile: (path: string) => void;
  onSetRoot: (path: string) => void;
  onNewFile: () => void;
  onOpenFile: () => void;
  onSave: () => void;
  onSaveAs: () => void;
}

export function Sidebar({
  open,
  onToggle,
  files,
  activePath,
  rootPath,
  dirty,
  onSelectFile,
  onAddFile,
  onDeleteFile,
  onSetRoot,
  onNewFile,
  onOpenFile,
  onSave,
  onSaveAs,
}: SidebarProps) {
  return (
    <div className={open ? "sidebar sidebar-open" : "sidebar sidebar-collapsed"}>
      <button
        className="sidebar-toggle"
        onClick={onToggle}
        title={open ? "Collapse sidebar" : "Expand sidebar"}
      >
        {open ? "«" : "»"}
      </button>
      {open && (
        <div className="sidebar-content">
          <div className="sidebar-section-title">
            {dirty && (
              <span className="dirty-dot" aria-label="unsaved changes">
                ●
              </span>
            )}
            Files
          </div>
          <ul className="file-list">
            {files.map((file) => {
              const isActive = file.path === activePath;
              const isRoot = file.path === rootPath;
              return (
                <li key={file.path} className={isActive ? "file-item active" : "file-item"}>
                  <button
                    className="file-select"
                    onClick={() => onSelectFile(file.path)}
                    title={file.path}
                  >
                    <span className="file-name">{file.path}</span>
                    {isRoot && <span className="root-badge">main</span>}
                  </button>
                  <div className="file-actions">
                    {!isRoot && file.path.toLowerCase().endsWith(".tex") && (
                      <button onClick={() => onSetRoot(file.path)} title={`Set ${file.path} as root`}>
                        root
                      </button>
                    )}
                    {!isRoot && (
                      <button onClick={() => onDeleteFile(file.path)} title={`Delete ${file.path}`}>
                        ×
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <button className="add-file-button" onClick={onAddFile}>
            + Add file
          </button>
          <div className="sidebar-divider" />
          <button onClick={onNewFile}>New File</button>
          <button onClick={onOpenFile}>Open File…</button>
          <button onClick={onSave} title="Save active file (Ctrl/Cmd+S)">
            Save
          </button>
          <button onClick={onSaveAs}>Save As…</button>
        </div>
      )}
    </div>
  );
}
