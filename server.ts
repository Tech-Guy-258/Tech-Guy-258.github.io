import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("diva.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    company TEXT,
    email TEXT,
    phone TEXT,
    categories TEXT,
    description TEXT,
    urgency TEXT,
    source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for quotes
  app.post("/api/quote", (req, res) => {
    const { name, company, email, phone, categories, description, urgency, source } = req.body;

    try {
      const stmt = db.prepare(`
        INSERT INTO quotes (name, company, email, phone, categories, description, urgency, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(name, company, email, phone, JSON.stringify(categories), description, urgency, source);

      // SIMULATION OF EMAIL SENDING
      // In a real production environment, you would use a service like SendGrid, Mailgun or AWS SES.
      // Example with a hypothetical service:
      /*
      await emailService.send({
        to: "luispedrochale@gmail.com",
        subject: `Novo Orçamento: ${company}`,
        text: `Novo pedido de orçamento recebido de ${name} (${company})...`
      });
      */
      
      console.log("------------------------------------------");
      console.log("NOVO PEDIDO DE ORÇAMENTO RECEBIDO");
      console.log(`PARA: luispedrochale@gmail.com`);
      console.log(`DE: ${name} (${email})`);
      console.log(`EMPRESA: ${company}`);
      console.log(`CATEGORIAS: ${categories.join(", ")}`);
      console.log(`DESCRIÇÃO: ${description}`);
      console.log("------------------------------------------");

      res.json({ success: true, message: "Orçamento recebido com sucesso!" });
    } catch (error) {
      console.error("Error saving quote:", error);
      res.status(500).json({ success: false, message: "Erro ao processar o pedido." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
