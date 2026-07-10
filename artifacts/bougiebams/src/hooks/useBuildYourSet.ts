import { useQuery } from "@tanstack/react-query";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// Admin-controlled visibility for the Build Your Set experience. Returns
// undefined while the setting is loading; callers treat that as hidden so a
// section the owner has turned off never flashes on screen.
export function useBuildYourSetEnabled(): boolean | undefined {
  const { data } = useQuery<{ enabled: boolean }>({
    queryKey: ["build-your-set-enabled"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/build-your-set`);
      if (!res.ok) return { enabled: true };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  return data?.enabled;
}
