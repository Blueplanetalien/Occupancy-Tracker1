import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Brand colours ────────────────────────────────────────────────────────────
const OLIVE      = [85, 107, 47];
const OLIVE_DARK = [60,  80, 28];
const OLIVE_MID  = [100, 125, 60];
const YELLOW     = [245, 197, 24];
const GREEN_TEXT = [30, 100, 30];
const AMBER_TEXT = [140, 90,  0];
const RED_TEXT   = [185,  30, 30];
const GREEN_CELL = [220, 240, 210];
const AMBER_CELL = [255, 248, 200];
const RED_CELL   = [255, 220, 220];
const GREY_CELL  = [245, 245, 243];
const PAGE_W     = 210; // A4 portrait mm
const PAGE_MARGIN = 14;

// ── Helpers ──────────────────────────────────────────────────────────────────

function occCellColors(pct) {
  if (isNaN(pct) || pct === 0) return { fill: GREY_CELL, text: [160,160,160] };
  if (pct >= 75) return { fill: GREEN_CELL, text: GREEN_TEXT };
  if (pct >= 50) return { fill: AMBER_CELL, text: AMBER_TEXT };
  return { fill: RED_CELL, text: RED_TEXT };
}

function addHeader(doc, title, dateLabel) {
  const w = doc.internal.pageSize.width;

  // Main olive band
  doc.setFillColor(...OLIVE);
  doc.rect(0, 0, w, 24, 'F');
  // Yellow accent line
  doc.setFillColor(...YELLOW);
  doc.rect(0, 24, w, 1.5, 'F');

  // Brand
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('YUBE1 STAYS', PAGE_MARGIN, 11);

  // Report title below brand
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 225, 175);
  doc.text(title, PAGE_MARGIN, 19);

  // Date on right
  if (dateLabel) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...YELLOW);
    doc.text(dateLabel, w - PAGE_MARGIN, 11, { align: 'right' });
  }
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 210, 155);
  const generated = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  doc.text(`Generated: ${generated}`, w - PAGE_MARGIN, 19, { align: 'right' });

  doc.setTextColor(30, 30, 30);
}

function addFooter(doc) {
  const pages = doc.internal.getNumberOfPages();
  const w = doc.internal.pageSize.width;
  const h = doc.internal.pageSize.height;
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...OLIVE);
    doc.setLineWidth(0.4);
    doc.line(PAGE_MARGIN, h - 11, w - PAGE_MARGIN, h - 11);
    doc.setFontSize(6.5);
    doc.setTextColor(160, 160, 160);
    doc.text('Yube1 Stays — Confidential & Proprietary', PAGE_MARGIN, h - 6);
    doc.text(`Page ${i} of ${pages}`, w - PAGE_MARGIN, h - 6, { align: 'right' });
  }
}

function drawKPIBoxes(doc, items, startY) {
  const usable = PAGE_W - PAGE_MARGIN * 2;
  const gap = 3;
  const boxW = (usable - gap * (items.length - 1)) / items.length;

  items.forEach((item, i) => {
    const x = PAGE_MARGIN + i * (boxW + gap);

    doc.setFillColor(...(item.bg || OLIVE));
    doc.roundedRect(x, startY, boxW, 17, 1.5, 1.5, 'F');

    doc.setTextColor(200, 230, 175);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label.toUpperCase(), x + 3, startY + 6);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, x + 3, startY + 14);
  });
  doc.setTextColor(30, 30, 30);
}

