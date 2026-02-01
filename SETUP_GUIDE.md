# Capstone Project Setup Guide

*Team setup in under 2 minutes — works on Windows with Docker Desktop*

---


1. **Git repository link**  
   https://github.com/yasuaRin/capstone-project.git
2. **`vidhelp_dump.zip`** (database dump via WhatsApp / Google Drive)
3. **`google.json`** *(backend developers only)* via WhatsApp *(READ-ONLY access)*

---

##  Prerequisites

-  Windows 10 / 11
-  Docker Desktop installed & running  
  https://www.docker.com/products/docker-desktop/
-  Git installed  
  https://git-scm.com/downloads
-  PowerShell (built-in on Windows)

##  Setup Steps (All Team Members)

### Step 1: Clone repository
```powershell
git clone https://github.com/yasuaRin/capstone-project.git
cd capstone-project
```

### Step 2: Create .env
```powershell
copy .env.example .env
```

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=vidhelp_db
```

### Step 3: Setup database
```powershell
Expand-Archive -Path vidhelp_dump.zip -DestinationPath .
mkdir -Force docker\init
move 01-init.sql docker\init\
```

### Step 4: Start containers
```powershell
docker-compose --env-file .env up -d
```

### Step 5: Verify connection
```powershell
docker-compose exec db psql -U postgres -d vidhelp_db -c "SELECT 1;"
```

### Step 6: Verify data
```powershell
docker-compose exec db psql -U postgres -d vidhelp_db -c "SELECT COUNT(*) FROM live_sessions;"
docker-compose exec db psql -U postgres -d vidhelp_db -c "SELECT COUNT(*) FROM brands;"
```

---

##  Backend Setup 

```powershell
mkdir -Force credentials
cd backend
npm install
cd ..
```

```powershell
node backend/scripts/sync.js
```

---

##  Troubleshooting

- Port 5432 error → Disable native PostgreSQL
- Connection refused → Docker not running
- Auth failed → Check .env password

---

##  Security

```
.env
credentials/
*.sql
*.zip
```

---


---

##  Backend Runtime Check (Routes Verification)

After dependencies are installed and the database is running, verify that the backend server starts correctly and routes are accessible.

### Step 9: Start backend server

```powershell
cd backend
npm start
```

Expected output should indicate that **server.js** is running, for example:
- Server listening on a port (e.g. `localhost:3000`)
- Database connection successful
  
---

### Step 10: Verify server.js routes

####  Browser check
Open your browser and access:
```
http://localhost:3000/
```
or a known API route, for example:
```
http://localhost:3000/api/health
```

or a known API route, for example:
```
http://localhost:3000/api/admin
```

You should receive a valid response (JSON or status message).



### Step 11: Common backend issues

| Issue | Cause | Fix |
|-----|------|----|
| `npm start` fails | Dependencies missing | Run `npm install` again |
| Route returns 404 | Wrong endpoint | Recheck `server.js` routes |
| DB error on start | Docker DB not ready | Wait 30s or restart DB container |
| Port already in use | Another app using port | Change port or stop conflicting app |

---