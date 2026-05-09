/**
 * Suite 15 — Phone Verification & Twilio Verify Integration Tests
 * Tests the phone verification flow using REAL Twilio Verify API.
 */
import { test, expect } from '@playwright/test';

const BASE_API = 'http://localhost:80';

async function getToken(request: any) {
  const resp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
    data: { email: 'owner@example.com', password: '123456' },
  });
  const body = await resp.json();
  return body.access_token;
}

test.describe('Phone Verification API', () => {

  test('Phone verify request sends OTP via Twilio Verify', async ({ request }) => {
    const token = await getToken(request);
    const resp = await request.post(`${BASE_API}/api/v1/auth/phone/verify/request/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { phone_number: '+593991234567' },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.success).toBe(true);
    expect(body.sid).toBeTruthy();
    expect(body.channel).toBe('sms');
  });

  test('Phone verify rejects invalid format', async ({ request }) => {
    const token = await getToken(request);
    const resp = await request.post(`${BASE_API}/api/v1/auth/phone/verify/request/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { phone_number: '12345' },
    });
    // Should fail validation (422)
    expect(resp.status()).toBe(422);
  });

  test('Phone verify confirm rejects wrong OTP', async ({ request }) => {
    const token = await getToken(request);
    const resp = await request.post(`${BASE_API}/api/v1/auth/phone/verify/confirm/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { phone_number: '+593991234567', otp: 'WRONG1' },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.valid).toBe(false);
  });

  test('Phone verify full cycle — request then confirm OTP', async ({ request }) => {
    const token = await getToken(request);

    // Step 1: Request OTP
    const reqResp = await request.post(`${BASE_API}/api/v1/auth/phone/verify/request/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { phone_number: '+593998765432' },
    });
    expect(reqResp.status()).toBe(200);
    const reqBody = await reqResp.json();

    // With Twilio Verify, OTP is sent to the real phone.
    // We cannot extract it from the API response (no bypass).
    // This test requires a real phone to complete the full cycle.
    // Skip if no way to receive OTP.
    test.skip(true, 'Twilio Verify sends OTP to real phone — cannot automate without real device');
  });
});

test.describe('User Profile API — Phone Fields', () => {

  test('/me/ endpoint returns phone_number and is_phone_verified', async ({ request }) => {
    const token = await getToken(request);
    const resp = await request.get(`${BASE_API}/api/v1/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('phone_number');
    expect(body).toHaveProperty('is_phone_verified');
  });
});
