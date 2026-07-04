import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { createClient, type SupabaseClient, type User, type Session, type AuthError } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

interface SupabaseAuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string, marketingConsent?: boolean) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    marketingConsent = false,
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    });

    if (!error && data.session) {
      try {
        const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
        await fetch(`${base}/api/account/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({ firstName, lastName, marketingConsent }),
        });
      } catch {
      }
    }

    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <SupabaseAuthContext.Provider value={{
      user,
      session,
      isLoading,
      isAuthenticated: !!user,
      accessToken: session?.access_token ?? null,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth(): SupabaseAuthContextValue {
  const ctx = useContext(SupabaseAuthContext);
  if (!ctx) throw new Error("useSupabaseAuth must be used inside SupabaseAuthProvider");
  return ctx;
}
