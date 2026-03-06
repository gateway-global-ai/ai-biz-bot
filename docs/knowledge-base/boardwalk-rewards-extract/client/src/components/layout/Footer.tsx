import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { SiFacebook, SiInstagram, SiX } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-card border-t" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div>
            <h3 className="font-serif text-xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Boardwalk Suites
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Experience comfort and convenience at Boardwalk Suites Lafayette. Your home away from home for extended stays.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" data-testid="link-facebook">
                <SiFacebook className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" data-testid="link-instagram">
                <SiInstagram className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" data-testid="link-twitter">
                <SiX className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/rooms" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                Our Rooms
              </Link>
              <Link href="/amenities" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                Amenities
              </Link>
              <Link href="/rewards" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                Rewards Program
              </Link>
              <Link href="/groups" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                Group Bookings
              </Link>
              <Link href="/promotion" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                Special Offers
              </Link>
            </nav>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">
                  1605 N University Ave<br />
                  Lafayette, LA 70506
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <a href="tel:+13373057110" className="text-muted-foreground hover:text-foreground transition-colors">
                  (337) 305-7110
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <a href="mailto:Lafayette@boardwalksuites.com" className="text-muted-foreground hover:text-foreground transition-colors">
                  Lafayette@boardwalksuites.com
                </a>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Clock className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">
                  Check-in: 3:00 PM<br />
                  Check-out: 11:00 AM
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Newsletter</h4>
            <p className="text-muted-foreground text-sm mb-4">
              Subscribe for exclusive deals and updates.
            </p>
            <form className="flex flex-col gap-2" onSubmit={(e) => e.preventDefault()}>
              <Input
                type="email"
                placeholder="Your email address"
                data-testid="input-newsletter-email"
              />
              <Button type="submit" data-testid="button-subscribe">
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            2024 Boardwalk Suites Lafayette. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/commercial-profile" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-commercial-profile">
              Commercial Profile
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
