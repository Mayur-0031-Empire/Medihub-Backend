import Hospital from "../models/hospital.model.js";
import { getGooglePhotoMediaUrl, searchNearbyHospitalsFromGoogle } from "../services/googlePlaces.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const parseList = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  try {
    const parsedValue = JSON.parse(value);
    if (Array.isArray(parsedValue)) {
      return parsedValue.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch (_error) {
    // Fall back to comma separated values.
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const validateCoordinateInput = ({ latitude, longitude, rangeKm }) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const range = Number(rangeKm);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new ApiError(400, "latitude must be a valid number between -90 and 90");
  }

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new ApiError(400, "longitude must be a valid number between -180 and 180");
  }

  if (!Number.isFinite(range) || range <= 0 || range > 50) {
    throw new ApiError(400, "rangeKm must be a valid number between 1 and 50");
  }

  return { lat, lng, range };
};

const getMapConfig = (_req, res) => {
  return res.status(200).json(
    new ApiResponse(200, "Google Maps configuration fetched successfully", {
      mapId: process.env.GOOGLE_MAPS_MAP_ID || "",
      libraries: ["maps", "marker", "places"],
      defaultCenter: {
        latitude: Number(process.env.GOOGLE_MAPS_DEFAULT_LATITUDE || 20.5937),
        longitude: Number(process.env.GOOGLE_MAPS_DEFAULT_LONGITUDE || 78.9629)
      },
      defaultZoom: Number(process.env.GOOGLE_MAPS_DEFAULT_ZOOM || 12),
      hasBrowserMapKey: Boolean(process.env.GOOGLE_MAPS_BROWSER_API_KEY),
      provider: "google_maps"
    })
  );
};

const formatHospital = (hospital) => {
  const source = hospital.toObject ? hospital.toObject() : hospital;
  const distanceInMeters = source.distanceInMeters ?? 0;

  return {
    _id: source._id,
    name: source.name,
    profilePicture: source.profilePicture,
    address: source.address,
    phone: source.phone,
    specialties: source.specialties,
    consultations: source.consultations,
    latitude: source.location.coordinates[1],
    longitude: source.location.coordinates[0],
    distanceKm: Number((distanceInMeters / 1000).toFixed(2))
  };
};

const createHospital = asyncHandler(async (req, res) => {
  const { name, profilePicture, address, phone, latitude, longitude } = req.body;
  const lat = Number(latitude);
  const lng = Number(longitude);

  if ([name, address, phone].some((field) => !String(field ?? "").trim())) {
    throw new ApiError(400, "name, address, and phone are required");
  }

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new ApiError(400, "latitude must be a valid number between -90 and 90");
  }

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new ApiError(400, "longitude must be a valid number between -180 and 180");
  }

  const hospital = await Hospital.create({
    name,
    profilePicture,
    address,
    phone,
    specialties: parseList(req.body.specialties),
    consultations: parseList(req.body.consultations),
    location: {
      type: "Point",
      coordinates: [lng, lat]
    }
  });

  return res.status(201).json(new ApiResponse(201, "Hospital profile created successfully", formatHospital(hospital)));
});

const listHospitals = asyncHandler(async (req, res) => {
  const filter = { isActive: true };

  if (req.query.search) {
    filter.$text = { $search: req.query.search };
  }

  if (req.query.specialty) {
    filter.specialties = { $regex: req.query.specialty, $options: "i" };
  }

  const hospitals = await Hospital.find(filter).sort({ createdAt: -1 }).limit(100);

  return res.status(200).json(
    new ApiResponse(
      200,
      "Hospitals fetched successfully",
      hospitals.map((hospital) => formatHospital(hospital))
    )
  );
});

const findNearbyHospitals = asyncHandler(async (req, res) => {
  const { lat, lng, range } = validateCoordinateInput(req.query);
  const maxResultCount = Number(req.query.maxResultCount || 20);

  if (!Number.isInteger(maxResultCount) || maxResultCount < 1 || maxResultCount > 20) {
    throw new ApiError(400, "maxResultCount must be an integer between 1 and 20");
  }

  const hospitals = await searchNearbyHospitalsFromGoogle(
    {
      latitude: lat,
      longitude: lng,
      rangeKm: range,
      specialty: req.query.specialty,
      maxResultCount
    },
    req
  );

  return res.status(200).json(
    new ApiResponse(200, "Nearby hospitals fetched successfully", {
      currentLocation: {
        latitude: lat,
        longitude: lng
      },
      rangeKm: range,
      map: {
        provider: "google_maps",
        center: {
          latitude: lat,
          longitude: lng
        },
        zoom: Number(process.env.GOOGLE_MAPS_DEFAULT_ZOOM || 12)
      },
      source: "google_places",
      hospitals
    })
  );
});

const getHospitalPhoto = asyncHandler(async (req, res) => {
  const photoUrl = getGooglePhotoMediaUrl(req.query.name, {
    maxWidthPx: req.query.maxWidthPx,
    maxHeightPx: req.query.maxHeightPx
  });

  return res.redirect(302, photoUrl);
});

export { createHospital, findNearbyHospitals, getHospitalPhoto, getMapConfig, listHospitals };
