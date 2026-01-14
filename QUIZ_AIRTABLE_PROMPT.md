## Airtable setup prompt: EPC Intake Quiz (Homepage)

Copy/paste the following into your Airtable build notes (or share with anyone setting up Airtable) so the table + field names exactly match what the website collects today.

### Create a new table
- **Table name**: `EPC Intake Quiz Submissions`

### Create these fields (exact spelling and capitalization)

#### Required fields (from the form submit)
- **Email** (Email)
- **Goal** (Single select)
- **Body Areas** (Long text)
- **Activity Level** (Single select)
- **Priority** (Single select)
- **Submitted At** (Date/time)

#### Optional but recommended tracking fields
- **Source** (Single line text) - set to `homepage-intake-quiz`
- **Protocol List** (Long text) - optional: store the generated protocol items as a newline-separated list
- **Protocol Summary** (Long text) - optional: store the generated summary sentence

### Single select options (exact values)

#### Goal (Single select)
- `recovery` (label shown on site: Recovery from Injury)
- `performance` (label shown on site: Performance Optimization)
- `prevention` (label shown on site: Longevity & Prevention)
- `pain` (label shown on site: Chronic Pain Management)

#### Activity Level (Single select)
- `pro-athlete` (label: Professional Athlete)
- `competitive` (label: Competitive Amateur)
- `active-exec` (label: Active Executive)
- `weekend` (label: Weekend Warrior)

#### Priority (Single select)
- `immediate-relief` (label: Immediate Pain Relief)
- `performance` (label: Long-term Performance)
- `prevention` (label: Injury Prevention)

### Body Areas (what the quiz can send)
The site stores body areas as a comma-separated string of the selected `data-area` values, plus the UI displays the labels.

#### Values sent by the site (data-area)
- `head` (label: Head / Neck)
- `torso` (label: Torso (Chest / Back / Spine))
- `left-arm` (label: L Extremity (Shoulder / Elbow / Wrist))
- `right-arm` (label: R Extremity (Shoulder / Elbow / Wrist))
- `hips` (label: Hips / Pelvis)
- `left-leg` (label: L Extremity (Hip / Knee / Ankle / Foot))
- `right-leg` (label: R Extremity (Hip / Knee / Ankle / Foot))

Recommended Airtable field type for **Body Areas**:
- Use **Long text** for maximum compatibility (the site sends one string like `head, left-leg, hips`)
- If you want structure later, you can add another field like **Body Areas (multi)** (Multiple select) and map it during integration

### Field mapping from the website (current)
These are the **current HTML field names** in `index.html`:
- `email` (visible input in the Result step) -> Airtable field **Email**
- `goal` (hidden input `formGoal`) -> Airtable field **Goal**
- `body_areas` (hidden input `formBodyAreas`) -> Airtable field **Body Areas**
- `activity` (hidden input `formActivity`) -> Airtable field **Activity Level**
- `priority` (hidden input `formPriority`) -> Airtable field **Priority**

### Submission requirements (for your future integration)
- Save a timestamp to **Submitted At** (ISO format is fine)
- Do not send empty strings for date fields (omit the field or send a valid date)

