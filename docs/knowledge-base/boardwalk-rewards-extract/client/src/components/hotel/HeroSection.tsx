import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Search, Gift, SlidersHorizontal, Building2, Bed, DoorOpen, X, Users } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { FilterState, LengthOfStay, ExclusiveDiscount } from "./SearchFilters";
import { MapPin, Shield, Heart } from "lucide-react";

const LENGTH_OF_STAY_NIGHTS: Record<LengthOfStay, number> = {
  nightly: 1,
  weekly: 7,
  monthly: 30,
};

interface HeroSectionProps {
  hotelName?: string;
  tagline?: string;
  backgroundImage?: string;
  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
  onSearch?: () => void;
}

interface PriceRanges {
  nightly: { min: number; max: number };
  weekly: { min: number; max: number };
  monthly: { min: number; max: number };
}

interface PriceRangesResponse {
  success: boolean;
  data: PriceRanges;
}

const FLOOR_FILTERS = [
  { id: "1st-floor", label: "1st Floor", icon: Building2 },
  { id: "2nd-floor", label: "2nd Floor", icon: Building2 },
];

const BED_FILTERS = [
  { id: "single-king", label: "Single King Bed", icon: Bed },
  { id: "double-queen", label: "Double Queen Beds", icon: Bed },
];

const LOCATION_FILTERS = [
  { id: "interior", label: "Interior", icon: DoorOpen },
  { id: "exterior", label: "Exterior", icon: DoorOpen },
];

type BudgetPeriod = "nightly" | "weekly" | "monthly";

