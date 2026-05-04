# MediHub API Data Flow Documentation

This file explains which routes need API keys, what data must be shared by the frontend, what data is optional, what each route does, and how data travels through the system.

## Environment Keys

### Backend Secrets

- `MONGODB_URI` - Required for all database-backed features; backend uses it to store users, doctors, appointments, chats, notifications, and local hospital profiles.
- `ACCESS_TOKEN_SECRET` - Required for login-protected routes; backend uses it to sign and verify short-lived access tokens.
- `REFRESH_TOKEN_SECRET` - Required for login sessions; backend uses it to sign and verify refresh tokens.
- `CLOUDINARY_CLOUD_NAME` - Required for image/file upload features.
- `CLOUDINARY_API_KEY` - Required for image/file upload features.
- `CLOUDINARY_API_SECRET` - Required for image/file upload features; keep backend-only.
- `GEMINI_API_KEY` - Required for AI chat and AI consultation draft generation.
- `GOOGLE_PLACES_API_KEY` - Required for real nearby hospital search and Google Place Photos; keep backend-only.

### Frontend Public Config

- `VITE_API_BASE_URL` - Frontend base URL for backend API, for example `http://localhost:5000`.
- `VITE_GOOGLE_MAPS_BROWSER_API_KEY` - Optional public browser key for showing a real Google map in frontend; restrict by HTTP referrer.
- `VITE_GOOGLE_MAPS_MAP_ID` - Optional Google Map ID for styled maps or advanced markers.

Important: `GOOGLE_PLACES_API_KEY`, `CLOUDINARY_API_SECRET`, JWT secrets, Gemini key, and MongoDB URI must never be sent to frontend.

## Public Routes

### Health Check

- Route: `GET /api/health`
- Required data: none
- Optional data: none
- API key needed: none
- What it does: checks if backend is running.
- Data flow: frontend/Postman -> backend -> JSON status response.

### BMI Buddy Info

- Route: `GET /api/bmi-buddy`
- Required data: none
- Optional data: none
- API key needed: none
- What it does: returns a short explanation of BMI, required input parameters, and BMI categories.
- Data flow: frontend -> backend BMI service -> response to frontend.

### BMI Calculate

- Route: `POST /api/bmi-buddy/calculate`
- Required data: `heightCm`, `weightKg`
- Optional data: none
- API key needed: none
- What it does: calculates BMI and returns BMI category with diet, workout, and lifestyle plans.
- Data flow: frontend sends height/weight -> backend calculates BMI -> frontend receives result and plans.

Example:

```json
{
  "heightCm": 170,
  "weightKg": 82
}
```

### Public Verified Doctors

- Route: `GET /api/doctors`
- Required data: none
- Optional data: `title` query parameter
- API key needed: MongoDB connection only
- What it does: lists doctors with verified qualification titles.
- Data flow: frontend -> backend -> MongoDB `DoctorProfile` and `User` collections -> frontend.

Example:

```http
GET /api/doctors?title=Cardiology
```

### Doctor Available Slots

- Route: `GET /api/appointments/doctors/:doctorProfileId/slots`
- Required data: `doctorProfileId`
- Optional data: `from`, `to`
- API key needed: MongoDB connection only
- What it does: lists available appointment slots for a verified doctor.
- Data flow: frontend sends doctor profile id -> backend checks doctor profile and slots -> MongoDB -> frontend.

### Nearby Hospital Search

- Route: `GET /api/hospital-locator/nearby`
- Required data: `latitude`, `longitude`, `rangeKm`
- Optional data: `specialty`, `maxResultCount`
- API key needed: `GOOGLE_PLACES_API_KEY`
- What it does: searches real nearby hospitals using Google Places API and returns hospital details.
- Data flow: frontend sends user location/range -> backend calls Google Places using server key -> backend formats hospitals -> frontend receives hospitals.

Example:

```http
GET /api/hospital-locator/nearby?latitude=12.9716&longitude=77.5946&rangeKm=5&specialty=Cardiology
```

Shared with backend:

- User latitude and longitude
- Search range in km
- Optional specialty text

Shared with Google Places by backend:

- Latitude and longitude
- Search radius
- Hospital type
- Optional specialty search text

Returned to frontend:

- Hospital name
- Profile picture URL through backend photo route
- Address
- Phone number if Google provides it
- Specialties inferred from Google place types
- Consultation options inferred from available data
- Latitude and longitude for map marker
- Distance in km
- Google Maps URL
- Website URL if available

