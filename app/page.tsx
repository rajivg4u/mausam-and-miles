"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  ExternalLink
} from "lucide-react";

import {
  getRecommendations,
  getWeatherDescription,
  getWeatherIcon
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
  const router = useRouter();
  const [city, setCity] = useState<City>(DEFAULT_CITY);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const searchRequestId = useRef(0);
  const [searchingCities, setSearchingCities] = useState(false);
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

  const [userName, setUserName] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const updateUser = (user: { email?: string; user_metadata?: { first_name?: string } } | null) => {
      if (!mounted) return;
      setIsAuthenticated(Boolean(user));
      setUserName(user ? (user.user_metadata?.first_name?.trim() || user.email?.split("@")[0] || "Traveller") : null);
      setAuthReady(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      updateUser(session?.user ?? null);
    });

    void supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (!mounted) return;
      if (!error) updateUser(user);
      else updateUser(null);
    }).catch(() => updateUser(null));

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const requireLogin = () => {
    if (!authReady) return false;
    if (!isAuthenticated) { router.push("/login?next=%2F"); return false; }
    return true;
  };

  async function logOut() {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setIsAuthenticated(false);
      setUserName(null);
      setWeather(null);
      setPlaces([]);
      setSearch("");
      setSearchResults([]);
      setTab("discover");
      router.refresh();
    } catch {
      setError("Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }


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
      console.warn("Attractions are temporarily unavailable.");
    } finally {
      setLoadingPlaces(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    void loadWeather(city);
    void loadPlaces(city, radius);
  }, [city, radius, loadWeather, loadPlaces, authReady, isAuthenticated]);

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

  const searchCities = useCallback(async (query: string) => {
    const term = query.trim();
    const requestId = ++searchRequestId.current;

    if (term.length < 2) {
      setSearchResults([]);
      setSearchingCities(false);
      return;
    }

    setSearchingCities(true);
    try {
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(term)}`
      );
      if (!response.ok) throw new Error("City search unavailable");
      const data: City[] = await response.json();
      if (requestId === searchRequestId.current) {
        setSearchResults(data);
      }
    } catch {
      if (requestId === searchRequestId.current) {
        setSearchResults([]);
      }
    } finally {
      if (requestId === searchRequestId.current) {
        setSearchingCities(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!authReady || !isAuthenticated || search.trim().length < 2) {
      searchRequestId.current += 1;
      setSearchResults([]);
      setSearchingCities(false);
      return;
    }
    const timer = window.setTimeout(() => {
      void searchCities(search);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, searchCities, authReady, isAuthenticated]);

  const selectCity = (selected: City) => {
    searchRequestId.current += 1;
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
  if (!requireLogin()) return;
  if (!navigator.geolocation) {
    setError("Location is not supported by this browser.");
    return;
  }

  setError("");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      try {
        const response = await fetch(
          `/api/reverse-geocode?lat=${latitude}&lon=${longitude}`
        );

        if (!response.ok) {
          throw new Error("Unable to identify location");
        }

        const location = await response.json();

        setCity({
          name: location.state
            ? `${location.name}, ${location.state}`
            : location.name,
          country: location.country || "India",
          latitude,
          longitude,
        });
      } catch {
        setCity({
          name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          country: "GPS coordinates",
          latitude,
          longitude,
        });
      }

      setSearch("");
      setSearchResults([]);
      setTab("discover");
    },
    () => {
      setError("Location access was denied or unavailable.");
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    }
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

    return result.sort((a, b) => a.distance - b.distance);
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
    <main className={`app-shell${!isAuthenticated ? " guest-shell" : ""}`}>
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-icon"><CloudSun size={25} /></span>
          <span>
            <strong>Mausam & Miles</strong>
            <small>Weather meets discovery</small>
          </span>
        </Link>

        <nav className="desktop-nav">
          <button
            className={tab === "discover" ? "nav-active" : ""}
            onClick={() => { if (requireLogin()) setTab("discover"); }}
          >
            Discover
          </button>
          <button
            className={tab === "planner" ? "nav-active" : ""}
            onClick={() => { if (requireLogin()) setTab("planner"); }}
          >
            Trip planner
          </button>
          <button
            className={tab === "saved" ? "nav-active" : ""}
            onClick={() => { if (requireLogin()) setTab("saved"); }}
          >
            Saved places
          </button>
        </nav>
        <div className="auth-nav">
          {authReady && (isAuthenticated ? (
            <>
              <span className="auth-user-name">Hi, {userName}</span>
              <button
                type="button"
                className="auth-login-btn"
                onClick={() => void logOut()}
                disabled={loggingOut}
              >
                {loggingOut ? "Logging out…" : "Log Out"}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="auth-login-btn">Log In</Link>
              <Link href="/signup" className="auth-signup-btn">Sign Up</Link>
            </>
          ))}
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow">YOUR NEXT EXPERIENCE STARTS HERE</div>
          <h1>Find the right place. At the right time.</h1>
          <p>
            Discover nearby attractions, understand the weather and plan
            your next getaway.
          </p>

          <div className="search-area">
            <div className="search-autocomplete">
              <div className="search-box">
                <Search size={20} />
                <input
                  value={isAuthenticated ? search : ""}
                  readOnly={!authReady || !isAuthenticated}
                  onFocus={() => { if (authReady && !isAuthenticated) router.push("/login?next=%2F"); }}
                  onClick={() => { if (authReady && !isAuthenticated) router.push("/login?next=%2F"); }}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSearchResults([]);
                    searchRequestId.current += 1;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (requireLogin()) void searchCities(search);
                    }
                    if (event.key === "Escape") {
                      setSearchResults([]);
                    }
                  }}
                  placeholder="Search a City, Town or Place..."
                  aria-label="Search for a city"
                  aria-autocomplete="list"
                  aria-controls="city-search-suggestions"
                  aria-expanded={searchResults.length > 0}
                  role="combobox"
                  autoComplete="off"
                />
                <button type="button" onClick={() => { if (requireLogin()) void searchCities(search); }}>
                  Search
                </button>
              </div>

              {isAuthenticated && searchResults.length > 0 && (
                <div className="search-results" id="city-search-suggestions" role="listbox">
                  {searchResults.map((result, index) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
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
              {searchingCities && searchResults.length === 0 && (
                <span className="sr-only" role="status">Searching cities…</span>
              )}
            </div>

            <button className="location-button" onClick={useMyLocation}>
              <Navigation size={16} /> Use my current location
            </button>
          </div>

          {error && <p className="error-message">{error}</p>}
          {!isAuthenticated && (
            <section className="guest-features" aria-label="What you can do with Mausam & Miles">
              <article className="guest-feature">
                <CloudSun size={28} aria-hidden="true" />
                <h2>Travel smarter</h2>
                <p>Know the weather before you go.</p>
              </article>
              <article className="guest-feature">
                <MapPin size={28} aria-hidden="true" />
                <h2>Discover more</h2>
                <p>Explore nearby attractions and hidden gems.</p>
              </article>
              <article className="guest-feature">
                <CalendarDays size={28} aria-hidden="true" />
                <h2>Plan with ease</h2>
                <p>Plan your next getaway and estimate costs.</p>
              </article>
            </section>
          )}
          {authReady && !isAuthenticated && (
            <p className="guest-registration">
              <Link href="/login">Log in</Link> or{" "}
              <Link href="/signup">create a free account</Link> to start exploring.
            </p>
          )}
        </div>
        {!isAuthenticated && (
          <footer className="guest-footer">
            <div className="guest-footer-brand"><CloudSun size={18} aria-hidden="true" /> Mausam &amp; Miles</div>
            <p>Weather data: Open-Meteo. Map data: OpenStreetMap contributors. Attraction data: Wikipedia and OpenStreetMap contributors.</p>
            <p>Explore responsibly. Check local conditions before travelling.</p>
          </footer>
        )}
      </section>

      <div className="content">
        {authReady && isAuthenticated && tab === "discover" && (
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
                    Showing up to 5 nearest places around {city.name}.
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

              <div className="place-layout">
                  <div className="place-list" key={`${city.latitude}:${city.longitude}:${radius}:${category}`} tabIndex={0} role="region" aria-label="Nearby attractions, scroll for more results">
                    {loadingPlaces && <div className="loading-card">Finding nearby attractions...</div>}
                    {!loadingPlaces && filteredPlaces.length === 0 && (
                      <p className="muted">
                        No attractions found in this radius. Try a larger
                        search radius.
                      </p>
                    )}

                    {!loadingPlaces && filteredPlaces.map((place) => (
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
                      places={loadingPlaces ? [] : filteredPlaces}
                    />
                  </div>
                </div>
            </section>
          </>
        )}

        {authReady && isAuthenticated && tab === "planner" && (
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

        {authReady && isAuthenticated && tab === "saved" && (
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
          onClick={() => { if (requireLogin()) setTab("discover"); }}
        >
          <Compass size={19} /> Discover
        </button>
        <button
          className={tab === "planner" ? "nav-active" : ""}
          onClick={() => { if (requireLogin()) setTab("planner"); }}
        >
          <CalendarDays size={19} /> Plan
        </button>
        <button
          className={tab === "saved" ? "nav-active" : ""}
          onClick={() => { if (requireLogin()) setTab("saved"); }}
        >
          <Heart size={19} /> Saved
        </button>
      </nav>
    </main>
  );
}
