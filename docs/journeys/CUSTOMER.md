# Customer Journey

End customer enrolling in loyalty programs and using digital wallet passes.

## Entry Points

- `/enroll/{slug}` — Public enrollment page
- `/pass/{id}` — Digital pass display
- `/portal` — Customer self-service portal

## Key Flows

### 1. Enrollment
1. Receive enrollment link (QR scan, WhatsApp, email, or social)
2. Open `/enroll/{card_slug}`
3. View program details and rewards
4. Fill registration form (name, email, phone)
5. API: `POST /api/v1/customers/enroll/?card_id={cardId}`
6. System creates Customer + CustomerPass
7. Display success with wallet save options:
   - **Apple Wallet** — Download .pkpass file
   - **Google Wallet** — Save to Google Wallet button
   - **QR Code** — Display pass QR for manual scanning

### 2. Wallet Pass Usage
1. Open Apple/Google Wallet app
2. Present pass QR code at point of sale
3. Staff scans QR code
4. Stamp/points added or reward redeemed
5. Push notification confirms transaction

### 3. Portal Access
1. Visit `/portal`
2. Enter email → receives magic link
3. Click link → authenticated via token
4. View:
   - Active passes and balances
   - Transaction history
   - Available rewards
   - Personal QR code

## Database State Changes

| Action | Tables Affected |
|--------|----------------|
| Enroll | `customers_customer`, `customers_customerpass` |
| Wallet save | Updates `customers_customerpass.wallet_status` |
| Portal login | None (token-based) |

## Error Scenarios

- Program not published → "Programa no disponible"
- Already enrolled → "Ya estás inscrito"
- Invalid card slug → 404
- Wallet push fails → Pass still valid, retry later
