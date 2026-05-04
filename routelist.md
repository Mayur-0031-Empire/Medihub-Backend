# MediHub Route List

## Health

- `GET /api/health` - Check whether the MediHub API service is running.

## Authentication

- `POST /api/auth/register` - Register a new user with profile photo upload.
- `POST /api/auth/login` - Log in with username/email and password.
- `POST /api/auth/refresh` - Refresh authentication tokens using the refresh token.
- `POST /api/auth/logout` - Log out and clear authentication cookies.

## User Profile

- `GET /api/users/me` - Get the logged-in user's profile.
- `PATCH /api/users/me` - Update logged-in user's basic profile fields.
- `PATCH /api/users/me/photo` - Update logged-in user's profile photo.
- `PATCH /api/users/me/password` - Change logged-in user's password.

## Doctor Profiles

- `GET /api/doctors` - List public verified doctors, optionally filtered by verified title.
- `GET /api/doctors/me` - Get the logged-in doctor's own profile.
- `POST /api/doctors/me` - Create a doctor profile with qualification documents.
- `PATCH /api/doctors/me` - Update doctor profile text fields and resync verification status.
- `POST /api/doctors/me/documents` - Add more qualification documents to a doctor profile.
- `GET /api/doctors/admin/pending` - Admin route to list doctor profiles with pending documents.
- `PATCH /api/doctors/admin/:doctorProfileId/verify` - Admin route to verify or reject doctor qualification documents.

## Appointments

- `GET /api/appointments/doctors/:doctorProfileId/slots` - Public route to list available slots for a verified doctor.
- `GET /api/appointments/notifications` - List logged-in user's appointment notifications.
- `GET /api/appointments/me` - List logged-in user's appointments based on role.
- `POST /api/appointments/slots` - Doctor route to create availability slots.
- `POST /api/appointments/book` - Patient route to book an available appointment slot.
- `GET /api/appointments/:appointmentId` - Get details for an appointment the user is allowed to access.
- `PATCH /api/appointments/:appointmentId/symptoms` - Patient route to add symptoms or update patient notes.
- `POST /api/appointments/:appointmentId/reports` - Patient route to upload medical reports.
- `PATCH /api/appointments/:appointmentId/doctor-notes` - Doctor route to update diagnosis, notes, transcript, or appointment status.
- `POST /api/appointments/:appointmentId/doctor-files` - Doctor route to upload consultation attachments.
- `POST /api/appointments/:appointmentId/ai-draft` - Doctor route to generate AI consultation notes and prescription draft.
- `PATCH /api/appointments/:appointmentId/prescription/approve` - Doctor route to approve final prescription text.
- `PATCH /api/appointments/:appointmentId/cancel-by-doctor` - Doctor route to cancel an appointment for emergency or other reasons.

## AI Chats

- `GET /api/ai/chats` - List logged-in user's AI chat sessions.
- `POST /api/ai/chats` - Create a new AI chat session.
- `POST /api/ai/chats/messages` - Send a message and optional attachments, creating a chat if needed.
- `GET /api/ai/chats/:chatId` - Get one owned AI chat session.
- `PATCH /api/ai/chats/:chatId` - Rename one owned AI chat session.
- `DELETE /api/ai/chats/:chatId` - Delete one owned AI chat session.
- `POST /api/ai/chats/:chatId/messages` - Send a message and optional attachments to an existing chat.

## BMI Buddy

- `GET /api/bmi-buddy` - Public route to explain BMI shortly and show required BMI parameters.
- `POST /api/bmi-buddy/calculate` - Public route to calculate BMI and return diet, workout, and lifestyle plans.

## Hospital Locator

- `GET /api/hospital-locator/map-config` - Public route to return Google Maps frontend configuration.
- `GET /api/hospital-locator/photo` - Public route to redirect a Google Places photo name to its image URL.
- `GET /api/hospital-locator/hospitals` - Public route to list locally stored hospital profiles.
- `POST /api/hospital-locator/hospitals` - Public route to create a local hospital profile.
- `GET /api/hospital-locator/nearby` - Public route to fetch nearby hospitals from Google Places using latitude, longitude, and rangeKm.
