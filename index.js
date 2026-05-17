const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn("Missing SUPABASE_URL or SUPABASE_KEY environment variables.");
}

app.get("/", (request, response) => {
  response.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/about", (request, response) => {
  response.sendFile(path.join(__dirname, "public", "about.html"));
});

app.get("/compare", (request, response) => {
  response.sendFile(path.join(__dirname, "public", "compare.html"));
});

/*
  API endpoint 1:
  External provider endpoint.
  Gets country data from REST Countries API.
*/
app.get("/api/countries/:name", async (request, response) => {
  const countryName = request.params.name;

  const fields = [
    "name",
    "flags",
    "capital",
    "region",
    "subregion",
    "population",
    "area",
    "languages",
    "currencies",
    "timezones",
    "borders",
    "latlng",
  ].join(",");

  const apiUrl = `https://restcountries.com/v3.1/name/${encodeURIComponent(
    countryName,
  )}?fields=${fields}`;

  try {
    const apiResponse = await fetch(apiUrl);

    if (!apiResponse.ok) {
      response.status(apiResponse.status).json({
        message: "Country search failed.",
      });
      return;
    }

    const countries = await apiResponse.json();
    response.json(countries);
  } catch (error) {
    console.error("Country API error:", error);

    response.status(500).json({
      message: "Unable to retrieve country data.",
    });
  }
});

/*
  API endpoint 2:
  Retrieves saved countries from Supabase database.
*/
app.get("/api/favorites", async (request, response) => {
  if (!supabase) {
    response.status(500).json({
      message: "Supabase is not configured on the server.",
    });
    return;
  }

  const { data, error } = await supabase
    .from("saved_countries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase select error:", error);

    response.status(500).json({
      message: "Unable to retrieve saved countries.",
      details: error.message,
    });
    return;
  }

  response.json(data);
});

/*
  API endpoint 3:
  Writes a saved country to Supabase database.
*/
app.post("/api/favorites", async (request, response) => {
  if (!supabase) {
    response.status(500).json({
      message: "Supabase is not configured on the server.",
    });
    return;
  }

  const {
    country_name,
    official_name,
    capital,
    region,
    subregion,
    population,
    area,
    flag_url,
  } = request.body;

  if (!country_name) {
    response.status(400).json({
      message: "country_name is required.",
    });
    return;
  }

  const { data: existingCountry, error: existingError } = await supabase
    .from("saved_countries")
    .select("*")
    .ilike("country_name", country_name)
    .maybeSingle();

  if (existingError) {
    console.error("Supabase duplicate check error:", existingError);

    response.status(500).json({
      message: "Unable to check saved countries.",
      details: existingError.message,
    });
    return;
  }

  if (existingCountry) {
    response.status(409).json({
      message: `${country_name} is already saved.`,
    });
    return;
  }

  const { data, error } = await supabase
    .from("saved_countries")
    .insert({
      country_name,
      official_name,
      capital,
      region,
      subregion,
      population,
      area,
      flag_url,
    })
    .select();

  if (error) {
    console.error("Supabase insert error:", error);

    response.status(500).json({
      message: "Unable to save country.",
      details: error.message,
    });
    return;
  }

  response.status(201).json(data[0]);
});

/*
  Optional useful endpoint:
  Deletes a saved country from Supabase.
*/
app.delete("/api/favorites/:id", async (request, response) => {
  if (!supabase) {
    response.status(500).json({
      message: "Supabase is not configured on the server.",
    });
    return;
  }

  const id = request.params.id;

  const { error } = await supabase
    .from("saved_countries")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Supabase delete error:", error);

    response.status(500).json({
      message: "Unable to delete saved country.",
      details: error.message,
    });
    return;
  }

  response.json({
    message: "Saved country deleted.",
  });
});

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Country Compare app is available on port ${port}`);
  });
}
