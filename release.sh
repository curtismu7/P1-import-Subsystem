#!/bin/bash

# release.sh - Automated release script for PingOne Import Tool
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Get new version from argument or package.json
if [ -n "$1" ]; then
  NEW_VERSION="$1"
  echo "🔖 Setting version to $NEW_VERSION in package.json..."
  npm version --no-git-tag-version "$NEW_VERSION"
else
  NEW_VERSION=$(node -p "require('./package.json').version")
  echo "🔖 Using version from package.json: $NEW_VERSION"
fi

echo "🧹 Cleaning up old bundles..."
node scripts/cleanup-old-bundles.js

echo "🔄 Updating all version references..."
node scripts/update-version.js "$NEW_VERSION"

echo "🛠️  Building bundle..."
npm run build:bundle

echo "🔄 Restarting server..."
npm run restart

echo "✅ Release complete! Version: $NEW_VERSION"
echo "------------------------------------------"
echo "You can now open the app at http://localhost:4000"
echo "UI, logs, and backend should all show version: $NEW_VERSION"
