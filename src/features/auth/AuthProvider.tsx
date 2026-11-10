import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, useDemoAuth, useMocks } from "@/lib/supabase";
import { mockProfiles } from "@/mock/data";
import type { Profile, Role } from "@/types";

interface AuthState {
  user: Profile | null;
  signIn: (identifier: string, password: string) => Promise<void>;
  signInAsDemo: (role: Role) => void;
  registerDemoFarmer: (details: Pick<Profile, "full_name" | "phone">) => Profile;
  updateDemoProfile: (details: Pick<Profile, "full_name" | "phone">) => void;
  updateProfile: (details: Pick<Profile, "full_name">) => Promise<void>;
  updateAvatar: (image: File | null) => Promise<void>;
  requestPhoneChange: (phone: string) => Promise<void>;
  verifyPhoneChange: (phone: string, token: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function toGhanaE164(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `+233${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("233")) return `+${digits}`;
  if (phone.trim().startsWith("+") && digits.length === 12 && digits.startsWith("233")) return `+${digits}`;
  throw new Error("Enter a valid Ghanaian phone number, for example 024 123 4567.");
}

function isRole(value: unknown): value is Role {
  return value === "admin" || value === "farmer";
}

async function fetchProfile(id: string): Promise<Profile> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, avatar_path")
    .eq("id", id)
    .single();

  if (error) throw error;
  if (!profile || !isRole(profile.role)) {
    throw new Error("Your account profile is missing or has an invalid role. Contact the administrator.");
  }
  const avatarUrl = profile.avatar_path
    ? await supabase.storage.from("profile-avatars").createSignedUrl(profile.avatar_path, 3600)
    : null;
  if (avatarUrl?.error) throw avatarUrl.error;
  return { ...profile, avatar_url: avatarUrl?.data.signedUrl ?? null };
}

function validateAvatar(image: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
    throw new Error("Choose a JPG, PNG, or WebP profile picture.");
  }
  if (image.size > 5 * 1024 * 1024) throw new Error("Profile pictures must be 5 MB or smaller.");
}

function avatarDataUrl(image: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The selected picture could not be read."));
    reader.onerror = () => reject(new Error("The selected picture could not be read."));
    reader.readAsDataURL(image);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);

  useEffect(() => {
    if (useMocks) return;

    let active = true;
    const restoreUser = async (id: string) => {
      try {
        const profile = await fetchProfile(id);
        if (active) setUser(profile);
      } catch (error) {
        console.error("Unable to load the signed-in user's profile.", error);
        if (active) setUser(null);
      }
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      if (data.session) void restoreUser(data.session.user.id);
    }).catch((error: unknown) => {
      console.error("Unable to restore the Supabase session.", error);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        return;
      }
      queueMicrotask(() => void restoreUser(session.user.id));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (identifier: string, password: string) => {
    if (useMocks) {
      throw new Error("Sign-in is unavailable until Supabase authentication is configured.");
    }

    const loginId = identifier.trim();
    const credentials = loginId.includes("@")
      ? { email: loginId.toLowerCase(), password }
      : { phone: toGhanaE164(loginId), password };
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword(credentials);
    if (authError) throw authError;
    if (!authData.user) throw new Error("Supabase did not return a signed-in user.");

    try {
      const profile = await fetchProfile(authData.user.id);
      setUser(profile);
    } catch (profileError) {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      throw profileError;
    }
  };
  const signInAsDemo = (role: Role) => {
    if (!useDemoAuth) {
      throw new Error("Demo sign-in is only available in local development with mock mode enabled.");
    }
    const profile = mockProfiles.find((item) => item.role === role);
    if (!profile) throw new Error(`No demo ${role} account is configured.`);
    setUser(profile);
  };

  const registerDemoFarmer = (details: Pick<Profile, "full_name" | "phone">) => {
    if (!useDemoAuth) {
      throw new Error("Farmer registration is not available until the authentication backend is configured.");
    }
    const phoneDigits = details.phone.replace(/\D/g, "");
    if (!details.full_name.trim() || !/^0\d{9}$/.test(phoneDigits)) {
      throw new Error("Enter your name and a valid 10-digit Ghana phone number.");
    }

    const profile: Profile = {
      id: `demo-farmer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      full_name: details.full_name.trim(),
      phone: phoneDigits,
      role: "farmer",
    };
    setUser(profile);
    return profile;
  };

