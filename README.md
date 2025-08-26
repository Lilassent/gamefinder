GameFinder
GameFinder is a full-stack web application for discovering games, saving favorites (wishlist), and managing a personal gaming profile.
It uses React + Vite on the frontend, Node.js/Express + TypeScript on the backend, and PostgreSQL for persistent storage.

# Features:
-	User accounts — sign up, login, password reset, Google OAuth;
-	Game search — fetches from RAWG API;
-	Wishlist — save and remove favorite games;
-	Account settings — update nickname, email, password;
-	Password reset — secure code system stored in DB;
-	Clean responsive UI with React + Vite;

# Database Schema (PostgreSQL):
-	users — stores registered users (nickname, email, password hash, Google UID);
-	games — cached games from RAWG API (id, title, slug, genres, platforms, release date);
-	likes — pivot table for user favorites (wishlist);
-	password_reset_codes — stores reset codes with expiration & usage tracking;

How to initialize the database:

Step 1. Launch pgAdmin
- Open pgAdmin 4.
- Connect to your PostgreSQL server (usually localhost:5432, user postgres).
(If the server isn’t added yet, pgAdmin will prompt you for the superuser password (postgres) the first time.)

Step 2. Create a new database
- In the left panel ("Browser"), expand your server → right-click on Databases → Create → Database...
- In the Database field, enter for example: gamefinder
- Leave the Owner as postgres (or your custom user).
- Click Save.
Now you have an empty gamefinder database.


Step 3. Open Query Tool
-	In the tree on the left, click on your new database gamefinder.
-	In the top menu, select Tools → Query Tool.
-	The SQL editor will open.

Step 4. Paste the SQL script
- Copy and paste my script from /db/scheme.sql into the editor:

Step 5. Run the script
-	Click the (Execute/Run) button or press F5.
-	If everything is correct, you’ll see Query returned successfully at the bottom.

Step 6. Verify the tables
-	In the left panel, refresh the public schema → Tables.
You should now see:
users
games
likes
password_reset_codes

Done! Your database is ready.


# Requirements:
- Node.js >= 18
- Pnpm
- PostgreSQL 14+

# Setup & Run:
1. Clone repository:
git clone https://github.com/Lilassent/gamefinder.git
cd gamefinder

2. Install dependencies:
Using pnpm (recommended):
pnpm install

3. Setup environment variables:
Backend (backend/.env):

PORT=”your port”
NODE_ENV=development

# APIs
RAWG_API_KEY=your_rawg_key
YOUTUBE_API_KEY= your_youtube_key

# Database
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/gamefinder
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE

# JWT
JWT_SECRET=supersecret

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_B64=…

# Email (for password reset, optional)
SMTP_USER=…
SMTP_PASS=…
SMTP_FROM=…
SMTP_HOST=…
SMTP_PORT=…
SMTP_SECURE=...

# CORS
FRONTEND_ORIGIN=http://localhost:5173

Frontend (webapp/.env):

VITE_API_URL=http://localhost:3001/api

# firebase.ts
VITE_FIREBASE_API_KEY=…
VITE_FIREBASE_AUTH_DOMAIN=…
VITE_FIREBASE_PROJECT_ID=…
VITE_FIREBASE_STORAGE_BUCKET=…
VITE_FIREBASE_MESSAGING_SENDER_ID=…
VITE_FIREBASE_APP_ID=…

4. How to start my project
- You need to go to the backend folder and build your project
- use these commands in terminal:
cd backend
pnpm build - ("build": "rimraf ./dist && tsc --build ./tsconfig.json",)
cd..
pnpm dev – ("dev": "concurrently \"pnpm --filter ./backend dev\" \"pnpm --filter ./webapp dev\"")

Now after “pnpm dev” you will see in terminal http://localhost:5173 just open it copy/paste it in your browser or ctrl + left mouse cliсk.
5. API Overview:

Base URL: /api
-	Auth;
-	POST /auth/signup → create account;
-	POST /auth/login → login with email/nickname;
-	GET /auth/me → get current user;
-	POST /auth/password/reset/request → send reset code;
-	POST /auth/password/reset/confirm → reset password;
-	POST /auth/google → Google OAuth login;

Games:
-	GET /games/search?q=... → search by keyword;
-	GET /games/:id → game details;
-	POST /games/sync/:rawgId → fetch & cache from RAWG;

Wishlist:
-	GET /wishlist → list user’s liked games;
-	POST /wishlist/:gameId → add to wishlist;
-	DELETE /wishlist/:gameId → remove;
-	
Frontend Pages:
-	Main Page → search, filter, sort games;
-	Game Details → info from RAWG API + wishlist button;
-	Wishlist Page → user’s saved games;
-	Login / Sign Up → authentication;
-	Account Settings → update profile, change password/email/nickname;

Security:
-	Passwords hashed with bcrypt;
-	JWT-based authentication;
-	Google OAuth support;
-	Secure password reset codes (code_hash, expires_at, used_at);

