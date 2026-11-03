/**
 * Revisa o conjunto de ícones no navegador.
 *
 * Desenha os 21 lado a lado e mede a caixa real de cada traço. Reprova
 * quem sai da grade de 24, quem fica menor que metade dela (ícone tímido
 * ao lado dos outros) e quem encosta na borda sem margem óptica.
 *
 * Uso: python3 tools/icones.py --html > /tmp/ico.html && node tools/revisa-icones.js /tmp/ico.html
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

(async () => {
  const arq = process.argv[2];
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
  await p.goto('file://' + path.resolve(arq), { waitUntil: 'load' });
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('figure').forEach(f => {
      const svg = f.querySelector('svg');
      const bb = svg.getBBox();
      out.push({
        nome: f.dataset.nome,
        x: +bb.x.toFixed(1), y: +bb.y.toFixed(1),
        w: +bb.width.toFixed(1), h: +bb.height.toFixed(1),
      });
    });
    return out;
  });
  let ruins = 0;
  r.forEach(i => {
    const probs = [];
    // a caixa inclui metade do traço de cada lado
    if (i.x < 0.4 || i.y < 0.4) probs.push('encosta na borda');
    if (i.x + i.w > 23.6 || i.y + i.h > 23.6) probs.push('estoura a grade');
    if (Math.max(i.w, i.h) < 12) probs.push('pequeno demais (' + Math.max(i.w, i.h) + ')');
    if (probs.length) { ruins++; console.log('REPROVA ' + i.nome.padEnd(13) + probs.join(', ') + '  ' + JSON.stringify(i)); }
  });
  console.log(ruins ? `\n${ruins} de ${r.length} reprovados` : `\n${r.length} ícones: enquadramento ok`);
  await b.close();
  process.exit(ruins ? 1 : 0);
})();