### Hospital Photo

- Route: `GET /api/hospital-locator/photo`
- Required data: `name` query parameter from Google Place photo name
- Optional data: `maxWidthPx`, `maxHeightPx`
- API key needed: `GOOGLE_PLACES_API_KEY`
- What it does: redirects a Google Place photo name to a Google photo media URL.
- Data flow: frontend image tag requests backend photo URL -> backend signs/redirects using Places key -> browser loads Google-hosted image.

### Hospital Map Config

- Route: `GET /api/hospital-locator/map-config`
- Required data: none
- Optional data: none
- API key needed: none returned; backend may read optional map env values.
- What it does: returns map defaults such as map ID, default center, zoom, provider, and whether browser map key is configured.
- Data flow: frontend -> backend -> non-secret map config response.

Important: this route does not return API keys.

### Local Hospital Profiles

- Route: `GET /api/hospital-locator/hospitals`
- Required data: none
- Optional data: `search`, `specialty`
- API key needed: MongoDB connection only
- What it does: lists local hospital profiles stored in MongoDB.
- Data flow: frontend -> backend -> MongoDB `Hospital` collection -> frontend.

- Route: `POST /api/hospital-locator/hospitals`
- Required data: `name`, `address`, `phone`, `latitude`, `longitude`
- Optional data: `profilePicture`, `specialties`, `consultations`
- API key needed: MongoDB connection only
- What it does: creates a local hospital profile.
- Data flow: frontend/Postman sends hospital profile -> backend validates -> MongoDB stores profile -> response.

## Authentication Routes

### Register

- Route: `POST /api/auth/register`
- Required data: `firstName`, `lastName`, `username`, `role`, `email`, `phone`, `password`, `confirmPassword`, `photo`
- Optional data: none
- API key needed: MongoDB, Cloudinary, JWT secrets
- What it does: creates user account, uploads profile photo, signs auth cookies.
- Data flow: frontend form-data -> backend stores photo temporarily -> Cloudinary upload -> MongoDB user create -> backend sets HTTP-only cookies.

### Login

- Route: `POST /api/auth/login`
- Required data: `password` and one of `identifier`, `usernameOrEmail`, `username`, or `email`
- Optional data: none
- API key needed: MongoDB and JWT secrets
- What it does: verifies credentials and sets access/refresh cookies.
- Data flow: frontend sends credentials -> backend checks MongoDB password hash -> backend sets HTTP-only auth cookies.

### Refresh

- Route: `POST /api/auth/refresh`
- Required data: refresh token cookie or `refreshToken` body field
- Optional data: none
- API key needed: JWT secrets and MongoDB
- What it does: issues fresh auth tokens.
- Data flow: frontend sends cookie automatically -> backend verifies token -> MongoDB checks saved token -> new cookies returned.

### Logout

- Route: `POST /api/auth/logout`
- Required data: refresh token cookie or `refreshToken` body field
- Optional data: none
- API key needed: MongoDB
- What it does: removes stored refresh token and clears cookies.
- Data flow: frontend -> backend -> MongoDB clears refresh token -> cookies cleared.

## Protected User Routes

All routes below require login through access token cookie or `Authorization: Bearer <token>`.

### Get My Profile

- Route: `GET /api/users/me`
- Required data: auth token/cookie
- Optional data: none
- What it does: returns logged-in user profile.
- Data flow: frontend sends cookie -> backend verifies JWT -> MongoDB loads user -> frontend.

### Update My Profile

- Route: `PATCH /api/users/me`
- Required data: at least one valid editable field
- Optional data: `firstName`, `lastName`, `phone`, `role`, `gender`, `address`, `bloodGroup`, `age`
- What it does: updates allowed text fields only.
- Data flow: frontend sends JSON -> backend validates -> MongoDB updates user -> frontend.

### Update Photo

- Route: `PATCH /api/users/me/photo`
- Required data: `photo` file
- Optional data: none
- API key needed: Cloudinary keys
- What it does: uploads new photo and saves Cloudinary URL.
- Data flow: frontend form-data -> backend temp file -> Cloudinary -> MongoDB photo URL update -> frontend.

### Update Password

- Route: `PATCH /api/users/me/password`
- Required data: `oldPassword`, `newPassword`, `confirmPassword`
- Optional data: none
- What it does: verifies old password and saves new hashed password.
- Data flow: frontend sends password JSON -> backend verifies hash -> MongoDB saves new hash.

