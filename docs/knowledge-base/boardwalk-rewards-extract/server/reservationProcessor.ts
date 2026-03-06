import { storage } from "./storage";
import type { ReservationRequest } from "@shared/schema";

const CLOUDBEDS_API_KEY = process.env.CLOUDBEDS_API_KEY;
const CLOUDBEDS_BASE_URL = "https://api.cloudbeds.com/api/v1.3";
const PROPERTY_ID = "315701";

export async function processReservationInBackground(requestId: string): Promise<void> {
  console.log(`[Background] Processing reservation request ${requestId}`);
  
  const request = await storage.getReservationRequest(requestId);
  if (!request) {
    console.error(`[Background] Reservation request ${requestId} not found`);
    return;
  }

  if (request.status !== "pending") {
    console.log(`[Background] Reservation ${requestId} already processed (status: ${request.status})`);
    return;
  }

  await storage.updateReservationRequest(requestId, { status: "processing" });

  try {
    const reservationParams = new URLSearchParams();
    reservationParams.append("propertyID", PROPERTY_ID);
    reservationParams.append("startDate", request.startDate);
    reservationParams.append("endDate", request.endDate);
    reservationParams.append("rooms[0][roomTypeID]", request.roomTypeId);
    reservationParams.append("rooms[0][roomRateID]", request.roomRateId);
    reservationParams.append("rooms[0][quantity]", "1");
    reservationParams.append("adults[0][roomTypeID]", request.roomTypeId);
    reservationParams.append("adults[0][quantity]", request.adults || "2");
    reservationParams.append("children[0][roomTypeID]", request.roomTypeId);
    reservationParams.append("children[0][quantity]", request.children || "0");
    reservationParams.append("guestFirstName", request.firstName);
    reservationParams.append("guestLastName", request.lastName);
    reservationParams.append("guestEmail", request.email);
    if (request.phone) {
      reservationParams.append("guestPhone", request.phone);
    }
    reservationParams.append("guestCountry", "US");
    reservationParams.append("paymentMethod", "pay_by_link");

    const discountDetails = (request.discountDetails as string[]) || [];
    const grandTotal = parseFloat(request.grandTotal) || 0;
    const notesParts: string[] = [];
    if (discountDetails.length > 0) {
      notesParts.push(`Discounts applied: ${discountDetails.join(", ")}. Quoted total: $${grandTotal.toFixed(2)}`);
    }
    if (request.specialRequests) {
      notesParts.push(`Special requests: ${request.specialRequests}`);
    }
    if (notesParts.length > 0) {
      reservationParams.append("reservationNotes", notesParts.join(" | "));
    }
    reservationParams.append("status", "not_confirmed");
    reservationParams.append("sendEmailConfirmation", "false");

    console.log(`[Background] Calling Cloudbeds postReservation for ${requestId}...`);
    const startTime = Date.now();

    const cloudbedsResponse = await fetch(`${CLOUDBEDS_BASE_URL}/postReservation`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "x-api-key": CLOUDBEDS_API_KEY || "",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: reservationParams.toString(),
    });

    const cloudbedsResult = await cloudbedsResponse.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Background] Cloudbeds response after ${elapsed}s:`, cloudbedsResult);

    if (!cloudbedsResult.success) {
      console.error(`[Background] Cloudbeds error for ${requestId}:`, cloudbedsResult);
      await storage.updateReservationRequest(requestId, {
        status: "failed",
        errorMessage: cloudbedsResult.message || "Cloudbeds API error",
        processedAt: new Date(),
      });
      await sendFailureEmail(request, cloudbedsResult.message || "Unknown error");
      return;
    }

    const reservationId = cloudbedsResult.reservationID;
    const confirmationCode = cloudbedsResult.confirmationCode || cloudbedsResult.guestID || reservationId;

    let payByLinkUrl = "";
    try {
      const payByLinkResponse = await fetch("https://api.cloudbeds.com/payments/v2/pay-by-link", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "x-api-key": CLOUDBEDS_API_KEY || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyID: PROPERTY_ID,
          reservationID: reservationId,
          amount: grandTotal.toFixed(2),
          currency: "USD",
          description: `Reservation ${confirmationCode} - ${request.roomTypeName}`,
          expirationDays: 7,
        }),
      });
      
      const payByLinkResult = await payByLinkResponse.json();
      console.log(`[Background] Pay-by-link response:`, payByLinkResult);
      
      if (payByLinkResult.success && payByLinkResult.paymentLinkUrl) {
        payByLinkUrl = payByLinkResult.paymentLinkUrl;
      } else if (payByLinkResult.data?.url) {
        payByLinkUrl = payByLinkResult.data.url;
      }
    } catch (payLinkError) {
      console.error(`[Background] Pay-by-link API error:`, payLinkError);
    }

    if (!payByLinkUrl) {
      console.log(`[Background] Pay-by-link unavailable, triggering Cloudbeds email`);
      try {
        await fetch(`${CLOUDBEDS_BASE_URL}/putReservation`, {
          method: "POST",
          headers: {
            "accept": "application/json",
            "x-api-key": CLOUDBEDS_API_KEY || "",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            propertyID: PROPERTY_ID,
            reservationID: reservationId,
            sendEmailConfirmation: "true",
          }).toString(),
        });
      } catch (updateError) {
        console.error(`[Background] Failed to trigger Cloudbeds email:`, updateError);
      }
      payByLinkUrl = `https://hotels.cloudbeds.com/reservation/${PROPERTY_ID}?reservationID=${reservationId}`;
    }

    await storage.updateReservationRequest(requestId, {
      status: "confirmed",
      cloudbedsReservationId: reservationId,
      cloudbedsConfirmationCode: confirmationCode,
      payByLinkUrl,
      processedAt: new Date(),
    });

    await sendConfirmationEmail(request, confirmationCode, payByLinkUrl, discountDetails, grandTotal);
    console.log(`[Background] Reservation ${requestId} confirmed successfully`);

  } catch (error: any) {
    console.error(`[Background] Error processing reservation ${requestId}:`, error);
    
    // Re-fetch to get current retry count
    const currentRequest = await storage.getReservationRequest(requestId);
    const retryCount = parseInt(currentRequest?.retryCount || "0") + 1;
    
    if (retryCount < 3) {
      await storage.updateReservationRequest(requestId, {
        status: "pending",
        retryCount: retryCount.toString(),
        errorMessage: error.message,
      });
      console.log(`[Background] Will retry reservation ${requestId} (attempt ${retryCount + 1})`);
      setTimeout(() => processReservationInBackground(requestId), 30000);
    } else {
      await storage.updateReservationRequest(requestId, {
        status: "failed",
        errorMessage: error.message,
        processedAt: new Date(),
      });
      if (currentRequest) {
        await sendFailureEmail(currentRequest, error.message);
      }
    }
  }
}

