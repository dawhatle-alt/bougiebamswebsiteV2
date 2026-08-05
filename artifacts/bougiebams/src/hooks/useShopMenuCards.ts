import { useQuery } from "@tanstack/react-query";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// Owner-uploaded images for the two Shop megamenu promo cards. Null means the
// card falls back to the bundled lifestyle photo, so the menu always renders.
export interface ShopMenuCards {
  tablescape: string | null;
  buildYourSet: string | null;
}

export function useShopMenuCards(): ShopMenuCards {
  const { data } = useQuery<ShopMenuCards>({
    queryKey: ["shop-menu-cards"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/shop-menu-cards`);
      if (!res.ok) return { tablescape: null, buildYourSet: null };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const toUrl = (p: string | null | undefined) => (p ? `${API_BASE}/api/storage${p}` : null);
  return {
    tablescape: toUrl(data?.tablescape),
    buildYourSet: toUrl(data?.buildYourSet),
  };
}
