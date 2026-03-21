#!/usr/bin/env bash
set -e

echo "Pulling latest code..."
git pull origin main

echo "Building server..."
cd server
npm install
npm run build
cd ..

echo "Building client..."
cd client
npm install
npm run build
cd ..

echo "Deploying client..."
rsync -av --delete client/dist/ /var/www/wegogames.ddns.net/html/stellar

echo "Restarting server..."
pm2 restart stellar




