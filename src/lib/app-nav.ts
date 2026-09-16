import type { ElementType } from "react";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  Globe2,
  ImageIcon,
  Kanban,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Shield,
  Palette,
  Search,
  Settings,
  UserRound,
  Users,
  WandSparkles,
  Workflow,
} from "lucide-react";

export type ShellVariant = "customer" | "admin";

export type NavItem = {
  label: string;
  href: string;
  icon: ElementType;
};

export const customerNavigation: NavItem[] = [
  { label: "Dashboard", href: "/klant", icon: LayoutDashboard },
  { label: "Onboarding", href: "/klant/onboarding", icon: ClipboardCheck },
  { label: "Mijn website", href: "/klant/website", icon: Globe2 },
  { label: "Pagina's", href: "/klant/paginas", icon: FileText },
  { label: "Media", href: "/klant/media", icon: ImageIcon },
  { label: "Mijn merk", href: "/klant/merk", icon: Palette },
  { label: "Wijzigingen", href: "/klant/wijzigingen", icon: WandSparkles },
  { label: "Goedkeuringen", href: "/klant/goedkeuringen", icon: Activity },
  { label: "Support", href: "/klant/support", icon: LifeBuoy },
  { label: "Facturen", href: "/klant/facturen", icon: CreditCard },
  { label: "Instellingen", href: "/klant/instellingen", icon: Settings },
];

export const adminNavigation: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Taken", href: "/admin/taken", icon: Kanban },
  { label: "Acquisitie", href: "/admin/acquisitie", icon: Search },
  { label: "Leads", href: "/admin/leads", icon: Users },
  { label: "Voorstellen", href: "/admin/voorstellen", icon: FileText },
  { label: "Klanten", href: "/admin/klanten", icon: Building2 },
  { label: "Opdrachten", href: "/admin/opdrachten", icon: ClipboardList },
  { label: "Onboarding", href: "/admin/onboarding", icon: ClipboardCheck },
  { label: "Gebruikers", href: "/admin/gebruikers", icon: UserRound },
  { label: "Productie", href: "/admin/productie", icon: BriefcaseBusiness },
  { label: "Websites", href: "/admin/websites", icon: Globe2 },
  { label: "Beheer", href: "/admin/beheer", icon: Shield },
  { label: "Support", href: "/admin/support", icon: LifeBuoy },
  { label: "Merk", href: "/admin/merk", icon: Palette },
  { label: "Mails", href: "/admin/mails", icon: Mail },
  { label: "Automations", href: "/admin/automations", icon: Workflow },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Instellingen", href: "/admin/instellingen", icon: Settings },
];

export function navigationFor(variant: ShellVariant) {
  return variant === "admin" ? adminNavigation : customerNavigation;
}

export function isNavActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/admin" || href === "/klant") return false;
  if (href === "/admin/onboarding" && pathname.startsWith("/admin/opdrachten/") && pathname.includes("/onboarding")) {
    return true;
  }
  if (href === "/admin/opdrachten" && pathname.includes("/onboarding")) return false;
  return pathname.startsWith(`${href}/`) || pathname.startsWith(href);
}
