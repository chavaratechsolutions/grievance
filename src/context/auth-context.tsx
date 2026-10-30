"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onIdTokenChanged 
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { Role, UserProfile } from "@/types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: Role | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Sync secure session cookie for Next.js Server Actions verification
          const idToken = await firebaseUser.getIdToken();
          document.cookie = `__session=${idToken}; path=/; max-age=3600; SameSite=Lax; Secure`;

          // 1. Check custom claims (0 Firestore reads)
          const tokenResult = await firebaseUser.getIdTokenResult();
          const claimRole = tokenResult.claims.role as Role | undefined;

          // 2. Fetch user profile document (cached in IndexedDB)
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setProfile(data);
            setRole(claimRole || data.role);
          } else {
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || "User",
              role: claimRole || "student",
              department: "General",
              isDisabled: false,
            };
            setProfile(fallbackProfile);
            setRole(fallbackProfile.role);
          }
        } catch (err) {
          console.error("Error reading user profile:", err);
        }
      } else {
        document.cookie = "__session=; path=/; max-age=0; SameSite=Lax; Secure";
        setUser(null);
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, pass);
      const idToken = await userCred.user.getIdToken();
      document.cookie = `__session=${idToken}; path=/; max-age=3600; SameSite=Lax; Secure`;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Failed to sign in." };
    }
  };

  const logout = async () => {
    document.cookie = "__session=; path=/; max-age=0; SameSite=Lax; Secure";
    setUser(null);
    setProfile(null);
    setRole(null);
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
