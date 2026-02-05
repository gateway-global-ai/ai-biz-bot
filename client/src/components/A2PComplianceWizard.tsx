import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Building2, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Shield, 
  DollarSign,
  ChevronRight,
  Loader2,
  Plus,
  Send,
  CreditCard
} from "lucide-react";
import type { A2pBrand, A2pCampaign } from "@shared/schema";

const VERTICALS = [
  'TECHNOLOGY',
  'HEALTHCARE',
  'RETAIL',
  'FINANCIAL',
  'EDUCATION',
  'ENTERTAINMENT',
  'REAL_ESTATE',
  'HOSPITALITY',
  'PROFESSIONAL_SERVICES',
  'NON_PROFIT',
  'OTHER',
];

const USE_CASES = [
  { value: 'CUSTOMER_CARE', label: 'Customer Care', description: 'Support and service messages' },
  { value: 'MARKETING', label: 'Marketing', description: 'Promotional and marketing content' },
  { value: 'ACCOUNT_NOTIFICATION', label: 'Account Notifications', description: 'Account updates and alerts' },
  { value: 'DELIVERY_NOTIFICATION', label: 'Delivery Notifications', description: 'Shipping and delivery updates' },
  { value: 'FRAUD_ALERT', label: 'Fraud Alerts', description: 'Security and fraud notifications' },
  { value: '2FA', label: 'Two-Factor Authentication', description: 'Login verification codes' },
  { value: 'MIXED', label: 'Mixed', description: 'Multiple use cases' },
];

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'approved':
      return <Badge className="bg-green-500/20 text-green-600 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    case 'rejected':
    case 'failed':
      return <Badge className="bg-red-500/20 text-red-600 border-red-500/30"><AlertCircle className="h-3 w-3 mr-1" /> {status}</Badge>;
    default:
      return <Badge className="bg-muted text-muted-foreground"><FileText className="h-3 w-3 mr-1" /> Draft</Badge>;
  }
}

interface BrandFormData {
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  taxId: string;
  website: string;
  vertical: string;
}

interface CampaignFormData {
  useCase: string;
  description: string;
  messageFlow: string;
  sampleMessage1: string;
  sampleMessage2: string;
  optInDescription: string;
  optOutDescription: string;
  helpDescription: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
}

