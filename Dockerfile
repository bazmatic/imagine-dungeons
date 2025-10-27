FROM postgres:14

# Set environment variables
ENV POSTGRES_DB=imagine_dungeons
ENV POSTGRES_USER=baz
ENV POSTGRES_PASSWORD=baz

# Copy initialization scripts
COPY ./schema.sql /docker-entrypoint-initdb.d/01-schema.sql
COPY ./data.sql /docker-entrypoint-initdb.d/02-data.sql

# Expose the PostgreSQL port
EXPOSE 5432