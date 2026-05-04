# MediHub Backend

MediHub Backend is an Express and MongoDB API for a telemedicine platform. It supports user authentication, doctor verification, appointments, WebRTC signaling, AI health chat, AI-assisted consultation drafts, BMI guidance, and nearby hospital discovery.

## Features

- User registration, login, logout, refresh tokens, and profile management
- HTTP-only cookie based authentication with JWT access and refresh tokens
- Patient, doctor, and admin role-based access control
- Doctor profile creation with qualification document upload and admin verification
- Appointment slot creation, booking, consultation notes, reports, prescriptions, and cancellation flow
- Socket.IO signaling for WebRTC consultation rooms
- Gemini-powered AI health chatbot and consultation draft generation
- Cloudinary-backed image and document upload handling
- Public BMI Buddy calculator with diet, workout, and lifestyle recommendations
- Public nearby hospital locator using Google Places API
- Local hospital profile storage support through MongoDB

## Tech Stack

- Node.js
- Express
- MongoDB and Mongoose
- Socket.IO
- JWT
- Multer
- Cloudinary
- Gemini API
- Google Places API

## Project Structure

```txt
src/
  app.js
  server.js
  config/
  controllers/
  middleware/
  models/
  routes/
  services/
  utils/
public/
  temp/
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then fill in the required values.

### 3. Start Development Server

```bash
npm run dev
```

The API runs on:

```txt
http://localhost:5000
```

### 4. Start Production Server

```bash
npm start
```

## Environment Variables

### Required Core Variables

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:3000
```

### Uploads

Required for profile photos, doctor documents, reports, and attachments:

```env
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### AI Features

Required for AI chat and AI consultation draft generation:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_MAX_OUTPUT_TOKENS=900
```

### Hospital Locator

Required for real nearby hospital search:

```env
GOOGLE_PLACES_API_KEY=your_server_restricted_google_places_api_key
GOOGLE_PLACES_LANGUAGE_CODE=en
GOOGLE_PLACES_REGION_CODE=IN
```

Optional map configuration:

```env
GOOGLE_MAPS_BROWSER_API_KEY=your_browser_restricted_google_maps_javascript_api_key
GOOGLE_MAPS_MAP_ID=your_google_maps_map_id
GOOGLE_MAPS_DEFAULT_ZOOM=12
```

Keep server secrets such as MongoDB URI, JWT secrets, Cloudinary secret, Gemini key, and Google Places key out of frontend code.

## Authentication

Register and login issue:

- `accessToken`
- `refreshToken`

Tokens are set as HTTP-only cookies. Protected routes accept either cookies or an `Authorization: Bearer <token>` header where supported.

## API Overview

### Health

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/health` | Check API status |

### Authentication

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Register user with profile photo |
| POST | `/api/auth/login` | Login with username or email |
| POST | `/api/auth/refresh` | Refresh auth tokens |
| POST | `/api/auth/logout` | Logout and clear cookies |

### User Profile

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/users/me` | Get current user profile |
| PATCH | `/api/users/me` | Update profile text fields |
| PATCH | `/api/users/me/photo` | Update profile photo |
| PATCH | `/api/users/me/password` | Update password |

