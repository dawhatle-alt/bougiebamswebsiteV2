import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Menu, X, Instagram, Facebook, Twitter, ArrowRight, Minus, Plus, Trash2, Loader2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import logoUrl from "@/assets/bougiebams-logo.png";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountEmail, setDiscountEmail] = useState("");
  const [location] = useLocation();
  const { items, totalItems, subtotal, isOpen, setIsOpen, updateQuantity, removeItem } = useCart();

  const handleCheckout = async () => {
    if (items.length === 0 || checkoutLoading) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            variationId: item.product.id,
            quantity: item.quantity,
          })),
          discountCode: discountCode.trim() || undefined,
          email: discountCode.trim() ? discountEmail.trim() || undefined : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "We couldn't start checkout. Please try again.");
      }
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "We couldn't start checkout. Please try again.");
      setCheckoutLoading(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const navLinks = [
    { name: "Shop", path: "/shop" },
    { name: "About", path: "/about" },
    { name: "Learn", path: "/learn" },
    { name: "Events", path: "/events" },
    { name: "Blog", path: "/blog" },
    { name: "FAQ", path: "/faq" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          isScrolled || location !== "/"
            ? "bg-background/90 backdrop-blur-md border-b border-border/50 py-4 shadow-sm"
            : "bg-transparent py-6"
        }`}
      >
        <div className="container mx-auto px-4 md:px-8 flex items-center justify-between">
          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 -ml-2 text-foreground"
            onClick={() => setMobileMenuOpen(true)}
            data-testid="button-mobile-menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Desktop Nav (Left) */}
          <nav className="hidden md:flex items-center gap-8 flex-1">
            {navLinks.slice(0, 3).map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className="text-sm tracking-widest uppercase font-medium hover:text-primary transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Logo (Center) */}
          <Link href="/" className="flex-shrink-0 text-center mx-auto md:mx-0">
            <img src={logoUrl} alt="BougieBams" className="h-16 md:h-20 w-auto object-contain" />
          </Link>

          {/* Desktop Nav & Actions (Right) */}
          <div className="flex items-center justify-end gap-6 flex-1">
            <nav className="hidden md:flex items-center gap-8 mr-4">
              {navLinks.slice(3).map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className="text-sm tracking-widest uppercase font-medium hover:text-primary transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button
                  className="relative p-2 -mr-2 text-foreground hover:text-primary transition-colors"
                  data-testid="button-cart"
                >
                  <ShoppingBag className="w-6 h-6" />
                  {totalItems > 0 && (
                    <span className="absolute top-0 right-0 bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transform translate-x-1/4 -translate-y-1/4">
                      {totalItems}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md flex flex-col border-l-0 p-0 font-sans">
                <SheetHeader className="p-6 border-b border-border">
                  <SheetTitle className="font-serif text-2xl font-medium text-left">Your Cart</SheetTitle>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                      <ShoppingBag className="w-12 h-12 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground font-serif text-xl">Your cart is empty</p>
                      <Button onClick={() => setIsOpen(false)} asChild className="mt-4">
                        <Link href="/shop">Explore Collections</Link>
                      </Button>
                    </div>
                  ) : (
                    items.map((item) => (
                      <div key={item.product.id} className="flex gap-4" data-testid={`cart-item-${item.product.id}`}>
                        <div className="w-24 h-24 bg-muted rounded-md overflow-hidden flex-shrink-0">
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-serif text-lg leading-tight">{item.product.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">${item.product.price}</p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border border-border rounded-sm">
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                className="p-1 hover:bg-muted transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                className="p-1 hover:bg-muted transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <button
                              onClick={() => removeItem(item.product.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors text-sm underline underline-offset-4"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {items.length > 0 && (
                  <div className="p-6 bg-muted/30 border-t border-border mt-auto">
                    <div className="flex justify-between font-serif text-lg mb-2">
                      <span>Subtotal</span>
                      <span>${subtotal}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                      Shipping and taxes calculated at checkout. {subtotal > 150 ? "You qualify for free shipping!" : "Free shipping on orders over $150."}
                    </p>
                    <div className="space-y-2 mb-4">
                      <input
                        type="text"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        placeholder="Discount code"
                        autoComplete="off"
                        autoCapitalize="characters"
                        className="w-full h-11 px-3 text-sm uppercase tracking-widest bg-background border border-border rounded-sm placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        data-testid="input-discount-code"
                      />
                      {discountCode.trim() && (
                        <input
                          type="email"
                          value={discountEmail}
                          onChange={(e) => setDiscountEmail(e.target.value)}
                          placeholder="Email used to claim your offer"
                          autoComplete="email"
                          className="w-full h-11 px-3 text-sm bg-background border border-border rounded-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          data-testid="input-discount-email"
                        />
                      )}
                    </div>
                    {checkoutError && (
                      <p className="text-sm text-destructive mb-4">{checkoutError}</p>
                    )}
                    <Button
                      className="w-full h-12 text-lg"
                      onClick={handleCheckout}
                      disabled={checkoutLoading}
                      data-testid="button-checkout"
                    >
                      {checkoutLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Redirecting to secure checkout…
                        </>
                      ) : (
                        "Proceed to Checkout"
                      )}
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col md:hidden animate-in fade-in zoom-in duration-300">
          <div className="p-6 flex justify-between items-center border-b border-border">
            <img src={logoUrl} alt="BougieBams" className="h-12 w-auto object-contain" />
            <button onClick={() => setMobileMenuOpen(false)} className="p-2">
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex flex-col gap-6 p-8 overflow-y-auto">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className="font-serif text-3xl hover:text-primary transition-colors flex items-center justify-between group"
              >
                {link.name}
                <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </nav>
        </div>
      )}

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-secondary text-secondary-foreground pt-20 pb-10 border-t border-secondary-border">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <Link href="/" className="inline-block mb-6">
                <img src={logoUrl} alt="BougieBams" className="h-20 w-auto object-contain" />
              </Link>
              <p className="text-secondary-foreground/80 max-w-sm mb-8 font-serif text-lg leading-relaxed">
                Where luxury meets the Mahjong table. Premium sets and lifestyle accessories for the modern player.
              </p>
              <div className="flex gap-4">
                <a href="#" className="p-2 bg-background/5 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="p-2 bg-background/5 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="p-2 bg-background/5 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-sans font-semibold tracking-widest uppercase text-sm mb-6 text-primary">Shop</h4>
              <ul className="space-y-4 text-sm">
                <li><Link href="/shop" className="hover:text-primary transition-colors">All Products</Link></li>
                <li><Link href="/shop?category=Complete+Sets" className="hover:text-primary transition-colors">Complete Sets</Link></li>
                <li><Link href="/shop?category=Gift+Sets" className="hover:text-primary transition-colors">Gift Sets</Link></li>
                <li><Link href="/shop?category=Tiles+%26+Accessories" className="hover:text-primary transition-colors">Accessories</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-sans font-semibold tracking-widest uppercase text-sm mb-6 text-primary">Company</h4>
              <ul className="space-y-4 text-sm">
                <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                <li><Link href="/learn" className="hover:text-primary transition-colors">Learn to Play</Link></li>
                <li><Link href="/faq" className="hover:text-primary transition-colors">FAQ & Support</Link></li>
                <li><Link href="/events" className="hover:text-primary transition-colors">Events</Link></li>
                <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>

          <Separator className="bg-secondary-foreground/10 mb-8" />

          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-secondary-foreground/60 gap-4">
            <p>&copy; {new Date().getFullYear()} BougieBams. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
