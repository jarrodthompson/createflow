import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Wand2,
  FileText,
  FilePen,
  UploadCloud,
  Package,
  Layers,
  LibraryBig,
  ListChecks,
  CalendarClock,
  BarChart3,
  DollarSign,
  Megaphone,
  Star,
  Images,
  Settings,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };
export type NavGroup = { heading: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    heading: "Create",
    items: [{ label: "Studio", href: "/studio", icon: Wand2 }],
  },
  {
    heading: "Listings",
    items: [
      { label: "Listings", href: "/listings", icon: FileText },
      { label: "Drafts", href: "/drafts", icon: FilePen },
      { label: "Publishing", href: "/publishing", icon: UploadCloud },
    ],
  },
  {
    heading: "Product Management",
    items: [
      { label: "Products", href: "/products", icon: Package },
      { label: "Collections", href: "/collections", icon: Layers },
      { label: "Product Library", href: "/library", icon: LibraryBig },
    ],
  },
  {
    heading: "Automation",
    items: [
      { label: "Generation Queue", href: "/queue", icon: ListChecks },
      { label: "Scheduled Jobs", href: "/scheduled", icon: CalendarClock },
    ],
  },
  {
    heading: "Business",
    items: [
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Unit Economics", href: "/unit-economics", icon: DollarSign },
      { label: "Marketing", href: "/marketing", icon: Megaphone },
      { label: "Reviews", href: "/reviews", icon: Star },
    ],
  },
  {
    heading: "Assets",
    items: [{ label: "Photo Library", href: "/photos", icon: Images }],
  },
  {
    heading: "Settings",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];
