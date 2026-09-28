"use client";

import type { SVGProps, ReactNode } from "react";

export type ResearchIcon = (props: SVGProps<SVGSVGElement> & { size?: number | string }) => ReactNode;

type Props = SVGProps<SVGSVGElement> & { size?: number | string };

function Svg({ size = 20, children, ...props }: Props & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export const Home = (p: Props) => <Svg {...p}><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5M9 20v-6h6v6"/></Svg>;
export const Newspaper = (p: Props) => <Svg {...p}><path d="M5 4h12v16H5z"/><path d="M17 8h2v10a2 2 0 0 1-2 2M8 8h6M8 12h6M8 16h4"/></Svg>;
export const Inbox = (p: Props) => <Svg {...p}><path d="M4 5h16l2 9v5H2v-5z"/><path d="M2.5 14h5l1.5 2h6l1.5-2h5"/></Svg>;
export const Send = (p: Props) => <Svg {...p}><path d="m3 11 18-8-7 18-3-7z"/><path d="m11 14 5-5"/></Svg>;
export const FileText = (p: Props) => <Svg {...p}><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></Svg>;
export const Trash2 = (p: Props) => <Svg {...p}><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></Svg>;
export const Delete = Trash2;
export const Menu = (p: Props) => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16"/></Svg>;
export const User = (p: Props) => <Svg {...p}><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></Svg>;
export const User2Icon = User;
export const UserCheck = (p: Props) => <Svg {...p}><circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M15 13l2 2 4-5"/></Svg>;
export const Users = (p: Props) => <Svg {...p}><circle cx="9" cy="8" r="3"/><path d="M3 19a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 5M17 14a4 4 0 0 1 4 4"/></Svg>;
export const Download = (p: Props) => <Svg {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></Svg>;
export const List = (p: Props) => <Svg {...p}><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></Svg>;
export const ListChecks = (p: Props) => <Svg {...p}><path d="m3 6 2 2 3-4M10 6h10M3 13l2 2 3-4M10 13h10M3 20l2 2 3-4M10 20h10"/></Svg>;
export const ViewIcon = (p: Props) => <Svg {...p}><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></Svg>;
export const Plus = (p: Props) => <Svg {...p}><path d="M12 5v14M5 12h14"/></Svg>;
export const PlusCircle = (p: Props) => <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></Svg>;
export const Check = (p: Props) => <Svg {...p}><path d="m5 12 4 4 10-10"/></Svg>;
export const CheckCircle = (p: Props) => <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></Svg>;
export const X = (p: Props) => <Svg {...p}><path d="m6 6 12 12M18 6 6 18"/></Svg>;
export const XCircle = (p: Props) => <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></Svg>;
export const AlertTriangle = (p: Props) => <Svg {...p}><path d="M12 3 2.5 20h19z"/><path d="M12 9v4M12 17h.01"/></Svg>;
export const CircleAlert = (p: Props) => <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></Svg>;
export const ArrowBigLeft = (p: Props) => <Svg {...p}><path d="M20 12H7M12 6l-6 6 6 6"/></Svg>;
export const CardSimIcon = (p: Props) => <Svg {...p}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v5h8V3M8 13h8M8 17h5"/></Svg>;
export const Pencil = (p: Props) => <Svg {...p}><path d="m4 20 4-1 11-11-3-3L5 16zM14 6l3 3"/></Svg>;
export const Code2Icon = (p: Props) => <Svg {...p}><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/></Svg>;
export const Globe = (p: Props) => <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></Svg>;
export const Search = (p: Props) => <Svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></Svg>;
export const Camera = (p: Props) => <Svg {...p}><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></Svg>;
export const ChevronDown = (p: Props) => <Svg {...p}><path d="m6 9 6 6 6-6"/></Svg>;
export const ChevronUp = (p: Props) => <Svg {...p}><path d="m6 15 6-6 6 6"/></Svg>;
export const ChevronLeft = (p: Props) => <Svg {...p}><path d="m15 6-6 6 6 6"/></Svg>;
export const Folder = (p: Props) => <Svg {...p}><path d="M3 6h7l2 2h9v11H3z"/></Svg>;
export const FolderOpen = (p: Props) => <Svg {...p}><path d="M3 7h7l2 2h9l-2 10H4z"/><path d="M3 7v12"/></Svg>;
export const FolderKey = (p: Props) => <Svg {...p}><path d="M3 6h7l2 2h9v11H3z"/><circle cx="14.5" cy="13" r="1.7"/><path d="M16.2 13H19l1 1"/></Svg>;
export const RefreshCcw = (p: Props) => <Svg {...p}><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M18 9a7 7 0 0 0-12-2L4 11M6 15a7 7 0 0 0 12 2l2-4"/></Svg>;
export const RotateCcw = RefreshCcw;
export const DownloadCloud = (p: Props) => <Svg {...p}><path d="M7 18H5a3 3 0 0 1-.4-6A5 5 0 0 1 14 9a4 4 0 0 1 2 7.5"/><path d="M12 12v9M8.5 17.5 12 21l3.5-3.5"/></Svg>;
export const FilterIcon = (p: Props) => <Svg {...p}><path d="M4 5h16l-6 7v6l-4 2v-8z"/></Svg>;
export const FilterXIcon = (p: Props) => <Svg {...p}><path d="M4 5h16l-6 7v3"/><path d="m16 17 4 4M20 17l-4 4"/></Svg>;
export const ShieldCheck = (p: Props) => <Svg {...p}><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/></Svg>;
export const UserCheck2 = UserCheck;
export const UserCheck2Icon = UserCheck;
export const User2 = User;
export const Maximize2 = (p: Props) => <Svg {...p}><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></Svg>;
export const Minus = (p: Props) => <Svg {...p}><path d="M5 12h14"/></Svg>;
export const Loader2 = (p: Props) => <Svg {...p}><path d="M21 12a9 9 0 1 1-3-6.7"/></Svg>;
export const PanelLeftClose = (p: Props) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 9l-3 3 3 3"/></Svg>;
export const HomeIcon = Home;
export const Copy = (p: Props) => <Svg {...p}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/></Svg>;
