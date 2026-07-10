import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AUTH_CLEARED_EVENT, AUTH_TOKEN_KEY, AUTH_USER_KEY } from "@/services/api";
import { getCurrentUser, loginUser, logoutUser, registerUser, updateMyProfile } from "@/services/auth.service";
import type { AuthResponse, LoginPayload, RegisterPayload, User, UserProfileUpdatePayload, UserRole } from "@/types/user";
import { ROUTES } from "@/lib/routes";
import { LoadingPage } from "@/components/LoadingScreen";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthResponse>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
  updateProfile: (payload: UserProfileUpdatePayload) => Promise<User>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function getDashboardPath(role: UserRole): string {
  const destinations: Record<UserRole, string> = {
    student: ROUTES.STUDENT.DASHBOARD,
    instructor: ROUTES.INSTRUCTOR.DASHBOARD,
    admin: ROUTES.ADMIN.DASHBOARD,
  };

  return destinations[role];
}

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = useCallback(() => {
    logoutUser();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!storedToken) {
      clearAuth();
      return null;
    }

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setToken(storedToken);
      return currentUser;
    } catch {
      clearAuth();
      return null;
    }
  }, [clearAuth]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!storedToken) {
        clearAuth();
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
          setToken(storedToken);
        }
      } catch {
        if (isMounted) {
          clearAuth();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [clearAuth]);

  useEffect(() => {
    function handleAuthCleared() {
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }

    window.addEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
    return () => window.removeEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await loginUser(payload);
    setToken(response.access_token);
    setUser(response.user);
    return response;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    return registerUser(payload);
  }, []);

  const updateProfile = useCallback(async (payload: UserProfileUpdatePayload) => {
    const updatedUser = await updateMyProfile(payload);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      register,
      logout: clearAuth,
      refreshUser,
      updateProfile,
    }),
    [clearAuth, isLoading, login, refreshUser, register, token, updateProfile, user],
  );

  if (isLoading) {
    return <LoadingPage />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
