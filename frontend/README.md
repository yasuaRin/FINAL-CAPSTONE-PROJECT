# VIDHELP Frontend

## Project Setup

### Prerequisites

Make sure you have the following installed before starting:

- Node.js v18 or higher
- npm
- The backend server must be running before starting the frontend

### Installation

```bash
cd frontend
npm install
```

---

## Environment Configuration

Create a `.env` file inside the `frontend/` folder. Copy the structure below and fill in your actual values:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

### Where to find your Supabase credentials

1. Go to https://supabase.com and open your project
2. Click Settings on the left sidebar
3. Click API
4. Copy the values:

| Variable | Where it is |
|---|---|
| VITE_SUPABASE_URL | Project URL |
| VITE_SUPABASE_ANON_KEY | anon public under Project API keys |

Make sure `VITE_API_URL` matches the port your backend is running on. If your backend is on port 3000, it should be `http://localhost:3000/api`.

---

## Running the Frontend

Make sure the backend is already running first, then in a separate terminal:

```bash
cd frontend
npm run dev
```

Expected output in terminal:

```
VITE ready in ... ms
Local:   http://localhost:5173/
```

Open your browser and go to:

```
http://localhost:5173
```

To access the admin panel:

```
http://localhost:5173/admin/login
```

---

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AdminLayout.jsx       # Sidebar and main layout wrapper
│   │   │   └── ProtectedRoute.jsx    # Redirects unauthenticated users to login
│   │   └── ui/
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       ├── Table.jsx
│   │       └── Modal.jsx
│   ├── pages/
│   │   ├── public/
│   │   │   ├── Landing.jsx           # Public landing page
│   │   │   └── Booking.jsx           # Public booking page
│   │   ├── auth/
│   │   │   ├── Login.jsx             # Login page
│   │   │   ├── Register.jsx          # Register page
│   │   │   └── ForgotPassword.jsx    # Forgot password page
│   │   └── admin/
│   │       ├── Dashboard.jsx         # Admin dashboard (Student 1)
│   │       ├── Revenue.jsx           # Revenue management (Student 1)
│   │       ├── Brands.jsx            # Brands management (Student 1)
│   │       ├── Profile.jsx           # User profile (Student 1)
│   │       ├── Team.jsx              # Team management (add your module here)
│   │       └── Leads.jsx             # Leads management (add your module here)
│   ├── hooks/
│   │   ├── useAuth.js                # Authentication state and login/logout
│   │   ├── useRevenue.js             # Revenue data fetching and CRUD
│   │   ├── useBrands.js              # Brands data fetching and CRUD
│   │   ├── useTeam.js                # Team data fetching and CRUD
│   │   └── useLeads.js               # Leads data fetching
│   ├── services/
│   │   ├── api.js                    # Axios instance with token interceptor
│   │   └── supabase.js               # Supabase client
│   ├── styles/
│   │   └── index.css                 # Tailwind base styles and custom classes
│   ├── App.jsx                       # Routes definition
│   └── main.jsx                      # Entry point
├── .env                              # Environment variables (do not commit)
├── .env.example                      # Environment variable template
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## How to Add Your Own Module

Each student is responsible for building their own page inside `src/pages/admin/`. Follow these steps:

### Step 1 - Create your hook

Create a new file in `src/hooks/` to handle data fetching for your module. Use `useBrands.js` as a reference for the structure.

```javascript
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export const useYourModule = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/your-module/read');
      setData(response.data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
};
```

### Step 2 - Build your page

Open your assigned page file in `src/pages/admin/` and build your UI there. Import your hook at the top:

```javascript
import { useYourModule } from '../../hooks/useYourModule';
```

### Step 3 - Make sure your route exists in App.jsx

Your page is already registered as a route in `App.jsx`. You do not need to add anything there unless you are creating a completely new page that is not listed.

### Step 4 - Connect to the backend

Make sure the API URL in your hook matches the route registered in the backend. For example if the backend has `app.use('/api/team', teamRoutes)` then your hook should call `api.get('/team/read')`.

### Step 5 - Test in the browser

Start both servers and navigate to your page in the browser. Open DevTools (F12) and check the Network tab to confirm your API calls are returning 200.

---

## Notes for Team Members

**Important files to know:**

- `src/services/api.js` — all API calls go through this. It automatically attaches the Bearer token from localStorage to every request. Do not modify this file unless you know what you are doing.
- `src/hooks/useAuth.js` — handles login, logout, and checking if a user is authenticated. The `ProtectedRoute` component uses this to block unauthenticated access.
- `src/components/layout/AdminLayout.jsx` — the sidebar navigation. If you add a new page, add your route to the `menuItems` array in this file so it appears in the sidebar.

**Common issues:**

- If you get a CORS error in the browser console, make sure the backend `CORS_ORIGIN` in `.env` includes `http://localhost:5173`.
- If API calls return 401, your token has expired. Log out and log back in.
- If your page shows a blank screen, open the browser console and check for import errors. Most likely a hook or component file path is wrong.
- If you get a 404 on your API call, check that your backend route is registered in `index.js` and the URL in your hook matches exactly.
- Make sure your `.env` file has real Supabase values and not the placeholder text. The frontend will fail silently if these are wrong.