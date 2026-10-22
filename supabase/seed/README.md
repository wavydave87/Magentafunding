# Seed & demo data

Partner Portal demo data (three fictional organizations, their applications,
owners, timeline events and documents) was created inside the original partner
schema migration `20260831175253_*.sql` under the `-- ============ DEMO DATA
============` heading.

It is fictional only — `.example` domains, invented business names, no real
personal data, and no logins attached. Real partner organizations are created
from **Partner Network → New Partner Organization**, which is the only
supported path going forward.

## Before go-live

Run `purge-partner-demo-data.sql` as a migration to remove every demo row.
Nothing in the application depends on it. Do not add new demo rows to schema
migrations — keep seed data in this folder.

## Demo organizations

| Slug          | Name                       |
| ------------- | -------------------------- |
| `northgate`   | Northgate Capital Partners |
| `bluestone`   | Bluestone Referral Group   |
| `harbor-line` | Harbor Line Advisors       |
