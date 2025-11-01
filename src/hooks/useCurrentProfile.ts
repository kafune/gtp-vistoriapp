import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type UserRole = "admin" | "sindico" | string;

interface CurrentProfile {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
}

export const useCurrentProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      if (!user) {
        if (isMounted) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, role")
        .eq("id", user.id)
        .single();

      if (!isMounted) return;

      if (error) {
        console.error("Erro ao buscar perfil do usuário:", error);
        setError(error.message);
      } else {
        setProfile(data as CurrentProfile);
        setError(null);
      }
      setLoading(false);
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const role = profile?.role as UserRole | undefined;
  const isSindico = role === "sindico";
  const isAdmin = role === "admin";

  return { profile, role, isSindico, isAdmin, loading, error } as const;
};
