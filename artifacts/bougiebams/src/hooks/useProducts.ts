import { useEffect, useState } from "react";
import { ApiProduct, Product, mergeProduct } from "@/data/products";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch(`${API_BASE}/api/products`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load products");
        }
        return (data.products ?? []) as ApiProduct[];
      })
      .then((apiProducts) => {
        if (!active) return;
        setProducts(apiProducts.map(mergeProduct));
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load products");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { products, loading, error };
}
