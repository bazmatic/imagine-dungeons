#!/bin/bash

CONTAINER_NAME="imagine_dungeons_db"
IMAGE_NAME="imagine_dungeons_image"
VOLUME_NAME="imagine_dungeons_data"

# Stop and remove the existing container
docker stop $CONTAINER_NAME
docker rm $CONTAINER_NAME

# Remove the associated volume
docker volume rm $VOLUME_NAME

# Rebuild the Docker image
docker build -t $IMAGE_NAME .

# Run a new container
docker run -d --name $CONTAINER_NAME -p 5432:5432 -v $VOLUME_NAME:/var/lib/postgresql/data $IMAGE_NAME