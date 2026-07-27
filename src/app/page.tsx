"use client";

import { useState, useEffect, useRef } from "react";

interface Hotel {
  name: string;
  price_per_night: string;
  total_price: string;
  rating: number;
  reviews: number;
  amenities: string[];
  distance_km: number;
  link: string;
}

interface CitySuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

export default function Home() {
  const [city, setCity] = useState("New York");
  const [cityInput, setCityInput] = useState("New York");
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [checkIn, setCheckIn] = useState("2026-07-12");
  const [checkOut, setCheckOut] = useState("2026-07-14");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [stars, setStars] = useState("");
  const [maxDistance, setMaxDistance] = useState(20);
  const [sortBy, setSortBy] = useState("price");
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [filteredHotels, setFilteredHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectingCheckIn, setSelectingCheckIn] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(6); // July
  const [calendarYear, setCalendarYear] = useState(2026);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const kmToMiles = (km: number) => Math.round(km * 0.621371 * 10) / 10;

  const searchCities = async (query: string) => {
    if (query.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=us&featureType=city&accept-language=en`,
        { headers: { "User-Agent": "HotelFinderApp/1.0" } }
      );
      const data = await res.json();
      setSuggestions(data.filter((item: any) => item.display_name.includes("United States") || item.display_name.includes("USA")));
      setShowSuggestions(true);
    } catch { setSuggestions([]); }
  };

  const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCityInput(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCities(e.target.value), 300);
  };

  const formatCityState = (displayName: string): string => {
    const parts = displayName.split(",");
    if (parts.length >= 2) {
      const city = parts[0].trim();
      let state = "";
      for (let i = 1; i < parts.length; i++) {
        const trimmed = parts[i].trim();
        if (trimmed.length === 2 || /^(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)$/i.test(trimmed)) {
          state = trimmed; break;
        }
      }
      return state ? `${city}, ${state}` : city;
    }
    return parts[0].trim();
  };

  const selectCity = (suggestion: CitySuggestion) => {
    setCityInput(formatCityState(suggestion.display_name));
    setCity(formatCityState(suggestion.display_name));
    setShowSuggestions(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) setShowSuggestions(false);
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) setShowCalendar(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleAmenity = (id: string) => {
    setAmenities(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const searchHotels = async () => {
    setLoading(true); setError(""); setSearched(true); setShowFilters(false);
    try {
      const params = new URLSearchParams({ city, check_in: checkIn, check_out: checkOut, max_distance: maxDistance.toString(), sort_by: "price" });
      if (amenities.length) params.set("amenities", amenities.join(","));
      if (stars) params.set("stars", stars);
      const res = await fetch(`/api/hotels?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");
      setHotels((await res.json()).hotels || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let result = [...hotels];
    if (maxDistance > 0) result = result.filter(h => kmToMiles(h.distance_km) <= maxDistance);
    if (stars) { const minStars = parseInt(stars); if (!isNaN(minStars)) result = result.filter(h => h.rating >= minStars); }
    if (amenities.length > 0) {
      result = result.filter((h) => {
        const hotelAmenitiesLower = h.amenities.map(a => a.toLowerCase());
        
        return amenities.every((requestedAmenity) => {
          // Pool matching: "pool", "outdoor pool", "swimming pool", "indoor pool"
          if (requestedAmenity === "pool") {
            return hotelAmenitiesLower.some(ha => ha.includes("pool"));
          }
          // Breakfast matching: "free breakfast", "breakfast", "breakfast ($)", "free breakfast ($)"
          if (requestedAmenity === "free-breakfast") {
            return hotelAmenitiesLower.some(ha => ha.includes("breakfast"));
          }
          // Parking matching: "free parking", "parking", "parking ($)"
          if (requestedAmenity === "free-parking") {
            return hotelAmenitiesLower.some(ha => ha.includes("parking") || ha.includes("free parking"));
          }
          // Default: partial match
          return hotelAmenitiesLower.some(ha => ha.includes(requestedAmenity.replace(/-/g, " ")));
        });
      });
    }
    if (sortBy === "price") {
      result.sort((a, b) => (parseFloat(a.price_per_night.replace(/[^0-9.]/g, "")) || 0) - (parseFloat(b.price_per_night.replace(/[^0-9.]/g, "")) || 0));
    } else {
      result.sort((a, b) => a.distance_km - b.distance_km);
    }
    setFilteredHotels(result);
  }, [hotels, maxDistance, stars, amenities, sortBy]);

  useEffect(() => { searchHotels(); }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getNights = () => {
    const d1 = new Date(checkIn + "T00:00:00");
    const d2 = new Date(checkOut + "T00:00:00");
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Calendar helpers
  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handleDateClick = (day: number) => {
    const clickedDate = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (selectingCheckIn) {
      setCheckIn(clickedDate);
      setCheckOut("");
      setSelectingCheckIn(false);
    } else {
      if (clickedDate > checkIn) {
        setCheckOut(clickedDate);
        setSelectingCheckIn(true);
        setShowCalendar(false);
      } else if (clickedDate === checkIn) {
        setShowCalendar(false);
        setSelectingCheckIn(true);
      } else {
        setCheckIn(clickedDate);
        setCheckOut("");
        setSelectingCheckIn(false);
      }
    }
  };

  const isSelected = (day: number) => {
    const date = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return date === checkIn || date === checkOut;
  };

  const isInRange = (day: number) => {
    if (!checkIn || !checkOut) return false;
    const date = new Date(calendarYear, calendarMonth, day);
    const start = new Date(checkIn + "T00:00:00");
    const end = new Date(checkOut + "T00:00:00");
    return date > start && date < end;
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #4c1d95 50%, #1e1b4b 100%)" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 10, background: "linear-gradient(90deg, rgba(49,46,129,0.95) 0%, rgba(76,29,149,0.95) 100%)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(251,191,36,0.2)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #ef4444 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Hotel Deals</h1>
          {searched && !loading && <span style={{ padding: "4px 12px", borderRadius: "999px", background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.3)", color: "#fde68a", fontSize: "0.875rem", fontWeight: 600 }}>{filteredHotels.length} found</span>}
        </div>
      </header>

      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "16px" }}>
        <div style={{ borderRadius: "16px", padding: "20px", marginBottom: "16px", background: "linear-gradient(135deg, rgba(30,27,75,0.95) 0%, rgba(49,46,129,0.8) 50%, rgba(76,29,149,0.9) 100%)", border: "1px solid rgba(251,191,36,0.2)", boxShadow: "0 25px 50px -12px rgba(251,191,36,0.15)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            
            {/* City */}
            <div style={{ position: "relative" }} ref={suggestionsRef}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#fde68a", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Destination</label>
              <input style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "rgba(0,0,0,0.4)", border: "2px solid rgba(251,191,36,0.2)", color: "white", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }} placeholder="Search US city..." value={cityInput} onChange={handleCityInputChange} onFocus={() => suggestions.length > 0 && setShowSuggestions(true)} />
              {showSuggestions && suggestions.length > 0 && (
                <div style={{ position: "absolute", top: "100%", marginTop: "8px", width: "100%", background: "#1e1b4b", border: "2px solid rgba(251,191,36,0.3)", borderRadius: "12px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", zIndex: 20, maxHeight: "192px", overflowY: "auto" }}>
                  {suggestions.map((s, i) => (
                    <button key={i} style={{ width: "100%", textAlign: "left", padding: "12px 16px", background: "transparent", border: "none", borderBottom: i < suggestions.length - 1 ? "1px solid rgba(251,191,36,0.1)" : "none", color: "white", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" }} onClick={() => selectCity(s)} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(251,191,36,0.2)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>{formatCityState(s.display_name)}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Single Date Range Picker */}
            <div style={{ position: "relative" }} ref={calendarRef}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#fde68a", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Dates</label>
              <button onClick={() => { setShowCalendar(!showCalendar); setSelectingCheckIn(true); }} style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "rgba(0,0,0,0.4)", border: "2px solid rgba(251,191,36,0.2)", color: "white", fontSize: "0.9rem", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", boxSizing: "border-box" }}>
                <span>
                  <span style={{ fontWeight: 700, color: "#fbbf24" }}>{formatDate(checkIn)}</span>
                  <span style={{ margin: "0 8px", color: "rgba(253,230,138,0.4)" }}>to</span>
                  <span style={{ fontWeight: 700, color: "#fbbf24" }}>{formatDate(checkOut)}</span>
                </span>
                <span style={{ color: "#fbbf24", fontSize: "0.8rem", fontWeight: 500 }}>{getNights()} {getNights() === 1 ? "night" : "nights"}</span>
              </button>

              {showCalendar && (
                <div style={{ position: "absolute", top: "100%", marginTop: "8px", width: "100%", maxWidth: "350px", background: "#1e1b4b", border: "2px solid rgba(251,191,36,0.3)", borderRadius: "16px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", zIndex: 20, padding: "16px" }}>
                  {/* Calendar header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <button onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); } else { setCalendarMonth(calendarMonth - 1); } }} style={{ background: "none", border: "none", color: "#fbbf24", fontSize: "1.2rem", cursor: "pointer", padding: "4px 8px" }}>&lt;</button>
                    <span style={{ color: "#fde68a", fontWeight: 700, fontSize: "0.95rem" }}>{monthNames[calendarMonth]} {calendarYear}</span>
                    <button onClick={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); } else { setCalendarMonth(calendarMonth + 1); } }} style={{ background: "none", border: "none", color: "#fbbf24", fontSize: "1.2rem", cursor: "pointer", padding: "4px 8px" }}>&gt;</button>
                  </div>

                  {/* Selecting indicator */}
                  <div style={{ textAlign: "center", marginBottom: "8px", fontSize: "0.75rem", color: "rgba(253,230,138,0.6)" }}>
                    {selectingCheckIn ? "Select check-in date" : "Select check-out date"}
                  </div>

                  {/* Day labels */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "4px" }}>
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                      <div key={d} style={{ textAlign: "center", fontSize: "0.7rem", color: "rgba(253,230,138,0.4)", padding: "4px" }}>{d}</div>
                    ))}
                  </div>

                  {/* Calendar days */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
                    {Array.from({ length: getFirstDayOfMonth(calendarMonth, calendarYear) }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: getDaysInMonth(calendarMonth, calendarYear) }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isPast = dateStr < today;
                      const selected = isSelected(day);
                      const inRange = isInRange(day);
                      const isCheckIn = dateStr === checkIn;
                      const isCheckOut = dateStr === checkOut;

                      return (
                        <button
                          key={day}
                          onClick={() => !isPast && handleDateClick(day)}
                          disabled={isPast}
                          style={{
                            padding: "8px",
                            borderRadius: "50%",
                            border: "none",
                            cursor: isPast ? "default" : "pointer",
                            fontSize: "0.8rem",
                            fontWeight: selected ? 700 : 400,
                            background: isCheckIn || isCheckOut 
                              ? "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)"
                              : inRange 
                                ? "rgba(251,191,36,0.2)"
                                : "transparent",
                            color: isPast 
                              ? "rgba(255,255,255,0.2)" 
                              : selected 
                                ? "white" 
                                : inRange 
                                  ? "#fbbf24" 
                                  : "rgba(255,255,255,0.7)",
                            transition: "all 0.15s"
                          }}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick select */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                    {[2, 3, 5, 7].map(n => (
                      <button key={n} onClick={() => {
                        const today = new Date();
                        const future = new Date(today);
                        future.setDate(future.getDate() + 2);
                        const checkOut = new Date(future);
                        checkOut.setDate(checkOut.getDate() + n);
                        setCheckIn(future.toISOString().split("T")[0]);
                        setCheckOut(checkOut.toISOString().split("T")[0]);
                        setShowCalendar(false);
                        setSelectingCheckIn(true);
                      }} style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: "8px",
                        background: "rgba(251,191,36,0.1)",
                        border: "1px solid rgba(251,191,36,0.2)",
                        color: "#fde68a",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        fontWeight: 500
                      }}>
                        {n} {n === 1 ? "night" : "nights"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Star Rating */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#fde68a", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Star Rating</label>
              <select style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "rgba(0,0,0,0.4)", border: "2px solid rgba(251,191,36,0.2)", color: "white", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }} value={stars} onChange={(e) => setStars(e.target.value)}>
                <option value="">All Ratings</option>
                <option value="3">3-Star & Above</option>
                <option value="4">4-Star & Above</option>
                <option value="5">5-Star Only</option>
              </select>
            </div>

            {/* Filters toggle */}
            <button onClick={() => setShowFilters(!showFilters)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderRadius: "12px", background: "rgba(0,0,0,0.4)", border: "2px solid rgba(251,191,36,0.2)", color: "#fde68a", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" }}>
              <span>Filters & Sort</span>
              <span style={{ padding: "2px 8px", borderRadius: "999px", background: "rgba(251,191,36,0.2)", fontSize: "0.75rem" }}>{showFilters ? 'Hide' : 'Show'}</span>
            </button>

            {showFilters && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "8px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#fde68a", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Amenities</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {[{ id: "pool", label: "Pool", activeGradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)" }, { id: "free-breakfast", label: "Breakfast", activeGradient: "linear-gradient(135deg, #f97316 0%, #f59e0b 100%)" }, { id: "free-parking", label: "Parking", activeGradient: "linear-gradient(135deg, #10b981 0%, #22c55e 100%)" }].map((amenity) => (
                      <button key={amenity.id} onClick={() => toggleAmenity(amenity.id)} style={{ padding: "8px 16px", borderRadius: "999px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", border: amenities.includes(amenity.id) ? "2px solid transparent" : "2px solid rgba(251,191,36,0.2)", background: amenities.includes(amenity.id) ? amenity.activeGradient : "rgba(0,0,0,0.3)", color: amenities.includes(amenity.id) ? "white" : "rgba(253,230,138,0.7)", boxShadow: amenities.includes(amenity.id) ? "0 10px 25px -5px rgba(0,0,0,0.3)" : "none" }}>{amenity.label}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#fde68a", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Max Distance: <span style={{ color: "#fbbf24", fontSize: "1rem" }}>{maxDistance} mi</span></label>
                  <input type="range" min="0" max="20" step="0.5" value={maxDistance} onChange={(e) => setMaxDistance(parseFloat(e.target.value))} style={{ width: "100%", height: "8px", borderRadius: "999px", background: "rgba(251,191,36,0.2)", outline: "none", accentColor: "#fbbf24", cursor: "pointer" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "rgba(253,230,138,0.5)", marginTop: "4px" }}><span>0 mi</span><span>20 mi</span></div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#fde68a", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Sort By</label>
                  <select style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "rgba(0,0,0,0.4)", border: "2px solid rgba(251,191,36,0.2)", color: "white", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="price">Price: Low to High</option>
                    <option value="distance">Distance: Nearest</option>
                  </select>
                </div>
              </div>
            )}

            {/* Search button */}
            <button onClick={searchHotels} style={{ width: "100%", padding: "16px", borderRadius: "12px", background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)", color: "white", fontSize: "1rem", fontWeight: 700, border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em", boxShadow: "0 20px 40px -10px rgba(239,68,68,0.4)" }}>Search Hotels</button>
          </div>
        </div>

        {/* Error / Loading / Results - same as before */}
        {error && <div style={{ borderRadius: "12px", padding: "16px", marginBottom: "16px", background: "linear-gradient(135deg, rgba(239,68,68,0.3) 0%, rgba(220,38,38,0.3) 100%)", border: "2px solid rgba(239,68,68,0.3)" }}><p style={{ color: "#fecaca", fontSize: "0.875rem", fontWeight: 500 }}>{error}</p></div>}

        {loading && (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <div style={{ width: "48px", height: "48px", border: "4px solid rgba(251,191,36,0.2)", borderTop: "4px solid #fbbf24", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px", boxShadow: "0 0 30px rgba(251,191,36,0.2)" }} />
            <p style={{ color: "#fde68a", fontWeight: 500 }}>Searching best deals...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!loading && filteredHotels.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredHotels.map((h, i) => (
              <div key={i} style={{ borderRadius: "16px", padding: "16px", background: "linear-gradient(135deg, rgba(30,27,75,0.95) 0%, rgba(49,46,129,0.9) 100%)", border: "2px solid rgba(251,191,36,0.15)", boxShadow: "0 10px 30px -10px rgba(251,191,36,0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: "12px" }}>
                    <h3 style={{ fontWeight: 700, color: "white", fontSize: "1rem", margin: "0 0 4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: "8px", background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)", color: "white", fontSize: "0.75rem", fontWeight: 700 }}>{h.rating}</span>
                      <span style={{ color: "rgba(253,230,138,0.6)", fontSize: "0.75rem" }}>{h.reviews.toLocaleString()} reviews</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fbbf24" }}>{h.price_per_night}</div>
                    <div style={{ color: "rgba(253,230,138,0.5)", fontSize: "0.75rem", marginTop: "2px" }}>per night</div>
                  </div>
                </div>
                <div style={{ color: "rgba(253,230,138,0.5)", fontSize: "0.75rem", marginBottom: "8px" }}>{kmToMiles(h.distance_km)} mi from center</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "12px" }}>
                  {h.amenities.slice(0, 3).map((a, j) => (
                    <span key={j} style={{ padding: "2px 8px", borderRadius: "6px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.15)", color: "rgba(253,230,138,0.7)", fontSize: "0.7rem" }}>{a}</span>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "rgba(253,230,138,0.5)", fontSize: "0.75rem" }}>Total: <span style={{ color: "rgba(253,230,138,0.8)" }}>{h.total_price}</span></span>
                  <a href={h.link} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 20px", borderRadius: "10px", background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)", color: "white", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none", boxShadow: "0 10px 20px -5px rgba(239,68,68,0.3)" }}>View Deal</a>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && searched && filteredHotels.length === 0 && !error && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ color: "rgba(253,230,138,0.6)", fontSize: "1rem" }}>No hotels found</p>
            <p style={{ color: "rgba(253,230,138,0.4)", fontSize: "0.875rem", marginTop: "4px" }}>Try adjusting filters</p>
          </div>
        )}
      </main>
    </div>
  );
}
