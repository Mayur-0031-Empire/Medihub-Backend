# MediHub Backend

Express + MongoDB Atlas backend for user registration, login, logout, token refresh, and profile updates.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and add your MongoDB Atlas URI plus JWT secrets.

3. Start the API:

```bash
npm run dev
```

## Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/bmi-buddy`
- `POST /api/bmi-buddy/calculate`
- `GET /api/hospital-locator/nearby`
- `GET /api/hospital-locator/hospitals`

## Register body

Use Postman `Body -> form-data`:

```txt
firstName: Asha
lastName: Sharma
username: asha_sharma
role: patient
email: asha@example.com
phone: +919999999999
password: StrongPass123
confirmPassword: StrongPass123
photo: choose file
```

The photo is first saved locally in `public/temp`, uploaded to Cloudinary, then removed locally. MongoDB stores the Cloudinary URL in `photo`.

## Login body

Use `identifier`, `usernameOrEmail`, `username`, or `email`.

```json
{
  "identifier": "asha@example.com",
  "password": "StrongPass123"
}
```

Register and login set `accessToken` and `refreshToken` as HTTP-only cookies. Postman stores those cookies automatically for `localhost`, so you do not need to paste tokens manually for the protected routes.

## Update patient/user details

Call this after register/login. The saved cookies authenticate the request automatically.

```http
PATCH /api/users/me
```

```json
{
  "gender": "female",
  "address": "Mumbai, Maharashtra",
  "bloodGroup": "O+",
  "age": 28
}
```

This route accepts text fields only: `firstName`, `lastName`, `phone`, `role`, `gender`, `address`, `bloodGroup`, and `age`. It does not allow `username`, `email`, `photo`, or `password`.

## Update Photo

Use Postman `Body -> form-data`:

```http
PATCH /api/users/me/photo
```

```txt
photo: choose file
```

The photo is uploaded to Cloudinary and the new Cloudinary URL is saved in MongoDB.

## Update Password

Use Postman `Body -> raw -> JSON`:

```http
PATCH /api/users/me/password
```

```json
{
  "oldPassword": "StrongPass123",
  "newPassword": "NewStrongPass123",
  "confirmPassword": "NewStrongPass123"
}
```

If the access token is missing or expired, protected routes automatically validate the refresh token cookie, issue a new access token cookie, and continue the original request.

## BMI Buddy

BMI Buddy is public. No login is required.

### What BMI Means

```http
GET /api/bmi-buddy
```

Returns a very short BMI meaning, the required parameters, and BMI categories.

### Calculate BMI And Get Plans

```http
POST /api/bmi-buddy/calculate
```

```json
{
  "heightCm": 170,
  "weightKg": 82
}
```

The response includes the BMI value, category, and pointwise `dietPlan`, `workoutPlan`, and `lifestylePlan` suggestions to help the user move toward a normal BMI.

## Nearby Hospital Locator

Hospital locator is public. No login is required. It uses Google Places API for real hospital search and Google Maps JavaScript API config for the frontend map.

Required Google Cloud setup:

- Enable **Places API (New)** for backend nearby hospital search and hospital photos.
- Enable **Maps JavaScript API** for the frontend map. This key is public by nature, so restrict it by HTTP referrer.
- Add `GOOGLE_PLACES_API_KEY` as a server-side key.
- Add `GOOGLE_MAPS_BROWSER_API_KEY` only if you want the backend to confirm map-key configuration; do not expose the server Places key to frontend code.
- Optionally add `GOOGLE_MAPS_MAP_ID` for Google Maps advanced markers.

### Get Frontend Map Config

```http
GET /api/hospital-locator/map-config
```

Returns map ID, libraries, default center, default zoom, and whether a browser map key is configured. It does not return any API key.

Frontend flow:

```txt
1. Call GET /api/hospital-locator/map-config
2. Load Google Maps JavaScript API using the frontend's own public browser key
3. Ask the browser for current location with navigator.geolocation
4. Call GET /api/hospital-locator/nearby with latitude, longitude, and rangeKm
5. Render returned hospitals as map markers and list panels
```

### Add Hospital Profile

Use this only if you also want to maintain local hospital profiles in MongoDB. Google Places nearby search does not require this endpoint.

```http
POST /api/hospital-locator/hospitals
```

```json
{
  "name": "City Care Hospital",
  "profilePicture": "https://example.com/city-care.jpg",
  "address": "MG Road, Bengaluru, Karnataka",
  "phone": "+919876543210",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "specialties": ["Cardiology", "Orthopedics", "Emergency"],
  "consultations": ["OPD", "Emergency care", "Video consultation"]
}
```

`specialties` and `consultations` can be arrays, JSON strings, or comma-separated text.

### List Hospitals

```http
GET /api/hospital-locator/hospitals
```

Optional filters:

```http
GET /api/hospital-locator/hospitals?specialty=Cardiology
GET /api/hospital-locator/hospitals?search=emergency
```

### Find Nearby Hospitals

```http
GET /api/hospital-locator/nearby?latitude=12.9716&longitude=77.5946&rangeKm=5
```

