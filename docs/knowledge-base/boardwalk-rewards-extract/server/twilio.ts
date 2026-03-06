import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

let client: twilio.Twilio | null = null;

function getClient() {
  if (!accountSid || !authToken) {
    console.warn("Twilio credentials not configured");
    return null;
  }
  if (!client) {
    client = twilio(accountSid, authToken);
  }
  return client;
}

function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  if (phone.startsWith('+')) {
    return phone;
  }
  return `+${digits}`;
}

export async function sendVerificationCode(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  const twilioClient = getClient();
  
  if (!twilioClient || !verifyServiceSid) {
    console.error("Twilio not configured - skipping SMS verification");
    return { success: false, error: "SMS service not configured" };
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  console.log(`Sending verification to normalized phone: ${normalizedPhone}`);

  try {
    const verification = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: normalizedPhone,
        channel: 'sms',
      });

    console.log(`Verification sent to ${phoneNumber}: ${verification.status}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to send verification:", error.message);
    return { success: false, error: error.message };
  }
}

export async function checkVerificationCode(
  phoneNumber: string,
  code: string
): Promise<{ success: boolean; valid: boolean; error?: string }> {
  const twilioClient = getClient();
  
  if (!twilioClient || !verifyServiceSid) {
    console.error("Twilio not configured");
    return { success: false, valid: false, error: "SMS service not configured" };
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  console.log(`Checking verification for normalized phone: ${normalizedPhone}`);

  try {
    const verificationCheck = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: normalizedPhone,
        code: code,
      });

    console.log(`Verification check for ${phoneNumber}: ${verificationCheck.status}`);
    return { 
      success: true, 
      valid: verificationCheck.status === 'approved' 
    };
  } catch (error: any) {
    console.error("Failed to check verification:", error.message);
    return { success: false, valid: false, error: error.message };
  }
}

export async function sendSMS(
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const twilioClient = getClient();
  
  if (!twilioClient || !messagingServiceSid) {
    console.error("Twilio messaging not configured");
    return { success: false, error: "SMS messaging not configured" };
  }

  const normalizedPhone = normalizePhoneNumber(to);

  try {
    const message = await twilioClient.messages.create({
      body,
      to: normalizedPhone,
      messagingServiceSid,
    });

    console.log(`SMS sent to ${to}: ${message.sid}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to send SMS:", error.message);
    return { success: false, error: error.message };
  }
}

export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && verifyServiceSid);
}
