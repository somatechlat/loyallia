# Staff Journey

Front-line staff member. Can scan QR codes and process basic transactions.

## Entry Points

- `/scanner/scan` — QR code scanner (mobile-optimized)

## Key Flows

### 1. QR Scanner Transaction
1. Open `/scanner/scan` on phone/tablet
2. Camera opens automatically
3. Scan customer QR code
4. System validates: `POST /api/v1/scanner/validate/`
5. Display customer info and active passes
6. Select action:
   - **Stamp** — adds stamp/points
   - **Redeem** — process reward redemption
   - **Cashback** — apply cashback credit
7. Confirm with amount/notes if needed
8. API: `POST /api/v1/scanner/transact/`
9. Show success/failure toast
10. Customer receives push notification (if enabled)

### 2. Manual Customer Lookup
1. Enter phone number or email in search
2. API: `GET /api/v1/scanner/customer/search/?query={query}`
3. Select customer from results
4. View passes and process transaction

## Database State Changes

| Action | Tables Affected |
|--------|----------------|
| Validate QR | Reads `loyallia_customer_passes` |
| Transact | `loyallia_transactions`, updates `loyallia_customer_passes` |

## Error Scenarios

- QR not found → "Código no válido"
- Pass suspended → "Programa suspendido"
- Insufficient stamps/points → "No tiene suficientes sellos"
- Network offline → Queue for retry (if supported)
