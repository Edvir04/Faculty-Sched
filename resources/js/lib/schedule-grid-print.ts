import { formatHiTo12Hour, formatScheduleTimeRange } from '@/lib/schedule-labels';
import {
    buildSchedulePdfFileName,
    getSchedulePaperLayout,
    SCHEDULE_PRINT_POPUP_BLOCKED_MESSAGE,
    type ComlabPrintOrder,
    type SchedulePaperLayout,
    type SchedulePrintMeta,
    type SchedulePrintResult,
    type SchedulePrintSourceRow,
} from '@/lib/schedule-print';
import { jsPDF } from 'jspdf';
import { autoTable, type CellDef, type RowInput } from 'jspdf-autotable';

/**
 * MTH = Monday & Thursday; TFRI = Tuesday & Friday.
 * These are the two specific days each group creates schedules for.
 */
export const MTH_DAYS = ['Monday', 'Thursday'] as const;
export const TFRI_DAYS = ['Tuesday', 'Friday'] as const;

/** Weekdays represented in the main MTH/TFRI grid. */
export const WEEKDAY_MAIN_GRID = ['Monday', 'Tuesday', 'Thursday', 'Friday'] as const;

export type GridCellContent = {
    subjectCode: string;
    sectionName: string;
    teacherName: string;
    extraCount?: number;
};

export type GridTimeRow =
    | { kind: 'slot'; start: string; end: string; label: string }
    | { kind: 'break'; label: string };

export type GridComlabColumn = {
    id: number;
    label: string;
};

export type MthTfriGridSection = {
    type: 'mth-tfri';
    title: string;
    timeRows: GridTimeRow[];
    comlabs: GridComlabColumn[];
    cells: Record<string, GridCellContent | null>;
};

export type SingleDayGridSection = {
    type: 'single-day';
    day: string;
    shortLabel: string;
    title: string;
    timeRows: GridTimeRow[];
    comlabs: GridComlabColumn[];
    cells: Record<string, GridCellContent | null>;
};

/**
 * Per-comlab timetable: each section is one comlab, days are columns.
 * Cell key format: `${start}|${end}|${day.toLowerCase()}`.
 */
export type UniformDayGridSection = {
    type: 'uniform-day';
    comlabId: number;
    comlabLabel: string;
    timeRows: GridTimeRow[];
    /** Ordered weekdays that have at least one schedule for this comlab. */
    days: string[];
    cells: Record<string, GridCellContent | null>;
};

export type ScheduleGridPrintModel = {
    sections: (MthTfriGridSection | SingleDayGridSection | UniformDayGridSection)[];
};

const EMPTY_CELL = '—';

/** TIME column share of table width (remainder split across slot columns). */
const GRID_TIME_COL_PERCENT = 8;

/** Minimum table width before horizontal scroll (many comlabs). */
const GRID_TIME_COL_PX = 52;
const GRID_SLOT_COL_PX = 44;

function slotKey(start: string, end: string): string {
    return `${start}|${end}`;
}

export function cellKey(start: string, end: string, comlabId: number, column: string): string {
    return `${slotKey(start, end)}|${comlabId}|${column}`;
}

export function formatTimeSlotLabel(start: string, end: string): string {
    return formatScheduleTimeRange(start, end);
}

/** Two-line time cell: start on line 1, end on line 2 (saves horizontal space). */
export function formatTimeSlotTwoLines(start: string, end: string): { startLine: string; endLine: string } {
    return {
        startLine: formatHiTo12Hour(start),
        endLine: formatHiTo12Hour(end),
    };
}

function formatTimeCellForPdf(start: string, end: string): string {
    const { startLine, endLine } = formatTimeSlotTwoLines(start, end);
    return `${startLine}\n${endLine}`;
}

function renderTimeCellHtml(start: string, end: string): string {
    const { startLine, endLine } = formatTimeSlotTwoLines(start, end);
    return `<td class="time">
    <span class="time-line">${escapeHtml(startLine)}</span>
    <span class="time-line">${escapeHtml(endLine)}</span>
  </td>`;
}

