# VIDHELP Backend

## Project Setup

### Prerequisites

Make sure you have the following installed before starting:

- Node.js v18 or higher
- npm
- Postman (for endpoint testing)
- A Supabase account with a project created

### Installation

```bash
cd backend
npm install
```

---

## Environment Configuration

Create a `.env` file inside the `backend/` folder. Copy the structure below and fill in your actual values:

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
```

### Where to find your Supabase credentials

1. Go to https://supabase.com and open your project
2. Click Settings on the left sidebar
3. Click API
4. Copy the values:

| Variable | Where it is |
|---|---|
| SUPABASE_URL | Project URL |
| SUPABASE_ANON_KEY | anon public under Project API keys |
| SUPABASE_SERVICE_KEY | service_role under Project API keys |

---

## Running the Server

```bash
npm run dev
```

Expected output in terminal:

```
Server running on port 3000
Environment: development
```

To verify the server is alive, open your browser and go to:

```
http://localhost:3000/health
```

Expected response:

```json
{
  "success": true,
  "message": "VIDHELP Backend is running",
  "timestamp": "2025-xx-xxTxx:xx:xx.xxxZ"
}
```

---

## Authentication

All endpoints except `/health` and `/api/auth/login` require a Bearer token in the request header.

### Step 1 - Get your token

Send a POST request to login and copy the token from the response.

```
Method  : POST
URL     : http://localhost:3000/api/auth/login
```

Body (raw JSON):

```json
{
  "email": "your@email.com",
  "password": "yourpassword"
}
```

Expected response:

```json
{
  "success": true,
  "token": "eyJ...",
  "user": {
    "id": "...",
    "email": "...",
    "role": "admin"
  }
}
```

### Step 2 - Add token to Postman

In Postman, go to the Authorization tab of any request, select Bearer Token, and paste your token. You only need to do this once per session. Tokens expire after some time, so repeat Step 1 if you get a 401 Invalid or expired token response.

---

## Endpoint Testing Guide

Base URL: `http://localhost:3000`

All endpoints below require the Bearer token from the Authentication section above unless stated otherwise.

---

## Dashboard Module

The Dashboard page pulls data from the Revenue and Brands endpoints. If both of these return 200, the Dashboard will load correctly.

### Get All Revenue (Dashboard stat source)

```
Method  : GET
URL     : http://localhost:3000/api/revenue/read
Auth    : Bearer Token
```

Expected response: 200 with a `data` array. Each item contains `revenue_shopee` and `revenue_tiktok` fields.

### Get All Brands (Dashboard stat source)

```
Method  : GET
URL     : http://localhost:3000/api/brands/read
Auth    : Bearer Token
```

Expected response: 200 with a `data` array of brand objects.

---

## Revenue Module

### 1. Get All Revenue

Retrieves all live session records with joined brand, platform, and staff data.

```
Method  : GET
URL     : http://localhost:3000/api/revenue/read
Auth    : Bearer Token
```

Expected response: 200

### 2. Get Revenue with Filters

You can filter by date range or brand using query parameters.

```
Method  : GET
URL     : http://localhost:3000/api/revenue/read?startDate=2025-01-01&endDate=2025-12-31
Auth    : Bearer Token
```

Expected response: 200 with filtered results. An empty array is fine if no data matches the range.

### 3. Create Revenue

Creates a new live session record. All fields below are required by the database.

```
Method  : POST
URL     : http://localhost:3000/api/revenue/create
Auth    : Bearer Token
```

Body (raw JSON):

```json
{
  "date": "2025-01-15",
  "time": "10:00",
  "revenue_shopee": 500000,
  "revenue_tiktok": 300000,
  "period_id": 1,
  "host_id": 1,
  "brand_id": "f0cd0235-ffd8-4ac3-b033-ae9c86d4f0e8",
  "platform_id": "045dbc37-9740-44cd-99b7-03489159173a"
}
```

Note: Use real IDs from your Supabase database. The `brand_id` and `platform_id` are UUIDs. The `period_id` and `host_id` are integers. You can find valid values by calling the GET revenue endpoint first and copying the IDs from any existing record.

