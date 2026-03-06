import { Card, CardContent } from "@/components/ui/card";
import {
  Wifi,
  Car,
  Dumbbell,
  Tv,
  Snowflake,
  Shirt,
  Dog,
  Clock,
} from "lucide-react";

const amenities = [
  { icon: Wifi, label: "Free High-Speed WiFi", description: "Stay connected with complimentary internet access" },
  { icon: Car, label: "Free Parking", description: "Ample parking space for all guests" },
  { icon: Dumbbell, label: "Fitness Center", description: "24/7 access to workout equipment" },
  { icon: Tv, label: "Flat Screen TV", description: "HD channels in every room" },
  { icon: Snowflake, label: "Climate Control", description: "Individual AC and heating units" },
  { icon: Shirt, label: "Laundry Facilities", description: "On-site washer and dryer" },
  { icon: Dog, label: "Pet Friendly", description: "Pets welcome with deposit" },
  { icon: Clock, label: "24/7 Front Desk", description: "Always available to assist you" },
];

export default function AmenitiesSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/50" data-testid="amenities-section">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
            data-testid="text-amenities-title"
          >
            Hotel Amenities
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="text-amenities-description">
            Everything you need for a comfortable extended stay experience.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {amenities.map((amenity, index) => (
            <Card
              key={amenity.label}
              className="text-center hover-elevate"
              data-testid={`card-amenity-${index}`}
            >
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <amenity.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{amenity.label}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {amenity.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
