# Gaming Library & Progress Tracker - Project Planning Document

## Project Overview

**Project Name:** Unified Gaming Library & Progress Tracker  
**Purpose:** Portfolio project demonstrating C# API development, OAuth integration, and full-stack skills  
**Developer Skill Level:** Intermediate C#, limited API experience, intermediate SQL, beginner security/authentication

---

## Project Request

### Core Requirements
* C# backend API (RESTful or minimal API)
* Single Sign-On (SSO) integration with multiple gaming platforms
* Unified dashboard to view games across all platforms
* Progress tracking and personal journaling features

### Areas Needing Assistance
1. Architecture design - recommend patterns, project structure, and tech stack
2. OAuth/SSO implementation strategies for each platform
3. Database schema design for storing game data, progress, and currently authenticated user information
4. Step-by-step development guidance
5. Best practices for API security and data handling

### Constraints/Preferences
* Preferred database: SQL Server (MSSQL)
* Frontend framework: React
* Deployment: Docker with ability to host page on GitHub
* Expected outcome: Working MVP for portfolio with clean code and proper documentation

---

## Recommended Tech Stack

### Backend
- **ASP.NET Core 10** Web API (Controller-based for better organization)
- **Entity Framework Core 10** (ORM for MSSQL)
- **ASP.NET Core Identity** with OAuth
- **AutoMapper** (entity/DTO mapping - to be added later)
- **Serilog** (structured logging - to be added later)

### Frontend
- **React 18+** with TypeScript
- **React Router** for navigation
- **Tanstack Query (React Query)** for API state management
- **Tailwind CSS** for styling
- **Zustand or Context API** for global state

### Database
- **SQL Server (MSSQL)**

### Infrastructure
- **Docker & Docker Compose**
- **GitHub Actions** for CI/CD
- **GitHub Pages** for frontend (static hosting)
- **Azure Container Apps or Railway** for backend (free tier options)

---

## High-Level Architecture

```
┌─────────────────┐
│   React SPA     │
│  (GitHub Pages) │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│   C# Web API    │
│   (Docker)      │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
┌────────┐ ┌──────┐ ┌────────┐ ┌──────┐
│ Steam  │ │ Xbox │ │Epic    │ │ PSN  │
│  API   │ │ API  │ │Games   │ │ API  │
└────────┘ └──────┘ └────────┘ └──────┘
         │
         ▼
┌─────────────────┐
│   SQL Server    │
│   (Docker)      │
└─────────────────┘
```

---

## Project Structure

