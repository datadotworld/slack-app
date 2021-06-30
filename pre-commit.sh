#!/bin/sh

branch="$(git rev-parse --abbrev-ref HEAD)"

directories="$(git diff --staged --name-status --diff-filter=DR)"

# Prevent direct commit to main branch
if [ "$branch" = "main" ]; then
  echo "You can't commit directly to main branch"
  exit 1
fi

# Prevent renaming of assets
if [[ "$directories" = *"public/assets"* ]]; then
  echo "You can't rename or delete files in directory : public/assets"
  exit 1
fi