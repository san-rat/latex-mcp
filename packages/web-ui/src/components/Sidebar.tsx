interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  fileName: string;
  dirty: boolean;
  onNewFile: () => void;
  onOpenFile: () => void;
  onSave: () => void;
  onSaveAs: () => void;
}

export function Sidebar({
  open,
  onToggle,
  fileName,
  dirty,
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
          <div className="sidebar-filename" title={fileName}>
            {dirty && (
              <span className="dirty-dot" aria-label="unsaved changes">
                ●
              </span>
            )}
            {fileName}
          </div>
          <button onClick={onNewFile}>New File</button>
          <button onClick={onOpenFile}>Open File…</button>
          <button onClick={onSave} title="Save (Ctrl/Cmd+S)">
            Save
          </button>
          <button onClick={onSaveAs}>Save As…</button>
        </div>
      )}
    </div>
  );
}
