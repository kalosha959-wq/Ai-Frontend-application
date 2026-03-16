#!/usr/bin/env bash
# Simple release helper: bump version tag and create a git tag
set -e
if [ -z "$1" ]; then
  echo "Usage: ./scripts/release.sh x.y.z"
  exit 1
fi
VERSION="$1"
git add -A
git commit -m "chore(release): bump version to $VERSION" || true
git tag -a "v$VERSION" -m "Release $VERSION"
git push origin --tags
echo "Released v$VERSION"
