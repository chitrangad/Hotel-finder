import { NextRequest, NextResponse } from "next/server";

interface HotelResult {
  name: string;
  price_per_night: string;
  total_price: string;
  rating: number;
  reviews: number;
  amenities: string[];
  distance_km: number;
  link: string;
}

function getDistanceFromLatLonInKm(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getMockHotels(centerLat: number, centerLon: number): HotelResult[] {
  const names = [
    "Grand City Hotel", "Downtown Inn", "Metro Luxury Suites", "Urban Oasis",
    "The Central Palace", "Parkside Boutique", "Riverside Retreat", "Skyline Tower Hotel",
    "The Cozy Nook", "Capital Comfort", "Heritage House", "Sunrise Plaza"
  ];
  return names.map((name) => {
    const dist = Math.random() * 15 + 0.5;
    const price = 70 + Math.floor(Math.random() * 150);
    const total = price * 2;
    return {
      name,
      price_per_night: `$${price}`,
      total_price: `$${total}`,
      rating: Math.round((3 + Math.random() * 2) * 10) / 10,
      reviews: Math.floor(Math.random() * 2000) + 50,
      amenities: ["Free WiFi"].concat(
        Math.random() > 0.5 ? ["Pool"] : [],
        Math.random() > 0.5 ? ["Free breakfast"] : [],
        Math.random() > 0.5 ? ["Free parking"] : []
      ),
      distance_km: Math.round(dist * 10) / 10,
      link: "https://www.google.com/travel/hotels",
    };
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") || "London";
  const checkIn = searchParams.get("check_in") || "2026-07-12";
  const checkOut = searchParams.get("check_out") || "2026-07-14";
  const amenities = searchParams.get("amenities")?.split(",") || [];
  const minStars = searchParams.get("stars") || "";
  const maxDistance = parseFloat(searchParams.get("max_distance") || "0") || 20;
  const sortBy = searchParams.get("sort_by") || "price";

  let centerLat = 51.5074, centerLon = -0.1278;
  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      { headers: { "User-Agent": "HotelFinderApp/1.0" } }
    );
    const nomData = await nomRes.json();
    if (nomData.length > 0) {
      centerLat = parseFloat(nomData[0].lat);
      centerLon = parseFloat(nomData[0].lon);
    }
  } catch {}

  let hotels: HotelResult[] = [];
  const serpKey = process.env.SERPAPI_KEY;

  if (serpKey) {
    const serpParams = new URLSearchParams({
      engine: "google_hotels",
      q: city,
      check_in_date: checkIn,
      check_out_date: checkOut,
      api_key: serpKey,
      currency: "USD",
      gl: "us",
      hl: "en",
    });
    const amenityMap: Record<string, string> = {
      pool: "4",
      "free-parking": "1",
      "free-breakfast": "7",
    };
    const amenityIds = amenities.filter(a => amenityMap[a]).map(a => amenityMap[a]);
    if (amenityIds.length) serpParams.set("amenities", amenityIds.join(","));
    if (minStars && !isNaN(parseInt(minStars))) serpParams.set("hotel_class", minStars);
    if (sortBy === "distance") serpParams.set("sort_by", "8");
    else serpParams.set("sort_by", "3");
    serpParams.set("ll", `@${centerLat},${centerLon},14z`);

    try {
      const serpRes = await fetch(`https://serpapi.com/search?${serpParams.toString()}`);
      const data = await serpRes.json();
      const properties = data.properties || [];
      hotels = properties.map((p: any) => {
        const lat = p.gps_coordinates?.latitude;
        const lon = p.gps_coordinates?.longitude;
        const dist = lat && lon ? getDistanceFromLatLonInKm(centerLat, centerLon, lat, lon) : 999;
        return {
          name: p.name,
          price_per_night: p.price || "N/A",
          total_price: p.total_rate?.lowest || p.price || "N/A",
          rating: p.overall_rating || 0,
          reviews: p.reviews || 0,
          amenities: p.amenities || [],
          distance_km: Math.round(dist * 10) / 10,
          link: p.link,
        };
      });
    } catch {
      hotels = getMockHotels(centerLat, centerLon);
    }
  } else {
    hotels = getMockHotels(centerLat, centerLon);
  }

  if (maxDistance > 0) hotels = hotels.filter(h => h.distance_km <= maxDistance);
  if (sortBy === "price") hotels.sort((a, b) => parseFloat(a.price_per_night.replace(/[^0-9.]/g, "")) - parseFloat(b.price_per_night.replace(/[^0-9.]/g, "")));
  else hotels.sort((a, b) => a.distance_km - b.distance_km);

  return NextResponse.json({ hotels, city, center: { lat: centerLat, lon: centerLon } });
}
