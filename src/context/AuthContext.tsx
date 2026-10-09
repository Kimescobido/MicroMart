// src/context/AuthContext.tsx
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../services/firebaseConfig";
import type { UserRole } from "../services/authService";

type AuthContextType = {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  profileError: string | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isLoading: true,
  profileError: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;
      setUser(currentUser);
      setRole(null);
      setProfileError(null);

      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      unsubscribeProfile = onSnapshot(
        doc(db, "users", currentUser.uid),
        (snapshot) => {
          const value = snapshot.exists() ? snapshot.data().role : null;
          const validRole: UserRole | null =
            value === "customer" || value === "admin" || value === "delivery" ? value : null;
          setRole(validRole);
          setProfileError(validRole ? null : "Your account does not have a valid role. Contact the shop administrator.");
          setIsLoading(false);
        },
        (error) => {
          console.error("Could not load the signed-in user's role", error);
          setRole(null);
          setProfileError("Your account role could not be loaded. Check your connection and try again.");
          setIsLoading(false);
        },
      );
    });

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, isLoading, profileError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
