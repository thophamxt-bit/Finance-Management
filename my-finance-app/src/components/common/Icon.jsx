import React from "react";

const paths = {
  arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="3" /><path d="M3 10h18M7 15h3" /></>,
  chart: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  expense: <><path d="M12 3v13M7 11l5 5 5-5" /><path d="M5 21h14" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
  income: <><path d="M12 21V8M7 13l5-5 5 5" /><path d="M5 3h14" /></>,
  logo: <><path d="M4 6.5h14a3 3 0 0 1 3 3V18a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h12" /><path d="M16 11h5v5h-5a2.5 2.5 0 0 1 0-5Z" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  saving: <><path d="M5 9a7 7 0 0 1 14 0v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9Z" /><path d="M9 9h6M12 6v6" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 15 6l-.3-2.6h-4L10.4 6a7 7 0 0 0-1.6 1L6.4 6 4.5 9.5l2 1.5a7 7 0 0 0 0 2l-2 1.5L6.4 18l2.4-1a7 7 0 0 0 1.6 1l.3 2.6h4L15 18a8 8 0 0 0 1.6-1l2.4 1 2-3.5-2-1.5a7 7 0 0 0 .1-1Z" /></>,
  sparkle: <><path d="m12 3 1.2 4.2L17 9l-3.8 1.8L12 15l-1.2-4.2L7 9l3.8-1.8L12 3Z" /><path d="m19 15 .6 2.1 1.9.9-1.9.9L19 21l-.6-2.1-1.9-.9 1.9-.9L19 15Z" /></>,
  wallet: <><path d="M4 6.5h14a3 3 0 0 1 3 3V18a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h12" /><path d="M16 11h5v5h-5a2.5 2.5 0 0 1 0-5Z" /></>,
  play: <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />,
  target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  check: <polyline points="20 6 9 17 4 12" />
};

export function Icon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
