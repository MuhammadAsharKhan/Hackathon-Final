import {
  Building2,
  CalendarDays,
  CalendarCheck,
  Clock,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  Receipt,
  ScrollText,
  UserRound,
  Users,
  UserCog,
  Wallet,
} from "lucide-react";
import { CHANGE_PASSWORD_PATH } from "@/lib/navigation";

export const ROLE_LABELS = {
  admin: "Admin",
  hr: "HR",
  employee: "Employee",
};

const ADMIN_MENU = [
  {
    id: "main",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
      { label: "Organization", to: "/admin/organization", icon: Building2 },
      { label: "Users", to: "/admin/users", icon: UserCog },
      { label: "Employees", to: "/employees", icon: Users },
      { label: "Attendance", to: "/attendance", icon: Clock },
      { label: "Leave", to: "/leave/requests", icon: CalendarDays },
      { label: "Payroll", to: "/payroll", icon: Wallet },
      { label: "Announcements", to: "/announcements", icon: Megaphone },
      { label: "Audit log", to: "/admin/audit", icon: ScrollText },
      { label: "AI keys", to: "/admin/ai", icon: KeyRound },
    ],
  },
];

const HR_MENU = [
  {
    id: "main",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
      { label: "Employees", to: "/employees", icon: Users },
      { label: "Attendance", to: "/attendance", icon: Clock },
      { label: "Leave requests", to: "/leave/requests", icon: CalendarDays },
      { label: "Payroll", to: "/payroll", icon: Wallet },
      { label: "Announcements", to: "/announcements", icon: Megaphone },
    ],
  },
  {
    id: "my-space",
    label: "My space",
    items: [
      { label: "My attendance", to: "/me/attendance", icon: CalendarCheck },
      { label: "My leave", to: "/me/leave", icon: CalendarDays },
      { label: "My payslips", to: "/me/payslips", icon: Receipt },
      { label: "My profile", to: "/me/profile", icon: UserRound },
    ],
  },
];

const EMPLOYEE_MENU = [
  {
    id: "main",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
      { label: "My attendance", to: "/me/attendance", icon: CalendarCheck },
      { label: "My leave", to: "/me/leave", icon: CalendarDays },
      { label: "My payslips", to: "/me/payslips", icon: Receipt },
      { label: "My profile", to: "/me/profile", icon: UserRound },
      { label: "Announcements", to: "/announcements", icon: Megaphone },
    ],
  },
];

export const MENUS = {
  admin: ADMIN_MENU,
  hr: HR_MENU,
  employee: EMPLOYEE_MENU,
};

export const menuGroupsFor = (role) => MENUS[role] || [];

const ALL_ITEMS = Object.values(MENUS).flatMap((groups) =>
  groups.flatMap((group) => group.items)
);

const PAGE_TITLES = {
  [CHANGE_PASSWORD_PATH]: "Change password",
  "/setup": "Company setup",
  "/login": "Sign in",
};

export const pageTitleFor = (pathname) => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  const match = ALL_ITEMS.find((item) => item.to === pathname);
  return match?.label || "HCM Lite";
};
