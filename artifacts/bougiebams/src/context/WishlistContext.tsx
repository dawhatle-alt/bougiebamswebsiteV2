import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Product } from "@/data/products";

interface WishlistContextType {
  items: Product[];
  toggle: (product: Product) => void;
  remove: (productId: string) => void;
  isSaved: (productId: string) => boolean;
  clear: () => void;
  count: number;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bougiebams_wishlist");
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load wishlist", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("bougiebams_wishlist", JSON.stringify(items));
  }, [items]);

  const toggle = (product: Product) => {
    setItems((current) =>
      current.some((p) => p.id === product.id)
        ? current.filter((p) => p.id !== product.id)
        : [...current, product]
    );
  };

  const remove = (productId: string) => {
    setItems((current) => current.filter((p) => p.id !== productId));
  };

  const isSaved = (productId: string) => items.some((p) => p.id === productId);

  const clear = () => setItems([]);

  const count = items.length;

  return (
    <WishlistContext.Provider
      value={{ items, toggle, remove, isSaved, clear, count, isOpen, setIsOpen }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
