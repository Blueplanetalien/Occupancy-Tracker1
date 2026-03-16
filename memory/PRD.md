# Yube1 Stays — Occupancy Management Dashboard
**PRD & Implementation Memory**
_Last Updated: Mar 2026_

---

## Problem Statement
Full-stack dashboard for Yube1 Stays to manage occupancy data across 34 co-living/student properties. Includes daily occupancy entry (by beds count), consolidated reports, property/manager/cluster manager performance tracking, and detailed property analytics with heatmap visualization.

---

## Admin Credentials
| Name | Email | Password | Role |
|------|-------|----------|------|
| Dharun | dharun@yube1.in | Qwerty@789 | Admin |
| Rogan | rogan@yube1.in | Qwerty@123 | Admin |

---

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB) + JWT auth + passlib/bcrypt
- **Frontend**: React + Recharts + Tailwind CSS + Shadcn UI + Sonner toasts
- **Database**: MongoDB (seeded on startup)
- **Theme**: Olive Green (#556B2F) + Signal Yellow (#F5C518), light clean

---

## What's Been Implemented

### Phase 1 — MVP
Auth, Dashboard, Occupancy Entry, Daily/Monthly Reports, PM Performance, Properties, User Management

### Phase 2 — Enhancements
CSV/PDF Export on all report pages, Add manager in modal, Low Occupancy Alerts on Dashboard

### Phase 3 — Full CRUD + Redesign
Properties CRUD, Managers Page (/managers), Redesigned Dashboard/Daily Report/Monthly Report

### Phase 4 — Property Analytics
- **Property Performance page** (/performance/properties): leaderboard with top-3 podium, CSV export
- **Property Detail page** (/performance/properties/:id): yearly calendar heatmap, monthly bar chart, assignment history, year selector
- **YoY Comparison** in Monthly Report: "Compare with Last Year" loads line chart + data table
- **Dense ranking** on all performance pages (same % = same rank, consecutive numbers)

### Phase 5 — Cluster Management + UX
- **Cluster Manager Performance page** (/performance/cluster-managers): lifetime leaderboard (top-3 podium, expandable property list) + monthly section with month/year picker
- **CM assignment on Properties**: Cluster Mgr column in table + CM dropdown in edit modal
- **Occupancy Entry**: Changed from % input → occupied beds count input (percentage auto-calculated live, "Set All Full" fills total_beds)
- **Change Password**: Modal accessible from sidebar footer for all users
- **Admin Rogan**: rogan@yube1.in / Qwerty@123
- **User Management**: create/update now supports role selection (admin or cluster_manager)

### Phase 6 — Enhanced Reports
- **PDF Design Overhaul**: Styled PDF exports with branded header (YUBE1 STAYS), KPI boxes, occupancy distribution bar, color-coded table cells (green/amber/red), footer with page numbers
- **Cluster Manager in Reports**: `cluster_manager_name` added to PDF and CSV exports for both Daily and Monthly reports
- **Cluster Mgr column** added to on-screen tables in Daily Report and Monthly Report pages
- **bcrypt Fix**: Downgraded bcrypt 4.1.3 → 4.0.1 to eliminate recurring `AttributeError: module 'bcrypt' has no attribute '__about__'` on backend startup

---

## API Endpoints (complete)
- POST /api/auth/login
- GET /api/auth/me
- PUT /api/auth/change-password
- GET /api/properties
- POST /api/properties
- PUT /api/properties/{id}
- PUT /api/properties/{id}/cluster-manager
- DELETE /api/properties/{id}
- DELETE /api/assignments/property/{id}
- GET /api/managers, POST, PUT /{id}, DELETE /{id}
- GET /api/occupancy?date=
- POST /api/occupancy/bulk  ← accepts {occupied_beds}
- GET /api/reports/daily?date=
- GET /api/reports/monthly?year=&month=
- GET /api/reports/yearly-trend?year=
- GET /api/reports/trend-comparison?year=
- GET /api/dashboard/overview
- GET /api/alerts/low-occupancy
- GET /api/performance/managers
- GET /api/performance/managers/{id}
- GET /api/performance/properties
- GET /api/performance/properties/{id}?year=
- GET /api/performance/cluster-managers
- GET /api/performance/cluster-managers/monthly?year=&month=
- GET /api/users, POST, PUT /{id}, DELETE /{id}

---

## Prioritized Backlog

### P1
- [ ] Bulk occupancy entry via CSV upload
- [ ] Property-level daily data table in PropertyDetail
- [ ] Email/notification for low occupancy alerts

### P2
- [ ] Mobile responsive improvements
- [ ] Dashboard filters by cluster group
- [ ] Property grouping/clustering feature
- **Dashboard Cluster View**: GET /api/dashboard/clusters, compact CM cards with expand
