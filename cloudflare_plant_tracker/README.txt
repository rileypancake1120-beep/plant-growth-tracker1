PLANT GROWTH TRACKER — CLOUDFLARE PAGES + D1
================================================

What this version does
- Hosts the site online without a paid custom domain.
- Stores daily records in Cloudflare D1, not in local browser storage or Google Sheets.
- Anyone with the website link can view records, use the moisture chart, and export CSV.
- Saving/replacing a date requires the editing password set privately in Cloudflare.
- Keeps the existing fields: date, container ID, low/high temperature, low/high humidity,
  soil moisture, soil pH, plant condition, container notes, and daily notes.
- Does not include plant height, water added, or vegetable type.

PROJECT FILES
- public/index.html     website layout
- public/style.css      appearance
- public/script.js      browser logic
- public/_headers       basic security headers
- functions/api/records.js   online database API
- schema.sql            creates the D1 table

PART 1 — OPEN AND EDIT IN VISUAL STUDIO CODE
1. Extract this ZIP to a folder you can find, such as Documents/PlantTracker.
2. Open Visual Studio Code.
3. Choose File > Open Folder and select the extracted plant_tracker_cloudflare folder.
4. The website files are in the public folder. The API is in functions/api/records.js.
5. Do not put the editing password in any file. It will be set as a Cloudflare secret later.

PART 2 — CREATE A GITHUB REPOSITORY
Cloudflare Pages needs a Git provider for this project because it uses a Pages Function.
1. Sign in to GitHub and create a new repository named plant-growth-tracker.
2. For the simplest setup, make the repository private if that option is available.
3. Upload the CONTENTS of this project folder to the repository root. The root must contain:
   public/  functions/  schema.sql  README.txt
   Do not upload the ZIP file instead of extracting it.
4. Commit/save the uploaded files.

PART 3 — CREATE THE CLOUDFLARE PAGES SITE
1. Sign in to Cloudflare and open Workers & Pages.
2. Choose to create a Pages application and connect it to Git.
3. Select the plant-growth-tracker GitHub repository.
4. Use these build settings:
   - Framework preset: None
   - Build command: leave blank
   - Build output directory: public
   - Root directory: leave blank (repository root)
5. Deploy the site. Cloudflare will provide a free address ending in pages.dev.
6. The page may show a database setup error until you finish the following steps.

PART 4 — CREATE THE ONLINE DATABASE
1. In Cloudflare, go to Workers & Pages > D1 SQL Database (the menu may be labelled D1).
2. Create a database named plant-tracker-db.
3. Open that database's Console / SQL console.
4. Open schema.sql in Visual Studio Code, copy all of its SQL, paste it into the D1 console, and run it.
   This creates the daily_records table. Do not use DROP TABLE; it would erase data.

PART 5 — CONNECT THE DATABASE TO YOUR SITE
1. Go to Workers & Pages and open your Pages project (plant-growth-tracker).
2. Open Settings > Bindings (or Settings > Functions > Bindings, depending on the dashboard).
3. Add a D1 database binding.
4. Set the Variable name to exactly: DB
5. Select plant-tracker-db and save.
6. Redeploy the site so the binding takes effect.

PART 6 — SET THE PRIVATE EDITING PASSWORD
1. Open your Pages project in Cloudflare.
2. Go to Settings > Variables and Secrets (sometimes shown under Settings > Environment variables).
3. Add a secret named exactly: EDIT_PASSWORD
4. For its value, create a long, unique password that you and your father-in-law can both use.
5. Save it as a Secret, not a plain-text variable if Cloudflare offers that choice.
6. Redeploy the site after adding the secret.
7. Enter this same password in the website's Editing password box whenever you save a record.
   The website does not save that password to local storage.

PART 7 — TEST IT
1. Open the public pages.dev website address.
2. The site should say it connected and show an empty record list if the database is new.
3. Enter a date, weather readings, and at least one container.
4. Enter the editing password and click Save Daily Record.
5. Open the same website on another laptop. The saved record should appear there too.
6. Try Export CSV to download the saved readings.
7. A visitor without the editing password can view/export records but cannot save them.

IMPORTANT NOTES
- Public means anyone who gets the link can view the plant readings, notes, and CSV export. Do not put private information in notes.
- The shared editing password is a basic access control for a small personal project, not a full user-account system. Share it only with people allowed to edit records. Anyone who knows it can replace a day's record.
- Each date is one daily record. Saving another record for the same date replaces that date's existing record, including its container readings.
- Keep occasional CSV backups. Free service plans have limits and terms that may change.
- This package is a project template; you must complete the Cloudflare setup before the shared online database works.
