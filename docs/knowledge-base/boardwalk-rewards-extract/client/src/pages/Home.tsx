import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/hotel/HeroSection";
import RewardsBanner from "@/components/hotel/RewardsBanner";
import RoomsGrid from "@/components/hotel/RoomsGrid";
import AmenitiesSection from "@/components/hotel/AmenitiesSection";
import GroupBookingSection from "@/components/hotel/GroupBookingSection";
import type { FilterState } from "@/components/hotel/SearchFilters";
import type { RoomType } from "@/components/hotel/RoomCard";
import { format, addDays } from "date-fns";

interface HotelDetails {
  success: boolean;
  data: {
    propertyName?: string;
    propertyDescription?: string;
    propertyImage?: Array<{ thumb: string; image: string }>;
    propertyAdditionalPhotos?: Array<{ thumb: string; image: string }>;
    propertyAddress?: {
      propertyAddress1?: string;
      propertyCity?: string;
      propertyState?: string;
      propertyZip?: string;
    };
  };
}

export default function Home() {
  const [, navigate] = useLocation();
  const [filters, setFilters] = useState<FilterState>({
    checkIn: undefined,
    checkOut: undefined,
    lengthOfStay: "nightly",
    guests: 2,
    priceRange: [0, 200],
    roomFilters: [],
    rewardsMember: false,
    exclusiveDiscount: "none",
  });

  const { data: hotelData } = useQuery<HotelDetails>({
    queryKey: ["/api/cloudbeds/hotel"],
  });

  const hotelName = hotelData?.data?.propertyName || "Boardwalk Suites Lafayette";
  const backgroundImage = hotelData?.data?.propertyImage?.[0]?.image || 
    hotelData?.data?.propertyAdditionalPhotos?.[0]?.image;
  
  const propertyPhotos = [
    ...(hotelData?.data?.propertyImage || []),
    ...(hotelData?.data?.propertyAdditionalPhotos || []),
  ].map(p => p.image);

  const handleSelectRoom = (room: RoomType) => {
    const checkIn = filters.checkIn ? format(filters.checkIn, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    const checkOut = filters.checkOut ? format(filters.checkOut, "yyyy-MM-dd") : format(addDays(new Date(), 1), "yyyy-MM-dd");
    
    // Calculate nights for the stay
    const checkInDate = filters.checkIn || new Date();
    const checkOutDate = filters.checkOut || addDays(new Date(), 1);
    const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    // room.price from Cloudbeds is the TOTAL for the stay, not per-night
    sessionStorage.setItem("pendingBooking", JSON.stringify({
      roomId: room.id,
      roomName: room.name,
      checkIn,
      checkOut,
      guests: filters.guests,
      totalPrice: room.price, // Total price for the entire stay
      perNightPrice: Math.round((room.price || 0) / nights), // Calculate per-night
      nights,
      imageUrl: room.imageUrl,
      rewardsMember: filters.rewardsMember,
      exclusiveDiscount: filters.exclusiveDiscount,
      lengthOfStay: filters.lengthOfStay,
    }));
    navigate("/booking");
  };

  const handleSearch = () => {
    const roomsSection = document.getElementById("rooms-section");
    if (roomsSection) {
      roomsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen" data-testid="page-home">
      <Header />
      <main>
        <HeroSection
          hotelName={hotelName}
          tagline="Your Home Away From Home"
          backgroundImage={backgroundImage}
          filters={filters}
          onFiltersChange={setFilters}
          onSearch={handleSearch}
        />
        <RoomsGrid 
          propertyPhotos={propertyPhotos} 
          onSelectRoom={handleSelectRoom}
          filters={filters}
        />
        <AmenitiesSection />
        <GroupBookingSection />
        <RewardsBanner />
      </main>
      <Footer />
    </div>
  );
}
