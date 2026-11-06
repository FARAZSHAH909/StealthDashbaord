"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "../firebase/client";
import { ROLES, hasPermission } from "./rbac";

const AuthContext = createContext({
  user: null,
  role: null,
  loading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
  sendResetPassword: async () => {},
  sendVerification: async () => {},
  checkPermission: () => false,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Monitor auth state and decode custom claims
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          // Force refresh token to get latest custom claims
          const idTokenResult = await firebaseUser.getIdTokenResult(true);
          const assignedRole = idTokenResult.claims.role || null;
          
          if (typeof document !== "undefined" && !document.cookie.includes("admin_session=")) {
            document.cookie = `admin_session=sess_${firebaseUser.uid}_${Date.now()}; path=/; max-age=86400; SameSite=Lax`;
          }

          try {
            await fetch("/api/auth/verify-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken: idTokenResult.token }),
            });
          } catch (e) {}

          setUser(firebaseUser);
          setRole(assignedRole);
        } catch (err) {
          setUser(firebaseUser);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      // 1. Verify brute force lockout status via API
      const lockoutCheck = await fetch("/api/auth/progressive-lockout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", identifier: email }),
      });
      const lockoutData = await lockoutCheck.json();
      if (lockoutData.locked) {
        throw new Error(`Account temporarily locked due to excessive failed attempts. Please retry in ${lockoutData.remainingSeconds}s.`);
      }

      // 2. Perform Firebase Auth with auto-sync fallback
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (authErr) {
        if (authErr.code === "auth/invalid-credential" || authErr.code === "auth/user-not-found") {
          // Attempt automatic provisioning if account is verified in Cloud Firestore
          const syncRes = await fetch("/api/auth/sync-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const syncData = await syncRes.json();
          if (syncData.provisioned) {
            // Re-attempt sign in immediately with newly provisioned credentials
            userCredential = await signInWithEmailAndPassword(auth, email, password);
          } else {
            throw authErr;
          }
        } else {
          throw authErr;
        }
      }
      
      // 3. Clear failed attempts on success
      await fetch("/api/auth/progressive-lockout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "success", identifier: email }),
      });

      // 4. Verify custom claims and issue server session cookie
      const idTokenResult = await userCredential.user.getIdTokenResult(true);
      const assignedRole = idTokenResult.claims.role;

      if (typeof document !== "undefined") {
        document.cookie = `admin_session=sess_${userCredential.user.uid}_${Date.now()}; path=/; max-age=86400; SameSite=Lax`;
      }

      try {
        await fetch("/api/auth/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: idTokenResult.token }),
        });
      } catch (sessionErr) {
      }

      setUser(userCredential.user);
      setRole(assignedRole || null);
      return { success: true, user: userCredential.user, role: assignedRole };
    } catch (err) {
      // Record failed attempt
      try {
        await fetch("/api/auth/progressive-lockout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "fail", identifier: email }),
        });
      } catch (recordErr) {}

      let message = "Invalid email or password.";
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        message = "Invalid administrator credentials. If you haven't completed enrollment with your invitation key yet, please register first at /register.";
      } else if (err.code === "auth/wrong-password") {
        message = "Incorrect password. Please verify your credentials or click 'Forgot password?'.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many failed attempts. Temporary access restriction applied.";
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      try {
        await fetch("/api/auth/verify-session", { method: "DELETE" });
      } catch {}
      if (typeof document !== "undefined") {
        document.cookie = "admin_session=; path=/; max-age=0";
        document.cookie = "__Secure-AdminSession=; path=/; max-age=0";
      }
      await signOut(auth);
      setUser(null);
      setRole(null);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const sendResetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const sendVerification = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    return { success: false, error: "No user currently logged in." };
  };

  const checkPermission = useCallback(
    (permission) => {
      return hasPermission(role, permission);
    },
    [role]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        error,
        login,
        logout,
        sendResetPassword,
        sendVerification,
        checkPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

