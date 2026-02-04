import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Loader2, Phone, KeyRound, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type LoginStep = "phone" | "otp";

export default function Login() {
  const [step, setStep] = useState<LoginStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const { toast } = useToast();
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const sendOtpMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest("POST", "/api/auth/send-otp", { phone: phoneNumber });
      return response.json();
    },
    onSuccess: (data) => {
      setMaskedPhone(data.phone);
      setStep("otp");
      toast({
        title: "Code Sent",
        description: `Verification code sent to ***-***-${data.phone}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) => {
      const response = await apiRequest("POST", "/api/auth/verify-otp", { phone, code });
      return response.json();
    },
    onSuccess: (data) => {
      login(data.token, data.user);
      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.user.name || data.user.phone}`,
      });
      // Use window.location for reliable redirect after auth state update
      window.location.href = "/dashboard";
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired code",
        variant: "destructive",
      });
    },
  });

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      toast({
        title: "Invalid Phone",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }
    sendOtpMutation.mutate(phone);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit verification code",
        variant: "destructive",
      });
      return;
    }
    verifyOtpMutation.mutate({ phone, code: otp });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <Card className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-purple-400" />
          </div>
          <CardTitle className="text-2xl text-white">Admin Login</CardTitle>
          <CardDescription className="text-purple-200/70">
            {step === "phone"
              ? "Enter your phone number to receive a verification code"
              : `Enter the code sent to ***-***-${maskedPhone}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                <Input
                  data-testid="input-phone"
                  type="tel"
                  placeholder="(702) 540-5471"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12"
                  disabled={sendOtpMutation.isPending}
                />
              </div>
              <Button
                type="submit"
                data-testid="button-send-code"
                className="w-full h-12 bg-purple-600 hover:bg-purple-500"
                disabled={sendOtpMutation.isPending}
              >
                {sendOtpMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                <Input
                  data-testid="input-otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12 text-center text-2xl tracking-widest"
                  disabled={verifyOtpMutation.isPending}
                  maxLength={6}
                />
              </div>
              <Button
                type="submit"
                data-testid="button-verify-code"
                className="w-full h-12 bg-purple-600 hover:bg-purple-500"
                disabled={verifyOtpMutation.isPending}
              >
                {verifyOtpMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Login"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                data-testid="button-back"
                className="w-full text-purple-300 hover:text-white hover:bg-white/10"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                }}
                disabled={verifyOtpMutation.isPending}
              >
                Use a different number
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
