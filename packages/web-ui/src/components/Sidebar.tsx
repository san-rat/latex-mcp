import type { ResourceFile } from "@latex-mcp/shared";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FileNewIcon,
  FolderOpenIcon,
  MinusIcon,
  PlusIcon,
  SaveIcon,
} from "./icons.js";

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
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      >
        {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
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
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="file-name">{file.path}</span>
                    {isRoot && <span className="root-badge">main</span>}
                  </button>
                  <div className="file-actions">
                    {!isRoot && file.path.toLowerCase().endsWith(".tex") && (
                      <button
                        onClick={() => onSetRoot(file.path)}
                        title={`Set ${file.path} as root`}
                        aria-label={`Set ${file.path} as root file`}
                      >
                        root
                      </button>
                    )}
                    {!isRoot && (
                      <button
                        className="icon-button"
                        onClick={() => onDeleteFile(file.path)}
                        title={`Delete ${file.path}`}
                        aria-label={`Delete ${file.path}`}
                      >
                        <MinusIcon size={12} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <button className="add-file-button icon-button" onClick={onAddFile}>
            <PlusIcon />
            Add file
          </button>
          <div className="sidebar-divider" />
          <button className="icon-button" onClick={onNewFile}>
            <FileNewIcon />
            New File
          </button>
          <button className="icon-button" onClick={onOpenFile}>
            <FolderOpenIcon />
            Open File…
          </button>
          <button
            className="icon-button"
            onClick={onSave}
            title="Save active file (Ctrl/Cmd+S)"
          >
            <SaveIcon />
            Save
          </button>
          <button className="icon-button" onClick={onSaveAs}>
            <SaveIcon />
            Save As…
          </button>
        </div>
      )}
    </div>
  );
}
