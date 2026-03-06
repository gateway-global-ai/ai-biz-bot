import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sendVerificationCode, checkVerificationCode, isTwilioConfigured } from "./twilio";

const CLOUDBEDS_API_KEY = process.env.CLOUDBEDS_API_KEY;
const PROPERTY_ID = "315701";
const CLOUDBEDS_BASE_URL = "https://api.cloudbeds.com/api/v1.3";

function stripHtmlTags(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function fetchCloudbeds(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${CLOUDBEDS_BASE_URL}/${endpoint}`);
  url.searchParams.set("propertyID", PROPERTY_ID);
  
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      "accept": "application/json",
      "x-api-key": CLOUDBEDS_API_KEY || "",
    },
  });

  if (!response.ok) {
    throw new Error(`Cloudbeds API error: ${response.status}`);
  }

  return response.json();
}

// Shared helper: Select the best rate plan for a room type based on stay length
interface RatePlanResult {
  room: any;
  usedCloudbedsRatePlan: boolean;  // true if using Cloudbeds weekly/monthly plan
  ratePlanType: "nightly" | "weekly" | "monthly";
  businessRuleDiscountApplied: boolean;
}

async function selectBestRatePlan(
  roomOptions: any[],
  stayType: "nightly" | "weekly" | "monthly"
): Promise<RatePlanResult> {
  let selectedRoom = roomOptions[0]; // default to first option
  let usedCloudbedsRatePlan = false;
  let businessRuleDiscountApplied = false;
  
  // Fetch business rules for fallback discounts
  const businessRules = await storage.getBusinessRules();
  const weeklyDiscountRule = businessRules.find(r => r.code === "WEEKLY_DISCOUNT" && r.isActive);
  const monthlyDiscountRule = businessRules.find(r => r.code === "MONTHLY_DISCOUNT" && r.isActive);
  const weeklyDiscountPercent = weeklyDiscountRule ? (weeklyDiscountRule.payload as any)?.percent || 10 : 0;
  const monthlyDiscountPercent = monthlyDiscountRule ? (monthlyDiscountRule.payload as any)?.percent || 20 : 0;
  
  if (stayType === "weekly") {
    // Prefer "Weekly Rates" rate plan from Cloudbeds
    const weeklyRoom = roomOptions.find((r: any) => 
      r.ratePlanNamePublic?.toLowerCase().includes("weekly") ||
      r.ratePlanNamePrivate?.toLowerCase().includes("weekly")
    );
    if (weeklyRoom) {
      selectedRoom = weeklyRoom;
      usedCloudbedsRatePlan = true;
      console.log(`Using Cloudbeds Weekly rate plan for ${selectedRoom.roomTypeName}: $${selectedRoom.roomRate}`);
    } else if (weeklyDiscountPercent > 0 && selectedRoom.roomRate) {
      // Fallback: apply business rule discount to default rate
      selectedRoom = { 
        ...selectedRoom, 
        roomRate: Math.round(selectedRoom.roomRate * (1 - weeklyDiscountPercent / 100)),
        ratePlanNamePublic: `weekly (${weeklyDiscountPercent}% off)`
      };
      businessRuleDiscountApplied = true;
      console.log(`Applied ${weeklyDiscountPercent}% weekly discount to ${selectedRoom.roomTypeName}`);
    }
  } else if (stayType === "monthly") {
    // Prefer "Monthly Rates" rate plan from Cloudbeds
    const monthlyRoom = roomOptions.find((r: any) => 
      r.ratePlanNamePublic?.toLowerCase().includes("monthly") ||
      r.ratePlanNamePrivate?.toLowerCase().includes("monthly")
    );
    if (monthlyRoom) {
      selectedRoom = monthlyRoom;
      usedCloudbedsRatePlan = true;
      console.log(`Using Cloudbeds Monthly rate plan for ${selectedRoom.roomTypeName}: $${selectedRoom.roomRate}`);
    } else if (monthlyDiscountPercent > 0 && selectedRoom.roomRate) {
      // Fallback: apply business rule discount to default rate
      selectedRoom = { 
        ...selectedRoom, 
        roomRate: Math.round(selectedRoom.roomRate * (1 - monthlyDiscountPercent / 100)),
        ratePlanNamePublic: `monthly (${monthlyDiscountPercent}% off)`
      };
      businessRuleDiscountApplied = true;
      console.log(`Applied ${monthlyDiscountPercent}% monthly discount to ${selectedRoom.roomTypeName}`);
    }
  } else {
    // Nightly - prefer "default" rate plan
    const defaultRoom = roomOptions.find((r: any) => 
      r.ratePlanNamePublic === "default" || r.ratePlanNamePrivate === "default"
    );
    if (defaultRoom) selectedRoom = defaultRoom;
  }
  
  return {
    room: selectedRoom,
    usedCloudbedsRatePlan,
    ratePlanType: stayType,
    businessRuleDiscountApplied
  };
}

// Determine stay type from nights
function getStayType(nights: number): "nightly" | "weekly" | "monthly" {
  if (nights >= 30) return "monthly";
  if (nights >= 7) return "weekly";
  return "nightly";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/cloudbeds/hotel", async (req, res) => {
    try {
      const data = await fetchCloudbeds("getHotelDetails");
      res.json(data);
    } catch (error) {
      console.error("Error fetching hotel details:", error);
      res.status(500).json({ error: "Failed to fetch hotel details" });
    }
  });

  // Get available room types with pricing (default: today check-in, tomorrow check-out)
  app.get("/api/cloudbeds/room-types", async (req, res) => {
    try {
      const { startDate, endDate, adults, children, rooms, lengthOfStay } = req.query;
      
      // Default to today/tomorrow if no dates provided
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const formatDate = (d: Date) => d.toISOString().split('T')[0];
      
      const finalStartDate = (startDate as string) || formatDate(today);
      const finalEndDate = (endDate as string) || formatDate(tomorrow);
      
      // Validate dates: endDate must be greater than startDate
      const startDateObj = new Date(finalStartDate);
      const endDateObj = new Date(finalEndDate);
      if (endDateObj <= startDateObj) {
        // Auto-fix: set endDate to startDate + 1 day
        const correctedEndDate = new Date(startDateObj);
        correctedEndDate.setDate(correctedEndDate.getDate() + 1);
        console.log(`Date validation: endDate ${finalEndDate} <= startDate ${finalStartDate}, correcting to ${formatDate(correctedEndDate)}`);
      }
      
      const params: Record<string, string> = {
        startDate: finalStartDate,
        endDate: endDateObj > startDateObj ? finalEndDate : formatDate(new Date(startDateObj.getTime() + 86400000)),
        adults: (adults as string) || "2",
        children: (children as string) || "0",
        rooms: (rooms as string) || "1",
        detailedRates: "true",
      };

      const data = await fetchCloudbeds("getAvailableRoomTypes", params);
      console.log("getAvailableRoomTypes response:", JSON.stringify(data, null, 2));
      
      // Check for Cloudbeds API error
      if (data?.success === false) {
        console.error("Cloudbeds API error:", data.message);
        return res.status(400).json({ 
          success: false, 
          error: data.message || "Failed to fetch rooms from Cloudbeds" 
        });
      }
      
      // Response structure: data[0].propertyRooms (array of room types)
      const propertyData = data?.data?.[0] || {};
      const roomTypes = propertyData.propertyRooms || [];
      
      // Auto-compute lengthOfStay from dates if not provided
      // This ensures the correct rate plan is selected automatically
      let stayType = (lengthOfStay as string) || "nightly";
      if (!lengthOfStay && startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (nights >= 30) {
          stayType = "monthly";
        } else if (nights >= 7) {
          stayType = "weekly";
        } else {
          stayType = "nightly";
        }
        console.log(`Auto-computed lengthOfStay: ${nights} nights = ${stayType}`);
      }
      
      // Group rooms by roomTypeID and select the appropriate rate plan
      const roomsByTypeId: Record<string, any[]> = {};
      for (const room of roomTypes) {
        const id = room.roomTypeID;
        if (!roomsByTypeId[id]) {
          roomsByTypeId[id] = [];
        }
        roomsByTypeId[id].push(room);
      }
      
      // Select the best rate plan for each room type using shared helper
      const selectedRooms: any[] = [];
      for (const [roomTypeId, roomOptions] of Object.entries(roomsByTypeId)) {
        const result = await selectBestRatePlan(roomOptions, stayType as "nightly" | "weekly" | "monthly");
        selectedRooms.push(result.room);
      }
      
      const transformedRooms = selectedRooms.map((room: any) => {
        // Extract image from roomTypePhotos
        let imageUrl = "";
        if (room.roomTypePhotos && room.roomTypePhotos.length > 0) {
          const firstPhoto = room.roomTypePhotos[0];
          imageUrl = typeof firstPhoto === "string" ? firstPhoto : firstPhoto.image || firstPhoto.thumb || "";
        }
        
        // Extract amenities from roomTypeFeatures
        let amenities: string[] = [];
        if (room.roomTypeFeatures) {
          if (Array.isArray(room.roomTypeFeatures)) {
            amenities = room.roomTypeFeatures;
          } else if (typeof room.roomTypeFeatures === "object") {
            amenities = Object.values(room.roomTypeFeatures);
          }
        }
        
        // roomRate is directly on the room object for getAvailableRoomTypes
        const price = room.roomRate || 0;
        
        return {
          id: room.roomTypeID || String(Math.random()),
          name: room.roomTypeName || "Room",
          description: stripHtmlTags(room.roomTypeDescription || ""),
          maxGuests: parseInt(room.maxGuests) || 2,
          bedType: room.roomTypeBedType || "",
          sqft: room.roomTypeSqFt,
          imageUrl,
          price: Math.round(price),
          amenities,
          roomsAvailable: room.roomsAvailable || 0,
          totalUnits: room.roomTypeUnits || 0,
          roomRateID: room.roomRateID,
          ratePlanName: room.ratePlanNamePublic || "default",
          individualRooms: room.individualRooms || [],
        };
      });

      // Calculate price ranges based on actual room rates
      const prices = transformedRooms.map((r: any) => r.price).filter((p: number) => p > 0);
      const maxNightly = prices.length > 0 ? Math.max(...prices) : 99;
      
      const priceRanges = {
        nightly: { min: 0, max: maxNightly },
        weekly: { min: 0, max: 693 },  // Will be updated by /api/cloudbeds/price-ranges
        monthly: { min: 0, max: 2970 }, // Will be updated by /api/cloudbeds/price-ranges
      };

      res.json({ 
        success: true, 
        data: { roomTypes: transformedRooms, priceRanges } 
      });
    } catch (error) {
      console.error("Error fetching room types:", error);
      res.status(500).json({ error: "Failed to fetch room types" });
    }
  });

  app.get("/api/cloudbeds/rooms", async (req, res) => {
    try {
      const { checkIn, checkOut, guests } = req.query;
      
      const params: Record<string, string> = {};
      if (checkIn) params.startDate = checkIn as string;
      if (checkOut) params.endDate = checkOut as string;
      if (guests) params.adults = guests as string;
      params.detailedRates = "true";

      const data = await fetchCloudbeds("getAvailableRoomTypes", params);
      console.log("getAvailableRoomTypes response:", JSON.stringify(data, null, 2));
      
      const roomTypes = data?.data?.roomTypes || data?.data || [];
      const transformedRooms = Array.isArray(roomTypes) 
        ? roomTypes.map((room: any) => ({
            id: room.roomTypeID || room.id || String(Math.random()),
            name: room.roomTypeName || room.name || "Room",
            description: stripHtmlTags(room.roomTypeDescription || room.description || ""),
            maxGuests: room.maxGuests || room.roomTypeMaxGuests || 2,
            bedType: room.roomTypeBedType || room.bedType || "",
            sqft: room.roomTypeSqFt || room.sqft,
            imageUrl: room.roomTypePhotos?.[0]?.image || room.roomTypePhotoURL || room.imageUrl,
            price: room.roomRate || room.rate || room.price,
            amenities: room.roomTypeAmenities || room.amenities || [],
          }))
        : [];

      res.json({ 
        success: true, 
        data: { roomTypes: transformedRooms } 
      });
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  });

  app.get("/api/cloudbeds/availability", async (req, res) => {
    try {
      const { startDate, endDate, adults, children } = req.query;
      
      const params: Record<string, string> = {
        detailedRates: "true",
      };
      if (startDate) params.startDate = startDate as string;
      if (endDate) params.endDate = endDate as string;
      if (adults) params.adults = adults as string;
      if (children) params.children = children as string;

      const data = await fetchCloudbeds("getAvailableRoomTypes", params);
      res.json(data);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ error: "Failed to fetch availability" });
    }
  });

  // Get actual price ranges by querying for nightly, weekly, and monthly periods
  app.get("/api/cloudbeds/price-ranges", async (req, res) => {
    try {
      const today = new Date();
      const formatDate = (d: Date) => d.toISOString().split('T')[0];
      
      // Calculate date ranges
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const monthEnd = new Date(today);
      monthEnd.setDate(monthEnd.getDate() + 30);

      // Fetch rates for each period in parallel
      const [nightlyData, weeklyData, monthlyData] = await Promise.all([
        fetchCloudbeds("getAvailableRoomTypes", {
          startDate: formatDate(today),
          endDate: formatDate(tomorrow),
          adults: "1",
          rooms: "1",
          detailedRates: "true",
        }),
        fetchCloudbeds("getAvailableRoomTypes", {
          startDate: formatDate(today),
          endDate: formatDate(weekEnd),
          adults: "1",
          rooms: "1",
          detailedRates: "true",
        }),
        fetchCloudbeds("getAvailableRoomTypes", {
          startDate: formatDate(today),
          endDate: formatDate(monthEnd),
          adults: "1",
          rooms: "1",
          detailedRates: "true",
        }),
      ]);

      // Extract max rates from each period
      const getMaxRate = (data: any) => {
        const propertyData = data?.data?.[0] || {};
        const rooms = propertyData.propertyRooms || [];
        const rates = rooms.map((r: any) => r.roomRate || 0).filter((r: number) => r > 0);
        return rates.length > 0 ? Math.max(...rates) : 0;
      };

      const maxNightly = getMaxRate(nightlyData) || 99;
      const maxWeekly = getMaxRate(weeklyData) || 693;
      const maxMonthly = getMaxRate(monthlyData) || 2970;

      res.json({
        success: true,
        data: {
          nightly: { min: 0, max: maxNightly },
          weekly: { min: 0, max: maxWeekly },
          monthly: { min: 0, max: maxMonthly },
        },
      });
    } catch (error) {
      console.error("Error fetching price ranges:", error);
      res.status(500).json({ error: "Failed to fetch price ranges" });
    }
  });

  app.get("/api/cloudbeds/groups", async (req, res) => {
    try {
      const data = await fetchCloudbeds("getGroups");
      res.json(data);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  });

  app.get("/api/cloudbeds/dashboard", async (req, res) => {
    try {
      const data = await fetchCloudbeds("getDashboard");
      res.json(data);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ error: "Failed to fetch dashboard" });
    }
  });

  app.get("/api/cloudbeds/housekeeping", async (req, res) => {
    try {
      const data = await fetchCloudbeds("getHousekeepingStatus");
      res.json(data);
    } catch (error) {
      console.error("Error fetching housekeeping status:", error);
      res.status(500).json({ error: "Failed to fetch housekeeping status" });
    }
  });

  // Get taxes and fees from Cloudbeds
  app.get("/api/cloudbeds/taxes", async (req, res) => {
    try {
      const data = await fetchCloudbeds("getTaxesAndFees");
      
      // Transform taxes for frontend use
      const taxes = (data?.data || [])
        .filter((tax: any) => !tax.isDeleted && tax.type === "tax")
        .map((tax: any) => ({
          id: tax.taxID,
          name: tax.name,
          code: tax.code,
          amount: parseFloat(tax.amount),
          amountType: tax.amountType, // "percentage" or "fixed"
          isExclusive: tax.inclusiveOrExclusive === "exclusive",
        }));
      
      // Calculate combined tax rate for exclusive percentage taxes
      const combinedTaxRate = taxes
        .filter((t: any) => t.amountType === "percentage" && t.isExclusive)
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      
      res.json({
        success: true,
        data: {
          taxes,
          combinedTaxRate, // Total tax percentage to add (e.g., 26.95%)
        },
      });
    } catch (error) {
      console.error("Error fetching taxes:", error);
      res.status(500).json({ error: "Failed to fetch taxes" });
    }
  });

  // Get payment methods from Cloudbeds
  app.get("/api/cloudbeds/payment-methods", async (req, res) => {
    try {
      const data = await fetchCloudbeds("getPaymentMethods");
      res.json(data);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });

  // =================== RESERVATION BOOKING ENDPOINT ===================
  // Create a new reservation - returns immediately, processes in background
  app.post("/api/reservations", async (req, res) => {
    try {
      const {
        roomTypeId,
        startDate,
        endDate,
        adults,
        children = 0,
        firstName,
        lastName,
        email,
        phone,
        specialRequests,
        isRewardsMember = false,
        exclusiveDiscount = "none",
        totalPrice,
      } = req.body;

      if (!roomTypeId || !startDate || !endDate || !firstName || !lastName || !email || !phone) {
        return res.status(400).json({ 
          success: false, 
          error: "Missing required fields: roomTypeId, startDate, endDate, firstName, lastName, email, phone" 
        });
      }

      const nights = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      const stayType = getStayType(nights);

      const roomData = await fetchCloudbeds("getAvailableRoomTypes", {
        startDate,
        endDate,
        adults: adults?.toString() || "2",
        children: children?.toString() || "0",
        rooms: "1",
        detailedRates: "true",
      });

      const propertyRooms = roomData?.data?.[0]?.propertyRooms || [];
      const roomOptions = propertyRooms.filter((r: any) => r.roomTypeID === roomTypeId);
      
      if (roomOptions.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: "Room type not available for selected dates" 
        });
      }

      const ratePlanResult = await selectBestRatePlan(roomOptions, stayType);
      const room = ratePlanResult.room;
      
      const baseTotal = parseFloat(room.roomRate) || (69 * nights);
      const baseNightlyRate = baseTotal / nights;

      const businessRulesData = await storage.getBusinessRules();
      const taxRule = businessRulesData.find(r => r.code === "DEFAULT_TAX_RATE" && r.isActive);
      const noTaxRule = businessRulesData.find(r => r.code === "NO_TAX_AFTER_30_DAYS" && r.isActive);

      const isNightly = nights <= 6;
      let subtotal = baseTotal;
      let discountDetails: string[] = [];

      if (ratePlanResult.businessRuleDiscountApplied) {
        const ratePlanName = room.ratePlanNamePublic || "";
        if (ratePlanName.includes("weekly")) {
          discountDetails.push("Weekly discount applied");
        } else if (ratePlanName.includes("monthly")) {
          discountDetails.push("Monthly discount applied");
        }
      } else if (ratePlanResult.usedCloudbedsRatePlan) {
        const ratePlanName = room.ratePlanNamePublic || room.ratePlanNamePrivate || "";
        discountDetails.push(`Rate plan: ${ratePlanName}`);
      }

      if (isNightly && exclusiveDiscount !== "none") {
        subtotal = subtotal * 0.9;
        const discountLabel = exclusiveDiscount === "local" ? "Local Resident" : 
                              exclusiveDiscount === "military" ? "Military/Veteran" : "Senior 65+";
        discountDetails.push(`${discountLabel} discount: 10%`);
      }

      // Apply rewards member discount (stacks with all other discounts)
      if (isRewardsMember) {
        subtotal = subtotal * 0.9;
        discountDetails.push("Rewards member discount: 10%");
      }

      // Calculate tax
      let taxRate = 0;
      let taxExempt = false;
      if (noTaxRule && nights >= 30) {
        taxExempt = true;
      } else if (taxRule) {
        taxRate = (taxRule.payload as any)?.percent || 12;
      }

      const taxAmount = taxExempt ? 0 : subtotal * (taxRate / 100);
      const grandTotal = subtotal + taxAmount;

      // Save reservation request to database for background processing
      const reservationRequest = await storage.createReservationRequest({
        firstName,
        lastName,
        email,
        phone,
        roomTypeId,
        roomTypeName: room.roomTypeName,
        roomRateId: room.roomRateID,
        startDate,
        endDate,
        adults: adults?.toString() || "2",
        children: children?.toString() || "0",
        baseNightlyRate: baseNightlyRate.toFixed(2),
        baseTotal: baseTotal.toFixed(2),
        discountDetails,
        subtotal: subtotal.toFixed(2),
        taxRate: (taxRate / 100).toFixed(4),
        taxAmount: taxAmount.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
        specialRequests: specialRequests || null,
      });

      console.log(`Reservation request ${reservationRequest.id} saved, triggering background processing`);

      // Trigger background processing (fire and forget)
      const { processReservationInBackground } = await import("./reservationProcessor");
      setImmediate(() => {
        processReservationInBackground(reservationRequest.id).catch(err => {
          console.error(`[Background] Fatal error processing ${reservationRequest.id}:`, err);
        });
      });

      // Return immediately with thank you message
      res.json({
        success: true,
        reservation: {
          id: reservationRequest.id,
          status: "processing",
          roomName: room.roomTypeName,
          startDate,
          endDate,
          nights,
          guests: {
            adults,
            children,
          },
          pricing: {
            baseNightlyRate,
            baseTotal,
            discounts: discountDetails,
            subtotal,
            taxRate: taxExempt ? 0 : taxRate,
            taxAmount,
            grandTotal,
          },
        },
        message: `Thank you for booking with Boardwalk Suites Lafayette! Your reservation is being processed. You will receive a confirmation email at ${email} within the next few minutes with payment instructions.`,
      });

    } catch (error: any) {
      console.error("Error creating reservation:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to create reservation" 
      });
    }
  });

  // Check reservation status endpoint
  app.get("/api/reservations/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const request = await storage.getReservationRequest(id);
      
      if (!request) {
        return res.status(404).json({ 
          success: false, 
          error: "Reservation not found" 
        });
      }

      res.json({
        success: true,
        status: request.status,
        reservationId: request.cloudbedsReservationId,
        confirmationCode: request.cloudbedsConfirmationCode,
        payByLinkUrl: request.payByLinkUrl,
        errorMessage: request.errorMessage,
        processedAt: request.processedAt,
      });
    } catch (error: any) {
      console.error("Error checking reservation status:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to check reservation status" 
      });
    }
  });

  app.post("/api/rewards/signup", async (req, res) => {
    try {
      const { firstName, lastName, email, phone } = req.body;
      
      console.log("Rewards signup:", { firstName, lastName, email, phone });
      
      res.json({ 
        success: true, 
        message: "Successfully signed up for rewards program",
        memberId: `BWR-${Date.now()}`
      });
    } catch (error) {
      console.error("Error signing up for rewards:", error);
      res.status(500).json({ error: "Failed to sign up for rewards" });
    }
  });

  app.post("/api/groups/inquiry", async (req, res) => {
    try {
      const inquiry = req.body;
      
      console.log("Group booking inquiry:", inquiry);
      
      res.json({ 
        success: true, 
        message: "Group inquiry submitted successfully",
        referenceNumber: `GRP-${Date.now()}`
      });
    } catch (error) {
      console.error("Error submitting group inquiry:", error);
      res.status(500).json({ error: "Failed to submit group inquiry" });
    }
  });

  app.post("/api/promotion/apply", async (req, res) => {
    try {
      const application = req.body;
      
      console.log("Promotion application:", application);
      
      res.json({ 
        success: true, 
        message: "Application submitted successfully",
        applicationId: `PROMO-${Date.now()}`
      });
    } catch (error) {
      console.error("Error submitting promotion application:", error);
      res.status(500).json({ error: "Failed to submit application" });
    }
  });

  // Phone verification routes
  app.get("/api/auth/config", async (req, res) => {
    res.json({ 
      twilioConfigured: isTwilioConfigured(),
      verificationEnabled: isTwilioConfigured()
    });
  });

  app.post("/api/auth/send-code", async (req, res) => {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ success: false, error: "Phone number is required" });
      }

      // Format phone number to E.164 format
      let formattedPhone = phone.replace(/\D/g, '');
      if (!formattedPhone.startsWith('1')) {
        formattedPhone = '1' + formattedPhone;
      }
      formattedPhone = '+' + formattedPhone;

      const result = await sendVerificationCode(formattedPhone);
      
      if (result.success) {
        res.json({ success: true, message: "Verification code sent" });
      } else {
        res.status(500).json({ success: false, error: result.error || "Failed to send code" });
      }
    } catch (error: any) {
      console.error("Error sending verification code:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to send verification code" });
    }
  });

  app.post("/api/auth/verify-code", async (req, res) => {
    try {
      const { phone, code } = req.body;
      
      if (!phone || !code) {
        return res.status(400).json({ success: false, error: "Phone and code are required" });
      }

      // Format phone number to E.164 format
      let formattedPhone = phone.replace(/\D/g, '');
      if (!formattedPhone.startsWith('1')) {
        formattedPhone = '1' + formattedPhone;
      }
      formattedPhone = '+' + formattedPhone;

      const result = await checkVerificationCode(formattedPhone, code);
      
      if (result.success && result.valid) {
        // Create or get guest account
        const guestId = `GUEST-${Date.now()}`;
        
        // Set session if using session middleware
        if (req.session) {
          (req.session as any).guestId = guestId;
          (req.session as any).phone = formattedPhone;
          (req.session as any).isAuthenticated = true;
        }

        res.json({ 
          success: true, 
          valid: true,
          guestId,
          message: "Phone verified successfully" 
        });
      } else if (result.success && !result.valid) {
        res.json({ success: true, valid: false, error: "Invalid verification code" });
      } else {
        res.status(500).json({ success: false, valid: false, error: result.error || "Verification failed" });
      }
    } catch (error: any) {
      console.error("Error verifying code:", error);
      res.status(500).json({ success: false, valid: false, error: error.message || "Failed to verify code" });
    }
  });

  // Guest session check
  app.get("/api/auth/session", async (req, res) => {
    if (req.session && (req.session as any).isAuthenticated) {
      res.json({
        authenticated: true,
        guestId: (req.session as any).guestId,
        phone: (req.session as any).phone
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    if (req.session) {
      req.session.destroy((err: any) => {
        if (err) {
          res.status(500).json({ success: false, error: "Failed to logout" });
        } else {
          res.json({ success: true });
        }
      });
    } else {
      res.json({ success: true });
    }
  });

  // ==========================================
  // Guest Portal API Endpoints
  // ==========================================

  // Helper to map Cloudbeds status to our status format
  function mapCloudbedsStatus(status: string): "confirmed" | "checked_in" | "checked_out" | "cancelled" {
    const statusLower = status.toLowerCase();
    if (statusLower === "checked_in" || statusLower === "in_house") return "checked_in";
    if (statusLower === "checked_out") return "checked_out";
    if (statusLower === "canceled" || statusLower === "cancelled" || statusLower === "no_show") return "cancelled";
    return "confirmed";
  }

  // Session-based reservation storage (prevents client tampering with pricing)
  // Token is generated on lookup and required for extensions
  interface GuestSession {
    reservation: {
      id: string;
      confirmationNumber: string;
      guestName: string;
      lastName: string;
      email: string;
      phone: string;
      roomType: string;
      roomNumber: string;
      checkIn: string;
      checkOut: string;
      nightlyRate: number;
      totalPaid: number;
      status: "confirmed" | "checked_in" | "checked_out" | "cancelled";
    };
    createdAt: number;
  }
  
  const guestSessions: Map<string, GuestSession> = new Map();
  
  // Clean up old sessions (older than 2 hours)
  function cleanupSessions() {
    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000;
    for (const [token, session] of guestSessions) {
      if (now - session.createdAt > twoHours) {
        guestSessions.delete(token);
      }
    }
  }
  
  // Generate session token
  function generateSessionToken(): string {
    return `gs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Helper to normalize phone for comparison
  function normalizePhoneForMatch(phone: string): string {
    return phone.replace(/\D/g, '').slice(-10); // Last 10 digits
  }

  // Verify OTP and lookup reservation by phone - main guest login endpoint
  app.post("/api/guest/verify-and-lookup", async (req, res) => {
    try {
      const { phone, code } = req.body;
      
      if (!phone || !code) {
        return res.status(400).json({ success: false, error: "Phone and code are required" });
      }

      // Format phone number
      let formattedPhone = phone.replace(/\D/g, '');
      if (!formattedPhone.startsWith('1') && formattedPhone.length === 10) {
        formattedPhone = '1' + formattedPhone;
      }
      formattedPhone = '+' + formattedPhone;

      // Verify OTP with Twilio
      const verifyResult = await checkVerificationCode(formattedPhone, code);
      
      if (!verifyResult.success || !verifyResult.valid) {
        return res.json({ success: false, valid: false, error: verifyResult.error || "Invalid code" });
      }

      // OTP verified - now lookup guest by phone using getGuestList
      // Format phone for Cloudbeds (they accept various formats)
      const phoneDigits = phone.replace(/\D/g, '');
      const formattedPhoneForCloudbeds = phoneDigits.length === 10 
        ? `${phoneDigits.slice(0,3)}-${phoneDigits.slice(3,6)}-${phoneDigits.slice(6)}`
        : phone;
      
      console.log(`Looking up guest by phone: ${formattedPhoneForCloudbeds}`);
      
      // First, find guest by phone
      const guestData = await fetchCloudbeds("getGuestList", {
        guestPhone: formattedPhoneForCloudbeds,
        includeGuestInfo: "true",
      });
      
      console.log(`getGuestList response:`, JSON.stringify(guestData?.data?.slice(0, 3)));
      
      const guests = guestData?.data || [];
      
      if (guests.length === 0) {
        console.log("No guest found with this phone number");
        return res.json({ success: true, valid: true, reservation: null });
      }
      
      // Get the first guest's ID to lookup their reservations
      const guestId = guests[0]?.guestID;
      console.log(`Found guest ID: ${guestId}, name: ${guests[0]?.guestFirstName} ${guests[0]?.guestLastName}`);
      
      // Now get reservations for this guest (wide date range to include past/future)
      const today = new Date();
      const startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
      const endDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year ahead
      const formatDate = (d: Date) => d.toISOString().split('T')[0];
      
      const resData = await fetchCloudbeds("getReservations", {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        guestID: guestId,
      });
      
      const reservations = resData?.data || [];
      console.log(`Found ${reservations.length} reservations for guest ${guestId}`);
      
      // Prioritize: checked_in > confirmed > any other (including checked_out)
      const matchingRes = reservations.find((r: any) => 
        r.status === "checked_in" || r.status === "in_house"
      ) || reservations.find((r: any) => 
        r.status === "confirmed"
      ) || reservations[0];

      if (matchingRes) {
        cleanupSessions();
        
        const checkIn = new Date(matchingRes.startDate || matchingRes.checkIn);
        const checkOut = new Date(matchingRes.endDate || matchingRes.checkOut);
        const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (24 * 60 * 60 * 1000)));
        
        const roomTotal = parseFloat(matchingRes.roomTotal || matchingRes.subtotal || matchingRes.grandTotal || "0");
        const nightlyRate = matchingRes.roomRate 
          ? parseFloat(matchingRes.roomRate) 
          : (nights > 0 ? Math.round((roomTotal / nights) * 100) / 100 : 69);
        
        const total = parseFloat(matchingRes.grandTotal || matchingRes.total || "0");

        const reservation = {
          id: matchingRes.reservationID?.toString() || matchingRes.identifier,
          confirmationNumber: matchingRes.confirmationCode || matchingRes.confirmationNumber || matchingRes.identifier || matchingRes.reservationID?.toString(),
          guestName: `${matchingRes.guestFirstName || ""} ${matchingRes.guestLastName || ""}`.trim() || matchingRes.guestName || "Guest",
          lastName: (matchingRes.guestLastName || matchingRes.guestName?.split(' ').pop() || "").toUpperCase(),
          email: matchingRes.guestEmail || matchingRes.email || "",
          phone: matchingRes.guestPhone || matchingRes.phone || phone,
          roomType: matchingRes.roomTypeName || matchingRes.roomType || "Suite",
          roomNumber: matchingRes.roomName || matchingRes.roomNumber || "",
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          nightlyRate: nightlyRate,
          totalPaid: total,
          status: mapCloudbedsStatus(matchingRes.status || "confirmed"),
        };
        
        const sessionToken = generateSessionToken();
        guestSessions.set(sessionToken, {
          reservation,
          createdAt: Date.now()
        });
        
        res.json({ success: true, valid: true, reservation, sessionToken });
      } else {
        res.json({ success: true, valid: true, reservation: null });
      }
    } catch (error) {
      console.error("Error in verify-and-lookup:", error);
      res.status(500).json({ success: false, error: "Failed to process request" });
    }
  });

  // Legacy confirmation lookup (kept for backwards compatibility)
  app.post("/api/guest/lookup", async (req, res) => {
    try {
      const { confirmationNumber, lastName } = req.body;
      
      if (!confirmationNumber || !lastName) {
        return res.status(400).json({ error: "Confirmation number and last name are required" });
      }

      const today = new Date();
      const startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      const endDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
      
      const formatDate = (d: Date) => d.toISOString().split('T')[0];
      
      const data = await fetchCloudbeds("getReservations", {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        includeGuestsDetails: "true",
      });

      const reservations = data?.data || [];
      
      const matchingRes = reservations.find((r: any) => {
        const confirmUpper = confirmationNumber.toUpperCase();
        
        const idMatch = 
          r.confirmationCode?.toUpperCase() === confirmUpper ||
          r.confirmationNumber?.toUpperCase() === confirmUpper ||
          r.identifier?.toUpperCase() === confirmUpper ||
          r.thirdPartyIdentifier?.toUpperCase() === confirmUpper ||
          r.reservationID?.toString() === confirmationNumber ||
          r.sourceReservationID?.toUpperCase() === confirmUpper;
        
        if (!idMatch) return false;
        
        const guestLastName = r.guestLastName || r.lastName || r.guestName?.split(' ').pop() || "";
        return guestLastName.toUpperCase() === lastName.toUpperCase();
      });

      if (matchingRes) {
        // Clean up old sessions periodically
        cleanupSessions();
        
        // Calculate nightly rate from subtotal (before tax) or room rate
        const checkIn = new Date(matchingRes.startDate || matchingRes.checkIn);
        const checkOut = new Date(matchingRes.endDate || matchingRes.checkOut);
        const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (24 * 60 * 60 * 1000)));
        
        // Use roomRate if available, otherwise estimate from subtotal (before tax/fees)
        const roomTotal = parseFloat(matchingRes.roomTotal || matchingRes.subtotal || matchingRes.grandTotal || "0");
        const nightlyRate = matchingRes.roomRate 
          ? parseFloat(matchingRes.roomRate) 
          : (nights > 0 ? Math.round((roomTotal / nights) * 100) / 100 : 69);
        
        const total = parseFloat(matchingRes.grandTotal || matchingRes.total || "0");

        const reservation = {
          id: matchingRes.reservationID?.toString() || matchingRes.identifier,
          confirmationNumber: matchingRes.confirmationCode || matchingRes.confirmationNumber || matchingRes.identifier || matchingRes.reservationID?.toString(),
          guestName: `${matchingRes.guestFirstName || ""} ${matchingRes.guestLastName || ""}`.trim() || matchingRes.guestName || "Guest",
          lastName: (matchingRes.guestLastName || matchingRes.lastName || "").toUpperCase(),
          email: matchingRes.guestEmail || matchingRes.email || "",
          phone: matchingRes.guestPhone || matchingRes.phone || "",
          roomType: matchingRes.roomTypeName || matchingRes.roomType || "Suite",
          roomNumber: matchingRes.roomName || matchingRes.roomNumber || "",
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          nightlyRate: nightlyRate,
          totalPaid: total,
          status: mapCloudbedsStatus(matchingRes.status || "confirmed"),
        };
        
        // Generate session token and store reservation server-side
        const sessionToken = generateSessionToken();
        guestSessions.set(sessionToken, {
          reservation,
          createdAt: Date.now()
        });
        
        res.json({ reservation, sessionToken });
      } else {
        res.json({ reservation: null });
      }
    } catch (error) {
      console.error("Error looking up reservation:", error);
      res.status(500).json({ error: "Failed to look up reservation" });
    }
  });

  // Get extension quote - uses session token for server-side reservation data
  app.post("/api/guest/extension-quote", async (req, res) => {
    try {
      const { sessionToken, extensionType } = req.body;
      
      if (!sessionToken || !extensionType) {
        return res.status(400).json({ error: "Session token and extension type are required" });
      }

      const session = guestSessions.get(sessionToken);
      if (!session) {
        return res.status(401).json({ error: "Session expired. Please log in again." });
      }

      const reservation = session.reservation;
      const checkInDate = new Date(reservation.checkIn);
      const checkOutDate = new Date(reservation.checkOut);
      
      // Calculate current stay length
      const currentStayNights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (24 * 60 * 60 * 1000)));
      
      // Check for rate override first
      const rateOverride = await storage.getRateOverride(reservation.id);
      let baseRate = rateOverride?.isActive 
        ? parseFloat(rateOverride.baseNightlyRate) 
        : reservation.nightlyRate;
      
      // Fallback to default rate if still 0
      if (!baseRate || baseRate <= 0) {
        baseRate = 79; // Default rate for King Suite
        console.log(`Rate was 0, using default: $${baseRate}/night`);
      }
      
      console.log(`Extension quote: baseRate=$${baseRate}, override=${rateOverride ? 'yes' : 'no'}, currentStay=${currentStayNights} nights`);
      
      // Get business rules
      const rules = await storage.getBusinessRules();
      const weeklyRule = rules.find(r => r.code === 'WEEKLY_DISCOUNT' && r.isActive);
      const monthlyRule = rules.find(r => r.code === 'MONTHLY_DISCOUNT' && r.isActive);
      const noTaxRule = rules.find(r => r.code === 'NO_TAX_AFTER_30_DAYS' && r.isActive);
      const defaultTaxRule = rules.find(r => r.code === 'DEFAULT_TAX_RATE' && r.isActive);
      
      const weeklyDiscount = (weeklyRule?.payload as any)?.discountPercent || 10;
      const monthlyDiscount = (monthlyRule?.payload as any)?.discountPercent || 20;
      const taxThreshold = (noTaxRule?.payload as any)?.thresholdNights || 30;
      const defaultTaxRate = (defaultTaxRule?.payload as any)?.taxRate || 0.12;
      
      let rate = baseRate;
      let nights = 1;
      let newCheckOut: Date;
      let discountPercent = 0;
      let discountDescription = "";

      switch (extensionType) {
        case "night":
          nights = 1;
          newCheckOut = new Date(checkOutDate.getTime() + 1 * 24 * 60 * 60 * 1000);
          break;
        case "week":
          nights = 7;
          newCheckOut = new Date(checkOutDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          discountPercent = weeklyDiscount;
          discountDescription = `${weeklyDiscount}% weekly discount`;
          rate = Math.round(baseRate * (1 - weeklyDiscount / 100) * 100) / 100;
          break;
        case "month":
          nights = 30;
          newCheckOut = new Date(checkOutDate.getTime() + 30 * 24 * 60 * 60 * 1000);
          discountPercent = monthlyDiscount;
          discountDescription = `${monthlyDiscount}% monthly discount`;
          rate = Math.round(baseRate * (1 - monthlyDiscount / 100) * 100) / 100;
          break;
        default:
          return res.status(400).json({ error: "Invalid extension type" });
      }

      const subtotal = Math.round(nights * rate * 100) / 100;
      
      // Calculate tax based on total stay length
      const totalStayAfterExtension = currentStayNights + nights;
      let taxRate = defaultTaxRate;
      let taxDescription = `${Math.round(taxRate * 100)}% lodging tax`;
      
      // If guest has already stayed 30+ days, no tax on extension
      if (currentStayNights >= taxThreshold) {
        taxRate = 0;
        taxDescription = "Tax exempt (30+ day stay)";
      }
      // If extension crosses the 30-day threshold, prorate tax
      else if (totalStayAfterExtension > taxThreshold) {
        const taxableNights = Math.max(0, taxThreshold - currentStayNights);
        const taxableAmount = Math.round((taxableNights / nights) * subtotal * 100) / 100;
        const tax = Math.round(taxableAmount * defaultTaxRate * 100) / 100;
        taxDescription = `Prorated tax (${taxableNights} of ${nights} nights taxable)`;
        
        const total = Math.round((subtotal + tax) * 100) / 100;
        
        return res.json({
          quote: {
            extensionType,
            nights,
            newCheckOut: newCheckOut.toISOString(),
            baseRate,
            rate,
            discountPercent,
            discountDescription,
            subtotal,
            taxRate,
            taxDescription,
            tax,
            total,
            rateOverride: rateOverride ? true : false
          }
        });
      }
      
      const tax = Math.round(subtotal * taxRate * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;

      res.json({
        quote: {
          extensionType,
          nights,
          newCheckOut: newCheckOut.toISOString(),
          baseRate,
          rate,
          discountPercent,
          discountDescription,
          subtotal,
          taxRate,
          taxDescription,
          tax,
          total,
          rateOverride: rateOverride ? true : false
        }
      });
    } catch (error) {
      console.error("Error getting extension quote:", error);
      res.status(500).json({ error: "Failed to get extension quote" });
    }
  });

  // Extend stay - uses session token for server-side reservation data
  // Uses same pricing logic as extension-quote
  app.post("/api/guest/extend-stay", async (req, res) => {
    try {
      const { sessionToken, extensionType } = req.body;
      
      if (!sessionToken || !extensionType) {
        return res.status(400).json({ error: "Session token and extension type are required" });
      }

      const session = guestSessions.get(sessionToken);
      if (!session) {
        return res.status(401).json({ error: "Session expired. Please log in again." });
      }

      const reservation = session.reservation;
      const checkInDate = new Date(reservation.checkIn);
      const checkOutDate = new Date(reservation.checkOut);
      
      // Calculate current stay length
      const currentStayNights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (24 * 60 * 60 * 1000)));
      
      // Check for rate override first
      const rateOverride = await storage.getRateOverride(reservation.id);
      let baseRate = rateOverride?.isActive 
        ? parseFloat(rateOverride.baseNightlyRate) 
        : reservation.nightlyRate;
      
      // Fallback to default rate if still 0
      if (!baseRate || baseRate <= 0) {
        baseRate = 79; // Default rate for King Suite
      }
      
      // Get business rules
      const rules = await storage.getBusinessRules();
      const weeklyRule = rules.find(r => r.code === 'WEEKLY_DISCOUNT' && r.isActive);
      const monthlyRule = rules.find(r => r.code === 'MONTHLY_DISCOUNT' && r.isActive);
      const noTaxRule = rules.find(r => r.code === 'NO_TAX_AFTER_30_DAYS' && r.isActive);
      const defaultTaxRule = rules.find(r => r.code === 'DEFAULT_TAX_RATE' && r.isActive);
      
      const weeklyDiscount = (weeklyRule?.payload as any)?.discountPercent || 10;
      const monthlyDiscount = (monthlyRule?.payload as any)?.discountPercent || 20;
      const taxThreshold = (noTaxRule?.payload as any)?.thresholdNights || 30;
      const defaultTaxRate = (defaultTaxRule?.payload as any)?.taxRate || 0.12;
      
      let rate = baseRate;
      let nights = 1;
      let newCheckOut: Date;

      switch (extensionType) {
        case "night":
          nights = 1;
          newCheckOut = new Date(checkOutDate.getTime() + 1 * 24 * 60 * 60 * 1000);
          break;
        case "week":
          nights = 7;
          newCheckOut = new Date(checkOutDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          rate = Math.round(baseRate * (1 - weeklyDiscount / 100) * 100) / 100;
          break;
        case "month":
          nights = 30;
          newCheckOut = new Date(checkOutDate.getTime() + 30 * 24 * 60 * 60 * 1000);
          rate = Math.round(baseRate * (1 - monthlyDiscount / 100) * 100) / 100;
          break;
        default:
          return res.status(400).json({ error: "Invalid extension type" });
      }

      const subtotal = Math.round(nights * rate * 100) / 100;
      
      // Calculate tax based on total stay length
      const totalStayAfterExtension = currentStayNights + nights;
      let taxRate = defaultTaxRate;
      let tax = 0;
      
      if (currentStayNights >= taxThreshold) {
        taxRate = 0;
      } else if (totalStayAfterExtension > taxThreshold) {
        const taxableNights = Math.max(0, taxThreshold - currentStayNights);
        const taxableAmount = Math.round((taxableNights / nights) * subtotal * 100) / 100;
        tax = Math.round(taxableAmount * defaultTaxRate * 100) / 100;
      } else {
        tax = Math.round(subtotal * taxRate * 100) / 100;
      }
      
      const total = Math.round((subtotal + tax) * 100) / 100;

      // Update the reservation in session
      const updatedReservation = {
        ...reservation,
        checkOut: newCheckOut.toISOString(),
        totalPaid: Math.round((reservation.totalPaid + total) * 100) / 100
      };
      
      session.reservation = updatedReservation;

      console.log(`[EXTENSION REQUEST] Reservation ${reservation.confirmationNumber}: +${nights} nights, new checkout: ${newCheckOut.toISOString()}, charge: $${total}`);

      res.json({ 
        success: true,
        reservation: updatedReservation,
        extensionDetails: {
          nights,
          rate,
          subtotal,
          tax,
          total
        },
        message: "Extension request submitted. The front desk will process your request and confirm the extension."
      });
    } catch (error) {
      console.error("Error extending stay:", error);
      res.status(500).json({ error: "Failed to extend stay" });
    }
  });

  // =================== ADMIN ENDPOINTS ===================
  // Note: These endpoints require admin API key for security
  // In production, implement proper role-based authentication
  
  const requireAdminAuth = (req: any, res: any, next: any) => {
    // Only accept admin key via header for security (never from query params)
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_API_KEY;
    
    if (!expectedKey) {
      console.warn("ADMIN_API_KEY not configured - admin endpoints are disabled");
      return res.status(503).json({ error: "Admin access not configured. Set ADMIN_API_KEY environment variable." });
    }
    
    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({ error: "Unauthorized. Admin access required." });
    }
    next();
  };
  
  // Admin Dashboard - get arrivals, departures, in-house guests
  app.get("/api/admin/dashboard", requireAdminAuth, async (req, res) => {
    try {
      const data = await fetchCloudbeds("getDashboard", {});
      
      if (!data?.success) {
        return res.status(500).json({ error: "Failed to fetch dashboard data" });
      }
      
      res.json({ 
        success: true, 
        data: data.data 
      });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });
  
  // Get all rate overrides
  app.get("/api/admin/rate-overrides", requireAdminAuth, async (req, res) => {
    try {
      const overrides = await storage.getRateOverrides();
      res.json({ success: true, data: overrides });
    } catch (error) {
      console.error("Error fetching rate overrides:", error);
      res.status(500).json({ error: "Failed to fetch rate overrides" });
    }
  });
  
  // Create rate override
  app.post("/api/admin/rate-overrides", requireAdminAuth, async (req, res) => {
    try {
      const { reservationId, guestId, guestName, baseNightlyRate, notes } = req.body;
      
      if (!reservationId || !baseNightlyRate) {
        return res.status(400).json({ error: "Reservation ID and base nightly rate are required" });
      }
      
      const existing = await storage.getRateOverride(reservationId);
      if (existing) {
        const updated = await storage.updateRateOverride(reservationId, {
          baseNightlyRate: baseNightlyRate.toString(),
          guestId,
          guestName,
          notes,
          isActive: true
        });
        return res.json({ success: true, data: updated, updated: true });
      }
      
      const override = await storage.createRateOverride({
        reservationId,
        guestId,
        guestName,
        baseNightlyRate: baseNightlyRate.toString(),
        notes,
        isActive: true
      });
      
      res.json({ success: true, data: override });
    } catch (error) {
      console.error("Error creating rate override:", error);
      res.status(500).json({ error: "Failed to create rate override" });
    }
  });
  
  // Update rate override
  app.put("/api/admin/rate-overrides/:reservationId", requireAdminAuth, async (req, res) => {
    try {
      const { reservationId } = req.params;
      const { baseNightlyRate, notes, isActive } = req.body;
      
      const updated = await storage.updateRateOverride(reservationId, {
        baseNightlyRate: baseNightlyRate?.toString(),
        notes,
        isActive
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Rate override not found" });
      }
      
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error("Error updating rate override:", error);
      res.status(500).json({ error: "Failed to update rate override" });
    }
  });
  
  // Delete rate override
  app.delete("/api/admin/rate-overrides/:reservationId", requireAdminAuth, async (req, res) => {
    try {
      const { reservationId } = req.params;
      const deleted = await storage.deleteRateOverride(reservationId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Rate override not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting rate override:", error);
      res.status(500).json({ error: "Failed to delete rate override" });
    }
  });
  
  // Get all business rules
  app.get("/api/admin/business-rules", requireAdminAuth, async (req, res) => {
    try {
      const rules = await storage.getBusinessRules();
      res.json({ success: true, data: rules });
    } catch (error) {
      console.error("Error fetching business rules:", error);
      res.status(500).json({ error: "Failed to fetch business rules" });
    }
  });
  
  // Update business rule
  app.put("/api/admin/business-rules/:code", requireAdminAuth, async (req, res) => {
    try {
      const { code } = req.params;
      const { label, payload, isActive } = req.body;
      
      const updated = await storage.updateBusinessRule(code, {
        label,
        payload,
        isActive
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Business rule not found" });
      }
      
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error("Error updating business rule:", error);
      res.status(500).json({ error: "Failed to update business rule" });
    }
  });

  // =================== INVESTOR PORTAL AUTH ===================
  // Phone+OTP login for investor portal with whitelist validation
  
  // Investor session storage (similar to guest sessions)
  interface InvestorSession {
    investor: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
    createdAt: number;
  }
  
  const investorSessions: Map<string, InvestorSession> = new Map();
  
  function generateInvestorSessionToken(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Clean up old investor sessions (older than 24 hours) and expired magic tokens
  async function cleanupInvestorSessions() {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    for (const [token, session] of Array.from(investorSessions.entries())) {
      if (now - session.createdAt > twentyFourHours) {
        investorSessions.delete(token);
      }
    }
    
    // Also clean up expired magic tokens
    try {
      const deletedCount = await storage.deleteExpiredMagicTokens();
      if (deletedCount > 0) {
        console.log(`[Cleanup] Deleted ${deletedCount} expired magic tokens`);
      }
    } catch (error) {
      console.error("[Cleanup] Failed to delete expired magic tokens:", error);
    }
  }
  
  // Run cleanup every 30 minutes
  setInterval(cleanupInvestorSessions, 30 * 60 * 1000);
  
  // Helper to check investor session or admin key
  function getInvestorAuth(req: any): { isValid: boolean; investor?: InvestorSession["investor"] } {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey === process.env.ADMIN_API_KEY) {
      return { isValid: true };
    }
    
    const sessionToken = req.headers["x-investor-session"];
    if (sessionToken && investorSessions.has(sessionToken as string)) {
      const session = investorSessions.get(sessionToken as string)!;
      return { isValid: true, investor: session.investor };
    }
    
    return { isValid: false };
  }
  
  // Middleware that accepts both admin key and investor session
  const requireInvestorAuth: RequestHandler = (req, res, next) => {
    const auth = getInvestorAuth(req);
    if (!auth.isValid) {
      return res.status(401).json({ error: "Unauthorized - Please log in" });
    }
    next();
  };
  
  // Check if phone is in investor whitelist (for login step 1)
  app.post("/api/investor/check-access", async (req, res) => {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ success: false, error: "Phone number is required" });
      }
      
      // Format phone for lookup - try multiple formats
      const digitsOnly = phone.replace(/\D/g, '');
      let formattedPhone = digitsOnly;
      if (!formattedPhone.startsWith('1') && formattedPhone.length === 10) {
        formattedPhone = '1' + formattedPhone;
      }
      const withPlus = '+' + formattedPhone;
      
      // Check if phone is in investor whitelist (try multiple formats)
      let found = await storage.getInvestorUserByPhone(withPlus);
      if (!found) found = await storage.getInvestorUserByPhone(formattedPhone);
      if (!found) found = await storage.getInvestorUserByPhone(digitsOnly);
      if (!found) found = await storage.getInvestorUserByPhone(phone);
      
      if (!found) {
        return res.json({ success: false, error: "This phone number is not authorized for investor portal access" });
      }
      
      if (!found.isActive) {
        return res.json({ success: false, error: "Your investor access has been deactivated. Please contact administration." });
      }
      
      res.json({ success: true, investor: { name: found.name, email: found.email } });
    } catch (error) {
      console.error("Error checking investor access:", error);
      res.status(500).json({ success: false, error: "Failed to check access" });
    }
  });
  
  // Verify OTP and create investor session (for login step 2)
  app.post("/api/investor/verify-and-login", async (req, res) => {
    try {
      const { phone, code } = req.body;
      
      if (!phone || !code) {
        return res.status(400).json({ success: false, error: "Phone and code are required" });
      }
      
      // Format phone number
      const digitsOnly = phone.replace(/\D/g, '');
      let formattedPhone = digitsOnly;
      if (!formattedPhone.startsWith('1') && formattedPhone.length === 10) {
        formattedPhone = '1' + formattedPhone;
      }
      formattedPhone = '+' + formattedPhone;
      
      // Verify OTP with Twilio
      const verifyResult = await checkVerificationCode(formattedPhone, code);
      
      if (!verifyResult.success || !verifyResult.valid) {
        return res.json({ success: false, error: verifyResult.error || "Invalid verification code" });
      }
      
      // Re-check whitelist (in case user was deactivated between steps)
      let investor = await storage.getInvestorUserByPhone(formattedPhone);
      if (!investor) investor = await storage.getInvestorUserByPhone(digitsOnly);
      if (!investor) investor = await storage.getInvestorUserByPhone(phone);
      
      if (!investor || !investor.isActive) {
        return res.json({ success: false, error: "Access denied" });
      }
      
      // Create investor session
      const sessionToken = generateInvestorSessionToken();
      investorSessions.set(sessionToken, {
        investor: {
          id: investor.id,
          name: investor.name,
          email: investor.email,
          phone: investor.phone
        },
        createdAt: Date.now()
      });
      
      res.json({ 
        success: true, 
        sessionToken,
        investor: { name: investor.name, email: investor.email }
      });
    } catch (error) {
      console.error("Error verifying investor:", error);
      res.status(500).json({ success: false, error: "Failed to verify" });
    }
  });
  
  // Logout investor
  app.post("/api/investor/logout", async (req, res) => {
    const sessionToken = req.headers["x-investor-session"] as string;
    if (sessionToken) {
      investorSessions.delete(sessionToken);
    }
    res.json({ success: true });
  });
  
  // Verify magic link token and create investor session
  app.post("/api/investor/verify-magic-link", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.json({ success: false, error: "Token required" });
      }
      
      // Look up the magic token
      const magicToken = await storage.getMagicToken(token);
      
      if (!magicToken) {
        return res.json({ success: false, error: "Invalid or expired link" });
      }
      
      // Check if expired
      if (new Date() > new Date(magicToken.expiresAt)) {
        return res.json({ success: false, error: "Link has expired" });
      }
      
      // Check if already used
      if (magicToken.usedAt) {
        return res.json({ success: false, error: "Link has already been used" });
      }
      
      // Get the investor user
      const investor = await storage.getInvestorUser(magicToken.investorUserId);
      
      if (!investor || !investor.isActive) {
        return res.json({ success: false, error: "Access denied" });
      }
      
      // Mark the token as used
      await storage.markMagicTokenUsed(token);
      
      // Create investor session
      const sessionToken = generateInvestorSessionToken();
      investorSessions.set(sessionToken, {
        investor: {
          id: investor.id,
          name: investor.name,
          email: investor.email,
          phone: investor.phone
        },
        createdAt: Date.now()
      });
      
      console.log(`[Investor] Magic link verified for: ${investor.email}`);
      
      res.json({ 
        success: true, 
        sessionToken,
        investor: { name: investor.name, email: investor.email }
      });
    } catch (error) {
      console.error("Error verifying magic link:", error);
      res.status(500).json({ success: false, error: "Failed to verify link" });
    }
  });

  // =================== ADMIN RESERVATIONS MANAGEMENT ===================
  // List and detail endpoints for viewing Cloudbeds reservations

  // Get all reservations with filters
  app.get("/api/admin/reservations", requireAdminAuth, async (req, res) => {
    try {
      const { 
        startDate, 
        endDate, 
        status = "confirmed,checked_in,checked_out,canceled,no_show",
        search,
        pageSize = "100",
        pageNumber = "1"
      } = req.query;

      // Default to last 30 days if no dates provided
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate ? new Date(startDate as string) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const formatDate = (d: Date) => d.toISOString().split('T')[0];
      
      const params: Record<string, string> = {
        startDate: formatDate(start),
        endDate: formatDate(end),
        status: status as string,
        pageSize: pageSize as string,
        pageNumber: pageNumber as string,
        includeGuestsDetails: "true"
      };

      const data = await fetchCloudbeds("getReservations", params);
      let reservations = data?.data || [];

      // Apply search filter if provided
      if (search) {
        const searchLower = (search as string).toLowerCase();
        reservations = reservations.filter((r: any) => {
          const guestName = `${r.guestFirstName || ''} ${r.guestLastName || ''}`.toLowerCase();
          const confirmNum = (r.identifier || r.reservationID || '').toString().toLowerCase();
          const email = (r.guestEmail || '').toLowerCase();
          return guestName.includes(searchLower) || 
                 confirmNum.includes(searchLower) ||
                 email.includes(searchLower);
        });
      }

      // Get all rate overrides to merge with reservations
      const overrides = await storage.getRateOverrides();
      const overrideMap = new Map(overrides.map(o => [o.reservationId, o]));

      // Enhance reservations with override status
      const enhancedReservations = reservations.map((r: any) => ({
        reservationID: r.reservationID,
        identifier: r.identifier,
        status: r.status,
        guestName: `${r.guestFirstName || ''} ${r.guestLastName || ''}`.trim(),
        guestEmail: r.guestEmail,
        guestPhone: r.guestPhone,
        checkInDate: r.startDate,
        checkOutDate: r.endDate,
        roomTypeName: r.roomTypeName || r.rooms?.[0]?.roomTypeName || "N/A",
        roomName: r.roomName || r.rooms?.[0]?.roomName || "N/A",
        total: r.grandTotal || r.total || r.balance || "0",
        balance: r.balance || "0",
        adults: r.adults || 1,
        children: r.children || 0,
        hasRateOverride: overrideMap.has(r.reservationID?.toString()),
        createdAt: r.dateCreated
      }));

      res.json({ 
        success: true, 
        data: enhancedReservations,
        pagination: {
          page: parseInt(pageNumber as string),
          pageSize: parseInt(pageSize as string),
          total: data?.total || reservations.length
        }
      });
    } catch (error) {
      console.error("Error fetching reservations:", error);
      res.status(500).json({ error: "Failed to fetch reservations" });
    }
  });

  // Get single reservation detail
  app.get("/api/admin/reservations/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Fetch detailed reservation from Cloudbeds
      const data = await fetchCloudbeds("getReservation", {
        reservationID: id
      });
      
      if (!data?.success || !data?.data) {
        return res.status(404).json({ error: "Reservation not found" });
      }

      const r = data.data;
      
      // Get rate override if exists
      const override = await storage.getRateOverride(id);
      
      // Parse charges/items if available
      const items = r.items || [];
      const payments = r.payments || [];
      
      const detail = {
        reservationID: r.reservationID,
        identifier: r.identifier,
        status: r.status,
        source: r.source || "Direct",
        
        // Guest info
        guestID: r.guestID,
        guestName: `${r.guestFirstName || ''} ${r.guestLastName || ''}`.trim(),
        guestFirstName: r.guestFirstName,
        guestLastName: r.guestLastName,
        guestEmail: r.guestEmail,
        guestPhone: r.guestPhone,
        guestCountry: r.guestCountry,
        guestAddress: r.guestAddress,
        guestCity: r.guestCity,
        guestState: r.guestState,
        guestZip: r.guestZip,
        
        // Stay details
        checkInDate: r.startDate,
        checkOutDate: r.endDate,
        nights: r.nights || Math.ceil((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / (1000 * 60 * 60 * 24)),
        adults: r.adults || 1,
        children: r.children || 0,
        
        // Room assignment
        rooms: r.assigned || r.rooms || [],
        roomTypeName: r.assigned?.[0]?.roomTypeName || r.roomTypeName || "N/A",
        roomName: r.assigned?.[0]?.roomName || r.roomName || "N/A",
        
        // Financials
        grandTotal: r.grandTotal || r.total || "0",
        balance: r.balance || "0",
        paid: r.paid || "0",
        
        // Charges breakdown
        roomTotal: r.roomTotal || "0",
        taxTotal: r.taxTotal || "0",
        feeTotal: r.feeTotal || "0",
        
        // Items/charges
        items: items.map((item: any) => ({
          description: item.description || item.itemName,
          quantity: item.quantity || 1,
          amount: item.amount || item.total,
          type: item.itemType || "charge"
        })),
        
        // Payments
        payments: payments.map((p: any) => ({
          date: p.paymentDate,
          amount: p.amount,
          method: p.paymentMethod || p.type,
          notes: p.notes
        })),
        
        // Rate override
        rateOverride: override ? {
          id: override.id,
          baseNightlyRate: override.baseNightlyRate,
          notes: override.notes,
          isActive: override.isActive
        } : null,
        
        // Metadata
        createdAt: r.dateCreated,
        modifiedAt: r.dateModified,
        notes: r.notes || r.guestNotes || ""
      };
      
      res.json({ success: true, data: detail });
    } catch (error) {
      console.error("Error fetching reservation detail:", error);
      res.status(500).json({ error: "Failed to fetch reservation details" });
    }
  });

  // Create or update rate override for a reservation
  app.post("/api/admin/reservations/:id/rate-override", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { baseNightlyRate, notes } = req.body;
      
      if (!baseNightlyRate || isNaN(parseFloat(baseNightlyRate))) {
        return res.status(400).json({ error: "Valid baseNightlyRate is required" });
      }
      
      // Check if override already exists
      const existing = await storage.getRateOverride(id);
      
      if (existing) {
        // Update existing
        const updated = await storage.updateRateOverride(id, {
          baseNightlyRate: baseNightlyRate.toString(),
          notes: notes || existing.notes
        });
        res.json({ success: true, data: updated, action: "updated" });
      } else {
        // Get reservation info for guest details
        const resData = await fetchCloudbeds("getReservation", { reservationID: id });
        const r = resData?.data;
        
        // Create new override
        const created = await storage.createRateOverride({
          reservationId: id,
          guestId: r?.guestID?.toString() || null,
          guestName: r ? `${r.guestFirstName || ''} ${r.guestLastName || ''}`.trim() : null,
          baseNightlyRate: baseNightlyRate.toString(),
          notes: notes || null
        });
        res.json({ success: true, data: created, action: "created" });
      }
    } catch (error) {
      console.error("Error saving rate override:", error);
      res.status(500).json({ error: "Failed to save rate override" });
    }
  });

  // Delete rate override for a reservation
  app.delete("/api/admin/reservations/:id/rate-override", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const existing = await storage.getRateOverrideByReservation(id);
      if (!existing) {
        return res.status(404).json({ error: "No rate override found for this reservation" });
      }
      
      await storage.deleteRateOverride(id);
      res.json({ success: true, message: "Rate override deleted" });
    } catch (error) {
      console.error("Error deleting rate override:", error);
      res.status(500).json({ error: "Failed to delete rate override" });
    }
  });

  // =================== INVESTOR USERS MANAGEMENT ===================
  // CRUD for investor whitelist

  // Get all investor users
  app.get("/api/admin/investor-users", requireAdminAuth, async (req, res) => {
    try {
      const users = await storage.getInvestorUsers();
      res.json({ success: true, data: users });
    } catch (error) {
      console.error("Error fetching investor users:", error);
      res.status(500).json({ error: "Failed to fetch investor users" });
    }
  });

  // Get single investor user
  app.get("/api/admin/investor-users/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getInvestorUser(id);
      
      if (!user) {
        return res.status(404).json({ error: "Investor user not found" });
      }
      
      res.json({ success: true, data: user });
    } catch (error) {
      console.error("Error fetching investor user:", error);
      res.status(500).json({ error: "Failed to fetch investor user" });
    }
  });

  // Create investor user and send magic link email
  app.post("/api/admin/investor-users", requireAdminAuth, async (req, res) => {
    try {
      const { name, phone, email, mailingAddress, isActive, notes } = req.body;
      
      if (!name || !phone || !email) {
        return res.status(400).json({ error: "Name, phone, and email are required" });
      }
      
      // Check if phone already exists
      const existing = await storage.getInvestorUserByPhone(phone);
      if (existing) {
        return res.status(409).json({ error: "An investor with this phone number already exists" });
      }
      
      const created = await storage.createInvestorUser({
        name,
        phone,
        email,
        mailingAddress,
        isActive: isActive !== false,
        notes
      });
      
      // Generate magic link token and send email
      try {
        const crypto = await import("crypto");
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        await storage.createMagicToken(token, created.id, email, expiresAt);
        
        // Send magic link email
        const sgMail = await import("@sendgrid/mail");
        if (process.env.SENDGRID_API_KEY) {
          sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
          
          const baseUrl = process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : process.env.REPLIT_DOMAINS?.split(",")[0] 
              ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
              : "https://boardwalksuites.com";
          const magicLink = `${baseUrl}/investor?token=${token}`;
          
          await sgMail.default.send({
            to: email,
            from: "investor-relations@boardwalksuites.com",
            subject: "Welcome to Boardwalk Suites Investor Portal",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2563eb;">Welcome to the Investor Portal</h1>
                <p>Dear ${name},</p>
                <p>You have been granted access to the Boardwalk Suites Lafayette Investor Portal.</p>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p>Click the button below to access your investor dashboard:</p>
                  <a href="${magicLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Access Investor Portal</a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">This link expires in 7 days. After logging in, you can use phone verification for future access.</p>
                
                <p>If you have any questions, please contact us at:</p>
                <p>Phone: 337-305-7110<br>Email: Lafayette@boardwalksuites.com</p>
                
                <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                  Boardwalk Suites Lafayette<br>
                  1605 N University Ave, Lafayette, LA 70506
                </p>
              </div>
            `,
          });
          console.log(`[Investor] Magic link email sent to: ${email}`);
        } else {
          console.warn("[Investor] SENDGRID_API_KEY not configured, skipping magic link email");
        }
      } catch (emailError) {
        console.error("[Investor] Failed to send magic link email:", emailError);
        // Continue - user is created, just email failed
      }
      
      res.json({ success: true, data: created });
    } catch (error) {
      console.error("Error creating investor user:", error);
      res.status(500).json({ error: "Failed to create investor user" });
    }
  });

  // Update investor user
  app.put("/api/admin/investor-users/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, email, mailingAddress, isActive, notes } = req.body;
      
      const updated = await storage.updateInvestorUser(id, {
        name,
        phone,
        email,
        mailingAddress,
        isActive,
        notes
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Investor user not found" });
      }
      
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error("Error updating investor user:", error);
      res.status(500).json({ error: "Failed to update investor user" });
    }
  });

  // Delete investor user
  app.delete("/api/admin/investor-users/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteInvestorUser(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Investor user not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting investor user:", error);
      res.status(500).json({ error: "Failed to delete investor user" });
    }
  });

  // =================== EMPLOYEE USER MANAGEMENT ===================
  
  // Get all employee users
  app.get("/api/admin/employee-users", requireAdminAuth, async (req, res) => {
    try {
      const users = await storage.getEmployeeUsers();
      res.json({ success: true, data: users });
    } catch (error) {
      console.error("Error fetching employee users:", error);
      res.status(500).json({ error: "Failed to fetch employee users" });
    }
  });

  // Get single employee user
  app.get("/api/admin/employee-users/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getEmployeeUser(id);
      if (!user) {
        return res.status(404).json({ error: "Employee user not found" });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      console.error("Error fetching employee user:", error);
      res.status(500).json({ error: "Failed to fetch employee user" });
    }
  });

  // Create employee user
  app.post("/api/admin/employee-users", requireAdminAuth, async (req, res) => {
    try {
      const { name, phone, email, role, department, isActive, notes } = req.body;
      
      if (!name || !phone || !email) {
        return res.status(400).json({ error: "Name, phone, and email are required" });
      }
      
      const user = await storage.createEmployeeUser({
        name,
        phone,
        email,
        role: role || "staff",
        department,
        isActive: isActive !== false,
        notes
      });
      
      res.json({ success: true, data: user });
    } catch (error) {
      console.error("Error creating employee user:", error);
      res.status(500).json({ error: "Failed to create employee user" });
    }
  });

  // Update employee user
  app.put("/api/admin/employee-users/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, email, role, department, isActive, notes } = req.body;
      
      const updated = await storage.updateEmployeeUser(id, {
        name,
        phone,
        email,
        role,
        department,
        isActive,
        notes
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Employee user not found" });
      }
      
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error("Error updating employee user:", error);
      res.status(500).json({ error: "Failed to update employee user" });
    }
  });

  // Delete employee user
  app.delete("/api/admin/employee-users/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteEmployeeUser(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Employee user not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting employee user:", error);
      res.status(500).json({ error: "Failed to delete employee user" });
    }
  });

  // =================== INVESTOR INVESTMENTS MANAGEMENT ===================
  
  // Get investments for an investor
  app.get("/api/admin/investor-users/:id/investments", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const investments = await storage.getInvestorInvestments(id);
      res.json({ success: true, data: investments });
    } catch (error) {
      console.error("Error fetching investor investments:", error);
      res.status(500).json({ error: "Failed to fetch investments" });
    }
  });

  // Create investment for an investor
  app.post("/api/admin/investor-users/:id/investments", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { investmentDate, amount, notes } = req.body;
      
      if (!investmentDate || !amount) {
        return res.status(400).json({ error: "Investment date and amount are required" });
      }
      
      const investment = await storage.createInvestorInvestment({
        investorUserId: id,
        investmentDate: new Date(investmentDate),
        amount: amount.toString(),
        notes
      });
      
      res.json({ success: true, data: investment });
    } catch (error) {
      console.error("Error creating investment:", error);
      res.status(500).json({ error: "Failed to create investment" });
    }
  });

  // Update investment
  app.put("/api/admin/investments/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { investmentDate, amount, notes } = req.body;
      
      const updated = await storage.updateInvestorInvestment(id, {
        investmentDate: investmentDate ? new Date(investmentDate) : undefined,
        amount: amount?.toString(),
        notes
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Investment not found" });
      }
      
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error("Error updating investment:", error);
      res.status(500).json({ error: "Failed to update investment" });
    }
  });

  // Delete investment
  app.delete("/api/admin/investments/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteInvestorInvestment(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Investment not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting investment:", error);
      res.status(500).json({ error: "Failed to delete investment" });
    }
  });

  // =================== INVESTOR LOANS MANAGEMENT ===================
  
  // Get loans for an investor
  app.get("/api/admin/investor-users/:id/loans", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const loans = await storage.getInvestorLoans(id);
      res.json({ success: true, data: loans });
    } catch (error) {
      console.error("Error fetching investor loans:", error);
      res.status(500).json({ error: "Failed to fetch loans" });
    }
  });

  // Create loan for an investor
  app.post("/api/admin/investor-users/:id/loans", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { loanDate, loanAmount, interestRate, monthlyPayment, maturityDate, notes } = req.body;
      
      if (!loanDate || !loanAmount || !interestRate || !monthlyPayment || !maturityDate) {
        return res.status(400).json({ 
          error: "Loan date, amount, interest rate, monthly payment, and maturity date are required" 
        });
      }
      
      const loan = await storage.createInvestorLoan({
        investorUserId: id,
        loanDate: new Date(loanDate),
        loanAmount: loanAmount.toString(),
        interestRate: interestRate.toString(),
        monthlyPayment: monthlyPayment.toString(),
        maturityDate: new Date(maturityDate),
        notes
      });
      
      res.json({ success: true, data: loan });
    } catch (error) {
      console.error("Error creating loan:", error);
      res.status(500).json({ error: "Failed to create loan" });
    }
  });

  // Update loan
  app.put("/api/admin/loans/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { loanDate, loanAmount, interestRate, monthlyPayment, maturityDate, notes } = req.body;
      
      const updated = await storage.updateInvestorLoan(id, {
        loanDate: loanDate ? new Date(loanDate) : undefined,
        loanAmount: loanAmount?.toString(),
        interestRate: interestRate?.toString(),
        monthlyPayment: monthlyPayment?.toString(),
        maturityDate: maturityDate ? new Date(maturityDate) : undefined,
        notes
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Loan not found" });
      }
      
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error("Error updating loan:", error);
      res.status(500).json({ error: "Failed to update loan" });
    }
  });

  // Delete loan
  app.delete("/api/admin/loans/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteInvestorLoan(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Loan not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting loan:", error);
      res.status(500).json({ error: "Failed to delete loan" });
    }
  });

  // =================== INVESTOR PORTAL ENDPOINTS ===================
  // Financial analytics and performance metrics for investors/management
  
  // Helper to get total rooms from Cloudbeds (cached for performance)
  let cachedTotalRooms: number | null = null;
  let totalRoomsCacheTime: number = 0;
  const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache
  
  async function getTotalRooms(): Promise<number> {
    // Check cache
    if (cachedTotalRooms !== null && Date.now() - totalRoomsCacheTime < CACHE_DURATION) {
      return cachedTotalRooms;
    }
    
    try {
      const roomData = await fetchCloudbeds("getRoomTypes", {});
      const roomTypes = roomData?.data || [];
      cachedTotalRooms = roomTypes.reduce((sum: number, rt: any) => {
        return sum + (parseInt(rt.roomTypeUnits) || 0);
      }, 0);
      totalRoomsCacheTime = Date.now();
      console.log(`Fetched total rooms from Cloudbeds: ${cachedTotalRooms}`);
      return cachedTotalRooms || 40; // Fallback to 40 if API fails
    } catch (error) {
      console.error("Error fetching total rooms:", error);
      return cachedTotalRooms || 40; // Use cached value or fallback
    }
  }
  
  // Investor Dashboard - key metrics and today's activity
  app.get("/api/investor/dashboard", requireInvestorAuth, async (req, res) => {
    try {
      const [dashboardData, housekeepingData, totalRooms] = await Promise.all([
        fetchCloudbeds("getDashboard", {}),
        fetchCloudbeds("getHousekeepingStatus", {}),
        getTotalRooms()
      ]);
      
      // Log the raw dashboard response for debugging
      console.log("Cloudbeds getDashboard response:", JSON.stringify(dashboardData?.data, null, 2));
      
      // Parse dashboard data - Cloudbeds may return different structures
      const data = dashboardData?.data || {};
      
      // Cloudbeds getDashboard returns: { arrivals, departures, inHouse, available }
      // Each can be a number directly, or an object with count property
      const parseCount = (val: any): number => {
        if (typeof val === 'number') return val;
        if (typeof val === 'object' && val !== null) {
          return val.count || val.total || val.rooms || 0;
        }
        return parseInt(val) || 0;
      };
      
      let arrivals = parseCount(data.arrivals);
      let departures = parseCount(data.departures);
      let inHouse = parseCount(data.inHouse);
      let available = parseCount(data.available);
      
      // If getDashboard doesn't have proper data, calculate from housekeeping
      const rooms = housekeepingData?.data || [];
      if (inHouse === 0 && rooms.length > 0) {
        // Count occupied rooms from housekeeping data
        inHouse = rooms.filter((r: any) => r.roomOccupied === true).length;
        
        // Count today's arrivals (check-in status) and departures (check-out/turnover)
        const today = new Date().toISOString().split('T')[0];
        arrivals = rooms.filter((r: any) => 
          r.arrivalDate === today || r.frontdeskStatus === 'check-in'
        ).length;
        departures = rooms.filter((r: any) => 
          r.departureDate === today || r.frontdeskStatus === 'check-out' || r.frontdeskStatus === 'turnover'
        ).length;
        available = totalRooms - inHouse;
      }
      
      const occupancyRate = totalRooms > 0 ? (inHouse / totalRooms) * 100 : 0;
      
      // Calculate stayovers: guests staying through today (in-house minus arrivals)
      const stayovers = Math.max(0, inHouse - arrivals);
      
      res.json({
        success: true,
        data: {
          arrivals,
          departures,
          stayovers,
          inHouse,
          available,
          totalRooms,
          occupancyRate: Math.round(occupancyRate * 10) / 10
        }
      });
    } catch (error) {
      console.error("Error fetching investor dashboard:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });
  
  // Housekeeping Status - room cleaning and maintenance status
  app.get("/api/investor/housekeeping", requireInvestorAuth, async (req, res) => {
    try {
      const [housekeepingData, offlineRooms] = await Promise.all([
        fetchCloudbeds("getHousekeepingStatus", {}),
        storage.getOfflineRooms()
      ]);
      
      // Parse Cloudbeds housekeeping data
      const rooms = housekeepingData?.data || [];
      
      // Categorize rooms by status
      const categories = {
        vacantDirty: [] as any[],
        vacantClean: [] as any[],
        occupied: [] as any[],
        outOfService: [] as any[],
        offline: offlineRooms || []
      };
      
      for (const room of rooms) {
        // Cloudbeds returns roomCondition (dirty/clean) and roomOccupied (boolean)
        const condition = (room.roomCondition || "").toLowerCase();
        const isOccupied = room.roomOccupied === true || room.isOccupied === true;
        const isBlocked = room.roomBlocked === true;
        
        // Check for out of service (blocked rooms or explicit out of service)
        if (isBlocked && !isOccupied) {
          categories.outOfService.push(room);
        } else if (isOccupied) {
          // Occupied rooms (regardless of clean/dirty status - housekeeping will handle)
          categories.occupied.push(room);
        } else if (condition === "dirty") {
          categories.vacantDirty.push(room);
        } else {
          // Default to vacant clean for unoccupied, non-blocked rooms
          categories.vacantClean.push(room);
        }
      }
      
      res.json({
        success: true,
        data: {
          summary: {
            vacantDirty: categories.vacantDirty.length,
            vacantClean: categories.vacantClean.length,
            occupied: categories.occupied.length,
            outOfService: categories.outOfService.length,
            offline: categories.offline.length
          },
          rooms: categories
        }
      });
    } catch (error) {
      console.error("Error fetching housekeeping status:", error);
      res.status(500).json({ error: "Failed to fetch housekeeping status" });
    }
  });
  
  // Investor Revenue Report - monthly revenue data
  app.get("/api/investor/revenue", requireInvestorAuth, async (req, res) => {
    try {
      const yearParam = req.query.year as string;
      const year = yearParam && !isNaN(parseInt(yearParam)) ? parseInt(yearParam) : 2025;
      const totalRooms = await getTotalRooms();
      
      // Generate monthly data based on Cloudbeds reservations
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      
      const resData = await fetchCloudbeds("getReservations", {
        startDate,
        endDate,
        status: "checked_out,checked_in,confirmed",
        pageSize: "1000"
      });
      
      const reservationSummaries = resData?.data || [];
      console.log(`Revenue report: Found ${reservationSummaries.length} reservations for ${year}`);
      
      // Helper to parse currency strings from Cloudbeds (e.g., "$1,234.56" -> 1234.56)
      const parseCurrency = (val: any): number => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const cleaned = String(val).replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };
      
      // Fetch detailed data for each reservation to get accurate revenue
      // Batch requests in groups of 10 to avoid overloading the API
      const BATCH_SIZE = 10;
      const detailedReservations: any[] = [];
      
      for (let i = 0; i < reservationSummaries.length; i += BATCH_SIZE) {
        const batch = reservationSummaries.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (summary: any) => {
          try {
            const detail = await fetchCloudbeds("getReservation", {
              reservationID: summary.reservationID
            });
            return detail?.data || summary;
          } catch (err) {
            console.error(`Failed to fetch detail for reservation ${summary.reservationID}:`, err);
            return summary; // Fall back to summary data
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        detailedReservations.push(...batchResults);
      }
      
      // Calculate monthly aggregates
      const monthlyData: Record<string, { revenue: number; roomNights: number; bookings: number }> = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Initialize months
      months.forEach((m, i) => {
        monthlyData[m] = { revenue: 0, roomNights: 0, bookings: 0 };
      });
      
      // Aggregate reservation data by month
      for (const res of detailedReservations) {
        const checkIn = new Date(res.startDate || res.checkInDate);
        if (checkIn.getFullYear() !== year) continue;
        
        const monthIndex = checkIn.getMonth();
        const monthKey = months[monthIndex];
        
        // Calculate room nights
        const checkOut = new Date(res.endDate || res.checkOutDate);
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) || 1;
        
        // Get revenue from detailed data - grandTotal includes all charges
        const total = parseCurrency(res.grandTotal || res.total || res.balance || 0);
        
        monthlyData[monthKey].revenue += total;
        monthlyData[monthKey].roomNights += nights;
        monthlyData[monthKey].bookings += 1;
      }
      
      // Calculate metrics for each month
      const availableRoomNightsPerMonth = totalRooms * 30; // Approximation
      const monthly = months.map(month => {
        const data = monthlyData[month];
        const adr = data.roomNights > 0 ? data.revenue / data.roomNights : 0;
        const revpar = data.revenue / availableRoomNightsPerMonth;
        const occupancy = (data.roomNights / availableRoomNightsPerMonth) * 100;
        
        return {
          month,
          revenue: Math.round(data.revenue * 100) / 100,
          roomNights: data.roomNights,
          adr: Math.round(adr * 100) / 100,
          revpar: Math.round(revpar * 100) / 100,
          occupancy: Math.min(100, Math.round(occupancy * 10) / 10)
        };
      });
      
      // Calculate YTD metrics
      const totalRevenue = Object.values(monthlyData).reduce((sum, m) => sum + m.revenue, 0);
      const totalRoomNights = Object.values(monthlyData).reduce((sum, m) => sum + m.roomNights, 0);
      const totalBookings = Object.values(monthlyData).reduce((sum, m) => sum + m.bookings, 0);
      const ytdAdr = totalRoomNights > 0 ? totalRevenue / totalRoomNights : 0;
      const ytdAvailableNights = totalRooms * 365;
      const ytdRevpar = totalRevenue / ytdAvailableNights;
      const avgLos = totalBookings > 0 ? totalRoomNights / totalBookings : 0;
      
      res.json({
        success: true,
        data: {
          monthly,
          ytd: {
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalRoomNights,
            totalBookings,
            adr: Math.round(ytdAdr * 100) / 100,
            revpar: Math.round(ytdRevpar * 100) / 100,
            avgLos: Math.round(avgLos * 10) / 10,
            growthPercent: 0 // Would compare to previous year
          }
        }
      });
    } catch (error) {
      console.error("Error fetching revenue data:", error);
      res.status(500).json({ error: "Failed to fetch revenue data" });
    }
  });
  
  // Investor Analytics - room type performance and booking trends
  app.get("/api/investor/analytics", requireInvestorAuth, async (req, res) => {
    try {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];
      
      // Get list of reservations (summary data)
      const resData = await fetchCloudbeds("getReservations", {
        startDate,
        endDate,
        status: "checked_out,checked_in,confirmed",
        pageSize: "1000"
      });
      
      const reservationSummaries = resData?.data || [];
      console.log("Total reservations found:", reservationSummaries.length);
      
      // Helper to parse currency strings from Cloudbeds (e.g., "$1,234.56" -> 1234.56)
      const parseCurrency = (val: any): number => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const cleaned = String(val).replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };
      
      // Fetch detailed data for each reservation to get room type and revenue
      // Batch requests in groups of 10 to avoid overloading the API
      const BATCH_SIZE = 10;
      const detailedReservations: any[] = [];
      
      for (let i = 0; i < reservationSummaries.length; i += BATCH_SIZE) {
        const batch = reservationSummaries.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (summary: any) => {
          try {
            const detail = await fetchCloudbeds("getReservation", {
              reservationID: summary.reservationID
            });
            return detail?.data || summary;
          } catch (err) {
            console.error(`Failed to fetch detail for reservation ${summary.reservationID}:`, err);
            return summary; // Fall back to summary data
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        detailedReservations.push(...batchResults);
      }
      
      // Log sample detailed reservation for debugging
      if (detailedReservations.length > 0) {
        const sample = detailedReservations[0];
        console.log("Sample detailed reservation:", JSON.stringify({
          reservationID: sample.reservationID,
          status: sample.status,
          grandTotal: sample.grandTotal,
          total: sample.total,
          balance: sample.balance,
          assigned: sample.assigned?.slice(0, 1),
          unassigned: sample.unassigned?.slice(0, 1),
        }, null, 2));
      }
      
      // Revenue by room type
      const roomTypeData: Record<string, { revenue: number; bookings: number }> = {};
      let totalRevenue = 0;
      
      for (const res of detailedReservations) {
        // Get room type from assigned/unassigned rooms array
        let roomType = "Unknown";
        if (res.assigned && res.assigned.length > 0) {
          roomType = res.assigned[0].roomTypeName || res.assigned[0].roomType || "Unknown";
        } else if (res.unassigned && res.unassigned.length > 0) {
          roomType = res.unassigned[0].roomTypeName || res.unassigned[0].roomType || "Unknown";
        } else if (res.roomTypeName) {
          roomType = res.roomTypeName;
        } else if (res.roomType) {
          roomType = res.roomType;
        }
        
        // Get revenue from grandTotal, total, or balance
        const revenue = parseCurrency(res.grandTotal || res.total || res.balance || 0);
        
        if (!roomTypeData[roomType]) {
          roomTypeData[roomType] = { revenue: 0, bookings: 0 };
        }
        roomTypeData[roomType].revenue += revenue;
        roomTypeData[roomType].bookings += 1;
        totalRevenue += revenue;
      }
      
      const revenueByRoomType = Object.entries(roomTypeData).map(([roomType, data]) => ({
        roomType,
        revenue: Math.round(data.revenue * 100) / 100,
        bookings: data.bookings,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
      })).sort((a, b) => b.revenue - a.revenue);
      
      // Booking trends by day of week
      const dayOfWeekData: Record<string, number> = {
        'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0
      };
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (const res of detailedReservations) {
        const checkIn = new Date(res.startDate || res.checkInDate);
        const dayName = dayNames[checkIn.getDay()];
        dayOfWeekData[dayName] += 1;
      }
      
      const bookingTrends = dayNames.map(day => ({
        day,
        bookings: dayOfWeekData[day]
      }));
      
      res.json({
        success: true,
        data: {
          revenueByRoomType,
          bookingTrends,
          totalReservations: detailedReservations.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100
        }
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // =================== ROOM MANAGER ENDPOINTS ===================
  // Internal room management separate from Cloudbeds
  
  // Get all internal rooms
  app.get("/api/rooms", requireInvestorAuth, async (req, res) => {
    try {
      const rooms = await storage.getInternalRooms();
      res.json({ success: true, data: rooms });
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  });
  
  // Get single room with tasks
  app.get("/api/rooms/:id", requireInvestorAuth, async (req, res) => {
    try {
      const room = await storage.getInternalRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      const tasks = await storage.getRoomTasks(req.params.id);
      res.json({ success: true, data: { ...room, tasks } });
    } catch (error) {
      console.error("Error fetching room:", error);
      res.status(500).json({ error: "Failed to fetch room" });
    }
  });
  
  // Create room
  app.post("/api/rooms", requireInvestorAuth, async (req, res) => {
    try {
      const { unitNumber, unitDescription, condition, isOffline, offlineReason, notes, media } = req.body;
      
      if (!unitNumber) {
        return res.status(400).json({ error: "Unit number is required" });
      }
      
      // Check for duplicate unit number
      const existing = await storage.getInternalRoomByUnit(unitNumber);
      if (existing) {
        return res.status(400).json({ error: "Unit number already exists" });
      }
      
      const room = await storage.createInternalRoom({
        unitNumber,
        unitDescription,
        condition: condition || "good",
        isOffline: isOffline || false,
        offlineReason,
        notes,
        media: media || []
      });
      
      res.json({ success: true, data: room });
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ error: "Failed to create room" });
    }
  });
  
  // Update room
  app.put("/api/rooms/:id", requireInvestorAuth, async (req, res) => {
    try {
      const { unitNumber, unitDescription, condition, isOffline, offlineReason, notes, media } = req.body;
      
      const room = await storage.updateInternalRoom(req.params.id, {
        unitNumber,
        unitDescription,
        condition,
        isOffline,
        offlineReason,
        notes,
        media
      });
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      
      res.json({ success: true, data: room });
    } catch (error) {
      console.error("Error updating room:", error);
      res.status(500).json({ error: "Failed to update room" });
    }
  });
  
  // Delete room
  app.delete("/api/rooms/:id", requireInvestorAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteInternalRoom(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Room not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting room:", error);
      res.status(500).json({ error: "Failed to delete room" });
    }
  });
  
  // Get all tasks
  app.get("/api/tasks", requireInvestorAuth, async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json({ success: true, data: tasks });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });
  
  // Get tasks for a room
  app.get("/api/rooms/:roomId/tasks", requireInvestorAuth, async (req, res) => {
    try {
      const tasks = await storage.getRoomTasks(req.params.roomId);
      res.json({ success: true, data: tasks });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });
  
  // Create task
  app.post("/api/tasks", requireInvestorAuth, async (req, res) => {
    try {
      const { roomId, title, description, priority, status, assignedTo, dueDate } = req.body;
      
      if (!roomId || !title) {
        return res.status(400).json({ error: "Room ID and title are required" });
      }
      
      // Verify room exists
      const room = await storage.getInternalRoom(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      
      const task = await storage.createTask({
        roomId,
        title,
        description,
        priority: priority || "normal",
        status: status || "pending",
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : undefined
      });
      
      res.json({ success: true, data: task });
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });
  
  // Update task
  app.put("/api/tasks/:id", requireInvestorAuth, async (req, res) => {
    try {
      const { title, description, priority, status, assignedTo, dueDate } = req.body;
      
      const task = await storage.updateTask(req.params.id, {
        title,
        description,
        priority,
        status,
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : undefined
      });
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.json({ success: true, data: task });
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });
  
  // Delete task
  app.delete("/api/tasks/:id", requireInvestorAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteTask(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Process any pending reservations on server startup
  setImmediate(async () => {
    try {
      const { processPendingReservations } = await import("./reservationProcessor");
      await processPendingReservations();
    } catch (err) {
      console.error("[Startup] Error processing pending reservations:", err);
    }
  });

  return httpServer;
}
