FROM postgres:14

# Set environment variables
ENV POSTGRES_DB=imagine_dungeons
ENV POSTGRES_USER=baz
ENV POSTGRES_PASSWORD=baz

# Copy initialization scripts
COPY ./init.sql /docker-entrypoint-initdb.d/

# Expose the PostgreSQL port
EXPOSE 5432