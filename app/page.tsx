
"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  CloudSun,
  MapPin,
  Search,
  Navigation,
  CalendarDays,
  Wallet,
  Heart,
  RefreshCw,
  Compass,
  Thermometer,
  Wind,
  Droplets,
  Sun,
  Clock,
  ExternalLink
} from "lucide-react";

import {
  getRecommendations,
  getWeatherDescription,
  getWeatherIcon,
  estimateEntryCost
} from "@/lib/recommendations";

import type {
  City,
  Place,
  WeatherData
} from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map…</div>
});

type Tab = "discover" | "planner" | "saved";

const DEFAULT_CITY: City = {
  name: "Chennai",
  country: "India",
  latitude: 13.0827,
  longitude: 80.2707
};

export default function Home() {
  const [city, setCity] = useState<City>(DEFAULT_CITY);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [radius, setRadius] = useState(10);
  const [tab, setTab] = useState<Tab>("discover");
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("all");
  const [saved, setSaved] = useState<number[]>([]);
  const [tripDays, setTripDays] = useState(1);
  const [travellers, setTravellers] = useState(2);
  const [transport, setTransport] = useState("car");
  const [foodBudget, setFoodBudget] = useState(500);
  const [entryBudget, setEntryBudget] = useState(0);

  const temperature = useCallback(
    (value: number) =>
      unit === "C" ? Math.round(value) : Math.round(value * 9 / 5 + 32),
    [unit]
  );

  const loadWeather = useCallback(async (selectedCity: City) => {
    setLoadingWeather(true);
    setError("");

    try {
      const response = await fetch(
        `/api/weather?lat=${selectedCity.latitude}&lon=${selectedCity.longitude}`
      );

      if (!response.ok) throw new Error("Weather unavailable");

      const data: WeatherData = await response.json();
      setWeather(data);
    } catch {
      setError("Could not load weather. Please try again.");
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  const loadPlaces = useCallback(async (
    selectedCity: City,
    selectedRadius: number
  ) => {
    setLoadingPlaces(true);

    try {
      const response = await fetch(
        `/api/places?lat=${selectedCity.latitude}&lon=${selectedCity.longitude}&radius=${selectedRadius}`
      );

      if (!response.ok) throw new Error("Attractions unavailable");

      const data: Place[] = await response.json();
      setPlaces(data);
    } catch {
      setPlaces([]);
      setError("Attractions could not be loaded. Please try again later.");
    } finally {
      setLoadingPlaces(false);
    }
  }, []);

  useEffect(() => {
    void loadWeather(city);
    void loadPlaces(city, radius);
  }, [city, radius, loadWeather, loadPlaces]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mausam-saved");
      if (stored) setSaved(JSON.parse(stored));
    } catch {
      setSaved([]);
    }
  }, []);

  const updateSaved = (id: number) => {
    setSaved((previous) => {
      const next = previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id];

      localStorage.setItem("mausam-saved", JSON.stringify(next));
      return next;
    });
  };

  const searchCities = async () => {
    if (search.trim().length < 2) return;

    try {
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(search.trim())}`
      );

      if (!response.ok) throw new Error("Search failed");

      const data: City[] = await response.json();
      setSearchResults(data);
    } catch {
      setError("Unable to search for that city.");
    }
  };

  const selectCity = (selected: City) => {
    setCity({
      name: selected.name,
      country: selected.country,
      latitude: selected.latitude,
      longitude: selected.longitude
    });
    setSearch("");
    setSearchResults([]);
    setTab("discover");
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        selectCity({
          name: "My location",
          country: "India",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      () => setError("Location access was denied or unavailable.")
    );
  };

  const recommendations = useMemo(
    () => weather ? getRecommendations(weather) : [],
    [weather]
  );

  const filteredPlaces = useMemo(() => {
    let result = [...places];

    if (category !== "all") {
      result = result.filter((place) =>
        place.category.toLowerCase().includes(category)
      );
    }

    return result;
  }, [places, category]);

  const savedPlaces = places.filter((place) => saved.includes(place.id));

  const totalBudget = useMemo(() => {
    const travelCost =
      transport === "car" ? 1200 :
      transport === "bike" ? 500 :
      transport === "train" ? 300 :
      200;

    return (
      travelCost +
      foodBudget * travellers * tripDays +
      entryBudget * travellers
    );
  }, [transport, foodBudget, travellers, tripDays, entryBudget]);

  const openDirections = (place: Place) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const changeRadius = (value: number) => {
    setRadius(value);
  };

  const weatherCard = weather && (
    <section className="weather-card">
      <div className="weather-main">
        <div>
          <div className="eyebrow">CURRENT WEATHER</div>
          <h2>{city.name}</h2>
          <p className="muted">{city.country}</p>
          <div className="temperature">
            {getWeatherIcon(weather.current.code)}
            {temperature(weather.current.temperature)}°
            <button
              className="unit-button"
              onClick={() => setUnit(unit === "C" ? "F" : "C")}
              aria-label="Change temperature unit"
            >
              °{unit === "C" ? "F" : "C"}
            </button>
          </div>
          <p>{getWeatherDescription(weather.current.code)}</p>
          <p className="muted">
            Feels like {temperature(weather.current.feelsLike)}°{unit}
          </p>
        </div>

        <div className="weather-stats">
          <div>
            <Thermometer size={18} />
            <span>Feels like</span>
            <strong>{temperature(weather.current.feelsLike)}°</strong>
          </div>
          <div>
            <Droplets size={18} />
            <span>Humidity</span>
            <strong>{weather.current.humidity}%</strong>
          </div>
          <div>
            <Wind size={18} />
            <span>Wind</span>
            <strong>{weather.current.windSpeed} km/h</strong>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-icon"><CloudSun size={25} /></span>
          <span>
            <strong>Mausam & Miles</strong>
            <small>Weather meets discovery</small>
          </span>
        </a>

        <nav className="desktop-nav">
          <button
            className={tab === "discover" ? "nav-active" : ""}
            onClick={() => setTab("discover")}
          >
            Discover
          </button>
          <button
            className={tab === "planner" ? "nav-active" : ""}
            onClick={() => setTab("planner")}
          >
            Trip planner
          </button>
          <button
            className={tab === "saved" ? "nav-active" : ""}
            onClick={() => setTab("saved")}
          >
            Saved places
          </button>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow">YOUR NEXT EXPERIENCE STARTS HERE</div>
          <h1>Find the right place.<br />At the right time.</h1>
          <p>
            Discover nearby attractions, understand the weather and plan
            your next getaway.
          </p>

          <div className="search-area">
            <div className="search-box">
              <Search size={20} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void searchCities();
                }}
                placeholder="Search an Indian city..."
              />
              <button onClick={() => void searchCities()}>
                Search
              </button>
            </div>

            <button className="location-button" onClick={useMyLocation}>
              <Navigation size={16} /> Use my location
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.name}-${result.latitude}-${index}`}
                  onClick={() => selectCity(result)}
                >
                  <MapPin size={16} />
                  {result.name}, {result.state ? `${result.state}, ` : ""}
                  {result.country}
                </button>
              ))}
            </div>
          )}

          {error && <p className="error-message">{error}</p>}
        </div>
      </section>

      <div className="content">
        {tab === "discover" && (
          <>
            <div className="section-heading">
              <div>
                <div className="eyebrow">TODAY IN YOUR DESTINATION</div>
                <h2>Weather overview</h2>
              </div>
              <button
                className="refresh-button"
                onClick={() => {
                  void loadWeather(city);
                  void loadPlaces(city, radius);
                }}
              >
                <RefreshCw size={16} /> Refresh
              </button>
            </div>

            {loadingWeather && !weather ? (
              <div className="loading-card">Loading weather...</div>
            ) : weatherCard}

            {weather && (
              <>
                <section className="section-block">
                  <div className="section-heading">
                    <div>
                      <div className="eyebrow">PLAN AHEAD</div>
                      <h2>7-day forecast</h2>
                    </div>
                  </div>

                  <div className="forecast-grid">
                    {weather.daily.map((day) => (
                      <div className="forecast-card" key={day.date}>
                        <strong>
                          {new Date(day.date + "T12:00:00").toLocaleDateString(
                            "en-IN",
                            { weekday: "short" }
                          )}
                        </strong>
                        <span className="forecast-icon">
                          {getWeatherIcon(day.code)}
                        </span>
                        <strong>{temperature(day.max)}°</strong>
                        <span className="muted">{temperature(day.min)}°</span>
                        <small>Rain {day.rain}%</small>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="section-block">
                  <div className="section-heading">
                    <div>
                      <div className="eyebrow">NEXT 12 HOURS</div>
                      <h2>Hourly conditions</h2>
                    </div>
                  </div>

                  <div className="hourly-list">
                    {weather.hourly.map((hour) => (
                      <div className="hour-card" key={hour.time}>
                        <span>
                          {new Date(hour.time).toLocaleTimeString("en-IN", {
                            hour: "numeric"
                          })}
                        </span>
                        <Sun size={19} />
                        <strong>{temperature(hour.temperature)}°</strong>
                        <small>{hour.rainProbability}% rain</small>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            <section className="section-block">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">MAKE THE MOST OF TODAY</div>
                  <h2>What should you do today?</h2>
                </div>
              </div>

              <div className="recommendation-grid">
                {recommendations.map((item) => (
                  <article className="recommendation-card" key={item.title}>
                    <span className="recommendation-icon">
                      {item.type === "outdoor" ? "🌳" :
                       item.type === "indoor" ? "🏛️" : "👨‍👩‍👧"}
                    </span>
                    <span className="recommendation-type">
                      {item.type.toUpperCase()}
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <strong>{item.suitability}</strong>
                  </article>
                ))}
              </div>
            </section>

            <section className="section-block">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">EXPLORE AROUND YOU</div>
                  <h2>Nearby attractions</h2>
                  <p className="muted">
                    Discover places around {city.name}.
                  </p>
                </div>
                <div className="radius-control">
                  {[5, 10, 20, 30].map((value) => (
                    <button
                      key={value}
                      className={radius === value ? "selected" : ""}
                      onClick={() => changeRadius(value)}
                    >
                      {value} km
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-row">
                {[
                  ["all", "All places"],
                  ["museum", "Museums"],
                  ["park", "Parks"],
                  ["attraction", "Attractions"],
                  ["viewpoint", "Viewpoints"],
                  ["monument", "Monuments"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={category === value ? "filter-active" : ""}
                    onClick={() => setCategory(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {loadingPlaces ? (
                <div className="loading-card">Finding nearby attractions...</div>
              ) : (
                <div className="place-layout">
                  <div className="place-list">
                    {filteredPlaces.length === 0 && (
                      <p className="muted">
                        No attractions found in this radius. Try a larger
                        search radius.
                      </p>
                    )}

                    {filteredPlaces.map((place) => (
                      <article className="place-card" key={place.id}>
                        <div className="place-icon">📍</div>
                        <div className="place-info">
                          <h3>{place.name}</h3>
                          <p>{place.category.replaceAll("_", " ")}</p>
                          <small>{place.distance} km away</small>
                          <div className="place-actions">
                            <button onClick={() => openDirections(place)}>
                              <Navigation size={14} /> Directions
                            </button>
                            <button
                              onClick={() => updateSaved(place.id)}
                              className={saved.includes(place.id) ? "saved" : ""}
                            >
                              <Heart size={14} />
                              {saved.includes(place.id) ? "Saved" : "Save"}
                            </button>
                            {place.website && (
                              <a
                                href={place.website}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink size={14} /> Website
                              </a>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="map-panel">
                    <MapView
                      latitude={city.latitude}
                      longitude={city.longitude}
                      places={filteredPlaces}
                    />
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {tab === "planner" && (
          <section className="section-block planner-section">
            <div className="eyebrow">YOUR NEXT GETAWAY</div>
            <h2>Plan your trip</h2>
            <p className="muted">
              Create a simple trip budget for a day out or a weekend.
            </p>

            <div className="planner-grid">
              <div className="planner-card">
                <CalendarDays size={23} />
                <label htmlFor="days">Trip duration</label>
                <select
                  id="days"
                  value={tripDays}
                  onChange={(event) => setTripDays(Number(event.target.value))}
                >
                  <option value={1}>One day</option>
                  <option value={2}>Two days</option>
                  <option value={3}>Three days</option>
                  <option value={4}>Four days</option>
                  <option value={5}>Five days</option>
                  <option value={7}>One week</option>
                </select>
              </div>

              <div className="planner-card">
                <span className="planner-emoji">👥</span>
                <label htmlFor="travellers">Travellers</label>
                <input
                  id="travellers"
                  type="number"
                  min="1"
                  max="20"
                  value={travellers}
                  onChange={(event) =>
                    setTravellers(Math.max(1, Math.min(20, Number(event.target.value))))
                  }
                />
              </div>

              <div className="planner-card">
                <Navigation size={23} />
                <label htmlFor="transport">Transport</label>
                <select
                  id="transport"
                  value={transport}
                  onChange={(event) => setTransport(event.target.value)}
                >
                  <option value="car">Car — estimate ₹1,200</option>
                  <option value="bike">Bike — estimate ₹500</option>
                  <option value="train">Train — estimate ₹300</option>
                  <option value="bus">Bus — estimate ₹200</option>
                </select>
              </div>

              <div className="planner-card">
                <Wallet size={23} />
                <label htmlFor="food">Food budget per person / day</label>
                <input
                  id="food"
                  type="number"
                  min="0"
                  step="100"
                  value={foodBudget}
                  onChange={(event) =>
                    setFoodBudget(Math.max(0, Number(event.target.value)))
                  }
                />
              </div>

              <div className="planner-card">
                <MapPin size={23} />
                <label htmlFor="entry">Entry fees per person</label>
                <input
                  id="entry"
                  type="number"
                  min="0"
                  step="50"
                  value={entryBudget}
                  onChange={(event) =>
                    setEntryBudget(Math.max(0, Number(event.target.value)))
                  }
                />
              </div>
            </div>

            <div className="budget-result">
              <div>
                <div className="eyebrow">ESTIMATED TRIP BUDGET</div>
                <h2>₹{totalBudget.toLocaleString("en-IN")}</h2>
                <p>
                  Approximate total for {travellers} traveller(s) over {tripDays} day(s).
                </p>
              </div>
              <div className="budget-breakdown">
                <div>
                  <span>Transport estimate</span>
                  <strong>
                    ₹{(transport === "car" ? 1200 :
                      transport === "bike" ? 500 :
                      transport === "train" ? 300 : 200).toLocaleString("en-IN")}
                  </strong>
                </div>
                <div>
                  <span>Food estimate</span>
                  <strong>
                    ₹{(foodBudget * travellers * tripDays).toLocaleString("en-IN")}
                  </strong>
                </div>
                <div>
                  <span>Entry fees estimate</span>
                  <strong>
                    ₹{(entryBudget * travellers).toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>
            </div>

            <p className="disclaimer">
              These are illustrative planning estimates, not live quotes.
              Actual fares, fuel costs, tolls, food prices and entry fees may vary.
              The transport estimate is a simple allowance, not a route-based calculation.
            </p>
          </section>
        )}

        {tab === "saved" && (
          <section className="section-block">
            <div className="eyebrow">YOUR PERSONAL COLLECTION</div>
            <h2>Saved places</h2>
            <p className="muted">
              Your saved attractions are stored in this browser.
            </p>

            {savedPlaces.length === 0 ? (
              <div className="loading-card">
                No saved places are currently available. Save attractions
                from the Discover page.
              </div>
            ) : (
              <div className="place-list saved-list">
                {savedPlaces.map((place) => (
                  <article className="place-card" key={place.id}>
                    <div className="place-icon">❤️</div>
                    <div className="place-info">
                      <h3>{place.name}</h3>
                      <p>{place.distance} km away</p>
                      <div className="place-actions">
                        <button onClick={() => openDirections(place)}>
                          <Navigation size={14} /> Directions
                        </button>
                        <button onClick={() => updateSaved(place.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <footer className="footer">
          <div className="brand">
            <CloudSun size={22} />
            <strong>Mausam & Miles</strong>
          </div>
          <p>
            Weather data: Open-Meteo. Map and attraction data:
            OpenStreetMap contributors.
          </p>
          <p>Explore responsibly. Check local conditions before travelling.</p>
        </footer>
      </div>

      <nav className="mobile-nav">
        <button
          className={tab === "discover" ? "nav-active" : ""}
          onClick={() => setTab("discover")}
        >
          <Compass size={19} /> Discover
        </button>
        <button
          className={tab === "planner" ? "nav-active" : ""}
          onClick={() => setTab("planner")}
        >
          <CalendarDays size={19} /> Plan
        </button>
        <button
          className={tab === "saved" ? "nav-active" : ""}
          onClick={() => setTab("saved")}
        >
          <Heart size={19} /> Saved
        </button>
      </nav>
    </main>
  );
}
