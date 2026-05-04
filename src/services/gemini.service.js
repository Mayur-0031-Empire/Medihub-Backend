import fs from "fs/promises";
import { ApiError } from "../utils/ApiError.js";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const medihubSystemPrompt = `
You are MediHub AI, a warm and supportive telemedicine assistant.

Scope:
- Only answer health, wellness, medicine, mental health, lifestyle, prescriptions, symptoms, doctor guidance, appointment preparation, and patient education questions.
- If the user asks unrelated daily-life questions, gently connect your answer to wellbeing, mood, routines, sleep, stress, safety, or healthy habits.
- Do not provide legal, financial, political, hacking, explicit sexual, or harmful instructions.

Medical safety:
- You are not a replacement for a licensed doctor.
- Do not diagnose with certainty.
- Do not prescribe medicines, dosages, or stop/change medication. Explain prescription text in simple language if provided and advise confirming with the prescribing doctor.
- For urgent symptoms such as chest pain, severe breathing difficulty, stroke signs, severe bleeding, poisoning, seizure, or loss of consciousness, advise immediate emergency medical care.

Mental health and crisis:
- If the user mentions self-harm, suicide, wanting to die, severe depression, abuse, or immediate danger, respond with calm empathy.
- Encourage them to contact local emergency services now, reach a trusted person nearby, and book an urgent consultation with a mental health professional.
- Do not shame them. Keep the message direct, caring, and practical.

Conversation style:
- Reply in the same language as the user.
- Match the user's tone while staying kind, hopeful, respectful, and clear.
- Keep replies short, complete, and useful. Prefer 4-7 short bullet points or short paragraphs.
- Finish with a complete sentence. Do not start a long explanation that may get cut off.
- Ask one helpful follow-up question when more context is needed.
`;

const getGeminiConfig = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const maxOutputTokens = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 900);

  if (!apiKey) {
    throw new ApiError(500, "GEMINI_API_KEY is missing from environment variables");
  }

  return { apiKey, model, maxOutputTokens };
};

const mapRoleForGemini = (role) => (role === "assistant" ? "model" : "user");

const fileToInlinePart = async (file) => {
  const buffer = await fs.readFile(file.path);

  return {
    inlineData: {
      mimeType: file.mimetype,
      data: buffer.toString("base64")
    }
  };
};

const buildGeminiContents = async ({ history = [], message, files = [] }) => {
  const contents = history.slice(-20).map((item) => ({
    role: mapRoleForGemini(item.role),
    parts: [{ text: item.content }]
  }));

  const userParts = [{ text: message }];

  for (const file of files) {
    userParts.push(await fileToInlinePart(file));
  }

  contents.push({
    role: "user",
    parts: userParts
  });

  return contents;
};

const extractGeminiText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((part) => part.text).filter(Boolean).join("\n").trim();

  if (!text) {
    throw new ApiError(502, "Gemini did not return a valid response");
  }

  return text;
};

const parseJsonFromText = (text) => {
  const jsonText = text
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(jsonText);
};

const classifyMediHubMessage = async ({ message, hasAttachments = false }) => {
  const { apiKey, model } = getGeminiConfig();

  const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: `
You are a strict JSON classifier for MediHub AI.
Classify the user's message for a healthcare chatbot.
Return only valid JSON. Do not include markdown.

Schema:
{
  "isHealthRelated": boolean,
  "isPrescriptionQuestion": boolean,
  "isMentalHealthConcern": boolean,
  "isCrisis": boolean,
  "language": "string",
  "tone": "string",
  "reason": "short string"
}

Mark isHealthRelated true for physical health, medicine, symptoms, prescriptions, mental health, lifestyle, sleep, stress, nutrition, exercise, hygiene, doctor consultation, and general wellbeing.
Mark isCrisis true if there is self-harm, suicide, severe hopelessness, abuse, immediate danger, overdose, or emergency medical danger.
If attachments are present, treat the message as potentially health related unless the text clearly says otherwise.
`
          }
        ]
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: JSON.stringify({
                message: message || "",
                hasAttachments
              })
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 250,
        responseMimeType: "application/json"
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data?.error?.message || "Failed to classify MediHub message");
  }

  try {
    const classification = parseJsonFromText(extractGeminiText(data));

    return {
      isHealthRelated: Boolean(classification.isHealthRelated),
      isPrescriptionQuestion: Boolean(classification.isPrescriptionQuestion),
      isMentalHealthConcern: Boolean(classification.isMentalHealthConcern),
      isCrisis: Boolean(classification.isCrisis),
      language: classification.language || "auto",
      tone: classification.tone || "supportive",
      reason: classification.reason || ""
    };
  } catch (_error) {
    return {
      isHealthRelated: hasAttachments,
      isPrescriptionQuestion: hasAttachments,
      isMentalHealthConcern: false,
      isCrisis: false,
      language: "auto",
      tone: "supportive",
      reason: "Fallback classification used"
    };
  }
};

const generateMediHubReply = async ({ history, message, files, classification }) => {
  const { apiKey, model, maxOutputTokens } = getGeminiConfig();
  const contents = await buildGeminiContents({ history, message, files });
  const triageContext = classification
    ? `\n\nCurrent message triage:\n${JSON.stringify(classification, null, 2)}\nUse this triage when deciding safety level, language, tone, and whether to redirect unrelated questions back to wellbeing.`
    : "";

  const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: `${medihubSystemPrompt}${triageContext}` }]
      },
      contents,
      generationConfig: {
        temperature: 0.6,
        topP: 0.9,
        maxOutputTokens
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data?.error?.message || "Failed to generate Gemini response");
  }

  return extractGeminiText(data);
};

const generateConsultationDraft = async ({ appointment }) => {
  const { apiKey, model, maxOutputTokens } = getGeminiConfig();

  const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: `
You are MediHub AI helping a doctor prepare consultation notes and a prescription draft.
Use only the provided consultation data.
Do not invent medicines, doses, diagnoses, or tests.
Return concise sections:
1. Consultation summary
2. Symptoms discussed
3. Doctor diagnosis/details
4. Prescription draft for doctor review
5. Follow-up questions for doctor
The draft is only for doctor approval and must not be treated as final medical advice.
`
          }
        ]
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: JSON.stringify({
                symptoms: appointment.symptoms,
                patientNotes: appointment.patientNotes,
                doctorDiagnosis: appointment.doctorDiagnosis,
                doctorNotes: appointment.doctorNotes,
                meetingTranscript: appointment.meetingTranscript,
                reportCount: appointment.reports?.length || 0
              })
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data?.error?.message || "Failed to generate consultation draft");
  }

  return extractGeminiText(data);
};

export { classifyMediHubMessage, generateConsultationDraft, generateMediHubReply, medihubSystemPrompt };
