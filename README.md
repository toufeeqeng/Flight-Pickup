# Flight Pickup — Meet My Flight

A free web app that tracks incoming flights in real-time and tells you exactly when to leave home to pick someone up from the airport.

## Features

- Real-time flight tracking by flight number
- Flight delay risk scoring
- Drive time calculator from your location to the airport
- Baggage allowance rules by airline
- Carbon footprint calculator (with offset cost & tree equivalent)
- Airport information & lounge details
- Route search between airports

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** HTML / CSS / Vanilla JavaScript
- **APIs:** AviationStack, API Ninjas, OpenWeather, Leaflet

## Getting Started

### Prerequisites

Create a `backend/.env` file with your API keys:

```env
AVIATIONSTACK_API_KEY=your_key
NINJAS_API_KEY=your_key
OPENWEATHER_API_KEY=your_key
FRONTEND_URL=http://localhost:3000
PORT=3001
```

### Install & Run

**Backend** (runs on port 3001):

```bash
cd backend
npm install
npm start
```

**Frontend** (runs on port 3000):

```bash
cd frontend
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

> For development with auto-reload: `npm run dev` in the backend folder.

## License

MIT
