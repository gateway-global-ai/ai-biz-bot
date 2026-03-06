import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  Gift, 
  BedDouble,
  Wifi,
  Car,
  Coffee,
  CheckCircle,
  Loader2,
  Phone,
  Shield,
  MapPin,
  Star
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";

interface BookingState {
  roomId: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;      // Total price for the entire stay from Cloudbeds
  perNightPrice?: number;  // Per-night rate
  nights?: number;         // Number of nights
  price?: number;          // Legacy: for backwards compatibility
  imageUrl?: string;
  lengthOfStay?: "nightly" | "weekly" | "monthly"; // Rate plan type
  rewardsMember?: boolean; // Pre-selected from search filters
  exclusiveDiscount?: "none" | "local" | "military" | "senior"; // Pre-selected from search filters
}

export default function Booking() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/booking/:roomId");
  const { toast } = useToast();
  
  const [bookingState, setBookingState] = useState<BookingState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRewardsMember, setIsRewardsMember] = useState(false);
  const [exclusiveDiscount, setExclusiveDiscount] = useState<"none" | "local" | "military" | "senior">("none");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialRequests: ""
  });

  useEffect(() => {
    const storedBooking = sessionStorage.getItem("pendingBooking");
    if (storedBooking) {
      const parsed = JSON.parse(storedBooking);
      setBookingState(parsed);
      // Hydrate discount selections from search filters
      if (parsed.rewardsMember) {
        setIsRewardsMember(true);
      }
      if (parsed.exclusiveDiscount && parsed.exclusiveDiscount !== "none") {
        setExclusiveDiscount(parsed.exclusiveDiscount);
      }
    } else if (!params?.roomId) {
      navigate("/rooms");
    }
  }, [params, navigate]);

  const { data: roomsData } = useQuery<{ data: { roomTypes: any[] } }>({
    queryKey: ["/api/cloudbeds/room-types"],
    enabled: !!params?.roomId && !bookingState
  });

  // Fetch taxes from Cloudbeds
  const { data: taxData } = useQuery<{ 
    success: boolean; 
    data: { 
      taxes: Array<{ id: string; name: string; amount: number; amountType: string }>;
      combinedTaxRate: number;
    } 
  }>({
    queryKey: ["/api/cloudbeds/taxes"],
  });

  const taxRate = taxData?.data?.combinedTaxRate || 26.95; // Default to actual rate if API fails
  const taxItems = taxData?.data?.taxes || [];

  useEffect(() => {
    if (roomsData?.data?.roomTypes && params?.roomId && !bookingState) {
      const room = roomsData.data.roomTypes.find((r: any) => r.id === params.roomId);
      if (room) {
        const today = new Date();
        const tomorrow = addDays(today, 1);
        setBookingState({
          roomId: room.id,
          roomName: room.name,
          checkIn: format(today, "yyyy-MM-dd"),
          checkOut: format(tomorrow, "yyyy-MM-dd"),
          guests: 2,
          totalPrice: room.price || 69,
          perNightPrice: room.price || 69,
          nights: 1,
          imageUrl: room.imageUrl
        });
      }
    }
  }, [roomsData, params, bookingState]);

  if (!bookingState) {
    return (
      <div className="min-h-screen" data-testid="page-booking-loading">
        <Header />
        <main className="pt-24 pb-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  const nights = bookingState.nights || differenceInDays(
    new Date(bookingState.checkOut),
    new Date(bookingState.checkIn)
  ) || 1;

  // Use totalPrice directly from Cloudbeds (already includes best rate plan)
  // Fall back to legacy price * nights for backwards compatibility
  const baseTotal = bookingState.totalPrice || (bookingState.price ? bookingState.price * nights : 0);
  const perNight = bookingState.perNightPrice || Math.round(baseTotal / nights);
  
  // Determine if exclusive discounts should be shown (only for nightly stays)
  const isNightlyStay = bookingState.lengthOfStay === "nightly" || (!bookingState.lengthOfStay && nights <= 6);
  
  // Currency formatter for consistent display
  const formatCurrency = (amount: number) => {
    // If amount is a whole dollar, show without decimals
    return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
  };
  
  // Calculate discounts SEQUENTIALLY: exclusive first, then rewards on discounted amount
  // This stacks to 19% total (not 20%) as per project requirements
  const exclusiveDiscountAmount = (isNightlyStay && exclusiveDiscount !== "none") 
    ? baseTotal * 0.1 
    : 0;
  const afterExclusiveDiscount = baseTotal - exclusiveDiscountAmount;
  
  // Rewards discount applies to subtotal AFTER exclusive discount
  const rewardsDiscount = isRewardsMember ? afterExclusiveDiscount * 0.1 : 0;
  
  const totalDiscounts = exclusiveDiscountAmount + rewardsDiscount;
  const subtotalAfterDiscounts = afterExclusiveDiscount - rewardsDiscount;
  const taxes = subtotalAfterDiscounts * (taxRate / 100);
  const grandTotal = subtotalAfterDiscounts + taxes;
  
  // Round final values for display (to nearest cent)
  const displayRewardsDiscount = Math.round(rewardsDiscount * 100) / 100;
  const displayExclusiveDiscount = Math.round(exclusiveDiscountAmount * 100) / 100;
  const displayTotalDiscounts = Math.round(totalDiscounts * 100) / 100;
  const displayTaxes = Math.round(taxes * 100) / 100;
  const displayGrandTotal = Math.round(grandTotal * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomTypeId: bookingState.roomId,
          startDate: bookingState.checkIn,
          endDate: bookingState.checkOut,
          adults: bookingState.guests,
          children: 0,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          specialRequests: formData.specialRequests,
          isRewardsMember,
          exclusiveDiscount,
          totalPrice: displayGrandTotal,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create reservation");
      }

      sessionStorage.removeItem("pendingBooking");
      
      toast({
        title: "Reservation Created!",
        description: result.message || `Your reservation for ${bookingState.roomName} has been created. Check your email for the payment link.`,
      });

      // Store confirmation for display
      sessionStorage.setItem("reservationConfirmation", JSON.stringify({
        confirmationCode: result.reservation.confirmationCode,
        payByLinkUrl: result.payByLinkUrl,
        roomName: result.reservation.roomName,
        startDate: result.reservation.startDate,
        endDate: result.reservation.endDate,
        grandTotal: result.reservation.pricing.grandTotal,
      }));

      navigate("/");
    } catch (error: any) {
      console.error("Reservation error:", error);
      toast({
        title: "Reservation Failed",
        description: error.message || "There was an error processing your reservation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" data-testid="page-booking">
      <Header />
      <main className="pt-20 pb-12 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
          <Button
            variant="ghost"
            className="mb-6 gap-2"
            onClick={() => navigate("/rooms")}
            data-testid="button-back-to-rooms"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Rooms
          </Button>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BedDouble className="w-5 h-5" />
                    Room Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-6">
                    {bookingState.imageUrl && (
                      <div className="w-full md:w-48 h-32 rounded-md overflow-hidden flex-shrink-0">
                        <img
                          src={bookingState.imageUrl}
                          alt={bookingState.roomName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2" data-testid="text-booking-room-name">
                        {bookingState.roomName}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(bookingState.checkIn), "MMM d, yyyy")}</span>
                          <span>-</span>
                          <span>{format(new Date(bookingState.checkOut), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          <span>{bookingState.guests} guest(s)</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Wifi className="w-3 h-3" />
                          Free WiFi
                        </Badge>
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Car className="w-3 h-3" />
                          Free Parking
                        </Badge>
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Coffee className="w-3 h-3" />
                          Kitchen
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Guest Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <form id="booking-form" onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          placeholder="John"
                          required
                          data-testid="input-first-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          placeholder="Doe"
                          required
                          data-testid="input-last-name"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="john@example.com"
                          required
                          data-testid="input-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          Phone *
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(337) 555-0123"
                          required
                          data-testid="input-phone"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="specialRequests">Special Requests (Optional)</Label>
                      <Input
                        id="specialRequests"
                        value={formData.specialRequests}
                        onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                        placeholder="Early check-in, extra pillows, etc."
                        data-testid="input-special-requests"
                      />
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Price Summary
                    {bookingState.lengthOfStay === "weekly" && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Weekly Rate
                      </Badge>
                    )}
                    {bookingState.lengthOfStay === "monthly" && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Monthly Rate
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        ${perNight}/night x {nights} night{nights !== 1 ? "s" : ""}
                        {bookingState.lengthOfStay === "weekly" && " (weekly rate)"}
                        {bookingState.lengthOfStay === "monthly" && " (monthly rate)"}
                      </span>
                      <span data-testid="text-base-total">${baseTotal}</span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Available Discounts (10% each)</p>
                      
                      <div
                        className={`flex items-center justify-between gap-2 p-3 rounded-md cursor-pointer transition-colors ${
                          isRewardsMember ? "bg-primary/10 border border-primary" : "bg-muted/50"
                        }`}
                        onClick={() => setIsRewardsMember(!isRewardsMember)}
                        data-testid="toggle-rewards-member"
                      >
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-primary" />
                          <span className="font-medium">Rewards Member</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isRewardsMember && (
                            <span className="text-green-600 font-medium">-{formatCurrency(displayRewardsDiscount)}</span>
                          )}
                          <input
                            type="checkbox"
                            checked={isRewardsMember}
                            onChange={(e) => setIsRewardsMember(e.target.checked)}
                            className="rounded"
                          />
                        </div>
                      </div>

                      {isNightlyStay && (
                        <>
                          <div
                            className={`flex items-center justify-between gap-2 p-3 rounded-md cursor-pointer transition-colors ${
                              exclusiveDiscount === "local" ? "bg-primary/10 border border-primary" : "bg-muted/50"
                            }`}
                            onClick={() => setExclusiveDiscount(exclusiveDiscount === "local" ? "none" : "local")}
                            data-testid="toggle-local"
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-primary" />
                              <span className="font-medium">Local Resident</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {exclusiveDiscount === "local" && (
                                <span className="text-green-600 font-medium">-{formatCurrency(displayExclusiveDiscount)}</span>
                              )}
                              <input
                                type="checkbox"
                                checked={exclusiveDiscount === "local"}
                                onChange={() => setExclusiveDiscount(exclusiveDiscount === "local" ? "none" : "local")}
                                className="rounded"
                              />
                            </div>
                          </div>

                          <div
                            className={`flex items-center justify-between gap-2 p-3 rounded-md cursor-pointer transition-colors ${
                              exclusiveDiscount === "military" ? "bg-primary/10 border border-primary" : "bg-muted/50"
                            }`}
                            onClick={() => setExclusiveDiscount(exclusiveDiscount === "military" ? "none" : "military")}
                            data-testid="toggle-military"
                          >
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-primary" />
                              <span className="font-medium">Military / Veteran</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {exclusiveDiscount === "military" && (
                                <span className="text-green-600 font-medium">-{formatCurrency(displayExclusiveDiscount)}</span>
                              )}
                              <input
                                type="checkbox"
                                checked={exclusiveDiscount === "military"}
                                onChange={() => setExclusiveDiscount(exclusiveDiscount === "military" ? "none" : "military")}
                                className="rounded"
                              />
                            </div>
                          </div>

                          <div
                            className={`flex items-center justify-between gap-2 p-3 rounded-md cursor-pointer transition-colors ${
                              exclusiveDiscount === "senior" ? "bg-primary/10 border border-primary" : "bg-muted/50"
                            }`}
                            onClick={() => setExclusiveDiscount(exclusiveDiscount === "senior" ? "none" : "senior")}
                            data-testid="toggle-senior"
                          >
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-primary" />
                              <span className="font-medium">Senior (65+)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {exclusiveDiscount === "senior" && (
                                <span className="text-green-600 font-medium">-{formatCurrency(displayExclusiveDiscount)}</span>
                              )}
                              <input
                                type="checkbox"
                                checked={exclusiveDiscount === "senior"}
                                onChange={() => setExclusiveDiscount(exclusiveDiscount === "senior" ? "none" : "senior")}
                                className="rounded"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between gap-2 text-muted-foreground">
                        <span>Taxes & fees ({taxRate.toFixed(2)}%)</span>
                        <span>{formatCurrency(displayTaxes)}</span>
                      </div>
                      {taxItems.length > 0 && (
                        <div className="text-xs text-muted-foreground pl-2 space-y-0.5">
                          {taxItems.map((tax) => (
                            <div key={tax.id} className="flex justify-between gap-2">
                              <span>{tax.name}</span>
                              <span>{tax.amount.toFixed(2)}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between gap-2 text-lg font-semibold">
                    <span>Total</span>
                    <span data-testid="text-grand-total">{formatCurrency(displayGrandTotal)}</span>
                  </div>

                  {displayTotalDiscounts > 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-3 rounded-md">
                      <CheckCircle className="w-4 h-4" />
                      <span>You're saving {formatCurrency(displayTotalDiscounts)} with your discounts!</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    form="booking-form"
                    className="w-full gap-2"
                    size="lg"
                    disabled={isSubmitting}
                    data-testid="button-confirm-booking"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Confirm Booking
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    By confirming, you agree to our terms and cancellation policy.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
