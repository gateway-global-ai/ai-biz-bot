import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { ShieldCheck } from "lucide-react";
import OtpLoginModal from "@/components/OtpLoginModal";

export default function Login() {
  const { toast } = useToast();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <OtpLoginModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={(data) => {
          login(data.token, data.user);
          toast({
            title: "Welcome back!",
            description: `Logged in as ${data.user.name || data.user.phone}`,
          });
          window.location.href = "/dashboard";
        }}
        sendOtpEndpoint="/api/auth/send-otp"
        verifyOtpEndpoint="/api/auth/verify-otp"
        icon={ShieldCheck}
        title="Admin Login"
        phonePrompt="Enter your phone number to receive a verification code"
        accentColor="blue"
        testIdPrefix="admin-login"
      />
      {!open && (
        <div className="text-center space-y-4">
          <p className="text-slate-400">Login dismissed.</p>
          <button
            className="text-blue-400 underline"
            onClick={() => setOpen(true)}
            data-testid="button-reopen-login"
          >
            Open login again
          </button>
        </div>
      )}
    </div>
  );
}
