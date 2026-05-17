# Developer Manual

This manual is for future developers who will maintain and extend the Country Comparison App.

## Installation

Clone the Repository: 

```bash
git clone git@github.com:daltonw11/Country-Comparison-App.git
cd Country-Comparison-App
```

Install all dependencies:

```bash
npm install
```

Create a `keys.env` file in the main project directory:

```text
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_or_project_key
```

Make sure the following files and folders are ignored by Git:

```gitignore
keys.env
```

## Running the Application

To run the application locally:

```bash
npm start
```

Then open the application in a browser:

```text
http://localhost:3000
```

For deployment on Vercel, add these environment variables in the Vercel project settings:

```text
SUPABASE_URL
SUPABASE_KEY
```

Then deploy from the connected GitHub repository.

## Running Tests

No automated tests have been written for this application. Manual testing should include the following checks:

1. Search for a country on the Compare page.
2. Add a country to the comparison dashboard.
3. Confirm the population chart updates.
4. Confirm the Leaflet map loads.
5. Save a country to the database.
6. Confirm saved countries load on the Home and Compare pages.
7. Add a saved country from the Home page to the comparison dashboard.
8. Confirm duplicate saved countries are blocked.
9. Delete a saved country from the Compare page.

## Server API Endpoints

### `GET /`

Serves the Home page.

### `GET /about`

Serves the About page.

### `GET /compare`

Serves the Compare page.

### `GET /api/countries/:name`

Retrieves country data from the REST Countries API through the backend.

Example:

```http
GET /api/countries/france
```

This endpoint is used by the country search feature.

### `GET /api/favorites`

Retrieves saved countries from the Supabase `saved_countries` table.

Example:

```http
GET /api/favorites
```

This endpoint is used on the Home page and Compare page.

### `POST /api/favorites`

Saves a country to the Supabase `saved_countries` table.

Example request body:

```json
{
  "country_name": "France",
  "official_name": "French Republic",
  "capital": "Paris",
  "region": "Europe",
  "subregion": "Western Europe",
  "population": 67391582,
  "area": 551695,
  "flag_url": "https://flagcdn.com/w320/fr.png"
}
```

This endpoint blocks duplicate saved countries by checking the country name before inserting.

### `DELETE /api/favorites/:id`

Deletes a saved country from the Supabase database.

Example:

```http
DELETE /api/favorites/1
```

This endpoint is used on the Compare page.

## Known Bugs

- Saved countries added to comparison from the database may not appear on the map because the database table does not currently store latitude and longitude.
- Saved countries are global for all users because the application does not currently include authentication.
- No automated tests are currently implemented.

## Future Development Roadmap

Future developers should consider adding:
1. Supabase authentication for user-specific saved countries.
2. Automated tests for backend API routes.
4. PATCH support for editing saved country notes.
3. Additional chart options for area, languages, currencies, or time zones.