async function sendConfirmationEmail(
  request: ReservationRequest,
  confirmationCode: string,
  payByLinkUrl: string,
  discountDetails: string[],
  grandTotal: number
): Promise<void> {
  try {
    const sgMail = await import("@sendgrid/mail");
    if (process.env.SENDGRID_API_KEY) {
      sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
      
      const adults = parseInt(request.adults || "2");
      const children = parseInt(request.children || "0");
      
      await sgMail.default.send({
        to: request.email,
        from: "reservations@boardwalksuites.com",
        subject: `Boardwalk Suites Lafayette - Reservation Confirmed #${confirmationCode}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Reservation Confirmed!</h1>
            <p>Dear ${request.firstName} ${request.lastName},</p>
            <p>Thank you for your reservation at Boardwalk Suites Lafayette!</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Reservation Details</h3>
              <p><strong>Confirmation #:</strong> ${confirmationCode}</p>
              <p><strong>Room:</strong> ${request.roomTypeName}</p>
              <p><strong>Check-in:</strong> ${request.startDate}</p>
              <p><strong>Check-out:</strong> ${request.endDate}</p>
              <p><strong>Guests:</strong> ${adults} adults${children > 0 ? `, ${children} children` : ""}</p>
            </div>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #92400e;">Complete Your Payment</h3>
              <p><strong>Total Due:</strong> $${grandTotal.toFixed(2)}</p>
              ${discountDetails.length > 0 ? `<p style="color: #059669;">Discounts applied: ${discountDetails.join(", ")}</p>` : ""}
              <p>Click the button below to complete your payment:</p>
              <a href="${payByLinkUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Pay Now</a>
            </div>
            
            <p>If you have any questions, please contact us at:</p>
            <p>Phone: 337-305-7110<br>Email: Lafayette@boardwalksuites.com</p>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              Boardwalk Suites Lafayette<br>
              1605 N University Ave, Lafayette, LA 70506
            </p>
          </div>
        `,
      });
      console.log(`[Background] Confirmation email sent to: ${request.email}`);
    }
  } catch (emailError) {
    console.error(`[Background] Failed to send confirmation email:`, emailError);
  }
}

async function sendFailureEmail(request: ReservationRequest, errorMessage: string): Promise<void> {
  try {
    const sgMail = await import("@sendgrid/mail");
    if (process.env.SENDGRID_API_KEY) {
      sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
      
      await sgMail.default.send({
        to: request.email,
        from: "reservations@boardwalksuites.com",
        subject: `Boardwalk Suites Lafayette - Booking Issue`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">We're Sorry</h1>
            <p>Dear ${request.firstName} ${request.lastName},</p>
            <p>We encountered an issue processing your reservation request for ${request.roomTypeName} (${request.startDate} - ${request.endDate}).</p>
            
            <p>Please call us at <strong>337-305-7110</strong> or email <strong>Lafayette@boardwalksuites.com</strong> to complete your booking.</p>
            
            <p>We apologize for the inconvenience and look forward to hosting you!</p>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              Boardwalk Suites Lafayette<br>
              1605 N University Ave, Lafayette, LA 70506
            </p>
          </div>
        `,
      });
      console.log(`[Background] Failure email sent to: ${request.email}`);
    }
  } catch (emailError) {
    console.error(`[Background] Failed to send failure email:`, emailError);
  }
}

export async function processPendingReservations(): Promise<void> {
  console.log("[Background] Checking for pending reservations...");
  const pending = await storage.getPendingReservationRequests();
  
  for (const request of pending) {
    processReservationInBackground(request.id);
  }
  
  if (pending.length > 0) {
    console.log(`[Background] Processing ${pending.length} pending reservation(s)`);
  }
}
