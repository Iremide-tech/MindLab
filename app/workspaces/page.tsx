"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardHome, { type DashboardHomeMap } from "@/components/DashboardHome";
import { createClient } from "@/lib/supabase/client";

let supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!supabaseClient) supabaseClient = createClient();
  return supabaseClient;
}

export default function WorkspacesPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [savedMaps, setSavedMaps] = useState<DashboardHomeMap[]>([]);
  const [loadingMaps, setLoadingMaps] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await getSupabase().auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      if (!active) return;
      setUserEmail(user.email ?? null);

      const { data, error } = await getSupabase()
        .from("research_maps")
        .select("id, title, nodes, created_at")
        .order("created_at", { ascending: false });

      if (!active) return;
      if (error) {
        console.error("Failed to load maps:", error.message);
        setSavedMaps([]);
      } else {
        setSavedMaps((data as DashboardHomeMap[]) ?? []);
      }
      setLoadingMaps(false);
    }

    void load();

    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_event, session) => {
      if (!session?.user) router.replace("/login");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleLogout() {
    await getSupabase().auth.signOut();
    router.replace("/login");
  }

  function handleCreate() {
    router.push("/dashboard");
  }

  function handleOpen(map: DashboardHomeMap) {
    router.push(`/dashboard?map=${encodeURIComponent(map.id)}`);
  }

  return (
    <DashboardHome
      userEmail={userEmail}
      loadingMaps={loadingMaps}
      savedMaps={savedMaps}
      onCreate={handleCreate}
      onOpen={handleOpen}
      onLogout={() => void handleLogout()}
    />
  );
}
