import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { triggerExportRender, dismissExportRender } from './exportState';

// ── Abort flag ───────────────────────────────────────────────────────────────
let _aborted = false;
const resetAbort = () => { _aborted = false; };
const abort     = () => { _aborted = true; };
const isAborted = () => _aborted;

// ── Dark mode detection ───────────────────────────────────────────────────────
const isDarkMode = () => document.documentElement.classList.contains('dark');

// Read --background CSS variable so the bg exactly matches what the user sees.
// Shadcn/Tailwind stores it as bare HSL numbers e.g. "222.2 84% 4.9%"
const getExportBg = () => {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--background')
    .trim();
  if (!raw) return isDarkMode() ? '#000000' : '#ffffff';
  if (/^\d/.test(raw)) return `hsl(${raw})`;
  return raw;
};

// ── Helper: Temporarily fix overflow containers ──────────────────────────────
const fixOverflowContainers = (element, fix) => {
  const overflowElements = [];
  let current = element;
  
  while (current && current !== document.body) {
    const style = getComputedStyle(current);
    if (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflow === 'auto') {
      overflowElements.push(current);
      if (fix) {
        current.dataset.originalOverflow = style.overflowY;
        current.dataset.originalMaxHeight = style.maxHeight;
        current.dataset.originalHeight = style.height;
        current.style.overflow = 'visible';
        current.style.maxHeight = 'none';
        current.style.height = 'auto';
      } else {
        if (current.dataset.originalOverflow) {
          current.style.overflow = current.dataset.originalOverflow;
          delete current.dataset.originalOverflow;
        }
        if (current.dataset.originalMaxHeight) {
          current.style.maxHeight = current.dataset.originalMaxHeight;
          delete current.dataset.originalMaxHeight;
        }
        if (current.dataset.originalHeight) {
          current.style.height = current.dataset.originalHeight;
          delete current.dataset.originalHeight;
        }
      }
    }
    current = current.parentElement;
  }
};

// ── Resolve the real capture target ──────────────────────────────────────────
const resolveTarget = (id) => {
  const named = document.getElementById(id);
  if (named && named.scrollHeight >= 100) return named;

  if (id === 'team-export-container') {
    const teamContainer = document.querySelector('#team-export-container > div');
    if (teamContainer && teamContainer.scrollHeight >= 100) return teamContainer;
    
    const teamTable = document.querySelector('table');
    if (teamTable) {
      const tableContainer = teamTable.closest('div[style*="padding"]');
      if (tableContainer && tableContainer.scrollHeight >= 100) return tableContainer;
    }
  }

  const pageContent = document.querySelector('main > section > div');
  if (pageContent && pageContent.scrollHeight >= 100) return pageContent;

  return named ?? null;
};

