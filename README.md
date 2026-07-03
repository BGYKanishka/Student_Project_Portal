# UOK Connect

🔗 **[Live Demo / Deployed App](https://student-project-portal-mu6m.vercel.app/)**

> An academic project serving as a student portfolio showcase portal for the University of Kelaniya.

**UOK Connect** bridges the gap between students and the industry. It allows students to publish their academic and personal projects, while recruiters can easily discover emerging tech talent. 

## 🚀 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS v4, Zustand (State Management)
  - *Libraries:* React Hook Form + Zod (Form Validation), Framer Motion (Animations), Axios, React Router v7
- **Backend**: Node.js, Express 5, Passport.js (Google OAuth 2.0)
  - *Libraries:* Helmet & express-rate-limit (Security), express-validator, JWT & bcryptjs (Auth), cookie-parser
- **Database**: PostgreSQL (hosted on Neon), `connect-pg-simple` (Session Store)
- **File Storage**: Cloudinary (Image CDN), Multer (In-memory uploads)
- **Deployment**: Vercel (Frontend & Backend)

## ✨ Key Features & Engineering Decisions

- **Role-Based Access Control**: Tailored workflows and UI/UX for Students, Recruiters, and Admins.
- **Secure Authentication**: Implemented Single Sign-On (SSO) using Google OAuth 2.0 with session tokens stored in secure, `HTTP-only` cookies to prevent XSS attacks.
- **Optimized Image Processing**: Utilized Multer for in-memory uploads, streaming buffers directly to Cloudinary without writing to the local disk, improving performance and deployment compatibility.
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
        AuthMiddleware[Passport.js / Auth Middleware]
        UploadMiddleware[Multer Memory Storage]
        Controllers[API Controllers]
        EventEmitter[Node EventEmitter]
        
        Router --> AuthMiddleware
        Router --> UploadMiddleware
        Router --> Controllers
        Controllers -.->|Emits async events| EventEmitter
    end

    %% External Services
    subgraph External [External Services]
        Google[Google OAuth 2.0 API]
        Cloudinary[Cloudinary Storage / CDN]
    end

    %% Database Layer
    subgraph DB [Database Layer]
        Postgres[(PostgreSQL)]
        SessionStore[(connect-pg-simple Session Store)]
    end

    %% Connections across layers
    Axios <-->|REST API JSON \n HTTP/Cookies| Router
    
    AuthMiddleware <-->|OAuth Flow| Google
    AuthMiddleware <-->|Manage Sessions| SessionStore
    AuthMiddleware <-->|Verify/Create Users| Postgres

    UploadMiddleware -->|Passes req.file.buffer| Controllers
    Controllers -->|Pipes Image Buffer| Cloudinary
    Cloudinary -.->|Returns Secure Image URL| Controllers

    Controllers <-->|CRUD Operations| Postgres
    EventEmitter -->|Async writes notifications| Postgres
    
    %% Force External Services to be on the same level as Database Layer
    EventEmitter ~~~ Google
    EventEmitter ~~~ Cloudinary
    
    %% Styling
    classDef frontend fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px,color:#000000;
    classDef backend fill:#e8f5e9,stroke:#4caf50,stroke-width:2px,color:#000000;
    classDef database fill:#fff3e0,stroke:#ff9800,stroke-width:2px,color:#000000;
    classDef external fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px,color:#000000;
    
    class ClientApp,StateStore,Axios frontend;
    class Router,AuthMiddleware,UploadMiddleware,Controllers,EventEmitter backend;
    class Postgres,SessionStore database;
    class Google,Cloudinary external;
```

## 💻 Local Setup

### 1. Environment Configuration
Create `.env` files in both the `client/` and `server/` directories using the provided templates.
- **Server (`server/.env`)**: Requires your Neon PostgreSQL URL, Google OAuth credentials, and Cloudinary API keys.
- **Client (`client/.env`)**: Set `VITE_API_URL=http://localhost:5001`.

### 2. Start the Application

**Run the Backend (Port 5001):**
```bash
cd server
npm install
npm run db:setup  # Initializes the Neon PostgreSQL tables
npm run dev
```

**Run the Frontend (Port 5173):**
```bash
cd client
npm install
npm run dev
```