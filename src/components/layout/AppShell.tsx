import { Activity, Camera, ClipboardList, LayoutDashboard, LogOut, MapPinned, PiggyBank, Settings, Sprout, Users, WalletCards } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDemoAuth } from "@/lib/supabase";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/ToastProvider";
import "@/styles/dashboard.css";

export default function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const isAdmin = user?.role === "admin";
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

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out", "You have been signed out of FarmRent.");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error("Sign out failed", error instanceof Error ? error.message : "Unable to sign out. Please try again.");
    }
  };

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link to="/" className="dashboard-brand">
          <span className="dashboard-brand-mark"><PiggyBank size={20} /></span>
          <span>FarmRent<small>FARM PLATFORM</small></span>
        </Link>
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
        <header className="dashboard-topbar">
          <div className="dashboard-breadcrumb">
            <span>{isAdmin ? "Administration" : "Farmer portal"}</span>
            <span className="dashboard-topbar-dot" />
            <strong>{user?.full_name || (isAdmin ? "Administrator" : "Farmer")}</strong>
            {useDemoAuth && <span className="dashboard-demo-pill">DEMO</span>}
          </div>
          <div className="dashboard-topbar-actions">
            <ThemeToggle />
            <div className="dashboard-profile">
              {user?.avatar_url
                ? <img className="dashboard-profile-avatar-image" src={user.avatar_url} alt="" />
                : <span className="dashboard-profile-avatar">{user?.full_name?.slice(0, 1).toUpperCase() || "F"}</span>}
              <span>{user?.full_name || "Farm account"}<small>{isAdmin ? "Administrator" : "Farmer account"}</small></span>
            </div>
          </div>
        </header>
        <main className="dashboard-content"><Outlet /></main>
      </div>
    </div>
  );
}
