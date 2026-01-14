## Airtable setup prompt: Booking Requests (booking.html)

Copy/paste the following into your Airtable build notes (or share with anyone setting up Airtable) so the table + field names exactly match what the booking request page collects.

### Create a new table
- **Table name**: `Booking Requests`

### Create these fields (exact spelling and capitalization)

#### Required fields (must exist)
- **Name** (Single line text)
- **Email** (Email)
- **Phone** (Phone number)
- **Submitted At** (Date/time, time enabled)

#### Booking detail fields (recommended)
- **Service of Interest** (Single select)
  - Options you can add: `Assessment`, `Physical Therapy`, `Performance Training`, `Recovery Services`, `Football Academy`, `Other`
- **Preferred Days** (Long text)
  - Stored as a comma-separated string, e.g. `Mon, Wed, Fri`
- **Preferred Time Window** (Long text)
  - Stored as a comma-separated string, e.g. `Morning, Afternoon`
- **Time Option 1** (Date/time)
- **Time Option 2** (Date/time)
- **Time Option 3** (Date/time)
- **Notes** (Long text)
- **Source** (Single line text)
  - The site sets this to `booking-request-page`

### Submission requirements
- **Do not** send empty strings for date fields in Airtable. If an option is blank, the site omits the field.
- **Submitted At** is stored in ISO format.