Optional specialty filter:

```http
GET /api/hospital-locator/nearby?latitude=12.9716&longitude=77.5946&rangeKm=5&specialty=Cardiology
```

The response comes from Google Places and includes each hospital's profile picture, address, phone number when Google provides it, inferred specialties, consultation options, marker coordinates, Google Maps URL, website URL, and `distanceKm` from the user's current location.

`rangeKm` must be between `1` and `50` because Google Places Nearby Search supports a maximum 50 km radius.

Hospital photos are returned as backend URLs:

```txt
profilePicture: http://localhost:5000/api/hospital-locator/photo?name=...
```

The backend redirects those URLs to Google Place Photos, keeping the server Places API key out of normal API responses.

Note: Google Places does not always provide exact hospital departments or consultation modes. The backend returns Google place types as `specialties` and infers common consultation options from available data such as phone number, website, and emergency-room place type.

## Doctor Profile

Doctor users create a separate doctor profile after registering and logging in with `role: doctor`. The profile is not authorized for doctor-level actions until at least one qualification document is verified by an admin.

### Create Doctor Profile

Use Postman `Body -> form-data`:

```http
POST /api/doctors/me
```

```txt
specialization: Cardiologist
experienceYears: 8
hospitalName: City Care Hospital
consultationFee: 700
availabilitySchedule: Mon-Fri 10:00 AM - 4:00 PM
documentTitles: ["MBBS Degree","MD Cardiology"]
documents: choose file
documents: choose another file
```

At least one `documents` file is required. `documentTitles` must have the same number of titles as uploaded files.

### Get My Doctor Profile

```http
GET /api/doctors/me
```

### Update Doctor Profile Text Fields

Updating these fields sends the profile back to `pending` verification.

```http
PATCH /api/doctors/me
```

```json
{
  "specialization": "Dermatologist",
  "experienceYears": 5,
  "hospitalName": "MediHub Clinic",
  "consultationFee": 500,
  "availabilitySchedule": "Tue-Sat 11:00 AM - 5:00 PM"
}
```

### Add More Doctor Documents

```http
POST /api/doctors/me/documents
```

Use Postman `Body -> form-data`:

```txt
documentTitles: ["DNB Dermatology"]
documents: choose file
```

Adding new documents does not remove existing doctor authorization. New documents stay `pending`, while already verified document titles remain active in `verifiedTitles`.

### Public Verified Doctors

```http
GET /api/doctors
```

Only doctors with at least one verified title are returned here.

Search doctors by verified title:

```http
GET /api/doctors?title=MBBS
```

### Admin: Pending Doctors

Admin login required.

```http
GET /api/doctors/admin/pending
```

### Admin: Verify Or Reject Doctor

```http
PATCH /api/doctors/admin/:doctorProfileId/verify
```

Verify:

```json
{
  "verificationStatus": "verified",
  "isRecommended": true
}
```

Verify selected pending documents only:

```json
{
  "verificationStatus": "verified",
  "documentIds": ["665f1a2b3c4d5e6f78901234"],
  "isRecommended": true
}
```

Reject:

```json
{
  "verificationStatus": "rejected",
  "rejectionReason": "Uploaded degree document is not readable"
}
```

## MediHub AI Chatbot

Add your Gemini key to `.env`:

```txt
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_MAX_OUTPUT_TOKENS=900
```

The chatbot is protected by login cookies. Patients and doctors can each see only their own chats.

Before the final answer, the backend asks Gemini to classify the message dynamically for health scope, prescription intent, mental health concern, crisis risk, language, and tone. This replaces hard-coded keyword-only checks.

### Chat History

For the left panel history:

```http
GET /api/ai/chats
```

### Create New Chat

```http
POST /api/ai/chats
```

```json
{
  "title": "Prescription help"
}
```

### Send Message And Auto-Create Chat

```http
POST /api/ai/chats/messages
```

Body -> raw -> JSON:

```json
{
  "message": "I am feeling very stressed and I cannot sleep properly. What should I do?"
}
```

### Send Message In Existing Chat

```http
POST /api/ai/chats/:chatId/messages
```

Body -> raw -> JSON:

```json
{
  "message": "Can you explain this in simple Hindi?"
}
```

The bot is instructed to reply in the same language and tone as the user.

### Ask About Prescription Or Medical Document

Use Postman `Body -> form-data`:

```http
POST /api/ai/chats/:chatId/messages
```

```txt
message: Please explain this prescription in simple words. What should I ask my doctor?
attachments: choose prescription image or PDF
```

Attachments are sent to Gemini for understanding, uploaded to Cloudinary for chat history, and then removed from local temp storage.

### Rename Chat

```http
PATCH /api/ai/chats/:chatId
```

```json
{
  "title": "Sleep and stress support"
}
```

### Delete Chat

```http
DELETE /api/ai/chats/:chatId
```

## Appointments And Consultations

### Doctor Creates Availability Slots

Doctor must be verified. Use doctor login cookies.

```http
POST /api/appointments/slots
```

