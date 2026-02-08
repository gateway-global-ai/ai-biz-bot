
// WARNING: Storing credentials in frontend code is NOT SECURE for production.
// This key will be visible to users. Move this logic to a backend server for a real deployment.

const ACCOUNT_SID = 'AC7af5c20d55fd15a7c0a483cb3718cc94';
const AUTH_TOKEN = 'SK740d3c4c89991f895e767b56c7ee6b5f'; // User provided token
const MESSAGING_SERVICE_SID = 'MGd16163508f2fcc1236a989f83664d9fb';

/**
 * Sends an SMS verification code using Twilio Programmable Messaging.
 * Returns true if the request was successfully sent to Twilio.
 */
export const sendSmsVerification = async (to: string, code: string): Promise<boolean> => {
  const body = `Your NurseNest verification code is: ${code}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append('To', to);
  formData.append('Body', body);
  formData.append('MessagingServiceSid', MESSAGING_SERVICE_SID);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn('Twilio API Request Failed:', text);
      console.info('DEV MODE: Verification Code is', code); // Fallback for testing
      return false;
    }
    
    return true;
  } catch (error) {
    // Expected error in browsers due to CORS
    console.warn('Twilio API blocked by CORS (expected in browser-only apps).');
    console.info('DEV MODE: Verification Code is', code); // Fallback for testing
    return false;
  }
};
