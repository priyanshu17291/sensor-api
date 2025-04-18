// const express = require('express');
// const cors = require('cors'); // Import the cors package
// const app = express();
// const port = 3000;

// // Enable CORS for all routes
// app.use(cors());
// const origin = Date.now(); // Origin time for the sensor data

// // In-memory datastore for sensor readings.
// let dataStore = [];

// // Generate high frequency data every millisecond.
// // Note: setInterval isn't perfect for sub-millisecond timing, but this simulates a 1 kHz data rate.
// setInterval(() => {
//   const now = Date.now(); // Time since the origin in milliseconds
//   // Generate a random value in the range [-1e-4, 1e-3]
//   const value1 = (Math.random() * (1e-3 + 1e-4)) - 1e-4;
//   const value2 = (Math.random() * (1e-3 + 1e-4)) - 1e-4;
//   const value3 = (Math.random() * (1e-3 + 1e-4)) - 1e-4;
//   const value4 = (Math.random() * (1e-3 + 1e-4)) - 1e-4;
//   const value5 = (Math.random() * (1e-3 + 1e-4)) - 1e-4;
//   const value6 = (Math.random() * (1e-3 + 1e-4)) - 1e-4;
//   const value7 = (Math.random() * (1e-3 + 1e-4)) - 1e-4;
//   const values = [value1, value2, value3, 1, value5, value6, value7];
//   dataStore.push({ time: now, values });
//   // console.log(`Data generated: Time: ${now} ms, Values: ${values}`);
  
//   // Optionally, limit the datastore size to avoid memory issues (e.g., keep latest 1,000,000 entries).
//   if (dataStore.length > 1e6) {
//     dataStore.shift();
//   }
// }, 1);

// // API endpoint to fetch data with optional time filtering.
// app.get('/api/data', (req, res) => {
//   let start = req.query.start ? parseInt(req.query.start) : null;
//   let end = req.query.end ? parseInt(req.query.end) : null;
//   let filteredData = dataStore;
//   if (start !== null) {
//     filteredData = filteredData.filter(d => d.time >= start);
//   }
//   if (end !== null) {
//     filteredData = filteredData.filter(d => d.time <= end);
//   }
//   res.json(filteredData);
// });

// // Serve static files and listen on the port
// app.use(express.static('public'));
// app.listen(port, () => {
//   console.log(`Server listening at http://localhost:${port}`);
// });


const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// In-memory datastore for sensor readings.
let dataStore = [];

// --- CSV loading & parsing ---
const csvPath = path.join(__dirname, 'sensor_data.csv');
const rawCsv = fs.readFileSync(csvPath, 'utf-8');

// Split on newlines, filter out empty lines, then split on tabs or commas:
const csvRows = rawCsv
  .split(/\r?\n/)
  .filter(line => line.trim())
  .map(line => line
    .trim()
    .split(/\t|,/)
    .map(str => parseFloat(str))
  );

// Sanity check:
if (csvRows.length === 0) {
  console.error('No data found in data.csv!');
  process.exit(1);
}

// We'll cycle through these rows in a ring buffer fashion.
let csvIndex = 0;

// --- High‑frequency data generator ---
setInterval(() => {
  // Grab next row and advance (wrapping at end)
  const row = csvRows[csvIndex];
  csvIndex = (csvIndex + 1) % csvRows.length;

  // First entry in CSV row is the original time; we ignore it and use Date.now() instead
  const now = Date.now();
  const values = row.slice(1);

  dataStore.push({ time: now, values });

  // Keep only the latest 1e6 entries
  if (dataStore.length > 1e6) {
    dataStore.shift();
  }
}, 1);

// --- API endpoint ---
app.get('/api/data', (req, res) => {
  let start = req.query.start ? parseInt(req.query.start, 10) : null;
  let end   = req.query.end   ? parseInt(req.query.end,   10) : null;

  let filtered = dataStore;
  if (start !== null) filtered = filtered.filter(d => d.time >= start);
  if (end   !== null) filtered = filtered.filter(d => d.time <= end);

  res.json(filtered);
});

// Serve static files and start server
app.use(express.static('public'));
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
