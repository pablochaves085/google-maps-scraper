const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

app.get("/", (req, res) => {
  res.send("API do Google Maps Scraper está rodando com todos os campos.");
});

app.get("/search", async (req, res) => {
  const searchTerm = req.query.term;

  if (!searchTerm) {
    return res.status(400).json({ error: "Parâmetro 'term' é obrigatório." });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: "/usr/bin/google-chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--lang=pt-BR"]
    });

    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      "Accept-Language": "pt-BR,pt;q=0.9"
    });

    const url = `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}`;
    await page.goto(url, { waitUntil: "networkidle2" });

    console.log(`🔍 Buscando: ${searchTerm}`);
    await new Promise(resolve => setTimeout(resolve, 5000));

    let prevHeight;
    while (true) {
      prevHeight = await page.evaluate("document.body.scrollHeight");
      await page.evaluate("window.scrollBy(0, window.innerHeight)");
      await new Promise(resolve => setTimeout(resolve, 3000));
      const newHeight = await page.evaluate("document.body.scrollHeight");
      if (newHeight === prevHeight) break;
    }

    await page.waitForSelector('.Nv2PK', { timeout: 60000 });

    const results = await page.$$eval('.Nv2PK', (cards) => {
      return cards.map((card) => {
        const name = card.querySelector('.qBF1Pd')?.textContent || '';

        const endereco = card.querySelector('.W4Efsd span:nth-child(2)')?.textContent || '';
        const especialidades = card.querySelector('.W4Efsd span:nth-child(1)')?.textContent || '';
        const rating = card.querySelector('.MW4etd span')?.textContent || '';
        const reviews = ''; // não aparece nos cards, só após clicar

        const telefoneEl = card.querySelector('[aria-label^="Ligar para"] span');
        const telefone = telefoneEl?.textContent?.trim() || '';

        const link = card.querySelector('a[aria-label^="Site"]');
        const website = link?.href || '';

        return {
          name,
          endereco,
          telefone,
          rating,
          reviews,
          website,
          especialidades
        };
      });
    });

    await browser.close();
    return res.json(results);
  } catch (error) {
    console.error("❌ Erro ao processar busca:");
    console.error(error.stack || error.message || error);
    return res.status(500).json({ error: "Erro ao processar busca." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
