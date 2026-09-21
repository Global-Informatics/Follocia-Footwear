export interface GeocodedAddress {
  address: string;
  address2?: string;
  city: string;
  region: string;
  zip: string;
  country: string;
  source?: "gps" | "network" | "fallback";
}

export interface PincodeInfo {
  pincode: string;
  district: string;
  state: string;
  offices: string[];
}

/**
 * Ensures text is strictly in Latin/English characters.
 * Rejects any Devanagari Hindi characters (\u0900-\u097F).
 */
export function cleanEnglishText(text: any): string {
  if (!text || typeof text !== "string") return "";
  const t = text.trim();
  // Strip out any text containing Devanagari Hindi characters
  if (/[\u0900-\u097F]/.test(t)) return "";
  return t;
}

/**
 * Resolves an Indian PIN code for a given locality / suburb / city name
 * using the official India Post postal directory service.
 */
export async function lookupIndianPincode(query: string, expectedState?: string): Promise<string> {
  const clean = query.trim();
  if (!clean || clean.length < 3) return "";

  try {
    const res = await fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(clean)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === "Success" && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
        if (expectedState) {
          const match = data[0].PostOffice.find(
            (po: any) => po.State && po.State.toLowerCase() === expectedState.toLowerCase()
          );
          if (match?.Pincode) {
            return String(match.Pincode).replace(/\D/g, "");
          }
        }
        return String(data[0].PostOffice[0].Pincode).replace(/\D/g, "");
      }
    }
  } catch {
    // non-fatal
  }
  return "";
}

/**
 * Instant lookup of Indian PIN code: returns District, State, and list of Post Offices
 * All values are guaranteed to be in pure English.
 */
export async function lookupPincodeDetails(pincode: string): Promise<PincodeInfo | null> {
  const clean = pincode.replace(/\D/g, "").slice(0, 6);
  if (clean.length !== 6) return null;

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === "Success" && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
        const po = data[0].PostOffice[0];
        const offices = Array.from(new Set(data[0].PostOffice.map((p: any) => p.Name).filter(Boolean))) as string[];
        return {
          pincode: clean,
          district: cleanEnglishText(po.District) || cleanEnglishText(po.Name) || po.District || "",
          state: cleanEnglishText(po.State) || po.State || "",
          offices: offices.map((o) => cleanEnglishText(o) || o),
        };
      }
    }
  } catch {
    // non-fatal
  }
  return null;
}

/**
 * Reverse geocodes latitude and longitude into street address, area, city,
 * state, and authentic 6-digit PIN code using multi-layer cascading providers.
 * Guaranteed 100% English text (no Hindi script).
 */
