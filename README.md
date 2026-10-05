# MyGate Clone - Society Management App

Full-stack clone of the MyGate gated-community app.

| Layer    | Tech                                              |
| -------- | ------------------------------------------------- |
| Backend  | Node.js, Express, Mongoose, JWT, Socket.io        |
| Frontend | Next.js 14 (App Router), Tailwind CSS, Axios      |
| Database | MongoDB                                           |

## Features

1. **Visitor entry approval** - guard logs a guest / delivery / cab at the gate, resident gets a real-time notification and taps Allow or Deny.
2. **Pre-approved entry** - resident generates a 6-digit passcode in advance, guard verifies the code at the gate.
3. **Daily help management** - maid / cook / driver get a permanent passcode, guard checks them in and out, attendance report per month.
4. **Society bills** - admin generates maintenance / water / parking bills (per flat or all flats), resident pays online (simulated gateway) and gets a receipt.
5. **Complaints / helpdesk** - resident raises tickets, admin assigns and updates status, both sides comment, resident rates on resolution.
6. **Amenity booking** - clubhouse / gym / pool / hall with time slots, capacity and charges.
7. **Notices, polls, discussions, resident directory**.
8. **Kid safety** - parent registers children with allowed escorts, guard logs exit / entry, parent is alerted (with a warning if the escort is unknown).

Plus: role-based auth (admin / resident / guard), in-app notification centre, live toasts over Socket.io.

## Project structure

```
mytalk/
├── backend/
│   ├── .env                 # PORT, MONGO_URI, JWT_SECRET, CLIENT_URL
│   └── src/
│       ├── server.js        # http + socket.io bootstrap
│       ├── app.js           # express app, routes, error handling
│       ├── socket.js        # socket.io auth + rooms
│       ├── seed.js          # demo data
│       ├── config/db.js
│       ├── middleware/      # auth (JWT + roles), error handler
│       ├── models/          # 15 Mongoose models
│       ├── controllers/     # one per feature
│       ├── routes/          # one per feature
│       └── utils/           # passcode, notify, asyncHandler
└── frontend/
    ├── .env.local           # NEXT_PUBLIC_API_URL
    └── src/
        ├── app/             # pages: login, register, dashboard, visitors, daily-help,
        │                    #        bills, complaints, amenities, community, kids,
        │                    #        notifications, admin/users
        ├── components/      # AppShell (sidebar + bell), ui (Card, Badge, Modal, ...)
        └── lib/             # api.js (axios), auth.js (context + socket + toasts)
```

## Setup

Requirements: Node 18+, MongoDB running locally (or an Atlas URI).

```bash
# 1. backend
cd backend
npm install
# edit .env if your Mongo URI is different
npm run seed          # loads demo society + users
npm run dev           # http://localhost:5000

# 2. frontend (new terminal)
cd frontend
npm install
npm run dev           # http://localhost:3000
```

Or from the repo root: `npm install` then `npm run dev` starts both.

## Demo accounts (password: `password123`)

| Role     | Email          | Flat  |
| -------- | -------------- | ----- |
| Admin    | admin@gva.com  | -     |
| Guard    | guard@gva.com  | -     |
| Resident | aman@gva.com   | A-101 |
| Resident | priya@gva.com  | A-102 |
| Resident | rohit@gva.com  | B-201 |

Society join code for new registrations: `GVA001`.
Demo passcodes: visitor `123456` (A-101), maid `111111`, driver `222222`.

Try the live flow: open two browser windows, log in as guard in one and resident (aman) in the other. Guard adds a visitor for A-101, the resident window shows an Allow / Deny card instantly.

## API overview

All routes under `/api`, JWT in `Authorization: Bearer <token>`.

| Area          | Routes                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| Auth          | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`                                                       |
| Society       | `POST /societies` (bootstrap), `GET /societies/residents`, `GET /societies/users`, `GET /societies/stats`       |
| Visitors      | `POST /visitors/gate`, `PATCH /visitors/:id/respond`, `POST /visitors/preapprove`, `POST /visitors/verify`, `PATCH /visitors/:id/entry`, `PATCH /visitors/:id/exit`, `GET /visitors` |
| Daily help    | `POST /daily-help`, `GET /daily-help`, `POST /daily-help/checkin`, `POST /daily-help/checkout`, `GET /daily-help/:id/attendance` |
| Bills         | `POST /bills`, `GET /bills`, `POST /bills/:id/pay`, `POST /bills/:id/mark-paid`, `GET /bills/summary`           |
| Complaints    | `POST /complaints`, `GET /complaints`, `PATCH /complaints/:id/status`, `POST /complaints/:id/comments`, `POST /complaints/:id/rate` |
| Amenities     | `GET /amenities`, `POST /amenities`, `GET /amenities/:id/slots?date=`, `POST /amenities/:id/book`, `GET /amenities/bookings/mine`, `DELETE /amenities/bookings/:id` |
| Community     | `/community/notices`, `/community/polls`, `/community/polls/:id/vote`, `/community/discussions`                 |
| Kids          | `POST /children`, `GET /children`, `POST /children/:id/log`, `GET /children/:id/logs`                          |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`                          |

Socket.io events: `notification` (to the user), `visitor:response` (to all guards of the society).

## Creating a brand new society

```bash
curl -X POST http://localhost:5000/api/societies -H "Content-Type: application/json" -d '{
  "society": { "name": "Sunrise Towers", "address": "Pune", "city": "Pune", "code": "SUN001", "towers": ["A"] },
  "admin": { "name": "Admin", "email": "admin@sun.com", "phone": "9999999999", "password": "secret123" }
}'
```

Residents and guards then register on `/register` using code `SUN001`.
