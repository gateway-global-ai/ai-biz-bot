import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, User, Bed, Plus, LogOut, ArrowRight, CalendarPlus, Phone, Shield } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface Reservation {
  id: string;
  confirmationNumber: string;
  guestName: string;
  email: string;
  phone: string;
  roomType: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  nightlyRate: number;
  totalPaid: number;
  status: "confirmed" | "checked_in" | "checked_out" | "cancelled";
}

interface ExtensionQuote {
  extensionType: "night" | "week" | "month";
  nights: number;
  newCheckOut: string;
  baseRate?: number;
  rate: number;
  discountPercent?: number;
  discountDescription?: string;
  subtotal: number;
  taxRate?: number;
  taxDescription?: string;
  tax: number;
  total: number;
  rateOverride?: boolean;
}

type LoginStep = "phone" | "otp" | "authenticated";

export default function GuestPortal() {
  const { toast } = useToast();
  const [loginStep, setLoginStep] = useState<LoginStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [selectedExtension, setSelectedExtension] = useState<"night" | "week" | "month" | null>(null);
  const [extensionQuote, setExtensionQuote] = useState<ExtensionQuote | null>(null);

  const sendCodeMutation = useMutation({
    mutationFn: async (phone: string) => {
      const res = await apiRequest("POST", "/api/auth/send-code", { phone });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setLoginStep("otp");
        toast({ title: "Code Sent", description: "Check your phone for the verification code." });
      } else {
        toast({ title: "Error", description: data.error || "Could not send code.", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Could not send verification code.", variant: "destructive" });
    }
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async (data: { phone: string; code: string }) => {
      const res = await apiRequest("POST", "/api/guest/verify-and-lookup", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.reservation) {
        setReservation(data.reservation);
        setSessionToken(data.sessionToken);
        setLoginStep("authenticated");
        toast({ title: "Welcome!", description: `Found your reservation, ${data.reservation.guestName}!` });
      } else if (data.success && !data.reservation) {
        toast({ title: "No Reservation", description: "No reservation found for this phone number.", variant: "destructive" });
        setLoginStep("phone");
      } else {
        toast({ title: "Invalid Code", description: "The verification code is incorrect.", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Verification failed. Please try again.", variant: "destructive" });
    }
  });

  const quoteMutation = useMutation({
    mutationFn: async (data: { sessionToken: string; extensionType: "night" | "week" | "month" }) => {
      const res = await apiRequest("POST", "/api/guest/extension-quote", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.quote) {
        setExtensionQuote(data.quote);
      } else {
        toast({ title: "Error", description: data.error || "Could not get quote.", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Could not get extension quote.", variant: "destructive" });
    }
  });

  const extendMutation = useMutation({
    mutationFn: async (data: { sessionToken: string; extensionType: "night" | "week" | "month" }) => {
      const res = await apiRequest("POST", "/api/guest/extend-stay", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.reservation) {
        setReservation(data.reservation);
        setExtensionQuote(null);
        setSelectedExtension(null);
        toast({ title: "Stay Extended!", description: `Your stay has been extended to ${format(new Date(data.reservation.checkOut), "MMMM d, yyyy")}.` });
      } else {
        toast({ title: "Error", description: data.error || "Could not extend stay.", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Could not extend stay. Please contact front desk.", variant: "destructive" });
    }
  });

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim() || phoneNumber.replace(/\D/g, '').length < 10) {
      toast({ title: "Invalid Phone", description: "Please enter a valid phone number.", variant: "destructive" });
      return;
    }
    sendCodeMutation.mutate(phoneNumber.trim());
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast({ title: "Invalid Code", description: "Please enter the 6-digit code.", variant: "destructive" });
      return;
    }
    verifyCodeMutation.mutate({ phone: phoneNumber.trim(), code: otpCode });
  };

  const handleSelectExtension = (type: "night" | "week" | "month") => {
    if (!sessionToken) return;
    setSelectedExtension(type);
    quoteMutation.mutate({ sessionToken, extensionType: type });
  };

  const handleConfirmExtension = () => {
    if (!sessionToken || !selectedExtension) return;
    extendMutation.mutate({ sessionToken, extensionType: selectedExtension });
  };

  const handleLogout = () => {
    setReservation(null);
    setSessionToken(null);
    setPhoneNumber("");
    setOtpCode("");
    setSelectedExtension(null);
    setExtensionQuote(null);
    setLoginStep("phone");
  };

  const getStatusBadge = (status: Reservation["status"]) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="secondary">Confirmed</Badge>;
      case "checked_in":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Checked In</Badge>;
      case "checked_out":
        return <Badge variant="outline">Checked Out</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const canExtend = reservation && (reservation.status === "confirmed" || reservation.status === "checked_in");

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Guest Portal
            </h1>
            <p className="text-muted-foreground">
              View your reservation details and extend your stay
            </p>
          </div>

          {loginStep === "phone" && (
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Sign In
                </CardTitle>
                <CardDescription>
                  Enter your phone number to access your reservation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(337) 555-1234"
                      value={formatPhoneInput(phoneNumber)}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      data-testid="input-phone-number"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={sendCodeMutation.isPending}
                    data-testid="button-send-code"
                  >
                    {sendCodeMutation.isPending ? "Sending..." : "Send Verification Code"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {loginStep === "otp" && (
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Enter Verification Code
                </CardTitle>
                <CardDescription>
                  We sent a 6-digit code to {formatPhoneInput(phoneNumber)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otpCode}
                      onChange={setOtpCode}
                      data-testid="input-otp-code"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={verifyCodeMutation.isPending || otpCode.length !== 6}
                    data-testid="button-verify-code"
                  >
                    {verifyCodeMutation.isPending ? "Verifying..." : "Verify & Continue"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => { setLoginStep("phone"); setOtpCode(""); }}
                    data-testid="button-back-to-phone"
                  >
                    Use a different number
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {loginStep === "authenticated" && reservation && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-xl font-semibold">Welcome, {reservation.guestName}</h2>
                  <p className="text-sm text-muted-foreground">Confirmation: {reservation.confirmationNumber}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout-portal">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Bed className="h-5 w-5" />
                      {reservation.roomType}
                    </CardTitle>
                    {getStatusBadge(reservation.status)}
                  </div>
                  <CardDescription>Room {reservation.roomNumber}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Check-in
                      </p>
                      <p className="font-medium" data-testid="text-checkin-date">
                        {format(new Date(reservation.checkIn), "EEEE, MMMM d, yyyy")}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Check-out
                      </p>
                      <p className="font-medium" data-testid="text-checkout-date">
                        {format(new Date(reservation.checkOut), "EEEE, MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Nights</p>
                      <p className="font-medium" data-testid="text-total-nights">
                        {differenceInDays(new Date(reservation.checkOut), new Date(reservation.checkIn))} nights
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Nightly Rate</p>
                      <p className="font-medium">${reservation.nightlyRate.toFixed(2)}/night</p>
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 rounded-md p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Amount Paid</p>
                      <p className="text-lg font-bold text-primary" data-testid="text-total-paid">
                        ${reservation.totalPaid.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {canExtend && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarPlus className="h-5 w-5" />
                      Extend Your Stay
                    </CardTitle>
                    <CardDescription>
                      Enjoying your visit? Add more time to your reservation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Button
                        variant={selectedExtension === "night" ? "default" : "outline"}
                        className="flex flex-col h-auto py-4 gap-1"
                        onClick={() => handleSelectExtension("night")}
                        data-testid="button-extend-night"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="font-semibold">+1 Night</span>
                        <span className="text-xs opacity-80">Quick extension</span>
                      </Button>
                      <Button
                        variant={selectedExtension === "week" ? "default" : "outline"}
                        className="flex flex-col h-auto py-4 gap-1"
                        onClick={() => handleSelectExtension("week")}
                        data-testid="button-extend-week"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="font-semibold">+1 Week</span>
                        <span className="text-xs opacity-80">7 nights (10% off)</span>
                      </Button>
                      <Button
                        variant={selectedExtension === "month" ? "default" : "outline"}
                        className="flex flex-col h-auto py-4 gap-1"
                        onClick={() => handleSelectExtension("month")}
                        data-testid="button-extend-month"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="font-semibold">+1 Month</span>
                        <span className="text-xs opacity-80">30 nights (20% off)</span>
                      </Button>
                    </div>

                    {quoteMutation.isPending && (
                      <div className="text-center py-4 text-muted-foreground">
                        Calculating extension price...
                      </div>
                    )}

                    {extensionQuote && (
                      <div className="border rounded-md p-4 space-y-3 bg-muted/30">
                        <h4 className="font-medium flex items-center gap-2">
                          <ArrowRight className="h-4 w-4" />
                          Extension Summary
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">New Check-out Date</span>
                            <span className="font-medium" data-testid="text-new-checkout">
                              {format(new Date(extensionQuote.newCheckOut), "MMMM d, yyyy")}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Additional Nights</span>
                            <span>{extensionQuote.nights} nights</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Rate</span>
                            <span>${extensionQuote.rate?.toFixed(2) || '0.00'}/night</span>
                          </div>
                          {extensionQuote.discountPercent > 0 && (
                            <div className="flex justify-between text-green-600 dark:text-green-400 text-xs">
                              <span>{extensionQuote.discountDescription}</span>
                              <span>-{extensionQuote.discountPercent}%</span>
                            </div>
                          )}
                          <Separator />
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>${extensionQuote.subtotal?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              {extensionQuote.taxDescription || 'Tax (12%)'}
                            </span>
                            <span>${extensionQuote.tax?.toFixed(2) || '0.00'}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between text-base font-semibold">
                            <span>Total Due</span>
                            <span className="text-primary" data-testid="text-extension-total">
                              ${extensionQuote.total?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        </div>
                        <Button 
                          className="w-full mt-4" 
                          onClick={handleConfirmExtension}
                          disabled={extendMutation.isPending}
                          data-testid="button-confirm-extension"
                        >
                          {extendMutation.isPending ? "Processing..." : `Extend Stay - $${extensionQuote.total?.toFixed(2) || '0.00'}`}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                          Payment will be processed at the front desk
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {!canExtend && reservation.status === "checked_out" && (
                <Card className="bg-muted/50">
                  <CardContent className="py-6 text-center">
                    <p className="text-muted-foreground">
                      This reservation has been completed. Thank you for staying with us!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