function buildColgroupHtml(slotColumnCount: number): string {
    if (slotColumnCount <= 0) {
        return `<colgroup><col class="col-time" style="width:${GRID_TIME_COL_PERCENT}%" /></colgroup>`;
    }
    const slotPct = ((100 - GRID_TIME_COL_PERCENT) / slotColumnCount).toFixed(3);
    const slotCols = Array.from(
        { length: slotColumnCount },
        () => `<col class="col-slot" style="width:${slotPct}%" />`,
    ).join('');
    return `<colgroup><col class="col-time" style="width:${GRID_TIME_COL_PERCENT}%" />${slotCols}</colgroup>`;
}

function gridTableMinWidthPx(slotColumnCount: number): number {
    return GRID_TIME_COL_PX + slotColumnCount * GRID_SLOT_COL_PX + 16;
}

export function formatComlabGridHeader(name: string | null | undefined): string {
    if (!name?.trim()) {
        return 'COMLAB';
    }
    return name.trim().toUpperCase();
}

function resolveSubjectCode(row: SchedulePrintSourceRow): string {
    if (row.subject_code?.trim()) {
        return row.subject_code.trim();
    }
    const label = row.subject_label ?? '';
    const dash = label.indexOf(' — ');
    if (dash > 0) {
        return label.slice(0, dash).trim();
    }
    return label.trim() || EMPTY_CELL;
}

function resolveSectionName(row: SchedulePrintSourceRow): string {
    return row.section_name?.trim() || EMPTY_CELL;
}

function resolveTeacherName(row: SchedulePrintSourceRow): string {
    return row.teacher_name?.trim() || EMPTY_CELL;
}

function rowToCellContent(row: SchedulePrintSourceRow): GridCellContent {
    return {
        subjectCode: resolveSubjectCode(row),
        sectionName: resolveSectionName(row),
        teacherName: resolveTeacherName(row),
    };
}

function mergeCellContents(existing: GridCellContent | null, row: SchedulePrintSourceRow): GridCellContent {
    if (!existing) {
        return rowToCellContent(row);
    }
    const extra = (existing.extraCount ?? 0) + 1;
    return { ...existing, extraCount: extra };
}

export function collectTimeSlots(
    schedules: SchedulePrintSourceRow[],
    dayFilter?: readonly string[],
): { start: string; end: string; label: string }[] {
    const seen = new Set<string>();
    const slots: { start: string; end: string; label: string }[] = [];

    for (const row of schedules) {
        if (dayFilter && !dayFilter.includes(row.day)) {
            continue;
        }
        const key = slotKey(row.start_time, row.end_time);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        slots.push({
            start: row.start_time,
            end: row.end_time,
            label: formatTimeSlotLabel(row.start_time, row.end_time),
        });
    }

    return slots.sort((a, b) => a.start.localeCompare(b.start));
}

export function injectBreakRow(slots: { start: string; end: string; label: string }[]): GridTimeRow[] {
    if (slots.length === 0) {
        return [];
    }

    const rows: GridTimeRow[] = [];
    let breakInserted = false;

    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (!breakInserted && i > 0) {
            const prev = slots[i - 1];
            if (prev.end < '13:00' && slot.start >= '13:00') {
                rows.push({ kind: 'break', label: 'BREAK' });
                breakInserted = true;
            }
        }
        rows.push({ kind: 'slot', start: slot.start, end: slot.end, label: slot.label });
    }

    return rows;
}

function orderedComlabs(
    schedules: SchedulePrintSourceRow[],
    comlabOrder: ComlabPrintOrder[],
): GridComlabColumn[] {
    const ids = new Set<number>();
    for (const row of schedules) {
        if (row.comlab_id !== null) {
            ids.add(row.comlab_id);
        }
    }

    const columns: GridComlabColumn[] = [];
    const seen = new Set<number>();

    for (const c of comlabOrder) {
        if (!ids.has(c.id) || seen.has(c.id)) {
            continue;
        }
        seen.add(c.id);
        const name = schedules.find((r) => r.comlab_id === c.id)?.comlab_name ?? c.name;
        columns.push({ id: c.id, label: formatComlabGridHeader(name) });
    }

    const remaining = [...ids]
        .filter((id) => !seen.has(id))
        .sort((a, b) => {
            const nameA = schedules.find((r) => r.comlab_id === a)?.comlab_name ?? '';
            const nameB = schedules.find((r) => r.comlab_id === b)?.comlab_name ?? '';
            return nameA.localeCompare(nameB);
        });

    for (const id of remaining) {
        const name = schedules.find((r) => r.comlab_id === id)?.comlab_name ?? `Comlab ${id}`;
        columns.push({ id, label: formatComlabGridHeader(name) });
    }

    return columns;
}

