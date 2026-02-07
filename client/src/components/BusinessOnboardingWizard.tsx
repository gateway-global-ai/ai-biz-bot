import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, Building, CheckCircle2, TrendingUp, Mail, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface Place {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  userRatingCount: number;
  types: string[];
  primaryType?: string;
}

interface CompetitiveReport {
  businessName: string;
  category: string;
  location: { latitude: number; longitude: number };
  radiusMiles: number;
  competitors: {
    total: number;
    highRated: number;
    lowRated: number;
  };
}

type OnboardingStep = 'search' | 'select' | 'analysis' | 'integrations' | 'complete';

interface BusinessOnboardingWizardProps {
  onComplete?: (businessData: any) => void;
}

export function BusinessOnboardingWizard({ onComplete }: BusinessOnboardingWizardProps) {
  const [step, setStep] = useState<OnboardingStep>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [competitiveReport, setCompetitiveReport] = useState<CompetitiveReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabledIntegrations, setEnabledIntegrations] = useState({
    workspace: false,
    voiceAI: false,
  });

  const searchBusinesses = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a business name to search');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      if (data.places.length === 0) {
        setError('No businesses found. Try a different search term or include your city.');
      } else {
        setPlaces(data.places);
        setStep('select');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search for businesses');
    } finally {
      setLoading(false);
    }
  };

  const selectBusiness = async (place: Place) => {
    setSelectedPlace(place);
    setLoading(true);
    setError(null);

    try {
      // Get competitive analysis
      const response = await fetch('/api/places/owner-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: place.name,
          radiusMiles: 3,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate report');
      }

      setCompetitiveReport(data.report);
      setStep('analysis');
    } catch (err: any) {
      setError(err.message || 'Failed to analyze business');
    } finally {
      setLoading(false);
    }
  };

  const proceedToIntegrations = () => {
    setStep('integrations');
  };

  const completeOnboarding = () => {
    setStep('complete');
    
    if (onComplete) {
      onComplete({
        place: selectedPlace,
        report: competitiveReport,
        integrations: enabledIntegrations,
      });
    }
  };

  const connectGoogleWorkspace = async () => {
    try {
      const businessId = selectedPlace?.placeId || 'temp-id';
      const response = await fetch(`/api/google/auth-url?businessId=${businessId}`);
      const data = await response.json();
      
      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      }
    } catch (err) {
      setError('Failed to connect Google Workspace');
    }
  };

  const renderSearchStep = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Find Your Business
        </CardTitle>
        <CardDescription>
          Search for your business on Google to get started. We'll automatically pull your business information, reviews, and photos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Business Name</Label>
            <Input
              id="search"
              placeholder="e.g., Joe's Coffee Shop, Seattle"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchBusinesses()}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={searchBusinesses} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Search Google Places
              </>
            )}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            💡 Tip: Include your city for better results
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderSelectStep = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Select Your Business</CardTitle>
        <CardDescription>
          Found {places.length} {places.length === 1 ? 'business' : 'businesses'}. Select the correct one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {places.map((place) => (
            <Card
              key={place.placeId}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => selectBusiness(place)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectBusiness(place);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Select ${place.name} at ${place.address}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <h3 className="font-semibold">{place.name}</h3>
                    <p className="text-sm text-muted-foreground">{place.address}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">
                        ⭐ {place.rating.toFixed(1)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {place.userRatingCount} reviews
                      </span>
                      {place.primaryType && (
                        <Badge variant="outline">
                          {place.primaryType.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Building className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={() => setStep('search')} className="w-full">
            ← Search Again
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderAnalysisStep = () => {
    if (!competitiveReport || !selectedPlace) return null;

    const midRated = 
      competitiveReport.competitors.total - 
      competitiveReport.competitors.highRated - 
      competitiveReport.competitors.lowRated;

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Competitive Analysis
          </CardTitle>
          <CardDescription>
            Here's what we found about your market area
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Your Business</h3>
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium">{selectedPlace.name}</p>
              <p className="text-sm text-muted-foreground">{selectedPlace.address}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">
                  ⭐ {selectedPlace.rating.toFixed(1)}
                </Badge>
                <span className="text-sm">
                  {selectedPlace.userRatingCount} reviews
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">
              Competition within {competitiveReport.radiusMiles} miles
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{competitiveReport.competitors.total}</p>
                  <p className="text-sm text-muted-foreground">Total Competitors</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{competitiveReport.competitors.highRated}</p>
                  <p className="text-sm text-muted-foreground">High Rated (4-5★)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-yellow-600">{midRated}</p>
                  <p className="text-sm text-muted-foreground">Mid Rated (3-4★)</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              💡 <strong>Insight:</strong> Your business is in a {' '}
              {competitiveReport.competitors.total > 10 ? 'highly competitive' : 'moderately competitive'} market.
              {competitiveReport.competitors.highRated > competitiveReport.competitors.total / 2 
                ? ' Most competitors are highly rated - focus on exceptional service and unique value.'
                : ' There\'s opportunity to stand out with great service and reviews.'}
            </AlertDescription>
          </Alert>

          <Button onClick={proceedToIntegrations} className="w-full">
            Continue to Integrations →
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderIntegrationsStep = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Optional Integrations</CardTitle>
        <CardDescription>
          Enhance your business with powerful Google tools
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Google Workspace</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get professional email (@yourbusiness.com), calendar booking, and document creation
                </p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">Email</Badge>
                  <Badge variant="outline">Calendar</Badge>
                  <Badge variant="outline">Docs</Badge>
                  <Badge variant="outline">Drive</Badge>
                </div>
              </div>
            </div>
            <Button
              onClick={connectGoogleWorkspace}
              className="w-full mt-4"
              variant={enabledIntegrations.workspace ? 'secondary' : 'default'}
            >
              {enabledIntegrations.workspace ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Connected
                </>
              ) : (
                'Connect Google Workspace'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Voice AI Assistant</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                24/7 AI that answers customer questions about your business
              </p>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('analysis')} className="flex-1">
            ← Back
          </Button>
          <Button onClick={completeOnboarding} className="flex-1">
            Complete Setup →
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          You can always add integrations later from your dashboard
        </p>
      </CardContent>
    </Card>
  );

  const renderCompleteStep = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-8 text-center space-y-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold mb-2">Welcome to Gateway Global AI!</h2>
          <p className="text-muted-foreground">
            Your business is now connected and ready to go.
          </p>
        </div>

        {selectedPlace && (
          <div className="bg-muted p-4 rounded-lg text-left">
            <p className="font-medium mb-1">{selectedPlace.name}</p>
            <p className="text-sm text-muted-foreground">{selectedPlace.address}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge>⭐ {selectedPlace.rating.toFixed(1)}</Badge>
              <span className="text-sm">{selectedPlace.userRatingCount} reviews</span>
            </div>
          </div>
        )}

        <div className="space-y-2 text-left">
          <h3 className="font-semibold">What's Next?</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Your business data is loaded and ready</span>
            </li>
            {competitiveReport && (
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Competitive analysis available in your dashboard</span>
              </li>
            )}
            {enabledIntegrations.workspace && (
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Google Workspace connected and ready to use</span>
              </li>
            )}
          </ul>
        </div>

        <Button onClick={() => window.location.href = '/business'} className="w-full" size="lg">
          Go to Dashboard
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2">
          {['search', 'select', 'analysis', 'integrations', 'complete'].map((s, index) => (
            <div key={s} className="flex items-center">
              <div
                className={`h-2 w-12 rounded-full ${
                  ['search', 'select', 'analysis', 'integrations', 'complete'].indexOf(step) >= index
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
              />
              {index < 4 && <div className="w-2" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {step === 'search' && renderSearchStep()}
        {step === 'select' && renderSelectStep()}
        {step === 'analysis' && renderAnalysisStep()}
        {step === 'integrations' && renderIntegrationsStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  );
}
