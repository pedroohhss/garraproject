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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

      const { data, error: queryError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single()
        .abortSignal(controller.signal);

      clearTimeout(timeout);

      if (queryError) {
        console.error("[Auth] Error fetching profile:", queryError.message);
        setError("Erro ao carregar perfil do usuário. Tente novamente.");
        return null;
      }

      console.log("[Auth] Profile loaded:", { role: data?.role, name: data?.full_name });
      setError(null);
      return data;
    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.error("[Auth] Profile fetch timed out after", AUTH_TIMEOUT_MS, "ms");
        setError("Tempo esgotado ao carregar perfil. Verifique sua conexão.");
      } else {
        console.error("[Auth] Unexpected error fetching profile:", err);
        setError("Erro inesperado ao carregar perfil.");
      }
      return null;
    }
  };

  useEffect(() => {
    // Safety timeout: if loading never resolves, force it
    const safetyTimeout = setTimeout(() => {
      setLoading((current) => {
        if (current) {
          console.error("[Auth] Safety timeout reached — forcing loading to false");
          setError("Tempo esgotado ao carregar autenticação. Recarregue a página.");
          return false;
        }
        return current;
      });
    }, AUTH_TIMEOUT_MS + 2000);

    // 1. Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        console.log("[Auth] onAuthStateChange event:", _event);
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const profileData = await fetchProfile(newSession.user.id);
          setProfile(profileData);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // 2. Then get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log("[Auth] getSession result:", initialSession ? "session found" : "no session");

      // Only process if onAuthStateChange hasn't already handled it
      if (!initializedRef.current) {
        initializedRef.current = true;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          const profileData = await fetchProfile(initialSession.user.id);
          setProfile(profileData);
        }
        setLoading(false);
      }
    }).catch((err) => {
      console.error("[Auth] getSession error:", err);
      setError("Erro ao recuperar sessão.");
      setLoading(false);
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