function fillExactMatchCells(
    schedules: SchedulePrintSourceRow[],
    comlabs: GridComlabColumn[],
    slots: { start: string; end: string }[],
    dayFilter: readonly string[],
    columnKey: 'mth' | 'tfri' | string,
    cells: Record<string, GridCellContent | null>,
): void {
    for (const row of schedules) {
        if (!dayFilter.includes(row.day) || row.comlab_id === null) {
            continue;
        }
        for (const slot of slots) {
            if (row.start_time !== slot.start || row.end_time !== slot.end) {
                continue;
            }
            const key = cellKey(slot.start, slot.end, row.comlab_id, columnKey);
            cells[key] = mergeCellContents(cells[key] ?? null, row);
        }
    }
}

export function buildMthTfriGrid(
    schedules: SchedulePrintSourceRow[],
    comlabOrder: ComlabPrintOrder[],
): MthTfriGridSection | null {
    const relevant = schedules.filter((r) => (WEEKDAY_MAIN_GRID as readonly string[]).includes(r.day));
    if (relevant.length === 0) {
        return null;
    }

    const slots = collectTimeSlots(relevant, WEEKDAY_MAIN_GRID);
    const comlabs = orderedComlabs(relevant, comlabOrder);
    const cells: Record<string, GridCellContent | null> = {};

    fillExactMatchCells(relevant, comlabs, slots, MTH_DAYS, 'mth', cells);
    fillExactMatchCells(relevant, comlabs, slots, TFRI_DAYS, 'tfri', cells);

    return {
        type: 'mth-tfri',
        title: 'CLASS SCHEDULE',
        timeRows: injectBreakRow(slots),
        comlabs,
        cells,
    };
}

export function buildSingleDayGrid(
    schedules: SchedulePrintSourceRow[],
    comlabOrder: ComlabPrintOrder[],
    day: string,
    shortLabel: string,
): SingleDayGridSection | null {
    const relevant = schedules.filter((r) => r.day === day);
    if (relevant.length === 0) {
        return null;
    }

    const slots = collectTimeSlots(relevant, [day]);
    const comlabs = orderedComlabs(relevant, comlabOrder);
    const cells: Record<string, GridCellContent | null> = {};

    fillExactMatchCells(relevant, comlabs, slots, [day], shortLabel.toLowerCase(), cells);

    return {
        type: 'single-day',
        day,
        shortLabel,
        title: `${day.toUpperCase()} SCHEDULE`,
        timeRows: injectBreakRow(slots),
        comlabs,
        cells,
    };
}

export type GridPrintResult = SchedulePrintResult;

export const GRID_PRINT_POPUP_BLOCKED_MESSAGE = SCHEDULE_PRINT_POPUP_BLOCKED_MESSAGE;

export const GRID_EMPTY_SLOTS_HINT =
    'No slots match standard time rows; check start/end times.';

/** Number of comlab sections in the model. */
export function countGridMaxComlabs(model: ScheduleGridPrintModel): number {
    return model.sections.filter((s) => s.type === 'uniform-day').length;
}

/** Max data columns (days) across all sections, for table min-width calculation. */
export function countGridMaxSlotColumns(model: ScheduleGridPrintModel): number {
    let max = 0;
    for (const section of model.sections) {
        let cols: number;
        if (section.type === 'mth-tfri') {
            cols = section.comlabs.length * 2;
        } else if (section.type === 'uniform-day') {
            cols = section.days.length;
        } else {
            cols = (section as SingleDayGridSection).comlabs.length;
        }
        max = Math.max(max, cols);
    }
    return max;
}

/** True if any grid cell has schedule content (not all empty). */
export function gridModelHasFilledCells(model: ScheduleGridPrintModel): boolean {
    for (const section of model.sections) {
        if (Object.values(section.cells).some((cell) => cell !== null)) {
            return true;
        }
    }
    return false;
}

/** Minimum preview width in px so wide comlab grids scroll horizontally. */
export function gridPreviewMinWidthPx(slotColumnCount: number, layout: SchedulePaperLayout): number {
    const pagePx = Math.round(layout.widthMm * 3.7795275591);
    return Math.max(pagePx, gridTableMinWidthPx(slotColumnCount));
}

