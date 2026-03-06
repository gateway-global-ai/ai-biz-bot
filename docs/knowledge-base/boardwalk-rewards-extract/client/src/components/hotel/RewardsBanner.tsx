import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Check, Star } from "lucide-react";
import { Link } from "wouter";

export default function RewardsBanner() {
  const benefits = [
    "10% off all bookings",
    "Early check-in when available",
    "Late checkout when available",
    "Exclusive member-only deals",
  ];

  return (
    <section className="py-16 md:py-24 bg-primary" data-testid="rewards-banner">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <Card className="bg-primary-foreground/10 border-primary-foreground/20 backdrop-blur-sm p-8 md:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-white text-primary font-bold text-lg px-4 py-1">
                  10% OFF
                </Badge>
              </div>

              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: "'Playfair Display', serif" }}
                data-testid="text-rewards-title"
              >
                Join Our Rewards Program
              </h2>
              <p className="text-white/90 text-lg mb-6" data-testid="text-rewards-description">
                Become a member today and enjoy instant savings on every booking, plus exclusive perks and benefits.
              </p>

              <ul className="space-y-3 mb-8">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3 text-white">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/rewards">
                  <Button size="lg" variant="secondary" className="gap-2" data-testid="button-join-rewards">
                    <Star className="w-4 h-4" />
                    Join Now - It's Free
                  </Button>
                </Link>
                <Link href="/rewards">
                  <Button size="lg" variant="outline" className="gap-2 border-white/30 text-white backdrop-blur-sm bg-white/10">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <div className="w-64 h-64 rounded-full bg-white/10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <Gift className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-4xl font-bold text-white mb-1">10% Off</p>
                    <p className="text-white/80 text-sm">Today's Booking</p>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                  <Star className="w-8 h-8 text-white fill-white" />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
