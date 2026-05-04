const bmiCategories = [
  {
    name: "underweight",
    label: "Underweight",
    min: 0,
    max: 18.5
  },
  {
    name: "normal",
    label: "Normal",
    min: 18.5,
    max: 25
  },
  {
    name: "overweight",
    label: "Overweight",
    min: 25,
    max: 30
  },
  {
    name: "obese",
    label: "Obese",
    min: 30,
    max: Infinity
  }
];

const bmiMeaning =
  "BMI means Body Mass Index. It compares your weight with your height to estimate whether your body weight is in a healthy range.";

const requiredParameters = [
  {
    name: "heightCm",
    unit: "centimeters",
    description: "Your height in cm"
  },
  {
    name: "weightKg",
    unit: "kilograms",
    description: "Your weight in kg"
  }
];

const plansByCategory = {
  underweight: {
    dietPlan: [
      "Eat frequent balanced meals with healthy calories.",
      "Add protein foods like dal, eggs, paneer, fish, chicken, tofu, or beans.",
      "Include nuts, seeds, peanut butter, milk, curd, and smoothies.",
      "Do not skip breakfast or post-workout meals.",
      "Consult a doctor if weight loss is sudden or unexplained."
    ],
    workoutPlan: [
      "Focus on strength training 3 to 4 days per week.",
      "Use basic exercises like squats, push-ups, rows, lunges, and light weights.",
      "Keep cardio light, such as walking or cycling for 15 to 20 minutes.",
      "Increase workout intensity slowly to avoid injury."
    ],
    lifestylePlan: [
      "Sleep 7 to 9 hours daily.",
      "Track meals for a few weeks to ensure enough calorie intake.",
      "Manage stress because it can reduce appetite.",
      "Take medical advice before using supplements."
    ]
  },
  normal: {
    dietPlan: [
      "Maintain a balanced plate with vegetables, protein, whole grains, and healthy fats.",
      "Limit sugary drinks, deep-fried snacks, and ultra-processed foods.",
      "Drink enough water through the day.",
      "Keep portion sizes steady and avoid crash diets."
    ],
    workoutPlan: [
      "Do 150 minutes of moderate activity per week.",
      "Add strength training 2 to 3 days per week.",
      "Include flexibility or mobility exercises.",
      "Stay active daily with walking, stairs, or cycling."
    ],
    lifestylePlan: [
      "Keep a regular sleep schedule.",
      "Check weight and waist size occasionally, not obsessively.",
      "Avoid long sitting breaks by moving every hour.",
      "Continue routine health checkups."
    ]
  },
  overweight: {
    dietPlan: [
      "Choose high-fiber foods like vegetables, fruits, oats, pulses, and whole grains.",
      "Add lean protein to every meal to stay full longer.",
      "Reduce sugary foods, sweet drinks, fried snacks, and large portions.",
      "Prefer grilled, steamed, roasted, or home-cooked meals.",
      "Aim for slow, steady fat loss instead of crash dieting."
    ],
    workoutPlan: [
      "Walk briskly 30 to 45 minutes on most days.",
      "Add strength training 2 to 3 days per week.",
      "Start with low-impact workouts if joints hurt.",
      "Increase duration first, then intensity."
    ],
    lifestylePlan: [
      "Sleep 7 to 8 hours to support appetite control.",
      "Plan meals ahead to avoid impulse eating.",
      "Track weight weekly and focus on trends.",
      "Speak with a doctor if you have diabetes, thyroid, heart, or joint issues."
    ]
  },
  obese: {
    dietPlan: [
      "Create a doctor-approved calorie deficit with balanced meals.",
      "Prioritize vegetables, lean protein, pulses, whole grains, and healthy fats.",
      "Avoid sugary drinks, frequent desserts, fried foods, and oversized portions.",
      "Keep meals regular to reduce binge eating.",
      "Consider guidance from a dietitian for a personalized plan."
    ],
    workoutPlan: [
      "Begin with low-impact activity like walking, swimming, or cycling.",
      "Start with 10 to 20 minutes daily and build gradually.",
      "Add supervised strength training when comfortable.",
      "Stop and seek medical help if you feel chest pain, dizziness, or severe breathlessness."
    ],
    lifestylePlan: [
      "Consult a doctor before intense workouts or major diet changes.",
      "Set small weekly goals for movement, meals, and sleep.",
      "Reduce long sitting periods with short movement breaks.",
      "Monitor blood pressure, sugar, cholesterol, and other risk factors."
    ]
  }
};

const getBmiCategory = (bmi) => bmiCategories.find((category) => bmi >= category.min && bmi < category.max);

const calculateBmi = ({ heightCm, weightKg }) => {
  const heightInMeters = Number(heightCm) / 100;
  const bmi = Number(weightKg) / (heightInMeters * heightInMeters);
  const roundedBmi = Number(bmi.toFixed(1));
  const category = getBmiCategory(roundedBmi);

  return {
    bmi: roundedBmi,
    category: category.label,
    categoryKey: category.name,
    note: "BMI is a screening guide, not a diagnosis. Body composition, age, pregnancy, and medical conditions can affect interpretation.",
    plans: plansByCategory[category.name]
  };
};

export { bmiCategories, bmiMeaning, calculateBmi, requiredParameters };
