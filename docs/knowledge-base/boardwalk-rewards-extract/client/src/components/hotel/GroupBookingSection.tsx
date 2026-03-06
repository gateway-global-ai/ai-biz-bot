import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Check, Send, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function GroupBookingSection() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    rooms: "",
    dates: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Group booking inquiry:", formData);
    toast({
      title: "Inquiry Submitted",
      description: "We'll contact you within 24 hours with group rates.",
    });
  };

  const benefits = [
    "Special discounted rates for 10+ rooms",
    "Dedicated group coordinator",
    "Flexible booking and cancellation",
    "Complimentary meeting space",
    "Custom billing arrangements",
  ];

  return (
    <section className="py-16 md:py-24" data-testid="group-booking-section">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div>
            <Badge className="mb-4" data-testid="badge-group-booking">
              <Building2 className="w-3 h-3 mr-1" />
              Group Bookings
            </Badge>
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
              data-testid="text-group-title"
            >
              Planning a Group Stay?
            </h2>
            <p className="text-muted-foreground text-lg mb-8" data-testid="text-group-description">
              Whether it's a corporate retreat, sports team, wedding party, or family reunion,
              we offer special rates and amenities for groups of 10 or more rooms.
            </p>

            <ul className="space-y-4 mb-8">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Need 10+ Rooms?</p>
                <p className="text-sm text-muted-foreground">
                  Call us directly at (337) 232-1234 for immediate assistance
                </p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Request Group Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-name">Your Name</Label>
                    <Input
                      id="group-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Smith"
                      data-testid="input-group-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group-email">Email</Label>
                    <Input
                      id="group-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@company.com"
                      data-testid="input-group-email"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-phone">Phone</Label>
                    <Input
                      id="group-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(337) 555-1234"
                      data-testid="input-group-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group-company">Company/Organization</Label>
                    <Input
                      id="group-company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Acme Corp"
                      data-testid="input-group-company"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-rooms">Number of Rooms</Label>
                    <Input
                      id="group-rooms"
                      type="number"
                      min={10}
                      value={formData.rooms}
                      onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                      placeholder="10+"
                      data-testid="input-group-rooms"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group-dates">Preferred Dates</Label>
                    <Input
                      id="group-dates"
                      value={formData.dates}
                      onChange={(e) => setFormData({ ...formData, dates: e.target.value })}
                      placeholder="Jan 15-20, 2025"
                      data-testid="input-group-dates"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="group-message">Additional Details</Label>
                  <Textarea
                    id="group-message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your group and any special requirements..."
                    rows={4}
                    data-testid="input-group-message"
                  />
                </div>

                <Button type="submit" className="w-full gap-2" data-testid="button-submit-group">
                  <Send className="w-4 h-4" />
                  Submit Inquiry
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
