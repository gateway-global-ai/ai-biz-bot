import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Upload, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PromotionSection() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    employer: "",
    employeeId: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      console.log("Promotion application:", formData);
      toast({
        title: "Application Submitted!",
        description: "We'll review your application and contact you within 48 hours.",
      });
    }
  };

  const eligibility = [
    "Must be a current Amazon employee in Lafayette area",
    "Valid employee ID or badge required",
    "One free week per employee per year",
    "Subject to availability",
    "Blackout dates may apply",
  ];

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 to-primary/10" data-testid="promotion-section">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/20 text-primary" data-testid="badge-promotion">
            <Sparkles className="w-3 h-3 mr-1" />
            Limited Time Offer
          </Badge>
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
            data-testid="text-promotion-title"
          >
            1 Week Free Stay for Amazon Employees
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="text-promotion-description">
            We're proud to support our local Amazon workforce. Eligible employees can enjoy
            a complimentary one-week stay at Boardwalk Suites Lafayette.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start max-w-5xl mx-auto">
          <div>
            <h3 className="text-xl font-semibold mb-4">Eligibility Requirements</h3>
            <ul className="space-y-3 mb-8">
              {eligibility.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <Card className="bg-primary text-primary-foreground">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-2">How It Works</h4>
                <ol className="space-y-2 text-sm text-primary-foreground/90">
                  <li>1. Complete the application form</li>
                  <li>2. Upload proof of employment</li>
                  <li>3. Receive confirmation within 48 hours</li>
                  <li>4. Book your free week</li>
                </ol>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-4">
                Apply for Free Stay
                <Badge variant="outline">Step {step} of 3</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {step === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="promo-name">Full Name</Label>
                      <Input
                        id="promo-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Smith"
                        required
                        data-testid="input-promo-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promo-email">Email Address</Label>
                      <Input
                        id="promo-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@email.com"
                        required
                        data-testid="input-promo-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promo-phone">Phone Number</Label>
                      <Input
                        id="promo-phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(337) 555-1234"
                        required
                        data-testid="input-promo-phone"
                      />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="promo-employer">Employer</Label>
                      <Input
                        id="promo-employer"
                        value={formData.employer}
                        onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                        placeholder="Amazon"
                        required
                        data-testid="input-promo-employer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promo-employee-id">Employee ID (Optional)</Label>
                      <Input
                        id="promo-employee-id"
                        value={formData.employeeId}
                        onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                        placeholder="A12345678"
                        data-testid="input-promo-employee-id"
                      />
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="space-y-2">
                      <Label>Upload Proof of Employment</Label>
                      <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Drag and drop your employee badge or ID, or click to browse
                        </p>
                        <Button type="button" variant="outline" size="sm" data-testid="button-upload-proof">
                          Choose File
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Accepted formats: JPG, PNG, PDF (Max 5MB)
                      </p>
                    </div>
                  </>
                )}

                <Button type="submit" className="w-full gap-2" data-testid="button-promo-next">
                  {step < 3 ? (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>

                {step > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setStep(step - 1)}
                    data-testid="button-promo-back"
                  >
                    Go Back
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