```
gaming-library-tracker/
├── src/
│   ├── GamingLibrary.API/
│   │   ├── Controllers/
│   │   ├── Program.cs
│   │   ├── appsettings.json
│   │   └── Dockerfile
│   ├── GamingLibrary.Core/
│   │   ├── Entities/
│   │   ├── Interfaces/
│   │   ├── DTOs/
│   │   └── Exceptions/
│   ├── GamingLibrary.Infrastructure/
│   │   ├── Data/
│   │   │   ├── ApplicationDbContext.cs
│   │   │   └── Migrations/
│   │   ├── Repositories/
│   │   └── Services/
│   │       ├── SteamService.cs
│   │       ├── XboxService.cs
│   │       └── GameSyncService.cs
│   └── GamingLibrary.Tests/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   ├── public/
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

**Architecture Pattern:** Clean Architecture (separation of concerns)
- **API Layer:** Controllers, middleware, configuration
- **Core Layer:** Business entities, interfaces, DTOs
- **Infrastructure Layer:** Data access, external service integrations
- **Tests Layer:** Unit and integration tests

---

## Database Schema Design

### Complete SQL Schema

```sql
-- Users and Authentication
CREATE TABLE Users (
    UserId INT PRIMARY KEY IDENTITY(1,1),
    Username NVARCHAR(100) NOT NULL UNIQUE,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Platform Connections (SSO tokens)
CREATE TABLE PlatformConnections (
    ConnectionId INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    Platform NVARCHAR(50) NOT NULL, -- 'Steam', 'Xbox', 'Epic', 'PSN'
    PlatformUserId NVARCHAR(255) NOT NULL,
    AccessToken NVARCHAR(MAX) NULL, -- Encrypted
    RefreshToken NVARCHAR(MAX) NULL, -- Encrypted
    TokenExpiresAt DATETIME2 NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    ConnectedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    LastSyncedAt DATETIME2 NULL,
    CONSTRAINT FK_PlatformConnections_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
    CONSTRAINT UQ_UserPlatform UNIQUE (UserId, Platform)
);

-- Games Master List (platform-agnostic)
CREATE TABLE Games (
    GameId INT PRIMARY KEY IDENTITY(1,1),
    Title NVARCHAR(255) NOT NULL,
    NormalizedTitle NVARCHAR(255) NOT NULL, -- For matching across platforms
    Description NVARCHAR(MAX) NULL,
    CoverImageUrl NVARCHAR(500) NULL,
    ReleaseDate DATE NULL,
    Developer NVARCHAR(255) NULL,
    Publisher NVARCHAR(255) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE INDEX IX_Games_NormalizedTitle ON Games(NormalizedTitle);

-- User's game library (links users to games from various platforms)
CREATE TABLE UserGames (
    UserGameId INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    GameId INT NOT NULL,
    Platform NVARCHAR(50) NOT NULL,
    PlatformGameId NVARCHAR(255) NOT NULL, -- Original ID from platform
    PurchaseDate DATETIME2 NULL,
    LastPlayedAt DATETIME2 NULL,
    PlaytimeMinutes INT NULL DEFAULT 0,
    Status NVARCHAR(50) NULL, -- 'Not Started', 'In Progress', 'Completed', 'Abandoned'
    AddedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_UserGames_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
    CONSTRAINT FK_UserGames_Games FOREIGN KEY (GameId) REFERENCES Games(GameId),
    CONSTRAINT UQ_UserPlatformGame UNIQUE (UserId, Platform, PlatformGameId)
);

-- Progress tracking and achievements
CREATE TABLE GameProgress (
    ProgressId INT PRIMARY KEY IDENTITY(1,1),
    UserGameId INT NOT NULL,
    AchievementName NVARCHAR(255) NULL,
    ProgressPercentage DECIMAL(5,2) NULL,
    IsCompleted BIT NOT NULL DEFAULT 0,
    CompletedAt DATETIME2 NULL,
    SyncedFromPlatform BIT NOT NULL DEFAULT 0,
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_GameProgress_UserGames FOREIGN KEY (UserGameId) REFERENCES UserGames(UserGameId) ON DELETE CASCADE
);

-- Personal journal entries
CREATE TABLE JournalEntries (
    EntryId INT PRIMARY KEY IDENTITY(1,1),
    UserGameId INT NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    Rating INT NULL CHECK (Rating >= 1 AND Rating <= 10),
    SessionDurationMinutes INT NULL,
    Tags NVARCHAR(500) NULL, -- Comma-separated or JSON array
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_JournalEntries_UserGames FOREIGN KEY (UserGameId) REFERENCES UserGames(UserGameId) ON DELETE CASCADE
);

-- Sync history for debugging
CREATE TABLE SyncHistory (
    SyncId INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    Platform NVARCHAR(50) NOT NULL,
    SyncStatus NVARCHAR(50) NOT NULL, -- 'Success', 'Failed', 'Partial'
    GamesAdded INT NOT NULL DEFAULT 0,
    GamesUpdated INT NOT NULL DEFAULT 0,
    ErrorMessage NVARCHAR(MAX) NULL,
    StartedAt DATETIME2 NOT NULL,
    CompletedAt DATETIME2 NULL,
    CONSTRAINT FK_SyncHistory_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);
```

### Schema Design Principles
- **Normalization:** Separate concerns (users, games, connections, progress)
- **Platform Flexibility:** Generic design allows easy addition of new platforms
- **Game Matching:** NormalizedTitle field helps match same game across platforms
- **Audit Trail:** CreatedAt/UpdatedAt timestamps, SyncHistory for debugging
- **Security:** Tokens stored encrypted, foreign key constraints for data integrity

---

## OAuth/SSO Implementation Strategy

### Platform-Specific Approaches

#### 1. Steam (OpenID/OAuth)
- Use Steam Web API
- Requires API key (free from https://steamcommunity.com/dev/apikey)
- OAuth 2.0 flow via Steam Login
- **Limitation:** Limited data access (public profiles only unless user shares API key)
- **Endpoints:**
  - Authentication: `https://steamcommunity.com/openid/login`
  - API: `https://api.steampowered.com/`

#### 2. Xbox/Microsoft
- Microsoft Identity Platform (Azure AD)
- OAuth 2.0 with PKCE (Proof Key for Code Exchange)
- Requires app registration in Azure Portal
- Access to Xbox Live API
- **Good documentation and official support**

#### 3. Epic Games
- Epic Online Services (EOS) SDK
- OAuth 2.0 client credentials flow
- Requires Epic Games developer account
- **Moderate complexity**

#### 4. PlayStation Network (PSN)
- **NO OFFICIAL PUBLIC API** (major limitation)
- Alternatives:
  - Manual game entry by user
  - Third-party unofficial APIs (not recommended for production)
  - Wait for official API release

### Recommended OAuth Flow (Authorization Code with PKCE)

```
1. User clicks "Connect Steam" in frontend
2. Frontend redirects to backend OAuth initiation endpoint
3. Backend generates state + PKCE challenge
4. Backend redirects user to Platform OAuth page
5. User authorizes on platform
6. Platform redirects to backend callback URL with code
7. Backend exchanges code for access/refresh tokens
8. Backend stores encrypted tokens in PlatformConnections table
9. Backend triggers initial game library sync
10. Backend returns success to frontend
11. Frontend displays connected platforms
```

### OAuth Implementation Code Flow

**Simplified sequence:**
```
User → Frontend → Backend → Platform OAuth
                    ↓
                 Callback
                    ↓
            Store tokens (encrypted)
                    ↓
            Sync game library
```

---

## Development Roadmap

### Phase 1: Foundation (Week 1-2) - COMPLETE ✅
**Goal:** Set up project infrastructure and basic authentication

**Decisions Made:**
- ✅ IDE: Visual Studio
- ✅ API Style: Controller-based (better organization and testability)
- ✅ Framework: .NET 10
- ✅ Database: SQL Server via Docker

**Tasks:**
1. ✅ **Set up solution structure (Clean Architecture)**
   - Created `GamingLibrary.API` project (ASP.NET Core Web API, .NET 10, Controllers)
   - Created `GamingLibrary.Core` project (Class Library, .NET 10)
   - Created `GamingLibrary.Infrastructure` project (Class Library, .NET 10)
   - Set up project references (API → Core + Infrastructure, Infrastructure → Core)

2. ✅ **Configure Entity Framework Core with MSSQL**
   - Installed NuGet packages:
     - Infrastructure: `Microsoft.EntityFrameworkCore` (10.x), `Microsoft.EntityFrameworkCore.SqlServer` (10.x), `Microsoft.EntityFrameworkCore.Tools` (10.x)
     - API: `Microsoft.EntityFrameworkCore.Design` (10.x), `Microsoft.AspNetCore.Authentication.JwtBearer` (10.x)
   - Created `User` entity in Core/Entities
   - Created `ApplicationDbContext` in Infrastructure/Data with User configuration
   - Registered DbContext in Program.cs

3. ✅ **Set up SQL Server in Docker**
   - Started SQL Server 2022 container: `docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong@Passw0rd" -p 1433:1433 --name sqlserver-gaming-library -d mcr.microsoft.com/mssql/server:2022-latest`
   - Configured connection string in appsettings.json
   - Created initial migration: `Add-Migration InitialCreate`
   - Applied migration: `Update-Database`
   - Database "GamingLibrary" created with Users table

4. ✅ **Implement basic authentication (JWT-based)**
   - ✅ User registration endpoint
   - ✅ User login endpoint
   - ✅ JWT token generation/validation
   - ✅ Password hashing (BCrypt with salt)
   - ✅ Protected endpoint testing
   - ✅ Swagger/OpenAPI JWT configuration for .NET 10

5. ✅ **Create user registration/login endpoints**
   - ✅ AuthController with Register and Login actions
   - ✅ Input validation and error handling
   - ✅ Proper HTTP status codes (200, 400, 401)
   - ✅ Security logging

6. ✅ **Set up Docker Compose (API + MSSQL)**
   - ✅ Multi-stage Dockerfile for API
   - ✅ docker-compose.yml with SQL Server and API
   - ✅ Volume persistence for database
   - ✅ Health checks for service dependencies
   - ✅ Auto-migration on startup
   - ✅ Environment-specific configuration

**Completed Deliverables:**
- ✅ Solution structure with Clean Architecture
- ✅ Entity Framework Core configured
- ✅ SQL Server running in Docker
- ✅ Database created with Users table
- ✅ First migration applied successfully
- ✅ JWT authentication fully implemented
- ✅ Registration and Login endpoints working
- ✅ Password hashing with BCrypt
- ✅ Protected endpoints with [Authorize] attribute
- ✅ Swagger UI JWT configuration complete
- ✅ Fully containerized application with Docker Compose
- ✅ Database auto-migration on startup

**Phase 1 Complete! Ready for Phase 2: Platform Integration**

---

### Phase 2: Platform Integration (Week 3-4) - IN PROGRESS 🔄
**Goal:** Integrate Steam gaming platform and game metadata

**Decisions Made:**
- ✅ Steam Integration: Steam OpenID + Web API Key (public profiles)
- ✅ Game Metadata: IGDB API (via Twitch OAuth) for developer, publisher, description
- ✅ Architecture: IPlatformService interface for future platform extensibility
- ✅ Sync Strategy: Batch lookups + bulk inserts (N+1 query optimization)
- ✅ Journal entries included in Phase 2 schema (added early for completeness)

**Tasks:**
1. ✅ **Database Schema Expansion**
   - Created PlatformConnection entity
   - Created Game entity (platform-agnostic master list)
   - Created UserGame entity (links users to games per platform)
   - Created JournalEntry entity (per-game notes, ratings, session tracking)
   - Updated User entity with navigation properties
   - Updated ApplicationDbContext with new DbSets and configurations
   - Applied migration: `AddPlatformGameAndJournalEntities`

2. ✅ **Steam API Integration**
   - Created Steam DTOs with `[JsonPropertyName]` attributes for snake_case mapping
   - Created `IPlatformService` interface
   - Implemented `SteamService`
   - Fixed cover image: Uses `https://cdn.cloudflare.steamstatic.com/steam/apps/{appId}/header.jpg`
   - Registered `HttpClient` and `SteamService` in Program.cs

3. ✅ **IGDB Game Metadata Integration**
   - Created Twitch developer account and registered application
   - Created IGDB DTOs (IgdbGameDto, IgdbCoverDto, IgdbInvolvedCompanyDto, etc.)
   - Created `IGameMetadataService` interface
   - Implemented `IgdbService` with Twitch OAuth token management
   - Token caching (fetches new token only when expired)
   - Registered as Singleton to preserve token cache across requests

4. ✅ **Sync Performance Optimization (N+1 Fix)**
   - Batch lookup of existing games before loop (2 queries total vs N*2)
   - In-memory dictionary lookups (O(1)) instead of per-game DB queries
   - Bulk inserts with `AddRangeAsync`
   - Batched `SaveChangesAsync` at end of sync
   - IGDB only called for new games or games missing all metadata

5. ✅ **IGDB Rate Limiting & Search Improvements**
   - Added `SemaphoreSlim` to enforce ~4 requests/second
   - Minimum 275ms interval between requests
   - Multi-strategy search fallback:
     - Strategy 1: Exact title search
     - Strategy 2: Cleaned title (removes ®, ™, edition markers)
     - Strategy 3: Base title only (before colon/dash)
   - Quote escaping in Apicalypse queries
   - Re-enrichment only when ALL metadata fields are missing

6. ✅ **Platform & Games Controllers**
   - `POST /api/platform/steam/connect` - Connect Steam account
   - `POST /api/platform/steam/sync` - Sync Steam library
   - `GET /api/platform/connections` - View connected platforms
   - `DELETE /api/platform/{platform}` - Disconnect platform
   - `GET /api/games/library` - View all games (with platform filter)
   - `GET /api/games/library/{id}` - View specific game with journal count
   - `GET /api/games/stats` - Gaming statistics

7. ⏳ **Journal Entry CRUD** - NEXT STEP
8. ⏳ **Background sync job** - Future enhancement

**Completed Deliverables:**
- ✅ Steam library sync working
- ✅ Game metadata from IGDB (developer, publisher, description, release date)
- ✅ Cover images from Steam CDN
- ✅ Platform connection management
- ✅ Unified games library endpoint
- ✅ Gaming statistics endpoint
- ✅ N+1 query optimization
- ✅ IGDB rate limiting and search fallback strategies

**Known Limitations:**
- Steam profile must be public for sync to work
- IGDB match rate varies by game title complexity
- Background sync not yet implemented (manual sync only)

**Next Steps:**
- Build Journal Entry CRUD endpoints
- Implement game status updates
- Begin Phase 3: Progress tracking features

---

### Phase 3: Core Features (Week 5-6)
**Goal:** Build progress tracking and journaling features

**Tasks:**
1. Progress tracking CRUD operations
   - POST /api/games/{id}/progress
   - GET /api/games/{id}/progress
   - PUT /api/progress/{id}
   - DELETE /api/progress/{id}
2. Journal entry system
   - POST /api/games/{id}/journal
   - GET /api/games/{id}/journal
   - PUT /api/journal/{id}
   - DELETE /api/journal/{id}
3. Game status management
   - Update game status (Not Started, In Progress, Completed, Abandoned)
4. Search and filtering
   - Search by title
   - Filter by platform, status
   - Sort by playtime, last played

**Deliverables:**
- Complete CRUD for progress and journal
- Search/filter functionality
- Status management

---

### Phase 4: Frontend (Week 7-8)
**Goal:** Build React frontend

**Tasks:**
1. React app scaffolding with TypeScript
   - Vite or Create React App setup
   - TypeScript configuration
   - Tailwind CSS setup
2. Authentication flow
   - Login/register forms
   - JWT token management
   - Protected routes
3. Platform connection UI
   - Connect/disconnect platforms
   - OAuth redirect handling
   - Connection status display
4. Game library dashboard
   - Game grid/list view
   - Platform filters
   - Search bar
5. Progress tracking interface
   - Progress bars/charts
   - Achievement lists
6. Journal component
   - Rich text editor
   - Entry list/timeline
   - Tags and ratings

**Deliverables:**
- Fully functional React app
- Responsive design
- Complete user flow

---

### Phase 5: Polish & Deployment (Week 9-10)
**Goal:** Production-ready application

**Tasks:**
1. Add comprehensive logging
   - Serilog configuration
   - Structured logging throughout
2. Write unit/integration tests
   - API endpoint tests
   - Service layer tests
   - 60%+ code coverage goal
3. API documentation (Swagger/OpenAPI)
   - XML comments
   - Example requests/responses
4. Docker optimization
   - Multi-stage builds
   - Image size reduction
5. Deploy to hosting platform
   - Backend to Azure/Railway
   - Database to cloud
6. GitHub Pages for frontend
   - Build optimization
   - CI/CD pipeline

**Deliverables:**
- Deployed application
- Complete documentation
- Test coverage
- Production monitoring

---

## Security Best Practices

### 1. Token Storage
- **Encrypt OAuth tokens in database**
  - Use ASP.NET Core Data Protection API
  - Never store plain text tokens
- **Never expose tokens to frontend**
  - Keep OAuth tokens server-side only
  - Frontend only gets JWT for API auth
- **Implement token refresh logic**
  - Automatic refresh before expiration
  - Handle refresh token rotation

### 2. API Security
- **Use JWT for authentication**
  - Short expiration (15-30 minutes)
  - Refresh token mechanism
- **Implement rate limiting**
  - Use AspNetCoreRateLimit package
  - Prevent brute force attacks
- **CORS configuration for frontend**
  - Whitelist specific origins
  - No wildcard in production
- **HTTPS only**
  - Redirect HTTP to HTTPS
  - HSTS headers
- **Input validation and sanitization**
  - FluentValidation for DTOs
  - Prevent SQL injection (use parameterized queries)
  - XSS prevention

### 3. Secrets Management
- **Development:**
  - Use User Secrets (dotnet user-secrets)
  - Never commit secrets to git
- **Docker:**
  - Environment variables
  - Docker secrets for sensitive data
- **Production:**
  - Azure Key Vault or AWS Secrets Manager
  - Managed identities where possible

### 4. Additional Security Measures
- **Password hashing:** Use BCrypt or ASP.NET Core Identity
- **SQL injection prevention:** Always use EF Core parameterized queries
- **CSRF protection:** For cookie-based auth (if applicable)
- **Content Security Policy:** Set appropriate headers
- **Logging:** Never log sensitive data (passwords, tokens)

---

## Critical Implementation Notes

### Platform API Limitations

#### Challenges:
1. **Steam API:**
   - ✅ Public and well-documented
   - ✅ Free API key
   - ❌ Limited data for private profiles
   - ❌ Rate limits (100,000 calls/day)

2. **Xbox API:**
   - ✅ Official Microsoft support
   - ✅ Good documentation
   - ❌ Requires Azure account
   - ❌ Setup can be complex for beginners

3. **Epic Games:**
   - ⚠️ Requires developer account approval
   - ⚠️ Moderate complexity
   - ✅ OAuth 2.0 standard flow

4. **PlayStation Network:**
   - ❌ **NO OFFICIAL PUBLIC API**
   - ❌ Unofficial APIs are unreliable
   - ❌ Violates ToS to scrape

### MVP Strategy (Recommended)

**Phase 1 MVP:**
- ✅ Start with **Steam only** (easiest, most accessible)
- ✅ Add **manual game entry** as fallback feature
- ✅ Build flexible architecture for future platforms

**Phase 2 Expansion:**
- ✅ Add **Xbox** as second platform (good documentation)
- ⚠️ Epic Games (if you get developer access)
- ❌ Skip PSN until official API available

**Architecture Flexibility:**
- Use interface-based design (`IPlatformService`)
- Each platform implements same contract
- Easy to add new platforms later
- Factory pattern for platform service creation

### Alternative Approaches for Unsupported Platforms

1. **Manual Entry:**
   - Allow users to manually add games
   - Still track progress and journal entries
   - Good UX for platforms without APIs

2. **Community Database:**
   - IGDB API (free tier available)
   - Provides game metadata
   - Users link their platform accounts manually

3. **Import from Export:**
   - Some platforms allow data export
   - User uploads CSV/JSON files
   - Parse and import into system

---

## Recommended Learning Resources

### C# & ASP.NET Core
- Microsoft Learn: ASP.NET Core documentation
- Clean Architecture by Jason Taylor (GitHub template)
- Pluralsight: ASP.NET Core path

### OAuth & Authentication
- OAuth 2.0 Simplified (book/website)
- Auth0 documentation (conceptual learning)
- Microsoft Identity Platform docs

### Entity Framework Core
- Microsoft EF Core documentation
- Julie Lerman's Pluralsight courses

### Docker
- Docker Getting Started tutorial
- Docker Compose documentation
- .NET Docker samples (Microsoft GitHub)

---

## Next Steps

### Immediate Actions:
1. **Set up development environment:**
   - Install .NET 8 SDK
   - Install SQL Server (or use Docker)
   - Install Visual Studio / VS Code
   - Install Docker Desktop

2. **Create Steam API account:**
   - Register for Steam API key
   - Review Steam Web API documentation
   - Test API calls with Postman

3. **Initialize project:**
   - Create GitHub repository
   - Set up solution structure
   - Initial commit

### Questions to Consider:
1. Do you want to start with minimal APIs or controller-based APIs?
2. Should we include real-time features (SignalR) for live sync updates?
3. Do you want mobile app support later (Blazor/MAUI)?
4. Should we add social features (sharing progress, friend comparisons)?

---

## Future Enhancements (Post-MVP)

### Potential Features:
- 📊 **Analytics Dashboard:** Play time trends, completion rates
- 🏆 **Achievement Tracking:** Cross-platform achievement viewer
- 👥 **Social Features:** Friend lists, compare libraries
- 📱 **Mobile App:** React Native or .NET MAUI
- 🎮 **Game Recommendations:** Based on library and preferences
- 💾 **Cloud Saves Integration:** Backup sync status
- 🔔 **Notifications:** New game releases, sale alerts
- 📈 **Stats & Insights:** Gaming habits, most played genres
- 🎯 **Backlog Manager:** Prioritize unplayed games
- 🌐 **Multi-language Support:** i18n for international users

---

## Success Metrics for Portfolio

### Technical Demonstration:
- ✅ Clean architecture implementation
- ✅ OAuth 2.0 integration
- ✅ RESTful API design
- ✅ Entity Framework Core usage
- ✅ Docker containerization
- ✅ React + TypeScript frontend
- ✅ Secure authentication/authorization
- ✅ Database design and optimization
- ✅ Background job processing
- ✅ API documentation

### Portfolio Presentation:
- Clear README with screenshots
- Architecture diagrams
- Live demo link
- Video walkthrough
- Code samples highlighting key features
- Test coverage report
- Performance metrics
- Lessons learned section

---

## Implementation Log

### Session 1: Project Setup & Database Configuration
**Date:** February 10, 2026  
**Goal:** Complete Phase 1 foundation setup

#### Steps Completed:

**1. Solution Structure Creation**
- Created new ASP.NET Core Web API project: `GamingLibrary.API` (.NET 10, Controller-based)
- Created Core class library: `GamingLibrary.Core` (.NET 10)
- Created Infrastructure class library: `GamingLibrary.Infrastructure` (.NET 10)
- Configured project references following Clean Architecture principles

**2. NuGet Package Installation**
Infrastructure project packages:
```
Microsoft.EntityFrameworkCore (10.x)
Microsoft.EntityFrameworkCore.SqlServer (10.x)
Microsoft.EntityFrameworkCore.Tools (10.x)
```

API project packages:
```
Microsoft.EntityFrameworkCore.Design (10.x)
Microsoft.AspNetCore.Authentication.JwtBearer (10.x)
```

**3. Entity Creation**
Created `User` entity in `GamingLibrary.Core/Entities/User.cs`:
- Properties: UserId, Username, Email, PasswordHash, CreatedAt, UpdatedAt
- Follows security best practice: storing password hash, not plain text

**4. DbContext Configuration**
Created `ApplicationDbContext` in `GamingLibrary.Infrastructure/Data/`:
- Configured User entity with constraints:
  - Required fields with max lengths
  - Unique indexes on Username and Email
  - Default timestamp values via SQL Server functions
- Registered DbContext in Program.cs with SQL Server provider

**5. SQL Server Setup (Docker)**
Started SQL Server 2022 container:
```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong@Passw0rd" \
  -p 1433:1433 --name sqlserver-gaming-library -d \
  mcr.microsoft.com/mssql/server:2022-latest
```

Connection string configured in appsettings.json:
```
Server=localhost,1433;Database=GamingLibrary;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=true;Encrypt=false;
```

**6. Database Migration**
- Created initial migration: `Add-Migration InitialCreate`
- Applied migration: `Update-Database`
- Result: `GamingLibrary` database created with `Users` table

#### Current State:
✅ Project structure established  
✅ Entity Framework configured  
✅ SQL Server running in Docker  
✅ Database schema applied  
✅ Ready for authentication implementation

#### Next Session Goals:
- Create DTOs for registration and login
- Implement AuthController
- Add password hashing service
- Configure JWT authentication
- Test endpoints with Swagger

---

### Session 2: Authentication Implementation
**Date:** February 10, 2026  
**Goal:** Build JWT-based authentication system

#### Steps Completed:

**1. Created DTOs (Data Transfer Objects)**
Added to `GamingLibrary.Core/DTOs/`:
- `RegisterRequest.cs` - Username, Email, Password
- `LoginRequest.cs` - Email, Password  
- `AuthResponse.cs` - UserId, Username, Email, Token

**Security Discussion:**
- Reviewed password transmission security over HTTPS
- Confirmed industry-standard practice: plain password over TLS, immediate server-side hashing
- HTTPS/TLS encrypts password in transit
- BCrypt hashing with salt on server before storage
- Client-side hashing would make hash the password (replay attacks)

**2. Created Service Interface**
Added `IAuthService` in `GamingLibrary.Core/Interfaces/`:
```csharp
Task<AuthResponse?> RegisterAsync(RegisterRequest request);
Task<AuthResponse?> LoginAsync(LoginRequest request);
```

**3. Implemented AuthService**
Created `AuthService` in `GamingLibrary.Infrastructure/Services/`:
- Installed `BCrypt.Net-Next` NuGet package for password hashing
- Registration logic:
  - Check for duplicate username/email
  - Hash password with BCrypt
  - Create user entity
  - Generate JWT token
- Login logic:
  - Find user by email
  - Verify password against hash
  - Generate JWT token
- JWT token generation:
  - 24-hour expiration
  - Claims: UserId, Email, Username
  - HMAC-SHA256 signing

**4. JWT Configuration**
Added to `appsettings.json`:
```json
"JwtSettings": {
  "SecretKey": "YourSuperSecretKeyThatIsAtLeast32CharactersLong!",
  "Issuer": "GamingLibraryAPI",
  "Audience": "GamingLibraryClient"
}
```

**5. Dependency Injection & Middleware Setup**
Updated `Program.cs`:
- Registered `IAuthService` → `AuthService` (AddScoped)
- Configured JWT Bearer authentication with token validation parameters
- Added authentication middleware (`UseAuthentication()` before `UseAuthorization()`)
- Fixed dependency injection issue: Added missing `using GamingLibrary.Infrastructure.Services;`

**6. Created AuthController**
Built `AuthController` in `GamingLibrary.API/Controllers/`:
- `POST /api/auth/register` - User registration endpoint
  - Validates required fields and password length (min 6 chars)
  - Returns 400 if username/email exists
  - Returns JWT token on success
- `POST /api/auth/login` - User authentication endpoint
  - Validates required fields
  - Returns 401 for invalid credentials
  - Returns JWT token on success
- Integrated logging for security monitoring

**7. Created Protected Test Endpoint**
Built `UsersController` with `[Authorize]` attribute:
- `GET /api/users/me` - Returns current authenticated user info
- Extracts user claims from JWT token
- Tests JWT authentication is working correctly

**8. Swagger/OpenAPI Configuration for .NET 10**
Updated Swagger configuration for JWT authentication:
- Issue identified: .NET 10 has different OpenAPI security specs
- Need to configure security scheme for Bearer token
- Enables "Authorize" button in Swagger UI
- Allows testing protected endpoints with JWT tokens

#### Testing Results:
✅ Registration endpoint working - creates users with hashed passwords  
✅ Login endpoint working - validates credentials and returns JWT  
✅ Password hashing verified - BCrypt with salt  
✅ Database persistence confirmed - users stored correctly  
⏳ Swagger JWT configuration - in progress (OpenAPI updates for .NET 10)  
⏳ Protected endpoint testing - pending Swagger auth setup  

#### Current State:
✅ Complete authentication system implemented  
✅ JWT generation and validation working  
✅ Password security best practices followed  
✅ Controllers with proper error handling  
✅ Logging integrated  
⏳ Swagger UI authentication configuration needed for .NET 10  

#### Challenges Encountered:
1. **Dependency Injection Error** - Missing using statement for AuthService
   - Solution: Added `using GamingLibrary.Infrastructure.Services;`
2. **Security Concern** - Question about password transmission
   - Resolution: Confirmed HTTPS/TLS encryption is industry standard
3. **Swagger Authorization** - .NET 10 OpenAPI security configuration differs from previous versions
   - In progress: Updating to .NET 10 OpenAPI specs

#### Next Session Goals:
- Complete Swagger/OpenAPI JWT configuration for .NET 10
- Test protected endpoints via Swagger UI
- Add input validation (FluentValidation)
- Consider rate limiting for auth endpoints
- Set up Docker Compose for full application containerization

---

### Session 3: Docker Compose & Containerization
**Date:** February 10, 2026  
**Goal:** Containerize the entire application stack

#### Steps Completed:

**1. Created Multi-Stage Dockerfile**
Built `Dockerfile` in `GamingLibrary.API/`:
- **Build stage**: Uses .NET 10 SDK image
  - Copies project files and restores dependencies
  - Builds application in Release mode
- **Publish stage**: Publishes optimized application
- **Final stage**: Uses .NET 10 ASP.NET runtime (smaller image)
  - Exposes ports 8080 (HTTP) and 8081 (HTTPS)
  - Sets entrypoint to run the API

Multi-stage benefits:
- Smaller final image (runtime only, not SDK)
- Layer caching optimizes rebuild times
- Production-ready containerization

**2. Created .dockerignore**
Added `.dockerignore` to solution root:
- Excludes build artifacts (bin, obj)
- Ignores version control files
- Prevents unnecessary files in Docker context
- Speeds up Docker builds

**3. Environment-Specific Configuration**
Created `appsettings.Docker.json`:
- Docker-specific connection string: `Server=sqlserver,1433` (uses Docker service name)
- Same JWT settings for consistency
- Loaded conditionally based on `ASPNETCORE_ENVIRONMENT`

Updated `Program.cs`:
```csharp
if (builder.Environment.EnvironmentName == "Docker")
{
    builder.Configuration.AddJsonFile("appsettings.Docker.json", optional: false, reloadOnChange: true);
}
```

**4. Automatic Database Migration**
Added auto-migration on startup in `Program.cs`:
```csharp
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.Migrate();
}
```

Benefits:
- No manual migration commands needed
- Database schema always up to date
- Perfect for containerized deployments
- Creates database if it doesn't exist

**5. Created docker-compose.yml**
Built orchestration file in solution root with two services:

**SQL Server Service:**
- Image: `mcr.microsoft.com/mssql/server:2022-latest`
- Persistent volume: `sqlserver-data` (data survives container restarts)
- Health check: Validates SQL Server is ready before starting API
- Port mapping: `1433:1433`

**API Service:**
- Builds from Dockerfile
- Environment: `ASPNETCORE_ENVIRONMENT=Docker`
- Depends on SQL Server health check
- Port mapping: `5000:8080` (host:container)
- Connected via bridge network

**Network & Volumes:**
- Custom bridge network: `gaming-library-network`
- Named volume for SQL Server data persistence

**6. Fixed Swagger Configuration for Docker**
Issue: Swagger only enabled for Development environment

Solution in `Program.cs`:
```csharp
if (app.Environment.IsDevelopment() || app.Environment.EnvironmentName == "Docker")
{
    app.MapOpenApi();
}
```

Critical fix - without this, Swagger UI wasn't accessible in Docker containers.

#### Testing & Verification:

**Build and Start:**
```bash
docker-compose up --build
```

**Verified:**
✅ Both containers start successfully  
✅ SQL Server health check passes  
✅ API waits for SQL Server before starting  
✅ Database migration runs automatically  
✅ Users table created in containerized SQL Server  
✅ Swagger UI accessible at `http://localhost:5000/swagger`  
✅ Registration endpoint working in Docker  
✅ Login endpoint working in Docker  
✅ JWT authentication functioning in containerized environment  
✅ Protected endpoints requiring valid tokens  

**Useful Commands Documented:**
```bash
# Start containers (detached)
docker-compose up -d

# View logs
docker-compose logs -f api
docker-compose logs -f sqlserver

# Stop containers
docker-compose down

# Fresh start (remove volumes)
docker-compose down -v

# Rebuild after changes
docker-compose up --build
```

#### Challenges Encountered:

1. **Swagger Not Accessible**
   - Issue: Couldn't access `http://localhost:5000/swagger`
   - Debugging steps:
     - Checked container status: `docker-compose ps`
     - Reviewed logs: `docker-compose logs api`
     - Verified port mappings
     - Tested inside container: `docker exec -it gaming-library-api /bin/bash`
   - Root cause: Swagger only enabled for Development environment
   - Solution: Updated condition to include "Docker" environment

#### Current State:
✅ **PHASE 1 COMPLETE!**  
✅ Fully containerized development environment  
✅ Docker Compose orchestrating API + SQL Server  
✅ Database auto-migration on startup  
✅ Volume persistence for data  
✅ Health checks ensuring proper startup order  
✅ Swagger UI working in Docker  
✅ Complete authentication flow tested in containers  
✅ Production-ready containerization patterns  
✅ Easy to share and deploy  

#### Phase 1 Summary - What We Built:

**Architecture:**
- Clean Architecture with 3 projects (API, Core, Infrastructure)
- Separation of concerns and dependency inversion
- .NET 10 with controller-based APIs

**Authentication:**
- JWT-based authentication system
- BCrypt password hashing with salt
- Registration and login endpoints
- Protected endpoints with [Authorize] attribute
- Secure token validation

**Database:**
- Entity Framework Core with SQL Server
- Code-first migrations
- Automatic migration on startup
- Unique constraints on username/email

**DevOps:**
- Multi-stage Dockerfile for optimized images
- Docker Compose orchestration
- Environment-specific configuration
- Health checks and dependencies
- Volume persistence

#### Next Steps - Phase 2 Planning:
- Plan Steam API integration strategy
- Design platform connection architecture
- Research Steam Web API authentication
- Create platform service interfaces
- Begin game library sync implementation

---

### Session 4: Phase 2 - Database Schema & Steam Integration
**Date:** February 12, 2026
**Goal:** Expand database schema and implement Steam library sync

#### Steps Completed:

**1. New Entities Created**
Added to `GamingLibrary.Core/Entities/`:

- `PlatformConnection.cs` - Links users to gaming platforms
  - Stores platform name, platform-specific user ID
  - Tracks connection status and last sync time
  - Unique constraint: one connection per user per platform

- `Game.cs` - Platform-agnostic master game list
  - NormalizedTitle for cross-platform matching
  - Optional metadata: description, cover image, release date, developer, publisher
  - One game can belong to many users across platforms

- `UserGame.cs` - Links users to games per platform
  - Stores platform-specific game ID (e.g., Steam AppID)
  - Tracks playtime, last played, and completion status
  - Navigation property to JournalEntries

- `JournalEntry.cs` - Per-game user notes (added proactively)
  - Content, optional rating (1-10), session duration, tags
  - Linked to UserGame (not directly to Game)
  - Added early based on known Phase 3 requirements

- Updated `User.cs` with navigation properties for PlatformConnections and UserGames

**2. Migration Applied**
Migration `AddPlatformGameAndJournalEntities` created and applied:
- 4 new tables: PlatformConnections, Games, UserGames, JournalEntries
- All foreign keys and cascade deletes configured
- Unique constraints and indexes applied
- Verified in Docker via auto-migration on startup

**3. Steam DTOs Created**
Added `GamingLibrary.Core/DTOs/Steam/`:
- `SteamGameDto.cs` - Fixed snake_case mapping with `[JsonPropertyName]` attributes
  - Key fix: `playtime_forever`, `rtime_last_played`, `img_icon_url` all properly mapped
- `SteamLibraryResponseDto.cs` - Maps Steam's nested response structure

**4. Steam Service Implemented**
Created `SteamService.cs` in `GamingLibrary.Infrastructure/Services/`:
- Implements `IPlatformService` interface
- Calls `GetOwnedGames` Steam endpoint
- Converts Unix timestamps to DateTime for LastPlayedAt
- Fixed cover image URL: `https://cdn.cloudflare.steamstatic.com/steam/apps/{appId}/header.jpg`
  - Previous approach used unreliable image hash
  - New approach uses AppID-based CDN URL (always available)

**5. N+1 Query Optimization**
Identified and resolved N+1 query problem in `SyncUserGamesAsync`:

Before:
- 2 DB queries per game (one for Games table, one for UserGames table)
- 500 games = ~1,000 DB queries

After:
- 2 total DB queries for batch lookups using `ToDictionaryAsync`
- In-memory O(1) dictionary lookups during loop
- Bulk inserts with `AddRangeAsync`
- Single `SaveChangesAsync` at end of sync
- IGDB only called for new games or games missing all metadata

**6. Platform & Games Controllers Created**
- `PlatformController.cs`:
  - `POST /api/platform/steam/connect`
  - `POST /api/platform/steam/sync`
  - `GET /api/platform/connections`
  - `DELETE /api/platform/{platform}`
- `GamesController.cs`:
  - `GET /api/games/library` (with optional platform filter)
  - `GET /api/games/library/{id}` (includes journal entry count)
  - `GET /api/games/stats` (total games, playtime, platform breakdown)

#### Challenges Encountered:

1. **Playtime/Stats Returning Null**
   - Root cause: Steam API returns snake_case JSON (`playtime_forever`) but DTO used PascalCase
   - `PropertyNameCaseInsensitive` handles case differences but NOT underscore differences
   - Solution: Added `[JsonPropertyName]` attributes to all Steam DTOs

2. **Cover Images Returning Null**
   - Root cause: `GetOwnedGames` endpoint returns only an image hash, not a full URL
   - Our helper method wasn't building the URL correctly
   - Solution: Switched to AppID-based Steam CDN URL pattern (no hash needed)

---

### Session 5: Phase 2 - IGDB Integration & Optimization
**Date:** February 12, 2026
**Goal:** Enrich game metadata using IGDB API and resolve sync issues

#### Steps Completed:

**1. IGDB Account Setup**
- Created Twitch developer account
- Registered application in Twitch Developer Console
- Obtained Client ID and Client Secret
- Added `IgdbSettings` to appsettings.json and appsettings.Docker.json

**2. IGDB DTOs Created**
Added `GamingLibrary.Core/DTOs/IGDB/`:
- `IgdbGameDto.cs` - Main game response with nested objects
- `IgdbCoverDto.cs` - Cover image URL
- `IgdbInvolvedCompanyDto.cs` - Developer/publisher companies
- `IgdbCompanyDto.cs` - Company name
- `IgdbGenreDto.cs` - Genre information

**3. IGameMetadataService Interface**
Created `IGameMetadataService.cs` in `GamingLibrary.Core/Interfaces/`:
- `EnrichGameMetadataAsync(Game game)` - Enriches entity with IGDB data
- `SearchGameAsync(string title)` - Searches IGDB by title

**4. IgdbService Implemented**
Created `IgdbService.cs` in `GamingLibrary.Infrastructure/Services/`:
- Twitch OAuth token management:
  - Fetches token on first use
  - Caches token in memory
  - Refreshes automatically 5 minutes before expiry
- Registered as **Singleton** (preserves token cache across requests)
- Enriches Game entity with: description, release date, developer, publisher, cover image
- IGDB cover image: upgrades from `t_thumb` to `t_cover_big` resolution
- Steam cover image takes priority over IGDB cover

**5. Rate Limiting Implemented**
Added to `IgdbService.cs`:
- `SemaphoreSlim` ensures single concurrent IGDB call (thread-safe)
- Minimum 275ms between requests (~4 requests/second with buffer)
- Prevents `TooManyRequests` (429) errors from IGDB

**6. Multi-Strategy Search Fallback**
Added to `IgdbService.cs` to handle poor IGDB match rates:
- Strategy 1: Exact title search
- Strategy 2: Cleaned title
  - Removes ®, ™, © symbols
  - Removes common edition markers (GOTY, Definitive Edition, Remastered, etc.)
- Strategy 3: Base title only (strips subtitle after colon/dash)
- Quote escaping in Apicalypse queries to prevent query syntax errors

**7. SteamService Updated**
- Injected `IGameMetadataService` into `SteamService`
- IGDB called only for genuinely new games
- Re-enrichment only when ALL three fields missing (developer AND publisher AND description)
- Prevents unnecessary IGDB calls on subsequent syncs

#### Challenges Encountered:

1. **TooManyRequests from IGDB**
   - Root cause: No rate limiting on IGDB calls, sequential requests too fast
   - Solution: Added `SemaphoreSlim` + minimum interval enforcement

2. **Low IGDB Match Rate**
   - Root cause: Steam titles often contain special characters and edition markers
   - Solution: Multi-strategy search with progressive title simplification
   - Examples fixed:
     - `"The Witcher® 3: Wild Hunt"` → cleaned → `"The Witcher 3: Wild Hunt"` → base → `"The Witcher 3"`
     - `"Dark Souls™: Remastered"` → cleaned → `"Dark Souls: Remastered"` → base → `"Dark Souls"`

#### Current State:
✅ Steam library syncing with playtime and last played  
✅ Cover images loading from Steam CDN  
✅ IGDB metadata enriching games with developer, publisher, description  
✅ Rate limiting preventing IGDB 429 errors  
✅ Multi-strategy search improving match rates  
✅ N+1 query problem resolved  
✅ All endpoints tested and working in Docker  

#### Next Session Goals:
- Implement Journal Entry CRUD endpoints
- Add game status update endpoint
- Begin Phase 3: Progress tracking features
- Commit Phase 2 work to GitHub

---

## Contact & Collaboration

**Project Type:** Portfolio/Learning Project  
**Timeline:** 10 weeks (MVP)  
**Difficulty:** Intermediate to Advanced  
**Skills Demonstrated:** Full-stack development, API integration, security, DevOps

**Ready to start?** Begin with Phase 1 and work incrementally!

---

*Document created: February 2026*  
*Last updated: February 12, 2026 - Phase 2 in progress - Steam + IGDB integration complete*
