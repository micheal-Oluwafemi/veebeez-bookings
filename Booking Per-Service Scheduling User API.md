# Booking Per-Service Scheduling — User API

User-side (customer + guest) endpoints for per-service scheduling. Base variable `{{base_url}}` already contains `/api` — never add `/api` yourself.

Model in one line: every picked service carries its own stylist + start time (`items[].stylist_id`, `items[].scheduled_at` — `scheduled_at` required per item); the appointment header is derived (`scheduled_at` = earliest line, `duration_minutes` = sum, `stylist_id` = single stylist or null when mixed). Top-level `scheduled_at`/`stylist_id` are rejected with 422. Slot checks read each line's window; `pending`/unpaid bookings never block a slot.

## Auth

| Client | Login | Header |
| --- | --- | --- |
| Guest | none (public) | none — send `guest_email` + `guest_phone` (one of the two required) |
| Customer | `POST {{base_url}}/customer-auth/login` → `access_token` | `Authorization: Bearer <access_token>` |

```json
// login request — required: email, password
{
  "email": "adaeze@example.com",
  "password": "password123"
}
```

```json
// login response
{
  "user": { "id": 5, "first_name": "Adaeze", "last_name": "Okafor", "email": "adaeze@example.com" },
  "access_token": "eyJpdiI6...",
  "message": "Login successful"
}
```

Error shape (all endpoints):

```json
{
  "error": { "message": "That time slot is no longer available", "code": 422, "full_errors": null, "custom_code": "DATABASE_OPERATION_ERROR" }
}
```

---

### Check availability — per service

`GET {{base_url}}/booking-system/availability?date=2026-09-21&stylist_id=4&service_id=26` — public.

| Query param | Required | Details |
| --- | --- | --- |
| `date` | yes | `Y-m-d`. Closed days return `"slots": []`. |
| `duration_minutes` | no | integer 15–600, default `60`. Omit it when `service_id` is sent — the service duration is used. |
| `stylist_id` | no | `booking_stylists.id` (from `GET {{base_url}}/booking-system/stylists`). Absent = "any available". |
| `service_id` | no | `booking_services.id`. When sent with `stylist_id`, a stylist not assigned to the service returns `"slots": []`. |

Sample response (200):

```json
{
  "data": {
    "date": "2026-09-21",
    "duration_minutes": 90,
    "slots": ["2026-09-21 11:00:00", "2026-09-21 11:30:00", "2026-09-21 12:30:00"]
  }
}
```

---

### Create a booking (guest or logged-in user)

`POST {{base_url}}/booking-system/bookings` — public; attach the customer token to book as a customer, or send `guest_*` fields to book as a guest.

```json
// required: items[] (with scheduled_at per item) + (token or guest contact) | optional: everything else
{
  "items": [
    {
      "service_id": 26,
      "quantity": 1,
      "answers": [{ "option_id": 5 }],
      "stylist_id": 4,
      "scheduled_at": "2026-09-21 11:00:00"
    },
    {
      "service_id": 33,
      "stylist_id": 5,
      "scheduled_at": "2026-09-21 14:00:00"
    }
  ],
  "currency": "NGN",
  "guest_email": "guest@example.com",
  "guest_first_name": "Gail",
  "guest_last_name": "Host",
  "guest_phone": "08012345678",
  "whatsapp_number": "08012345678",
  "amount": 30000,
  "notes": "Coming with a friend"
}
```

| Body field | Required | Details |
| --- | --- | --- |
| `items` | yes | array, min 1 |
| `items[].service_id` | yes | `booking_services.id` |
| `items[].quantity` | no | integer, min 1, default 1 |
| `items[].answers` | no | array of `{ "option_id": <booking_question_options.id> }`; required options and follow-ups are validated |
| `items[].stylist_id` | no | `booking_stylists.id`; null/absent = any. Must be active and assigned to the service, else 422. |
| `items[].scheduled_at` | yes | `Y-m-d H:i:s` |
| `currency` | no | one of `NGN | USD | GHS | GBP`, default `NGN` |
| `guest_email` / `guest_phone` | conditional | one of the two is required when no customer token is sent |
| `guest_first_name` / `guest_last_name` | no | string, max 120 |
| `whatsapp_number` | no | string, max 30 |
| `amount` | no | numeric, min 0.01; upfront charge for the auto-minted payment link, must be ≥ minimum due (deposit, else total) — short amounts 422 with no booking created |
| `notes` | no | string |

Sample response (201) — each service carries its own `stylist_*` + `scheduled_at`; the header holds the earliest time:

