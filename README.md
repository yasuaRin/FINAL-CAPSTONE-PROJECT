# VIDHELP Capstone Project

## ADMIN PANEL MODULES

### Port Assignments
| Module | Port | Developer | API Base |
|--------|------|-----------|----------|
| Overview Dashboard | 5001 | **Dadia** | `/api/overview/*` |
| Revenue Tracker | 5002 | **Dadia** | `/api/revenue/*` |
| Smart Partnership | 5003 | Friend 1 | `/api/partners/*` |
| Team Management | 5004 | Friend 2 | `/api/team/*` |
| User Website | 3000 | Friend 3 | `/api/user/*` |

##  Project Structure
admin/overview/ # Dadia - Dashboard overview
admin/revenue-tracker/ # Dadia - Revenue analytics
admin/smart-partnership/ # Friend 1 - UMKM partners
admin/team-management/ # Friend 2 - Team management
user/website/ # Friend 3 - Public website
shared/ # Shared resources


## Development Setup

### 1. Start Shared Database
```bash
docker-compose up postgres pgadmin
# Database: localhost:5433
# PGAdmin: http://localhost:5050
```

## API Health Check

### Admin-Overview Dashboard
To check the health of the Overview Dashboard, use the following commands:

```bash
curl http://localhost:5001/health
curl http://localhost:5001/api/kpis
```

### Admin-Revenue Tracker
To check the health of the Revenue Tracker, use the following commands:

```bash
curl http://localhost:5002/health
curl http://localhost:5002/api/revenue/daily
```