  const updateDemoProfile = (details: Pick<Profile, "full_name" | "phone">) => {
    if (!useDemoAuth) {
      throw new Error("Profile editing is only available in local demo mode.");
    }
    if (!details.full_name.trim() || !/^0\d{9}$/.test(details.phone.replace(/\D/g, ""))) {
      throw new Error("Enter a name and a valid 10-digit Ghana phone number.");
    }
    setUser((current) => current ? { ...current, full_name: details.full_name.trim(), phone: details.phone.replace(/\D/g, "") } : current);
  };

  const updateProfile = async (details: Pick<Profile, "full_name">) => {
    if (!details.full_name.trim()) throw new Error("Enter your full name.");
    if (useDemoAuth) {
      setUser((current) => current ? { ...current, full_name: details.full_name.trim() } : current);
      return;
    }
    if (useMocks || !user) throw new Error("Sign in to update your profile.");

    const { data, error } = await supabase
      .from("profiles")
      .update({ full_name: details.full_name.trim() })
      .eq("id", user.id)
      .select("id, full_name, phone, role, avatar_path")
      .single();
    if (error) throw error;
    if (!data || !isRole(data.role)) throw new Error("The profile was not updated.");
    setUser({ ...data, avatar_url: user.avatar_url });
  };

  const updateAvatar = async (image: File | null) => {
    if (useDemoAuth) {
      if (image) {
        validateAvatar(image);
        const avatar_url = await avatarDataUrl(image);
        setUser((current) => current ? { ...current, avatar_url } : current);
      } else {
        setUser((current) => current ? { ...current, avatar_url: null } : current);
      }
      return;
    }
    if (useMocks || !user) throw new Error("Profile picture uploads require a signed-in Supabase account.");
    if (image) validateAvatar(image);

    let uploadedPath: string | null = null;
    if (image) {
      const extension = image.type === "image/jpeg" ? "jpg" : image.type.split("/")[1];
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { data, error } = await supabase.storage.from("profile-avatars").upload(path, image, {
        contentType: image.type,
        upsert: false,
      });
      if (error) throw error;
      uploadedPath = data.path;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_path: uploadedPath })
      .eq("id", user.id)
      .select("id")
      .single();
    if (updateError) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from("profile-avatars").remove([uploadedPath]);
        if (cleanupError) throw new Error(`Profile picture update failed: ${updateError.message}. Uploaded image cleanup failed: ${cleanupError.message}`);
      }
      throw updateError;
    }

    const previousPath = user.avatar_path;
    const updatedUser = await fetchProfile(user.id);
    setUser(updatedUser);
    if (previousPath) {
      const { error } = await supabase.storage.from("profile-avatars").remove([previousPath]);
      if (error) throw new Error(`Profile picture updated, but the previous image could not be removed: ${error.message}`);
    }
  };

  const requestPhoneChange = async (phone: string) => {
    if (useMocks || !user) throw new Error("Phone changes require a signed-in Supabase account.");
    const { error } = await supabase.auth.updateUser({ phone: toGhanaE164(phone) });
    if (error) throw error;
  };

  const verifyPhoneChange = async (phone: string, token: string) => {
    if (useMocks || !user) throw new Error("Phone verification requires a signed-in Supabase account.");
    const normalizedPhone = toGhanaE164(phone);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: token.trim(),
      type: "phone_change",
    });
    if (error) throw error;
    if (!data.user) throw new Error("Phone verification did not return an authenticated user.");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .update({ phone: data.user.phone ?? normalizedPhone })
      .eq("id", data.user.id)
      .select("id, full_name, phone, role")
      .single();
    if (profileError) throw profileError;
    if (!profile || !isRole(profile.role)) throw new Error("The verified phone number could not be saved to your profile.");
    setUser(profile);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (useMocks || !user) throw new Error("Password changes require a signed-in Supabase account.");
    if (newPassword.length < 12) throw new Error("Use a password with at least 12 characters.");

    const { data: currentAuth, error: currentAuthError } = await supabase.auth.getUser();
    if (currentAuthError) throw currentAuthError;
    if (!currentAuth.user) throw new Error("Sign in again before changing your password.");
    const credentials = currentAuth.user.email
      ? { email: currentAuth.user.email, password: currentPassword }
      : { phone: toGhanaE164(currentAuth.user.phone ?? user.phone), password: currentPassword };
    const { error: verifyError } = await supabase.auth.signInWithPassword(credentials);
    if (verifyError) throw new Error("Current password is incorrect.");

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!useMocks) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    setUser(null);
  };

  return <AuthContext.Provider value={{
    user,
    signIn,
    signInAsDemo,
    registerDemoFarmer,
    updateDemoProfile,
    updateProfile,
    updateAvatar,
    requestPhoneChange,
    verifyPhoneChange,
    changePassword,
    signOut,
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
