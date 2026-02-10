# Gaming Library & Progress Tracker

A unified gaming library management system with progress tracking and journaling features. Built as a portfolio project demonstrating modern .NET development practices.

## 🎯 Project Overview

This application provides:
- **Unified Dashboard**: View games across multiple gaming platforms (Steam, Xbox, etc.)
- **Progress Tracking**: Monitor achievements and completion status
- **Personal Journaling**: Track your gaming sessions and thoughts
- **Authentication**: Secure JWT-based authentication system

## 🛠️ Technology Stack

**Backend:**
- .NET 10 Web API (Controller-based)
- Entity Framework Core 10
- SQL Server 2022
- JWT Authentication with BCrypt password hashing
- Docker & Docker Compose

**Architecture:**
- Clean Architecture (API, Core, Infrastructure layers)
- Dependency Injection
- Repository Pattern (upcoming)

## 🚀 Getting Started

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Visual Studio 2022](https://visualstudio.microsoft.com/) or [VS Code](https://code.visualstudio.com/)

### Setup

1. **Clone the repository**
```bash
   git clone https://github.com/F3nrir-00/gaming-library-tracker.git
   cd gaming-library-tracker
```

2. **Configure secrets**
   - Copy `appsettings.json.example` to `appsettings.json`
   - Update the connection string password
   - Set a secure JWT secret key (min 32 characters)

3. **Run with Docker Compose**
```bash
   docker-compose up --build
```

4. **Access the application**
   - API: http://localhost:5000
   - Swagger UI: http://localhost:5000/swagger

### Development (without Docker)

1. **Start SQL Server**
```bash
   docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourPassword" \
     -p 1433:1433 --name sqlserver-gaming-library -d \
     mcr.microsoft.com/mssql/server:2022-latest
```

2. **Run migrations**
```bash
   cd GamingLibrary.API
   dotnet ef database update
```

3. **Run the API**
```bash
   dotnet run
```

## 📋 Current Features (Phase 1 - Complete ✅)

- ✅ User registration and authentication
- ✅ JWT token-based authorization
- ✅ Password hashing with BCrypt
- ✅ Entity Framework Core with SQL Server
- ✅ Automatic database migrations
- ✅ Docker containerization
- ✅ Swagger API documentation

## 🗺️ Roadmap

### Phase 2: Platform Integration (In Progress)
- Steam OAuth integration
- Game library synchronization
- Background sync jobs

### Phase 3: Core Features
- Progress tracking system
- Journal entry management
- Game status tracking

### Phase 4: Frontend
- React application with TypeScript
- Authentication flow
- Game library dashboard

### Phase 5: Deployment
- CI/CD pipeline
- Cloud deployment
- Production monitoring

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Authenticate and receive JWT token

### Users (Protected)
- `GET /api/users/me` - Get current authenticated user info

## 🏗️ Project Structure
```
GamingLibraryTracker/
├── GamingLibrary.API/          # Web API layer
│   ├── Controllers/
│   └── Program.cs
├── GamingLibrary.Core/         # Business logic & entities
│   ├── Entities/
│   ├── DTOs/
│   └── Interfaces/
├── GamingLibrary.Infrastructure/ # Data access & external services
│   ├── Data/
│   └── Services/
└── docker-compose.yml
```

## 🔐 Security

- Passwords hashed using BCrypt with salt
- JWT tokens with configurable expiration
- HTTPS enforced in production
- Secure connection strings via environment variables

## 📝 License

This is a portfolio project. All rights reserved.

## 👤 Author

Jonathan Adams
- GitHub: @F3nrir_00 (https://github.com/F3nrir_00)
- LinkedIn: Jonathan Adams (https://linkedin.com/in/jonathan-adams00)

## 🙏 Acknowledgments

Built as a learning project to demonstrate:
- Clean Architecture principles
- Modern .NET development practices
- Docker containerization
- RESTful API design
- Authentication & authorization