```json
{
  "data": {
    "appointment_id": 15,
    "appointment_number": "APT-20260918-00015",
    "customer_id": null,
    "guest_email": "guest@example.com",
    "stylist_id": null,
    "stylist_slug": null,
    "stylist_name": null,
    "scheduled_at": "2026-09-21T11:00:00.000000Z",
    "duration_minutes": 150,
    "status": "pending",
    "payment_status": "unpaid",
    "currency": "NGN",
    "subtotal": "50000.00",
    "extra_amount": "0.00",
    "deposit_amount": "25000.00",
    "total_amount": "50000.00",
    "services": [
      {
        "line_id": 18,
        "service_id": 26,
        "service_name": "Short Acrylic",
        "quantity": 1,
        "unit_price": 25000,
        "line_total": 25000,
        "duration_minutes": 90,
        "stylist_id": 4,
        "stylist_slug": "ayomide",
        "stylist_name": "Ayomide Ojo",
        "scheduled_at": "2026-09-21T11:00:00",
        "answers": [{ "question_slug": "na3-q1", "value_text": "No, plain finish", "extra_cost": 0 }]
      },
      {
        "line_id": 19,
        "service_id": 33,
        "service_name": "Regular Pedicure",
        "quantity": 1,
        "line_total": 25000,
        "duration_minutes": 60,
        "stylist_id": 5,
        "stylist_slug": "mercy",
        "stylist_name": "Mercy Job",
        "scheduled_at": "2026-09-21T14:00:00",
        "answers": []
      }
    ],
    "payments": [],
    "amount_paid": "0",
    "payment_link": "https://checkout-v2.dev-flutterwave.com/v3/hosted/pay/00eff7a5dc13ae561a03"
  },
  "payment_link": "https://checkout-v2.dev-flutterwave.com/v3/hosted/pay/00eff7a5dc13ae561a03",
  "amount": 25000,
  "minimum_due": 25000,
  "message": "Booking created"
}
```

---

### List my bookings

`GET {{base_url}}/booking-system/my/bookings?status=pending&upcoming=true&per_page=15` — header: customer token.

| Query param | Required | Details |
| --- | --- | --- |
| `status` | no | one of `pending|confirmed|in_progress|completed|no_show|cancelled` |
| `upcoming` | no | `true` keeps only `scheduled_at ≥ now` |
| `per_page` | no | integer, default `15` |

Sample response (200):

```json
{
  "data": [
    {
      "appointment_id": 15,
      "appointment_number": "APT-20260918-00015",
      "stylist_id": null,
      "scheduled_at": "2026-09-21T11:00:00.000000Z",
      "status": "pending",
      "payment_status": "paid",
      "currency": "NGN",
      "total_amount": "50000.00",
      "deposit_amount": "25000.00",
      "amount_paid": "50000.00",
      "services": [
        { "line_id": 18, "service_id": 26, "service_name": "Short Acrylic", "line_total": 25000, "stylist_id": 4, "stylist_slug": "ayomide", "scheduled_at": "2026-09-21T11:00:00", "duration_minutes": 90 },
        { "line_id": 19, "service_id": 33, "service_name": "Regular Pedicure", "line_total": 25000, "stylist_id": 5, "stylist_slug": "mercy", "scheduled_at": "2026-09-21T14:00:00", "duration_minutes": 60 }
      ]
    }
  ],
  "metadata": { "total": 1, "current_page": 1, "last_page": 1, "per_page": 15 }
}
```

---

### Get one of my bookings

`GET {{base_url}}/booking-system/my/bookings/15` — header: customer token. No query params. Returns the full detail payload (same `services[]` shape as booking creation above, plus `payments[]`). Another customer's id returns 403 `NOT_OWNER`.

---

### Reschedule my booking — per service

`POST {{base_url}}/booking-system/my/bookings/15/reschedule` — header: customer token. Move individual lines, optionally to another stylist. Only `pending`/`confirmed` bookings can move. Top-level `scheduled_at` is rejected.

```json
{
  "services": [
    { "line_id": 19, "scheduled_at": "2026-09-21 15:30:00", "stylist_id": 5 }
  ],
  "notes": "Nails later the same day"
}
```

| Body field | Required | Details |
| --- | --- | --- |
| `services` | yes | array, min 1 |
| `services[].line_id` | yes | `booking_appointment_services.id` — must belong to this appointment (use `line_id` from the detail payload) |
| `services[].scheduled_at` | yes | `Y-m-d H:i:s`, new start for this line |
| `services[].stylist_id` | no | `booking_stylists.id`; omitted = keep current stylist |
| `notes` | no | string |

Sample response (200):

```json
{
  "data": {
    "appointment_id": 15,
    "appointment_number": "APT-20260918-00015",
    "scheduled_at": "2026-09-21T11:00:00.000000Z",
    "status": "pending",
    "services": [
      { "line_id": 18, "service_name": "Short Acrylic", "stylist_id": 4, "scheduled_at": "2026-09-21T11:00:00" },
      { "line_id": 19, "service_name": "Regular Pedicure", "stylist_id": 5, "scheduled_at": "2026-09-21T15:30:00" }
    ]
  },
  "message": "Rescheduled"
}
```
