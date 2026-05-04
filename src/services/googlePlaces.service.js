import { ApiError } from "../utils/ApiError.js";

const PLACES_BASE_URL = "https://places.googleapis.com/v1";
const DEFAULT_FIELD_MASK = [
  "places.id",
  "places.name",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.photos",
  "places.types",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.googleMapsUri",
  "places.websiteUri",
  "places.businessStatus"
].join(",");

const getPlacesApiKey = () => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_SERVER_API_KEY;

  if (!apiKey) {
    throw new ApiError(500, "Google Places API key is not configured");
  }

  return apiKey;
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const calculateDistanceKm = (from, to) => {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lngDelta = toRadians(to.longitude - from.longitude);
  const startLat = toRadians(from.latitude);
  const endLat = toRadians(to.latitude);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const callPlacesApi = async (path, body) => {
  const response = await fetch(`${PLACES_BASE_URL}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getPlacesApiKey(),
      "X-Goog-FieldMask": DEFAULT_FIELD_MASK
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, data.error?.message || "Google Places request failed", data.error?.details || []);
  }

  return data.places || [];
};

const buildSearchBody = ({ latitude, longitude, rangeKm, specialty, maxResultCount }) => {
  const radius = Math.min(Number(rangeKm) * 1000, 50000);
  const circle = {
    center: {
      latitude,
      longitude
    },
    radius
  };

  if (specialty) {
    return {
      textQuery: `${specialty} hospital`,
      includedType: "hospital",
      strictTypeFiltering: true,
      maxResultCount,
      languageCode: process.env.GOOGLE_PLACES_LANGUAGE_CODE || "en",
      regionCode: process.env.GOOGLE_PLACES_REGION_CODE || "IN",
      locationRestriction: {
        circle
      }
    };
  }

  return {
    includedTypes: ["hospital"],
    maxResultCount,
    languageCode: process.env.GOOGLE_PLACES_LANGUAGE_CODE || "en",
    regionCode: process.env.GOOGLE_PLACES_REGION_CODE || "IN",
    locationRestriction: {
      circle
    }
  };
};

const getPhotoUrl = (photoName, req) => {
  if (!photoName) {
    return null;
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/api/hospital-locator/photo?name=${encodeURIComponent(photoName)}&maxWidthPx=700`;
};

const inferSpecialties = (place) => {
  const specialtyLabels = new Set();

  if (place.primaryTypeDisplayName?.text) {
    specialtyLabels.add(place.primaryTypeDisplayName.text);
  }

  for (const type of place.types || []) {
    const label = type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    if (!["Point Of Interest", "Establishment", "Health"].includes(label)) {
      specialtyLabels.add(label);
    }
  }

  return Array.from(specialtyLabels);
};

const inferConsultations = (place) => {
  const consultations = ["In-person consultation"];

  if (place.nationalPhoneNumber || place.internationalPhoneNumber) {
    consultations.push("Phone enquiry");
  }

  if (place.websiteUri) {
    consultations.push("Online information or booking");
  }

  if (place.types?.includes("emergency_room")) {
    consultations.push("Emergency care");
  }

  return consultations;
};

const formatGooglePlace = (place, currentLocation, req) => {
  const photo = place.photos?.[0];
  const distanceKm = place.location ? calculateDistanceKm(currentLocation, place.location) : null;

  return {
    placeId: place.id,
    googlePlaceName: place.name,
    name: place.displayName?.text || "Hospital",
    profilePicture: getPhotoUrl(photo?.name, req),
    photoAttributions: photo?.authorAttributions || [],
    address: place.formattedAddress || "",
    phone: place.internationalPhoneNumber || place.nationalPhoneNumber || "",
    specialties: inferSpecialties(place),
    consultations: inferConsultations(place),
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    distanceKm: distanceKm === null ? null : Number(distanceKm.toFixed(2)),
    googleMapsUri: place.googleMapsUri,
    websiteUri: place.websiteUri,
    businessStatus: place.businessStatus,
    source: "google_places"
  };
};

const searchNearbyHospitalsFromGoogle = async ({ latitude, longitude, rangeKm, specialty, maxResultCount = 20 }, req) => {
  const body = buildSearchBody({
    latitude,
    longitude,
    rangeKm,
    specialty,
    maxResultCount
  });
  const path = specialty ? "places:searchText" : "places:searchNearby";
  const places = await callPlacesApi(path, body);
  const currentLocation = { latitude, longitude };

  return places
    .map((place) => formatGooglePlace(place, currentLocation, req))
    .filter((place) => place.distanceKm === null || place.distanceKm <= Number(rangeKm))
    .sort((first, second) => (first.distanceKm ?? Infinity) - (second.distanceKm ?? Infinity));
};

const getGooglePhotoMediaUrl = (photoName, { maxWidthPx = 700, maxHeightPx }) => {
  if (!photoName?.startsWith("places/") || !photoName.includes("/photos/")) {
    throw new ApiError(400, "A valid Google photo name is required");
  }

  const params = new URLSearchParams({
    key: getPlacesApiKey()
  });

  if (maxWidthPx) {
    params.set("maxWidthPx", String(maxWidthPx));
  }

  if (maxHeightPx) {
    params.set("maxHeightPx", String(maxHeightPx));
  }

  return `${PLACES_BASE_URL}/${photoName}/media?${params.toString()}`;
};

export { getGooglePhotoMediaUrl, searchNearbyHospitalsFromGoogle };
