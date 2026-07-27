"use client";

import { useState, useEffect } from "react";

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

export default function Home() {
  const [city, setCity] = useState("London");
  const [checkIn, setCheckIn] = useState("2026-07-12");
  const [checkOut, setCheckOut] = useState("2026-07-14");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [stars, setStars] = useState("");
  const [maxDistance, setMaxDistance] = useState(20);
  const [sortBy, setSortBy] = useState("price");
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const amenityOptions = [
    { id: "pool", label: "Pool" },
    { id: "free-breakfast", label: "Free Breakfast" },
    { id: "free-parking", label: "Free Parking" },
  ];

  const toggleAmenity = (id: string) => {
    setAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const searchHotels = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        city,
        check_in: checkIn,
        check_out: checkOut,
        max_distance: maxDistance.toString(),
        sort_by: sortBy,
      });
      if (amenities.length) params.set("amenities", amenities.join(","));
      if (stars) params.set("stars", stars);

      const res = await fetch(`/api/hotels?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setHotels(data.hotels || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Search on first load
  useEffect(() => {
    searchHotels();
  }, []);

  return (
    <main className="max-w-7xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">� Last-Minute Hotel Deals</h1>

      {/* Search form */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block mb-1 text-sm">City</label>
          <input
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1 text-sm">Check-in</label>
          <input
            type="date"
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            value={checkIn}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1 text-sm">Check-out</label>
          <input
            type="date"
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            value={checkOut}
            min={checkIn}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1 text-sm">Star rating</label>
          <select
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            value={stars}
            onChange={(e) => setStars(e.target.value)}
          >
            <option value="">All</option>
            <option value="3">3★ & up</option>
            <option value="4">4★ & up</option>
            <option value="5">5★</option>
          </select>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-4 items-end mb-6">
        <div className="flex gap-2">
          {amenityOptions.map((opt) => (
            <label key={opt.id} className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={amenities.includes(opt.id)}
                onChange={() => toggleAmenity(opt.id)}
              />
              {opt.label}
            </label>
          ))}
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">
            Max distance to downtown: {maxDistance} km
          </label>
          <input
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={maxDistance}
            onChange={(e) => setMaxDistance(parseFloat(e.target.value))}
          />
        </div>
        <div>
          <select
            className="p-2 rounded bg-gray-800 border border-gray-700"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="price">Sort by price</option>
            <option value="distance">Sort by distance</option>
          </select>
        </div>
        <button
          onClick={searchHotels}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold"
        >
          Search
        </button>
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}
      {loading && <p className="text-gray-400">Searching...</p>}

      {/* Results table */}
      {!loading && hotels.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-800 text-left">
                <th className="p-3">Hotel</th>
                <th className="p-3">Price/Night</th>
                <th className="p-3">Total</th>
                <th className="p-3">Rating</th>
                <th className="p-3">Reviews</th>
                <th className="p-3">Amenities</th>
                <th className="p-3">Distance</th>
                <th className="p-3">Deal</th>
              </tr>
            </thead>
            <tbody>
              {hotels.map((h, i) => (
                <tr key={i} className="border-b border-gray-700 hover:bg-gray-800/50">
                  <td className="p-3 font-medium">{h.name}</td>
                  <td className="p-3">{h.price_per_night}</td>
                  <td className="p-3">{h.total_price}</td>
                  <td className="p-3">{h.rating} ★</td>
                  <td className="p-3">{h.reviews.toLocaleString()}</td>
                  <td className="p-3 text-sm">
                    {h.amenities.slice(0, 3).join(", ")}
                    {h.amenities.length > 3 && "..."}
                  </td>
                  <td className="p-3">{h.distance_km} km</td>
                  <td className="p-3">
                    <a
                      href={h.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      View Deal →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && hotels.length === 0 && !error && (
        <p className="text-gray-400">No hotels found for these filters.</p>
      )}
    </main>
  );
}