const WEEKDAY_DISPLAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

/** Simple cell key scoped to a single comlab. */
function perComlabCellKey(start: string, end: string, day: string): string {
    return `${start}|${end}|${day.toLowerCase()}`;
}

/**
 * Builds a per-comlab timetable section where each weekday is its own column.
 * Day groups (MTH/TFRI) stored as separate rows are resolved naturally since
 * each row is keyed by its individual day name.
 */
export function buildComlabDayGrid(
    schedules: SchedulePrintSourceRow[],
    comlabId: number,
    comlabLabel: string,
): UniformDayGridSection | null {
    const relevant = schedules.filter((r) => r.comlab_id === comlabId);
    if (relevant.length === 0) {
        return null;
    }

    const daySet = new Set<string>(relevant.map((r) => r.day));
    const days = WEEKDAY_DISPLAY_ORDER.filter((d) => daySet.has(d));
    if (days.length === 0) {
        return null;
    }

    const slots = collectTimeSlots(relevant);
    const cells: Record<string, GridCellContent | null> = {};

    for (const row of relevant) {
        for (const slot of slots) {
            if (row.start_time !== slot.start || row.end_time !== slot.end) {
                continue;
            }
            const key = perComlabCellKey(row.start_time, row.end_time, row.day);
            cells[key] = mergeCellContents(cells[key] ?? null, row);
        }
    }

    return {
        type: 'uniform-day',
        comlabId,
        comlabLabel,
        timeRows: injectBreakRow(slots),
        days,
        cells,
    };
}

