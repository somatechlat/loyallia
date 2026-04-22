/**
 * Suite 15 — Phone Verification & Google OAuth API Tests
 * Tests the phone verification flow and Google OAuth API endpoints.
 */
import { test, expect } from '@playwright/test';

const BASE_API = 'http://localhost:33905';

async function getToken(request: any) {
  const resp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
    data: { email: 'carlos@cafeelritmo.ec', password: '123456' },
  });
  const body = await resp.json();
  return body.access_token;
}

test.describe('Phone Verification API', () => {

  test('Phone verify request sends OTP (DEV returns code)', async ({ request }) => {
    const token = await getToken(request);
    const resp = await request.post(`${BASE_API}/api/v1/auth/phone/verify/request/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { phone_number: '+593991234567' },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.success).toBe(true);
    // In DEV mode the OTP is returned in the message
    expect(body.message).toContain('Código');
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
    expect(resp.status()).toBe(400);
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

    // In DEV mode, extract OTP from the message (format: "[DEV] Código: XXXXXX — ...")
    const otpMatch = reqBody.message.match(/Código:\s*([A-F0-9]{6})/);
    if (!otpMatch) {
      // If not DEV mode, skip this test
      test.skip();
      return;
    }
    const otp = otpMatch[1];

    // Step 2: Confirm OTP
    const confirmResp = await request.post(`${BASE_API}/api/v1/auth/phone/verify/confirm/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { phone_number: '+593998765432', otp },
    });
    expect(confirmResp.status()).toBe(200);
    const confirmBody = await confirmResp.json();
    expect(confirmBody.success).toBe(true);

    // Step 3: Verify /me/ shows phone as verified
    const meResp = await request.get(`${BASE_API}/api/v1/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meBody = await meResp.json();
    expect(meBody.phone_number).toBe('+593998765432');
    expect(meBody.is_phone_verified).toBe(true);
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
