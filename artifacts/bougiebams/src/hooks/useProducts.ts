import { useState, useEffect } from "react";
import { Product, ApiProduct, mergeProduct, localProducts } from "@/data/products";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseProductResult {
  product: Product | null;
  loading: boolean;
  error: string | null;
}

let cache: Product[] | null = null;
let cachePromise: Promise<Product[]> | null = null;

async function fetchProducts(): Promise<Product[]> {
  if (cache) return cache;
  if (!cachePromise) {
    cachePromise = fetch(`${API_BASE}/api/products`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load products");
        return res.json();
      })
      .then((data: { products: ApiProduct[] }) => {
        const apiItems = data.products ?? [];
        const merged = apiItems.length > 0
          ? apiItems.map(mergeProduct)
          : localProducts;
        cache = merged;
        return merged;
      })
      .catch((err) => {
        cachePromise = null;
        cache = localProducts;
        return localProducts;
      });
  }
  return cachePromise;
}

export function useProducts(): UseProductsResult {
  const [products, setProducts] = useState<Product[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (cache) {
      setProducts(cache);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchProducts()
      .then((p) => {
        if (!cancelled) { setProducts(p); setLoading(false); }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load products");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [tick]);

  const refetch = () => {
    cache = null;
    cachePromise = null;
    setTick((t) => t + 1);
  };

  return { products, loading, error, refetch };
}

export function useProduct(id: string | undefined): UseProductResult {
  const { products, loading, error } = useProducts();
  const product = id ? products.find((p) => p.id === id) ?? null : null;
  return { product, loading, error };
}