export function buildScheduleGridPrintModel(
    schedules: SchedulePrintSourceRow[],
    comlabOrder: ComlabPrintOrder[] = [],
): ScheduleGridPrintModel {
    const orderedIds = orderedComlabs(schedules, comlabOrder);
    const sections: UniformDayGridSection[] = [];

    for (const comlab of orderedIds) {
        const section = buildComlabDayGrid(schedules, comlab.id, comlab.label);
        if (section) {
            sections.push(section);
        }
    }

    return { sections };
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderCellHtml(cell: GridCellContent | null | undefined): string {
    if (!cell) {
        return `<td class="cell empty">—</td>`;
    }
    const extra =
        cell.extraCount && cell.extraCount > 0
            ? `<div class="extra">+${cell.extraCount}</div>`
            : '';
    return `<td class="cell">
    <div class="code">${escapeHtml(cell.subjectCode)}</div>
    <div class="section">${escapeHtml(cell.sectionName)}</div>
    <div class="teacher">${escapeHtml(cell.teacherName)}</div>
    ${extra}
  </td>`;
}

function renderMthTfriTable(section: MthTfriGridSection): string {
    const comlabHeaders = section.comlabs
        .map(
            (c) =>
                `<th colspan="2" class="comlab-h">${escapeHtml(c.label)}</th>`,
        )
        .join('');
    const subHeaders = section.comlabs
        .flatMap(
            (c) =>
                `<th class="sub" data-comlab="${c.id}">MTH</th><th class="sub" data-comlab="${c.id}">TFRI</th>`,
        )
        .join('');

    const bodyRows = section.timeRows
        .map((row) => {
            if (row.kind === 'break') {
                const colspan = 1 + section.comlabs.length * 2;
                return `<tr class="break-row"><td colspan="${colspan}" class="break">${escapeHtml(row.label)}</td></tr>`;
            }
            const cells = section.comlabs
                .map((c) => {
                    const mth = section.cells[cellKey(row.start, row.end, c.id, 'mth')];
                    const tfri = section.cells[cellKey(row.start, row.end, c.id, 'tfri')];
                    return `${renderCellHtml(mth)}${renderCellHtml(tfri)}`;
                })
                .join('');
            return `<tr>${renderTimeCellHtml(row.start, row.end)}${cells}</tr>`;
        })
        .join('');

    const slotCols = section.comlabs.length * 2;

    return `<table class="grid mth-tfri">
    ${buildColgroupHtml(slotCols)}
    <thead>
      <tr><th rowspan="2" class="time-h">TIME</th>${comlabHeaders}</tr>
      <tr>${subHeaders}</tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>`;
}

function renderSingleDayTable(section: SingleDayGridSection): string {
    const colKey = section.shortLabel.toLowerCase();
    const comlabHeaders = section.comlabs
        .map((c) => `<th class="comlab-h">${escapeHtml(c.label)} ${escapeHtml(section.shortLabel)}</th>`)
        .join('');

    const bodyRows = section.timeRows
        .map((row) => {
            if (row.kind === 'break') {
                const colspan = 1 + section.comlabs.length;
                return `<tr class="break-row"><td colspan="${colspan}" class="break">${escapeHtml(row.label)}</td></tr>`;
            }
            const cells = section.comlabs
                .map((c) => {
                    const content = section.cells[cellKey(row.start, row.end, c.id, colKey)];
                    return renderCellHtml(content);
                })
                .join('');
            return `<tr>${renderTimeCellHtml(row.start, row.end)}${cells}</tr>`;
        })
        .join('');

    return `<table class="grid single-day">
    ${buildColgroupHtml(section.comlabs.length)}
    <thead><tr><th class="time-h">TIME</th>${comlabHeaders}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>`;
}

function renderUniformDayTable(section: UniformDayGridSection): string {
    const slotCols = section.days.length;

    const dayHeaders = section.days
        .map((day) => `<th class="comlab-h">${escapeHtml(day.toUpperCase())}</th>`)
        .join('');

    const bodyRows = section.timeRows
        .map((row) => {
            if (row.kind === 'break') {
                const colspan = 1 + slotCols;
                return `<tr class="break-row"><td colspan="${colspan}" class="break">${escapeHtml(row.label)}</td></tr>`;
            }
            const cells = section.days
                .map((day) => {
                    const content = section.cells[perComlabCellKey(row.start, row.end, day)];
                    return renderCellHtml(content);
                })
                .join('');
            return `<tr>${renderTimeCellHtml(row.start, row.end)}${cells}</tr>`;
        })
        .join('');

    return `<div class="section-block">
    <h2 class="comlab-title">${escapeHtml(section.comlabLabel)}</h2>
    <table class="grid uniform-day">
      ${buildColgroupHtml(slotCols)}
      <thead><tr><th class="time-h">TIME</th>${dayHeaders}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div>`;
}

function buildScheduleGridTablesHtml(model: ScheduleGridPrintModel): string {
    return model.sections
        .map((s) => {
            if (s.type === 'mth-tfri') return renderMthTfriTable(s);
            if (s.type === 'uniform-day') return renderUniformDayTable(s);
            return renderSingleDayTable(s as SingleDayGridSection);
        })
        .join('');
}

function formatGridGeneratedAt(date: Date): string {
    return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

/** Inline CSS shared by modal preview, print window, and PDF export HTML. */
export function buildScheduleGridPrintStyles(layout: SchedulePaperLayout, slotColumnCount = 2): string {
    const tableMinWidth = gridTableMinWidthPx(slotColumnCount);
    return `
    .schedule-grid-print-root, .schedule-grid-print-root * { box-sizing: border-box; }
    .schedule-grid-print-root {
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
      background: #fff;
      font-size: 8pt;
      width: 100%;
      max-width: 100%;
    }
    .schedule-grid-print-root h1 {
      margin: 0;
      font-size: 14pt;
      font-weight: 700;
      text-align: center;
      letter-spacing: 0.04em;
    }
    .schedule-grid-print-root .semester {
      margin: 4px 0 12px;
      font-size: 10pt;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
    }
    .schedule-grid-print-root .meta {
      margin: 0 0 10px;
      font-size: 7.5pt;
      text-align: center;
      color: #475569;
    }
    .schedule-grid-print-root .section-block {
      margin-bottom: 20px;
      page-break-inside: avoid;
      width: 100%;
    }
    .schedule-grid-print-root .comlab-title {
      margin: 0 0 4px;
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #1e293b;
      border-bottom: 1.5px solid #1e293b;
      padding-bottom: 2px;
    }
    .schedule-grid-print-root table.grid {
      width: 100%;
      min-width: ${tableMinWidth}px;
      border-collapse: collapse;
      table-layout: fixed;
      margin-bottom: 8px;
    }
    .schedule-grid-print-root th,
    .schedule-grid-print-root td {
      border: 1px solid #1e293b;
      padding: 2px 3px;
      vertical-align: middle;
      text-align: center;
      overflow: hidden;
    }
    .schedule-grid-print-root th {
      background: #e2e8f0;
      font-weight: 700;
      font-size: 7pt;
      line-height: 1.2;
    }
    .schedule-grid-print-root th.time-h {
      background: #cbd5e1;
    }
    .schedule-grid-print-root th.comlab-h {
      font-size: 7pt;
      line-height: 1.2;
      word-break: break-word;
      overflow-wrap: anywhere;
      padding: 3px 4px;
    }
    .schedule-grid-print-root th.sub {
      font-size: 7pt;
      padding: 2px 3px;
      white-space: nowrap;
    }
    .schedule-grid-print-root td.time {
      font-weight: 600;
      font-size: 7pt;
      line-height: 1.15;
      white-space: normal;
      background: #f8fafc;
      padding: 3px 4px;
    }
    .schedule-grid-print-root td.time .time-line {
      display: block;
      white-space: nowrap;
      line-height: 1.2;
    }
    .schedule-grid-print-root td.cell {
      font-size: 7pt;
      line-height: 1.25;
      word-break: break-word;
      overflow-wrap: anywhere;
      padding: 3px 4px;
    }
    .schedule-grid-print-root td.cell.empty { color: #94a3b8; }
    .schedule-grid-print-root td.cell .code { font-weight: 700; }
    .schedule-grid-print-root td.cell .section,
    .schedule-grid-print-root td.cell .teacher { font-size: 7pt; }
    .schedule-grid-print-root td.cell .extra { font-size: 6pt; color: #64748b; margin-top: 2px; }
    .schedule-grid-print-root tr.break-row td.break {
      font-weight: 700;
      letter-spacing: 0.15em;
      background: #f1f5f9;
      padding: 5px;
    }
    .schedule-grid-print-root .footer {
      margin-top: 6px;
      font-size: 7pt;
      color: #94a3b8;
      text-align: right;
    }
  `;
}

/** Document body HTML (preview, print, PDF) — single source of truth for grid layout. */
export function buildScheduleGridPrintBodyHtml(model: ScheduleGridPrintModel, meta: SchedulePrintMeta): string {
    const layout = getSchedulePaperLayout(meta.paperFormat ?? 'a4');
    const org = meta.organizationName ?? 'Faculty Scheduling System';
    const generated = formatGridGeneratedAt(meta.generatedAt);
    const tables = buildScheduleGridTablesHtml(model);

    return `<div class="schedule-grid-print-root doc" style="padding: 8mm; box-sizing: border-box;">
    <h1>CLASS SCHEDULE</h1>
    <p class="semester">${escapeHtml(meta.semesterLabel)}</p>
    <p class="meta">${escapeHtml(org)} · Generated ${escapeHtml(generated)} · ${escapeHtml(layout.label)}</p>
    <div class="section-block">${tables}</div>
    <p class="footer">${escapeHtml(layout.label)} · Timetable grid (by day)</p>
  </div>`;
}

export function buildScheduleGridPrintHtml(model: ScheduleGridPrintModel, meta: SchedulePrintMeta): string {
    const layout = getSchedulePaperLayout(meta.paperFormat ?? 'a4');
    const slotColumns = countGridMaxSlotColumns(model);
    const bodyHtml = buildScheduleGridPrintBodyHtml(model, meta);
    const styles = buildScheduleGridPrintStyles(layout, slotColumns);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>CLASS SCHEDULE — ${escapeHtml(meta.semesterLabel)}</title>
  <style>
    @page { size: ${layout.cssPageSize}; margin: 8mm; }
    html, body { margin: 0; padding: 0; width: 100%; background: #fff; }
    ${styles}
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
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

type JsPdfWithAutoTable = jsPDF & {
    lastAutoTable?: { finalY: number };
};

function formatCellForPdf(cell: GridCellContent | null | undefined): string {
    if (!cell) {
        return '—';
    }
    const lines = [cell.subjectCode, cell.sectionName, cell.teacherName];
    if (cell.extraCount && cell.extraCount > 0) {
        lines.push(`+${cell.extraCount}`);
    }
    return lines.join('\n');
}

function buildMthTfriAutoTableHead(comlabs: GridComlabColumn[]): CellDef[][] {
    const row1: CellDef[] = [{ content: 'TIME', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }];
    const row2: CellDef[] = [];
    for (const comlab of comlabs) {
        row1.push({ content: comlab.label, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } });
        row2.push({ content: 'MTH', styles: { halign: 'center', fontSize: 7 } });
        row2.push({ content: 'TFRI', styles: { halign: 'center', fontSize: 7 } });
    }
    return [row1, row2];
}

function buildMthTfriAutoTableBody(section: MthTfriGridSection): RowInput[] {
    const totalCols = 1 + section.comlabs.length * 2;
    const body: RowInput[] = [];

    for (const row of section.timeRows) {
        if (row.kind === 'break') {
            body.push([
                {
                    content: row.label,
                    colSpan: totalCols,
                    styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] },
                },
            ]);
            continue;
        }

        const cells: CellDef[] = [
            {
                content: formatTimeCellForPdf(row.start, row.end),
                styles: { fontStyle: 'bold', halign: 'center', valign: 'middle', fontSize: 6 },
            },
        ];
        for (const comlab of section.comlabs) {
            cells.push({
                content: formatCellForPdf(section.cells[cellKey(row.start, row.end, comlab.id, 'mth')]),
                styles: { halign: 'center', valign: 'middle' },
            });
            cells.push({
                content: formatCellForPdf(section.cells[cellKey(row.start, row.end, comlab.id, 'tfri')]),
                styles: { halign: 'center', valign: 'middle' },
            });
        }
        body.push(cells);
    }

    return body;
}

function buildSingleDayAutoTableHead(section: SingleDayGridSection): CellDef[][] {
    return [
        [
            { content: 'TIME', styles: { halign: 'center', fontStyle: 'bold' } },
            ...section.comlabs.map((c) => ({
                content: `${c.label} ${section.shortLabel}`,
                styles: { halign: 'center', fontStyle: 'bold' },
            })),
        ],
    ];
}

function buildSingleDayAutoTableBody(section: SingleDayGridSection): RowInput[] {
    const colKey = section.shortLabel.toLowerCase();
    const totalCols = 1 + section.comlabs.length;
    const body: RowInput[] = [];

    for (const row of section.timeRows) {
        if (row.kind === 'break') {
            body.push([
                {
                    content: row.label,
                    colSpan: totalCols,
                    styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] },
                },
            ]);
            continue;
        }

        const cells: CellDef[] = [
            {
                content: formatTimeCellForPdf(row.start, row.end),
                styles: { fontStyle: 'bold', halign: 'center', valign: 'middle', fontSize: 6 },
            },
        ];
        for (const comlab of section.comlabs) {
            cells.push({
                content: formatCellForPdf(section.cells[cellKey(row.start, row.end, comlab.id, colKey)]),
                styles: { halign: 'center', valign: 'middle' },
            });
        }
        body.push(cells);
    }

    return body;
}

