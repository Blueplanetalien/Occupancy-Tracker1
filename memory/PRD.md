# Yube1 Stays — Occupancy Management Dashboard
**PRD & Implementation Memory**
_Last Updated: Feb 2026_

---

## Problem Statement
Build a full-stack dashboard for Yube1 Stays to manage occupancy data across 34 co-living/student accommodation properties. Includes daily occupancy entry, consolidated reports, property and manager performance tracking (including lifetime tracking across property changes), and detailed property analytics with heatmap visualization.

---

## User Personas
| Role | Access | Description |
|------|--------|-------------|
| Admin | Full | dharun@yube1.in — can enter data, manage properties, create users |
| Cluster Manager | Read-only | Created by admin — can view reports only |

---

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB) + JWT auth + passlib/bcrypt
- **Frontend**: React + Recharts + Tailwind CSS + Shadcn UI + Sonner toasts
- **Database**: MongoDB (seeded on startup)
- **Theme**: Olive Green (#556B2F) + Signal Yellow (#F5C518), light clean

---

## Properties (34 total)
| Property | Beds | Manager |
|----------|------|---------|
| Yube1 Alpha League | 87 | Nagarjun |
| Yube1 Aura League | 57 | Murali |
| Yube1 Campus View | 40 | Tharshan |
| Yube1 Capital League | 101 | Udhayan |
| Yube1 Castle | 32 | Vignesh |
| Yube1 Continental League | 116 | Samaran |
| Yube1 Empire League | 85 | Bene |
| Yube1 Glory | 46 | Chaudhary |
| Yube1 Greenhouse | 334 | Subash |
| Yube1 Haven | 25 | Surya |
| Yube1 Lakshmi | 30 | Gopal |
| Yube1 Liberty League | 63 | Rajasekar |
| Yube1 Madras League | 118 | Manikandan |
| Yube1 Meadows 1 | 49 | Udhayan |
| Yube1 Meadows 2 | 38 | Udhayan |
| Yube1 Metro | 32 | Avinash |
| Yube1 Millennial Campus | 61 | Nowfel |
| Yube1 Premier League | 80 | Sathish |
| Yube1 Prodigy | 106 | Abilash |
| Yube1 Pushkar | 38 | Charan |
| Yube1 Sarmani | 56 | Dhanush |
| Yube1 Sarovar | 20 | Bene |
| Yube1 Serenity | 50 | Anitha |
| Yube1 Sigma League | 118 | Gopi |
| Yube1 Temple Tower | 95 | Kesava Raman |
| Yube1 Tranquil | 38 | Arun |
| Yube1 Transit | 39 | Abdul |
| Yube1 Tyro Campus | 47 | Sarath Kumar |
| Yube1 United League | 107 | Thirumalai |
| Yube1 Uptown | 39 | Vijay (9365063141) |
| Yube1 Urban Square | 44 | Vijay (8525843041) |
| Yube1 Villas | 43 | Pravin |
| Yube1 Vintage League | 45 | Venkatesh |
| Yube1 Zen League | 136 | Anto |

---

## What's Been Implemented

### Phase 1 MVP
- Auth, Dashboard, Occupancy Entry, Daily/Monthly Reports, PM Performance, Properties, User Management — all implemented and tested (18/18 backend tests)

### Phase 2 Enhancements
- **CSV/PDF Export**: Added to Daily Report, Monthly Report, PM Performance pages
- **Add New Manager in Properties**: Toggle in change-manager modal
- **Low Occupancy Alerts**: Dashboard alert panel — Low Today, 3+ Consecutive Days Low, Not Reported Today

### Phase 3 Full CRUD + Redesign
- **Properties CRUD**: Add Property modal, Delete property (removes all records), Edit beds inline, Assign/Unassign manager
- **Managers Page** (`/managers`, admin-only): Dedicated CRUD page for property managers — add, edit, delete with confirmation
- **Redesigned Dashboard**: KPIs, 30-day area chart, top/bottom performer bars, distribution donut, alerts
- **Redesigned Daily Report**: Summary KPIs, distribution bar, bed utilisation pie, ranked properties chart, complete table
- **Redesigned Monthly Report**: KPIs, trend area chart, top/bottom performers, complete table, **YoY comparison**

### Phase 4 Property Analytics
- **Property Performance page** (`/performance/properties`): Property leaderboard ranked by all-time avg occupancy, top-3 podium, CSV export, clickable rows
- **Property Detail page** (`/performance/properties/:id`): Full property analytics — yearly calendar heatmap (12-month grid, color-coded daily occupancy), monthly bar chart, assignment history, year selector (2024–2027)
- **Year-over-Year Comparison** in Monthly Report: "Compare with Last Year" button loads side-by-side line chart + data table
- **Properties page**: Added "View Analytics" icon button (BarChart2) to navigate to PropertyDetail

---

## API Endpoints
- POST /api/auth/login
- GET /api/auth/me
- GET /api/properties
- POST /api/properties
- PUT /api/properties/{id}
- DELETE /api/properties/{id}
- DELETE /api/assignments/property/{id}
- GET /api/managers
- POST /api/managers
- PUT /api/managers/{id}
- DELETE /api/managers/{id}
- GET /api/managers/{id}/assignments
- POST /api/assignments
- GET /api/occupancy?date=
- POST /api/occupancy/bulk
- GET /api/reports/daily?date=
- GET /api/reports/monthly?year=&month=
- GET /api/reports/yearly-trend?year=
- GET /api/reports/trend-comparison?year=
- GET /api/dashboard/overview
- GET /api/alerts/low-occupancy?threshold=
- GET /api/performance/managers
- GET /api/performance/managers/{id}
- GET /api/performance/properties
- GET /api/performance/properties/{id}?year=
- GET /api/users
- POST /api/users
- PUT /api/users/{id}
- DELETE /api/users/{id}

---

## Prioritized Backlog

### P1 (Important)
- [ ] Bulk occupancy entry via CSV upload
- [ ] Property-level daily data table in PropertyDetail (view individual day entries)
- [ ] Email/notification for low occupancy alerts

### P2 (Nice to have)
- [ ] Mobile responsive improvements
- [ ] Dashboard filters (by cluster/group of properties)
- [ ] Property grouping/clustering feature

---

## Admin Credentials
- Email: dharun@yube1.in
- Password: Qwerty@789
