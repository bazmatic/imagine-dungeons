#!/bin/bash
# setup-database.sh - Initialize the Imagine Dungeons database

# Load environment variables from .env.local if it exists
if [ -f .env.local ]; then
    echo "Loading environment variables from .env.local..."
    export $(grep -v '^#' .env.local | xargs)
fi

# Database connection parameters
# Support both naming conventions from .env.local and direct environment variables
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-${DB_USERNAME:-baz}}
DB_PASSWORD=${DB_PASSWORD:-baz}
DB_NAME=${DB_NAME:-${DB_DATABASE:-imagine_dungeons}}

echo "Setting up Imagine Dungeons database..."
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "Error: psql command not found. Please install PostgreSQL client tools."
    echo "On macOS: brew install postgresql"
    echo "On Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

# Set password environment variable for psql
export PGPASSWORD=$DB_PASSWORD

echo "Creating database schema..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Schema created successfully!"
else
    echo "❌ Schema creation failed!"
    exit 1
fi

echo ""
echo "Loading sample data..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f data.sql

if [ $? -eq 0 ]; then
    echo "✅ Sample data loaded successfully!"
    echo ""
    echo "🎉 Database setup complete!"
    echo "You can now start the development server with: pnpm run dev"
else
    echo "❌ Data loading failed!"
    exit 1
fi

# Unset password for security
unset PGPASSWORD
