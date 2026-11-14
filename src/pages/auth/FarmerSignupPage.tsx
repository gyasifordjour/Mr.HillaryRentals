import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Phone, Sprout, UserRound } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDemoAuth } from "@/lib/supabase";
import { FARM_FIELD_PHOTO } from "@/lib/farmPhotos";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/ToastProvider";
import "@/styles/login.css";

function getReturnPath(path: string | null) {
  return path?.startsWith("/") && !path.startsWith("//") ? path : "/rooms";
}

export default function FarmerSignupPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const { user, registerDemoFarmer } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = getReturnPath(searchParams.get("returnTo"));

  useEffect(() => {
    if (user) navigate(user.role === "admin" ? "/admin" : returnTo, { replace: true });
  }, [navigate, returnTo, user]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      registerDemoFarmer({ full_name: fullName, phone });
      toast.success("Account created", "Your preview account is ready.");
      navigate(returnTo, { replace: true });
    } catch (reason) {
      toast.error("Account not created", reason instanceof Error ? reason.message : "The preview account could not be created.");
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
            <span className="login-eyebrow"><span /> START YOUR FARM JOURNEY</span>
            <h1>{useDemoAuth ? "Create your account." : "Get started."}</h1>
            <p>{useDemoAuth ? "Save your details and continue with your room request." : "Ask the farm administrator to set up your secure sign-in."}</p>
          </div>

          {useDemoAuth ? (
            <>
              <form className="login-form" onSubmit={handleSubmit}>
                <label htmlFor="signup-name">Full name</label>
                <div className="login-input-wrap">
                  <UserRound size={18} aria-hidden="true" />
                  <input id="signup-name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" required />
                </div>

                <label className="signup-phone-label" htmlFor="signup-phone">Phone number</label>
                <div className="login-input-wrap">
                  <Phone size={18} aria-hidden="true" />
                  <span className="login-country-code" aria-hidden="true">GH</span>
                  <input id="signup-phone" autoComplete="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="024 123 4567" type="tel" required />
                </div>

                <p className="login-config-note">
                  <span>This creates a temporary local preview account only. It is not saved to a server or verified.</span>
                </p>
                <button className="login-submit" type="submit">Continue to request <ArrowRight size={17} /></button>
              </form>
              <p className="login-account-help">Already have an account? <Link to={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Sign in</Link></p>
            </>
          ) : (
            <div className="login-message login-notice" role="status">
              <p>Farmer accounts are set up by the farm administrator. Ask them to add your name and email address. When you receive an email sign-in link, open it in your browser to finish signing in.</p>
              <Link className="login-back-link" to={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Go to sign in <ArrowRight size={15} /></Link>
            </div>
          )}
        </div>

        <footer className="login-foot">
          <span>© {new Date().getFullYear()} Trinity Integrated Farms</span>
          <span>Space to farm. Confidence to grow.</span>
        </footer>
      </section>

      <aside className="login-art-side" aria-label="Trinity Integrated Farms farm">
        <div className="login-art-glow" />
        <div className="login-art-copy">
          <span className="login-art-kicker"><span /> YOUR FARM, CLOSE AT HAND</span>
          <h2>Find room to grow.<br /><em>Stay close to your pigs.</em></h2>
          <p>Start with a room request. The farm team can confirm availability and rental details.</p>
        </div>
        <div className="login-farm-illustration">
          <img className="login-farm-photo" src={FARM_FIELD_PHOTO} alt="Illustrative stock photo of a farm field; not a Trinity Integrated Farms site photo" />
        </div>
        <span className="login-art-caption">STOCK PHOTO · ILLUSTRATIVE ONLY</span>
      </aside>
    </main>
  );
}
