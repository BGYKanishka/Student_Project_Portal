# UOK Connect

🔗 **[Live Demo / Deployed App](https://student-project-portal-mu6m.vercel.app/)**

> An academic project serving as a student portfolio showcase portal for the University of Kelaniya, enhanced with strict information security measures.

**UOK Connect** bridges the gap between students and the industry. It allows students to publish their academic and personal projects, while recruiters can easily discover emerging tech talent. 

## 🚀 Tech Stack & Security

- **Frontend**: React 18, Vite, Tailwind CSS v4, Zustand (State Management)
  - *Auth:* `@asgardeo/auth-react` (OIDC)
  - *Libraries:* React Hook Form + Zod (Form Validation), Framer Motion, Axios, React Router v7
- **Backend**: Node.js, Express 5
  - *Auth:* `express-jwt` + `jwks-rsa` (JWKS-based token validation)
  - *Security:* Helmet (CSP headers), `express-rate-limit`, parameterized queries (SQLi prevention)
- **Database**: PostgreSQL (hosted on Neon)
- **File Storage**: Cloudinary (Image CDN), Multer (In-memory uploads)
- **Deployment**: Vercel (Frontend & Backend)

## 🔐 Security & Access Control (Information Security Assessment)

This application has been hardened to mitigate the **OWASP Top 10** vulnerabilities:

- **Authentication (OIDC):** Uses **Asgardeo** as the cloud Identity Provider (IdP). Authentication relies entirely on IdP-issued access tokens.
- **Zero Self-Minted Tokens:** The backend validates tokens using Asgardeo's JWKS endpoint (asymmetric RS256 cryptography). No `JWT_SECRET` exists in the codebase.
- **Role & Ownership Access Control:** A strict `requireRole` middleware is used alongside ownership validation (`user_id === req.user.id`) to prevent horizontal and vertical privilege escalation.
- **CSRF Resistance:** Uses `Authorization: Bearer <token>` headers instead of cookies.
- **Secure Configuration:** 
  - All secrets are managed via `.env` (excluded from git). 
  - Local development enforces **HTTPS** via locally-trusted certificates (`mkcert`).
  - Strict **Content Security Policy (CSP)** headers are enforced via Helmet.

## 🏗 System Architecture

```mermaid
graph TD
    %% User Interaction
    User((User / Browser)) -->|Interacts| ClientApp

    %% Frontend Layer
    subgraph Frontend [Client - React / Vite]
        ClientApp[React Components / Pages]
        ZustandStore[Zustand State Management]
        AuthSDK[Asgardeo Auth SDK]
        Axios[Axios API Client]
        
        ClientApp <--> ZustandStore
        ClientApp <--> AuthSDK
        ClientApp <--> Axios
    end

    %% Backend Layer
    subgraph Backend [Server - Node.js / Express]
        SecurityMiddleware[Helmet & Rate Limit]
        Router(Express Router)
        JWKSMiddleware[JWKS Token Validation]
        UploadMiddleware[Multer Memory Storage]
        ValidationMiddleware[Magic Bytes & Express Validator]
        Controllers[API Controllers]
        EventEmitter[Node EventEmitter]
        
        SecurityMiddleware --> Router
        Router --> JWKSMiddleware
        Router --> UploadMiddleware
        Router --> ValidationMiddleware
        
        JWKSMiddleware --> Controllers
        UploadMiddleware --> ValidationMiddleware
        ValidationMiddleware --> Controllers
        
        Controllers -.->|Emits async events| EventEmitter
    end

    %% External Services
    subgraph External [External Services]
        Asgardeo[Asgardeo OIDC / IdP]
        Cloudinary[Cloudinary Storage / CDN]
    end

    %% Database Layer
    subgraph DB [Database Layer]
        Postgres[(PostgreSQL)]
    end

    %% Connections across layers
    AuthSDK <-->|Auth Code Flow / PKCE| Asgardeo
    Axios <-->|REST API + Bearer Token \n HTTPS| SecurityMiddleware
    JWKSMiddleware -->|Fetch Public Keys| Asgardeo
    
    ValidationMiddleware -->|Passes validated req| Controllers
    Controllers -->|Pipes Image Buffer| Cloudinary
    Cloudinary -.->|Returns Secure Image URL| Controllers

    Controllers <-->|CRUD Operations / Parameterized Queries| Postgres
    EventEmitter -->|Async writes notifications| Postgres
    
    %% Styling
    classDef frontend fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px,color:#000000;
    classDef backend fill:#e8f5e9,stroke:#4caf50,stroke-width:2px,color:#000000;
    classDef database fill:#fff3e0,stroke:#ff9800,stroke-width:2px,color:#000000;
    classDef external fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px,color:#000000;
    
    class ClientApp,ZustandStore,AuthSDK,Axios frontend;
    class SecurityMiddleware,Router,JWKSMiddleware,UploadMiddleware,ValidationMiddleware,Controllers,EventEmitter backend;
    class Postgres database;
    class Asgardeo,Cloudinary external;
```

## 💻 Local Setup (HTTPS Required)

To meet security requirements, the local development server runs over HTTPS.

### 1. Generate SSL Certificates
Install `mkcert` and generate local certificates in the root directory:
```bash
# MacOS (Homebrew)
brew install mkcert
mkcert -install

# Generate certs inside a certs/ folder
mkdir certs && cd certs
mkcert localhost 127.0.0.1 ::1
cd ..
```

### 2. Environment Configuration
Create `.env` files in both the `client/` and `server/` directories using the provided templates (`.env.example`).
**Note:** Ensure you do not commit real credentials.
- **Server (`server/.env`)**: Requires your PostgreSQL URL, Asgardeo Base URL/Client ID, and Cloudinary keys. Set `CLIENT_URL=https://localhost:5173`.
- **Client (`client/.env`)**: Set `VITE_ASGARDEO_CLIENT_ID` and `VITE_ASGARDEO_BASE_URL`.

### 3. Database Initialization
A database creation script is included to set up all tables automatically.

**Run the Backend (Port 5001):**
```bash
cd server
npm install
npm run db:setup  # Creates tables in your PostgreSQL database
npm run dev
```

**Run the Frontend (Port 5173):**
```bash
cd client
npm install
npm run dev
```