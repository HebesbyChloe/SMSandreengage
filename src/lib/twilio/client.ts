import twilio from 'twilio';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
}

export function createTwilioClient(config: TwilioConfig) {
  if (!config.accountSid || !config.authToken) {
    throw new Error('Twilio Account SID and Auth Token are required');
  }
  
  return twilio(config.accountSid, config.authToken);
}

export function validatePhoneNumber(phoneNumber: string): boolean {
  // Basic validation - Twilio SDK also validates
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
}

export function formatPhoneNumber(phoneNumber: string): string {
  // Ensure phone number starts with +
  if (!phoneNumber.startsWith('+')) {
    // Assume US number if no country code
    if (phoneNumber.length === 10) {
      return `+1${phoneNumber}`;
    }
    return `+${phoneNumber}`;
  }
  return phoneNumber;
}

