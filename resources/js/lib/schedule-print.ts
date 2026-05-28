import { formatScheduleComlabLabel, formatScheduleSectionLabel, UNASSIGNED_COMLAB_GROUP_ID } from '@/lib/schedule-labels';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { sortSchedulesByWeekTime } from '@/lib/schedule-tracker';

export type SchedulePrintSourceRow = {
    id: number;
    comlab_id: number | null;
    day: string;
    start_time: string;
    end_time: string;
    subject_code?: string | null;
    section_name: string | null;
    subject_label: string | null;
    teacher_name: string | null;
    comlab_name: string | null;
    comlab_campus?: string | null;
};

export type ComlabPrintOrder = {
    id: number;
    name: string;
    campus?: string;
};

export type PrintableScheduleRow = {
    index: number;
    subject: string;
    teacher: string;
    comlab: string;
    day: string;
    time: string;
    section: string;
    campus: string;
};

export type PrintableComlabSection = {
    comlabId: number;
    comlabName: string;
    campus: string;
    rows: PrintableScheduleRow[];
};

/** Paper format for PDF export and browser print. */
export type SchedulePaperFormat = 'a4' | 'legal';

export type SchedulePrintResult = { ok: true } | { ok: false; error: string };

export const SCHEDULE_PRINT_POPUP_BLOCKED_MESSAGE =
    'Could not open the print window. Allow pop-ups for this site and try again.';

export type SchedulePrintMeta = {
    semesterLabel: string;
    organizationName?: string;
    generatedAt: Date;
    paperFormat?: SchedulePaperFormat;
};

export const PRINT_TABLE_HEADERS = ['#', 'Subject', 'Teacher', 'ComLab', 'Day', 'Time', 'Section', 'Campus'] as const;

export const SCHEDULE_PAPER_FORMAT_OPTIONS: {
    value: SchedulePaperFormat;
    label: string;
    description: string;
}[] = [
    { value: 'a4', label: 'A4', description: '210 × 297 mm (landscape)' },
    { value: 'legal', label: 'Custom Legal', description: '8.5 × 13 in (landscape)' },
];

const INCH_TO_MM = 25.4;

/** Legal 8.5 × 13 in, landscape (width × height in mm). */
export const LEGAL_LANDSCAPE_MM = {
    width: 13 * INCH_TO_MM,
    height: 8.5 * INCH_TO_MM,
} as const;

export type SchedulePaperLayout = {
    format: SchedulePaperFormat;
    label: string;
    jsPdfFormat: 'a4' | [number, number];
    widthMm: number;
    heightMm: number;
    cssPageSize: string;
};

type JsPdfWithAutoTable = jsPDF & {
    lastAutoTable?: { finalY: number };
};

/** Relative column widths (must sum to 1). */
const COLUMN_WIDTH_RATIOS = [0.04, 0.22, 0.16, 0.14, 0.1, 0.14, 0.12, 0.08] as const;

export function getSchedulePaperLayout(format: SchedulePaperFormat): SchedulePaperLayout {
    if (format === 'legal') {
        return {
            format: 'legal',
            label: 'Custom Legal (8.5 × 13 in)',
            jsPdfFormat: [LEGAL_LANDSCAPE_MM.width, LEGAL_LANDSCAPE_MM.height],
            widthMm: LEGAL_LANDSCAPE_MM.width,
            heightMm: LEGAL_LANDSCAPE_MM.height,
            cssPageSize: '13in 8.5in',
        };
    }
    return {
        format: 'a4',
        label: 'A4',
        jsPdfFormat: 'a4',
        widthMm: 297,
        heightMm: 210,
        cssPageSize: 'A4 landscape',
    };
}

