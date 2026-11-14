import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, AtSign, Camera, Eye, EyeOff, LockKeyhole, ShieldCheck, Sprout, UserRound, UsersRound } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDemoAuth, useMocks } from "@/lib/supabase";
import { FARM_FIELD_PHOTO } from "@/lib/farmPhotos";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/ToastProvider";
import type { Role } from "@/types";
import "@/styles/login.css";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"password" | "email">("password");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const { user, signIn, requestEmailSignInCode, verifyEmailSignInCode, signInAsDemo } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo = requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//") ? requestedReturnTo : null;

  useEffect(() => {
    if (user) navigate(user.role === "admin" ? "/admin" : returnTo ?? "/dashboard", { replace: true });
  }, [navigate, returnTo, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!identifier.trim() || (loginMethod === "password" && !password) || (loginMethod === "email" && emailCodeSent && !emailCode.trim())) {
      toast.error("Missing details", loginMethod === "email" ? "Enter your email address and verification code to continue." : "Enter your email or phone number and password to continue.");
      return;
    }

    setBusy(true);
    try {
      if (loginMethod === "email") {
        if (!identifier.includes("@")) throw new Error("Enter the email address linked to your farmer account.");
        if (!emailCodeSent) {
          await requestEmailSignInCode(identifier);
          setEmailCodeSent(true);
          toast.success("Code sent", "Check your email for a sign-in code.");
        } else {
          await verifyEmailSignInCode(identifier, emailCode);
          toast.success("Signed in", "Welcome back to Trinity Integrated Farms.");
        }
      } else {
        await signIn(identifier, password);
        toast.success("Signed in", "Welcome back to Trinity Integrated Farms.");
      }
    } catch (reason) {
      toast.error(loginMethod === "email" ? "Email sign-in failed" : "Sign-in failed", reason instanceof Error ? reason.message : "We couldn't sign you in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const requestAnotherCode = async () => {
    setBusy(true);
    try {
      await requestEmailSignInCode(identifier);
      toast.success("Code sent", "A new sign-in code was sent to your email.");
    } catch (reason) {
      toast.error("Code not sent", reason instanceof Error ? reason.message : "We couldn't send another code.");
    } finally {
      setBusy(false);
    }
  };

  const toggleLoginMethod = () => {
    if (loginMethod === "password" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) setIdentifier("");
    setLoginMethod((method) => method === "password" ? "email" : "password");
    setEmailCodeSent(false);
    setEmailCode("");
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
    <main className="login-page">
      <section className="login-form-side">
        <header className="login-topbar">
          <Link to="/" className="login-brand" aria-label="Trinity Integrated Farms home">
            <span className="login-brand-mark"><Sprout size={19} strokeWidth={2} /></span>
            <span>Trinity Integrated Farms</span>
          </Link>
          <div className="login-topbar-actions">
            <Link to="/rooms" className="login-back-link"><ArrowLeft size={15} /> Browse rooms</Link>
            <ThemeToggle />
          </div>
        </header>

        <div className="login-content">
          <div className="login-heading">
            <span className="login-eyebrow"><span /> YOUR FARM, CLOSE AT HAND</span>
            <h1>Welcome back.</h1>
            <p>Sign in to manage your rental and check in on your pigs.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="login-identifier">{loginMethod === "email" ? "Email address" : "Email or phone number"}</label>
            <div className="login-input-wrap">
              {identifier.includes("@") || loginMethod === "email" ? <AtSign size={18} aria-hidden="true" /> : <span className="login-country-code" aria-hidden="true">GH</span>}
              <input
                autoComplete={loginMethod === "email" ? "email" : "username"}
                id="login-identifier"
                inputMode="email"
                name="identifier"
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={loginMethod === "email" ? "farmer@example.com" : "Email or 024 123 4567"}
                readOnly={loginMethod === "email" && emailCodeSent}
                type={loginMethod === "email" ? "email" : "text"}
                value={identifier}
                required
              />
            </div>

            {loginMethod === "password" ? (
              <>
                <div className="login-password-label">
                  <label htmlFor="login-password">Password</label>
                  <button
                    className="login-forgot"
                    onClick={() => {
                      toast.info("Password reset", "Contact your farm administrator. Use email-code sign-in if your account was created by the administrator.");
                    }}
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
            ) : emailCodeSent ? (
              <>
                <div className="login-password-label">
                  <label htmlFor="login-email-code">Email verification code</label>
                  <button className="login-forgot" disabled={busy} onClick={() => void requestAnotherCode()} type="button">Resend code</button>
                </div>
                <div className="login-input-wrap">
                  <input
                    autoComplete="one-time-code"
                    id="login-email-code"
                    inputMode="numeric"
                    name="emailCode"
                    onChange={(event) => setEmailCode(event.target.value)}
                    placeholder="Enter the code from your email"
                    type="text"
                    value={emailCode}
                    required
                  />
                </div>
              </>
            ) : (
              <p className="login-config-note">
                <ShieldCheck size={17} />
                <span>Only email addresses already set up by the farm administrator can receive a sign-in code.</span>
              </p>
            )}

            {useDemoAuth && (
              <p className="login-config-note">
                <ShieldCheck size={17} />
                <span>Local preview mode. Demo access is temporary and uses sample data only.</span>
              </p>
            )}

            <button className="login-submit" disabled={busy || useMocks} type="submit">
              {busy ? (emailCodeSent ? "Verifying..." : loginMethod === "email" ? "Sending code..." : "Signing in...") : loginMethod === "email" ? (emailCodeSent ? "Verify and sign in" : "Send sign-in code") : "Sign in"}
              {!busy && <ArrowRight size={17} />}
            </button>
            {!useMocks && (
              <button className="login-method-toggle" disabled={busy} onClick={toggleLoginMethod} type="button">
                {loginMethod === "email" ? "Use password instead" : "Sign in with an email code"}
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
          <span>© {new Date().getFullYear()} Trinity Integrated Farms</span>
          <span>Space to farm. Confidence to grow.</span>
        </footer>
      </section>

      <aside className="login-art-side" aria-label="Trinity Integrated Farms services">
        <div className="login-art-glow" />
        <div className="login-art-copy">
          <span className="login-art-kicker"><span /> MORE THAN A ROOM</span>
          <h2>Care for your pigs.<br /><em>From wherever you are.</em></h2>
          <p>Rent a well-managed space and stay connected to the animals you’re raising.</p>
        </div>

        <div className="login-farm-illustration">
          <img className="login-farm-photo" src={FARM_FIELD_PHOTO} alt="Illustrative stock photo of a farm field; not a Trinity Integrated Farms site photo" />
        </div>

        <div className="login-feature-card">
          <div className="login-feature-icon"><Camera size={19} /></div>
          <div>
            <strong>Your room, in view</strong>
            <span>Private camera access during your rental</span>
          </div>
          <span className="login-online"><i /> ONLINE</span>
        </div>
        <span className="login-art-caption">STOCK PHOTO · ILLUSTRATIVE ONLY</span>
      </aside>
    </main>
  );
}
