#!/bin/bash
set -e

source ./.env
fly auth docker

function build() {
  TEMPLATE_NAME=$1
  echo "Building $TEMPLATE_NAME"
  pushd $TEMPLATE_NAME
    TEMPLATE_VERSION=$(cat package.json | jq -r '.version')

    GIT_URL=s3://repos/templates/$TEMPLATE_NAME
    # git remote add origin $GIT_URL
    git remote set-url origin $GIT_URL
    git push --tags

    DOCKER_TAG=registry.fly.io/$TEMPLATE_NAME:$TEMPLATE_VERSION
    docker build \
      --platform linux/amd64 \
      --build-arg AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
      --build-arg AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
      --build-arg AWS_ENDPOINT_URL_S3=$AWS_ENDPOINT_URL_S3 \
      --tag $DOCKER_TAG \
      --file ../Dockerfile.$TEMPLATE_NAME \
      .
    
    if ! flyctl apps list | grep -q $TEMPLATE_NAME; then
      flyctl apps create $TEMPLATE_NAME
    fi

    docker push $DOCKER_TAG
  popd
}

build replicator-vite-js