function buildUniformDayAutoTableHead(section: UniformDayGridSection): CellDef[][] {
    return [
        [
            { content: 'TIME', styles: { halign: 'center', fontStyle: 'bold' } },
            ...section.days.map((day) => ({
                content: day.toUpperCase(),
                styles: { halign: 'center', fontStyle: 'bold' },
            })),
        ],
    ];
}

function buildUniformDayAutoTableBody(section: UniformDayGridSection): RowInput[] {
    const totalCols = 1 + section.days.length;
    const body: RowInput[] = [];

    for (const row of section.timeRows) {
        if (row.kind === 'break') {
            body.push([
                {
                    content: row.label,
                    colSpan: totalCols,
                    styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] },
                },
            ]);
            continue;
        }

        const cells: CellDef[] = [
            {
                content: formatTimeCellForPdf(row.start, row.end),
                styles: { fontStyle: 'bold', halign: 'center', valign: 'middle', fontSize: 6 },
            },
        ];
        for (const day of section.days) {
            cells.push({
                content: formatCellForPdf(section.cells[perComlabCellKey(row.start, row.end, day)]),
                styles: { halign: 'center', valign: 'middle' },
            });
        }
        body.push(cells);
    }

    return body;
}

function buildGridPdfColumnStyles(
    totalCols: number,
    tableWidth: number,
): Record<number, { cellWidth: number; halign: 'center' }> {
    const timeWidth = 14;
    const slotWidth = totalCols > 1 ? (tableWidth - timeWidth) / (totalCols - 1) : tableWidth - timeWidth;
    const styles: Record<number, { cellWidth: number; halign: 'center' }> = {
        0: { cellWidth: timeWidth, halign: 'center' },
    };
    for (let i = 1; i < totalCols; i++) {
        styles[i] = { cellWidth: slotWidth, halign: 'center' };
    }
    return styles;
}

