import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Check, Star, Percent, Clock, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RewardsPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Rewards signup:", formData);
    toast({
      title: "Welcome to Boardwalk Rewards!",
      description: "You'll receive 10% off your next booking. Check your email for details.",
    });
  };

  const benefits = [
    {
      icon: Percent,
      title: "10% Off Every Booking",
      description: "Instant savings on every reservation you make with us",
    },
    {
      icon: Clock,
      title: "Early Check-in",
      description: "Complimentary early check-in when rooms are available",
    },
    {
      icon: Clock,
      title: "Late Checkout",
      description: "Extended checkout times when available at no extra charge",
    },
    {
      icon: Star,
      title: "Exclusive Deals",
      description: "Access to member-only promotions and seasonal offers",
    },
    {
      icon: Award,
      title: "Priority Booking",
      description: "First access to high-demand dates and special events",
    },
    {
      icon: Gift,
      title: "Birthday Bonus",
      description: "Special discount during your birthday month",
    },
  ];

  const tiers = [
    { name: "Bronze", nights: "1-9", discount: "10%", color: "bg-orange-600" },
    { name: "Silver", nights: "10-24", discount: "12%", color: "bg-gray-400" },
    { name: "Gold", nights: "25+", discount: "15%", color: "bg-yellow-500" },
  ];

  return (
    <div className="min-h-screen pt-20" data-testid="rewards-page">
      <section className="py-16 md:py-24 bg-primary">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center text-white">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
            <Gift className="w-10 h-10" />
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
            data-testid="text-rewards-page-title"
          >
            Boardwalk Rewards
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8" data-testid="text-rewards-page-subtitle">
            Join our free rewards program and start saving 10% on every booking today
          </p>
          <Badge className="bg-white text-primary font-bold text-lg px-6 py-2">
            Over 5,000 Members Saving
          </Badge>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Member Benefits
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Every benefit is available from day one - no minimum stays required
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="hover-elevate" data-testid={`card-benefit-${index}`}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Membership Tiers
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              The more you stay, the more you save. Unlock higher tiers for better discounts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {tiers.map((tier) => (
              <Card key={tier.name} className="text-center" data-testid={`card-tier-${tier.name.toLowerCase()}`}>
                <CardContent className="p-8">
                  <div className={`w-16 h-16 rounded-full ${tier.color} flex items-center justify-center mx-auto mb-4`}>
                    <Star className="w-8 h-8 text-white fill-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  <p className="text-muted-foreground mb-4">{tier.nights} nights/year</p>
                  <Badge variant="outline" className="text-xl px-4 py-1">
                    {tier.discount} OFF
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-xl mx-auto px-4 md:px-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
                Join Boardwalk Rewards
              </CardTitle>
              <p className="text-muted-foreground">
                It's free to join and takes less than a minute
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rewards-first-name">First Name</Label>
                    <Input
                      id="rewards-first-name"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="John"
                      required
                      data-testid="input-rewards-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rewards-last-name">Last Name</Label>
                    <Input
                      id="rewards-last-name"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Smith"
                      required
                      data-testid="input-rewards-last-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rewards-email">Email Address</Label>
                  <Input
                    id="rewards-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@email.com"
                    required
                    data-testid="input-rewards-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rewards-phone">Phone Number</Label>
                  <Input
                    id="rewards-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(337) 555-1234"
                    data-testid="input-rewards-phone"
                  />
                </div>

                <ul className="space-y-2 py-4">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    Free to join - no credit card required
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    Instant 10% discount on your first booking
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    Exclusive member-only offers
                  </li>
                </ul>

                <Button type="submit" className="w-full" size="lg" data-testid="button-join-rewards-form">
                  Join Boardwalk Rewards
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
