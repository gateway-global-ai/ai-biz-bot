import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Car, 
  Utensils,
  GraduationCap,
  Plane,
  Hospital,
  Home,
  Heart,
  Phone,
  Mail,
  ArrowRight,
  Check,
  Star,
  Bed,
  Square
} from "lucide-react";

export default function CommercialProfile() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-screen overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: "url('https://h-img1.cloudbeds.com/uploads/315701/img_3448_gallery~~671b6f09219cb.jpeg')"
            }}
          />
          <div className="absolute inset-0 backdrop-blur-sm bg-black/50" />
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
            <Badge className="mb-4 bg-primary/90 text-primary-foreground text-sm px-4 py-1" data-testid="badge-for-sale">
              Investment Opportunity
            </Badge>
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
              data-testid="heading-property-name"
            >
              Boardwalk Suites Lafayette
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-6 max-w-3xl" data-testid="text-hero-subtitle">
              Premier Extended-Stay Hotel Property For Sale
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-white/80">
              <div className="flex items-center gap-2" data-testid="text-address">
                <MapPin className="w-5 h-5" />
                <span>1605 N University Ave, Lafayette, LA 70506</span>
              </div>
              <div className="flex items-center gap-2" data-testid="text-acreage">
                <Square className="w-5 h-5" />
                <span>3.2 Acres</span>
              </div>
              <div className="flex items-center gap-2" data-testid="text-rooms">
                <Bed className="w-5 h-5" />
                <span>160 Units</span>
              </div>
            </div>
          </div>
        </section>

        {/* Property Overview */}
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-semibold mb-4" data-testid="heading-overview">
                Property Overview
              </h2>
              <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
                A unique boutique hotel offering affordable luxury accommodations with exceptional 
                conversion potential in the heart of Lafayette's commercial corridor.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Building2 className="w-10 h-10 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold text-lg mb-2">Property Size</h3>
                  <p className="text-2xl font-bold text-primary">3.2 Acres</p>
                  <p className="text-sm text-muted-foreground mt-1">Expansive grounds with room for development</p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="pt-6">
                  <Bed className="w-10 h-10 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold text-lg mb-2">Room Inventory</h3>
                  <p className="text-2xl font-bold text-primary">160 Units</p>
                  <p className="text-sm text-muted-foreground mt-1">Mix of King and Double Suites</p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="pt-6">
                  <TrendingUp className="w-10 h-10 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold text-lg mb-2">Direct Booking</h3>
                  <p className="text-2xl font-bold text-primary">90%</p>
                  <p className="text-sm text-muted-foreground mt-1">Industry-leading direct booking ratio</p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="pt-6">
                  <DollarSign className="w-10 h-10 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold text-lg mb-2">Rate Range</h3>
                  <p className="text-2xl font-bold text-primary">$69 - $99</p>
                  <p className="text-sm text-muted-foreground mt-1">Competitive nightly rates</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Property Features */}
        <section className="py-16 md:py-24 px-4 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-semibold mb-6" data-testid="heading-features">
                  Property Features
                </h2>
                <p className="text-muted-foreground mb-8">
                  Recently renovated property featuring modern amenities, interior corridors for 
                  extended-stay guests, and extensive outdoor facilities perfect for expansion.
                </p>
                
                <div className="space-y-4">
                  {[
                    "Interior corridor with community kitchen",
                    "Guest laundry facilities",
                    "Outdoor barbecue and picnic areas",
                    "Large park area for guest enjoyment",
                    "Smart TVs in all rooms",
                    "Refrigerator and microwave in every suite",
                    "High-speed wireless internet",
                    "24-hour front desk"
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <img 
                  src="https://h-img3.cloudbeds.com/uploads/315701/img_3350~~671b6f8e79b49.jpeg"
                  alt="Hotel exterior"
                  className="rounded-xl w-full h-48 object-cover"
                />
                <img 
                  src="https://h-img1.cloudbeds.com/uploads/315701/img_3887_featured~~6765826759cc0.jpeg"
                  alt="King Suite"
                  className="rounded-xl w-full h-48 object-cover"
                />
                <img 
                  src="https://h-img2.cloudbeds.com/uploads/315701/img_0897_featured~~671b6e00a64cb.jpeg"
                  alt="Double Suite"
                  className="rounded-xl w-full h-48 object-cover"
                />
                <img 
                  src="https://h-img3.cloudbeds.com/uploads/315701/img_3254~~671b6f9334c16.jpeg"
                  alt="Property amenities"
                  className="rounded-xl w-full h-48 object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Location & Market */}
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-semibold mb-4" data-testid="heading-location">
                Prime Lafayette Location
              </h2>
              <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
                Strategically positioned on North University Avenue with excellent access to 
                major employers, universities, healthcare facilities, and transportation.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>University of Louisiana at Lafayette nearby, creating consistent demand from visiting families, faculty, and event attendees.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <Hospital className="w-5 h-5 text-primary" />
                    Healthcare
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Multiple hospitals and medical centers in the area, including Our Lady of Lourdes and Lafayette General, driving healthcare travel demand.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <Building2 className="w-5 h-5 text-primary" />
                    Major Employers
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Amazon fulfillment center, Walmart distribution, and oil & gas companies create steady corporate traveler demand.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <Plane className="w-5 h-5 text-primary" />
                    Airport Access
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Lafayette Regional Airport (LFT) just 10 minutes away, providing convenient access for business travelers.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <Car className="w-5 h-5 text-primary" />
                    Transportation
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Direct access to I-10 and US-90, connecting to New Orleans, Baton Rouge, Houston, and the Gulf Coast.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <Utensils className="w-5 h-5 text-primary" />
                    Dining & Culture
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Heart of Cajun Country with world-renowned cuisine, festivals, and cultural attractions driving tourism year-round.</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <Star className="w-8 h-8 text-primary shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-xl mb-2">Food Truck Park Development</h3>
                    <p className="text-muted-foreground">
                      The property includes plans for a food truck park that will bring the best of Louisiana 
                      cuisine directly to guests, creating an additional revenue stream and unique destination appeal.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Conversion Opportunities */}
        <section className="py-16 md:py-24 px-4 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4" variant="outline">Adaptive Reuse Potential</Badge>
              <h2 className="text-3xl md:text-4xl font-semibold mb-4" data-testid="heading-conversion">
                Conversion Opportunities
              </h2>
              <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
                The property's layout, infrastructure, and prime location make it an ideal candidate 
                for conversion to higher-value uses with significant upside potential.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Apartments */}
              <Card className="overflow-hidden" data-testid="card-apartment-conversion">
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Home className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold" data-testid="heading-apartment-conversion">Apartment Conversion</h3>
                      <p className="text-muted-foreground">Multi-family residential</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <p className="text-muted-foreground mb-6">
                    Convert to workforce housing or market-rate apartments to capitalize on Lafayette's 
                    growing rental demand and limited housing inventory.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">Existing interior corridor layout minimizes conversion costs</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">Each unit already has bathroom, kitchenette, and utilities</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">Strong rental market near university and employers</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">Community amenities already in place (laundry, outdoor areas)</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">3.2-acre site allows for additional unit construction</span>
                    </div>
                  </div>
                  <Separator className="my-6" />
                  <div className="flex items-center justify-between gap-4">
                    <div data-testid="text-apartment-potential">
                      <p className="text-sm text-muted-foreground">Potential Units</p>
                      <p className="text-xl font-bold">160+ Apartments</p>
                    </div>
                    <Badge variant="outline" data-testid="badge-apartment-demand">High Demand Market</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Assisted Living */}
              <Card className="overflow-hidden" data-testid="card-assisted-living">
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Heart className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold" data-testid="heading-assisted-living">Assisted Living Facility</h3>
                      <p className="text-muted-foreground">Senior care community</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <p className="text-muted-foreground mb-6">
                    Transform into an assisted living or memory care facility to serve Louisiana's 
                    aging population and growing demand for quality senior housing.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">Interior corridor design ideal for senior safety and accessibility</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">Community kitchen easily converts to commercial food service</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">Proximity to multiple hospitals and medical centers</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">Spacious grounds for outdoor recreation and therapy gardens</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">Louisiana's 65+ population growing faster than national average</span>
                    </div>
                  </div>
                  <Separator className="my-6" />
                  <div className="flex items-center justify-between gap-4">
                    <div data-testid="text-assisted-potential">
                      <p className="text-sm text-muted-foreground">Potential Capacity</p>
                      <p className="text-xl font-bold">100+ Residents</p>
                    </div>
                    <Badge variant="outline" data-testid="badge-assisted-demand">Growing Demographic</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 p-6 bg-card rounded-xl border text-center">
              <p className="text-muted-foreground mb-2">
                Both conversion options benefit from the property's prime location, established infrastructure, 
                and Louisiana's favorable business climate for real estate development.
              </p>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4" data-testid="heading-contact">
              Request More Information
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Interested in learning more about this investment opportunity? 
              Contact us to receive the full offering memorandum and property details.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Button size="lg" className="gap-2" data-testid="button-request-info">
                <Mail className="w-4 h-4" />
                Request Offering Memorandum
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2" data-testid="button-call">
                <Phone className="w-4 h-4" />
                (337) 305-7110
              </Button>
            </div>

            <div className="p-6 bg-muted/50 rounded-xl" data-testid="card-contact-info">
              <p className="font-medium mb-2">Boardwalk Suites Lafayette</p>
              <p className="text-muted-foreground text-sm" data-testid="text-contact-details">
                1605 N University Ave, Lafayette, LA 70506<br />
                Lafayette@boardwalksuites.com
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