function drawGridPdfTitle(doc: jsPDF, meta: SchedulePrintMeta, layout: SchedulePaperLayout, startY: number): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const org = meta.organizationName ?? 'Faculty Scheduling System';
    const generated = formatGridGeneratedAt(meta.generatedAt);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('CLASS SCHEDULE', pageWidth / 2, startY, { align: 'center' });

    let y = startY + 6;
    doc.setFontSize(10);
    doc.text(meta.semesterLabel.toUpperCase(), pageWidth / 2, y, { align: 'center' });

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${org} · Generated ${generated} · ${layout.label}`, pageWidth / 2, y, { align: 'center' });

    return y + 8;
}

/**
 * Vector PDF via jsPDF + autoTable (primary path; readable text, multi-page per section).
 */
function exportScheduleGridPdfWithAutoTable(model: ScheduleGridPrintModel, meta: SchedulePrintMeta): void {
    const layout = getSchedulePaperLayout(meta.paperFormat ?? 'a4');
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: layout.jsPdfFormat,
    }) as JsPdfWithAutoTable;

    const margin = 8;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const tableWidth = pageWidth - margin * 2;

    let y = drawGridPdfTitle(doc, meta, layout, margin);

    for (const section of model.sections) {
        const minSpace = 36;
        if (y > pageHeight - minSpace) {
            doc.addPage();
            y = margin;
        }

        if (section.type === 'single-day') {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(`${section.day.toUpperCase()} (${section.shortLabel})`, margin, y);
            y += 5;
        } else if (section.type === 'uniform-day') {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(section.comlabLabel, margin, y);
            y += 5;
        }

        const head =
            section.type === 'mth-tfri'
                ? buildMthTfriAutoTableHead(section.comlabs)
                : section.type === 'uniform-day'
                  ? buildUniformDayAutoTableHead(section)
                  : buildSingleDayAutoTableHead(section as SingleDayGridSection);
        const body =
            section.type === 'mth-tfri'
                ? buildMthTfriAutoTableBody(section)
                : section.type === 'uniform-day'
                  ? buildUniformDayAutoTableBody(section)
                  : buildSingleDayAutoTableBody(section as SingleDayGridSection);

        const totalCols =
            section.type === 'mth-tfri'
                ? 1 + section.comlabs.length * 2
                : section.type === 'uniform-day'
                  ? 1 + section.days.length
                  : 1 + (section as SingleDayGridSection).comlabs.length;

        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            tableWidth,
            head,
            body,
            theme: 'grid',
            styles: {
                fontSize: 6,
                cellPadding: 1,
                overflow: 'linebreak',
                valign: 'middle',
                halign: 'center',
                lineWidth: 0.1,
            },
            headStyles: {
                fillColor: [226, 232, 240],
                textColor: [15, 23, 42],
                fontStyle: 'bold',
                fontSize: 6.5,
                cellPadding: 1,
            },
            columnStyles: buildGridPdfColumnStyles(totalCols, tableWidth),
        });

        y = (doc.lastAutoTable?.finalY ?? y) + 8;
    }

    doc.save(buildSchedulePdfFileName(meta, layout));
}

export async function printScheduleGridDocument(
    model: ScheduleGridPrintModel,
    meta: SchedulePrintMeta,
): Promise<GridPrintResult> {
    const html = buildScheduleGridPrintHtml(model, meta);
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
    if (!printWindow) {
        return { ok: false, error: GRID_PRINT_POPUP_BLOCKED_MESSAGE };
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

/** Download grid PDF (jsPDF + autoTable vector tables). */
export async function exportScheduleGridPdf(
    model: ScheduleGridPrintModel,
    meta: SchedulePrintMeta,
): Promise<GridPrintResult> {
    if (model.sections.length === 0) {
        return { ok: false, error: 'No schedule data to export.' };
    }

    try {
        exportScheduleGridPdfWithAutoTable(model, meta);
        return { ok: true };
    } catch (error) {
        if (import.meta.env.DEV) {
            console.error('[exportScheduleGridPdf]', error);
        }
        const message = error instanceof Error ? error.message : 'Failed to generate PDF.';
        return { ok: false, error: message };
    }
}
