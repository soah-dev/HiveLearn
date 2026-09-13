'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onIdTokenChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { registerTokenRefresher } from '@/lib/api';

interface AuthUser {
  id: string;
  firebaseUid: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string | null;
  satEnabled: boolean;
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: AuthUser | null;
  loading: boolean;
  token: string | null;
  getToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUidRef = useRef<string | null>(null);

  const fetchUser = async (idToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  const loginToBackend = async (idToken: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    } else {
      throw new Error('Failed to connect to server. Please try again.');
    }
  };

  useEffect(() => {
    // Let apiFetch mint a fresh token on 401 no matter how the caller passed it
    registerTokenRefresher(() => (auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(null)));

    // onIdTokenChanged also fires when the SDK refreshes the hourly token, so
    // the `token` state stays current for pages that captured it as a string.
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const idToken = await fbUser.getIdToken();
        setToken(idToken);
        if (lastUidRef.current !== fbUser.uid) {
          lastUidRef.current = fbUser.uid;
          await fetchUser(idToken);
        }
      } else {
        lastUidRef.current = null;
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      registerTokenRefresher(null);
    };
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    setToken(idToken);
    await loginToBackend(idToken);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await result.user.getIdToken();
    setToken(idToken);
    await loginToBackend(idToken);
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(result.user, { displayName: name });
    }
    const idToken = await result.user.getIdToken();
    setToken(idToken);
    await loginToBackend(idToken);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setToken(null);
  };

  const getToken = async (): Promise<string | null> => {
    if (firebaseUser) {
      const freshToken = await firebaseUser.getIdToken();
      setToken(freshToken);
      return freshToken;
    }
    return null;
  };

  const refreshUser = async () => {
    const fresh = await getToken();
    if (fresh) {
      await fetchUser(fresh);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        loading,
        token,
        getToken,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
