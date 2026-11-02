const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};
const make = (paths) =>
  function Icon({ size = 20, className = "" }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
        {paths}
      </svg>
    );
  };

export const CalendarIcon = make(
  <>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </>,
);
export const SearchIcon = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
);
export const MailIcon = make(
  <>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m3 8 9 6 9-6" />
  </>,
);
export const ChevronIcon = make(<path d="m6 9 6 6 6-6" />);
export const ChevronLeftIcon = make(<path d="m15 6-6 6 6 6" />);
export const ChevronRightIcon = make(<path d="m9 6 6 6-6 6" />);
export const CheckIcon = make(<path d="m5 12 5 5 9-10" />);
export const CopyIcon = make(
  <>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" />
  </>,
);
export const UserIcon = make(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
  </>,
);
export const AlertIcon = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16.5v.01" />
  </>,
);
export const PlusIcon = make(<path d="M12 5v14M5 12h14" />);
export const PencilIcon = make(
  <>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </>,
);
export const TrashIcon = make(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />);
export const LockIcon = make(
  <>
    <rect x="5" y="11" width="14" height="10" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>,
);
export const ClockIcon = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
);
export const HashIcon = make(<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16" />);
