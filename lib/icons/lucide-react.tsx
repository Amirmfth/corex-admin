import React, { forwardRef } from 'react';
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function createIcon(children: React.ReactNode) {
  return forwardRef<SVGSVGElement, IconProps>(function LucideIcon(props, ref) {
    return (
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={props['aria-hidden'] ?? true}
        {...props}
      >
        {children}
      </svg>
    );
  });
}

export const Sparkles = createIcon(
  <>
    <path d="M6 3.5 7 6l2.5 1-2.5 1L6 11l-.9-3 .4-1-.4-1 .9-2.5Z" />
    <path d="m17 4 1 2.5 2.5 1L18 9l-1 2.5L16 9l-2.5-1L16 6.5 17 4Z" />
    <path d="m11 12 1.5 3.5L16 17l-3.5 1.5L11 22l-1.5-3.5L6 17l3.5-1.5L11 12Z" />
  </>,
);

export const Loader2 = createIcon(
  <>
    <path d="M12 3a9 9 0 1 0 9 9" />
    <path d="M12 1v4" />
  </>,
);

export const Search = createIcon(
  <>
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-3.5-3.5" />
  </>,
);

export const ShoppingCart = createIcon(
  <>
    <path d="M3 3h2l1 4h11l1.5-3" />
    <path d="M6 7l1.5 9h9L18 7" />
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="16" cy="20" r="1.5" />
  </>,
);

export const ImageOff = createIcon(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 3 21 21" />
    <path d="M10 9a1.5 1.5 0 1 1 2.84.84" />
    <path d="M9 15l-3 4" />
    <path d="m21 15-4-5-4 4-3-3-7 9" />
  </>,
);

export const BadgeCheck = createIcon(
  <>
    <path d="m9 12 2 2 4-4" />
    <path d="M12 2a3 3 0 0 1 2.12.88L15.6 4.4a3 3 0 0 0 1.52.81l2.16.43a3 3 0 0 1 2.4 2.4l.43 2.16a3 3 0 0 0 .81 1.52l1.52 1.52a3 3 0 0 1 0 4.24l-1.52 1.52a3 3 0 0 0-.81 1.52l-.43 2.16a3 3 0 0 1-2.4 2.4l-2.16.43a3 3 0 0 0-1.52.81l-1.52 1.52a3 3 0 0 1-4.24 0L8.4 22.4a3 3 0 0 0-1.52-.81l-2.16-.43a3 3 0 0 1-2.4-2.4l-.43-2.16a3 3 0 0 0-.81-1.52L.56 14.8a3 3 0 0 1 0-4.24L2.08 9a3 3 0 0 0 .81-1.52l.43-2.16a3 3 0 0 1 2.4-2.4l2.16-.43a3 3 0 0 0 1.52-.81L9.88 2.88A3 3 0 0 1 12 2Z" />
  </>,
);

export const BarChart3 = createIcon(
  <>
    <path d="M3 3v18" />
    <rect x="7" y="6" width="3.5" height="12" rx="1" />
    <rect x="12.5" y="10" width="3.5" height="8" rx="1" />
    <rect x="18" y="4" width="3.5" height="14" rx="1" />
  </>,
);

export const Boxes = createIcon(
  <>
    <path d="M3 7h10v10H3z" />
    <path d="M13 7h8v5h-8z" />
    <path d="M13 12h8v5h-8z" />
  </>,
);

export const ClipboardList = createIcon(
  <>
    <path d="M8 4h8" />
    <path d="M9 2h6a2 2 0 0 1 2 2v14H7V4a2 2 0 0 1 2-2Z" />
    <path d="M10 10h4" />
    <path d="M10 14h4" />
  </>,
);

export const LayoutDashboard = createIcon(
  <>
    <rect x="3" y="3" width="9" height="7" rx="1" />
    <rect x="3" y="12" width="9" height="9" rx="1" />
    <rect x="13" y="3" width="8" height="9" rx="1" />
    <rect x="13" y="13" width="8" height="8" rx="1" />
  </>,
);

export const PackagePlus = createIcon(
  <>
    <path d="M21 9v10a2 2 0 0 1-1.06 1.76l-7 3.5a2 2 0 0 1-1.88 0l-7-3.5A2 2 0 0 1 3 19V9" />
    <path d="m12 22-.01-11" />
    <path d="M19.5 7 12 10 4.5 7" />
    <path d="M12 10V2" />
    <path d="M16 5h6" />
    <path d="M19 2v6" />
  </>,
);

export const Receipt = createIcon(
  <>
    <path d="M5 2h14v20l-3-2-3 2-3-2-3 2Z" />
    <path d="M9 8h6" />
    <path d="M9 12h6" />
    <path d="M9 16h4" />
  </>,
);

export const Settings2 = createIcon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M3 12h2" />
    <path d="M19 12h2" />
    <path d="M12 3v2" />
    <path d="M12 19v2" />
    <path d="m4.2 4.2 1.4 1.4" />
    <path d="m18.4 18.4 1.4 1.4" />
    <path d="m19.8 4.2-1.4 1.4" />
    <path d="m5.6 18.4-1.4 1.4" />
  </>,
);

export const ArrowRight = createIcon(
  <>
    <path d="M5 12h14" />
    <path d="m13 5 7 7-7 7" />
  </>,
);

export const Check = createIcon(
  <>
    <path d="M20 6 9 17l-5-5" />
  </>,
);

export const ChevronDown = createIcon(
  <>
    <path d="m6 9 6 6 6-6" />
  </>,
);

export const PackageSearch = createIcon(
  <>
    <path d="M21 7.5v6.75a2 2 0 0 1-1.11 1.79l-6.78 3.39a2 2 0 0 1-1.79 0L4.54 16A2 2 0 0 1 3.43 14.2L3 7.5" />
    <path d="M21 7.5 12 12 3 7.5" />
    <path d="m12 12 0 8" />
    <circle cx="9" cy="9" r="2.5" />
    <path d="m11 11 2.2 2.2" />
  </>,
);

export type LucideIcon = ReturnType<typeof createIcon>;
export type LucideProps = IconProps;

const lucideIcons = {
  Sparkles,
  Loader2,
  Search,
  ShoppingCart,
  ImageOff,
  BadgeCheck,
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  PackagePlus,
  Receipt,
  Settings2,
  ArrowRight,
  PackageSearch,
};

export default lucideIcons;
