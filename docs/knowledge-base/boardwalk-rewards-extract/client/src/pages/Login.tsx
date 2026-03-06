import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User, Building2, Gift, ArrowRight, Shield, Phone, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Login() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "success">("phone");
  
  // Staff phone login state
  const [staffPhone, setStaffPhone] = useState("");
  const [staffOtp, setStaffOtp] = useState("");
  const [staffStep, setStaffStep] = useState<"phone" | "otp" | "success">("phone");

  const sendCodeMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await apiRequest("POST", "/api/auth/send-code", { phone });
      return response.json();
    },
    onSuccess: () => {
      setStep("otp");
      toast({
        title: "Code Sent",
        description: "Check your phone for a 6-digit verification code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Code",
        description: error.message || "Please check your phone number and try again.",
        variant: "destructive",
      });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) => {
      const response = await apiRequest("POST", "/api/auth/verify-code", { phone, code });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        setStep("success");
        toast({
          title: "Phone Verified",
          description: "You're now logged in to your account.",
        });
        setTimeout(() => {
          setLocation("/");
        }, 1500);
      } else {
        toast({
          title: "Invalid Code",
          description: "The code you entered is incorrect. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length !== 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number.",
        variant: "destructive",
      });
      return;
    }
    sendCodeMutation.mutate(digits);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the complete 6-digit code.",
        variant: "destructive",
      });
      return;
    }
    const digits = phoneNumber.replace(/\D/g, '');
    verifyCodeMutation.mutate({ phone: digits, code: otpCode });
  };

  // Staff phone login mutations
  const staffSendCodeMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await apiRequest("POST", "/api/auth/send-code", { phone });
      return response.json();
    },
    onSuccess: () => {
      setStaffStep("otp");
      toast({
        title: "Code Sent",
        description: "Check your phone for a 6-digit verification code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Code",
        description: error.message || "Please check your phone number and try again.",
        variant: "destructive",
      });
    },
  });

  const staffVerifyCodeMutation = useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) => {
      const response = await apiRequest("POST", "/api/auth/verify-code", { phone, code });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        setStaffStep("success");
        toast({
          title: "Phone Verified",
          description: "Redirecting to staff dashboard...",
        });
        setTimeout(() => {
          setLocation("/admin");
        }, 1500);
      } else {
        toast({
          title: "Invalid Code",
          description: "The code you entered is incorrect. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStaffPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setStaffPhone(formatted);
  };

  const handleStaffSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = staffPhone.replace(/\D/g, '');
    if (digits.length !== 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number.",
        variant: "destructive",
      });
      return;
    }
    staffSendCodeMutation.mutate(digits);
  };

  const handleStaffVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (staffOtp.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the complete 6-digit code.",
        variant: "destructive",
      });
      return;
    }
    const digits = staffPhone.replace(/\D/g, '');
    staffVerifyCodeMutation.mutate({ phone: digits, code: staffOtp });
  };

  return (
    <div className="min-h-screen" data-testid="page-login">
      <Header />
      <main className="pt-20">
        <section className="py-16 md:py-24">
          <div className="max-w-md mx-auto px-4 md:px-6">
            <div className="text-center mb-8">
              <h1
                className="text-3xl font-bold mb-2"
                style={{ fontFamily: "'Playfair Display', serif" }}
                data-testid="text-login-title"
              >
                Welcome Back
              </h1>
              <p className="text-muted-foreground">
                Sign in to manage your reservations and rewards
              </p>
            </div>

            <Tabs defaultValue="guest" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="guest" className="gap-2" data-testid="tab-guest-login">
                  <User className="w-4 h-4" />
                  Guest
                </TabsTrigger>
                <TabsTrigger value="staff" className="gap-2" data-testid="tab-staff-login">
                  <Building2 className="w-4 h-4" />
                  Staff
                </TabsTrigger>
              </TabsList>

              <TabsContent value="guest">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Guest Login
                    </CardTitle>
                    <CardDescription>
                      {step === "phone" && "Enter your phone number to receive a verification code"}
                      {step === "otp" && "Enter the 6-digit code sent to your phone"}
                      {step === "success" && "Phone verified successfully"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {step === "phone" && (
                      <form onSubmit={handleSendCode} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="guest-phone">Phone Number</Label>
                          <Input
                            id="guest-phone"
                            type="tel"
                            value={phoneNumber}
                            onChange={handlePhoneChange}
                            placeholder="(337) 555-0123"
                            required
                            data-testid="input-guest-phone"
                          />
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full gap-2" 
                          disabled={sendCodeMutation.isPending}
                          data-testid="button-send-code"
                        >
                          {sendCodeMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Sending Code...
                            </>
                          ) : (
                            <>
                              Send Verification Code
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </Button>
                      </form>
                    )}

                    {step === "otp" && (
                      <form onSubmit={handleVerifyCode} className="space-y-6">
                        <div className="space-y-4">
                          <Label>Enter Verification Code</Label>
                          <div className="flex justify-center">
                            <InputOTP
                              value={otpCode}
                              onChange={setOtpCode}
                              maxLength={6}
                              data-testid="input-otp-code"
                            >
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                              </InputOTPGroup>
                              <InputOTPSeparator />
                              <InputOTPGroup>
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                          <p className="text-center text-sm text-muted-foreground">
                            Code sent to {phoneNumber}
                          </p>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full gap-2" 
                          disabled={verifyCodeMutation.isPending || otpCode.length !== 6}
                          data-testid="button-verify-code"
                        >
                          {verifyCodeMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              Verify Code
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full"
                          onClick={() => {
                            setStep("phone");
                            setOtpCode("");
                          }}
                          data-testid="button-back-phone"
                        >
                          Use Different Phone Number
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => sendCodeMutation.mutate(phoneNumber.replace(/\D/g, ''))}
                          disabled={sendCodeMutation.isPending}
                          data-testid="button-resend-code"
                        >
                          Resend Code
                        </Button>
                      </form>
                    )}

                    {step === "success" && (
                      <div className="text-center py-6">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Phone Verified</h3>
                        <p className="text-muted-foreground">
                          Redirecting to your account...
                        </p>
                      </div>
                    )}

                    {step === "phone" && (
                      <div className="mt-6 pt-6 border-t">
                        <div className="flex items-center gap-2 mb-4">
                          <Gift className="w-5 h-5 text-primary" />
                          <span className="font-medium">Not a rewards member yet?</span>
                        </div>
                        <Link href="/rewards">
                          <Button variant="outline" className="w-full" data-testid="button-join-rewards-login">
                            Join Rewards & Save 10%
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="staff">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">
                        <Shield className="w-3 h-3 mr-1" />
                        Staff Portal
                      </Badge>
                    </div>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Staff Login
                    </CardTitle>
                    <CardDescription>
                      {staffStep === "phone" && "Enter your phone number to receive a verification code"}
                      {staffStep === "otp" && "Enter the 6-digit code sent to your phone"}
                      {staffStep === "success" && "Phone verified successfully"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {staffStep === "phone" && (
                      <form onSubmit={handleStaffSendCode} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="staff-phone">Phone Number</Label>
                          <Input
                            id="staff-phone"
                            type="tel"
                            value={staffPhone}
                            onChange={handleStaffPhoneChange}
                            placeholder="(337) 555-0123"
                            required
                            data-testid="input-staff-phone"
                          />
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full gap-2" 
                          disabled={staffSendCodeMutation.isPending}
                          data-testid="button-staff-send-code"
                        >
                          {staffSendCodeMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Sending Code...
                            </>
                          ) : (
                            <>
                              Send Verification Code
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </Button>

                        <p className="text-center text-sm text-muted-foreground mt-4">
                          Contact your manager if you need access
                        </p>
                      </form>
                    )}

                    {staffStep === "otp" && (
                      <form onSubmit={handleStaffVerifyCode} className="space-y-6">
                        <div className="space-y-4">
                          <Label>Enter Verification Code</Label>
                          <div className="flex justify-center">
                            <InputOTP
                              value={staffOtp}
                              onChange={setStaffOtp}
                              maxLength={6}
                              data-testid="input-staff-otp"
                            >
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                              </InputOTPGroup>
                              <InputOTPSeparator />
                              <InputOTPGroup>
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                          <p className="text-center text-sm text-muted-foreground">
                            Code sent to {staffPhone}
                          </p>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full gap-2" 
                          disabled={staffVerifyCodeMutation.isPending || staffOtp.length !== 6}
                          data-testid="button-staff-verify-code"
                        >
                          {staffVerifyCodeMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              Verify Code
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full"
                          onClick={() => {
                            setStaffStep("phone");
                            setStaffOtp("");
                          }}
                          data-testid="button-staff-back"
                        >
                          Use Different Phone Number
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => staffSendCodeMutation.mutate(staffPhone.replace(/\D/g, ''))}
                          disabled={staffSendCodeMutation.isPending}
                          data-testid="button-staff-resend"
                        >
                          Resend Code
                        </Button>
                      </form>
                    )}

                    {staffStep === "success" && (
                      <div className="text-center py-6">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Phone Verified</h3>
                        <p className="text-muted-foreground">
                          Redirecting to staff dashboard...
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
