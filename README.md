

# Mausam & Miles

An India-focused weather and nearby travel discovery application.

## Features

- Current weather and 7-day forecast
- Hourly forecast
- City search and browser geolocation
- Celsius and Fahrenheit toggle
- Weather-based activity recommendations
- Nearby tourist attractions
- 5 km, 10 km, 20 km and 30 km search radius
- Interactive OpenStreetMap
- Save favourite places in browser storage
- Basic trip planner and budget estimator
- Responsive desktop and mobile layouts

## Technology

- Next.js
- React
- TypeScript
- Open-Meteo
- OpenStreetMap / Overpass API
- Leaflet
- Vercel

## Local setup

Install Node.js 20 or later.

Clone the repository:

    git clone https://github.com/YOUR_USERNAME/mausam-and-miles.git

Open the project folder:

    cd mausam-and-miles

Install dependencies:

    npm install

Start development:

    npm run dev

Open:

    http://localhost:3000

Build the application:

    npm run build

## Deploy to Vercel

1. Push the repository to GitHub.
2. Sign in to Vercel.
3. Select Add New Project.
4. Import the mausam-and-miles repository.
5. Keep the framework preset as Next.js.
6. Leave environment variables empty for the initial version.
7. Select Deploy.

## Data sources

Weather and forecast:
https://open-meteo.com/

Geocoding:
https://open-meteo.com/en/docs/geocoding-api

Attractions and map data:
https://www.openstreetmap.org/

Overpass API:
https://overpass-api.de/

## Important notes

- Weather and attraction data depend on third-party public services.
- Public Overpass services can have usage limits or temporary downtime.
- Attraction coverage and names depend on OpenStreetMap contributions.
- Entry prices are not verified live prices.
- Trip budgets are indicative planning estimates.
- Saved places are stored in the current browser, not in a user account.
- Browser location access requires user permission.
- Check local conditions and attraction opening hours before travelling.

## Attribution

Map data © OpenStreetMap contributors.
Weather data provided by Open-Meteo.

