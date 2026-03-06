import { useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RoomsGrid from "@/components/hotel/RoomsGrid";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Search } from "lucide-react";
import type { RoomType } from "@/components/hotel/RoomCard";
import { format, addDays } from "date-fns";

export default function Rooms() {
  const [, navigate] = useLocation();
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests, setGuests] = useState(2);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleSelectRoom = (room: RoomType) => {
    // Calculate nights and determine rate type
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    
    let lengthOfStay: "nightly" | "weekly" | "monthly" = "nightly";
    if (nights >= 30) {
      lengthOfStay = "monthly";
    } else if (nights >= 7) {
      lengthOfStay = "weekly";
    }
    
    // room.price from Cloudbeds is the per-night rate
    // So perNightPrice = room.price, and totalPrice = room.price * nights
    const perNightPrice = room.price || 0;
    const totalPrice = perNightPrice * nights;
    
    sessionStorage.setItem("pendingBooking", JSON.stringify({
      roomId: room.id,
      roomName: room.name,
      checkIn,
      checkOut,
      guests,
      price: room.price,
      perNightPrice,
      totalPrice,
      nights,
      lengthOfStay,
      imageUrl: room.imageUrl
    }));
    navigate("/booking");
  };

  return (
    <div className="min-h-screen" data-testid="page-rooms">
      <Header />
      <main className="pt-20">
        <section className="py-12 bg-muted/50">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="text-center mb-8">
              <h1
                className="text-3xl md:text-4xl font-bold mb-4"
                style={{ fontFamily: "'Playfair Display', serif" }}
                data-testid="text-rooms-page-title"
              >
                Our Rooms & Suites
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Find the perfect room for your stay. All rooms include full kitchen, free WiFi, and parking.
              </p>
            </div>

            <Card className="max-w-4xl mx-auto">
              <CardContent className="p-6">
                <form onSubmit={handleSearch}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rooms-check-in" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Check-in
                      </Label>
                      <Input
                        id="rooms-check-in"
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        data-testid="input-rooms-check-in"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rooms-check-out" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Check-out
                      </Label>
                      <Input
                        id="rooms-check-out"
                        type="date"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        data-testid="input-rooms-check-out"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rooms-guests" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Guests
                      </Label>
                      <Input
                        id="rooms-guests"
                        type="number"
                        min={1}
                        max={10}
                        value={guests}
                        onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                        data-testid="input-rooms-guests"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" className="w-full gap-2" data-testid="button-search-availability">
                        <Search className="w-4 h-4" />
                        Search
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>

        <RoomsGrid checkIn={checkIn} checkOut={checkOut} guests={guests} onSelectRoom={handleSelectRoom} />
      </main>
      <Footer />
    </div>
  );
}