function drawDistBar(doc, high, mid, low, noData, startY) {
  const usable = PAGE_W - PAGE_MARGIN * 2;
  const total = (high + mid + low + noData) || 1;
  const barH = 5;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('OCCUPANCY DISTRIBUTION', PAGE_MARGIN, startY);

  const barY = startY + 2;
  let x = PAGE_MARGIN;

  const segs = [
    { n: high,   color: OLIVE,         label: `${high} High  ≥75%` },
    { n: mid,    color: [220, 175, 20], label: `${mid} Mid  50–74%` },
    { n: low,    color: [195, 55, 55],  label: `${low} Low  <50%` },
    { n: noData, color: [195, 195, 195],label: `${noData} No Data` },
  ];

  segs.forEach(s => {
    if (s.n <= 0) return;
    const segW = (s.n / total) * usable;
    doc.setFillColor(...s.color);
    doc.rect(x, barY, segW, barH, 'F');
    x += segW;
  });

  // Legend
  let lx = PAGE_MARGIN;
  segs.forEach(s => {
    if (s.n <= 0) return;
    doc.setFillColor(...s.color);
    doc.rect(lx, barY + barH + 2.5, 3, 3, 'F');
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(s.label, lx + 4.5, barY + barH + 5.5);
    lx += 42;
  });
  doc.setTextColor(30, 30, 30);
}

// ── Table cell colouring helper (used in didParseCell) ────────────────────────
function colourOccupancyCell(data, colIdx) {
  if (data.section !== 'body' || data.column.index !== colIdx) return;
  const raw = parseFloat(data.cell.raw);
  if (isNaN(raw) || raw === 0) return;
  const c = occCellColors(raw);
  data.cell.styles.fillColor   = c.fill;
  data.cell.styles.textColor   = c.text;
  data.cell.styles.fontStyle   = 'bold';
}

