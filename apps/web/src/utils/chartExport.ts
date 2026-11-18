import jsPDF from 'jspdf';
import JSZip from 'jszip';

export interface ExportProgress {
  current: number;
  total: number;
  percent: number;
  currentChartName: string;
}

/**
 * Downloads a Blob to user machine with given filename
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Clean clone of SVG element with explicit XML namespaces and inline styles
 */
export function serializeSvgElement(svgEl: SVGSVGElement): string {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  return new XMLSerializer().serializeToString(clone);
}

/**
 * Export SVG directly as vector .svg file
 */
export function exportSvgAsFile(svgEl: SVGSVGElement, filename: string): void {
  const svgString = serializeSvgElement(svgEl);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  triggerFileDownload(blob, `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`);
}

/**
 * Render SVG to offscreen canvas at specified scale (1x, 2x, 4K) and download PNG
 */
export async function exportSvgAsPng(
  svgEl: SVGSVGElement,
  filename: string,
  tier: '1x' | '2x' | '4k' = '2x'
): Promise<Blob> {
  const svgString = serializeSvgElement(svgEl);
  const bbox = svgEl.getBoundingClientRect();
  const baseW = bbox.width || 600;
  const baseH = bbox.height || 300;

  let targetW = Math.round(baseW);
  let targetH = Math.round(baseH);

  if (tier === '2x') {
    targetW = Math.round(baseW * 2);
    targetH = Math.round(baseH * 2);
  } else if (tier === '4k') {
    targetW = 3840;
    targetH = Math.max(1080, Math.round((baseH / baseW) * 3840));
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d')!;

  // Fill elegant paper background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);

  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise<Blob>((resolve, reject) => {
    img.onload = () => {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            triggerFileDownload(blob, `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}_${tier}.png`);
            resolve(blob);
          } else {
            reject(new Error('Canvas PNG serialization failed'));
          }
        },
        'image/png',
        1.0
      );
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Export SVG directly to publication-ready PDF using jsPDF
 */
export async function exportSvgAsPdf(
  svgEl: SVGSVGElement,
  filename: string
): Promise<void> {
  const pngBlob = await exportSvgAsPng(svgEl, filename, '2x');
  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.onload = () => {
      const base64 = reader.result as string;
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(filename, 15, 15);
      pdf.addImage(base64, 'PNG', 15, 25, 267, 130);
      pdf.save(`${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
      resolve();
    };
    reader.readAsDataURL(pngBlob);
  });
}

/**
 * Batch export all visible instruments in the rack into a single ZIP archive
 */
export async function exportAllChartsAsZip(
  charts: Array<{ name: string; svgEl: SVGSVGElement }>,
  baseFilename: string,
  onProgress?: (progress: ExportProgress) => void
): Promise<void> {
  const zip = new JSZip();
  const total = charts.length;

  for (let i = 0; i < total; i++) {
    const { name, svgEl } = charts[i];
    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        percent: Math.round(((i + 1) / total) * 100),
        currentChartName: name,
      });
    }

    // Add high-resolution SVG
    const svgStr = serializeSvgElement(svgEl);
    zip.file(`svg/${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`, svgStr);
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  triggerFileDownload(zipContent, `${baseFilename}_all_charts.zip`);
}
