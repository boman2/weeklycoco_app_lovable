import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import Index from "./pages/Index";
import Search from "./pages/Search";
import Category from "./pages/Category";
import ProductDetail from "./pages/ProductDetail";
import Map from "./pages/Map";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Register from "./pages/Register";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import Admin from "./pages/Admin";
import WeeklyDeals from "./pages/WeeklyDeals";
import Discussion from "./pages/Discussion";
import Community from "./pages/Community";
import Memo from "./pages/Memo";
import PopularProducts from "./pages/PopularProducts";
import CustomerService from "./pages/CustomerService";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();

  // Persist the last non-auth route (including query params) so login can return users precisely.
  useEffect(() => {
    const isAuthRelated =
      location.pathname === "/auth" ||
      location.pathname === "/reset-password" ||
      location.pathname === "/update-password" ||
      location.pathname === "/admin";

    if (isAuthRelated) return;

    sessionStorage.setItem("returnTo", location.pathname + location.search);
  }, [location.pathname, location.search]);

  const hideNav =
    location.pathname === "/auth" ||
    location.pathname === "/admin" ||
    location.pathname === "/reset-password" ||
    location.pathname === "/update-password";

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/search" element={<Search />} />
        <Route path="/category" element={<Category />} />
        <Route path="/product/:productId" element={<ProductDetail />} />
        <Route path="/map" element={<Map />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/user/:userId" element={<UserProfile />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/weekly-deals" element={<WeeklyDeals />} />
        <Route path="/discussion" element={<Discussion />} />
        <Route path="/community" element={<Community />} />
        <Route path="/memo" element={<Memo />} />
        <Route path="/popular-products" element={<PopularProducts />} />
        <Route path="/customer-service" element={<CustomerService />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
