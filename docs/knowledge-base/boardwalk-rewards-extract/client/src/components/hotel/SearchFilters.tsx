import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar as CalendarIcon, DollarSign, X, Search, Users, Gift, MapPin, Shield, Star } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

// RoomTypeID mappings for filters
export const ROOM_FILTER_MAPPINGS = {
  "1st-floor": ["629879", "642569"],
  "2nd-floor": ["630321", "630599", "631047", "649980"], // Level 2 and Interior rooms
  "single-king": ["629879", "630321", "631047", "642569"], // All except 2 Beds
  "double-queen": ["630599", "649980"], // 2 Beds
  "interior": ["631047", "630599"],
  "exterior": ["629879", "630321", "642569", "649980"],
};

export type LengthOfStay = "nightly" | "weekly" | "monthly";
export type ExclusiveDiscount = "none" | "local" | "military" | "senior";

export interface FilterState {
  checkIn: Date | undefined;
  checkOut: Date | undefined;
  lengthOfStay: LengthOfStay;
  guests: number;
  priceRange: [number, number];
  roomFilters: string[];
  rewardsMember: boolean;
  exclusiveDiscount: ExclusiveDiscount;
}

// Helper to calculate the effective discount percentage
// Weekly/monthly rates already have discounts built in, so exclusive discounts don't apply
// Rewards (10%) stacks with everything
export function getEffectiveDiscount(filters: FilterState): { 
  rewardsPercent: number; 
  exclusivePercent: number;
  label: string;
} {
  const rewardsPercent = filters.rewardsMember ? 10 : 0;
  
  // Weekly/monthly rates already include their discount - no stacking with exclusive discounts
  if (filters.lengthOfStay !== "nightly") {
    return { 
      rewardsPercent, 
      exclusivePercent: 0,
      label: filters.lengthOfStay === "weekly" ? "weekly rate" : "monthly rate"
    };
  }
  
  // Nightly: apply exclusive discount if selected
  let exclusivePercent = 0;
  let label = "";
  
  switch (filters.exclusiveDiscount) {
    case "local":
      exclusivePercent = 10;
      label = "local resident";
      break;
    case "military":
      exclusivePercent = 10;
      label = "military";
      break;
    case "senior":
      exclusivePercent = 10;
      label = "senior";
      break;
  }
  
  return { rewardsPercent, exclusivePercent, label };
}

const LENGTH_OF_STAY_NIGHTS: Record<LengthOfStay, number> = {
  nightly: 1,
  weekly: 7,
  monthly: 30,
};

interface SearchFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onSearch: () => void;
}

// Compact room filter options - all in one flat list
const ROOM_FILTERS = [
  { id: "1st-floor", label: "1st Floor" },
  { id: "2nd-floor", label: "2nd Floor" },
  { id: "single-king", label: "King Bed" },
  { id: "double-queen", label: "2 Beds" },
  { id: "interior", label: "Interior" },
  { id: "exterior", label: "Exterior" },
];

