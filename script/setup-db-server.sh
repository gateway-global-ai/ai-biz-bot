#!/bin/bash
# Stop script on first real error, but we'll handle specific checks manually
set -e

# 1. Source the environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: .env file not found."
    exit 1
fi

# 2. Extract DB name and user from the connection string or variables
# Assuming format: postgresql://user:password@localhost:5432/dbname
DB_NAME="gateway_ai"
DB_USER="gateway_ai_user"
DB_PASS=$DATABASE_PASSWORD # Ensure this is in your .env

echo "Configuring PostgreSQL for $DB_NAME..."

# 3. Create User and Database with existence checks
sudo -u postgres psql <<EOF
-- Create user if not exists
DO \$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS';
    END IF;
END
\$$;

-- Create database if not exists
-- Note: SELECT ... \gexec is a psql trick to execute the result of a query
SELECT 'CREATE DATABASE $DB_NAME'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Grant privileges
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

# 4. Finalize Schema
echo "Applying Drizzle Schema..."
npm run db:push

echo "Database environment is stable and ready."
