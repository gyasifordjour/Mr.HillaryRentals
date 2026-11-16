import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, AtSign, Camera, Eye, EyeOff, LockKeyhole, ShieldCheck, Sprout, UserRound, UsersRound } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDemoAuth, useMocks } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import type { Role } from "@/types";
import "@/styles/login.css";

export default function LoginPage() {
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const { user, signIn, requestPasswordReset, signInAsDemo } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo = requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//") ? requestedReturnTo : null;

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPlayback = () => {
      if (motionPreference.matches || document.visibilityState !== "visible") {
        video.pause();
        return;
      }
      void video.play().catch(() => undefined);
    };
    syncPlayback();
    document.addEventListener("visibilitychange", syncPlayback);
    motionPreference.addEventListener("change", syncPlayback);
    return () => {
      document.removeEventListener("visibilitychange", syncPlayback);
      motionPreference.removeEventListener("change", syncPlayback);
      video.pause();
    };
  }, []);

  useEffect(() => {
    if (user) navigate(
      user.must_change_password ? "/change-password" : user.role === "admin" ? "/admin" : returnTo ?? "/dashboard",
      { replace: true },
    );
  }, [navigate, returnTo, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (resetMode) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) {
        toast.error("Email required", "Enter the email address linked to your account.");
        return;
      }
      setBusy(true);
      try {
        await requestPasswordReset(identifier);
        setResetSent(true);
        toast.success("Reset link sent", "Check your email and open the link to choose a new password.");
      } catch (reason) {
        toast.error("Reset link not sent", reason instanceof Error ? reason.message : "We couldn't send the reset link. Please try again.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!identifier.trim() || !password) {
      toast.error("Missing details", "Enter your email or phone number and password to continue.");
      return;
    }

    setBusy(true);
    try {
      await signIn(identifier, password);
      toast.success("Signed in", "Welcome back to HC Trinity Intergrated Farms.");
    } catch (reason) {
      toast.error("Sign-in failed", reason instanceof Error ? reason.message : "We couldn't sign you in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const startPasswordReset = () => {
    setResetMode(true);
    setResetSent(false);
    setPassword("");
  };

  const exitPasswordReset = () => {
    setResetMode(false);
    setResetSent(false);
  };

  const handleDemoSignIn = (role: Role) => {
    try {
      signInAsDemo(role);
      toast.success("Demo account opened", `You're viewing the ${role === "admin" ? "admin" : "farmer"} dashboard.`);
    } catch (reason) {
      toast.error("Demo unavailable", reason instanceof Error ? reason.message : "Unable to open the demo account.");
    }
  };

  return (
    <main className="login-page login-page-main">
      <section className="login-form-side">
        <header className="login-topbar">
          <Link to="/" className="login-brand" aria-label="HC Trinity Intergrated Farms home">
            <span className="login-brand-mark"><Sprout size={19} strokeWidth={2} /></span>
            <span>HC Trinity Intergrated Farms</span>
          </Link>
          <div className="login-topbar-actions">
            <Link to="/rooms" className="login-back-link"><ArrowLeft size={15} /> Browse rooms</Link>
          </div>
        </header>

        <div className="login-content">
          <div className="login-heading">
            <span className="login-eyebrow"><span /> YOUR FARM, CLOSE AT HAND</span>
            <h1>{resetMode ? "Reset your password." : "Welcome back."}</h1>
            <p>{resetMode ? "We'll email you a secure link to choose a new password." : "Sign in to manage your rental and check in on your pigs."}</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="login-identifier">{resetMode ? "Email address" : "Email or phone number"}</label>
            <div className="login-input-wrap">
              {resetMode || identifier.includes("@") ? <AtSign size={18} aria-hidden="true" /> : <span className="login-country-code" aria-hidden="true">GH</span>}
              <input
                autoComplete={resetMode ? "email" : "username"}
                id="login-identifier"
                inputMode={resetMode ? "email" : "text"}
                name="identifier"
                onChange={(event) => {
                  setIdentifier(event.target.value);
                  setResetSent(false);
                }}
                placeholder={resetMode ? "farmer@example.com" : "Email or 024 123 4567"}
                type={resetMode ? "email" : "text"}
                value={identifier}
                required
              />
            </div>

            {resetMode ? (
              <p className="login-config-note">
                <ShieldCheck size={17} />
                <span>Enter the email address linked to your account. The reset link expires after a short time.</span>
              </p>
            ) : (
              <>
                <div className="login-password-label">
                  <label htmlFor="login-password">Password</label>
                  <button
                    className="login-forgot"
                    onClick={startPasswordReset}
                    type="button"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="login-input-wrap">
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input
                    autoComplete="current-password"
                    id="login-password"
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    required
                  />
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="login-password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    type="button"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </>
            )}

            {resetMode && resetSent && (
              <p className="login-config-note" role="status">
                <ShieldCheck size={17} />
                <span>If an account exists for {identifier}, a reset link is on its way. Open it in your browser to choose a new password.</span>
              </p>
            )}

            {useDemoAuth && (
              <p className="login-config-note">
                <ShieldCheck size={17} />
                <span>Local preview mode. Demo access is temporary and uses sample data only.</span>
              </p>
            )}

            <button className="login-submit" disabled={busy || useMocks} type="submit">
              {busy
                ? resetMode ? "Sending reset link..." : "Signing in..."
                : resetMode
                  ? resetSent ? "Resend reset link" : "Send reset link"
                  : "Sign in"}
              {!busy && <ArrowRight size={17} />}
            </button>
            {resetMode && (
              <button className="login-method-toggle" disabled={busy} onClick={exitPasswordReset} type="button">
                Back to sign in
              </button>
            )}
          </form>

          {useDemoAuth && (
            <section className="login-demo" aria-labelledby="login-demo-heading">
              <div className="login-demo-heading">
                <span id="login-demo-heading">Preview a dashboard</span>
                <span>LOCAL DEMO</span>
              </div>
              <div className="login-demo-actions">
                <button type="button" onClick={() => handleDemoSignIn("farmer")} disabled={busy}>
                  <UserRound size={16} /> Farmer view <ArrowRight size={14} />
                </button>
                <button type="button" onClick={() => handleDemoSignIn("admin")} disabled={busy}>
                  <UsersRound size={16} /> Admin view <ArrowRight size={14} />
                </button>
              </div>
            </section>
          )}

          <div className="login-security">
            <ShieldCheck size={17} />
            <span>Your account and camera access are protected.</span>
          </div>
          <p className="login-account-help">
            Need an account? <Link to={`/signup?returnTo=${encodeURIComponent(returnTo ?? "/rooms")}`}>{useDemoAuth ? "Create a preview account" : "Contact the farm administrator"}</Link>
          </p>
        </div>

        <footer className="login-foot">
          <span>© {new Date().getFullYear()} HC Trinity Intergrated Farms</span>
          <span>Space to farm. Confidence to grow.</span>
        </footer>
      </section>

      <aside className="login-art-side" aria-label="HC Trinity Intergrated Farms services">
        <div className="login-art-glow" />
        <span className="login-art-kicker"><span /> MORE THAN A ROOM</span>
        <div className="login-art-copy">
          <h2>Care for your pigs.<br /><em>From wherever you are.</em></h2>
          <p>Rent a well-managed space and stay connected to the animals you’re raising.</p>
        </div>

        <div className="login-farm-illustration">
          <video ref={heroVideoRef} className="login-farm-photo" autoPlay muted loop playsInline preload="metadata" poster="/landing/poster.jpg" aria-hidden="true">
            <source src="/landing/hero.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="login-feature-card">
          <div className="login-feature-icon"><Camera size={19} /></div>
          <div>
            <strong>Your room, in view</strong>
            <span>Private camera access during your rental</span>
          </div>
          <span className="login-online"><i /> ONLINE</span>
        </div>
      </aside>
    </main>
  );
}
