/**
 * Suite 15 — Phone Verification & Twilio Verify Integration Tests
 * Tests the phone verification flow using REAL Twilio Verify API.
 */
import { test, expect } from '@playwright/test';
import { getE2EBaseURL, loginRole } from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();

async function getToken(request: any) {
  return loginRole(request, 'owner');
}

test.describe('Phone Verification API @phone', () => {

  test.beforeAll(() => {
    ('Twilio Verify');
  });

  test('Phone verify request sends OTP via Twilio Verify', async ({ request }) => {
    const token = await getToken(request);
    const resp = await request.post(`${BASE_API}/api/v1/auth/phone/verify/request/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { phone_number: '+593991234567' },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.success, body.message || 'Twilio Verify request should succeed').toBe(true);
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

});

test.describe('User Profile API — Phone Fields @phone', () => {

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
