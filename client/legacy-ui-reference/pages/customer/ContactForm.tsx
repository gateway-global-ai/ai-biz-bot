import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, CheckCircle2, Loader2 } from "lucide-react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/inquiries", {
        name,
        email: email || undefined,
        phone: phone || undefined,
        company: company || undefined,
        subject: subject || undefined,
        message,
        source: "website",
        status: "new",
        priority: "normal",
      });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Success!", description: "Your inquiry has been submitted" });
      // Reset form
      setName("");
      setEmail("");
      setPhone("");
      setCompany("");
      setSubject("");
      setMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit inquiry",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !message) {
      toast({ title: "Required fields", description: "Name and message are required", variant: "destructive" });
      return;
    }
    submitMutation.mutate();
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <Card className="bg-slate-800/50 border-slate-700 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
            <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
            <p className="text-slate-400 mb-6">
              Your inquiry has been received. We'll get back to you as soon as possible.
            </p>
            <Button
              onClick={() => setSubmitted(false)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Submit Another Inquiry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <Card className="bg-slate-800/50 border-slate-700 max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-purple-400" />
            Contact Us
          </CardTitle>
          <p className="text-slate-400">
            Fill out the form below and we'll get back to you shortly
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-slate-300">
                  Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-slate-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone" className="text-slate-300">
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              </div>

              <div>
                <Label htmlFor="company" className="text-slate-300">
                  Company
                </Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Your company"
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subject" className="text-slate-300">
                Subject
              </Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What's this about?"
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>

            <div>
              <Label htmlFor="message" className="text-slate-300">
                Message <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us how we can help..."
                className="bg-slate-900 border-slate-700 text-white mt-1 min-h-[150px]"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Inquiry
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
