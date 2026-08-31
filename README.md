# UOK Connect

🔗 **[Live Demo / Deployed App](https://student-project-portal-mu6m.vercel.app/)**

> An academic project serving as a student portfolio showcase portal for the University of Kelaniya.

**UOK Connect** bridges the gap between students and the industry. It allows students to publish their academic and personal projects, while recruiters can easily discover emerging tech talent. 

## 🚀 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS v4, Zustand (State Management)
  - *Libraries:* React Hook Form + Zod (Form Validation), Framer Motion (Animations), Axios, React Router v7
- **Backend**: Node.js, Express 5, `openid-client` (OIDC — Asgardeo)
  - *Libraries:* Helmet & express-rate-limit (Security), express-validator, `jose` (IdP access-token verification), `file-type` (upload content sniffing), cookie-parser
- **Database**: PostgreSQL (hosted on Neon), `connect-pg-simple` (short-lived OIDC-flow session store)
- **File Storage**: Cloudinary (Image CDN), Multer (In-memory uploads)
- **Deployment**: Vercel (Frontend & Backend)
- **Identity Provider**: [Asgardeo](https://asgardeo.io) (WSO2) — OIDC Authorization Code flow with PKCE

## ✨ Key Features & Engineering Decisions

- **Role-Based Access Control**: Tailored workflows and UI/UX for Students, Recruiters, and Admins.
- **OIDC Authentication via Asgardeo**: Login/logout use the real OIDC Authorization Code + PKCE flow against Asgardeo. The app never re-issues its own session token — every authenticated request is verified by checking the Asgardeo-issued access token's signature against Asgardeo's published JWKS (`server/src/middleware/auth.js`), so access control is anchored to the IdP's token, not a locally minted one. Tokens are stored in secure, `HTTP-only` cookies. Logout is RP-initiated (redirects through Asgardeo's `end_session_endpoint` so its own session is cleared too).
- **CSRF protection for a cross-origin SPA**: Since the client and API are deployed on different origins, a classic cookie-read double-submit CSRF token doesn't work (client JS can't read a cookie set on the server's origin). Instead, a stateless HMAC of the caller's own access token is handed to the client via the JSON body of `/auth/me`/`/auth/refresh` (readable only by the app's own origin, thanks to CORS) and echoed back as an `X-CSRF-Token` header on mutating requests (`server/src/middleware/csrf.js`).
- **Optimized Image Processing**: Utilized Multer for in-memory uploads (magic-byte-sniffed via `file-type` before ever reaching Cloudinary), streaming buffers directly to Cloudinary without writing to local disk.
- **Asynchronous Event Architecture**: Decoupled core request logic from side-effects (like generating notifications) using Node's native `EventEmitter`, ensuring fast API response times.

## 🏗 System Architecture

```mermaid
graph TD
    %% User Interaction
    User((User / Browser)) -->|Interacts| ClientApp

    %% Frontend Layer
    subgraph Frontend [Client - React / Vite]
        ClientApp[React Components / Pages]
        StateStore[Zustand State Management]
        Axios[Axios API Client]
        ClientApp <--> StateStore
        ClientApp <--> Axios
    end

    %% Backend Layer
    subgraph Backend [Server - Node.js / Express]
        Router(Express Router)
        AuthMiddleware[JWKS-verified Access-Token Middleware]
        CsrfMiddleware[CSRF Middleware]
        UploadMiddleware[Multer Memory Storage + Magic-Byte Check]
        Controllers[API Controllers]
        EventEmitter[Node EventEmitter]

        Router --> CsrfMiddleware
        CsrfMiddleware --> AuthMiddleware
        Router --> UploadMiddleware
        Router --> Controllers
        Controllers -.->|Emits async events| EventEmitter
    end

    %% External Services
    subgraph External [External Services]
        Asgardeo[Asgardeo OIDC IdP]
        Cloudinary[Cloudinary Storage / CDN]
    end

    %% Database Layer
    subgraph DB [Database Layer]
        Postgres[(PostgreSQL)]
        SessionStore[(connect-pg-simple — short-lived OIDC-flow state)]
    end

    %% Connections across layers
    Axios <-->|REST API JSON \n HTTP/Cookies| Router
    
    AuthMiddleware <-->|Authorization Code + PKCE, JWKS verification| Asgardeo
    AuthMiddleware <-->|OIDC-flow state (10 min)| SessionStore
    AuthMiddleware <-->|Look up role/profile by oidc_sub| Postgres

    UploadMiddleware -->|Passes req.file.buffer| Controllers
    Controllers -->|Pipes Image Buffer| Cloudinary
    Cloudinary -.->|Returns Secure Image URL| Controllers

    Controllers <-->|CRUD Operations| Postgres
    EventEmitter -->|Async writes notifications| Postgres
    
    %% Force External Services to be on the same level as Database Layer
    EventEmitter ~~~ Asgardeo
    EventEmitter ~~~ Cloudinary
    
    %% Styling
    classDef frontend fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px,color:#000000;
    classDef backend fill:#e8f5e9,stroke:#4caf50,stroke-width:2px,color:#000000;
    classDef database fill:#fff3e0,stroke:#ff9800,stroke-width:2px,color:#000000;
    classDef external fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px,color:#000000;
    
    class ClientApp,StateStore,Axios frontend;
    class Router,AuthMiddleware,CsrfMiddleware,UploadMiddleware,Controllers,EventEmitter backend;
    class Postgres,SessionStore database;
    class Asgardeo,Cloudinary external;
```

## 🔐 Asgardeo Setup (required before login will work)

Authentication is real OIDC against [Asgardeo](https://asgardeo.io) — this must be configured manually in the Asgardeo console (it cannot be automated from this repo):

1. Create a free Asgardeo organization (if you don't have one), then create a **Standard-Based Application → OpenID Connect**.
2. Under **Protocol**, set the **Authorized redirect URL** to `http://localhost:5001/api/auth/callback` (and your production API's `/api/auth/callback` when you deploy), and the **Allowed post-logout redirect URL** to `http://localhost:5173/` (and your production client origin).
3. Enable the **Authorization Code** grant type with **PKCE mandatory** (no client secret exposed to the browser).
4. Under **User Attributes**, enable `email`, `profile` (name, picture), and `preferred_username` — the app uses `preferred_username` for the displayed **Username** field if released; otherwise it derives one from the email address.
5. Under **Protocol → Access Token**, set the **token type to JWT** (not opaque). This is required — the backend verifies the access token's signature directly against Asgardeo's JWKS on every request (`server/src/middleware/auth.js`), which only works for JWT-typed access tokens.
6. *(Optional)* To offer "Sign in with Google" on Asgardeo's hosted login page, go to **Connections** in the Asgardeo console, add Google as a federated IdP, and attach it to this application's login flow. No Google-specific code exists in this repo — it's entirely an Asgardeo-side configuration.
7. Copy the application's **Client ID**, **Client Secret**, and your org's issuer URL (`https://api.asgardeo.io/t/<your-org>/oauth2/token`) into `server/.env` (see `server/.env.example`).

## 💻 Local Setup

### 1. Environment Configuration
Create `.env` files in both the `client/` and `server/` directories using the provided templates (`server/.env.example`, `client/.env.example`).
- **Server (`server/.env`)**: Requires your PostgreSQL connection details, the Asgardeo values from the setup above, and Cloudinary API keys.
- **Client (`client/.env`)**: Set `VITE_API_URL=http://localhost:5001/api`.

### 2. Database

Two equivalent ways to create the schema:
- **Node script** (drops and recreates everything): `npm run db:setup` from `server/`.
- **Plain SQL** (no Node required — this is the submission's "database creation script"): `psql "<connection string>" -f server/scripts/db/schema.sql`.

For an existing (pre-OIDC) database you want to preserve data on instead of resetting, run `npm run db:migrate:oidc` instead — it's an additive/idempotent `ALTER TABLE` migration (see `server/scripts/migrate_oidc.js`).

Seed the first admin account (pre-provisions a `role='admin'` row with no `oidc_sub` yet — it gets linked automatically the first time that email signs in via the admin portal):
```bash
node scripts/create_admin.js admin@example.com "Admin Name"
```

### 3. Start the Application

**Run the Backend (Port 5000):**
```bash
cd server
npm install
npm run dev
```

**Run the Frontend (Port 5173):**
```bash
cd client
npm install
npm run dev
```

### 4. Local HTTPS (optional)

By default both dev servers run over plain HTTP for convenience. To run them over HTTPS locally instead:

1. Generate a self-signed cert (from the repo root):
   ```bash
   mkdir certs
   openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 825 -nodes -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
   ```
2. *(Optional but recommended — avoids a browser security warning)* Trust it locally. On Windows, in an **elevated** PowerShell:
   ```powershell
   certutil -addstore -f "ROOT" "certs\cert.pem"
   ```
   On macOS: `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain certs/cert.pem`. Without this step, Chrome/Edge will show a one-time "connection is not private" warning per origin — click "Advanced → Proceed" to continue.
3. In `server/.env`, set:
   ```
   HTTPS_CERT_PATH=../certs/cert.pem
   HTTPS_KEY_PATH=../certs/key.pem
   ```
4. In `client/.env`, set `VITE_HTTPS=true`.
5. Update `server/.env`'s `OIDC_REDIRECT_URI`, `OIDC_POST_LOGOUT_REDIRECT_URI`, and `CLIENT_URL` to use `https://` instead of `http://`, and update `client/.env`'s `VITE_API_URL` the same way.
6. **Add the new `https://` URLs to your Asgardeo application's Protocol settings** (Authorized redirect URLs and Allowed post logout redirect URLs) alongside the `http://` ones — Asgardeo matches these exactly, so both schemes need to be registered if you want to keep testing over HTTP too.
7. Restart both dev servers.

The production deployment (Vercel) already serves over HTTPS automatically — this section is only for local development.