// ── Wait until element exists and has real content height ────────────────────
const waitForElement = (id, minHeight = 200, timeoutMs = 20000) => {
  return new Promise((resolve) => {
    const start = Date.now();
    let lastHeight = 0;
    let stableCount = 0;

    const check = () => {
      if (isAborted()) return resolve(null);
      const el = document.getElementById(id);
      if (el) {
        const targetEl = id === 'team-export-container' && el.firstChild ? el.firstChild : el;
        const currentHeight = targetEl.scrollHeight;
        if (currentHeight === lastHeight && currentHeight >= minHeight) {
          stableCount++;
        } else {
          stableCount = 0;
          lastHeight = currentHeight;
        }
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

// ── Toast ─────────────────────────────────────────────────────────────────────
const createToast = (message, showStop = false) => {
  const existing = document.getElementById('pdf-export-toast');
  if (existing) existing.remove();

  if (!document.getElementById('toast-spin-style')) {
    const style = document.createElement('style');
    style.id = 'toast-spin-style';
    style.textContent = `@keyframes _toast_spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }

  const backdrop = document.createElement('div');
  backdrop.id = 'pdf-export-backdrop';
  backdrop.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(2px);
    z-index: 999998;
  `;

  // ── Theme-aware colors ───────────────────────────────────────────────────
  const dark = isDarkMode();
  const toastBg            = dark ? '#111827' : '#ffffff';
  const toastColor         = dark ? '#ffffff' : '#111827';
  const spinnerBorder      = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const spinnerBorderTop   = dark ? '#ffffff' : '#111827';
  const stopBtnHoverBg     = '#dc2626';
  // ────────────────────────────────────────────────────────────────────────

  const toast = document.createElement('div');
  toast.id = 'pdf-export-toast';
  toast.style.cssText = `
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: ${toastBg}; color: ${toastColor};
    font-size: 0.875rem; font-weight: 700;
    padding: 1.25rem 2rem; border-radius: 1rem;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    z-index: 999999; display: flex; flex-direction: column;
    align-items: center; gap: 0.875rem;
    min-width: 260px; text-align: center;
  `;

  const spinner = document.createElement('span');
  spinner.style.cssText = `
    display: inline-block; width: 1.75rem; height: 1.75rem;
    border: 3px solid ${spinnerBorder};
    border-top-color: ${spinnerBorderTop}; border-radius: 9999px;
    animation: _toast_spin 0.7s linear infinite; flex-shrink: 0;
  `;

  const text = document.createElement('span');
  text.id = 'pdf-toast-text';
  text.innerText = message;
  text.style.cssText = `font-size: 0.875rem; font-weight: 700; line-height: 1.4;`;

  toast.appendChild(spinner);
  toast.appendChild(text);

  if (showStop) {
    const stopBtn = document.createElement('button');
    stopBtn.id = 'pdf-stop-btn';
    stopBtn.innerText = 'Stop Export';
    stopBtn.style.cssText = `
      margin-top: 0.25rem; background: #ef4444; color: #ffffff;
      border: none; border-radius: 0.5rem; padding: 0.4rem 1.25rem;
      font-size: 0.75rem; font-weight: 700; cursor: pointer;
      letter-spacing: 0.03em; transition: background 0.15s;
    `;
    stopBtn.onmouseenter = () => { stopBtn.style.background = stopBtnHoverBg; };
    stopBtn.onmouseleave = () => { stopBtn.style.background = '#ef4444'; };
    stopBtn.onclick = () => { abort(); updateToast('Stopping export...'); hideStopButton(); };
    toast.appendChild(stopBtn);
  }

  document.body.appendChild(backdrop);
  document.body.appendChild(toast);
  return toast;
};

const updateToast = (message) => {
  const text = document.getElementById('pdf-toast-text');
  if (text) text.innerText = message;
};

const hideStopButton = () => {
  const btn = document.getElementById('pdf-stop-btn');
  if (btn) btn.remove();
};

const removeToast = () => {
  document.getElementById('pdf-export-toast')?.remove();
  document.getElementById('pdf-export-backdrop')?.remove();
};

// ── Capture element as PNG with overflow fix ──────────────────────────────────
const captureElement = async (element, exportBg) => {
  let captureTarget = element;
  
  if (element.id === 'team-export-container' && element.firstChild) {
    captureTarget = element.firstChild;
  }
  
  fixOverflowContainers(captureTarget, true);
  
  try {
    // Wait for all fonts to be fully loaded before capturing
    await document.fonts.ready;
    await Promise.all([...document.fonts].map(f => f.load().catch(() => {})));
    await new Promise(r => setTimeout(r, 50));
    
    const actualHeight = captureTarget.scrollHeight;
    const actualWidth  = captureTarget.scrollWidth;
    
    const dataUrl = await toPng(captureTarget, {
      quality: 1,
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: exportBg,
      skipAutoScale: false,
      width: actualWidth,
      height: actualHeight,
      includeQueryParams: true,
    });
    
    return dataUrl;
  } finally {
    fixOverflowContainers(captureTarget, false);
  }
};

// ── Add image to PDF ──────────────────────────────────────────────────────────
// Uses A4 landscape (297 × 210 mm) — the standard size for wide dashboard
// reports, matching what Chrome/browsers default to when printing landscape.
// Each captured page is scaled to fill the full page width. If the content
// height fits within one page it sits cleanly at the top. If it is taller it
// flows onto additional pages without any horizontal distortion.
const addImageToPdf = (pdf, dataUrl, elementWidth, elementHeight, pdfWidth, pdfPageHeight, isFirst) => {
  const scale  = pdfWidth / elementWidth;   // scale so image fills page width
  const imgH   = elementHeight * scale;     // proportional height in mm

  if (!isFirst) pdf.addPage();

  if (imgH <= pdfPageHeight) {
    // Content fits on one page — place flush to top, no slicing
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, imgH);
  } else {
    // Content taller than one page — slice cleanly across pages
    let remaining = imgH;
    let yOffset   = 0;

    while (remaining > 0) {
      pdf.addImage(dataUrl, 'PNG', 0, -yOffset, pdfWidth, imgH);
      yOffset   += pdfPageHeight;
      remaining -= pdfPageHeight;
      if (remaining > 0) pdf.addPage();
    }
  }
};

// ── Complete multi-page export ────────────────────────────────────────────────
export const exportCompleteReport = async () => {
  const pages = [
    { id: 'dashboard-export-container', name: 'Dashboard' },
    { id: 'revenue-export-container',   name: 'Revenue'   },
    { id: 'brands-export-container',    name: 'Brands'    },
    { id: 'team-export-container',      name: 'Team'      },
    { id: 'leads-export-container',     name: 'Leads'     },
  ];

  resetAbort();

  const exportBg = getExportBg();

  const exportWrapper = document.getElementById('pdf-export-wrapper');
  if (exportWrapper) {
    isDarkMode()
      ? exportWrapper.classList.add('dark')
      : exportWrapper.classList.remove('dark');
  }

  createToast('Mounting all pages...', true);

  try {
    triggerExportRender();

    updateToast('Waiting for pages to mount...');
    await new Promise((r) => setTimeout(r, 1500));
    if (isAborted()) throw new Error('__aborted__');

    updateToast('Waiting for data to load...');
    await Promise.all(pages.map((p) => waitForElement(p.id, 400, 20000)));
    if (isAborted()) throw new Error('__aborted__');

    updateToast('Rendering charts...');
    await new Promise((r) => setTimeout(r, 3000));
    if (isAborted()) throw new Error('__aborted__');

    // ── A4 landscape: 297 mm wide × 210 mm tall ───────────────────────────
    const pdf      = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pdfWidth = 297;
    const pdfPageH = 210;
    // ─────────────────────────────────────────────────────────────────────
    let isFirst    = true;
    let capturedCount = 0;

    for (let i = 0; i < pages.length; i++) {
      if (isAborted()) throw new Error('__aborted__');

      const page    = pages[i];
      const element = resolveTarget(page.id);

      if (!element) {
        console.warn(`Skipping ${page.name} — element not found`);
        continue;
      }
      
      let contentElement = element;
      if (page.id === 'team-export-container' && element.firstChild) {
        contentElement = element.firstChild;
      }
      
      if (contentElement.scrollHeight < 50) {
        console.warn(`Skipping ${page.name} — no content (height: ${contentElement.scrollHeight}px)`);
        continue;
      }

      updateToast(`Capturing ${page.name}\n(${i + 1} of ${pages.length})...`);
      await new Promise((r) => setTimeout(r, 300));

      try {
        const dataUrl = await captureElement(element, exportBg);
        addImageToPdf(pdf, dataUrl, contentElement.scrollWidth, contentElement.scrollHeight, pdfWidth, pdfPageH, isFirst);
        isFirst = false;
        capturedCount++;
        console.log(`Captured ${page.name} (${contentElement.scrollHeight}px)`);
      } catch (err) {
        console.error(`Failed to capture ${page.name}:`, err);
      }
    }

    if (capturedCount === 0) {
      throw new Error('No pages were captured — check console for details');
    }

    hideStopButton();
    updateToast(`Saving PDF (${capturedCount} pages)...`);
    pdf.save(`vidhelp_report_${new Date().toISOString().split('T')[0]}.pdf`);

    updateToast(` Done! ${capturedCount} pages saved.`);
    setTimeout(removeToast, 3000);
    return true;

  } catch (error) {
    if (error.message === '__aborted__') {
      console.log('Export cancelled by user.');
      updateToast('Export cancelled.');
      setTimeout(removeToast, 2500);
      return false;
    }
    console.error('Export failed:', error);
    updateToast(`❌ Export failed:\n${error.message}`);
    setTimeout(removeToast, 4000);
    return false;
  } finally {
    hideStopButton();
    dismissExportRender();
    resetAbort();
  }
};

// ── Single page export ────────────────────────────────────────────────────────
export const exportToPDF = async (elementId, filename, pageTitle = '') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found`);
    return false;
  }

  resetAbort();

  const exportBg = getExportBg();

  createToast(`Generating ${pageTitle || filename} PDF...`, true);

  try {
    await new Promise((r) => setTimeout(r, 300));
    if (isAborted()) throw new Error('__aborted__');

    const dataUrl = await captureElement(element, exportBg);
    
    let contentElement = element;
    if (elementId === 'team-export-container' && element.firstChild) {
      contentElement = element.firstChild;
    }

    if (isAborted()) throw new Error('__aborted__');

    // ── A4 landscape: 297 mm wide × 210 mm tall ───────────────────────────
    const pdf      = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pdfWidth = 297;
    const pdfPageH = 210;
    // ─────────────────────────────────────────────────────────────────────

    addImageToPdf(pdf, dataUrl, contentElement.scrollWidth, contentElement.scrollHeight, pdfWidth, pdfPageH, true);

    hideStopButton();
    pdf.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
    updateToast(`${pageTitle} saved!`);
    setTimeout(removeToast, 2000);
    return true;

  } catch (error) {
    if (error.message === '__aborted__') {
      console.log('Export cancelled by user.');
      updateToast('Export cancelled.');
      setTimeout(removeToast, 2500);
      return false;
    }
    console.error('Export PDF Error:', error);
    updateToast(`❌ Failed:\n${error.message}`);
    setTimeout(removeToast, 3000);
    return false;
  } finally {
    hideStopButton();
    resetAbort();
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