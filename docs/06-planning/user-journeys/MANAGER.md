# Manager Journey

Tenant manager. Can manage programs, customers, and locations. Cannot manage billing or team.

## Entry Points

- `/` — Dashboard home
- `/programs` — Program management (view/edit)
- `/customers` — Customer CRUD
- `/locations` — Location management
- `/campaigns` — Campaign creation and monitoring
- `/analytics` — Analytics view

## Key Flows

### 1. Customer Enrollment
1. Navigate to `/customers`
2. View existing customers (create new customer is OWNER-only)
3. Select customer and program to enroll
4. API: `POST /api/v1/customers/{id}/enroll/?card_id={cardId}` → creates CustomerPass
5. QR code and wallet links generated

### 2. Transaction Processing (via Scanner)
1. Open `/scanner/scan` on mobile device
2. Scan customer QR code
3. Select action (stamp, redeem, add points)
4. Confirm transaction
5. API: `POST /api/v1/scanner/transact/`
6. Customer pass updated in real-time

### 3. Location Management
1. Navigate to `/locations`
2. View existing locations (create new location is OWNER-only)
3. Set primary location flag

### 4. Campaign Monitoring
1. Navigate to `/campaigns`
2. View sent campaigns and delivery stats
3. Click campaign for detailed results
4. Export recipient list

## Database State Changes

| Action | Tables Affected |
|--------|----------------|
| Enroll customer | `loyallia_customer_passes` |
| Process transaction | `loyallia_transactions`, `loyallia_customer_passes` |

## Error Scenarios

- Customer already enrolled → 400 duplicate error
- Invalid QR code → 404 not found
- Plan limit (customers/locations) → 403
