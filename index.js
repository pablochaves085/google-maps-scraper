const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

// Rota raiz
app.get("/", (req, res) => {
  res.send("API do Google Maps Scraper em funcionamento.");
});

// Rota de busca
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

    await page.waitForTimeout(5000); // Espera inicial

    // Desce a página pra carregar resultados
    let prevHeight;
    while (true) {
      prevHeight = await page.evaluate("document.body.scrollHeight");
      await page.evaluate("window.scrollBy(0, window.innerHeight)");
      await page.waitForTimeout(3000);
      const newHeight = await page.evaluate("document.body.scrollHeight");
      if (newHeight === prevHeight) break;
    }

    // Espera blocos de resultado aparecerem
    await page.waitForSelector('.Nv2PK', { timeout: 60000 });

    const results = await page.$$eval('.Nv2PK', cards => {
      return cards.map(card => {
        const nome_empresa = card.querySelector('.qBF1Pd')?.textContent || '';
        const telefone = card.querySelector("[data-tooltip='Copiar número de telefone']")?.textContent || '';
        const websiteBtn = Array.from(card.querySelectorAll('[role="button"]')).find(el => el.textContent.includes("Site"));
        const website = websiteBtn?.getAttribute('aria-label')?.includes('site') ? websiteBtn?.dataset?.url || '' : '';
        const nota = card.querySelector('.MW4etd span')?.textContent || '';
        const endereco = card.querySelector('.rllt__details div:nth-child(2)')?.textContent || '';

        return {
          nome_empresa,
          telefone,
          website,
          nota,
          endereco
        };
      });
    });

    await browser.close();

    res.json(results);
  } catch (error) {
    console.error("Erro:", error);
    res.status(500).json({ error: "Erro ao processar busca." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
