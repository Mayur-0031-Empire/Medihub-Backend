import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { bmiCategories, bmiMeaning, calculateBmi, requiredParameters } from "../services/bmiBuddy.service.js";

const getBmiBuddyInfo = (_req, res) => {
  return res.status(200).json(
    new ApiResponse(200, "BMI Buddy information fetched successfully", {
      meaning: bmiMeaning,
      requiredParameters,
      categories: bmiCategories.map(({ label, min, max }) => ({
        label,
        range: max === Infinity ? `${min}+` : `${min} - ${max}`
      }))
    })
  );
};

const calculateBmiPlan = asyncHandler(async (req, res) => {
  const { heightCm, weightKg } = req.body;
  const height = Number(heightCm);
  const weight = Number(weightKg);

  if (!Number.isFinite(height) || !Number.isFinite(weight)) {
    throw new ApiError(400, "heightCm and weightKg must be valid numbers");
  }

  if (height < 50 || height > 260) {
    throw new ApiError(400, "heightCm must be between 50 and 260");
  }

  if (weight < 2 || weight > 500) {
    throw new ApiError(400, "weightKg must be between 2 and 500");
  }

  const result = calculateBmi({ heightCm: height, weightKg: weight });

  return res.status(200).json(new ApiResponse(200, "BMI plan generated successfully", result));
});

export { calculateBmiPlan, getBmiBuddyInfo };
