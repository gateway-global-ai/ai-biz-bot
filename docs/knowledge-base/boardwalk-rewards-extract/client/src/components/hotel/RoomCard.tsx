import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BedDouble, Maximize, ArrowRight, Gift, Building2, DoorOpen, MapPin, Shield, Heart } from "lucide-react";
import type { FilterState } from "./SearchFilters";
import { getEffectiveDiscount } from "./SearchFilters";

// Room type ID mappings for custom amenities
const ROOM_TYPE_MAPPINGS = {
  "2nd-floor": ["630321"],
  "1st-floor": ["629879", "642569"],
  interior: ["631047", "630599"],
  exterior: ["629879", "630321", "642569", "649980"],
  "single-king": ["629879", "630321", "631047", "642569"],
  "double-queen": ["630599", "649980"],
};

function getRoomFeatures(roomId: string) {
  const features: { label: string; icon: typeof Building2 }[] = [];
  
  // Floor level
  if (ROOM_TYPE_MAPPINGS["2nd-floor"].includes(roomId)) {
    features.push({ label: "2nd Floor", icon: Building2 });
  } else if (ROOM_TYPE_MAPPINGS["1st-floor"].includes(roomId)) {
    features.push({ label: "1st Floor", icon: Building2 });
  }
  
  // Interior/Exterior
  if (ROOM_TYPE_MAPPINGS.interior.includes(roomId)) {
    features.push({ label: "Interior", icon: DoorOpen });
  } else if (ROOM_TYPE_MAPPINGS.exterior.includes(roomId)) {
    features.push({ label: "Exterior", icon: DoorOpen });
  }
  
  // Bed type
  if (ROOM_TYPE_MAPPINGS["single-king"].includes(roomId)) {
    features.push({ label: "King Bed", icon: BedDouble });
  } else if (ROOM_TYPE_MAPPINGS["double-queen"].includes(roomId)) {
    features.push({ label: "Two Queen Beds", icon: BedDouble });
  }
  
  return features;
}

export interface RoomType {
  id: string;
  name: string;
  description?: string;
  maxGuests: number;
  bedType?: string;
  sqft?: number;
  imageUrl?: string;
  price?: number;  // Total price for the stay from Cloudbeds
  originalPrice?: number;
  amenities?: string[];
  nights?: number; // Number of nights for the stay
  ratePlanName?: string; // e.g., "default", "Weekly Rates", "Monthly Rates"
}

interface RoomCardProps {
  room: RoomType;
  onSelect?: (room: RoomType) => void;
  nights?: number;
  filters?: FilterState;
}

export default function RoomCard({ room, onSelect, nights = 1, filters }: RoomCardProps) {
  const totalPrice = room.price || 0;
  
  // Get effective discounts based on filters
  const defaultFilters: FilterState = {
    checkIn: undefined,
    checkOut: undefined,
    lengthOfStay: "nightly",
    guests: 2,
    priceRange: [0, 200],
    roomFilters: [],
    rewardsMember: false,
    exclusiveDiscount: "none",
  };
  const activeFilters = filters || defaultFilters;
  const { rewardsPercent, exclusivePercent, label: discountLabel } = getEffectiveDiscount(activeFilters);
  
  // Calculate discounted price
  // Exclusive discount applied first, then rewards stacks on top
  const afterExclusive = totalPrice * (1 - exclusivePercent / 100);
  const afterRewards = afterExclusive * (1 - rewardsPercent / 100);
  const finalPrice = Math.round(afterRewards);
  // Calculate actual savings percentage (sequential discounts)
  const actualSavingsPercent = totalPrice > 0 
    ? Math.round((1 - finalPrice / totalPrice) * 100) 
    : 0;
  
  // Weekly/monthly rate plans are always discounted (built into the rate)
  const isSpecialRate = activeFilters.lengthOfStay === "weekly" || activeFilters.lengthOfStay === "monthly";
  const hasRewardsDiscount = rewardsPercent > 0;
  // Show discount badge if: has calculated savings OR special rate OR rewards member
  const showDiscountIndicator = actualSavingsPercent > 0 || isSpecialRate || hasRewardsDiscount;
  
  // Build discount label
  const getDiscountDescription = () => {
    const parts: string[] = [];
    
    if (activeFilters.lengthOfStay === "weekly") {
      parts.push("weekly rate");
    } else if (activeFilters.lengthOfStay === "monthly") {
      parts.push("monthly rate");
    } else if (discountLabel) {
      parts.push(discountLabel + " discount");
    }
    
    if (rewardsPercent > 0) {
      parts.push("rewards");
    }
    
    return parts.length > 0 ? parts.join(" + ") : "per night";
  };

  return (
    <Card className="overflow-hidden group" data-testid={`card-room-${room.id}`}>
      <div className="relative aspect-[4/3] overflow-hidden">
        {room.imageUrl ? (
          <img
            src={room.imageUrl}
            alt={room.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <BedDouble className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        {showDiscountIndicator && room.price && (
          <Badge className="absolute top-3 right-3 bg-primary gap-1" data-testid={`badge-discount-${room.id}`}>
            {hasRewardsDiscount && <Gift className="w-3 h-3" />}
            {actualSavingsPercent > 0 ? `Save ${actualSavingsPercent}%` : isSpecialRate ? (activeFilters.lengthOfStay === "weekly" ? "Weekly Rate" : "Monthly Rate") : "Rewards"}
          </Badge>
        )}
      </div>

      <CardContent className="p-6">
        <h3 className="text-xl font-semibold mb-2" data-testid={`text-room-name-${room.id}`}>
          {room.name}
        </h3>
        
        {room.description && (
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
            {room.description}
          </p>
        )}

        {/* Custom room features based on roomTypeID */}
        {getRoomFeatures(room.id).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {getRoomFeatures(room.id).map((feature) => (
              <Badge key={feature.label} variant="outline" className="gap-1 text-xs">
                <feature.icon className="w-3 h-3" />
                {feature.label}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>Up to {room.maxGuests} guests</span>
          </div>
          {room.sqft && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Maximize className="w-4 h-4" />
              <span>{room.sqft} sq ft</span>
            </div>
          )}
        </div>

        <div className="flex items-end justify-between gap-4 pt-4 border-t">
          <div>
            {totalPrice > 0 && (
              <div className="space-y-1">
                {showDiscountIndicator ? (
                  <>
                    {actualSavingsPercent > 0 ? (
                      <div className="text-sm text-muted-foreground">
                        <span className="line-through">${totalPrice}</span>
                        <span className="ml-2 text-green-600 font-medium">{actualSavingsPercent}% OFF</span>
                      </div>
                    ) : isSpecialRate && (
                      <div className="text-sm text-green-600 font-medium flex flex-wrap items-center gap-1">
                        <span>Extended stay discount included</span>
                        {nights > 1 && (
                          <span className="text-muted-foreground text-xs">
                            ({activeFilters.lengthOfStay === "weekly" ? "7" : "30"}-night rate)
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-primary" data-testid={`text-room-price-${room.id}`}>
                        ${finalPrice}
                      </span>
                      <span className="text-sm text-muted-foreground">+ tax</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {getDiscountDescription()}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold" data-testid={`text-room-price-${room.id}`}>
                        ${totalPrice}
                      </span>
                      <span className="text-sm text-muted-foreground">+ tax</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {nights > 1 ? `${nights} nights` : "per night"}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <Button
            className="gap-2"
            onClick={() => {
              onSelect?.(room);
              console.log("Room selected:", room.name);
            }}
            data-testid={`button-select-room-${room.id}`}
          >
            Select
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