### Doctors

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/doctors` | List public verified doctors |
| GET | `/api/doctors/me` | Get logged-in doctor's profile |
| POST | `/api/doctors/me` | Create doctor profile |
| PATCH | `/api/doctors/me` | Update doctor profile |
| POST | `/api/doctors/me/documents` | Add doctor qualification documents |
| GET | `/api/doctors/admin/pending` | Admin list of pending doctor profiles |
| PATCH | `/api/doctors/admin/:doctorProfileId/verify` | Admin verify or reject doctor documents |

### Appointments

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/appointments/doctors/:doctorProfileId/slots` | List available doctor slots |
| GET | `/api/appointments/notifications` | List user notifications |
| GET | `/api/appointments/me` | List user appointments |
| POST | `/api/appointments/slots` | Doctor creates availability slots |
| POST | `/api/appointments/book` | Patient books appointment |
| GET | `/api/appointments/:appointmentId` | Get appointment details |
| PATCH | `/api/appointments/:appointmentId/symptoms` | Patient adds symptoms or notes |
| POST | `/api/appointments/:appointmentId/reports` | Patient uploads reports |
| PATCH | `/api/appointments/:appointmentId/doctor-notes` | Doctor updates consultation notes |
| POST | `/api/appointments/:appointmentId/doctor-files` | Doctor uploads consultation files |
| POST | `/api/appointments/:appointmentId/ai-draft` | Generate AI consultation draft |
| PATCH | `/api/appointments/:appointmentId/prescription/approve` | Approve prescription |
| PATCH | `/api/appointments/:appointmentId/cancel-by-doctor` | Doctor cancels appointment |

### AI Chat

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/ai/chats` | List user chats |
| POST | `/api/ai/chats` | Create chat |
| POST | `/api/ai/chats/messages` | Send message and create chat if needed |
| GET | `/api/ai/chats/:chatId` | Get chat |
| PATCH | `/api/ai/chats/:chatId` | Rename chat |
| DELETE | `/api/ai/chats/:chatId` | Delete chat |
| POST | `/api/ai/chats/:chatId/messages` | Send message to existing chat |

### BMI Buddy

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/bmi-buddy` | Get BMI explanation and required parameters |
| POST | `/api/bmi-buddy/calculate` | Calculate BMI and return health plans |

Example request:

```json
{
  "heightCm": 170,
  "weightKg": 82
}
```

### Hospital Locator

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/hospital-locator/map-config` | Get non-secret map configuration |
| GET | `/api/hospital-locator/photo` | Redirect Google Places photo |
| GET | `/api/hospital-locator/nearby` | Fetch nearby hospitals from Google Places |
| GET | `/api/hospital-locator/hospitals` | List local hospital profiles |
| POST | `/api/hospital-locator/hospitals` | Create local hospital profile |

Nearby hospital example:

```http
GET /api/hospital-locator/nearby?latitude=12.9716&longitude=77.5946&rangeKm=5&specialty=Cardiology
```

`rangeKm` must be between `1` and `50`.

## WebRTC Signaling

The backend uses Socket.IO on the same server for WebRTC signaling.

Connection URL:

```txt
http://localhost:5000
```

Client example:

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  withCredentials: true
});
```

If cookies are not available:

```js
const socket = io("http://localhost:5000", {
  auth: {
    token: accessToken
  }
});
```

Events:

```js
socket.emit("consultation:join", { appointmentId }, callback);
socket.emit("webrtc:offer", { appointmentId, offer });
socket.emit("webrtc:answer", { appointmentId, answer });
socket.emit("webrtc:ice-candidate", { appointmentId, candidate });

socket.on("consultation:peer-joined", handler);
socket.on("consultation:peer-left", handler);
socket.on("webrtc:offer", handler);
socket.on("webrtc:answer", handler);
socket.on("webrtc:ice-candidate", handler);
```

Only the appointment patient, assigned doctor, or admin can join a consultation room. The backend relays signaling only; media streams are handled by browser WebRTC.

## File Upload Flow

Uploaded files are temporarily stored in:

```txt
public/temp
```

Then they are uploaded to Cloudinary and removed locally. MongoDB stores the Cloudinary URL and metadata.

## Documentation

- [Route list](./routelist.md)
- [API data flow](./API_DATA_FLOW.md)

## Security Notes

- Do not commit `.env`.
- Keep backend API keys server-side.
- Use HTTP-only cookies for authentication.
- Restrict browser Google Maps keys by HTTP referrer.
- Restrict server Google Places keys by API usage where possible.
- Medical documents, AI prompts, location data, and consultation data should be treated as sensitive.

## Scripts

```bash
npm run dev
npm start
```

## License

This project is currently private/internal. Add a license before public distribution.
