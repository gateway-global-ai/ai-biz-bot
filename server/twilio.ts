// Twilio Integration Service - uses Replit Twilio Connector
import twilio from 'twilio';

let connectionSettings: any;
let cachedClient: any = null;
let cachedPhoneNumber: string | null = null;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.account_sid || !connectionSettings.settings.api_key || !connectionSettings.settings.api_key_secret)) {
    throw new Error('Twilio not connected');
  }
  return {
    accountSid: connectionSettings.settings.account_sid,
    apiKey: connectionSettings.settings.api_key,
    apiKeySecret: connectionSettings.settings.api_key_secret,
    phoneNumber: connectionSettings.settings.phone_number
  };
}

export async function getTwilioClient() {
  if (cachedClient) return cachedClient;
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  cachedClient = twilio(apiKey, apiKeySecret, {
    accountSid: accountSid
  });
  return cachedClient;
}

export async function getTwilioFromPhoneNumber() {
  if (cachedPhoneNumber) return cachedPhoneNumber;
  const { phoneNumber } = await getCredentials();
  cachedPhoneNumber = phoneNumber;
  return phoneNumber;
}

export async function getAccountSid() {
  const { accountSid } = await getCredentials();
  return accountSid;
}

export interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality?: string;
  region?: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

export async function searchAvailableNumbers(areaCode: string, country: string = 'US'): Promise<AvailableNumber[]> {
  try {
    const client = await getTwilioClient();
    const numbers = await client.availablePhoneNumbers(country)
      .local
      .list({ areaCode: parseInt(areaCode), limit: 10 });

    return numbers.map((num: any) => ({
      phoneNumber: num.phoneNumber,
      friendlyName: num.friendlyName,
      locality: num.locality,
      region: num.region,
      capabilities: {
        voice: num.capabilities?.voice ?? true,
        sms: num.capabilities?.sms ?? true,
        mms: num.capabilities?.mms ?? false,
      }
    }));
  } catch (error: any) {
    console.error('Error searching numbers:', error);
    throw new Error(`Failed to search numbers: ${error.message}`);
  }
}

export async function provisionPhoneNumber(phoneNumber: string, voiceUrl?: string, smsUrl?: string): Promise<{ sid: string; phoneNumber: string }> {
  try {
    const client = await getTwilioClient();
    const incoming = await client.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber,
      voiceUrl: voiceUrl,
      smsUrl: smsUrl,
      friendlyName: 'AI Agent Trunk'
    });

    return {
      sid: incoming.sid,
      phoneNumber: incoming.phoneNumber
    };
  } catch (error: any) {
    console.error('Error provisioning number:', error);
    throw new Error(`Failed to provision number: ${error.message}`);
  }
}

export async function releasePhoneNumber(phoneSid: string): Promise<boolean> {
  try {
    const client = await getTwilioClient();
    await client.incomingPhoneNumbers(phoneSid).remove();
    return true;
  } catch (error: any) {
    console.error('Error releasing number:', error);
    throw new Error(`Failed to release number: ${error.message}`);
  }
}

export async function updatePhoneNumberWebhooks(phoneSid: string, config: {
  voiceUrl?: string;
  voiceFallbackUrl?: string;
  statusCallback?: string;
  smsUrl?: string;
  smsFallbackUrl?: string;
}): Promise<boolean> {
  try {
    const client = await getTwilioClient();
    await client.incomingPhoneNumbers(phoneSid).update({
      voiceUrl: config.voiceUrl,
      voiceFallbackUrl: config.voiceFallbackUrl,
      statusCallback: config.statusCallback,
      smsUrl: config.smsUrl,
      smsFallbackUrl: config.smsFallbackUrl,
    });
    return true;
  } catch (error: any) {
    console.error('Error updating webhooks:', error);
    throw new Error(`Failed to update webhooks: ${error.message}`);
  }
}

export async function getIncomingPhoneNumbers(): Promise<any[]> {
  try {
    const client = await getTwilioClient();
    const numbers = await client.incomingPhoneNumbers.list({ limit: 20 });
    return numbers.map((num: any) => ({
      sid: num.sid,
      phoneNumber: num.phoneNumber,
      friendlyName: num.friendlyName,
      voiceUrl: num.voiceUrl,
      smsUrl: num.smsUrl,
      capabilities: num.capabilities,
    }));
  } catch (error: any) {
    console.error('Error fetching incoming numbers:', error);
    throw new Error(`Failed to fetch numbers: ${error.message}`);
  }
}

export async function sendSms(to: string, body: string, from?: string): Promise<{ sid: string }> {
  try {
    const client = await getTwilioClient();
    const fromNumber = from || await getTwilioFromPhoneNumber();
    
    const message = await client.messages.create({
      body: body,
      from: fromNumber,
      to: to
    });

    return { sid: message.sid };
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
}

export async function makeCall(to: string, twimlUrl: string, from?: string): Promise<{ sid: string }> {
  try {
    const client = await getTwilioClient();
    const fromNumber = from || await getTwilioFromPhoneNumber();
    
    const call = await client.calls.create({
      url: twimlUrl,
      from: fromNumber,
      to: to
    });

    return { sid: call.sid };
  } catch (error: any) {
    console.error('Error making call:', error);
    throw new Error(`Failed to make call: ${error.message}`);
  }
}

export async function getCallLogs(limit: number = 50): Promise<any[]> {
  try {
    const client = await getTwilioClient();
    const calls = await client.calls.list({ limit });
    return calls.map((call: any) => ({
      sid: call.sid,
      from: call.from,
      to: call.to,
      status: call.status,
      direction: call.direction,
      duration: call.duration,
      startTime: call.startTime,
      endTime: call.endTime,
    }));
  } catch (error: any) {
    console.error('Error fetching call logs:', error);
    throw new Error(`Failed to fetch call logs: ${error.message}`);
  }
}

export async function getMessageLogs(limit: number = 50): Promise<any[]> {
  try {
    const client = await getTwilioClient();
    const messages = await client.messages.list({ limit });
    return messages.map((msg: any) => ({
      sid: msg.sid,
      from: msg.from,
      to: msg.to,
      body: msg.body,
      status: msg.status,
      direction: msg.direction,
      dateSent: msg.dateSent,
    }));
  } catch (error: any) {
    console.error('Error fetching message logs:', error);
    throw new Error(`Failed to fetch message logs: ${error.message}`);
  }
}

export async function updateCallerIdName(phoneSid: string, callerIdName: string): Promise<boolean> {
  try {
    const client = await getTwilioClient();
    await client.incomingPhoneNumbers(phoneSid).update({
      friendlyName: callerIdName
    });
    return true;
  } catch (error: any) {
    console.error('Error updating caller ID:', error);
    throw new Error(`Failed to update caller ID: ${error.message}`);
  }
}
