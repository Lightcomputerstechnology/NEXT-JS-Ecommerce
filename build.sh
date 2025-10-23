#!/bin/bash
echo "Cleaning old lock files..."
rm -f yarn.lock package-lock.json

echo "Installing dependencies..."
yarn install

echo "Building Next.js app..."
yarn build

echo "✅ Build complete!"
