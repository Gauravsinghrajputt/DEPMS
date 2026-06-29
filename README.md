# Data Entry Performance Management System (DEPMS)

Enterprise-grade performance tracking for data entry teams.

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js 20 + Express 4
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Auth**: JWT (httpOnly cookies)
- **DevOps**: Docker + Nginx + GitHub Actions

## Roles
| Role | Capabilities |
|---|---|
| Admin | Full org access, create users/targets, export reports, audit logs |
| Team Leader | View/manage their team, daily/weekly/monthly reports |
| Employee | Own dashboard only, daily entry submission |

## Quick Start (Development)

```bash
# 1. Clone and install
git clone <repo-url>
cd depms
cp .env.example .env        # fill in values

# 2. Start all services
docker-compose up -d

# 3. Run migrations + seed
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed

# 4. Access
# Frontend: http://localhost:5173
# API:      http://localhost:3000
# Default admin: admin@company.com / Admin@123
```

## Project Structure
```
depms/
├── backend/                  Node.js API server
│   ├── src/
│   │   ├── config/           DB, Redis, env config
│   │   ├── controllers/      Route handlers
│   │   ├── middleware/        Auth, RBAC, validation, rate-limit
│   │   ├── models/           Knex query builders
│   │   ├── routes/           Express routers
│   │   ├── services/         Business logic
│   │   ├── utils/            Helpers, logger, mailer
│   │   └── validators/       Joi schemas
│   ├── migrations/           Knex DB migrations
│   └── seeds/                Initial data (roles, admin user)
├── frontend/                 React + Vite app
│   └── src/
│       ├── api/              Axios client + endpoints
│       ├── components/       Reusable UI components
│       │   ├── admin/        Admin-specific widgets
│       │   ├── employee/     Employee widgets
│       │   ├── leader/       Team leader widgets
│       │   └── shared/       Charts, tables, modals
│       ├── pages/            Route-level page components
│       ├── hooks/            Custom React hooks
│       ├── store/            Zustand state management
│       └── utils/            Formatters, constants
├── docker/                   Dockerfiles
├── nginx/                    nginx.conf
├── .github/workflows/        CI/CD pipelines
└── docs/                     API docs, deployment guide
```

## Environment Variables
See `.env.example` for all required variables.

## API Documentation
See `docs/API.md` for full REST API reference.

## Deployment
See `docs/DEPLOYMENT.md` for AWS/Azure/DigitalOcean guides.
