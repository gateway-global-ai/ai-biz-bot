import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AmenitiesSection from "@/components/hotel/AmenitiesSection";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Mail, Clock, Car, Wifi, Utensils, Dumbbell } from "lucide-react";

export default function Amenities() {
  const highlights = [
    {
      icon: Wifi,
      title: "High-Speed WiFi",
      description: "Complimentary high-speed internet access throughout the property. Perfect for remote work or streaming entertainment.",
    },
    {
      icon: Utensils,
      title: "Full Kitchen",
      description: "Every suite includes a fully equipped kitchen with full-size refrigerator, stove, microwave, and dishwasher.",
    },
    {
      icon: Car,
      title: "Free Parking",
      description: "Ample free parking for all guests. Oversized vehicle and trailer parking available upon request.",
    },
    {
      icon: Dumbbell,
      title: "Fitness Center",
      description: "Stay active with our 24-hour fitness center featuring cardio equipment and free weights.",
    },
  ];

  return (
    <div className="min-h-screen" data-testid="page-amenities">
      <Header />
      <main className="pt-20">
        <section className="py-12 bg-primary text-white">
          <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
            <h1
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
              data-testid="text-amenities-page-title"
            >
              Hotel Amenities
            </h1>
            <p className="text-white/90 text-lg max-w-2xl mx-auto">
              Everything you need for a comfortable extended stay experience.
            </p>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              {highlights.map((item, index) => (
                <Card key={index} data-testid={`card-highlight-${index}`}>
                  <CardContent className="p-8">
                    <div className="flex items-start gap-6">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <item.icon className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                        <p className="text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <AmenitiesSection />

        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2
                  className="text-3xl md:text-4xl font-bold mb-6"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Location & Contact
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <MapPin className="w-6 h-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">Address</h3>
                      <p className="text-muted-foreground">
                        120 E Kaliste Saloom Rd<br />
                        Lafayette, LA 70508
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Phone className="w-6 h-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">Phone</h3>
                      <a href="tel:+13372321234" className="text-muted-foreground hover:text-foreground">
                        (337) 232-1234
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Mail className="w-6 h-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">Email</h3>
                      <a href="mailto:info@boardwalksuites.com" className="text-muted-foreground hover:text-foreground">
                        info@boardwalksuites.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Clock className="w-6 h-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">Hours</h3>
                      <p className="text-muted-foreground">
                        Front Desk: 24/7<br />
                        Check-in: 3:00 PM<br />
                        Check-out: 11:00 AM
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <Card className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <MapPin className="w-12 h-12 text-muted-foreground" />
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
