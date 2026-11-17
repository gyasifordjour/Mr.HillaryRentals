import { Activity, Bell, Camera, ChartColumn, ClipboardList, House, LayoutDashboard, LogOut, Mail, MapPinned, Moon, PiggyBank, Search, Settings, SlidersHorizontal, Sprout, Sun, Users, WalletCards } from "@/components/ui/Iconly";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useTheme } from "@/features/theme/ThemeProvider";
import { useDemoAuth } from "@/lib/supabase";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/ToastProvider";
import "@/styles/dashboard.css";

export default function AppShell() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [profileOpen, setProfileOpen] = useState(false);
  const [openAdminTool, setOpenAdminTool] = useState<"search" | "messages" | "notifications" | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const adminToolRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === "admin";
  const isOverview = pathname === "/dashboard" || pathname === "/admin";
  const links = isAdmin
    ? [
        { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
        { to: "/admin/rooms", label: "Rooms", icon: PiggyBank },
        { to: "/admin/rentals", label: "Rentals", icon: ClipboardList },
        { to: "/admin/farmers", label: "Farmers", icon: Users },
        { to: "/admin/cameras", label: "Cameras", icon: Camera },
        { to: "/settings", label: "Profile", icon: Settings },
      ]
    : [
        { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
        { to: "/rooms", label: "Browse rooms", icon: MapPinned },
        { to: "/rentals", label: "My rentals", icon: ClipboardList },
        { to: "/services", label: "Services", icon: Sprout },
        { to: "/payments", label: "Payments", icon: WalletCards },
        { to: "/cameras", label: "My cameras", icon: Camera },
        { to: "/settings", label: "Profile", icon: Settings },
      ];
  const adminRailItems = [
    { to: "/admin/rooms", label: "Rooms", icon: PiggyBank },
    { to: "/admin/rentals", label: "Rentals", icon: ClipboardList },
    { to: "/admin/farmers", label: "Farmers", icon: Users },
    { to: "/admin/cameras", label: "Cameras", icon: Camera },
  ];
  const adminMobileNav = [
    { to: "/admin", label: "Home", icon: House, end: true },
    { to: "/admin/farmers", label: "Farmers", icon: Users },
    { to: "/admin/cameras", label: "Camera", icon: Camera },
    { to: "/admin/analytics", label: "Analytics", icon: ChartColumn },
    { to: "/settings", label: "Settings", icon: SlidersHorizontal },
  ];
  const activeAdminMobileIndex = pathname === "/admin" || pathname === "/dashboard"
    ? 0
    : pathname.startsWith("/admin/farmers")
      ? 1
      : pathname.startsWith("/admin/cameras")
        ? 2
        : pathname.startsWith("/admin/analytics")
          ? 3
          : pathname.startsWith("/settings")
            ? 4
            : 0;
  const ActiveMobileIcon = adminMobileNav[activeAdminMobileIndex].icon;
  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out", "You have been signed out of HC Trinity Intergrated Farms.");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error("Sign out failed", error instanceof Error ? error.message : "Unable to sign out. Please try again.");
    }
  };
  useEffect(() => {
    if (!profileOpen && !openAdminTool) return;
    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (adminToolRef.current && !adminToolRef.current.contains(target)) {
        setOpenAdminTool(null);
      }
    };
    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [openAdminTool, profileOpen]);
  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = String(form.get("query") || "").trim();
    if (!query) return;
    toast.info("Search submitted", `Searching the farm workspace for “${query}”.`);
    setOpenAdminTool(null);
  };

  return (
    <div className={`dashboard-shell${isOverview ? "" : " dashboard-shell-page"}${isAdmin ? " admin-dashboard-shell" : ""}`}>
      <aside className="dashboard-sidebar">
        <Link to="/" className="dashboard-brand">
          <span className="dashboard-brand-mark"><PiggyBank size={20} /></span>
          <span>HC Trinity Intergrated Farms<small>FARM PLATFORM</small></span>
        </Link>
        {isAdmin && (
          <div className="admin-crm-side-rail" aria-label="Admin quick actions">
            <Link to="/admin" className="admin-crm-side-action" aria-label="Back to overview"><House size={16} /></Link>
            {adminRailItems.map(({ to, label, icon: Icon }) => (
              <Link key={label} to={to} className="admin-crm-side-action" aria-label={label}>
                <Icon size={16} />
              </Link>
            ))}
            <span className="admin-crm-side-spacer" />
            <button type="button" className={`admin-crm-side-action${theme === "dark" ? " active" : ""}`} aria-label="Switch to dark mode" onClick={() => setTheme("dark")}><Moon size={16} /></button>
            <button type="button" className={`admin-crm-side-action${theme === "light" ? " active" : ""}`} aria-label="Switch to light mode" onClick={() => setTheme("light")}><Sun size={16} /></button>
          </div>
        )}
        <div className="dashboard-nav-label">WORKSPACE</div>
        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `dashboard-nav-link${isActive ? " active" : ""}`}>
              <Icon size={18} strokeWidth={1.8} />
              {label}
              {label === "Cameras" && <span className="dashboard-nav-indicator" />}
            </NavLink>
          ))}
        </nav>
        {isAdmin && (
          <nav
            className="admin-mobile-nav"
            aria-label="Mobile admin navigation"
            style={{ "--active-index": activeAdminMobileIndex } as React.CSSProperties}
          >
            <svg className="admin-mobile-nav-surface" viewBox="0 0 100 78" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <mask id="admin-mobile-nav-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="78">
                  <rect width="100" height="78" fill="white" />
                  <path
                    className="admin-mobile-nav-notch"
                    d="M34 18C40 18 41 24 43 31C45 38 55 38 57 31C59 24 60 18 66 18V0H34Z"
                    style={{ transform: `translateX(${(activeAdminMobileIndex - 2) * 20}px)` }}
                  />
                </mask>
              </defs>
              <path className="admin-mobile-nav-bar" d="M0 18H100V78H0Z" mask="url(#admin-mobile-nav-mask)" />
            </svg>
            <span className="admin-mobile-nav-active-button" aria-hidden="true"><ActiveMobileIcon size={22} strokeWidth={2} /></span>
            <div className="admin-mobile-nav-links">
              {adminMobileNav.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={label} to={to} end={end} className={({ isActive }) => `admin-mobile-nav-link${label === "Camera" ? " camera" : ""}${isActive ? " active" : ""}`}>
                  <span className="admin-mobile-nav-icon"><Icon size={21} strokeWidth={1.7} /></span>
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </nav>
        )}
        <div className="dashboard-sidebar-bottom">
          <div className="dashboard-support">
            <span className="dashboard-support-icon"><Activity size={17} /></span>
            <strong>Need help?</strong>
            <span>Contact your farm administrator for account support.</span>
          </div>
          <button type="button" className="dashboard-signout" onClick={handleSignOut}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>
      <div className="dashboard-main">
        {isAdmin ? (
          <header className="dashboard-topbar admin-crm-topbar">
            <Link to="/admin" className="admin-crm-brand"><span className="admin-crm-brand-mark">◆</span> HC Trinity</Link>
            <nav className="admin-crm-nav" aria-label="Admin workspace">
              <Link to="/admin">Relationships</Link>
              <Link to="/admin/rooms">Opportunities</Link>
              <Link to="/admin/farmers">Farmers</Link>
              <Link to="/admin/rentals">Calendar</Link>
              <Link className={pathname === "/admin" ? "active" : ""} to="/admin">Cases</Link>
              <Link to="/admin/rentals">Reports</Link>
              <Link to="/admin/rooms">Quotes</Link>
            </nav>
            <div ref={adminToolRef} className="admin-crm-tools">
              <button type="button" className="admin-crm-circle-action" aria-label="Search" aria-expanded={openAdminTool === "search"} onClick={() => setOpenAdminTool((tool) => tool === "search" ? null : "search")}><Search size={16} /></button>
              <button type="button" className="admin-crm-circle-action" aria-label="Messages" aria-expanded={openAdminTool === "messages"} onClick={() => setOpenAdminTool((tool) => tool === "messages" ? null : "messages")}><Mail size={16} /><i /></button>
              <button type="button" className="admin-crm-circle-action" aria-label="Notifications" aria-expanded={openAdminTool === "notifications"} onClick={() => setOpenAdminTool((tool) => tool === "notifications" ? null : "notifications")}><Bell size={16} /><i /></button>
              {openAdminTool && (
                <div className="admin-crm-tool-panel">
                  {openAdminTool === "search" && (
                    <form onSubmit={handleSearch}>
                      <label htmlFor="admin-workspace-search">Search workspace</label>
                      <div className="admin-crm-search-field">
                        <input id="admin-workspace-search" name="query" placeholder="Search rooms, farmers..." autoFocus />
                        <button type="submit" aria-label="Submit search"><Search size={14} /></button>
                      </div>
                    </form>
                  )}
                  {openAdminTool === "messages" && (
                    <>
                      <strong>Messages</strong>
                      <span>No new messages.</span>
                    </>
                  )}
                  {openAdminTool === "notifications" && (
                    <>
                      <strong>Notifications</strong>
                      <span>No new notifications.</span>
                    </>
                  )}
                </div>
              )}
              <div ref={profileRef} className="admin-crm-profile">
                <button type="button" className="admin-crm-profile-trigger" aria-label="Open profile menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}>
                  <span className="admin-crm-avatar-wrap">
                    <span className="admin-crm-avatar" style={{ "--avatar-color": "#5f8fc9" } as React.CSSProperties}>
                      {user?.avatar_url
                        ? <img src={user.avatar_url} alt="" />
                        : user?.full_name?.slice(0, 1).toUpperCase() || "A"}
                    </span>
                  </span>
                </button>
                {profileOpen && (
                  <div className="admin-crm-profile-menu">
                    <strong>{user?.full_name || "Administrator"}</strong>
                    <span>{user?.email || user?.phone || "Admin account"}</span>
                    <small>Administrator</small>
                    <Link to="/settings" onClick={() => setProfileOpen(false)}>Profile settings</Link>
                    <button type="button" onClick={() => setProfileOpen(false)}>Close</button>
                  </div>
                )}
              </div>
            </div>
          </header>
        ) : (
          <header className="dashboard-topbar">
            <div className="dashboard-breadcrumb">
              <span>Farmer portal</span>
              <span className="dashboard-topbar-dot" />
              <strong>{user?.full_name || "Farmer"}</strong>
              {useDemoAuth && <span className="dashboard-demo-pill">DEMO</span>}
            </div>
            <div className="dashboard-topbar-actions">
              <ThemeToggle />
              <div className="dashboard-profile">
                {user?.avatar_url
                  ? <img className="dashboard-profile-avatar-image" src={user.avatar_url} alt="" />
                  : <span className="dashboard-profile-avatar">{user?.full_name?.slice(0, 1).toUpperCase() || "F"}</span>}
                <span>{user?.full_name || "Farm account"}<small>Farmer account</small></span>
              </div>
            </div>
          </header>
        )}
        <main className="dashboard-content"><Outlet /></main>
      </div>
    </div>
  );
}
