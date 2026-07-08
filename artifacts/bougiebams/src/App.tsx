import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { setPageMeta } from "@/hooks/usePageTitle";
import { AnimatePresence, motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { SupabaseAuthProvider } from "@/context/SupabaseAuthContext";

import Layout from "@/components/Layout";
import WelcomeOfferDialog from "@/components/WelcomeOfferDialog";
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import ProductDetail from "@/pages/ProductDetail";
import BuildYourSet from "@/pages/BuildYourSet";
import About from "@/pages/About";
import Founder from "@/pages/Founder";
import Learn from "@/pages/Learn";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import Faq from "@/pages/Faq";
import Events from "@/pages/Events";
import EventDetail from "@/pages/EventDetail";
import MyEvents from "@/pages/MyEvents";
import MyOrders from "@/pages/MyOrders";
import EventConfirmation from "@/pages/EventConfirmation";
import Favorites from "@/pages/Favorites";
import Contact from "@/pages/Contact";
import CheckoutConfirmation from "@/pages/CheckoutConfirmation";
import Admin from "@/pages/Admin";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ResetPassword from "@/pages/ResetPassword";
import Account from "@/pages/Account";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

const pageVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.38, ease } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.22, ease } },
};

function AnimatedRoutes() {
  const [location] = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ width: "100%" }}
      >
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/shop" component={Shop} />
          <Route path="/shop/:id" component={ProductDetail} />
          <Route path="/build" component={BuildYourSet} />
          <Route path="/build-your-set" component={BuildYourSet} />
          <Route path="/about" component={About} />
          <Route path="/founder" component={Founder} />
          <Route path="/learn" component={Learn} />
          <Route path="/blog/:slug" component={BlogPost} />
          <Route path="/blog" component={Blog} />
          <Route path="/faq" component={Faq} />
          <Route path="/checkout/confirmation" component={CheckoutConfirmation} />
          <Route path="/events/confirmation" component={EventConfirmation} />
          <Route path="/events/:id" component={EventDetail} />
          <Route path="/events" component={Events} />
          <Route path="/my-events" component={MyEvents} />
          <Route path="/my-orders" component={MyOrders} />
          <Route path="/account" component={Account} />
          <Route path="/favorites" component={Favorites} />
          <Route path="/contact" component={Contact} />
          <Route component={NotFound} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

function MarketingRouter() {
  return (
    <Layout>
      <AnimatedRoutes />
      <WelcomeOfferDialog />
    </Layout>
  );
}

// Titles for static routes. Detail pages (/shop/:id, /events/:id, /blog/:slug)
// set their own once their data loads, so dynamic prefixes are skipped here.
const ROUTE_TITLES: Record<string, string | null> = {
  "/": null, // site-wide default
  "/shop": "Shop Mahjong Sets & Accessories",
  "/build": "Build Your Set",
  "/build-your-set": "Build Your Set",
  "/about": "About Us",
  "/founder": "Our Founder",
  "/learn": "Learn Mahjong",
  "/blog": "Blog",
  "/faq": "FAQ",
  "/events": "Mahjong Events & Game Nights",
  "/events/confirmation": "Registration Confirmation",
  "/my-events": "My Events",
  "/my-orders": "My Orders",
  "/account": "My Account",
  "/favorites": "Favorites — Mahjong Accessories & Winner Brags",
  "/contact": "Contact Us",
  "/checkout/confirmation": "Order Confirmation",
  "/login": "Sign In",
  "/signup": "Create Account",
  "/reset-password": "Reset Password",
  "/admin": "Admin",
};
const DYNAMIC_TITLE_PREFIXES = ["/shop/", "/events/", "/blog/"];

function RouteTitles() {
  const [location] = useLocation();
  useEffect(() => {
    if (location in ROUTE_TITLES) {
      setPageMeta(ROUTE_TITLES[location]);
    } else if (!DYNAMIC_TITLE_PREFIXES.some((p) => location.startsWith(p))) {
      setPageMeta(null);
    }
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/admin" component={Admin} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route component={MarketingRouter} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SupabaseAuthProvider>
          <CartProvider>
            <WishlistProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <RouteTitles />
                <Router />
              </WouterRouter>
              <Toaster />
            </WishlistProvider>
          </CartProvider>
        </SupabaseAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
