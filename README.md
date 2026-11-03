# Hajri (Node)

Node port of `hajri-laravel`: an Express + Prisma + MySQL API and a Next.js web app that reuses the Laravel CSS/assets, so the screens look the same.

```
api/    Express + Prisma REST API under /api/v1 (/auth, /admin, /employee, /super-admin)
web/    Next.js (App Router): admin, employee and super-admin portals
tools/  Blade -> React porting helpers (port.py, blade2jsx.py, status.py)
```

## Setup

### API
```bash
cd api
cp .env.example .env        # fill DATABASE_URL (MySQL), JWT_SECRET, optional WhatsApp / SMTP / Firebase / Cashfree / Kelviq keys
npm install
npx prisma db push          # creates the schema
npm run db:seed             # super admin (SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD) + base data
npm run dev                 # http://localhost:4000
npm test                    # unit tests
```
With `OTP_DEV_MODE=true` every OTP is `1234` and no WhatsApp message is sent.

### Web
```bash 
cd web
echo 'NEXT_PUBLIC_API_URL=http://localhost:4000' > .env.local
npm install
npm run dev                 # http://localhost:3000
npm run build && npm start  # production
```

## Portals
s       
| Portal | URL | Login |
| --- | --- | --- |
| Admin (business owner / admin users) | `/` | phone + OTP |
| Employee | `/employee/login` | phone + OTP |
| Super admin | `/super-admin/login` | email + password |

Page URLs match the Laravel routes (`/setting/departments_new`, `/payroll/payroll-approvals-new`, ...). Old Laravel URLs that were superseded by a `_new` page are redirected in `web/next.config.ts`.
ß
## Known differences from Laravel

- Maps use OpenStreetMap/Leaflet instead of HERE.
- Bulk staff import saves immediately (no preview-before-save step).
- Super-admin business detail is a condensed version of the Laravel view.
- Payroll overtime / approval-review legacy pages redirect to their `_new` equivalents.
- Not ported: Kelviq payment-success callback page, geofence check, test-notification endpoint, remote-staff background tracking map.

## Porting workflow (for any remaining Blade view)
```bash
python3 tools/port.py <blade file> <laravel-url-path> - [--group admin|employee|super|adminauth]
python3 tools/status.py --todo
```
