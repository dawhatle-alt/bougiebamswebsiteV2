import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Menu, X, Instagram, Facebook, ArrowRight, Minus, Plus, Trash2, Loader2, Search, Heart, ChevronDown, CalendarDays, LogIn, LogOut } from "lucide-react";
import ChatWidget from "@/components/ChatWidget";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import SearchDialog from "@/components/SearchDialog";
import { SHOP_CATEGORIES } from "@/data/categories";
import { useProducts } from "@/hooks/useProducts";
import shopMenuImg from "@assets/images/mahjong-lifestyle.png";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@workspace/replit-auth-web";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const logoUrl = `${import.meta.env.BASE_URL}bougiebams-logo-transparent.png`;

type SubItem = { href: string; label: string };
type NavItem = { id: string; href: string; name: string; subItems?: SubItem[] };

const leftLinks: NavItem[] = [
  { id: "shop", href: "/shop", name: "Shop" },
  {
    id: "about", href: "/about", name: "Community",
    subItems: [
      { href: "/about", label: "About Bougie Bams" },
      { href: "/founder", label: "Meet the Founder" },
      { href: "/learn", label: "Learn to Play" },
    ],
  },
  { id: "events", href: "/events", name: "Events" },
];

const rightLinks: NavItem[] = [
  { id: "favorites", href: "/favorites", name: "Favorites" },
  { id: "blog", href: "/blog", name: "Journal" },
  { id: "contact", href: "/contact", name: "Contact" },
];

