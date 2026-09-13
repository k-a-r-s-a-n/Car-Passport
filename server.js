const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

const staticDir = path.join(__dirname, "frontend");

// Serve static assets from the frontend directory
app.use(express.static(staticDir));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "CarPassport" });
});

// Fallback to index.html for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`CarPassport app running on http://0.0.0.0:${PORT}`);
});
