import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const OLIVE = [85, 107, 47];
const YELLOW = [245, 197, 24];

function addHeader(doc, title, subtitle) {
  doc.setFillColor(...OLIVE);
  doc.rect(0, 0, doc.internal.pageSize.width, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Yube1 Stays', 14, 9);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 15);
  if (subtitle) {
    doc.setFontSize(8);
    doc.setTextColor(200, 220, 180);
    doc.text(subtitle, doc.internal.pageSize.width - 14, 14, { align: 'right' });
  }
  doc.setTextColor(30, 30, 30);
}

function addFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Yube1 Stays — Confidential · Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 6, { align: 'center' }
    );
  }
}

// ---- CSV ----
export function downloadCSV(rows, columns, filename) {
  const header = columns.map(c => `"${c.label}"`).join(',');
  const body = rows.map(row =>
    columns.map(c => {
      const val = row[c.key] ?? '';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv = [header, ...body].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- Daily Report PDF ----
export function exportDailyReportPDF(report) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addHeader(doc, 'Daily Occupancy Report', report.date);

  // Summary box
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const summaryY = 24;
  const summaryItems = [
    ['Date', report.date],
    ['Overall Occupancy', `${report.overall_occupancy_percentage}%`],
    ['Occupied Beds', `${report.total_occupied} / ${report.total_beds}`],
    ['Reporting', `${report.reporting_properties} / ${report.total_properties} properties`],
  ];
  summaryItems.forEach(([label, value], i) => {
    const x = 14 + (i % 2) * 90;
    const y = summaryY + Math.floor(i / 2) * 8;
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', x, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, x + 35, y);
  });

  autoTable(doc, {
    startY: summaryY + 20,
    head: [['#', 'Property', 'Manager', 'Total Beds', 'Occupied Beds', 'Occupancy %']],
    body: report.properties.map((p, i) => [
      i + 1,
      p.property_name,
      p.manager_name || '—',
      p.total_beds,
      p.has_entry ? p.occupied_beds : '—',
      p.has_entry ? `${p.occupancy_percentage}%` : 'No data',
    ]),
    headStyles: { fillColor: OLIVE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 248, 246] },
    columnStyles: { 0: { cellWidth: 10 }, 4: { halign: 'center' }, 5: { halign: 'center' } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const val = parseFloat(data.cell.raw);
        if (!isNaN(val)) {
          data.cell.styles.textColor = val >= 75 ? [34, 100, 34] : val >= 50 ? [150, 100, 0] : [200, 30, 30];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  addFooter(doc);
  doc.save(`Yube1_Daily_Report_${report.date}.pdf`);
}

// ---- Monthly Report PDF ----
export function exportMonthlyReportPDF(report) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addHeader(doc, 'Monthly Occupancy Report', `${report.month_name} ${report.year}`);

  const summaryY = 24;
  const items = [
    ['Month', `${report.month_name} ${report.year}`],
    ['Avg Occupancy', `${report.overall_avg_occupancy}%`],
    ['Total Beds', report.total_beds.toLocaleString()],
    ['Days with Data', `${report.days_with_data} / ${report.days_in_month}`],
  ];
  items.forEach(([label, value], i) => {
    const x = 14 + (i % 2) * 90;
    const y = summaryY + Math.floor(i / 2) * 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(label + ':', x, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), x + 35, y);
  });

  const sorted = [...(report.properties || [])].sort((a, b) => b.avg_occupancy_percentage - a.avg_occupancy_percentage);
  autoTable(doc, {
    startY: summaryY + 20,
    head: [['Rank', 'Property', 'Manager', 'Total Beds', 'Avg Occupancy %', 'Days with Data']],
    body: sorted.map((p, i) => [
      i + 1, p.property_name, p.manager_name || '—', p.total_beds,
      p.days_with_data > 0 ? `${p.avg_occupancy_percentage}%` : '—',
      p.days_with_data,
    ]),
    headStyles: { fillColor: OLIVE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 248, 246] },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const val = parseFloat(data.cell.raw);
        if (!isNaN(val)) {
          data.cell.styles.textColor = val >= 75 ? [34, 100, 34] : val >= 50 ? [150, 100, 0] : [200, 30, 30];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  addFooter(doc);
  doc.save(`Yube1_Monthly_Report_${report.year}_${String(report.month).padStart(2, '0')}.pdf`);
}

// ---- PM Performance PDF ----
export function exportPMPerformancePDF(managers) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addHeader(doc, 'Property Manager Performance Report', `Generated: ${new Date().toLocaleDateString()}`);

  autoTable(doc, {
    startY: 24,
    head: [['Rank', 'Manager', 'Phone', 'Current Properties', 'Lifetime Avg %', 'Days Tracked']],
    body: managers.map((m, i) => [
      i + 1,
      m.manager_name,
      m.manager_phone,
      m.current_properties.join(', ').replace(/Yube1 /g, '') || '—',
      m.total_days_tracked > 0 ? `${m.lifetime_avg_occupancy}%` : '—',
      m.total_days_tracked,
    ]),
    headStyles: { fillColor: OLIVE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 248, 246] },
    columnStyles: { 3: { cellWidth: 50 } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const val = parseFloat(data.cell.raw);
        if (!isNaN(val)) {
          data.cell.styles.textColor = val >= 75 ? [34, 100, 34] : val >= 50 ? [150, 100, 0] : [200, 30, 30];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  addFooter(doc);
  doc.save(`Yube1_PM_Performance_${new Date().toISOString().split('T')[0]}.pdf`);
}