Expected response: 201 with the created record. Copy the `id` from the response to use in Update and Delete.

### 4. Update Revenue

Updates an existing revenue record by ID.

```
Method  : PUT
URL     : http://localhost:3000/api/revenue/update/{id}
Auth    : Bearer Token
```

Replace `{id}` with the `id` value from the Create Revenue response.

Body (raw JSON):

```json
{
  "revenue_shopee": 999999
}
```

Expected response: 200 with the updated record.

### 5. Delete Revenue

Deletes a revenue record by ID.

```
Method  : DELETE
URL     : http://localhost:3000/api/revenue/delete/{id}
Auth    : Bearer Token
```

Replace `{id}` with the `id` of the record you want to delete.

Expected response:

```json
{
  "success": true,
  "message": "Revenue record deleted"
}
```

---

## Brands Module

### 1. Get All Brands

Returns all brands ordered by name.

```
Method  : GET
URL     : http://localhost:3000/api/brands/read
Auth    : Bearer Token
```

Expected response: 200 with a `data` array.

### 2. Create Brand

Creates a new brand record.

```
Method  : POST
URL     : http://localhost:3000/api/brands/create
Auth    : Bearer Token
```

Body (raw JSON):

```json
{
  "brand_name": "Test Brand",
  "brand_category": "Fashion",
  "brand_status": "active"
}
```

Expected response: 201 with the new brand record. Copy the `brand_id` from the response to use in Update and Delete.

### 3. Update Brand

Updates an existing brand by ID.

```
Method  : PUT
URL     : http://localhost:3000/api/brands/update/{brand_id}
Auth    : Bearer Token
```

Replace `{brand_id}` with the UUID from the Create Brand response.

Body (raw JSON):

```json
{
  "brand_name": "Updated Brand Name"
}
```

Expected response: 200 with the updated record.

### 4. Delete Brand

Deletes a brand by ID.

```
Method  : DELETE
URL     : http://localhost:3000/api/brands/delete/{brand_id}
Auth    : Bearer Token
```

Replace `{brand_id}` with the UUID of the brand you want to delete.

Expected response:

```json
{
  "success": true,
  "message": "Brand deleted"
}
```

### 5. Risk Signals

Returns a risk level (low, medium, high) for each brand based on total revenue from their live sessions.

```
Method  : GET
URL     : http://localhost:3000/api/brands/risk-signals
Auth    : Bearer Token
```

Expected response: 200 with an array of objects containing `brand_id`, `brand_name`, `risk_level`, and `status`.

---

## Profile Module

The Profile page uses this endpoint to display the currently logged-in user's details.

### Get Current User Profile

```
Method  : GET
URL     : http://localhost:3000/api/auth/profile
Auth    : Bearer Token
```

Expected response:

```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "...",
    "role": "admin",
    "full_name": "..."
  }
}
```


## Add Your Own Module Here

The sections above are Student 1's modules (Dashboard, Revenue, Brands, Profile). Each student must add their own endpoint module below this section.

To create and register your own endpoint:

1. Create `src/controllers/yourModuleController.js` and write your CRUD functions inside it
2. Create `src/routes/yourModuleRoutes.js` and map each function to a route path
3. Open `src/index.js` and add `app.use('/api/your-module', yourModuleRoutes)` alongside the existing routes
4. Restart the server with `npm run dev`
5. Test each endpoint in Postman using the same steps in the Authentication section above
6. Add a new section below this line documenting your endpoints using the same format as the Revenue or Brands module above

---

## Notes for Team Members

**Tested endpoints (confirmed working — Student 1):**

- POST /api/auth/login
- GET /api/auth/profile
- GET /api/revenue/read
- POST /api/revenue/create
- PUT /api/revenue/update/:id
- DELETE /api/revenue/delete/:id
- GET /api/brands/read
- POST /api/brands/create
- PUT /api/brands/update/:id
- DELETE /api/brands/delete/:id
- GET /api/brands/risk-signals
