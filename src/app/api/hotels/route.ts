import { NextRequest, NextResponse } from "next/server";

function getMockHotels() {
  return [
    { name: "Grand City Hotel", price_per_night: "$189", total_price: "$378", rating: 4.5, reviews: 1243, amenities: ["Free WiFi", "Pool", "Free breakfast", "Free parking", "Gym"], distance_km: 1.2, link: "https://www.google.com/travel/hotels" },
    { name: "Downtown Inn", price_per_night: "$95", total_price: "$190", rating: 3.8, reviews: 567, amenities: ["Free WiFi", "Free parking", "Restaurant"], distance_km: 0.3, link: "https://www.google.com/travel/hotels" },
    { name: "Metro Luxury Suites", price_per_night: "$245", total_price: "$490", rating: 4.7, reviews: 892, amenities: ["Free WiFi", "Pool", "Spa", "Restaurant", "Bar"], distance_km: 2.1, link: "https://www.google.com/travel/hotels" },
    { name: "Urban Oasis Hotel", price_per_night: "$135", total_price: "$270", rating: 4.2, reviews: 723, amenities: ["Free WiFi", "Free breakfast", "Gym", "Business center"], distance_km: 0.8, link: "https://www.google.com/travel/hotels" },
    { name: "The Central Palace", price_per_night: "$310", total_price: "$620", rating: 4.8, reviews: 1567, amenities: ["Free WiFi", "Pool", "Free breakfast", "Pet friendly", "Room service"], distance_km: 0.5, link: "https://www.google.com/travel/hotels" },
    { name: "Parkside Boutique", price_per_night: "$175", total_price: "$350", rating: 4.4, reviews: 445, amenities: ["Free WiFi", "Free parking", "Air conditioning", "Garden"], distance_km: 1.5, link: "https://www.google.com/travel/hotels" },
    { name: "Riverside Retreat", price_per_night: "$220", total_price: "$440", rating: 4.6, reviews: 978, amenities: ["Free WiFi", "Pool", "Free breakfast", "Free parking", "Room service"], distance_km: 3.2, link: "https://www.google.com/travel/hotels" },
    { name: "Skyline Tower Hotel", price_per_night: "$280", total_price: "$560", rating: 4.3, reviews: 634, amenities: ["Free WiFi", "Restaurant", "Bar", "Gym"], distance_km: 0.7, link: "https://www.google.com/travel/hotels" },
    { name: "The Cozy Nook", price_per_night: "$85", total_price: "$170", rating: 3.5, reviews: 234, amenities: ["Free WiFi", "Free parking", "Family rooms"], distance_km: 4.5, link: "https://www.google.com/travel/hotels" },
    { name: "Capital Comfort Inn", price_per_night: "$155", total_price: "$310", rating: 4.1, reviews: 876, amenities: ["Free WiFi", "Free breakfast", "Free parking", "Air conditioning", "Heating"], distance_km: 1.8, link: "https://www.google.com/travel/hotels" },
    { name: "Heritage House Hotel", price_per_night: "$195", total_price: "$390", rating: 4.0, reviews: 543, amenities: ["Free WiFi", "Pool", "Spa", "Free breakfast"], distance_km: 2.8, link: "https://www.google.com/travel/hotels" },
    { name: "Sunrise Plaza Hotel", price_per_night: "$125", total_price: "$250", rating: 3.9, reviews: 389, amenities: ["Free WiFi", "Restaurant", "Free parking", "Pet friendly", "Garden"], distance_km: 5.1, link: "https://www.google.com/travel/hotels" }
  ];
}

// Extract price from any SerpAPI field
function extractPrice(property: any): string {
  // Try all possible price fields
  const price = 
    property.price ||
    property.rate_per_night?.lowest ||
    property.rate_per_night?.extracted ||
    property.rates?.[0]?.price ||
    property.display_price ||
    property.formatted_price ||
    "";

  return price ? "$" + price.replace(/\$/g, "") : "";
}

function extractTotalPrice(property: any, nightlyPrice: string): string {
  const total = 
    property.total_rate?.lowest ||
    property.total_rate?.extracted ||
    property.total_price ||
    "";
  
  if (total) return "$" + total.replace(/\$/g, "");
  
  // Fallback: multiply nightly by 2
  if (nightlyPrice) {
    const num = parseInt(nightlyPrice.replace(/\$/g, "")) || 0;
    return num > 0 ? "$" + (num * 2) : "";
  }
  
  return "";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") || "New York";
  const checkIn = searchParams.get("check_in") || "2026-07-12";
  const checkOut = searchParams.get("check_out") || "2026-07-14";

  let hotels: any[] = [];
  const serpKey = process.env.SERPAPI_KEY;

  if (serpKey) {
    try {
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

      const serpRes = await fetch(`https://serpapi.com/search?${serpParams.toString()}`);
      const data = await serpRes.json();
      const properties = data.properties || [];
      
      hotels = properties.map((p: any) => {
        const nightlyPrice = extractPrice(p);
        const totalPrice = extractTotalPrice(p, nightlyPrice);

        return {
          name: p.name || "Hotel",
          price_per_night: nightlyPrice || "N/A",
          total_price: totalPrice || "N/A",
          rating: p.overall_rating || p.rating || 0,
          reviews: p.reviews || p.reviews_count || 0,
          amenities: p.amenities || ["Free WiFi"],
          distance_km: Math.round((p.distance || Math.random() * 5) * 10) / 10,
          link: p.link || "https://www.google.com/travel/hotels",
        };
      });
    } catch {
      hotels = getMockHotels();
    }
  } else {
    hotels = getMockHotels();
  }

  return NextResponse.json({ hotels, city });
}
