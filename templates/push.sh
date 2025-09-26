#!/bin/bash
set -e

source ./.env
fly auth docker

APP_NAME="squash-template"
SQUASH_CLI_VERSION=$(cat ../packages/cli/package.json | jq -r '.version')

quiet() {
  BUILDKIT_PROGRESS=plain "$@" 2>&1 \
    | grep -vE '^\[\+\] Building|^ =>|^# ' \
    | sed -u '/^ =>/d'
}

function build_repo() {
  TEMPLATE_NAME=$1
  echo "Building template: $TEMPLATE_NAME"
  pushd $TEMPLATE_NAME
    TEMPLATE_VERSION=$(cat package.json | jq -r '.version')

    GIT_URL=s3://repos/templates/$TEMPLATE_NAME
    # if added, set, if not, add
    if git remote get-url origin; then
      git remote set-url origin $GIT_URL
    else
      git remote add origin $GIT_URL
    fi
    git push --tags

    DOCKER_TAG="$TEMPLATE_NAME:v$TEMPLATE_VERSION"
    echo "Docker tag: $DOCKER_TAG"
    quiet docker build \
      --platform linux/amd64 \
      --build-arg SQUASH_CLI_VERSION=$SQUASH_CLI_VERSION \
      --tag $DOCKER_TAG \
      --file ../Dockerfile.$TEMPLATE_NAME \
      .
      # --build-arg AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
      # --build-arg AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
      # --build-arg AWS_ENDPOINT_URL_S3=$AWS_ENDPOINT_URL_S3 \
      # --build-arg GIT_TAG=v$TEMPLATE_VERSION \
    
    # FLY_DOCKER_TAG="registry.fly.io/$APP_NAME:$DOCKER_TAG"
    # docker tag $DOCKER_TAG $FLY_DOCKER_TAG
    # docker push $DOCKER_TAG
    daytona snapshot push "$DOCKER_TAG" --name "$DOCKER_TAG" --entrypoint "sleep infinity" || echo "Did not push snapshot"
  popd
}

# function build_node_image() {
#   NODE_IMAGE_TAG=$1
#   echo "Building node image: $NODE_IMAGE_TAG"

#   DOCKER_TAG="registry.fly.io/$APP_NAME:node-$NODE_IMAGE_TAG"

#   echo "Docker tag: $DOCKER_TAG"
#   quiet docker build \
#     --platform linux/amd64 \
#     --build-arg NODE_IMAGE=node:$NODE_IMAGE_TAG \
#     --build-arg SQUASH_CLI_VERSION=$SQUASH_CLI_VERSION \
#     --tag $DOCKER_TAG \
#     --file ./Dockerfile.node \
#     .
  
#   docker push $DOCKER_TAG
# }

# if ! flyctl apps list | grep -q $APP_NAME; then
#   flyctl apps create $APP_NAME
# fi

build_repo base-vite-ts
# build_repo replicator-vite-ts
# build_node_image 20-alpine
