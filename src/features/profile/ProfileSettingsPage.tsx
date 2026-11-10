import { useEffect, useState, type FormEvent } from "react";
import { BadgeInfo, ImagePlus, KeyRound, Phone, Save, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDemoAuth, useMocks } from "@/lib/supabase";

export default function ProfileSettingsPage() {
  const { user, updateDemoProfile, updateProfile, updateAvatar, requestPhoneChange, verifyPhoneChange, changePassword } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [verificationCode, setVerificationCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneVerificationPending, setPhoneVerificationPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");

  useEffect(() => {
    setFullName(user?.full_name ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.full_name, user?.phone]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      if (useDemoAuth) {
        updateDemoProfile({ full_name: fullName, phone });
        setNotice("Profile updated in this demo session only.");
      } else {
        await updateProfile({ full_name: fullName });
        setNotice("Your profile name was updated.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Profile changes could not be applied.");
    }
  };

  const sendPhoneVerification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await requestPhoneChange(phone);
      setPhoneVerificationPending(true);
      setNotice("A verification code was sent to the new phone number.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "A phone verification code could not be sent.");
    }
  };

  const confirmPhoneChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await verifyPhoneChange(phone, verificationCode);
      setPhoneVerificationPending(false);
      setVerificationCode("");
      setNotice("Your sign-in phone number was verified and updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The phone number could not be verified.");
    }
  };

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Your password was changed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The password could not be changed.");
    }
  };

  const saveAvatar = async (image: File | null) => {
    setAvatarBusy(true);
    setAvatarMessage("");
    try {
      await updateAvatar(image);
      setAvatarMessage(image ? "Profile picture updated." : "Profile picture removed.");
    } catch (reason) {
      setAvatarMessage(reason instanceof Error ? reason.message : "The profile picture could not be updated.");
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <div>
      <header className="dash-page-head">
        <div>
          <span className="dash-page-eyebrow">ACCOUNT</span>
          <h1>Profile settings</h1>
          <p>Update your profile and the credentials used to sign in.</p>
        </div>
      </header>
      {error && <p className="dash-form-error" role="alert">{error}</p>}
      {notice && <p className="dash-form-success" role="status">{notice}</p>}

      <div className="dash-profile-layout">
        <div style={{ display: "grid", gap: 16 }}>
          <section className="dash-panel dash-form-panel">
            <div className="dash-panel-head"><h2>Profile picture</h2><span className="dash-badge">ACCOUNT PHOTO</span></div>
            <div className="dash-profile-picture-editor">
              {user?.avatar_url
                ? <img className="dash-profile-picture-preview" src={user.avatar_url} alt={`${user.full_name}'s profile`} />
                : <span className="dash-profile-picture-fallback">{user?.full_name?.slice(0, 1).toUpperCase() || "F"}</span>}
              <div className="dash-profile-picture-controls">
                <strong>{user?.full_name || "Your profile"}</strong>
                <small>JPG, PNG, or WebP · up to 5 MB</small>
                <div className="dash-room-photo-actions">
                  <label className={`dash-secondary-button${avatarBusy ? " disabled" : ""}`}>
                    <ImagePlus size={14} /> Upload picture
                    <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={avatarBusy} onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void saveAvatar(selected); event.currentTarget.value = ""; }} />
                  </label>
                  {user?.avatar_url && <button type="button" className="dash-room-delete-button" disabled={avatarBusy} onClick={() => void saveAvatar(null)}><Trash2 size={14} /> Remove</button>}
                </div>
                {avatarMessage && <small role="status">{avatarMessage}</small>}
                {useMocks && <small>Demo profile pictures are temporary and only stored in this session.</small>}
              </div>
            </div>
          </section>
          <form className="dash-panel dash-form-panel" onSubmit={saveProfile}>
            <div className="dash-panel-head"><h2>Personal details</h2><span className="dash-badge">{user?.role === "admin" ? "ADMINISTRATOR" : "FARMER"}</span></div>
            <div className="dash-form-body">
              <label className="dash-form-field">
                <span>Full name</span>
                <div className="dash-form-input-icon"><UserRound size={16} /><input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></div>
              </label>
              <label className="dash-form-field">
                <span>Sign-in phone number</span>
                <div className="dash-form-input-icon"><Phone size={16} /><input autoComplete="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} readOnly={useMocks} required /></div>
                <small>{useMocks ? "Phone number changes require a connected Supabase account." : "Changing this number requires SMS verification."}</small>
              </label>
              <label className="dash-form-field">
                <span>Account role</span>
                <input value={user?.role ?? ""} readOnly />
              </label>
              <button type="submit" className="dash-primary-button"><Save size={15} /> {useDemoAuth ? "Save demo profile" : "Save profile"}</button>
              {useDemoAuth && <p className="dash-form-disclaimer">Demo changes update this session only and disappear after reload or sign out.</p>}
            </div>
          </form>

          {!useMocks && (
            <form className="dash-panel dash-form-panel" onSubmit={phoneVerificationPending ? confirmPhoneChange : sendPhoneVerification}>
              <div className="dash-panel-head"><h2>Change sign-in phone</h2><span className="dash-badge">SMS VERIFICATION</span></div>
              <div className="dash-form-body">
                {phoneVerificationPending ? (
                  <label className="dash-form-field">
                    <span>Verification code</span>
                    <input autoComplete="one-time-code" inputMode="numeric" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} required />
                  </label>
                ) : (
                  <p className="dash-form-disclaimer">Enter the new number above. We will send a code to verify that you own it.</p>
                )}
                <button type="submit" className="dash-primary-button">
                  <Phone size={15} /> {phoneVerificationPending ? "Verify new number" : "Send verification code"}
                </button>
                {phoneVerificationPending && <button type="button" className="dash-secondary-button" onClick={() => { setPhoneVerificationPending(false); setVerificationCode(""); }}>Use a different number</button>}
              </div>
            </form>
          )}

          {!useMocks && (
            <form className="dash-panel dash-form-panel" onSubmit={savePassword}>
              <div className="dash-panel-head"><h2>Change password</h2><span className="dash-badge">SECURE</span></div>
              <div className="dash-form-body">
                <label className="dash-form-field">
                  <span>Current password</span>
                  <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
                </label>
                <label className="dash-form-field">
                  <span>New password</span>
                  <input type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
                  <small>Use at least 12 characters.</small>
                </label>
                <label className="dash-form-field">
                  <span>Confirm new password</span>
                  <input type="password" autoComplete="new-password" minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                </label>
                <button type="submit" className="dash-primary-button"><KeyRound size={15} /> Change password</button>
              </div>
            </form>
          )}
        </div>

        <aside className="dash-form-summary">
          <span className="dash-service-icon"><ShieldCheck size={19} /></span>
          <span className="dash-page-eyebrow">ACCOUNT SECURITY</span>
          <h2>Protect your account</h2>
          <p><BadgeInfo size={14} /> Use a unique password that you do not reuse on other sites.</p>
          <div className="dash-service-divider" />
          <p className="dash-form-summary-note">{useMocks ? "Password and phone changes are unavailable in local demo mode." : "Phone changes take effect after SMS verification. Password changes require your current password."}</p>
        </aside>
      </div>
    </div>
  );
}
