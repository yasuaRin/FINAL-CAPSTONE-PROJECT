import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { triggerExportRender, dismissExportRender } from './exportState';

// Wait until element exists and has real content height
const waitForElement = (id, minHeight = 200, timeoutMs = 20000) => {
  return new Promise((resolve) => {
    const start = Date.now();
    let lastHeight = 0;
    let stableCount = 0;

    const check = () => {
      const el = document.getElementById(id);
      if (el) {
        const currentHeight = el.scrollHeight;
        if (currentHeight === lastHeight && currentHeight >= minHeight) {
          stableCount++;
        } else {
          stableCount = 0;
          lastHeight = currentHeight;
        }
        // Resolve if height is stable for 3 checks OR we hit minHeight
        if (stableCount >= 3 || currentHeight >= minHeight) {
          return resolve(el);
        }
      }
      if (Date.now() - start > timeoutMs) {
        const fallback = document.getElementById(id);
        console.warn(`#${id} timed out — capturing whatever is there`);
        return resolve(fallback || null);
      }
      setTimeout(check, 400);
    };
    check();
  });
};

// Toast helper
const createToast = (message) => {
  const existing = document.getElementById('pdf-export-toast');
  if (existing) existing.remove();

  if (!document.getElementById('toast-spin-style')) {
    const style = document.createElement('style');
    style.id = 'toast-spin-style';
    style.textContent = `@keyframes _toast_spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }

  const toast = document.createElement('div');
  toast.id = 'pdf-export-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 1.25rem;
    right: 1.25rem;
    background-color: #111827;
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 700;
    padding: 0.75rem 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    transition: all 0.2s ease;
  `;

  const spinner = document.createElement('span');
  spinner.id = 'pdf-toast-spinner';
  spinner.style.cssText = `
    display: inline-block;
    width: 0.875rem;
    height: 0.875rem;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #ffffff;
    border-radius: 9999px;
    animation: _toast_spin 0.7s linear infinite;
    flex-shrink: 0;
  `;

  const text = document.createElement('span');
  text.id = 'pdf-toast-text';
  text.innerText = message;

  toast.appendChild(spinner);
  toast.appendChild(text);
  document.body.appendChild(toast);
  return toast;
};

const updateToast = (message) => {
  const text = document.getElementById('pdf-toast-text');
  if (text) text.innerText = message;
};

const removeToast = () => {
  const toast = document.getElementById('pdf-export-toast');
  if (toast) toast.remove();
};

// ── Complete multi-page export ──────────────────────────────────────────────
export const exportCompleteReport = async () => {
  // These IDs must match the wrapper divs in App.jsx isExporting block
  const pages = [
    { id: 'dashboard-export-container', name: 'Dashboard' },
    { id: 'revenue-export-container',   name: 'Revenue'   },
    { id: 'brands-export-container',    name: 'Brands'    },
    { id: 'team-export-container',      name: 'Team'      },
    { id: 'leads-export-container',     name: 'Leads'     },
  ];

  createToast('Mounting all pages...');

  try {
    // 1. Mount hidden pages
    triggerExportRender();

    // 2. Give React time to mount the components
    updateToast('Waiting for pages to mount...');
    await new Promise((r) => setTimeout(r, 1500));

    // 3. Wait for each page to have real content
    updateToast('Waiting for data to load...');
    await Promise.all(pages.map((p) => waitForElement(p.id, 400, 20000)));

    // 4. Extra buffer for charts, images, animations
    updateToast('Rendering charts...');
    await new Promise((r) => setTimeout(r, 3000));

    // 5. Capture each page
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = 210;
    let isFirstSection = true;
    let capturedCount = 0;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const element = document.getElementById(page.id);

      if (!element) {
        console.warn(`Skipping ${page.name} — element not found`);
        continue;
      }

      if (element.scrollHeight < 50) {
        console.warn(`Skipping ${page.name} — no content (height: ${element.scrollHeight}px)`);
        continue;
      }

      updateToast(`Capturing ${page.name} (${i + 1}/${pages.length})...`);
      await new Promise((r) => setTimeout(r, 300));

      try {
        const dataUrl = await toPng(element, {
          quality: 1,
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: '#ffffff',
          skipAutoScale: false,
        });

        const imgHeight = (element.scrollHeight * pdfWidth) / element.scrollWidth;

        if (!isFirstSection) pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, imgHeight);
        isFirstSection = false;
        capturedCount++;
        console.log(`✅ Captured ${page.name} (${element.scrollHeight}px)`);
      } catch (err) {
        console.error(`Failed to capture ${page.name}:`, err);
      }
    }

    if (capturedCount === 0) {
      throw new Error('No pages were captured — check console for details');
    }

    updateToast(`Saving PDF (${capturedCount} pages)...`);
    pdf.save(`complete_report_${new Date().toISOString().split('T')[0]}.pdf`);

    updateToast(`✅ Done! ${capturedCount} pages saved.`);
    setTimeout(removeToast, 3000);
    return true;

  } catch (error) {
    console.error('Export failed:', error);
    updateToast(`❌ Export failed: ${error.message}`);
    setTimeout(removeToast, 4000);
    return false;
  } finally {
    // Always unmount hidden pages
    dismissExportRender();
  }
};

// ── Single page export ──────────────────────────────────────────────────────
export const exportToPDF = async (elementId, filename, pageTitle = '') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found`);
    return false;
  }

  createToast(`Generating ${pageTitle || filename} PDF...`);

  try {
    await new Promise((r) => setTimeout(r, 300));

    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff',
      skipAutoScale: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgHeight = (element.scrollHeight * pdfWidth) / element.scrollWidth;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
    updateToast(`✅ ${pageTitle} saved!`);
    setTimeout(removeToast, 2000);
    return true;
  } catch (error) {
    console.error('Export PDF Error:', error);
    updateToast(`❌ Failed: ${error.message}`);
    setTimeout(removeToast, 3000);
    return false;
  }
};

export const exportDashboardReport = async () =>
  exportToPDF('dashboard-report-container', 'dashboard_report', 'Dashboard');

export const exportRevenueReport = async () =>
  exportToPDF('revenue-report-container', 'revenue_report', 'Revenue');

export const exportBrandsReport = async () =>
  exportToPDF('brands-report-container', 'brands_report', 'Brands');

export const exportTeamReport = async () =>
  exportToPDF('team-report-container', 'team_report', 'Team');

export const exportLeadsReport = async () =>
  exportToPDF('leads-report-container', 'leads_report', 'Leads');