export default function HeroSection({
  hotelName = "Boardwalk Suites Lafayette",
  tagline = "Your Home Away From Home",
  backgroundImage,
  filters,
  onFiltersChange,
  onSearch,
}: HeroSectionProps) {
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>("nightly");
  
  const { data: priceRangesData } = useQuery<PriceRangesResponse>({
    queryKey: ["/api/cloudbeds/price-ranges"],
  });

  const priceRanges: PriceRanges = priceRangesData?.data || {
    nightly: { min: 0, max: 99 },
    weekly: { min: 0, max: 693 },
    monthly: { min: 0, max: 2970 },
  };
  
  const defaultFilters: FilterState = {
    checkIn: undefined,
    checkOut: undefined,
    lengthOfStay: "nightly",
    guests: 2,
    priceRange: [0, priceRanges.nightly.max],
    roomFilters: [],
    rewardsMember: false,
    exclusiveDiscount: "none",
  };

  const currentFilters = filters || defaultFilters;

  // Update price range when priceRanges data loads
  useEffect(() => {
    if (priceRangesData?.data && onFiltersChange && currentFilters.priceRange[1] === 200) {
      const maxNightly = priceRangesData.data.nightly.max;
      onFiltersChange({
        ...currentFilters,
        priceRange: [0, maxNightly],
      });
    }
  }, [priceRangesData?.data]);

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    if (onFiltersChange) {
      onFiltersChange({ ...currentFilters, [key]: value });
    }
  };

  const toggleRoomFilter = (filterId: string) => {
    const current = currentFilters.roomFilters;
    const updated = current.includes(filterId)
      ? current.filter((f) => f !== filterId)
      : [...current, filterId];
    updateFilter("roomFilters", updated);
  };

  const clearFilters = () => {
    if (onFiltersChange) {
      onFiltersChange({
        ...defaultFilters,
        lengthOfStay: "nightly",
        priceRange: [0, priceRanges.nightly.max],
        rewardsMember: false,
        exclusiveDiscount: "none",
      });
    }
    setBudgetPeriod("nightly");
  };

  const handleExclusiveDiscountChange = (discount: ExclusiveDiscount) => {
    if (onFiltersChange) {
      onFiltersChange({
        ...currentFilters,
        exclusiveDiscount: currentFilters.exclusiveDiscount === discount ? "none" : discount,
      });
    }
  };

  const handleLengthOfStayChange = (value: LengthOfStay) => {
    const nights = LENGTH_OF_STAY_NIGHTS[value];
    const newCheckOut = currentFilters.checkIn ? addDays(currentFilters.checkIn, nights) : undefined;
    if (onFiltersChange) {
      onFiltersChange({
        ...currentFilters,
        lengthOfStay: value,
        checkOut: newCheckOut,
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.();
  };

  const handleBudgetPeriodChange = (period: BudgetPeriod) => {
    const currentMax = priceRanges[budgetPeriod].max;
    const newMax = priceRanges[period].max;
    
    // Convert current range proportionally to new period
    const currentRatio = currentFilters.priceRange[1] / currentMax;
    const newValue = Math.round(currentRatio * newMax);
    
    setBudgetPeriod(period);
    updateFilter("priceRange", [0, Math.min(newValue, newMax)]);
  };

  const currentPeriodConfig = priceRanges[budgetPeriod];
  
  const activeFilterCount = currentFilters.roomFilters.length + 
    (currentFilters.priceRange[1] < currentPeriodConfig.max ? 1 : 0);

  const renderFilterGroup = (title: string, filterItems: typeof FLOOR_FILTERS) => (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-muted-foreground">{title}</Label>
      <div className="flex flex-wrap gap-2">
        {filterItems.map((filter) => {
          const isSelected = currentFilters.roomFilters.includes(filter.id);
          const Icon = filter.icon;
          return (
            <Badge
              key={filter.id}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer gap-1.5 py-1.5 px-3",
                isSelected && "bg-primary text-primary-foreground"
              )}
              onClick={() => toggleRoomFilter(filter.id)}
              data-testid={`filter-${filter.id}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {filter.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );

  const periodLabels: Record<BudgetPeriod, string> = {
    nightly: "Nightly",
    weekly: "Weekly",
    monthly: "Monthly",
  };

  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center" data-testid="hero-section">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : "linear-gradient(135deg, hsl(207 85% 28%) 0%, hsl(210 50% 20%) 100%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 text-center text-white">
        <Badge className="mb-6 bg-white/20 backdrop-blur-sm text-white border-white/30" data-testid="badge-rewards-hero">
          <Gift className="w-3 h-3 mr-1" />
          Join Rewards & Save 10% on Every Booking
        </Badge>

        <h1
          className="text-4xl md:text-5xl lg:text-7xl font-bold mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
          data-testid="text-hotel-name"
        >
          {hotelName}
        </h1>
        <p className="text-lg md:text-xl lg:text-2xl text-white/90 mb-8 max-w-2xl mx-auto" data-testid="text-tagline">
          {tagline}
        </p>

        <Card className="max-w-4xl mx-auto bg-white/90 backdrop-blur-md p-3 md:p-6 border-0 shadow-2xl">
          <form onSubmit={handleSearch}>
            {/* Mobile: Compact 2-column layout */}
            <div className="grid grid-cols-2 gap-2 md:hidden">
              <div className="space-y-1">
                <Label className="text-foreground text-xs font-medium">Check-in</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal text-xs h-8",
                        !currentFilters.checkIn && "text-muted-foreground"
                      )}
                      data-testid="input-checkin-date-mobile"
                    >
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {currentFilters.checkIn ? format(currentFilters.checkIn, "MMM d") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={currentFilters.checkIn}
                      onSelect={(date) => {
                        if (onFiltersChange) {
                          const nights = LENGTH_OF_STAY_NIGHTS[currentFilters.lengthOfStay];
                          const newCheckOut = date ? addDays(date, nights) : undefined;
                          onFiltersChange({
                            ...currentFilters,
                            checkIn: date,
                            checkOut: newCheckOut,
                          });
                        }
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <Label className="text-foreground text-xs font-medium">Check-out</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal text-xs h-8",
                        !currentFilters.checkOut && "text-muted-foreground"
                      )}
                      data-testid="input-checkout-date-mobile"
                    >
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {currentFilters.checkOut ? format(currentFilters.checkOut, "MMM d") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={currentFilters.checkOut}
                      onSelect={(date) => updateFilter("checkOut", date)}
                      disabled={(date) => date <= (currentFilters.checkIn || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="w-full gap-1 relative h-8 text-xs" 
                    data-testid="button-filters-mobile"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="default" className="ml-1 text-xs px-1 py-0">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 sm:w-96 overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="flex items-center justify-between gap-2">
                      <span>Filters</span>
                      {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                          <X className="w-4 h-4 mr-1" />
                          Clear
                        </Button>
                      )}
                    </SheetTitle>
                  </SheetHeader>
                  
                  <div className="mt-6 space-y-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Length of Stay</Label>
                      <Select
                        value={currentFilters.lengthOfStay}
                        onValueChange={(value) => handleLengthOfStayChange(value as LengthOfStay)}
                      >
                        <SelectTrigger data-testid="select-length-of-stay-mobile">
                          <SelectValue placeholder="Length of Stay" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nightly">Nightly</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-4">
                      <Label className="text-sm font-medium">Budget</Label>
                      
                      <Tabs value={budgetPeriod} onValueChange={(v) => handleBudgetPeriodChange(v as BudgetPeriod)}>
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="nightly">Nightly</TabsTrigger>
                          <TabsTrigger value="weekly">Weekly</TabsTrigger>
                          <TabsTrigger value="monthly">Monthly</TabsTrigger>
                        </TabsList>
                      </Tabs>
                      
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-muted-foreground">{periodLabels[budgetPeriod]} Budget</span>
                          <span className="text-sm font-medium">
                            ${currentFilters.priceRange[0]} - ${currentFilters.priceRange[1]}
                          </span>
                        </div>
                        <Slider
                          value={currentFilters.priceRange}
                          onValueChange={(value) => updateFilter("priceRange", value as [number, number])}
                          min={0}
                          max={currentPeriodConfig.max}
                          step={budgetPeriod === "monthly" ? 50 : budgetPeriod === "weekly" ? 25 : 5}
                        />
                      </div>
                    </div>

                    <div className="border-t pt-6 space-y-6">
                      {renderFilterGroup("Floor", FLOOR_FILTERS)}
                      {renderFilterGroup("Bed Type", BED_FILTERS)}
                      {renderFilterGroup("Location", LOCATION_FILTERS)}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Button type="submit" size="sm" className="w-full gap-1 h-8 text-xs" data-testid="button-search-rooms-mobile">
                <Search className="w-3 h-3" />
                Search
              </Button>
            </div>

            {/* Desktop: Full 5-column layout */}
            <div className="hidden md:grid md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground text-sm font-medium">
                  Length of Stay
                </Label>
                <Select
                  value={currentFilters.lengthOfStay}
                  onValueChange={(value) => handleLengthOfStayChange(value as LengthOfStay)}
                >
                  <SelectTrigger data-testid="select-length-of-stay">
                    <SelectValue placeholder="Length of Stay" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nightly">Nightly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Check-in
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !currentFilters.checkIn && "text-muted-foreground"
                      )}
                      data-testid="input-checkin-date"
                    >
                      {currentFilters.checkIn ? format(currentFilters.checkIn, "MMM d") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={currentFilters.checkIn}
                      onSelect={(date) => {
                        if (onFiltersChange) {
                          const nights = LENGTH_OF_STAY_NIGHTS[currentFilters.lengthOfStay];
                          const newCheckOut = date ? addDays(date, nights) : undefined;
                          onFiltersChange({
                            ...currentFilters,
                            checkIn: date,
                            checkOut: newCheckOut,
                          });
                        }
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Check-out
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !currentFilters.checkOut && "text-muted-foreground"
                      )}
                      data-testid="input-checkout-date"
                    >
                      {currentFilters.checkOut ? format(currentFilters.checkOut, "MMM d") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={currentFilters.checkOut}
                      onSelect={(date) => updateFilter("checkOut", date)}
                      disabled={(date) => date <= (currentFilters.checkIn || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-end">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full gap-2 relative" 
                      data-testid="button-filters"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      Filters
                      {activeFilterCount > 0 && (
                        <Badge variant="default" className="ml-1 text-xs">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 sm:w-96 overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="flex items-center justify-between">
                        <span>Filters</span>
                        {activeFilterCount > 0 && (
                          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                            <X className="w-4 h-4 mr-1" />
                            Clear All
                          </Button>
                        )}
                      </SheetTitle>
                    </SheetHeader>
                    
                    <div className="mt-6 space-y-6">
                      <div className="space-y-4">
                        <Label className="text-sm font-medium">Budget</Label>
                        
                        <Tabs value={budgetPeriod} onValueChange={(v) => handleBudgetPeriodChange(v as BudgetPeriod)}>
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="nightly" data-testid="tab-nightly">Nightly</TabsTrigger>
                            <TabsTrigger value="weekly" data-testid="tab-weekly">Weekly</TabsTrigger>
                            <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly</TabsTrigger>
                          </TabsList>
                        </Tabs>
                        
                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-muted-foreground">{periodLabels[budgetPeriod]} Budget</span>
                            <span className="text-sm font-medium" data-testid="text-price-range">
                              ${currentFilters.priceRange[0]} - ${currentFilters.priceRange[1]}
                            </span>
                          </div>
                          <Slider
                            value={currentFilters.priceRange}
                            onValueChange={(value) => updateFilter("priceRange", value as [number, number])}
                            min={0}
                            max={currentPeriodConfig.max}
                            step={budgetPeriod === "monthly" ? 50 : budgetPeriod === "weekly" ? 25 : 5}
                            data-testid="slider-price-range"
                          />
                          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                            <span>$0</span>
                            <span>${currentPeriodConfig.max}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6 space-y-6">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium text-muted-foreground">Discounts</Label>
                          <p className="text-xs text-muted-foreground">
                            Rewards stacks with other discounts. Other discounts don't stack.
                          </p>
                          
                          <div
                            className={cn(
                              "flex items-center justify-between gap-2 p-3 rounded-md cursor-pointer transition-colors",
                              currentFilters.rewardsMember ? "bg-primary/10 border border-primary" : "bg-muted/50"
                            )}
                            onClick={() => updateFilter("rewardsMember", !currentFilters.rewardsMember)}
                            data-testid="toggle-rewards-member"
                          >
                            <div className="flex items-center gap-2">
                              <Gift className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">Rewards Member</span>
                            </div>
                            <span className="text-xs text-muted-foreground">10% off</span>
                          </div>

                          <div className="space-y-2 pt-2">
                            <p className="text-xs text-muted-foreground font-medium">
                              Select one (if applicable):
                            </p>
                            
                            <button
                              type="button"
                              disabled={currentFilters.lengthOfStay !== "nightly"}
                              className={cn(
                                "flex items-center justify-between gap-2 p-3 rounded-md transition-colors w-full text-left",
                                currentFilters.exclusiveDiscount === "local" ? "bg-primary/10 border border-primary" : "bg-muted/50",
                                currentFilters.lengthOfStay !== "nightly" && "opacity-50 cursor-not-allowed"
                              )}
                              onClick={() => handleExclusiveDiscountChange("local")}
                              data-testid="toggle-local-discount"
                            >
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">Local Resident</span>
                              </div>
                              <span className="text-xs text-muted-foreground">10% off</span>
                            </button>

                            <button
                              type="button"
                              disabled={currentFilters.lengthOfStay !== "nightly"}
                              className={cn(
                                "flex items-center justify-between gap-2 p-3 rounded-md transition-colors w-full text-left",
                                currentFilters.exclusiveDiscount === "military" ? "bg-primary/10 border border-primary" : "bg-muted/50",
                                currentFilters.lengthOfStay !== "nightly" && "opacity-50 cursor-not-allowed"
                              )}
                              onClick={() => handleExclusiveDiscountChange("military")}
                              data-testid="toggle-military-discount"
                            >
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">Military / Veteran</span>
                              </div>
                              <span className="text-xs text-muted-foreground">10% off</span>
                            </button>

                            <button
                              type="button"
                              disabled={currentFilters.lengthOfStay !== "nightly"}
                              className={cn(
                                "flex items-center justify-between gap-2 p-3 rounded-md transition-colors w-full text-left",
                                currentFilters.exclusiveDiscount === "senior" ? "bg-primary/10 border border-primary" : "bg-muted/50",
                                currentFilters.lengthOfStay !== "nightly" && "opacity-50 cursor-not-allowed"
                              )}
                              onClick={() => handleExclusiveDiscountChange("senior")}
                              data-testid="toggle-senior-discount"
                            >
                              <div className="flex items-center gap-2">
                                <Heart className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">Senior (65+)</span>
                              </div>
                              <span className="text-xs text-muted-foreground">10% off</span>
                            </button>

                            {currentFilters.lengthOfStay !== "nightly" && (
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                Weekly/monthly rates already include discounts
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-medium text-muted-foreground">Guests</Label>
                          <Select
                            value={currentFilters.guests.toString()}
                            onValueChange={(value) => updateFilter("guests", parseInt(value))}
                          >
                            <SelectTrigger data-testid="select-guests">
                              <Users className="mr-2 h-4 w-4" />
                              <SelectValue placeholder="Guests" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 Guest</SelectItem>
                              <SelectItem value="2">2 Guests</SelectItem>
                              <SelectItem value="3">3 Guests</SelectItem>
                              <SelectItem value="4">4 Guests</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {renderFilterGroup("Floor", FLOOR_FILTERS)}
                        {renderFilterGroup("Bed Type", BED_FILTERS)}
                        {renderFilterGroup("Location", LOCATION_FILTERS)}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              <div className="flex items-end">
                <Button type="submit" className="w-full gap-2" data-testid="button-search-rooms">
                  <Search className="w-4 h-4" />
                  Search
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </section>
  );
}
