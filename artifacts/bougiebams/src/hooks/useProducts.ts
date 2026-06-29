import { useListProducts } from "@workspace/api-client-react";
import { Product, ApiProduct, mergeProduct, localProducts } from "@/data/products";

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

export function useProducts(): UseProductsResult {
  const { data, isLoading, isError, error, refetch } = useListProducts();

  const apiItems = data?.products ?? [];
  const products: Product[] = isLoading
    ? []
    : isError
      ? localProducts
      : apiItems.map((p) => mergeProduct(p as unknown as ApiProduct));

  return {
    products,
    loading: isLoading,
    error: isError ? (error instanceof Error ? error.message : "Failed to load products") : null,
    refetch,
  };
}

export function useProduct(id: string | undefined): UseProductResult {
  const { products, loading, error } = useProducts();
  const product = id ? (products.find((p) => p.id === id) ?? null) : null;
  return { product, loading, error };
}
