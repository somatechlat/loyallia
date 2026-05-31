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
2. Click "Nuevo cliente"
3. Fill contact info (name, email, phone)
4. Select program to enroll
5. API: `POST /api/v1/customers/` → creates Customer
6. API: `POST /api/v1/customers/{id}/enroll/?card_id={cardId}` → creates CustomerPass
7. QR code and wallet links generated

### 2. Transaction Processing (via Scanner)
1. Open `/scanner` on mobile device
2. Scan customer QR code
3. Select action (stamp, redeem, add points)
4. Confirm transaction
5. API: `POST /api/v1/scanner/transact/`
6. Customer pass updated in real-time

### 3. Location Management
1. Navigate to `/locations`
2. Add new location with address and map coordinates
3. Set primary location flag
4. API: `POST /api/v1/tenants/locations/`

### 4. Campaign Monitoring
1. Navigate to `/campaigns`
2. View sent campaigns and delivery stats
3. Click campaign for detailed results
4. Export recipient list

## Database State Changes

| Action | Tables Affected |
|--------|----------------|
| Create customer | `customers_customer` |
| Enroll customer | `customers_customerpass` |
| Process transaction | `transactions_transaction`, `customers_customerpass` |
| Add location | `tenants_location` |

## Error Scenarios

- Customer already enrolled → 400 duplicate error
- Invalid QR code → 404 not found
- Plan limit (customers/locations) → 403
