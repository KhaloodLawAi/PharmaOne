(function () {
  const AppState = {
    recentActivity: JSON.parse(localStorage.getItem('pharmaone-activity') || '[]'),
    theme: localStorage.getItem('pharmaone-theme') || 'dark',
    role: localStorage.getItem('pharmaone-role') || 'owner',
  };

  function saveActivity() {
    localStorage.setItem('pharmaone-activity', JSON.stringify(AppState.recentActivity.slice(0, 50)));
  }
  function logActivity(message) {
    const entry = { message, time: new Date().toISOString() };
    AppState.recentActivity.unshift(entry);
    saveActivity();
  }

  function setTheme(theme) {
    AppState.theme = theme;
    localStorage.setItem('pharmaone-theme', theme);
    document.documentElement.classList.toggle('light', theme === 'light');
  }

  function setRole(role) {
    AppState.role = role;
    localStorage.setItem('pharmaone-role', role);
    const sel = document.getElementById('role-select');
    if (sel) sel.value = role;
    toast(`Role: ${role}`);
  }

  function fmt(num) {
    if (num == null || Number.isNaN(num)) return '-';
    return new Intl.NumberFormat(I18N.current === 'ar' ? 'ar-IQ' : 'en-US', { maximumFractionDigits: 2 }).format(num);
  }

  function parseCsv(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve(res.data),
        error: (err) => reject(err),
      });
    });
  }

  function downloadCsv(filename, rows) {
    const header = Object.keys(rows[0] || {});
    const csv = [header.join(',')].concat(rows.map(r => header.map(h => JSON.stringify(r[h] ?? '')).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf(filename, element) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const scale = 2;
    const canvas = await htmlToCanvas(element, scale);
    const imgData = canvas.toDataURL('image/png');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 80;
    const imgHeight = canvas.height * (imgWidth / canvas.width);
    doc.text('PharmaOne Export', 40, 40);
    doc.addImage(imgData, 'PNG', 40, 60, imgWidth, Math.min(imgHeight, pageHeight - 100));
    doc.save(filename);
    toast(`Exported ${filename}`);
  }

  async function htmlToCanvas(element, scale = 2) {
    // Lightweight renderer using SVG foreignObject
    const rect = element.getBoundingClientRect();
    const width = Math.ceil(rect.width);
    const height = Math.ceil(rect.height);
    const data = new XMLSerializer().serializeToString(element.cloneNode(true));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width*scale}" height="${height*scale}"><foreignObject x="0" y="0" width="100%" height="100%" transform="scale(${scale})">${data}</foreignObject></svg>`;
    const img = new Image();
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    await new Promise((res) => { img.onload = res; img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = width * scale; canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    return canvas;
  }

  function levenshtein(a, b){
    if (a === b) return 0; const an = a ? a.length : 0; const bn = b ? b.length : 0; if (an === 0) return bn; if (bn === 0) return an; const matrix = Array.from({length: an+1}, (_,i)=>[i].concat(Array(bn).fill(0))); for(let j=1;j<=bn;j++) matrix[0][j]=j; for(let i=1;i<=an;i++){ for(let j=1;j<=bn;j++){ const cost = a[i-1]===b[j-1]?0:1; matrix[i][j] = Math.min(matrix[i-1][j]+1, matrix[i][j-1]+1, matrix[i-1][j-1]+cost); } } return matrix[an][bn];
  }
  function similarity(a,b){ a=(a||'').toLowerCase(); b=(b||'').toLowerCase(); const dist = levenshtein(a,b); return 1 - dist / Math.max(a.length,b.length,1); }

  function renderDashboard() {
    window.currentPageTitle = I18N.t('dashboard.title');
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="grid cols-4">
        <div class="card kpi"><div class="label">${I18N.t('reporting.kpi.sales')}</div><div class="value" id="dash-sales">-</div></div>
        <div class="card kpi"><div class="label">${I18N.t('reporting.kpi.qty')}</div><div class="value" id="dash-qty">-</div></div>
        <div class="card kpi"><div class="label">${I18N.t('reporting.kpi.orders')}</div><div class="value" id="dash-orders">-</div></div>
        <div class="card kpi"><div class="label">${I18N.t('reporting.kpi.regions')}</div><div class="value" id="dash-regions">-</div></div>
      </div>

      <div class="grid cols-2">
        <div class="card">
          <div class="row" style="justify-content: space-between;">
            <h3 style="margin:0;">${I18N.t('dashboard.recent')}</h3>
            <button class="btn secondary" id="load-samples">${I18N.t('dashboard.loadSamples')}</button>
          </div>
          <div class="list" id="recent-list"></div>
        </div>
        <div class="card">
          <canvas id="dash-chart" height="140"></canvas>
        </div>
      </div>
    `;
    I18N.translatePage();
    document.getElementById('load-samples').addEventListener('click', async () => {
      const res = await fetch('./data/sales_sample.csv');
      const text = await res.text();
      const rows = Papa.parse(text, { header: true, skipEmptyLines: true }).data;
      const totals = calcSalesKpis(rows);
      updateDashboardTotals(totals);
      renderRecent();
      renderDashChart(rows);
      logActivity('Loaded sample sales.csv on Dashboard');
    });

    renderRecent();
  }

  function calcSalesKpis(rows) {
    const sales = rows.reduce((s,r)=> s + Number(r.net_sales || 0), 0);
    const qty = rows.reduce((s,r)=> s + Number(r.quantity || 0), 0);
    const orders = rows.length;
    const regions = new Set(rows.map(r=>r.region)).size;
    return { sales, qty, orders, regions };
  }
  function updateDashboardTotals({sales, qty, orders, regions}) {
    document.getElementById('dash-sales').textContent = fmt(sales);
    document.getElementById('dash-qty').textContent = fmt(qty);
    document.getElementById('dash-orders').textContent = fmt(orders);
    document.getElementById('dash-regions').textContent = fmt(regions);
  }
  function renderRecent() {
    const el = document.getElementById('recent-list');
    el.innerHTML = AppState.recentActivity.slice(0,8).map(a=>{
      const d = new Date(a.time);
      return `<div class="item"><div class="left"><div>${a.message}</div><div class="muted">${d.toLocaleString()}</div></div><div class="right">↗</div></div>`;
    }).join('');
  }
  function renderDashChart(rows){
    const ctx = document.getElementById('dash-chart');
    const byDate = {};
    rows.forEach(r=>{ const d = r.date; byDate[d] = (byDate[d]||0) + Number(r.net_sales||0); });
    const labels = Object.keys(byDate).sort();
    const data = labels.map(l=>byDate[l]);
    new Chart(ctx, { type: 'line', data: { labels, datasets: [{ label: 'Sales', data, borderColor: '#3b82f6' }] }, options: { plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#8ea0bf'}}, y:{ticks:{color:'#8ea0bf'}}} });
  }

  function renderReporting() {
    window.currentPageTitle = I18N.t('reporting.title');
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="card">
        <div class="row">
          <input type="file" id="sales-file" accept=".csv,.xlsx,.xls" class="input" />
          <button id="load-sample-sales" class="btn secondary">${I18N.t('reporting.sample')}</button>
          <span class="muted">${I18N.t('reporting.upload')}</span>
        </div>
      </div>
      <div class="grid cols-4" id="report-kpis">
        <div class="card kpi"><div class="label">${I18N.t('reporting.kpi.sales')}</div><div class="value" id="rep-sales">-</div></div>
        <div class="card kpi"><div class="label">${I18N.t('reporting.kpi.qty')}</div><div class="value" id="rep-qty">-</div></div>
        <div class="card kpi"><div class="label">${I18N.t('reporting.kpi.orders')}</div><div class="value" id="rep-orders">-</div></div>
        <div class="card kpi"><div class="label">${I18N.t('reporting.kpi.regions')}</div><div class="value" id="rep-regions">-</div></div>
      </div>
      <div class="grid cols-2">
        <div class="card"><canvas id="sales-chart" height="180"></canvas></div>
        <div class="card">
          <div class="row" style="justify-content: space-between; margin-bottom: 8px;">
            <strong>${I18N.t('reporting.export')}</strong>
            <div class="row">
              <button id="export-pdf" class="btn secondary">${I18N.t('reporting.exportPdf')}</button>
              <button id="export-csv" class="btn secondary">${I18N.t('reporting.exportCsv')}</button>
            </div>
          </div>
          <div id="sales-table-wrapper" style="max-height: 260px; overflow:auto;"></div>
          <div id="sales-empty" class="muted" style="text-align:center; padding:8px; display:none;">No data loaded.</div>
        </div>
      </div>
    `;
    I18N.translatePage();

    let rows = [];
    const fileInput = document.getElementById('sales-file');
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      rows = await parseCsv(file);
      afterLoad();
      logActivity(`Uploaded sales file: ${file.name}`);
    });
    document.getElementById('load-sample-sales').addEventListener('click', async () => {
      const res = await fetch('./data/sales_sample.csv'); const text = await res.text();
      rows = Papa.parse(text, { header: true, skipEmptyLines: true }).data;
      afterLoad();
      logActivity('Loaded sample sales.csv');
    });

    function afterLoad(){
      const k = calcSalesKpis(rows);
      document.getElementById('rep-sales').textContent = fmt(k.sales);
      document.getElementById('rep-qty').textContent = fmt(k.qty);
      document.getElementById('rep-orders').textContent = fmt(k.orders);
      document.getElementById('rep-regions').textContent = fmt(k.regions);
      renderSalesChart(rows);
      renderSalesTable(rows);
      document.getElementById('export-pdf').onclick = () => exportPdf('reporting.pdf', document.getElementById('content'));
      document.getElementById('export-csv').onclick = () => downloadCsv('reporting.csv', rows);
      const isStaff = AppState.role === 'staff';
      document.getElementById('export-pdf').disabled = isStaff;
      document.getElementById('export-csv').disabled = isStaff;
      if (isStaff) toast('Staff role: exports disabled', 'error');
    }

    function renderSalesChart(rows){
      const ctx = document.getElementById('sales-chart');
      const byRegion = {};
      rows.forEach(r=>{ const region = r.region || 'N/A'; byRegion[region] = (byRegion[region]||0) + Number(r.net_sales||0); });
      const labels = Object.keys(byRegion);
      const data = labels.map(l=>byRegion[l]);
      new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Sales by region', data, backgroundColor: '#3b82f6' }] }, options: { plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#8ea0bf'}}, y:{ticks:{color:'#8ea0bf'}}} });
    }
    function renderSalesTable(rows){
      const wrapper = document.getElementById('sales-table-wrapper');
      const header = Object.keys(rows[0] || {});
      if (!rows.length) {
        wrapper.innerHTML = '';
        const empty = document.getElementById('sales-empty'); if (empty) empty.style.display = 'block';
        return;
      }
      const empty = document.getElementById('sales-empty'); if (empty) empty.style.display = 'none';
      const head = `<thead><tr>${header.map(h=>`<th>${h}</th>`).join('')}</tr></thead>`;
      const body = `<tbody>${rows.map(r=>`<tr>${header.map(h=>`<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>`;
      wrapper.innerHTML = `<table>${head}${body}</table>`;
    }
  }

  function renderAccounting() {
    window.currentPageTitle = I18N.t('accounting.title');
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="card">
        <div class="row">
          <input type="file" id="inv-file" accept=".csv" class="input" />
          <input type="file" id="camp-file" accept=".csv" class="input" />
          <button id="load-sample-acct" class="btn secondary">${I18N.t('accounting.sample')}</button>
        </div>
      </div>
      <div class="card">
        <div class="row" style="justify-content: space-between; align-items:center;">
          <h3 style="margin-top:0;">${I18N.t('accounting.matches')}</h3>
          <div class="row">
            <button id="acct-export" class="btn secondary">Export CSV</button>
          </div>
        </div>
        <div id="acct-table" style="max-height: 420px; overflow:auto;"></div>
        <div id="acct-empty" class="muted" style="text-align:center; padding:8px; display:none;">No matches yet.</div>
      </div>
    `;
    I18N.translatePage();

    let invoices = [], campaigns = [];
    document.getElementById('inv-file').addEventListener('change', async (e)=>{ const f=e.target.files[0]; if(!f) return; invoices = await parseCsv(f); tryMatch(); logActivity(`Uploaded invoices: ${f.name}`); });
    document.getElementById('camp-file').addEventListener('change', async (e)=>{ const f=e.target.files[0]; if(!f) return; campaigns = await parseCsv(f); tryMatch(); logActivity(`Uploaded campaigns: ${f.name}`); });
    document.getElementById('load-sample-acct').addEventListener('click', async ()=>{
      const inv = await (await fetch('./data/invoices_sample.csv')).text();
      const camp = await (await fetch('./data/campaigns_sample.csv')).text();
      invoices = Papa.parse(inv, { header: true, skipEmptyLines: true }).data;
      campaigns = Papa.parse(camp, { header: true, skipEmptyLines: true }).data;
      tryMatch();
      logActivity('Loaded sample invoices + campaigns');
    });

    let lastMatches = [];
    function tryMatch(){ if(invoices.length && campaigns.length){ lastMatches = matchInvoicesToCampaigns(invoices, campaigns); renderMatches(lastMatches); toast('Matched invoices to campaigns'); } }

    function matchInvoicesToCampaigns(invs, camps){
      const results = [];
      invs.forEach(inv => {
        const invVendor = (inv.vendor||'').trim();
        const invDate = new Date(inv.date);
        const invAmt = Number(inv.amount || 0);
        let best = null; let bestScore = -Infinity;
        camps.forEach(c => {
          const vendorSim = similarity(invVendor, (c.vendor||'').trim());
          const start = new Date(c.start_date); const end = new Date(c.end_date);
          const daysToStart = Math.abs((invDate - start) / (1000*3600*24));
          const inWindow = invDate >= start && invDate <= end;
          const amt = Number(c.spend_amount || 0);
          const amtDiffPct = Math.abs(invAmt - amt) / Math.max(amt, invAmt, 1);
          let score = vendorSim * 0.6 + (inWindow ? 0.3 : Math.max(0, 0.3 - daysToStart/30)) + (1 - Math.min(amtDiffPct, 1))*0.3;
          if (score > bestScore){ bestScore = score; best = c; }
        });
        let confidence = 'low';
        if (best) {
          const vendorSim = similarity(invVendor, (best.vendor||'').trim());
          const invDateNum = +invDate;
          const inWindow = invDateNum >= +new Date(best.start_date) && invDateNum <= +new Date(best.end_date);
          const amt = Number(best.spend_amount || 0);
          const amtDiffPct = Math.abs(invAmt - amt) / Math.max(amt, invAmt, 1);
          if (vendorSim > 0.9 && inWindow && amtDiffPct < 0.02) confidence = 'high';
          else if (vendorSim > 0.8 && (inWindow || amtDiffPct < 0.1)) confidence = 'med';
          else confidence = 'low';
        }
        results.push({
          invoice_id: inv.invoice_id || '',
          invoice_vendor: inv.vendor,
          invoice_date: inv.date,
          invoice_amount: inv.amount,
          campaign_id: best?.campaign_id || '',
          campaign_name: best?.campaign_name || '',
          match_vendor: best?.vendor || '',
          match_window: best ? `${best.start_date} → ${best.end_date}` : '',
          match_amount: best?.spend_amount || '',
          confidence,
          why: best ? `vendor=${similarity((inv.vendor||''),(best.vendor||'')).toFixed(2)}, window=${best ? (new Date(inv.date)>=new Date(best.start_date) && new Date(inv.date)<=new Date(best.end_date)) : false}, amountΔ=${Math.abs(Number(inv.amount||0)-Number(best?.spend_amount||0)).toFixed(2)}` : 'no candidate'
        });
      });
      return results;
    }

    function renderMatches(rows){
      const el = document.getElementById('acct-table');
      const header = ['invoice_id','invoice_vendor','invoice_date','invoice_amount','campaign_id','campaign_name','match_vendor','match_window','match_amount','confidence','why'];
      if (!rows.length) {
        el.innerHTML = '';
        document.getElementById('acct-empty').style.display = 'block';
      } else {
        document.getElementById('acct-empty').style.display = 'none';
        const head = `<thead><tr>${header.map(h=>`<th>${h}</th>`).join('')}</tr></thead>`;
        const body = `<tbody>${rows.map(r=>`<tr>${header.map(h=>`<td>${r[h] ?? ''}${h==='confidence' ? ` <span class=\"badge ${r[h]}\">${r[h]}</span>`:''}</td>`).join('')}</tr>`).join('')}</tbody>`;
        el.innerHTML = `<table>${head}${body}</table>`;
      }
      const btn = document.getElementById('acct-export');
      btn.onclick = () => {
        if (AppState.role === 'staff') { toast('Staff role: exports disabled', 'error'); return; }
        if (!lastMatches.length) { toast('Nothing to export', 'error'); return; }
        downloadCsv('accounting_matches.csv', lastMatches);
        toast('Exported accounting_matches.csv');
      };
    }
  }

  function renderTenders() {
    window.currentPageTitle = I18N.t('tenders.title');
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="card">
        <div class="row">
          <input type="file" id="tender-file" accept=".pdf,.txt" class="input" />
          <button id="tender-sample" class="btn secondary">${I18N.t('tenders.sample')}</button>
        </div>
        <textarea id="tender-text" class="input textarea" placeholder="${I18N.t('tenders.upload')}"></textarea>
        <div class="row" style="justify-content:flex-end"><button id="analyze-tender" class="btn">Analyze</button></div>
      </div>
      <div class="grid cols-2">
        <div class="card"><h3 style="margin-top:0;">Extracted</h3><div id="tender-fields"></div></div>
        <div class="card">
          <div class="row" style="justify-content: space-between; align-items:center;">
            <h3 style="margin-top:0;">${I18N.t('tenders.summary')}</h3>
            <button id="tender-export" class="btn secondary">Download JSON</button>
          </div>
          <div id="tender-summary"></div>
        </div>
      </div>
    `;
    I18N.translatePage();

    document.getElementById('tender-sample').addEventListener('click', async ()=>{
      const text = await (await fetch('./data/tender_sample.txt')).text();
      document.getElementById('tender-text').value = text;
      logActivity('Loaded sample tender text');
    });
    document.getElementById('tender-file').addEventListener('change', async (e)=>{
      const f = e.target.files[0]; if(!f) return;
      try {
        if (f.type === 'application/pdf' || f.name.endsWith('.pdf')){
          const buf = await f.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
          let all = '';
          for (let i=1; i<=pdf.numPages; i++){
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            all += content.items.map(it=>it.str).join(' ') + '\n';
          }
          document.getElementById('tender-text').value = all;
        } else {
          document.getElementById('tender-text').value = await f.text();
        }
        toast(`Loaded ${f.name}`);
      } catch(err) {
        toast('Failed to read file', 'error');
      }
      logActivity(`Uploaded tender: ${f.name}`);
    });
    let lastTender = null;
    document.getElementById('analyze-tender').addEventListener('click', ()=>{
      const text = document.getElementById('tender-text').value || '';
      if (!text.trim()) { toast('No text to analyze', 'error'); return; }
      const res = analyzeTenderText(text);
      lastTender = res;
      renderTenderResult(res);
      toast('Tender analyzed');
      logActivity('Analyzed tender text');
    });

    function analyzeTenderText(text){
      const numMatch = text.match(/(KM|Kimadia)[-\s]?(\d{4})[-\s]?(\d{3,5})/i);
      const deadlineMatch = text.match(/(deadline|closing date|آخر موعد|الإغلاق)[:\s]*([0-9]{4}[-\/.][0-9]{2}[-\/.][0-9]{2}|[0-9]{1,2}\s+\w+\s+[0-9]{4})/i);
      const reqs = Array.from(text.matchAll(/-\s*(.+)/g)).map(m=>m[1]).slice(0,8);
      const fields = {
        tender_number: numMatch ? `${numMatch[1].toUpperCase()}-${numMatch[2]}-${numMatch[3]}` : '',
        deadline: deadlineMatch ? deadlineMatch[2] : '',
        requirements: reqs,
      };
      const summary = `Tender ${fields.tender_number || ''} with deadline ${fields.deadline || 'N/A'}. Requirements include: ${fields.requirements.slice(0,3).join('; ')}${fields.requirements.length>3?'...':''}`;
      return { fields, summary };
    }
    function renderTenderResult({fields, summary}){
      const f = document.getElementById('tender-fields');
      f.innerHTML = `<table><tbody>
        <tr><th>Tender #</th><td>${fields.tender_number || '-'}</td></tr>
        <tr><th>Deadline</th><td>${fields.deadline || '-'}</td></tr>
        <tr><th>Requirements</th><td><ul>${fields.requirements.map(r=>`<li>${r}</li>`).join('')}</ul></td></tr>
      </tbody></table>`;
      document.getElementById('tender-summary').textContent = summary;
      const btn = document.getElementById('tender-export');
      btn.onclick = () => {
        if (!lastTender) { toast('Nothing to download', 'error'); return; }
        const blob = new Blob([JSON.stringify(lastTender, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'tender_analysis.json'; a.click();
        URL.revokeObjectURL(url);
        toast('Downloaded tender_analysis.json');
      };
    }
  }

  function renderRegulation() {
    window.currentPageTitle = I18N.t('reg.title');
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="grid cols-2">
        <div class="card">
          <h3 style="margin-top:0;">${I18N.t('reg.ask')}</h3>
          <div class="row"><input id="reg-q" class="input" style="flex:1" placeholder="e.g., biosimilars import?"/><button id="reg-search" class="btn">${I18N.t('reg.search')}</button></div>
          <div id="reg-ans" style="margin-top:8px;"></div>
        </div>
        <div class="card">
          <h3 style="margin-top:0;">${I18N.t('reg.checkPromo')}</h3>
          <textarea id="promo-text" class="input textarea" placeholder="e.g., Reduces mortality by 50%"></textarea>
          <div class="row" style="justify-content:flex-end"><button id="promo-check" class="btn">${I18N.t('reg.search')}</button></div>
          <div id="promo-res"></div>
        </div>
      </div>
    `;
    I18N.translatePage();

    document.getElementById('reg-search').addEventListener('click', async ()=>{
      const q = (document.getElementById('reg-q').value||'').trim();
      const kb = await (await fetch('./data/regulation_sources.json')).json();
      const res = kbSearch(q, kb.sources);
      renderKbAnswer(res, 'reg-ans');
      logActivity('Ran regulation search');
    });
    document.getElementById('promo-check').addEventListener('click', async ()=>{
      const text = (document.getElementById('promo-text').value||'').trim();
      const kb = await (await fetch('./data/spc_sources.json')).json();
      const res = kbSearch(text, kb.sources);
      renderKbAnswer(res, 'promo-res');
      logActivity('Checked promo claim');
    });

    function kbSearch(query, sources){
      if (!query) return { answer: I18N.t('common.unknown'), citations: sources.slice(0,3) };
      const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
      const scored = sources.map(s=>{
        const text = `${s.title} ${s.text}`.toLowerCase();
        const score = terms.reduce((acc,t)=> acc + (text.includes(t)?1:0), 0);
        const snippets = terms.filter(t=> text.includes(t)).slice(0,3).map(t=>{
          const idx = text.indexOf(t); return s.text.substring(Math.max(0, idx-40), Math.min(s.text.length, idx+80));
        });
        return { ...s, score, snippets };
      }).filter(s=>s.score>0).sort((a,b)=>b.score-a.score);
      if (scored.length===0) return { answer: I18N.t('common.unknown'), citations: sources.slice(0,3) };
      const top = scored.slice(0,3);
      const answer = top.map(s=>`• ${s.title}`).join('\n');
      return { answer, citations: top };
    }
    function renderKbAnswer(res, targetId){
      const el = document.getElementById(targetId);
      el.innerHTML = '';
      const p = document.createElement('pre'); p.textContent = res.answer; el.appendChild(p);
      const c = document.createElement('div'); c.innerHTML = `<strong>${I18N.t('reg.citations')}</strong>`; el.appendChild(c);
      const ul = document.createElement('ul');
      res.citations.forEach(s=>{
        const li = document.createElement('li');
        const a = document.createElement('a'); a.href = s.url; a.target = '_blank'; a.rel = 'noreferrer noopener'; a.textContent = s.title;
        li.appendChild(a);
        if (s.snippets && s.snippets.length){ const sn = document.createElement('div'); sn.className='muted'; sn.textContent = '…' + s.snippets[0] + '…'; li.appendChild(sn); }
        ul.appendChild(li);
      });
      el.appendChild(ul);
    }
  }

  function renderInsights(){
    window.currentPageTitle = I18N.t('insights.title');
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="grid cols-3" id="insight-cards"></div>
      <div class="card"><canvas id="insight-chart" height="200"></canvas></div>
    `;
    I18N.translatePage();

    fetch('./data/insights_public.json').then(r=>r.json()).then(data=>{
      const cards = document.getElementById('insight-cards');
      cards.innerHTML = data.kpis.map(k=>`<div class="card kpi"><div class="label">${k.label}</div><div class="value">${k.value}</div></div>`).join('');
      const ctx = document.getElementById('insight-chart');
      new Chart(ctx, { type: 'line', data: { labels: data.trend.labels, datasets: [{ data: data.trend.values, borderColor: '#f5deb3' }] }, options: { plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#8ea0bf'}}, y:{ticks:{color:'#8ea0bf'}}} });
    });
  }

  function renderRoadmap(){
    window.currentPageTitle = I18N.t('roadmap.title');
    const content = document.getElementById('content');
    const items = [
      { title: 'Market Share dashboards', desc: 'Requires partner sell-out by SKU/region' },
      { title: 'KOL influence maps', desc: 'Requires HCP affiliations and event interactions' },
      { title: 'Pricing intelligence', desc: 'Requires distributor price lists and tender outcomes' },
      { title: 'Next-Best-Action for reps', desc: 'Requires CRM visits, Rx uplift, activity logs' },
      { title: 'Predictive demand (Kimadia cycles)', desc: 'Requires historical award/fulfillment timelines' },
    ];
    content.innerHTML = `
      <div class="grid cols-2">
        ${items.map(it=>`<div class="card"><div class="badge">${I18N.t('roadmap.coming')}</div><h3>${it.title}</h3><div class="muted">${it.desc}</div></div>`).join('')}
      </div>
    `;
    I18N.translatePage();
  }

  const routes = {
    '#/': renderDashboard,
    '#/reporting': renderReporting,
    '#/accounting': renderAccounting,
    '#/tenders': renderTenders,
    '#/insights': renderInsights,
    '#/regulation': renderRegulation,
    '#/roadmap': renderRoadmap,
  };

  function router(){
    document.querySelectorAll('.nav-link').forEach(a=> a.classList.toggle('active', a.getAttribute('href')===location.hash || (location.hash==='' && a.getAttribute('href')==="#/")) );
    const fn = routes[location.hash || '#/'] || renderDashboard; fn();
    I18N.translatePage();
    document.getElementById('page-title').textContent = window.currentPageTitle || 'PharmaOne';
  }

  window.addEventListener('DOMContentLoaded', () => {
    // Init theme and lang
    setTheme(AppState.theme);
    I18N.setLang(I18N.current);

    document.getElementById('theme-toggle').addEventListener('click', ()=> setTheme(AppState.theme === 'light' ? 'dark' : 'light'));
    document.getElementById('lang-toggle').addEventListener('click', ()=> I18N.setLang(I18N.current === 'en' ? 'ar' : 'en'));
    const roleSel = document.getElementById('role-select');
    if (roleSel) {
      roleSel.value = AppState.role;
      roleSel.addEventListener('change', ()=> setRole(roleSel.value));
    }

    window.addEventListener('hashchange', router);
    router();
  });

  function toast(message, type = 'success'){
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(()=>{
      el.style.transition = 'opacity 400ms ease';
      el.style.opacity = '0';
      setTimeout(()=> el.remove(), 450);
    }, 2200);
  }
})();

