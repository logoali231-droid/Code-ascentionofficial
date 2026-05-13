const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const scalaRunner = require("./languages/scala");
const vbnetRunner = require("./languages/vbnet");
const { validateCode } = require("./security");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  exec("docker info", (error) => {
    res.json({
      server: "online",
      docker: !error,
      timestamp: new Date().toISOString()
    });
  });
});

app.post("/run", async (req, res) => {
  const { language, code } = req.body;

  try {
    if (!language || !code) throw new Error("Missing language or code");

    validateCode(code);

    let output = "";
    switch (language.toLowerCase()) {
      case "scala":
        output = await scalaRunner(code);
        break;
      case "vbnet":
      case "vb":
        output = await vbnetRunner(code);
        break;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }

    res.json({ success: true, output });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`⚡ Code Ascension Runtime rodando na porta ${PORT}`);
});