```json
{
  "slots": [
    {
      "startAt": "2026-05-10T10:00:00.000Z",
      "endAt": "2026-05-10T10:30:00.000Z"
    },
    {
      "startAt": "2026-05-10T10:30:00.000Z",
      "endAt": "2026-05-10T11:00:00.000Z"
    }
  ]
}
```

### Patient Checks Doctor Slots

```http
GET /api/appointments/doctors/:doctorProfileId/slots
```

Optional:

```http
GET /api/appointments/doctors/:doctorProfileId/slots?from=2026-05-10T00:00:00.000Z&to=2026-05-11T00:00:00.000Z
```

### Patient Books Appointment

Only `available` slots can be booked. When a patient books a slot, that slot becomes `booked`, so another patient cannot book the same doctor time.

```http
POST /api/appointments/book
```

```json
{
  "slotId": "slot_id_here",
  "patientNotes": "I have fever and throat pain since yesterday.",
  "trainingConsent": true,
  "symptoms": [
    {
      "description": "Fever",
      "severity": "moderate",
      "duration": "1 day"
    },
    {
      "description": "Throat pain",
      "severity": "mild",
      "duration": "2 days"
    }
  ]
}
```

The appointment stores a custom WebRTC consultation link. Set this in `.env`:

```txt
VIDEO_CALL_BASE_URL=http://localhost:3000/consultation
```

The saved `videoJoinUrl` becomes:

```txt
http://localhost:3000/consultation/:appointmentId
```

### Custom WebRTC Signaling

The backend uses Socket.IO on the same API server for WebRTC signaling.

Frontend connection:

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  withCredentials: true
});
```

If you are not using cookies, pass the access token:

```js
const socket = io("http://localhost:5000", {
  auth: {
    token: accessToken
  }
});
```

Join consultation room:

```js
socket.emit("consultation:join", { appointmentId }, (response) => {
  if (!response.ok) {
    console.log(response.message);
  }
});
```

WebRTC signaling events:

```js
socket.emit("webrtc:offer", { appointmentId, offer });
socket.emit("webrtc:answer", { appointmentId, answer });
socket.emit("webrtc:ice-candidate", { appointmentId, candidate });

socket.on("webrtc:offer", ({ offer }) => {});
socket.on("webrtc:answer", ({ answer }) => {});
socket.on("webrtc:ice-candidate", ({ candidate }) => {});
socket.on("consultation:peer-joined", ({ userId, role }) => {});
socket.on("consultation:peer-left", ({ userId }) => {});
```

Only the appointment patient, assigned doctor, or admin can join that appointment signaling room.

### My Appointments

Patient sees their bookings. Doctor sees assigned consultations. Admin sees all.

```http
GET /api/appointments/me
```

### Appointment Details

Only the patient, assigned doctor, or admin can view it.

```http
GET /api/appointments/:appointmentId
```

### Patient Adds More Symptoms Or Notes

```http
PATCH /api/appointments/:appointmentId/symptoms
```

```json
{
  "patientNotes": "Now I also have a dry cough.",
  "symptoms": [
    {
      "description": "Dry cough",
      "severity": "mild",
      "duration": "6 hours"
    }
  ]
}
```

### Patient Uploads Reports

Use Postman `Body -> form-data`:

```http
POST /api/appointments/:appointmentId/reports
```

```txt
titles: ["Blood report","X-ray"]
reports: choose file
reports: choose another file
```

### Doctor Updates Consultation

```http
PATCH /api/appointments/:appointmentId/doctor-notes
```

```json
{
  "doctorDiagnosis": "Likely viral upper respiratory infection",
  "doctorNotes": "Advised rest, fluids, and follow-up if fever persists.",
  "meetingTranscript": "Patient reported fever, sore throat, and dry cough. No breathing difficulty.",
  "status": "completed"
}
```

### Doctor Uploads Consultation Files

Use Postman `Body -> form-data`:

```http
POST /api/appointments/:appointmentId/doctor-files
```

```txt
titles: ["Diet advice PDF"]
files: choose file
```

### Doctor Generates AI Draft

This creates consultation notes and a prescription draft. It is visible as draft for the doctor review flow.

```http
POST /api/appointments/:appointmentId/ai-draft
```

### Doctor Approves Prescription

Only after approval should the prescription be shared with the patient.

```http
PATCH /api/appointments/:appointmentId/prescription/approve
```

```json
{
  "approvedText": "Final doctor-approved prescription text here."
}
```

### Doctor Emergency Cancellation

Cancels the booking, marks the slot as cancelled, and queues in-app plus email notification records.

```http
PATCH /api/appointments/:appointmentId/cancel-by-doctor
```

```json
{
  "reason": "Emergency surgery case"
}
```

### Notifications

Appointment booking creates 10-minute reminder notification records for both patient and doctor.

```http
GET /api/appointments/notifications
```

## Old Atlas Index Fix

If MongoDB returns `avatar already exists`, your Atlas `users` collection still has an old unique index from a previous schema. Run:

```bash
npm run db:indexes
npm run db:drop-avatar-index
```
