interface IconProps {
  size?: number;
}

function IconFrame({ size = 16, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="m6 3 14 9-14 9z" />
    </IconFrame>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </IconFrame>
  );
}

export function FileNewIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M12 12v6M9 15h6" />
    </IconFrame>
  );
}

export function FolderOpenIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="m3 18 3-7h15" />
    </IconFrame>
  );
}

export function SaveIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M5 3h12l4 4v14H3V3z" />
      <path d="M7 3v6h10V3M7 21v-8h10v8" />
    </IconFrame>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M12 5v14M5 12h14" />
    </IconFrame>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M5 12h14" />
    </IconFrame>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="m15 18-6-6 6-6" />
    </IconFrame>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="m9 18 6-6-6-6" />
    </IconFrame>
  );
}

export function SyncIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M20 7h-5V2" />
      <path d="M4 17h5v5" />
      <path d="M5.5 9A7 7 0 0 1 17 5l3 2M18.5 15A7 7 0 0 1 7 19l-3-2" />
    </IconFrame>
  );
}
