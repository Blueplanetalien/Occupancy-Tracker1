# Yube1 Stays — Occupancy Management Dashboard
**PRD & Implementation Memory**
_Last Updated: March 2026_

---

## Problem Statement
Build a full-stack dashboard for Yube1 Stays to manage occupancy data across 34 co-living/student accommodation properties. Includes daily occupancy entry, consolidated reports, and property manager performance tracking (including lifetime tracking across property changes).

---

## User Personas
| Role | Access | Description |
|------|--------|-------------|
| Admin | Full | dharun@yube1.in — can enter data, manage properties, create users |
| Cluster Manager | Read-only | Created by admin — can view reports only |

---

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB) + JWT auth + bcrypt
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
| Yube1 Sarovar | 20 | **Bene** (updated from Abdul — March 2026) |
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
### Phase 1 MVP (March 2026)
- **Auth**: JWT login, admin + cluster manager roles, admin creates cluster manager accounts
- **Dashboard Overview**: KPI cards, 30-day trend chart, today's property bar chart
- **Occupancy Entry**: Daily % entry for all 34 properties, color-coded, bulk save
- **Daily Report**: Date picker, pie chart (occupied/vacant), bar chart per property, full table
- **Monthly Report**: Month/year selector, daily trend line chart, property comparison bar chart
- **PM Performance**: Leaderboard with lifetime avg occupancy, expandable property history, top-3 podium
- **Properties**: Full list with search, admin can change manager assignments with date tracking
- **User Management**: Admin creates/deletes cluster manager accounts
- **Seed Data**: All 34 properties + 33 managers pre-loaded on startup

---

## API Endpoints
- POST /api/auth/login
- GET /api/auth/me
- GET /api/properties
- PUT /api/properties/{id}
- GET /api/managers
- POST /api/managers
- GET /api/managers/{id}/assignments
- POST /api/assignments
- GET /api/occupancy?date=
- POST /api/occupancy/bulk
- GET /api/reports/daily?date=
- GET /api/reports/monthly?year=&month=
- GET /api/reports/yearly-trend?year=
- GET /api/dashboard/overview
- GET /api/performance/managers
- GET /api/performance/managers/{id}
- GET /api/users
- POST /api/users
- PUT /api/users/{id}
- DELETE /api/users/{id}

---

## Prioritized Backlog

### P0 (Critical — Next)
- [ ] Export reports to CSV/PDF

### P1 (Important)
- [ ] Trend comparison: month-over-month or year-over-year
- [ ] Bulk occupancy entry via CSV upload
- [ ] Property-level detailed view with full history chart

### P2 (Nice to have)
- [ ] Email reports/alerts (low occupancy alerts)
- [ ] Mobile responsive improvements
- [ ] Dashboard filters (by cluster/group of properties)
- [ ] Yearly occupancy heatmap calendar

---

## Admin Credentials
- Email: dharun@yube1.in
- Password: Qwerty@789
