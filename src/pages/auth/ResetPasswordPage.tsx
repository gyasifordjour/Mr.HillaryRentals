import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, KeyRound, ShieldCheck, Sprout } from "@/components/ui/Iconly";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { supabase, useMocks } from "@/lib/supabase";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/ToastProvider";
import "@/styles/login.css";

type LinkState = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const { completePasswordReset, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (useMocks) {
      setLinkState("invalid");
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      if (active) setLinkState((current) => current === "checking" ? "invalid" : current);
    }, 2500);

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        setLinkState("ready");
        window.clearTimeout(timer);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setLinkState("ready");
        window.clearTimeout(timer);
      }
    });

    return () => {
      active = false;
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match", "Enter the same new password in both fields.");
      return;
    }
    setBusy(true);
    try {
      await completePasswordReset(password);
      toast.success("Password updated", "Sign in with your new password.");
      await signOut();
      navigate("/login", { replace: true });
    } catch (reason) {
      toast.error("Password not updated", reason instanceof Error ? reason.message : "The password could not be changed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page login-page-single">
      <section className="login-form-side">
        <header className="login-topbar">
          <Link to="/" className="login-brand" aria-label="HC Trinity Intergrated Farms home">
            <span className="login-brand-mark"><Sprout size={19} strokeWidth={2} /></span>
            <span>HC Trinity Intergrated Farms</span>
          </Link>
          <div className="login-topbar-actions">
            <Link to="/login" className="login-back-link"><ArrowLeft size={15} /> Back to sign in</Link>
            <ThemeToggle />
          </div>
        </header>

        <div className="login-content">
          <div className="login-heading">
            <span className="login-eyebrow"><span /> ACCOUNT RECOVERY</span>
            <h1>Set a new password.</h1>
            <p>Choose a strong password for your HC Trinity Intergrated Farms account.</p>
          </div>

          {linkState === "checking" && (
            <p className="login-config-note" role="status">
              <ShieldCheck size={17} />
              <span>Checking your reset link...</span>
            </p>
          )}

          {linkState === "invalid" && (
            <>
              <p className="login-config-note" role="alert">
                <ShieldCheck size={17} />
                <span>This reset link is invalid or has expired. Request a new link from the sign-in page.</span>
              </p>
              <button className="login-submit" type="button" onClick={() => navigate("/login", { replace: true })}>
                Back to sign in <ArrowRight size={17} />
              </button>
            </>
          )}

          {linkState === "ready" && (
            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <label htmlFor="reset-password">New password</label>
              <div className="login-input-wrap">
                <KeyRound size={18} aria-hidden="true" />
                <input
                  autoComplete="new-password"
                  id="reset-password"
                  minLength={12}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 12 characters"
                  type="password"
                  value={password}
                  required
                />
              </div>
              <label className="login-reset-label" htmlFor="reset-password-confirm">Confirm new password</label>
              <div className="login-input-wrap">
                <KeyRound size={18} aria-hidden="true" />
                <input
                  autoComplete="new-password"
                  id="reset-password-confirm"
                  minLength={12}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your new password"
                  type="password"
                  value={confirmPassword}
                  required
                />
              </div>
              <button className="login-submit" disabled={busy} type="submit">
                {busy ? "Updating password..." : "Update password"}
                {!busy && <ArrowRight size={17} />}
              </button>
            </form>
          )}

          <div className="login-security">
            <ShieldCheck size={17} />
            <span>Reset links expire quickly. Never share your password.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