export default function SearchFilters({ filters, onFiltersChange, onSearch }: SearchFiltersProps) {
  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleRoomFilter = (filterId: string) => {
    const current = filters.roomFilters;
    const updated = current.includes(filterId)
      ? current.filter((f) => f !== filterId)
      : [...current, filterId];
    updateFilter("roomFilters", updated);
  };

  const clearFilters = () => {
    onFiltersChange({
      checkIn: undefined,
      checkOut: undefined,
      lengthOfStay: "nightly",
      guests: 2,
      priceRange: [0, 200],
      roomFilters: [],
      rewardsMember: false,
      exclusiveDiscount: "none",
    });
  };

  const handleLengthOfStayChange = (value: LengthOfStay) => {
    const nights = LENGTH_OF_STAY_NIGHTS[value];
    const newCheckOut = filters.checkIn ? addDays(filters.checkIn, nights) : undefined;
    onFiltersChange({
      ...filters,
      lengthOfStay: value,
      checkOut: newCheckOut,
    });
  };

  const hasActiveFilters = 
    filters.checkIn || 
    filters.checkOut || 
    filters.lengthOfStay !== "nightly" ||
    filters.priceRange[0] > 0 || 
    filters.priceRange[1] < 200 ||
    filters.roomFilters.length > 0 ||
    filters.rewardsMember ||
    filters.exclusiveDiscount !== "none";

  const hasActiveDiscounts = filters.rewardsMember || filters.exclusiveDiscount !== "none";
  const isNightlyStay = filters.lengthOfStay === "nightly";

  return (
    <section className="py-6 bg-muted/30" data-testid="search-filters-section">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <Card className="overflow-visible">
          <CardContent className="p-4">
            {/* Main search row - compact grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Check-in</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.checkIn && "text-muted-foreground"
                      )}
                      data-testid="input-checkin-date"
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {filters.checkIn ? format(filters.checkIn, "MMM d") : "Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.checkIn}
                      onSelect={(date) => {
                        const nights = LENGTH_OF_STAY_NIGHTS[filters.lengthOfStay];
                        const newCheckOut = date ? addDays(date, nights) : undefined;
                        onFiltersChange({
                          ...filters,
                          checkIn: date,
                          checkOut: newCheckOut,
                        });
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Stay</Label>
                <Select
                  value={filters.lengthOfStay}
                  onValueChange={(value) => handleLengthOfStayChange(value as LengthOfStay)}
                >
                  <SelectTrigger className="h-8 text-sm" data-testid="select-length-of-stay">
                    <SelectValue placeholder="Stay" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nightly">Nightly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Check-out</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.checkOut && "text-muted-foreground"
                      )}
                      data-testid="input-checkout-date"
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {filters.checkOut ? format(filters.checkOut, "MMM d") : "Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.checkOut}
                      onSelect={(date) => updateFilter("checkOut", date)}
                      disabled={(date) => date <= (filters.checkIn || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Guests</Label>
                <Select
                  value={filters.guests.toString()}
                  onValueChange={(value) => updateFilter("guests", parseInt(value))}
                >
                  <SelectTrigger className="h-8 text-sm" data-testid="select-guests">
                    <Users className="mr-1.5 h-3.5 w-3.5" />
                    <SelectValue placeholder="Guests" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  Budget: ${filters.priceRange[0]}-${filters.priceRange[1]}
                </Label>
                <div className="px-1 pt-2">
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(value) => updateFilter("priceRange", value as [number, number])}
                    min={0}
                    max={200}
                    step={10}
                    data-testid="slider-price-range"
                  />
                </div>
              </div>

              <Button 
                size="sm"
                className="gap-1.5" 
                onClick={onSearch}
                data-testid="button-search-rooms"
              >
                <Search className="h-3.5 w-3.5" />
                Search
              </Button>
            </div>

            {/* Room type filters - compact toggle chips in one row */}
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t">
              <span className="text-xs font-medium text-muted-foreground mr-1">Room Type:</span>
              {ROOM_FILTERS.map((filter) => (
                <Toggle
                  key={filter.id}
                  size="sm"
                  variant="outline"
                  pressed={filters.roomFilters.includes(filter.id)}
                  onPressedChange={() => toggleRoomFilter(filter.id)}
                  className="h-7 px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  data-testid={`filter-${filter.id}`}
                >
                  {filter.label}
                </Toggle>
              ))}
              
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="h-7 px-2 text-xs text-muted-foreground ml-auto"
                  data-testid="button-clear-filters"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Discounts accordion - collapsed by default at bottom */}
            <Accordion type="single" collapsible className="mt-3 border-t pt-2">
              <AccordionItem value="discounts" className="border-none">
                <AccordionTrigger className="py-2 text-sm hover:no-underline" data-testid="toggle-discounts-accordion">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-primary" />
                    <span>Discounts</span>
                    {hasActiveDiscounts && (
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Rewards member toggle */}
                    <Toggle
                      size="sm"
                      variant="outline"
                      pressed={filters.rewardsMember}
                      onPressedChange={(pressed) => updateFilter("rewardsMember", pressed)}
                      className="h-7 px-2.5 text-xs gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      data-testid="toggle-rewards-member"
                    >
                      <Gift className="h-3 w-3" />
                      Rewards Member (10% off)
                    </Toggle>

                    {/* Exclusive discounts - only for nightly stays */}
                    {isNightlyStay && (
                      <>
                        <span className="text-xs text-muted-foreground mx-1">|</span>
                        <Toggle
                          size="sm"
                          variant="outline"
                          pressed={filters.exclusiveDiscount === "local"}
                          onPressedChange={(pressed) => updateFilter("exclusiveDiscount", pressed ? "local" : "none")}
                          className="h-7 px-2.5 text-xs gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                          data-testid="toggle-local-discount"
                        >
                          <MapPin className="h-3 w-3" />
                          Local (10%)
                        </Toggle>
                        <Toggle
                          size="sm"
                          variant="outline"
                          pressed={filters.exclusiveDiscount === "military"}
                          onPressedChange={(pressed) => updateFilter("exclusiveDiscount", pressed ? "military" : "none")}
                          className="h-7 px-2.5 text-xs gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                          data-testid="toggle-military-discount"
                        >
                          <Shield className="h-3 w-3" />
                          Military (10%)
                        </Toggle>
                        <Toggle
                          size="sm"
                          variant="outline"
                          pressed={filters.exclusiveDiscount === "senior"}
                          onPressedChange={(pressed) => updateFilter("exclusiveDiscount", pressed ? "senior" : "none")}
                          className="h-7 px-2.5 text-xs gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                          data-testid="toggle-senior-discount"
                        >
                          <Star className="h-3 w-3" />
                          Senior 65+ (10%)
                        </Toggle>
                      </>
                    )}
                    {!isNightlyStay && (
                      <span className="text-xs text-muted-foreground italic">
                        Extended stay rates already include discounts
                      </span>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