export function humanizeCampusSlug(campus: string): string {
    if (!campus) {
        return campus;
    }
    return campus
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function formatGeneratedAt(date: Date): string {
    return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function sourceToPrintableRow(row: SchedulePrintSourceRow, index: number): PrintableScheduleRow {
    return {
        index,
        subject: row.subject_label ?? '—',
        teacher: row.teacher_name ?? '—',
        comlab: formatScheduleComlabLabel(row.comlab_name),
        day: row.day,
        time: `${row.start_time} – ${row.end_time}`,
        section: formatScheduleSectionLabel(row.section_name),
        campus: row.comlab_campus ? humanizeCampusSlug(row.comlab_campus) : '—',
    };
}

/**
 * Build printable sections grouped by comlab (preserves `comlabOrder`, then day/time within each).
 */
export function buildPrintableScheduleSections(
    schedules: SchedulePrintSourceRow[],
    comlabOrder: ComlabPrintOrder[] = [],
): PrintableComlabSection[] {
    const byComlab = new Map<number, SchedulePrintSourceRow[]>();
    for (const row of schedules) {
        const groupId = row.comlab_id ?? UNASSIGNED_COMLAB_GROUP_ID;
        const list = byComlab.get(groupId) ?? [];
        list.push(row);
        byComlab.set(groupId, list);
    }

    const orderedIds: number[] = [];
    const seen = new Set<number>();
    for (const c of comlabOrder) {
        if (byComlab.has(c.id) && !seen.has(c.id)) {
            orderedIds.push(c.id);
            seen.add(c.id);
        }
    }
    const remaining = [...byComlab.keys()]
        .filter((id) => !seen.has(id))
        .sort((a, b) => {
            const nameA = byComlab.get(a)?.[0]?.comlab_name ?? '';
            const nameB = byComlab.get(b)?.[0]?.comlab_name ?? '';
            return nameA.localeCompare(nameB);
        });
    orderedIds.push(...remaining);

    const sections: PrintableComlabSection[] = [];
    for (const comlabId of orderedIds) {
        const sourceRows = byComlab.get(comlabId);
        if (!sourceRows?.length) {
            continue;
        }
        const sorted = sortSchedulesByWeekTime(sourceRows);
        const orderMeta = comlabOrder.find((c) => c.id === comlabId);
        const comlabName =
            comlabId === UNASSIGNED_COMLAB_GROUP_ID
                ? formatScheduleComlabLabel(null)
                : (sorted[0].comlab_name ?? orderMeta?.name ?? `Comlab ${comlabId}`);
        const campusRaw = sorted[0].comlab_campus ?? orderMeta?.campus;
        const campus = campusRaw ? humanizeCampusSlug(campusRaw) : '—';

        sections.push({
            comlabId,
            comlabName,
            campus,
            rows: sorted.map((row, i) => sourceToPrintableRow(row, i + 1)),
        });
    }

    return sections;
}

/** @deprecated Use {@link buildPrintableScheduleSections} for comlab-grouped output. */
export function buildPrintableScheduleRows(
    schedules: SchedulePrintSourceRow[],
    comlabOrder: ComlabPrintOrder[] = [],
): PrintableScheduleRow[] {
    return buildPrintableScheduleSections(schedules, comlabOrder).flatMap((s) => s.rows);
}

export function countPrintableScheduleRows(sections: PrintableComlabSection[]): number {
    return sections.reduce((total, section) => total + section.rows.length, 0);
}

function rowsToTableBody(rows: PrintableScheduleRow[]): string[][] {
    return rows.map((r) => [
        String(r.index),
        r.subject,
        r.teacher,
        r.comlab,
        r.day,
        r.time,
        r.section,
        r.campus,
    ]);
}

function resolvePaperFormat(meta: SchedulePrintMeta): SchedulePaperFormat {
    return meta.paperFormat ?? 'a4';
}

/** Shared PDF filename for list and grid exports. */
export function buildSchedulePdfFileName(meta: SchedulePrintMeta, layout: SchedulePaperLayout): string {
    const stamp = meta.generatedAt.toISOString().slice(0, 10);
    const slug = meta.semesterLabel.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'schedules';
    return `schedules-${slug}-${layout.format}-${stamp}.pdf`;
}

function pdfFileName(meta: SchedulePrintMeta, layout: SchedulePaperLayout): string {
    return buildSchedulePdfFileName(meta, layout);
}

function buildColumnStyles(tableWidth: number): Record<number, { cellWidth: number; halign?: 'left' | 'center' }> {
    const styles: Record<number, { cellWidth: number; halign?: 'left' | 'center' }> = {};
    COLUMN_WIDTH_RATIOS.forEach((ratio, index) => {
        styles[index] = {
            cellWidth: tableWidth * ratio,
            halign: index === 0 ? 'center' : 'left',
        };
    });
    return styles;
}

function resolveBodyFontSize(totalRows: number): { body: number; head: number; cellPadding: number } {
    if (totalRows > 35) {
        return { body: 8, head: 8.5, cellPadding: 1 };
    }
    if (totalRows > 22) {
        return { body: 8.5, head: 9, cellPadding: 1.2 };
    }
    return { body: 9.5, head: 10, cellPadding: 1.35 };
}

function drawPageFooter(doc: jsPDF, pageWidth: number, margin: number, footerY: number): void {
    const pageCount = doc.getNumberOfPages();
    const page = doc.getCurrentPageInfo().pageNumber;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, footerY, { align: 'right' });
}

function sectionHeadingLabel(section: PrintableComlabSection): string {
    if (section.campus && section.campus !== '—') {
        return `${section.comlabName} — ${section.campus}`;
    }
    return section.comlabName;
}

/**
 * Export schedule tables grouped by comlab (A4 or Legal landscape).
 */
export function exportSchedulePdf(sections: PrintableComlabSection[], meta: SchedulePrintMeta): void {
    const layout = getSchedulePaperLayout(resolvePaperFormat(meta));
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: layout.jsPdfFormat,
    }) as JsPdfWithAutoTable;

    const org = meta.organizationName ?? 'Faculty Scheduling System';
    const margin = 8;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const tableWidth = pageWidth - margin * 2;
    const footerY = pageHeight - 6;
    const totalRows = countPrintableScheduleRows(sections);
    const fonts = resolveBodyFontSize(totalRows);
    const columnStyles = buildColumnStyles(tableWidth);

    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text('Weekly Schedule (by Comlab)', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
        `${org}  ·  ${meta.semesterLabel}  ·  ${formatGeneratedAt(meta.generatedAt)}  ·  ${layout.label}  ·  ${sections.length} comlabs`,
        margin,
        y,
        { maxWidth: tableWidth },
    );
    y += 6;

    const sectionGap = 7;
    const minSpaceBeforeSection = 28;

    for (const section of sections) {
        if (section.rows.length === 0) {
            continue;
        }

        if (y > pageHeight - minSpaceBeforeSection) {
            doc.addPage();
            y = margin;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(30, 41, 59);
        doc.text(sectionHeadingLabel(section), margin, y);
        y += 4.5;

        autoTable(doc, {
            startY: y,
            tableWidth,
            head: [PRINT_TABLE_HEADERS as unknown as string[]],
            body: rowsToTableBody(section.rows),
            styles: {
                fontSize: fonts.body,
                cellPadding: fonts.cellPadding,
                overflow: 'linebreak',
                valign: 'middle',
                lineWidth: 0.1,
            },
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: fonts.head,
                cellPadding: fonts.cellPadding + 0.25,
                halign: 'left',
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles,
            margin: { left: margin, right: margin },
            didDrawPage: () => drawPageFooter(doc, pageWidth, margin, footerY),
        });

        y = (doc.lastAutoTable?.finalY ?? y) + sectionGap;
    }

    doc.save(pdfFileName(meta, layout));
}

