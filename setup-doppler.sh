#!/bin/bash
#
# Doppler Secrets Manager - Quick Setup Script
# For Clear Voice Technology on Hostinger VPS
#
# Usage: ./setup-doppler.sh
#

set -e  # Exit on any error

echo "🔐 Clear Voice Technology - Doppler Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "${RED}❌ This script is for Linux only${NC}"
    echo "For macOS, run: brew install dopplerhq/cli/doppler"
    exit 1
fi

echo "📦 Step 1: Installing Doppler CLI..."
echo "------------------------------------"

# Check if Doppler is already installed
if command -v doppler &> /dev/null; then
    DOPPLER_VERSION=$(doppler --version)
    echo -e "${GREEN}✓ Doppler is already installed: $DOPPLER_VERSION${NC}"
else
    echo "Installing Doppler..."
    
    # Install prerequisites
    sudo apt-get update
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg
    
    # Add Doppler's GPG key
    curl -sLf --retry 3 --tlsv1.2 --proto "=https" \
        'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | \
        sudo gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg
    
    # Add Doppler repository
    echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" | \
        sudo tee /etc/apt/sources.list.d/doppler-cli.list
    
    # Install Doppler
    sudo apt-get update
    sudo apt-get install -y doppler
    
    echo -e "${GREEN}✓ Doppler installed successfully${NC}"
fi

echo ""
echo "🔑 Step 2: Authenticate with Doppler"
echo "------------------------------------"
echo "Opening browser for authentication..."
echo "(If browser doesn't open, visit: https://dashboard.doppler.com)"
echo ""

# Authenticate
doppler login

echo ""
echo -e "${GREEN}✓ Authentication complete${NC}"

echo ""
echo "🏗️  Step 3: Create Doppler Project"
echo "------------------------------------"
echo "Creating project: aibizbot-clearvoice"
echo ""

# Create project (will skip if exists)
doppler projects create aibizbot-clearvoice 2>/dev/null || echo "Project already exists"

# Setup in current directory
echo "Configuring project in current directory..."
doppler setup --project aibizbot-clearvoice --config dev --no-interactive

echo -e "${GREEN}✓ Project configured${NC}"

echo ""
echo "📤 Step 4: Upload Secrets from .env"
echo "------------------------------------"

if [ -f ".env" ]; then
    echo "Found .env file. Uploading secrets..."
    doppler secrets upload .env
    echo -e "${GREEN}✓ Secrets uploaded${NC}"
else
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    echo "Creating secrets from template..."
    
    # Create essential secrets
    doppler secrets set GEMINI_MODEL="models/gemini-2.5-flash-native-audio-preview-12-2025" --silent
    doppler secrets set GEMINI_API_VERSION="v1beta" --silent
    doppler secrets set GEMINI_VOICE_NAME="Puck" --silent
    doppler secrets set GEMINI_INPUT_SAMPLE_RATE="16000" --silent
    doppler secrets set GEMINI_OUTPUT_SAMPLE_RATE="24000" --silent
    doppler secrets set PORT="3004" --silent
    doppler secrets set NODE_ENV="development" --silent
    
    echo -e "${YELLOW}⚠️  IMPORTANT: Set your GEMINI_API_KEY${NC}"
    echo "Run: doppler secrets set GEMINI_API_KEY=\"your-key-here\""
fi

echo ""
echo "✅ Step 5: Verify Setup"
echo "------------------------------------"

# Show current configuration
echo "Current Doppler configuration:"
doppler configure get

echo ""
echo "Available secrets:"
doppler secrets --only-names

echo ""
echo -e "${GREEN}🎉 Doppler setup complete!${NC}"
echo ""
echo "📝 Next Steps:"
echo "------------------------------------"
echo "1. Set your API key (if not already done):"
echo "   doppler secrets set GEMINI_API_KEY=\"your-api-key\""
echo ""
echo "2. Test your application:"
echo "   doppler run -- npm run dev"
echo ""
echo "3. Build for production:"
echo "   doppler run -- npm run build"
echo "   doppler run -- node dist/index.mjs"
echo ""
echo "4. Remove local .env (optional, after testing):"
echo "   rm .env"
echo ""
echo "📚 Full documentation: docs/DOPPLER_SETUP.md"
echo ""
