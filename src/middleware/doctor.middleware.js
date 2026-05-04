import DoctorProfile from "../models/doctor.model.js";
import { ApiError } from "../utils/ApiError.js";

const requireDoctor = (req, _res, next) => {
  if (req.user.role !== "doctor") {
    throw new ApiError(403, "Only doctors can access this route");
  }

  next();
};

const requireVerifiedDoctor = async (req, _res, next) => {
  try {
    const doctorProfile = await DoctorProfile.findOne({
      user: req.user._id,
      verifiedTitles: { $exists: true, $ne: [] }
    });

    if (!doctorProfile) {
      throw new ApiError(403, "Doctor profile is not verified yet");
    }

    req.doctorProfile = doctorProfile;
    next();
  } catch (error) {
    next(error);
  }
};

export { requireDoctor, requireVerifiedDoctor };
