import { useState, type FormEvent } from "react";
import { KeyRound, Sprout } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import "@/styles/login.css";

export default function ChangePasswordPage() {
  const { user, completeInitialPasswordChange, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match", "Enter the same new password in both fields.");
      return;
    }

    setBusy(true);
    try {
      await completeInitialPasswordChange(password);
      toast.success("Password updated", "Your account is ready to use.");
      navigate(user?.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    } catch (reason) {
      toast.error("Password not updated", reason instanceof Error ? reason.message : "The password could not be changed.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (reason) {
      toast.error("Sign out failed", reason instanceof Error ? reason.message : "Unable to sign out.");
    }
  };

  return (
    <main className="login-page">
      <section className="login-form-side">
        <header className="login-topbar">
          <Link to="/" className="login-brand" aria-label="HC Trinity Intergrated Farms home">
            <span className="login-brand-mark"><Sprout size={19} strokeWidth={2} /></span>
            <span>HC Trinity Intergrated Farms</span>
          </Link>
        </header>
        <div className="login-content">
          <div className="login-heading">
            <span className="login-eyebrow"><span /> FIRST SIGN-IN</span>
            <h1>Choose a new password.</h1>
            <p>Your temporary password must be replaced before you can use your account.</p>
          </div>
          <form className="login-form" onSubmit={(event) => void submit(event)}>
            <label htmlFor="new-password">New password</label>
            <div className="login-input-wrap">
              <KeyRound size={18} aria-hidden="true" />
              <input
                autoComplete="new-password"
                id="new-password"
                minLength={12}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            <small>Use at least 12 characters.</small>
            <label htmlFor="confirm-new-password">Confirm new password</label>
            <div className="login-input-wrap">
              <KeyRound size={18} aria-hidden="true" />
              <input
                autoComplete="new-password"
                id="confirm-new-password"
                minLength={12}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
            </div>
            <button className="login-submit" disabled={busy} type="submit">
              {busy ? "Updating password..." : "Set new password"}
            </button>
            <button className="login-method-toggle" disabled={busy} onClick={() => void handleSignOut()} type="button">
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
