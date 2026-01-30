# Airtable Setup Guide

## Required Environment Variables (Set in Vercel)

1. **AIRTABLE_API_KEY** - Your Airtable Personal Access Token
2. **AIRTABLE_BASE_ID** - Your Airtable Base ID (starts with `app...`)
3. **RESEND_API_KEY** - Your Resend API key (for email notifications)

## Airtable Tables Required

### 1. Contact Form Submissions
**Table Name:** `Contact Form Submissions`

**Fields:**
- `Name` (Single line text)
- `Email` (Email)
- `Phone` (Phone number) - Optional
- `Subject` (Single line text)
- `Message` (Long text)
- `Submitted At` (Date with time)

### 2. Email List Signups
**Table Name:** `Email List Signups`

**Fields:**
- `Name` (Single line text) - Optional
- `Email` (Email)
- `Source` (Single line text) - Optional
- `Submitted At` (Date with time)

### 3. Winter Ball Registrations
**Table Name:** `Winter Ball Registrations` (exact name required)

**Fields (names must match exactly):**
- `Athlete Name` (Single line text)
- `Parent/Guardian Name` (Single line text)
- `Phone Number` (Phone number)
- `Email` (Email)
- `Program` (Single line text)
- `Submitted At` (Date or Single line text)
- `Age` (Number) - Optional
- `Position` (Single line text) - Optional
- `Club or School Team` (Single line text) - Optional

### 4. Full-Time Academy Applications
**Table Name:** `Full-Time Academy Applications`

**Fields:**
- `First Name` (Single line text)
- `Last Name` (Single line text)
- `Parent Name` (Single line text)
- `Phone` (Phone number)
- `Email` (Email)
- `Grade` (Single line text) - Optional
- `Sport` (Single line text) - Optional
- `Date of Birth` (Date) - Optional
- `Start Term` (Single line text) - Optional
- `Homeschool Program` (Single line text) - Optional
- `Academic Priorities` (Long text) - Optional
- `Highlight Tape URL` (URL) - Optional
- `Additional Notes` (Long text) - Optional
- `Submitted At` (Date with time)

### 5. Part-Time Academy Applications
**Table Name:** `Part-Time Academy Applications`

**Fields:**
- `First Name` (Single line text)
- `Last Name` (Single line text)
- `Parent Name` (Single line text)
- `Phone` (Phone number)
- `Email` (Email)
- `Grade` (Single line text) - Optional
- `Sport` (Single line text) - Optional
- `Date of Birth` (Date) - Optional
- `Start Term` (Single line text) - Optional
- `Training Schedule` (Long text) - Optional
- `Development Goals` (Long text) - Optional
- `Highlight Tape URL` (URL) - Optional
- `Additional Notes` (Long text) - Optional
- `Submitted At` (Date with time)

## Testing

After setting up environment variables in Vercel:
1. Redeploy your site (Vercel will pick up the new env vars)
2. Test each form
3. Check the Vercel function logs if submissions fail
4. Verify data appears in your Airtable base

## Troubleshooting

- **Form submits but no data in Airtable:** Check Vercel function logs for errors
- **"Failed to save to Airtable" error:** Verify table names match exactly (case-sensitive)
- **"Missing required fields" error:** Check that required fields are filled in the form
- **Email notifications not sending:** Verify RESEND_API_KEY is set correctly
