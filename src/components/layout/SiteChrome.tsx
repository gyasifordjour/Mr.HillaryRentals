import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, Camera, ClipboardList, LayoutDashboard, PiggyBank, Sprout, UserRound, Users } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import ThemeToggle from "@/components/ui/ThemeToggle";

type SiteChromeProps = { children: ReactNode };

type NavigationItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
};

export default function SiteChrome({ children }: SiteChromeProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const accountHref = user ? isAdmin ? "/admin" : "/dashboard" : "/login";
  const isDashboardRoute = pathname === "/dashboard"
    || pathname.startsWith("/admin")
    || ["/rentals", "/services", "/payments", "/cameras", "/settings"].includes(pathname);

  if (pathname === "/" || pathname === "/login" || isDashboardRoute) return children;

  const desktopItems: NavigationItem[] = isAdmin
    ? [
        { to: "/admin/rooms", label: "Rooms", icon: PiggyBank },
        { to: "/admin/rentals", label: "Rentals", icon: ClipboardList },
        { to: "/admin/farmers", label: "Farmers", icon: Users },
        { to: "/admin/cameras", label: "Monitoring", icon: Camera },
      ]
    : user
      ? [
          { to: "/rooms", label: "Rooms", icon: PiggyBank },
          { to: "/rentals", label: "Rentals", icon: ClipboardList },
          { to: "/services", label: "Farm services", icon: Sprout },
          { to: "/cameras", label: "Monitoring", icon: Camera },
        ]
      : [
          { to: "/rooms", label: "Rooms", icon: PiggyBank },
          { to: "/#services", label: "Farm services", icon: Sprout },
          { to: "/#monitoring", label: "Monitoring", icon: Camera },
        ];

  const mobileItems: NavigationItem[] = isAdmin
    ? [
        { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
        { to: "/admin/rooms", label: "Rooms", icon: PiggyBank },
        { to: "/admin/rentals", label: "Rentals", icon: ClipboardList },
        { to: "/admin/farmers", label: "Farmers", icon: Users },
        { to: "/admin/cameras", label: "Cameras", icon: Camera },
      ]
    : user
      ? [
          { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
          { to: "/rooms", label: "Rooms", icon: PiggyBank },
          { to: "/rentals", label: "Rentals", icon: ClipboardList },
          { to: "/services", label: "Services", icon: Sprout },
          { to: "/cameras", label: "Cameras", icon: Camera },
        ]
      : [
          { to: "/", label: "Farm", icon: Sprout, end: true },
          { to: "/rooms", label: "Rooms", icon: PiggyBank },
          { to: "/#services", label: "Services", icon: ClipboardList },
        ];

  return (
    <div className="site-page-frame">
      <header className="site-header">
        <Link className="site-brand" to="/">HC Trinity Intergrated Farms</Link>
        <nav className="site-header-links" aria-label="Site navigation">
          {desktopItems.map(({ to, label }) => <Link key={to} to={to}>{label}</Link>)}
        </nav>
        <div className="site-header-actions">
          <Link className="site-header-action" to={user ? accountHref : "/signup"}>{user ? "My account" : "Partner with us"}</Link>
          <ThemeToggle />
          <Link className="site-header-account" to={accountHref} aria-label={user ? "Open account" : "Sign in"}><span>{user ? "Account" : "Sign in"}</span><ArrowRight size={17} /></Link>
        </div>
      </header>

      <div className="site-page-content">{children}</div>

      <nav className="site-mobile-dock" aria-label="Mobile navigation">
        <div className="site-mobile-dock-group" style={{ "--dock-count": mobileItems.length } as CSSProperties}>
          {mobileItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `site-mobile-dock-item${isActive ? " is-active" : ""}`} aria-label={label}>
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
        <Link to={user ? "/settings" : "/login"} className="site-mobile-account" aria-label={user ? "Open profile" : "Sign in"}><UserRound size={20} strokeWidth={2} /></Link>
      </nav>
    </div>
  );
}