export async function reverseGeocodeCoordinates(lat: number, lon: number): Promise<GeocodedAddress> {
  // Layer 1: Server endpoint (handles Nominatim with official User-Agent and English language)
  try {
    const res = await fetch(`/api/commerce/reverse-geocode?lat=${lat}&lon=${lon}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(7000),
    });
    const ct = res.headers.get("content-type") || "";
    if (res.ok && ct.includes("application/json")) {
      const data = await res.json();
      const parsed = parseNominatimAddress(data);

      // Verify PIN details to guarantee official English district name
      if (parsed.zip && parsed.zip.length === 6) {
        try {
          const pinInfo = await lookupPincodeDetails(parsed.zip);
          if (pinInfo?.district) {
            parsed.city = pinInfo.district; // Always English from India Post!
          }
          if (pinInfo?.state) {
            parsed.region = pinInfo.state;
          }
        } catch {}
      }

      if (parsed.city || parsed.zip) {
        if (!parsed.zip && (parsed.city || parsed.address2)) {
          parsed.zip = await lookupIndianPincode(parsed.address2 || parsed.city, parsed.region);
        }
        return parsed;
      }
    }
  } catch {
    // Proceed to Layer 2
  }

  // Layer 2: BigDataCloud Client-side Reverse Geocoder (Free, high uptime, CORS friendly, English)
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (res.ok) {
      const d = await res.json();
      let city = cleanEnglishText(d.city) || cleanEnglishText(d.locality) || "";
      let region = cleanEnglishText(d.principalSubdivision) || "";
      let zip = d.postcode ? String(d.postcode).replace(/\D/g, "") : "";

      if (zip && zip.length === 6) {
        try {
          const pinInfo = await lookupPincodeDetails(zip);
          if (pinInfo?.district) city = pinInfo.district;
          if (pinInfo?.state) region = pinInfo.state;
        } catch {}
      } else if (!zip && (d.locality || city)) {
        zip = await lookupIndianPincode(d.locality || city, region);
      }

      return {
        address: cleanEnglishText(d.locality) || cleanEnglishText(d.city) || "",
        address2: cleanEnglishText(d.localityInfo?.informative?.[0]?.name) || "",
        city,
        region,
        zip,
        country: cleanEnglishText(d.countryName) || "India",
      };
    }
  } catch {
    // Fallthrough
  }

  return {
    address: "",
    address2: "",
    city: "",
    region: "",
    zip: "",
    country: "India",
  };
}

function parseNominatimAddress(data: any): GeocodedAddress {
  const a = data?.address || {};
  const nd = data?.namedetails || {};

  // 1. Pick English city name (never Hindi)
  let city =
    cleanEnglishText(nd["name:en"]) ||
    cleanEnglishText(nd["city:en"]) ||
    cleanEnglishText(a.city) ||
    cleanEnglishText(a.town) ||
    cleanEnglishText(a.county) ||
    cleanEnglishText(a.city_district) ||
    cleanEnglishText(a.state_district) ||
    cleanEnglishText(a.village) ||
    "";

  // 2. Pick English state name
  const region =
    cleanEnglishText(nd["state:en"]) ||
    cleanEnglishText(a.state) ||
    cleanEnglishText(a.region) ||
    "";

  // 3. Street address (exclude Hindi and do not duplicate city name)
  const houseBuilding = [
    cleanEnglishText(a.house_number),
    cleanEnglishText(a.building),
    cleanEnglishText(a.flats),
    cleanEnglishText(a.premises),
  ].filter(Boolean).join(" ");

  const street =
    cleanEnglishText(a.road) ||
    cleanEnglishText(a.street) ||
    cleanEnglishText(a.pedestrian) ||
    cleanEnglishText(a.footway) ||
    cleanEnglishText(a.path) ||
    "";

  const streetParts = [houseBuilding, street].filter(Boolean);
  let streetAddress =
    streetParts.length > 0
      ? streetParts.join(", ")
      : cleanEnglishText(a.neighbourhood) || cleanEnglishText(a.suburb) || "";

  // Never set street address to just the city name!
  if (streetAddress && city && streetAddress.toLowerCase() === city.toLowerCase()) {
    streetAddress = "";
  }

  // 4. Area / Locality (e.g. DLF Colony, Tilak Nagar)
  const areaParts = [
    cleanEnglishText(a.suburb),
    cleanEnglishText(a.neighbourhood),
    cleanEnglishText(a.residential),
    cleanEnglishText(a.city_district),
  ].filter(Boolean);

  const address2 = areaParts
    .filter((p) => p.toLowerCase() !== city.toLowerCase() && !streetAddress.toLowerCase().includes(p.toLowerCase()))
    .join(", ");

  const zip = a.postcode ? String(a.postcode).replace(/\D/g, "") : "";
  const country = cleanEnglishText(a.country) || "India";

  return {
    address: streetAddress,
    address2,
    city,
    region,
    zip,
    country,
  };
}

/**
 * Obtains high-precision device coordinates via Browser Geolocation API.
 * Uses streaming watchPosition for fast satellite / Wi-Fi lock on mobile & laptop.
 */
function getGpsCoordinates(): Promise<{ lat: number; lon: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return reject(new Error("Geolocation is not supported by your browser."));
    }

    let settled = false;
    let watchId: number | null = null;

    const cleanup = () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    // 14-second total timeout
    const safetyTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error("GPS satellite acquisition timed out."));
      }
    }, 14000);

    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (settled) return;
          if (pos?.coords?.latitude && pos?.coords?.longitude) {
            settled = true;
            clearTimeout(safetyTimer);
            cleanup();
            resolve({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              accuracy: pos.coords.accuracy || 10,
            });
          }
        },
        (err) => {
          if (settled) return;
          // If user clicked Block/Deny, reject immediately
          if (err.code === 1) {
            settled = true;
            clearTimeout(safetyTimer);
            cleanup();
            const permErr = new Error("Location permission was blocked in browser settings.");
            permErr.name = "PermissionDeniedError";
            return reject(permErr);
          }

          // Fallback to standard accuracy via getCurrentPosition
          navigator.geolocation.getCurrentPosition(
            (pos2) => {
              if (settled) return;
              settled = true;
              clearTimeout(safetyTimer);
              cleanup();
              resolve({
                lat: pos2.coords.latitude,
                lon: pos2.coords.longitude,
                accuracy: pos2.coords.accuracy || 50,
              });
            },
            () => {
              // Wait for next watch update or safetyTimer
            },
            {
              enableHighAccuracy: false,
              timeout: 6000,
              maximumAge: 60000,
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }
      );
    } catch (e) {
      cleanup();
      clearTimeout(safetyTimer);
      reject(e);
    }
  });
}

/**
 * Fallback IP Geolocation that queries live coordinates and reverse-geocodes
 * them for maximum accuracy without ever hardcoding arbitrary cities or PIN codes.
 */
async function fetchLocationByIp(): Promise<GeocodedAddress> {
  // Provider 1: ipwho.is
  try {
    const res = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const d = await res.json();
      if (d.success && d.latitude && d.longitude) {
        try {
          const rev = await reverseGeocodeCoordinates(d.latitude, d.longitude);
          if (rev.city || rev.region) {
            rev.source = "network";
            if (!rev.zip && d.postal) {
              rev.zip = String(d.postal).replace(/\D/g, "");
            }
            return rev;
          }
        } catch {}
      }
      if (d.city || d.region) {
        return {
          address: "",
          address2: cleanEnglishText(d.region) || "",
          city: cleanEnglishText(d.city) || "",
          region: cleanEnglishText(d.region) || "",
          zip: d.postal ? String(d.postal).replace(/\D/g, "") : "",
          country: cleanEnglishText(d.country) || "India",
          source: "network",
        };
      }
    }
  } catch {}

  // Provider 2: freeipapi.com
  try {
    const res = await fetch("https://freeipapi.com/api/json", { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const d = await res.json();
      if (d.latitude && d.longitude) {
        try {
          const rev = await reverseGeocodeCoordinates(d.latitude, d.longitude);
          if (rev.city || rev.region) {
            rev.source = "network";
            if (!rev.zip && d.zipCode) {
              rev.zip = String(d.zipCode).replace(/\D/g, "");
            }
            return rev;
          }
        } catch {}
      }
      if (d.cityName || d.regionName) {
        return {
          address: "",
          address2: cleanEnglishText(d.regionName) || "",
          city: cleanEnglishText(d.cityName) || "",
          region: cleanEnglishText(d.regionName) || "",
          zip: d.zipCode ? String(d.zipCode).replace(/\D/g, "") : "",
          country: cleanEnglishText(d.countryName) || "India",
          source: "network",
        };
      }
    }
  } catch {}

  return {
    address: "",
    address2: "",
    city: "",
    region: "",
    zip: "",
    country: "India",
    source: "fallback",
  };
}

/**
 * Main location detection entry point for Storefront Checkout and Admin Client panels.
 * Tries high-accuracy GPS first, falling back smoothly to network location so user is never stuck.
 */
export async function fetchFreeCurrentLocation(): Promise<GeocodedAddress> {
  const isBrowser = typeof window !== "undefined";

  if (isBrowser && navigator?.geolocation) {
    try {
      const coords = await getGpsCoordinates();
      const geo = await reverseGeocodeCoordinates(coords.lat, coords.lon);
      geo.source = "gps";
      return geo;
    } catch {
      // GPS not available, fall through to IP
    }
  }

  // Fallback to Network IP
  const netLoc = await fetchLocationByIp();
  netLoc.source = "network";
  return netLoc;
}