## Doctor Routes

### Create Doctor Profile

- Route: `POST /api/doctors/me`
- Required data: `specialization`, `experienceYears`, `hospitalName`, `consultationFee`, `availabilitySchedule`, at least one `documents` file, matching `documentTitles`
- Optional data: none
- API key needed: Cloudinary and MongoDB
- What it does: creates doctor profile and uploads qualification documents.
- Data flow: doctor frontend -> backend -> Cloudinary document upload -> MongoDB `DoctorProfile`.

### Update Doctor Profile

- Route: `PATCH /api/doctors/me`
- Required data: at least one editable doctor field
- Optional data: `specialization`, `experienceYears`, `hospitalName`, `consultationFee`, `availabilitySchedule`
- What it does: updates doctor profile and rechecks verification status.
- Data flow: frontend -> backend -> MongoDB.

### Add Doctor Documents

- Route: `POST /api/doctors/me/documents`
- Required data: `documents` files and matching `documentTitles`
- Optional data: none
- API key needed: Cloudinary and MongoDB
- What it does: adds new pending qualification documents.
- Data flow: frontend form-data -> backend temp files -> Cloudinary -> MongoDB.

### Admin Pending Doctors

- Route: `GET /api/doctors/admin/pending`
- Required data: admin auth
- Optional data: none
- What it does: lists doctor profiles with pending documents.
- Data flow: admin frontend -> backend authorization -> MongoDB -> frontend.

### Admin Verify Doctor

- Route: `PATCH /api/doctors/admin/:doctorProfileId/verify`
- Required data: `verificationStatus`
- Optional data: `documentIds`, `rejectionReason`, `isRecommended`
- What it does: verifies or rejects doctor documents and doctor profile status.
- Data flow: admin frontend -> backend authorization -> MongoDB updates doctor profile.

## Appointment Routes

### Create Availability Slots

- Route: `POST /api/appointments/slots`
- Required data: doctor auth and `slots` array with `startAt`, `endAt`
- Optional data: none
- What it does: creates available appointment slots for a verified doctor.
- Data flow: doctor frontend -> backend verifies doctor -> MongoDB `AvailabilitySlot`.

### Book Appointment

- Route: `POST /api/appointments/book`
- Required data: patient auth and `slotId`
- Optional data: `symptoms`, `patientNotes`, `trainingConsent`
- What it does: books a slot, creates appointment, marks slot booked, creates notifications.
- Data flow: patient frontend -> backend transaction -> MongoDB slot and appointment -> notification records -> frontend.

### List My Appointments

- Route: `GET /api/appointments/me`
- Required data: auth
- Optional data: none
- What it does: lists appointments for patient, doctor, or admin.
- Data flow: frontend -> backend role-based filter -> MongoDB -> frontend.

### Appointment Details

- Route: `GET /api/appointments/:appointmentId`
- Required data: auth and appointment access
- Optional data: none
- What it does: returns one appointment if user is patient, doctor, or admin.
- Data flow: frontend -> backend access check -> MongoDB -> frontend.

### Patient Symptoms

- Route: `PATCH /api/appointments/:appointmentId/symptoms`
- Required data: patient auth
- Optional data: `symptoms`, `patientNotes`
- What it does: adds symptoms and notes to appointment.
- Data flow: patient frontend -> backend validates patient ownership -> MongoDB appointment update.

### Patient Reports

- Route: `POST /api/appointments/:appointmentId/reports`
- Required data: patient auth and `reports` files
- Optional data: `titles`
- API key needed: Cloudinary
- What it does: uploads medical reports and attaches them to appointment.
- Data flow: frontend form-data -> backend temp files -> Cloudinary -> MongoDB appointment reports.

### Doctor Notes

- Route: `PATCH /api/appointments/:appointmentId/doctor-notes`
- Required data: doctor auth
- Optional data: `doctorDiagnosis`, `doctorNotes`, `meetingTranscript`, `status`
- What it does: updates consultation notes and appointment status.
- Data flow: doctor frontend -> backend access check -> MongoDB appointment update.

### Doctor Files

- Route: `POST /api/appointments/:appointmentId/doctor-files`
- Required data: doctor auth and `files`
- Optional data: `titles`
- API key needed: Cloudinary
- What it does: uploads doctor consultation attachments.
- Data flow: frontend form-data -> backend -> Cloudinary -> MongoDB appointment attachments.