export function A2PComplianceWizard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  const [brandForm, setBrandForm] = useState<BrandFormData>({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: 'US',
    taxId: '',
    website: '',
    vertical: '',
  });

  const [campaignForm, setCampaignForm] = useState<CampaignFormData>({
    useCase: '',
    description: '',
    messageFlow: '',
    sampleMessage1: '',
    sampleMessage2: '',
    optInDescription: '',
    optOutDescription: 'Reply STOP to unsubscribe',
    helpDescription: 'Reply HELP for support',
    privacyPolicyUrl: '',
    termsOfServiceUrl: '',
  });

  const { data: brandsData, isLoading: brandsLoading } = useQuery<{ brands: A2pBrand[] }>({
    queryKey: ['/api/a2p/brands'],
  });

  const { data: campaignsData, isLoading: campaignsLoading } = useQuery<{ campaigns: A2pCampaign[] }>({
    queryKey: ['/api/a2p/campaigns'],
  });

  const { data: pricingData } = useQuery<Record<string, any>>({
    queryKey: ['/api/a2p/pricing'],
  });

  const createBrandMutation = useMutation({
    mutationFn: async (data: BrandFormData) => {
      const response = await apiRequest('POST', '/api/a2p/brands', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Brand registration created", description: "You can now submit for review after payment." });
      queryClient.invalidateQueries({ queryKey: ['/api/a2p/brands'] });
      setShowBrandForm(false);
      setBrandForm({
        companyName: '', firstName: '', lastName: '', email: '', phone: '',
        country: 'US', taxId: '', website: '', vertical: '',
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const submitBrandMutation = useMutation({
    mutationFn: async (brandId: string) => {
      const response = await apiRequest('POST', `/api/a2p/brands/${brandId}/submit`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Brand submitted", description: "Your brand registration has been submitted for review." });
      queryClient.invalidateQueries({ queryKey: ['/api/a2p/brands'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/a2p/campaigns', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Campaign created", description: "You can now submit for review." });
      queryClient.invalidateQueries({ queryKey: ['/api/a2p/campaigns'] });
      setShowCampaignForm(false);
      setCampaignForm({
        useCase: '', description: '', messageFlow: '', sampleMessage1: '', sampleMessage2: '',
        optInDescription: '', optOutDescription: 'Reply STOP to unsubscribe',
        helpDescription: 'Reply HELP for support', privacyPolicyUrl: '', termsOfServiceUrl: '',
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const submitCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await apiRequest('POST', `/api/a2p/campaigns/${campaignId}/submit`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Campaign submitted", description: "Your campaign has been submitted for review." });
      queryClient.invalidateQueries({ queryKey: ['/api/a2p/campaigns'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const payBrandMutation = useMutation({
    mutationFn: async ({ brandId, vettingType }: { brandId: string; vettingType: string }) => {
      const response = await apiRequest('POST', `/api/a2p/brands/${brandId}/pay`, { vettingType });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({ title: "Payment Error", description: error.message, variant: "destructive" });
    },
  });

  const brands = brandsData?.brands || [];
  const campaigns = campaignsData?.campaigns || [];

  const handleCreateBrand = () => {
    if (!brandForm.companyName || !brandForm.firstName || !brandForm.lastName || !brandForm.email || !brandForm.phone) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createBrandMutation.mutate(brandForm);
  };

  const handleCreateCampaign = () => {
    if (!selectedBrandId || !campaignForm.useCase || !campaignForm.description) {
      toast({ title: "Missing fields", description: "Please select a brand and fill in required fields", variant: "destructive" });
      return;
    }
    createCampaignMutation.mutate({
      brandId: selectedBrandId,
      useCase: campaignForm.useCase,
      description: campaignForm.description,
      messageFlow: campaignForm.messageFlow,
      sampleMessages: [campaignForm.sampleMessage1, campaignForm.sampleMessage2].filter(Boolean),
      optInDescription: campaignForm.optInDescription,
      optOutDescription: campaignForm.optOutDescription,
      helpDescription: campaignForm.helpDescription,
      privacyPolicyUrl: campaignForm.privacyPolicyUrl,
      termsOfServiceUrl: campaignForm.termsOfServiceUrl,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              A2P 10-DLC Compliance
            </CardTitle>
            <CardDescription>
              Register your business for high-volume SMS messaging
            </CardDescription>
          </div>
          <Badge className="bg-blue-500/20 text-blue-600">
            Business Feature
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="brands" data-testid="tab-brands">Brands ({brands.length})</TabsTrigger>
            <TabsTrigger value="campaigns" data-testid="tab-campaigns">Campaigns ({campaigns.length})</TabsTrigger>
            <TabsTrigger value="pricing" data-testid="tab-pricing">Pricing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    Step 1: Register Brand
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Submit your business information including company name, EIN, and authorized contact.
                </CardContent>
              </Card>
              
              <Card className="border-purple-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-500" />
                    Step 2: Create Campaign
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Define your messaging use case, sample messages, and opt-in/opt-out flows.
                </CardContent>
              </Card>
              
              <Card className="border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Step 3: Get Approved
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Once approved, enjoy higher throughput and better deliverability for your SMS campaigns.
                </CardContent>
              </Card>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                Why A2P 10-DLC Registration?
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                <li>Required by carriers for business SMS in the US</li>
                <li>Higher message throughput (up to 225 SMS/second)</li>
                <li>Better deliverability and lower filtering rates</li>
                <li>Avoid carrier penalties and message blocking</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => { setActiveTab("brands"); setShowBrandForm(true); }} data-testid="button-start-registration">
                Start Registration <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="brands" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Registered Brands</h3>
              <Button size="sm" onClick={() => setShowBrandForm(!showBrandForm)} data-testid="button-add-brand">
                <Plus className="h-4 w-4 mr-1" /> Add Brand
              </Button>
            </div>

            {showBrandForm && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base">New Brand Registration</CardTitle>
                  <CardDescription>Enter your business information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input 
                        id="companyName"
                        data-testid="input-company-name"
                        value={brandForm.companyName}
                        onChange={(e) => setBrandForm(prev => ({ ...prev, companyName: e.target.value }))}
                        placeholder="Your Company Inc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxId">Tax ID (EIN)</Label>
                      <Input 
                        id="taxId"
                        data-testid="input-tax-id"
                        value={brandForm.taxId}
                        onChange={(e) => setBrandForm(prev => ({ ...prev, taxId: e.target.value }))}
                        placeholder="XX-XXXXXXX"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input 
                        id="firstName"
                        data-testid="input-first-name"
                        value={brandForm.firstName}
                        onChange={(e) => setBrandForm(prev => ({ ...prev, firstName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input 
                        id="lastName"
                        data-testid="input-last-name"
                        value={brandForm.lastName}
                        onChange={(e) => setBrandForm(prev => ({ ...prev, lastName: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input 
                        id="email"
                        type="email"
                        data-testid="input-email"
                        value={brandForm.email}
                        onChange={(e) => setBrandForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input 
                        id="phone"
                        data-testid="input-phone"
                        value={brandForm.phone}
                        onChange={(e) => setBrandForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input 
                        id="website"
                        data-testid="input-website"
                        value={brandForm.website}
                        onChange={(e) => setBrandForm(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vertical">Industry Vertical</Label>
                      <Select 
                        value={brandForm.vertical} 
                        onValueChange={(v) => setBrandForm(prev => ({ ...prev, vertical: v }))}
                      >
                        <SelectTrigger data-testid="select-vertical">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {VERTICALS.map(v => (
                            <SelectItem key={v} value={v}>{v.replace(/_/g, ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowBrandForm(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateBrand}
                      disabled={createBrandMutation.isPending}
                      data-testid="button-create-brand"
                    >
                      {createBrandMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                      Create Brand
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {brandsLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : brands.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No brands registered yet. Click "Add Brand" to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {brands.map(brand => (
                  <Card key={brand.id} className="hover-elevate">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{brand.companyName}</div>
                          <div className="text-sm text-muted-foreground">
                            {brand.firstName} {brand.lastName} - {brand.email}
                          </div>
                          {brand.amountPaid && (
                            <div className="text-xs text-green-600">
                              Paid: ${(brand.amountPaid / 100).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(brand.brandStatus)}
                        {brand.brandStatus === 'draft' && !brand.stripePaymentId && (
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => payBrandMutation.mutate({ brandId: brand.id, vettingType: 'standard' })}
                            disabled={payBrandMutation.isPending}
                            data-testid={`button-pay-brand-${brand.id}`}
                          >
                            <CreditCard className="h-3 w-3 mr-1" /> Pay & Submit
                          </Button>
                        )}
                        {brand.brandStatus === 'draft' && brand.stripePaymentId && (
                          <Button 
                            size="sm" 
                            onClick={() => submitBrandMutation.mutate(brand.id)}
                            disabled={submitBrandMutation.isPending}
                            data-testid={`button-submit-brand-${brand.id}`}
                          >
                            <Send className="h-3 w-3 mr-1" /> Submit
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Messaging Campaigns</h3>
              <Button 
                size="sm" 
                onClick={() => setShowCampaignForm(!showCampaignForm)}
                disabled={brands.length === 0}
                data-testid="button-add-campaign"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Campaign
              </Button>
            </div>

            {brands.length === 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm text-yellow-600">
                You need to register a brand before creating campaigns.
              </div>
            )}

            {showCampaignForm && brands.length > 0 && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base">New Campaign</CardTitle>
                  <CardDescription>Define your messaging use case</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Select Brand *</Label>
                      <Select value={selectedBrandId || ''} onValueChange={setSelectedBrandId}>
                        <SelectTrigger data-testid="select-brand">
                          <SelectValue placeholder="Choose a brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map(b => (
                            <SelectItem key={b.id} value={b.id}>{b.companyName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Use Case *</Label>
                      <Select 
                        value={campaignForm.useCase} 
                        onValueChange={(v) => setCampaignForm(prev => ({ ...prev, useCase: v }))}
                      >
                        <SelectTrigger data-testid="select-use-case">
                          <SelectValue placeholder="Select use case" />
                        </SelectTrigger>
                        <SelectContent>
                          {USE_CASES.map(uc => (
                            <SelectItem key={uc.value} value={uc.value}>
                              {uc.label} - {uc.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Campaign Description *</Label>
                    <Textarea 
                      id="description"
                      data-testid="input-campaign-description"
                      value={campaignForm.description}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe how you will use SMS messaging..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="messageFlow">Message Flow (Opt-in Process)</Label>
                    <Textarea 
                      id="messageFlow"
                      data-testid="input-message-flow"
                      value={campaignForm.messageFlow}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, messageFlow: e.target.value }))}
                      placeholder="Describe how users opt-in to receive messages..."
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sampleMessage1">Sample Message 1</Label>
                      <Textarea 
                        id="sampleMessage1"
                        data-testid="input-sample-message-1"
                        value={campaignForm.sampleMessage1}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, sampleMessage1: e.target.value }))}
                        placeholder="Example message you would send..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sampleMessage2">Sample Message 2</Label>
                      <Textarea 
                        id="sampleMessage2"
                        data-testid="input-sample-message-2"
                        value={campaignForm.sampleMessage2}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, sampleMessage2: e.target.value }))}
                        placeholder="Another example message..."
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="privacyUrl">Privacy Policy URL</Label>
                      <Input 
                        id="privacyUrl"
                        data-testid="input-privacy-url"
                        value={campaignForm.privacyPolicyUrl}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, privacyPolicyUrl: e.target.value }))}
                        placeholder="https://example.com/privacy"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tosUrl">Terms of Service URL</Label>
                      <Input 
                        id="tosUrl"
                        data-testid="input-tos-url"
                        value={campaignForm.termsOfServiceUrl}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, termsOfServiceUrl: e.target.value }))}
                        placeholder="https://example.com/terms"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowCampaignForm(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateCampaign}
                      disabled={createCampaignMutation.isPending}
                      data-testid="button-create-campaign"
                    >
                      {createCampaignMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                      Create Campaign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {campaignsLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No campaigns created yet.
              </div>
            ) : (
              <div className="space-y-2">
                {campaigns.map(campaign => {
                  const brand = brands.find(b => b.id === campaign.brandId);
                  return (
                    <Card key={campaign.id} className="hover-elevate">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{campaign.useCase.replace(/_/g, ' ')}</div>
                            <div className="text-sm text-muted-foreground">
                              {brand?.companyName || 'Unknown Brand'} - {campaign.description?.slice(0, 50)}...
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(campaign.campaignStatus)}
                          {campaign.campaignStatus === 'draft' && (
                            <Button 
                              size="sm" 
                              onClick={() => submitCampaignMutation.mutate(campaign.id)}
                              disabled={submitCampaignMutation.isPending}
                              data-testid={`button-submit-campaign-${campaign.id}`}
                            >
                              <Send className="h-3 w-3 mr-1" /> Submit
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <DollarSign className="h-4 w-4" />
                    Registration Fees
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Brand Registration</span>
                    <span className="font-medium">$49.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Campaign Registration</span>
                    <span className="font-medium">$15.00 each</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Standard Vetting</span>
                    <span className="font-medium">$40.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Expedited Vetting</span>
                    <span className="font-medium">$85.00</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4" />
                    Setup Services
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium">Basic Setup</span>
                      <p className="text-xs text-muted-foreground">Brand + 1 Campaign</p>
                    </div>
                    <span className="font-medium">$99.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium">Standard Setup</span>
                      <p className="text-xs text-muted-foreground">Brand + 3 Campaigns + Vetting</p>
                    </div>
                    <span className="font-medium">$199.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium">Premium Setup</span>
                      <p className="text-xs text-muted-foreground">Full-service + Priority Support</p>
                    </div>
                    <span className="font-medium">$299.00</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Monthly Maintenance</h4>
              <p className="text-sm text-muted-foreground">
                $29/month includes ongoing compliance monitoring, status updates, and support for any carrier issues.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