// ── CSV ───────────────────────────────────────────────────────────────────────
export function downloadCSV(rows, columns, filename, metadata = []) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [];
  if (metadata.length) {
    metadata.forEach(([k, v]) => lines.push(`${esc(k)},${esc(v)}`));
    lines.push(''); // blank separator
  }
  lines.push(columns.map(c => esc(c.label)).join(','));
  rows.forEach(row => {
    lines.push(columns.map(c => esc(row[c.key] ?? '')).join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Daily Report PDF ──────────────────────────────────────────────────────────
export function exportDailyReportPDF(report) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addHeader(doc, 'Daily Occupancy Report', report.date);

  const kpiY = 29;
  const high   = report.properties.filter(p => p.has_entry && p.occupancy_percentage >= 75).length;
  const mid    = report.properties.filter(p => p.has_entry && p.occupancy_percentage >= 50 && p.occupancy_percentage < 75).length;
  const low    = report.properties.filter(p => p.has_entry && p.occupancy_percentage < 50).length;
  const noData = report.total_properties - report.reporting_properties;

  drawKPIBoxes(doc, [
    { label: 'Overall Occupancy',  value: report.reporting_properties > 0 ? `${report.overall_occupancy_percentage}%` : '—', bg: OLIVE },
    { label: 'Occupied / Total',   value: `${report.total_occupied} / ${report.total_beds} beds`, bg: OLIVE_DARK },
    { label: 'Reporting Properties', value: `${report.reporting_properties} / ${report.total_properties}`, bg: OLIVE_MID },
    { label: 'Vacant Beds',        value: String(report.total_beds - report.total_occupied), bg: [140, 110, 20] },
  ], kpiY);

  drawDistBar(doc, high, mid, low, noData, kpiY + 21);

  const sorted = [...report.properties].sort((a, b) => {
    if (a.has_entry !== b.has_entry) return a.has_entry ? -1 : 1;
    return b.occupancy_percentage - a.occupancy_percentage;
  });

  autoTable(doc, {
    startY: kpiY + 40,
    head: [['#', 'Property', 'Cluster Manager', 'Property Manager', 'Beds', 'Occupied', 'Vacant', 'Occupancy %']],
    body: sorted.map((p, i) => [
      i + 1,
      p.property_name.replace('Yube1 ', ''),
      p.cluster_manager_name || '—',
      p.manager_name || '—',
      p.total_beds,
      p.has_entry ? p.occupied_beds : '—',
      p.has_entry ? (p.total_beds - p.occupied_beds) : '—',
      p.has_entry ? p.occupancy_percentage : 0,
    ]),
    headStyles: { fillColor: OLIVE, fontSize: 7.5, fontStyle: 'bold', textColor: [255,255,255] },
    bodyStyles: { fontSize: 7.5, cellPadding: 2 },
    alternateRowStyles: { fillColor: [250, 250, 248] },
    columnStyles: {
      0: { cellWidth: 7,  halign: 'center' },
      1: { cellWidth: 42 },
      2: { cellWidth: 28 },
      3: { cellWidth: 28 },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 20, halign: 'center' },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    didParseCell: (data) => {
      colourOccupancyCell(data, 7);
      // Style "No data" rows
      if (data.section === 'body' && data.column.index === 7 && data.cell.raw === 0) {
        data.cell.styles.textColor = [180, 180, 180];
        data.cell.styles.fontStyle = 'normal';
      }
    },
    didDrawCell: (data) => {
      // Write "No data" text when occupancy is 0/absent
      if (data.section === 'body' && data.column.index === 7) {
        const val = parseFloat(data.cell.raw);
        if (!val || val === 0) {
          doc.setFontSize(7);
          doc.setTextColor(180, 180, 180);
          doc.text('No data', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
        }
      }
    },
  });

  addFooter(doc);
  doc.save(`Yube1_Daily_Report_${report.date}.pdf`);
}

// ── Monthly Report PDF ────────────────────────────────────────────────────────
export function exportMonthlyReportPDF(report) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addHeader(doc, 'Monthly Occupancy Report', `${report.month_name} ${report.year}`);

  const kpiY = 29;
  drawKPIBoxes(doc, [
    { label: 'Avg Occupancy',    value: `${report.overall_avg_occupancy}%`,                bg: OLIVE },
    { label: 'Total Beds',       value: report.total_beds.toLocaleString(),                bg: OLIVE_DARK },
    { label: 'Days with Data',   value: `${report.days_with_data} / ${report.days_in_month}`, bg: OLIVE_MID },
    { label: 'Properties',       value: String(report.properties?.length || 0),            bg: [140, 110, 20] },
  ], kpiY);

  const sorted = [...(report.properties || [])].sort((a, b) => b.avg_occupancy_percentage - a.avg_occupancy_percentage);

  // Compute dense ranks
  const uniqueAvgs = [...new Set(sorted.map(p => p.avg_occupancy_percentage))].sort((a, b) => b - a);
  const ranks = sorted.map(p => uniqueAvgs.indexOf(p.avg_occupancy_percentage) + 1);

  autoTable(doc, {
    startY: kpiY + 22,
    head: [['Rank', 'Property', 'Cluster Manager', 'Property Manager', 'Total Beds', 'Avg Occupancy', 'Days']],
    body: sorted.map((p, i) => [
      ranks[i],
      p.property_name.replace('Yube1 ', ''),
      p.cluster_manager_name || '—',
      p.manager_name || '—',
      p.total_beds,
      p.days_with_data > 0 ? p.avg_occupancy_percentage : 0,
      p.days_with_data,
    ]),
    headStyles: { fillColor: OLIVE, fontSize: 7.5, fontStyle: 'bold', textColor: [255,255,255] },
    bodyStyles: { fontSize: 7.5, cellPadding: 2 },
    alternateRowStyles: { fillColor: [250, 250, 248] },
    columnStyles: {
      0: { cellWidth: 11,  halign: 'center' },
      1: { cellWidth: 42 },
      2: { cellWidth: 28 },
      3: { cellWidth: 28 },
      4: { cellWidth: 14,  halign: 'center' },
      5: { cellWidth: 22,  halign: 'center' },
      6: { cellWidth: 11,  halign: 'center' },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    didParseCell: (data) => {
      colourOccupancyCell(data, 5);
      if (data.section === 'body' && data.column.index === 5 && data.cell.raw === 0) {
        data.cell.styles.textColor = [180, 180, 180];
        data.cell.styles.fontStyle = 'normal';
      }
      // Gold/silver/bronze rank colouring
      if (data.section === 'body' && data.column.index === 0) {
        const rank = parseInt(data.cell.raw);
        if (rank === 1) { data.cell.styles.textColor = [180, 140, 0]; data.cell.styles.fontStyle = 'bold'; }
        else if (rank === 2) { data.cell.styles.textColor = [110, 110, 110]; data.cell.styles.fontStyle = 'bold'; }
        else if (rank === 3) { data.cell.styles.textColor = [160, 82, 32]; data.cell.styles.fontStyle = 'bold'; }
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const val = parseFloat(data.cell.raw);
        if (!val || val === 0) {
          doc.setFontSize(7);
          doc.setTextColor(180, 180, 180);
          doc.text('No data', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
        }
      }
    },
  });

  addFooter(doc);
  doc.save(`Yube1_Monthly_Report_${report.year}_${String(report.month).padStart(2, '0')}.pdf`);
}

// ── PM Performance PDF ────────────────────────────────────────────────────────
export function exportPMPerformancePDF(managers) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const dateLabel = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  addHeader(doc, 'Property Manager Performance Report', dateLabel);

  const uniqueAvgs = [...new Set(managers.map(m => m.lifetime_avg_occupancy))].sort((a, b) => b - a);
  const ranks = managers.map(m => uniqueAvgs.indexOf(m.lifetime_avg_occupancy) + 1);

  drawKPIBoxes(doc, [
    { label: 'Total Managers', value: String(managers.length), bg: OLIVE },
    { label: 'Avg Occupancy (All)',
      value: managers.length ? `${(managers.reduce((s, m) => s + m.lifetime_avg_occupancy, 0) / managers.length).toFixed(1)}%` : '—',
      bg: OLIVE_DARK },
    { label: 'Managers ≥75%', value: String(managers.filter(m => m.lifetime_avg_occupancy >= 75).length), bg: OLIVE_MID },
    { label: 'Managers <50%', value: String(managers.filter(m => m.lifetime_avg_occupancy < 50).length), bg: [170, 60, 40] },
  ], 29);

  autoTable(doc, {
    startY: 51,
    head: [['Rank', 'Property Manager', 'Phone', 'Current Properties', 'Lifetime Avg %', 'Days Tracked']],
    body: managers.map((m, i) => [
      ranks[i],
      m.manager_name,
      m.manager_phone,
      (m.current_properties || []).map(p => p.replace('Yube1 ', '')).join(', ') || '—',
      m.total_days_tracked > 0 ? m.lifetime_avg_occupancy : 0,
      m.total_days_tracked,
    ]),
    headStyles: { fillColor: OLIVE, fontSize: 8, fontStyle: 'bold', textColor: [255,255,255] },
    bodyStyles: { fontSize: 8, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [250, 250, 248] },
    columnStyles: {
      0: { cellWidth: 12,  halign: 'center' },
      1: { cellWidth: 40 },
      2: { cellWidth: 30 },
      3: { cellWidth: 95 },
      4: { cellWidth: 25,  halign: 'center' },
      5: { cellWidth: 22,  halign: 'center' },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    didParseCell: (data) => {
      colourOccupancyCell(data, 4);
      if (data.section === 'body' && data.column.index === 4 && data.cell.raw === 0) {
        data.cell.styles.textColor = [180, 180, 180];
        data.cell.styles.fontStyle = 'normal';
      }
      if (data.section === 'body' && data.column.index === 0) {
        const rank = parseInt(data.cell.raw);
        if (rank === 1) { data.cell.styles.textColor = [180, 140, 0]; data.cell.styles.fontStyle = 'bold'; }
        else if (rank === 2) { data.cell.styles.textColor = [110, 110, 110]; data.cell.styles.fontStyle = 'bold'; }
        else if (rank === 3) { data.cell.styles.textColor = [160, 82, 32]; data.cell.styles.fontStyle = 'bold'; }
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const val = parseFloat(data.cell.raw);
        if (!val || val === 0) {
          doc.setFontSize(7);
          doc.setTextColor(180, 180, 180);
          doc.text('No data', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
        }
      }
    },
  });

  addFooter(doc);
  doc.save(`Yube1_PM_Performance_${new Date().toISOString().split('T')[0]}.pdf`);
}