const allLinks = [...leftLinks, ...rightLinks];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountEmail, setDiscountEmail] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [shopMenuOpen, setShopMenuOpen] = useState(false);
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [aboutMenuOpen, setAboutMenuOpen] = useState(false);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  const shopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aboutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openShopMenu = () => {
    if (shopTimer.current) clearTimeout(shopTimer.current);
    setShopMenuOpen(true);
  };
  const closeShopMenu = () => {
    shopTimer.current = setTimeout(() => setShopMenuOpen(false), 120);
  };

  const openAboutMenu = () => {
    if (aboutTimer.current) clearTimeout(aboutTimer.current);
    setAboutMenuOpen(true);
  };
  const closeAboutMenu = () => {
    aboutTimer.current = setTimeout(() => setAboutMenuOpen(false), 150);
  };

  const [location] = useLocation();
  const { products } = useProducts();
  const { user, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();

  const shopGroups = useMemo(
    () =>
      SHOP_CATEGORIES.map((cat) => ({
        ...cat,
        items: products.filter((p) => p.category === cat.name).slice(0, 6),
      })),
    [products],
  );
  const { items, totalItems, subtotal, isOpen, setIsOpen, updateQuantity, removeItem, addItem } = useCart();
  const {
    items: wishItems,
    count: wishCount,
    isOpen: wishlistOpen,
    setIsOpen: setWishlistOpen,
    remove: removeWish,
  } = useWishlist();

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : "";

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
            name: item.product.name,
            price: item.product.price,
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
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setShopMenuOpen(false);
    setAboutMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (!shopMenuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShopMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shopMenuOpen]);

  function renderNavLink(link: NavItem) {
    const isHovered = hoveredId === link.id;
    const isActive = location === link.href || (link.subItems?.some(s => s.href === location) ?? false);

    if (link.id === "shop") {
      return (
        <div
          key={link.id}
          className="relative"
          onMouseEnter={() => { setHoveredId(link.id); openShopMenu(); }}
          onMouseLeave={() => { setHoveredId(null); closeShopMenu(); }}
          onFocus={openShopMenu}
        >
          <Link
            href={link.href}
            aria-haspopup="true"
            aria-expanded={shopMenuOpen}
            className={`relative z-10 flex items-center gap-1 px-3 py-2 rounded-xl text-sm tracking-widest uppercase font-medium transition-colors duration-200 ${
              isHovered ? "text-[#FAF8F5]" : isActive ? "text-primary" : "text-foreground hover:text-primary"
            }`}
          >
            {link.name}
            <span className="ml-1 text-[9px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full leading-none">Soon</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${shopMenuOpen ? "rotate-180" : ""}`} />
          </Link>
          <AnimatePresence>
            {isHovered && (
              <motion.div
                layoutId="nav-highlight"
                className="absolute inset-0 rounded-xl -z-0"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1.05 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                style={{
                  background: "linear-gradient(135deg, #181D37 0%, #252c55 100%)",
                  boxShadow: "0 8px 30px rgba(201,162,39,0.25), 0 4px 12px rgba(24,29,55,0.5), 0 0 0 1px rgba(201,162,39,0.2)",
                }}
              />
            )}
          </AnimatePresence>
        </div>
      );
    }

    if (link.id === "about") {
      return (
        <div
          key={link.id}
          className="relative"
          onMouseEnter={() => { setHoveredId(link.id); openAboutMenu(); }}
          onMouseLeave={() => { setHoveredId(null); closeAboutMenu(); }}
        >
          <Link
            href={link.href}
            className={`relative z-10 flex items-center gap-1 px-3 py-2 rounded-xl text-sm tracking-widest uppercase font-medium transition-colors duration-200 ${
              isHovered ? "text-[#FAF8F5]" : isActive ? "text-primary" : "text-foreground hover:text-primary"
            }`}
          >
            {link.name}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${aboutMenuOpen ? "rotate-180" : ""}`} />
          </Link>
          <AnimatePresence>
            {isHovered && (
              <motion.div
                layoutId="nav-highlight"
                className="absolute inset-0 rounded-xl -z-0"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1.05 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                style={{
                  background: "linear-gradient(135deg, #181D37 0%, #252c55 100%)",
                  boxShadow: "0 8px 30px rgba(201,162,39,0.25), 0 4px 12px rgba(24,29,55,0.5), 0 0 0 1px rgba(201,162,39,0.2)",
                }}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {aboutMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-1 w-52 rounded-xl overflow-hidden shadow-xl border border-border/30 bg-background z-50"
                onMouseEnter={openAboutMenu}
                onMouseLeave={closeAboutMenu}
              >
                {link.subItems!.map(sub => (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`block px-4 py-3 text-sm font-medium transition-colors hover:bg-muted ${
                      location === sub.href ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {sub.label}
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <div
        key={link.id}
        className="relative"
        onMouseEnter={() => setHoveredId(link.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <Link
          href={link.href}
          onMouseEnter={link.id !== "about" ? closeShopMenu : undefined}
          className={`relative z-10 flex items-center px-3 py-2 rounded-xl text-sm tracking-widest uppercase font-medium transition-colors duration-200 whitespace-nowrap ${
            isHovered ? "text-[#FAF8F5]" : isActive ? "text-primary" : "text-foreground hover:text-primary"
          }`}
        >
          {link.name}
        </Link>
        <AnimatePresence>
          {isHovered && (
            <motion.div
              layoutId="nav-highlight"
              className="absolute inset-0 rounded-xl -z-0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1.05 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              style={{
                background: "linear-gradient(135deg, #181D37 0%, #252c55 100%)",
                boxShadow: "0 8px 30px rgba(201,162,39,0.25), 0 4px 12px rgba(24,29,55,0.5), 0 0 0 1px rgba(201,162,39,0.2)",
              }}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <div className="fixed top-0 inset-x-0 z-50">
        {!announcementDismissed && (
          <div className="relative bg-primary text-primary-foreground text-center text-[11px] md:text-xs tracking-[0.2em] uppercase py-1.5 px-10 font-medium leading-tight">
            Complimentary shipping on all orders over $150
            <button
              onClick={() => setAnnouncementDismissed(true)}
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Dismiss announcement"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <header
          className="relative w-full bg-background border-b border-border/40 py-4 shadow-sm"
        >
          <div className="container mx-auto px-4 md:px-8 relative flex items-center">
            <button
              className="md:hidden p-2 -ml-2 text-foreground"
              onClick={() => setMobileMenuOpen(true)}
              data-testid="button-mobile-menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Left nav: flex-1, right-aligned toward the logo */}
            <nav className="hidden md:flex flex-1 items-center justify-end gap-1 pr-16">
              {leftLinks.map(link => renderNavLink(link))}
            </nav>

            {/* Logo — absolutely centered */}
            <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex-shrink-0">
              <img src={logoUrl} alt="BougieBams" className="h-14 md:h-16 w-auto object-contain" />
            </Link>

            {/* Right nav + icons: flex-1, nav left-aligned toward logo, icons pinned far right */}
            <div className="ml-auto md:flex-1 flex items-center md:justify-between gap-4">
              <nav className="hidden md:flex items-center gap-1 pl-16">
                {rightLinks.map(link => renderNavLink(link))}
              </nav>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 text-foreground hover:text-primary transition-colors"
                  aria-label="Search"
                  data-testid="button-search"
                >
                  <Search className="w-6 h-6" />
                </button>

                {/* Auth avatar */}
                {!authLoading && isAuthenticated && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <Avatar className="h-8 w-8">
                          {user?.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={user.firstName ?? "User"} />}
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <div className="px-3 py-2 text-sm font-medium truncate">
                        {user?.firstName} {user?.lastName}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/my-events" className="flex items-center gap-2 cursor-pointer">
                          <CalendarDays className="h-4 w-4" />
                          My Events
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                        <LogOut className="h-4 w-4" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {!authLoading && !isAuthenticated && (
                  <button
                    onClick={login}
                    className="hidden md:flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
                    aria-label="Sign in"
                  >
                    <LogIn className="w-5 h-5" />
                    <span className="text-xs tracking-widest uppercase">Sign In</span>
                  </button>
                )}

                <Sheet open={wishlistOpen} onOpenChange={setWishlistOpen}>
                  <SheetTrigger asChild>
                    <button
                      className="relative p-2 text-foreground hover:text-primary transition-colors"
                      aria-label="Wishlist"
                      data-testid="button-wishlist"
                    >
                      <Heart className="w-6 h-6" />
                      {wishCount > 0 && (
                        <span className="absolute top-0 right-0 bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transform translate-x-1/4 -translate-y-1/4">
                          {wishCount}
                        </span>
                      )}
                    </button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-md flex flex-col border-l-0 p-0 font-sans">
                    <SheetHeader className="p-6 border-b border-border">
                      <SheetTitle className="font-serif text-2xl font-medium text-left">Your Wishlist</SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {wishItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                          <Heart className="w-12 h-12 text-muted-foreground opacity-50" />
                          <p className="text-muted-foreground font-serif text-xl">Your wishlist is empty</p>
                          <Button onClick={() => setWishlistOpen(false)} asChild className="mt-4">
                            <Link href="/shop">Explore Collections</Link>
                          </Button>
                        </div>
                      ) : (
                        wishItems.map((product) => (
                          <div key={product.id} className="flex gap-4" data-testid={`wishlist-item-${product.id}`}>
                            <Link
                              href={`/shop/${product.id}`}
                              onClick={() => setWishlistOpen(false)}
                              className="w-24 h-24 bg-muted rounded-md overflow-hidden flex-shrink-0"
                            >
                              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                            </Link>
                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <Link href={`/shop/${product.id}`} onClick={() => setWishlistOpen(false)}>
                                  <h4 className="font-serif text-lg leading-tight hover:text-primary transition-colors">{product.name}</h4>
                                </Link>
                                <p className="text-sm text-muted-foreground mt-1">${product.price}</p>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <button
                                  onClick={() => { setWishlistOpen(false); addItem(product); removeWish(product.id); }}
                                  className="text-sm text-primary hover:underline underline-offset-4"
                                >
                                  Add to cart
                                </button>
                                <button
                                  onClick={() => removeWish(product.id)}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                  aria-label="Remove from wishlist"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </SheetContent>
                </Sheet>

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
                              <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <h4 className="font-serif text-lg leading-tight">{item.product.name}</h4>
                                <p className="text-sm text-muted-foreground mt-1">${item.product.price}</p>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center border border-border rounded-sm">
                                  <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1 hover:bg-muted transition-colors">
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                                  <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1 hover:bg-muted transition-colors">
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                                <button onClick={() => removeItem(item.product.id)} className="text-muted-foreground hover:text-destructive transition-colors text-sm underline underline-offset-4">
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
                          {subtotal > 150 ? "You qualify for free shipping!" : "Free shipping on orders over $150."}
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
                        {checkoutError && <p className="text-sm text-destructive mb-4">{checkoutError}</p>}
                        <Button
                          className="w-full h-12 text-lg"
                          onClick={handleCheckout}
                          disabled={checkoutLoading}
                          data-testid="button-checkout"
                        >
                          {checkoutLoading ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Redirecting to secure checkout…</>
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
          </div>

          {/* Shop megamenu */}
          {shopMenuOpen && (
            <div
              onMouseEnter={openShopMenu}
              onMouseLeave={closeShopMenu}
              className="absolute left-0 top-full w-full bg-background border-t border-border shadow-xl hidden md:block animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="container mx-auto px-4 md:px-8 py-10">
                <div className="grid grid-cols-12 gap-10">
                  <div className="col-span-8 grid grid-cols-4 gap-8 content-start">
                    {shopGroups.map((cat) => (
                      <div key={cat.name}>
                        <Link
                          href={`/shop?category=${encodeURIComponent(cat.name)}`}
                          onClick={() => setShopMenuOpen(false)}
                          className="text-xs tracking-[0.2em] uppercase text-primary font-semibold hover:opacity-80 transition-opacity"
                        >
                          {cat.name}
                        </Link>
                        <ul className="mt-4 space-y-2.5">
                          <li>
                            <Link
                              href={`/shop?category=${encodeURIComponent(cat.name)}`}
                              onClick={() => setShopMenuOpen(false)}
                              className="text-sm text-foreground hover:text-primary transition-colors"
                            >
                              Shop All
                            </Link>
                          </li>
                          {cat.items.map((p) => (
                            <li key={p.id}>
                              <Link
                                href={`/shop/${p.id}`}
                                onClick={() => setShopMenuOpen(false)}
                                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                              >
                                {p.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="col-span-4">
                    <Link
                      href="/build"
                      onClick={() => setShopMenuOpen(false)}
                      className="relative block overflow-hidden rounded-md group h-full min-h-[220px]"
                    >
                      <img src={shopMenuImg} alt="Build your own mahjong set" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-6 text-white">
                        <span className="text-[11px] tracking-[0.2em] uppercase text-white/80">New</span>
                        <p className="font-serif text-2xl mt-1">Build Your Set</p>
                        <span className="inline-flex items-center gap-1 text-sm text-white/90 mt-1">
                          Start customizing <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </header>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col md:hidden animate-in fade-in zoom-in duration-300">
          <div className="p-6 flex justify-between items-center border-b border-border">
            <img src={logoUrl} alt="BougieBams" className="h-12 w-auto object-contain" />
            <button onClick={() => setMobileMenuOpen(false)} className="p-2">
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex flex-col gap-6 p-8 overflow-y-auto">
            <button
              onClick={() => setMobileShopOpen((v) => !v)}
              aria-expanded={mobileShopOpen}
              className="font-serif text-3xl hover:text-primary transition-colors flex items-center justify-between text-left"
            >
              <span className="flex items-center gap-2">
                Shop
                <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full leading-none font-sans">Soon</span>
              </span>
              <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${mobileShopOpen ? "rotate-180 text-primary" : ""}`} />
            </button>
            {mobileShopOpen && (
              <div className="flex flex-col gap-3 -mt-2 pl-4 border-l border-border animate-in fade-in slide-in-from-top-1 duration-200">
                <Link href="/shop" className="font-sans text-base text-muted-foreground hover:text-primary transition-colors">
                  Shop All
                </Link>
                {SHOP_CATEGORIES.map((cat) => (
                  <Link
                    key={cat.name}
                    href={`/shop?category=${encodeURIComponent(cat.name)}`}
                    className="font-sans text-base text-muted-foreground hover:text-primary transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
            <Link href="/about" className="font-serif text-3xl hover:text-primary transition-colors">Community</Link>
            <div className="flex flex-col gap-3 -mt-2 pl-4 border-l border-border">
              <Link href="/about" className="font-sans text-base text-muted-foreground hover:text-primary transition-colors">About Bougie Bams</Link>
              <Link href="/founder" className="font-sans text-base text-muted-foreground hover:text-primary transition-colors">Meet the Founder</Link>
              <Link href="/learn" className="font-sans text-base text-muted-foreground hover:text-primary transition-colors">Learn to Play</Link>
            </div>
            <Link href="/events" className="font-serif text-3xl hover:text-primary transition-colors">Events</Link>
            <Link href="/blog" className="font-serif text-3xl hover:text-primary transition-colors">Journal</Link>
            <Link href="/favorites" className="font-serif text-3xl hover:text-primary transition-colors">Favorites</Link>
            <Link href="/contact" className="font-serif text-3xl hover:text-primary transition-colors">Contact</Link>
            {isAuthenticated ? (
              <>
                <Link href="/my-events" className="font-serif text-3xl hover:text-primary transition-colors flex items-center gap-3">
                  <CalendarDays className="w-7 h-7" />
                  My Events
                </Link>
                <button
                  onClick={logout}
                  className="font-serif text-2xl text-destructive hover:opacity-80 transition-opacity text-left flex items-center gap-3"
                >
                  <LogOut className="w-6 h-6" />
                  Log out
                </button>
              </>
            ) : (
              <button
                onClick={login}
                className="font-serif text-2xl hover:text-primary transition-colors text-left flex items-center gap-3"
              >
                <LogIn className="w-6 h-6" />
                Sign In
              </button>
            )}
          </nav>
        </div>
      )}

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      <main className="pt-[calc(theme(spacing.2)+theme(spacing.8)+theme(spacing.8))] md:pt-[calc(theme(spacing.2)+theme(spacing.8)+theme(spacing.12))]">
        {children}
      </main>

      <footer className="bg-foreground text-background py-16 mt-auto">
        <div className="container mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <img src={`${import.meta.env.BASE_URL}bougiebams-logo-transparent.png`} alt="BougieBams" className="h-24 w-auto mb-6" />
            <p className="text-muted text-sm leading-relaxed max-w-sm mb-6">
              A luxury, intimate mahjong community for everyone. Curated gatherings, rich connections, and elevated experiences.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <a href="https://instagram.com/bougiebams" target="_blank" rel="noopener noreferrer" aria-label="Follow on Instagram"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/40 text-sm text-primary hover:bg-primary hover:text-foreground transition-colors">
                <Instagram className="w-4 h-4" />
                @bougiebams
              </a>
              <a href="https://facebook.com/bougiebams" target="_blank" rel="noopener noreferrer" aria-label="Follow on Facebook"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/40 text-sm text-primary hover:bg-primary hover:text-foreground transition-colors">
                <Facebook className="w-4 h-4" />
                @bougiebams
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-serif text-lg mb-4 text-primary">Explore</h4>
            <ul className="space-y-3 text-sm text-muted">
              <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/shop" className="hover:text-primary transition-colors">Shop</Link></li>
              <li><Link href="/events" className="hover:text-primary transition-colors">Events</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/founder" className="hover:text-primary transition-colors">Meet the Founder</Link></li>
              <li><Link href="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-serif text-lg mb-4 text-primary">Connect</h4>
            <ul className="space-y-3 text-sm text-muted">
              <li><a href="https://instagram.com/bougiebams" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Instagram · @bougiebams</a></li>
              <li><a href="https://facebook.com/bougiebams" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Facebook · @bougiebams</a></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-8 mt-12 pt-8 border-t border-muted/20 text-sm text-muted/60 text-center">
          &copy; {new Date().getFullYear()} Bougie Bams. All rights reserved.
        </div>
      </footer>
      <ChatWidget />
    </div>
  );
}
