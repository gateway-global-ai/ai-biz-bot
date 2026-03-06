import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Menu, User, Gift, CalendarPlus } from "lucide-react";
import { Link, useLocation } from "wouter";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/rooms", label: "Rooms" },
  { href: "/amenities", label: "Amenities" },
  { href: "/groups", label: "Group Bookings" },
  { href: "/promotion", label: "Promotions" },
  { href: "/guest-portal", label: "My Stay" },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isHome = location === "/";
  // Always use dark blue header except transparent on home before scroll
  const headerBg = isScrolled || !isHome
    ? "bg-[#1e3a5f] border-b border-[#2d4a6f]"
    : "bg-transparent";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBg}`}
      data-testid="header"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between gap-4 h-16 md:h-20">
          <Link href="/" data-testid="link-home">
            <span className="font-serif text-xl md:text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              Boardwalk Suites
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="ghost"
                  className="text-white/90 hover:text-white hover:bg-white/10"
                  data-testid={`nav-${link.label.toLowerCase().replace(" ", "-")}`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/rewards">
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex items-center gap-2 border-white/30 text-white hover:bg-white/10 hover:text-white"
                data-testid="button-rewards"
              >
                <Gift className="w-4 h-4" />
                <span>Rewards</span>
                <Badge variant="default" className="ml-1 text-xs">10% OFF</Badge>
              </Button>
            </Link>

            <Link href="/login">
              <Button
                size="sm"
                className="hidden sm:flex items-center gap-2 bg-white text-[#1e3a5f] hover:bg-gray-100"
                data-testid="button-login"
              >
                <User className="w-4 h-4" />
                <span>Login</span>
              </Button>
            </Link>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                  data-testid="button-mobile-menu"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <nav className="flex flex-col gap-2 mt-8">
                  {navLinks.map((link) => (
                    <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-lg">
                        {link.label}
                      </Button>
                    </Link>
                  ))}
                  <div className="border-t my-4" />
                  <Link href="/rewards" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Gift className="w-4 h-4" />
                      Rewards Program
                      <Badge variant="default" className="ml-auto">10% OFF</Badge>
                    </Button>
                  </Link>
                  <Link href="/login" onClick={() => setIsOpen(false)}>
                    <Button variant="default" className="w-full justify-start gap-2">
                      <User className="w-4 h-4" />
                      Login / Sign Up
                    </Button>
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
