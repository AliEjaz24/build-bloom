# iBIT TimeDesk Documentation

This document provides a comprehensive overview of the iBIT TimeDesk codebase, detailing its logic, structure, and operational workflows. The application is built using React with Tanstack Router, utilizing Supabase for backend services (Auth and PostgreSQL), and leveraging Tanstack Start for specific server-side functions.

---

## 1. Frontend Logic

The frontend is driven by React components mapping to routes using Tanstack Router. Supabase client (`@supabase/supabase-js`) is used directly on the frontend for data fetching, real-time subscriptions, and most mutations.

### Global State & Context
**`src/lib/auth-context.tsx`**
- **Method: `loadAux(uid)`**
  - *Called:* Upon initial page load or when the authentication state changes.
  - *Action:* Fetches the custom `profiles` and `user_roles` records belonging to the authenticated Supabase user. 
  - *Important Points:* This bridges Supabase Auth with custom application roles. If `profile` fails to load, specific route logic (like student batch filtering) will crash or restrict access.
- **Method: `signOut()`**
  - *Called:* When the user clicks the "Logout" button in the `app.tsx` sidebar.
  - *Action:* Instructs the Supabase client to destroy the session locally and remotely.

### Feature Routes
**`src/routes/login.tsx` & `src/routes/signup.tsx`**
- **Method: `submit(e)`**
  - *Called:* When the user submits the respective authentication forms.
  - *Action:* Calls `supabase.auth.signInWithPassword` or `supabase.auth.signUp`.
  - *Important Points:* For signups, it passes application-specific data (role, batch, department) via the `options.data` metadata object.

**`src/routes/app.timetable.tsx`**
- **Method: `load()`**
  - *Called:* On component mount (`useEffect`) and when the user changes filtering criteria.
  - *Action:* Fetches the `timetable_slots` from Supabase. 
  - *Important Points:* Includes conditional logic. If the user is a `student`, it queries their enrolled courses first via the `registrations` table, and explicitly limits the timetable view to only those courses.

**`src/routes/app.term-planner.tsx`**
- **Method: `useEffect()` (Terms Fetch)**
  - *Called:* On initial load.
  - *Action:* Fetches `terms` and filters them down for `student` roles by string-matching their `batch` variable (e.g. `24`) against the term codes/labels.

**`src/routes/app.data.tsx` (Admin Only)**
- **Methods: `addCourse`, `addRoom`, `addTeacher`**
  - *Called:* Submitting the Add forms in the Courses & Faculty dashboard.
  - *Action:* Calls `supabase.from(...).insert(...)` directly for courses and rooms. For teachers, it acts as an API client, invoking the server function `createTeacherFn`.

---

## 2. Backend Logic

The backend logic leans heavily on standard **Supabase functionality** (Row Level Security, Database Triggers, PostgreSQL views). However, custom backend logic exists via Tanstack Start server functions for operations that shouldn't leak permissions to the frontend.

**`src/lib/admin.api.ts`**
- **Method: `createTeacherFn(data)`**
  - *Called:* Invoked via RPC-style call from `app.data.tsx` by the Admin.
  - *Action:* 
    1. Instantiates a sterile, isolated Supabase client locally on the server.
    2. Calls `supabase.auth.signUp` to provision the new user.
    3. Manually `upsert`s the teacher's information directly into the `profiles` and `user_roles` tables.
  - *Important Points:* 
    - This method allows an admin to create a user account securely without the standard Supabase behavior of overwriting their own active admin session.
    - Since this executes in the Node.js backend (`createServerFn`), it does not require exposing dangerous service keys to the client.

**Supabase Triggers (Database Context)**
- **Action:** Supabase natively holds a trigger that listens to the `auth.users` table. Whenever a signup happens (via frontend `signup.tsx`), the trigger grabs the `raw_user_meta_data` provided during signup and automatically inserts records into `profiles` and `user_roles`.

---

## 3. Workflows

### A. Authentication & Registration Workflow
1. **Frontend:** The user fills out their information in `signup.tsx`.
2. **Transmission:** The `submit` method passes email, password, and the `options.data` payload directly to the Supabase Auth API endpoint over HTTPS.
3. **Backend/Supabase:** The Auth service validates the credentials and registers the user. 
4. **Database Event:** A PostgreSQL database trigger listens to the new user creation, takes the metadata (`role`, `full_name`, `batch`), and populates the `profiles` and `user_roles` tables so the application's RBAC (Role Based Access Control) works instantly.
5. **Frontend Reaction:** A success toast appears, and the user is navigated to `/app/dashboard`. The `auth-context.tsx` listener detects the new session, requests the profile, and updates the UI context.

### B. Admin Teacher Creation Workflow
1. **Frontend:** Admin fills out the new Teacher form in `app.data.tsx`.
2. **Transmission:** Frontend calls `createTeacherFn(tForm)`. Tanstack Start marshals this payload via a hidden `POST` API request to the backend Node environment.
3. **Backend Server:** `createTeacherFn` instantiates a backend-only Supabase client and executes the signup process. It manually executes `upsert` database queries to ensure the teacher's profile is complete immediately.
4. **Return to Frontend:** Backend replies with `{ success: true }`. The frontend displays a success toast and calls `load()` to refresh the local state table by pulling the updated `user_roles` view from Supabase.

### C. Live Notification Sync Workflow
1. **Backend Database:** When a system event creates a new notification (e.g., class cancelled), an `insert` occurs on the `notifications` table.
2. **Transmission:** Supabase Realtime (PostgreSQL websocket replication) pushes the change directly down the open websocket connection to listening clients.
3. **Frontend Listener:** In `app.tsx`, `supabase.channel("notif_changes")` receives the `postgres_changes` event.
4. **State Update:** The listener invokes `fetchUnread()` to do a fresh tally of unread notifications and updates the `unreadCount` React state, which immediately updates the red notification bubble UI.

---

## Application Feedback: Message Toasts System

The application relies on the **Sonner** notification library to display small popup alerts (toasts) across the application. 

### How it Works:
1. **Rendering Provider:** The `<Toaster />` component (likely mounted at the root of the app in `__root.tsx`) manages a hidden queue of notification states and renders them absolute-positioned over the DOM.
2. **Invocation:** Whenever a component finishes an async task, it calls the singleton function:
   - `toast.success("Action completed!")`
   - `toast.error(error.message)`
3. **Usage Pattern:** This is heavily utilized inside `try/catch` or error checking blocks immediately after database or server calls (e.g. `addCourse`, `save` in timetable editor, `submit` in login). Instead of rendering static error boundaries, Sonner renders temporary, auto-dismissing cards that alert the user of the system's success or failure dynamically.
