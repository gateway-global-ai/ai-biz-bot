import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import RoomCard, { type RoomType } from "./RoomCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, SearchX } from "lucide-react";
import type { FilterState } from "./SearchFilters";
import { ROOM_FILTER_MAPPINGS, getEffectiveDiscount } from "./SearchFilters";
import { format, differenceInDays } from "date-fns";

interface RoomsGridProps {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  propertyPhotos?: string[];
  onSelectRoom?: (room: RoomType) => void;
  filters?: FilterState;
}

export default function RoomsGrid({ checkIn, checkOut, guests, propertyPhotos = [], onSelectRoom, filters }: RoomsGridProps) {
  // Build query params based on filters OR props (dates for rate plan selection)
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    // Use filters if available, otherwise fall back to props
    const startDate = filters?.checkIn 
      ? format(filters.checkIn, "yyyy-MM-dd") 
      : checkIn;
    const endDate = filters?.checkOut 
      ? format(filters.checkOut, "yyyy-MM-dd") 
      : checkOut;
    const numGuests = filters?.guests || guests;
    
    if (startDate) {
      params.set("startDate", startDate);
    }
    if (endDate) {
      params.set("endDate", endDate);
    }
    if (numGuests) {
      params.set("adults", String(numGuests));
    }
    if (filters?.lengthOfStay) {
      params.set("lengthOfStay", filters.lengthOfStay);
    }
    return params.toString();
  }, [filters?.checkIn, filters?.checkOut, filters?.guests, filters?.lengthOfStay, checkIn, checkOut, guests]);

  const { data, isLoading, error } = useQuery<{ success: boolean; data: { roomTypes: RoomType[] } }>({
    queryKey: ["/api/cloudbeds/room-types", queryParams],
    queryFn: async () => {
      const url = queryParams 
        ? `/api/cloudbeds/room-types?${queryParams}` 
        : "/api/cloudbeds/room-types";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch rooms");
      return res.json();
    },
  });

  // Calculate nights for display
  const nights = useMemo(() => {
    if (filters?.checkIn && filters?.checkOut) {
      return differenceInDays(filters.checkOut, filters.checkIn) || 1;
    }
    return 1;
  }, [filters?.checkIn, filters?.checkOut]);

  const filteredRooms = useMemo(() => {
    const rooms = data?.data?.roomTypes || [];
    if (!filters) return rooms;

    // Get discount info for price filtering
    const { rewardsPercent, exclusivePercent } = getEffectiveDiscount(filters);

    return rooms.filter((room) => {
      if (filters.guests > room.maxGuests) {
        return false;
      }

      // Compare discounted per-night price against filter range
      const totalPrice = room.price || 0;
      // Apply discounts sequentially
      const afterExclusive = totalPrice * (1 - exclusivePercent / 100);
      const afterRewards = afterExclusive * (1 - rewardsPercent / 100);
      const discountedTotal = Math.round(afterRewards);
      const perNightPrice = nights > 1 ? discountedTotal / nights : discountedTotal;
      
      if (perNightPrice < filters.priceRange[0] || perNightPrice > filters.priceRange[1]) {
        return false;
      }

      if (filters.roomFilters.length > 0) {
        const roomId = String(room.id);
        // Must match ALL selected filters (AND logic)
        const matchesAllFilters = filters.roomFilters.every((filterId) => {
          const allowedRoomTypeIds = ROOM_FILTER_MAPPINGS[filterId as keyof typeof ROOM_FILTER_MAPPINGS] || [];
          return allowedRoomTypeIds.includes(roomId);
        });
        if (!matchesAllFilters) return false;
      }

      return true;
    });
  }, [data, filters, nights]);

  if (isLoading) {
    return (
      <section className="py-16 md:py-24" data-testid="rooms-section">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Our Rooms & Suites
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Loading available rooms...
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <Skeleton className="aspect-[4/3]" />
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex justify-between pt-4">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 md:py-24" data-testid="rooms-section">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Unable to load rooms</h3>
            <p className="text-muted-foreground">
              Please try again later or contact us directly.
            </p>
          </Card>
        </div>
      </section>
    );
  }

  const allRooms = data?.data?.roomTypes || [];
  const hasActiveFilters = filters && (
    filters.guests !== 2 ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < 200 ||
    filters.roomFilters.length > 0
  );

  return (
    <section id="rooms-section" className="py-16 md:py-24" data-testid="rooms-section">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
            data-testid="text-rooms-title"
          >
            Our Rooms & Suites
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="text-rooms-description">
            {hasActiveFilters 
              ? `Showing ${filteredRooms.length} of ${allRooms.length} rooms matching your criteria`
              : "Choose from our selection of comfortable rooms designed for extended stays. Join our rewards program and save 10% on every booking."
            }
          </p>
        </div>

        {filteredRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredRooms.map((room) => (
              <RoomCard key={room.id} room={room} onSelect={onSelectRoom} nights={nights} filters={filters} />
            ))}
          </div>
        ) : hasActiveFilters ? (
          <Card className="p-8 text-center">
            <SearchX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No rooms match your filters</h3>
            <p className="text-muted-foreground">
              Try adjusting your search criteria to see more options.
            </p>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No rooms available. Please contact us for availability.
            </p>
          </Card>
        )}
      </div>
    </section>
  );
}