function renderSectionTableHtml(section: PrintableComlabSection): string {
    const headerCells = PRINT_TABLE_HEADERS.map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join('');
    const bodyRows = section.rows
        .map(
            (r) => `<tr>
      <td class="num">${r.index}</td>
      <td>${escapeHtml(r.subject)}</td>
      <td>${escapeHtml(r.teacher)}</td>
      <td>${escapeHtml(r.comlab)}</td>
      <td>${escapeHtml(r.day)}</td>
      <td>${escapeHtml(r.time)}</td>
      <td>${escapeHtml(r.section)}</td>
      <td>${escapeHtml(r.campus)}</td>
    </tr>`,
        )
        .join('');

    return `<section class="comlab-block">
    <h2 class="comlab-title">${escapeHtml(sectionHeadingLabel(section))}</h2>
    <table>
      <colgroup>
        <col /><col class="c-subject" /><col class="c-teacher" /><col class="c-comlab" />
        <col class="c-day" /><col class="c-time" /><col class="c-section" /><col class="c-campus" />
      </colgroup>
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </section>`;
}

function buildPrintHtmlDocument(sections: PrintableComlabSection[], meta: SchedulePrintMeta): string {
    const layout = getSchedulePaperLayout(resolvePaperFormat(meta));
    const org = meta.organizationName ?? 'Faculty Scheduling System';
    const generated = formatGeneratedAt(meta.generatedAt);
    const totalRows = countPrintableScheduleRows(sections);
    const tableFont = totalRows > 35 ? '8pt' : totalRows > 22 ? '8.5pt' : '9.5pt';
    const cellPad = totalRows > 35 ? '4px 5px' : '5px 6px';

    const sectionHtml = sections.map((s) => renderSectionTableHtml(s, tableFont, cellPad)).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Weekly Schedule — ${escapeHtml(meta.semesterLabel)}</title>
  <style>
    @page { size: ${layout.cssPageSize}; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #0f172a; background: #fff; }
    .doc { width: 100%; max-width: ${layout.widthMm}mm; min-height: ${layout.heightMm}mm; padding: 0; }
    h1 { margin: 0 0 3px; font-size: 16pt; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; }
    .meta { margin: 0 0 12px; font-size: 9pt; line-height: 1.35; color: #475569; }
    .comlab-block { margin-bottom: 14px; page-break-inside: avoid; }
    .comlab-title { margin: 0 0 6px; font-size: 11pt; font-weight: 700; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: ${tableFont}; table-layout: fixed; margin-bottom: 4px; }
    th, td { border: 1px solid #cbd5e1; padding: ${cellPad}; text-align: left; vertical-align: top; word-wrap: break-word; }
    th { background: #1e293b; color: #fff; font-weight: 700; }
    tr:nth-child(even) td { background: #f8fafc; }
    td.num { text-align: center; width: 4%; color: #64748b; }
    col.c-subject { width: 22%; }
    col.c-teacher { width: 16%; }
    col.c-comlab { width: 14%; }
    col.c-day { width: 10%; }
    col.c-time { width: 14%; }
    col.c-section { width: 12%; }
    col.c-campus { width: 8%; }
    .footer { margin-top: 8px; font-size: 7.5pt; color: #94a3b8; text-align: right; }
  </style>
</head>
<body>
  <div class="doc">
    <h1>Weekly Schedule (by Comlab)</h1>
    <p class="meta">
      <strong>${escapeHtml(org)}</strong> &middot; ${escapeHtml(meta.semesterLabel)} &middot;
      Generated: ${escapeHtml(generated)} &middot; ${totalRows} ${totalRows === 1 ? 'entry' : 'entries'} &middot;
      ${sections.length} comlabs &middot; ${escapeHtml(layout.label)}
    </p>
    ${sectionHtml}
    <p class="footer">${escapeHtml(layout.label)} &middot; Faculty schedule printout</p>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function waitForDocumentReady(doc: Document): Promise<void> {
    return new Promise((resolve) => {
        if (doc.readyState === 'complete') {
            resolve();
            return;
        }
        doc.addEventListener('readystatechange', () => {
            if (doc.readyState === 'complete') {
                resolve();
            }
        });
    });
}

function waitForPaint(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
        });
    });
}

/** Open browser print dialog (grouped by comlab, same data as PDF). */
export async function printScheduleDocument(
    sections: PrintableComlabSection[],
    meta: SchedulePrintMeta,
): Promise<SchedulePrintResult> {
    const html = buildPrintHtmlDocument(sections, meta);
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=768');
    if (!printWindow) {
        return { ok: false, error: SCHEDULE_PRINT_POPUP_BLOCKED_MESSAGE };
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    await waitForDocumentReady(printWindow.document);
    await waitForPaint();
    await new Promise((resolve) => setTimeout(resolve, 300));

    printWindow.print();
    if (typeof printWindow.onafterprint !== 'undefined') {
        printWindow.onafterprint = () => printWindow.close();
    }

    return { ok: true };
}
