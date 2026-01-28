# EPC Client Management System

A password-protected internal client management system for Elite Performance Clinic.

## Access

- **URL:** `/clients/` or `/clients/index.html`
- **Password:** `15125`

## Features

### 1. Password Protection
- Session-based authentication
- Automatic redirect to login if not authenticated

### 2. Client Dashboard
- View all clients (Shared and Personal)
- Search clients by name
- Filter by category (All/Shared/Personal)
- Sort by name, date, or assessment due date
- Add new clients with full profile information

### 3. Client Profile - Initial Assessment Tab
- Proteus Score
- PEDICS Review
- Overhead Squat Assessment (Knee Valgus/Varus, Hip Shift, Overall Score)
- Shoulder Mobility (Right/Left scores 1-3)
- Hamstring Mobility Score
- Push-up Assessment Score
- Full assessment history view

### 4. Client Profile - Program Builder Tab
- Exercise library with 35+ pre-loaded exercises
- Add custom exercises
- Build programs by week (1-6 weeks)
- Set exercises with Sets, Reps, Weight, Rest, Notes
- Save programs to client history
- **Print functionality** - Generate printable program sheets for athletes

### 5. Client Profile - Program Photos Tab
- Upload photos of completed paper programs
- **OCR Text Extraction** using Tesseract.js
- Extract both typed and handwritten text
- View original photo, extracted text, or side-by-side comparison
- Photo gallery with chronological history

### 6. Client Profile - Progress Notes Tab
- Add timestamped progress notes
- Chronological timeline view
- Quick note entry

### 7. Client Profile - PT Coordination Tab
- Add timestamped PT coordination notes
- Separate communication log for physical therapy coordination

### 8. Parent Portal – Purchase a Package (Square)
- Parents can buy session packages from the read-only parent view.
- **Purchase a Package** uses **Square** for payments (outline only until credentials are added).
- Package options and “Pay with Square” UI are in place; card form and charges activate once Square is configured.

## Square Payment Setup (connect your Square account)

To enable “Purchase a Package” in the Parent Portal:

1. **Add environment variables in Vercel**
   - Go to [Vercel](https://vercel.com) → your project → **Settings** → **Environment Variables**.
   - Add these three (required):

   | Name | Where to get it |
   |------|------------------|
   | `SQUARE_APPLICATION_ID` | [Square Developer Console](https://developer.squareup.com/apps) → your app → **Credentials** → **Application ID** (use Sandbox or Production depending on mode) |
   | `SQUARE_ACCESS_TOKEN` | Same app → **Credentials** → **Access Token** (Sandbox **or** Production – must match the Application ID mode) |
   | `SQUARE_LOCATION_ID` | Same app → **Locations** in the left nav → pick a location → **Location ID** (Sandbox location for testing, or your real location for live payments) |

   - Optional: set `SQUARE_USE_SANDBOX=true` when testing with sandbox credentials so the parent view loads the Square sandbox script.

2. **Redeploy**
   - Trigger a new deployment (e.g. push a commit or use “Redeploy” in Vercel) so the new env vars are picked up.

3. **Check it works**
   - Log in to the Parent Portal and open a child’s view. If all three env vars are set, you’ll see the card form and “Pay with Square” after choosing a package. The backend uses **POST /api/create-square-payment** to charge the card.

## Data Storage

All data is stored locally in the browser using **IndexedDB**. No server required.

## Technical Stack

- **Frontend:** HTML, CSS, JavaScript (Vanilla JS)
- **Storage:** IndexedDB (browser database)
- **OCR:** Tesseract.js (browser-based text extraction)
- **Design:** EPC Black Label aesthetic with glassmorphism and film grain

## Browser Compatibility

- Modern browsers with IndexedDB support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile responsive design

## File Structure

```
clients/
├── index.html          # Login page
├── dashboard.html      # Client dashboard
├── client.html         # Client profile page
├── styles.css          # Black Label design system
├── app.js              # Login & dashboard logic
├── client.js           # Client profile logic
└── db.js               # IndexedDB database functions
```

## Usage Guide

### Adding a New Client
1. Click "Add New Client" on dashboard
2. Fill in client information
3. Select category (Shared/Personal)
4. Save

### Creating an Assessment
1. Open client profile
2. Navigate to "Initial Assessment" tab
3. Fill in all movement screen data
4. Click "Save Assessment"
5. Assessment is automatically timestamped

### Building a Program
1. Open client profile
2. Navigate to "Program Builder" tab
3. Click exercises from the library to add them
4. Fill in Sets, Reps, Weight, Rest, Notes for each exercise
5. Select program week
6. Click "Save Program" to save, or "Print Program" to generate printable version

### Uploading Program Photos
1. Navigate to "Program Photos" tab
2. Click "Upload Program Photo"
3. Select or take photo
4. Click "Process & Extract Text" for OCR
5. Review extracted text, edit if needed
6. Save photo and text

### Adding Notes
- **Progress Notes:** Click "Add Note" in Progress Notes tab
- **PT Notes:** Click "Add PT Note" in PT Coordination tab

## Design Features

- **Black Label Aesthetic:** Dark background (#0a0a0a) with gold accents (#C9B27F)
- **Glassmorphism:** Frosted glass effect on cards
- **Film Grain:** Subtle texture overlay
- **Luxury Typography:** Playfair Display for headings, wide letter-spacing
- **Smooth Animations:** 0.3s+ transitions with easing
- **Responsive:** Mobile-friendly layout

## Notes

- All data is stored locally in the browser
- Data persists between sessions
- Each client has full history (assessments, programs, photos, notes)
- No data is ever deleted (full history maintained)
