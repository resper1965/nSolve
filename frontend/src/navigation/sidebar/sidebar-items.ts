import {
  Shield,
  AlertTriangle,
  FileSearch,
  CheckCircle,
  XCircle,
  Activity,
  Users,
  Settings,
  FileText,
  ExternalLink,
  Building2,
  type LucideIcon,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard/default",
        icon: Activity,
      },
      {
        title: "Vulnerabilities",
        url: "/dashboard/vulnerabilities",
        icon: Shield,
        subItems: [
          { title: "All Findings", url: "/dashboard/vulnerabilities/all" },
          { title: "Critical", url: "/dashboard/vulnerabilities/critical" },
          { title: "High Priority", url: "/dashboard/vulnerabilities/high" },
          { title: "In Progress", url: "/dashboard/vulnerabilities/in-progress" },
          { title: "Resolved", url: "/dashboard/vulnerabilities/resolved" },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "Management",
    items: [
      {
        title: "Risk Assessment",
        url: "/dashboard/risk",
        icon: AlertTriangle,
        comingSoon: true,
      },
      {
        title: "Compliance",
        url: "/dashboard/compliance",
        icon: CheckCircle,
        comingSoon: true,
      },
      {
        title: "Reports",
        url: "/dashboard/reports",
        icon: FileText,
        comingSoon: true,
      },
    ],
  },
  {
    id: 3,
    label: "Administration",
    items: [
      {
        title: "Organizations",
        url: "/dashboard/admin/organizations",
        icon: Building2,
      },
      {
        title: "Users",
        url: "/dashboard/admin/users",
        icon: Users,
      },
      {
        title: "Integrations",
        url: "/dashboard/integrations",
        icon: ExternalLink,
      },
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];
