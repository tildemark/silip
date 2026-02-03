@echo off
REM SILIP Deployment Script for OCI Windows

setlocal enabledelayedexpansion

echo.
echo 🚀 SILIP Deployment Script for OCI
echo ==================================
echo.

REM Check prerequisites
echo Checking prerequisites...

where docker >nul 2>nul
if errorlevel 1 (
    echo ✗ Docker is not installed
    exit /b 1
)
echo ✓ Docker is installed

where docker-compose >nul 2>nul
if errorlevel 1 (
    echo ✗ Docker Compose is not installed
    exit /b 1
)
echo ✓ Docker Compose is installed

REM Check if net external network exists
docker network ls | find " net " >nul
if errorlevel 1 (
    echo ⚠ Creating external network 'net'
    docker network create net
    echo ✓ Network created
) else (
    echo ✓ External network 'net' exists
)

REM Create .env.production if it doesn't exist
if not exist .env.production (
    echo ⚠ Creating .env.production from template
    copy .env.production.example .env.production
    echo.
    echo ✗ IMPORTANT: Edit .env.production and set a secure DB_PASSWORD
    echo Run: notepad .env.production
    echo.
    exit /b 1
) else (
    echo ✓ .env.production exists
)

REM Pull latest code
echo.
echo Updating code from GitHub...
git pull origin main
echo ✓ Code updated

REM Build and start services
echo.
echo Building and starting services...
docker-compose up -d --build
echo ✓ Services started

REM Wait for database
echo.
echo Waiting for database to be healthy...
for /L %%i in (1,1,30) do (
    docker-compose exec -T silip-db pg_isready -U silip >nul 2>nul
    if errorlevel 0 (
        echo ✓ Database is healthy
        goto db_ready
    )
    echo -n .
    timeout /t 1 /nobreak
)
echo ✗ Database failed to start
exit /b 1

:db_ready

REM Run bootstrap unless explicitly skipped
if /I "%SKIP_BOOTSTRAP%"=="true" (
    echo ⚠ Skipping bootstrap (SKIP_BOOTSTRAP=true)
    echo Run later: docker-compose exec silip-app npm run bootstrap
) else (
    echo.
    echo Running database bootstrap...
    docker-compose exec -T silip-app npm run bootstrap
    echo ✓ Bootstrap complete
)

REM Show status
echo.
echo ✓ Deployment complete!
echo.
echo Services:
docker-compose ps
echo.
echo URLs:
echo   Main: https://silip.sanchez.ph
echo   API: https://silip.sanchez.ph/api
echo   API Docs: https://silip.sanchez.ph/api-docs
echo.
echo Logs:
echo   docker-compose logs -f silip-app
echo.

endlocal
