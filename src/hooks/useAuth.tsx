import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string | null;
  group_id: string | null;
  is_active: boolean | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

const AUTH_TIMEOUT_MS = 8000;

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  error: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    console.log("[Auth] Fetching profile for user:", userId);
    try {
      const queryPromise = supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), AUTH_TIMEOUT_MS)
      );

      const { data, error: queryError } = await Promise.race([queryPromise, timeoutPromise]);

      if (queryError) {
        console.error("[Auth] Error fetching profile:", queryError.message);
        return null;
      }

      console.log("[Auth] Profile loaded:", { role: data?.role, name: data?.full_name });
      return data;
    } catch (err: any) {
      if (err?.message === "TIMEOUT") {
        console.error("[Auth] Profile fetch timed out");
      } else {
        console.error("[Auth] Unexpected error fetching profile:", err);
      }
      return null;
    }
  };

  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (!initializedRef.current) {
        console.error("[Auth] Safety timeout reached");
        initializedRef.current = true;
        setError("Tempo esgotado ao carregar autenticação. Recarregue a página.");
        setLoading(false);
      }
    }, AUTH_TIMEOUT_MS + 2000);

    // Set up listener FIRST, but don't process INITIAL_SESSION here — let getSession handle it
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("[Auth] onAuthStateChange event:", event);

        // Skip INITIAL_SESSION — getSession handles initialization
        if (event === "INITIAL_SESSION") return;

        // For TOKEN_REFRESHED, just update session/user without re-fetching profile
        if (event === "TOKEN_REFRESHED") {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          return;
        }

        // For SIGNED_OUT
        if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          setProfile(null);
          setError(null);
          setLoading(false);
          return;
        }

        // For SIGNED_IN and other events
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const profileData = await fetchProfile(newSession.user.id);
          if (profileData) {
            setProfile(profileData);
            setError(null);
          }
          // Only set error if we don't already have a profile loaded
          // (avoids overwriting good state from getSession)
          if (!profileData && !profile) {
            setError("Erro ao carregar perfil do usuário.");
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log("[Auth] getSession result:", initialSession ? "session found" : "no session");

      if (initializedRef.current) return;
      initializedRef.current = true;

      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        const profileData = await fetchProfile(initialSession.user.id);
        setProfile(profileData);
        if (!profileData) {
          setError("Erro ao carregar perfil do usuário.");
        }
      }
      setLoading(false);
    }).catch((err) => {
      console.error("[Auth] getSession error:", err);
      if (!initializedRef.current) {
        initializedRef.current = true;
        setError("Erro ao recuperar sessão.");
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
