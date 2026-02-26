# Use the official .NET 10 SDK image for building
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files
COPY ["GamingLibrary.API/GamingLibrary.API.csproj", "GamingLibrary.API/"]
COPY ["GamingLibrary.Core/GamingLibrary.Core.csproj", "GamingLibrary.Core/"]
COPY ["GamingLibrary.Infrastructure/GamingLibrary.Infrastructure.csproj", "GamingLibrary.Infrastructure/"]

# Restore dependencies
RUN dotnet restore "GamingLibrary.API/GamingLibrary.API.csproj"

# Copy all source code
COPY . .

# Build the application
WORKDIR "/src/GamingLibrary.API"
RUN dotnet build "GamingLibrary.API.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "GamingLibrary.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Use the runtime image for running the app
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080
EXPOSE 8081
RUN mkdir -p /app/keys 

# Copy published files
COPY --from=publish /app/publish .

# Set entry point
ENTRYPOINT ["dotnet", "GamingLibrary.API.dll"]