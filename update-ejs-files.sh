#!/bin/bash
# Quick Update Script for Remaining EJS Files
# This script adds layout shift prevention to all remaining EJS files

echo "Updating remaining EJS files with layout shift prevention..."

# Array of files to update
files=(
    "messages.ejs"
    "mine-annonser.ejs"
    "Ny-annonse.ejs"
    "reise.ejs"
    "saved-searches.ejs"
    "settings.ejs"
    "notifications.ejs"
)

# For each file, show the update needed
for file in "${files[@]}"; do
    echo "
=== $file ===
Add these lines:

1. In <head> section, after existing meta tags:
   <%- include('partials/optimized-head') %>

2. Before closing </body> tag:
   <%- include('partials/optimized-scripts') %>

3. If the file has product containers, change:
   <div class=\"productsContainer\"> 
   to:
   <div class=\"productsContainer product-grid\">

4. Add skeleton loading for dynamic content areas.
"
done

echo "
MANUAL UPDATE INSTRUCTIONS:

For each remaining EJS file, you need to:

1. Find the <head> section and add after existing meta tags:
   <%- include('partials/optimized-head') %>

2. Find the closing </body> tag and add before it:
   <%- include('partials/optimized-scripts') %>

3. Look for any product listing containers and add 'product-grid' class

4. Add skeleton loading placeholders for dynamic content

Files already updated:
✅ Forside.ejs
✅ productDetails.ejs  
✅ TorgetKat.ejs
✅ SearchResults.ejs
✅ favorites.ejs

Files still needing updates:
❌ messages.ejs
❌ mine-annonser.ejs
❌ Ny-annonse.ejs
❌ reise.ejs
❌ saved-searches.ejs
❌ settings.ejs
❌ notifications.ejs
"