### AI Consultation Draft

- Route: `POST /api/appointments/:appointmentId/ai-draft`
- Required data: doctor auth and appointment access
- Optional data: uses appointment symptoms, notes, transcript, and reports already stored
- API key needed: `GEMINI_API_KEY`
- What it does: generates AI consultation notes and prescription draft.
- Data flow: doctor frontend -> backend loads appointment -> backend sends selected appointment context to Gemini -> generated draft saved in MongoDB -> frontend.

### Approve Prescription

- Route: `PATCH /api/appointments/:appointmentId/prescription/approve`
- Required data: doctor auth and `approvedText`
- Optional data: none
- What it does: saves final doctor-approved prescription.
- Data flow: doctor frontend -> backend -> MongoDB appointment prescription.

### Doctor Cancel Appointment

- Route: `PATCH /api/appointments/:appointmentId/cancel-by-doctor`
- Required data: doctor auth
- Optional data: `reason`
- What it does: cancels appointment, cancels slot, creates cancellation notifications.
- Data flow: doctor frontend -> backend -> MongoDB appointment, slot, notification records.

### Notifications

- Route: `GET /api/appointments/notifications`
- Required data: auth
- Optional data: none
- What it does: lists user's appointment notifications.
- Data flow: frontend -> backend -> MongoDB notifications -> frontend.

## AI Chat Routes

All AI chat routes require login.

### List Chats

- Route: `GET /api/ai/chats`
- Required data: auth
- Optional data: none
- What it does: lists user's saved chats.
- Data flow: frontend -> backend -> MongoDB `Chat` collection -> frontend.

### Create Chat

- Route: `POST /api/ai/chats`
- Required data: auth
- Optional data: `title`
- What it does: creates an empty chat session.
- Data flow: frontend -> backend -> MongoDB chat create.

### Send Message

- Route: `POST /api/ai/chats/messages`
- Route: `POST /api/ai/chats/:chatId/messages`
- Required data: auth and either `message` text or attachments
- Optional data: `attachments` files
- API key needed: `GEMINI_API_KEY`; Cloudinary if attachments are uploaded
- What it does: sends user message to AI health chatbot, stores user and assistant messages.
- Data flow: frontend -> backend -> Gemini classification/reply -> optional Cloudinary upload -> MongoDB chat update -> frontend.

### Get, Rename, Delete Chat

- Routes: `GET /api/ai/chats/:chatId`, `PATCH /api/ai/chats/:chatId`, `DELETE /api/ai/chats/:chatId`
- Required data: auth and owned `chatId`
- Optional data: `title` for rename
- What it does: manages owned chat session.
- Data flow: frontend -> backend ownership check -> MongoDB.

## WebRTC Signaling

WebRTC signaling uses Socket.IO on the same backend server.

### Connect

- URL: `http://localhost:5000`
- Required data: access token in Socket.IO auth payload or `accessToken` cookie
- Optional data: none
- What it does: authenticates socket user.
- Data flow: frontend socket -> backend verifies JWT -> MongoDB loads user -> socket connected.

### Join Consultation

- Event: `consultation:join`
- Required data: `appointmentId`
- Optional data: none
- What it does: joins appointment signaling room if user is patient, assigned doctor, or admin.
- Data flow: frontend socket emits appointment id -> backend checks MongoDB appointment access -> socket joins room.

### Signaling Events

- Events: `webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate`
- Required data: `appointmentId` and `offer`, `answer`, or `candidate`
- Optional data: none
- What it does: relays WebRTC signaling payloads between participants in the same appointment room.
- Data flow: patient browser -> backend Socket.IO room -> doctor browser, and reverse.

Important: actual audio/video media does not pass through this backend. Backend only relays signaling data. Browser clients connect peer-to-peer or through configured WebRTC infrastructure.

## Data Sensitivity Notes

- Passwords are sent only during register, login, and password update; backend stores hashed passwords, not plain text.
- Access and refresh tokens should preferably stay in HTTP-only cookies.
- Medical reports, doctor documents, profile photos, and appointment attachments are uploaded to Cloudinary.
- AI chat and AI consultation routes may send health-related text to Gemini.
- Nearby hospital search sends approximate user location to backend, and backend sends it to Google Places.
- Frontend should never receive backend secret keys.
