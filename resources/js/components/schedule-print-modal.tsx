import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    buildScheduleGridPrintHtml,
    buildScheduleGridPrintModel,
    countGridMaxSlotColumns,
    exportScheduleGridPdf,
    GRID_EMPTY_SLOTS_HINT,
    gridModelHasFilledCells,
    gridPreviewMinWidthPx,
    printScheduleGridDocument,
} from '@/lib/schedule-grid-print';
import {
    buildPrintableScheduleSections,
    countPrintableScheduleRows,
    exportSchedulePdf,
    getSchedulePaperLayout,
    PRINT_TABLE_HEADERS,
    printScheduleDocument,
    SCHEDULE_PAPER_FORMAT_OPTIONS,
    type ComlabPrintOrder,
    type PrintableComlabSection,
    type SchedulePaperFormat,
    type SchedulePrintMeta,
    type SchedulePrintSourceRow,
} from '@/lib/schedule-print';
import { FileDown, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const scrollHide =
    'overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

type SchedulePrintLayoutMode = 'grid' | 'list';

type SchedulePrintModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    schedules: SchedulePrintSourceRow[];
    comlabs: ComlabPrintOrder[];
    meta: SchedulePrintMeta;
    organizationName?: string;
};

/** Full HTML document in iframe — same output as browser print. */
function ScheduleGridPrintPreview({
    html,
    minWidthPx,
    layout,
}: {
    html: string;
    minWidthPx: number;
    layout: ReturnType<typeof getSchedulePaperLayout>;
}) {
    return (
        <div className="w-full overflow-x-auto">
            <iframe
                title="Timetable grid preview"
                srcDoc={html}
                className="block w-full border-0 bg-white shadow-lg ring-1 ring-slate-200"
                style={{
                    width: '100%',
                    minWidth: minWidthPx > 0 ? `${minWidthPx}px` : undefined,
                    minHeight: `${layout.heightMm}mm`,
                    height: 'min(70vh, 900px)',
                }}
            />
        </div>
    );
}

function ScheduleListPrintPaper({
    sections,
    meta,
    paperFormat,
}: {
    sections: PrintableComlabSection[];
    meta: SchedulePrintMeta;
    paperFormat: SchedulePaperFormat;
}) {
    const layout = getSchedulePaperLayout(paperFormat);
    const org = meta.organizationName ?? 'Faculty Scheduling System';
    const generated = meta.generatedAt.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
    const totalRows = countPrintableScheduleRows(sections);

    const tableTextClass =
        totalRows > 35 ? 'text-[9px] leading-tight' : totalRows > 22 ? 'text-[10px] leading-snug' : 'text-[11px] leading-snug';
    const cellPad = totalRows > 35 ? 'px-1.5 py-1' : 'px-2 py-1.5';

    return (
        <article
            className="mx-auto w-full bg-white text-slate-900 shadow-lg ring-1 ring-slate-200"
            style={{
                maxWidth: `${layout.widthMm}mm`,
                minHeight: `${layout.heightMm}mm`,
                padding: '8mm',
            }}
        >
            <header className="border-b border-slate-200 pb-3">
                <h2 className="font-serif text-lg font-bold uppercase tracking-wide text-slate-900">
                    Weekly Schedule (by Comlab)
                </h2>
                <p className="mt-0.5 font-serif text-xs leading-snug text-slate-600">
                    <span className="font-medium text-slate-800">{org}</span>
                    {' · '}
                    {meta.semesterLabel}
                    {' · '}
                    {generated}
                    {' · '}
                    {totalRows} {totalRows === 1 ? 'schedule' : 'schedules'} across {sections.length}{' '}
                    {sections.length === 1 ? 'comlab' : 'comlabs'}
                </p>
            </header>

            <div className="mt-4 space-y-6">
                {sections.map((section) => (
                    <section key={section.comlabId} className="break-inside-avoid">
                        <h3 className="border-b border-slate-300 pb-1 font-serif text-sm font-bold text-slate-800">
                            {section.comlabName}
                            {section.campus !== '—' ? (
                                <span className="ml-1 font-normal text-slate-600">— {section.campus}</span>
                            ) : null}
                        </h3>
                        <div className="mt-2 w-full overflow-x-auto">
                            <table className={`w-full table-fixed border-collapse font-serif ${tableTextClass}`}>
                                <colgroup>
                                    <col className="w-[4%]" />
                                    <col className="w-[22%]" />
                                    <col className="w-[16%]" />
                                    <col className="w-[14%]" />
                                    <col className="w-[10%]" />
                                    <col className="w-[14%]" />
                                    <col className="w-[12%]" />
                                    <col className="w-[8%]" />
                                </colgroup>
                                <thead>
                                    <tr className="bg-slate-800 text-left text-white">
                                        {PRINT_TABLE_HEADERS.map((header) => (
                                            <th key={header} scope="col" className={`border border-slate-700 font-bold ${cellPad}`}>
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {section.rows.map((row) => (
                                        <tr key={`${section.comlabId}-${row.index}`} className="even:bg-slate-50">
                                            <td className={`border border-slate-200 text-center text-slate-500 ${cellPad}`}>
                                                {row.index}
                                            </td>
                                            <td className={`border border-slate-200 break-words ${cellPad}`}>{row.subject}</td>
                                            <td className={`border border-slate-200 break-words ${cellPad}`}>{row.teacher}</td>
                                            <td className={`border border-slate-200 break-words ${cellPad}`}>{row.comlab}</td>
                                            <td className={`border border-slate-200 whitespace-nowrap ${cellPad}`}>{row.day}</td>
                                            <td className={`border border-slate-200 whitespace-nowrap ${cellPad}`}>{row.time}</td>
                                            <td className={`border border-slate-200 break-words ${cellPad}`}>{row.section}</td>
                                            <td className={`border border-slate-200 break-words ${cellPad}`}>{row.campus}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                ))}
            </div>

            <footer className="mt-4 border-t border-slate-100 pt-2 text-right font-serif text-[9px] text-slate-400">
                {layout.label} (landscape) · Grouped by comlab
            </footer>
        </article>
    );
}

export function SchedulePrintModal({ open, onOpenChange, schedules, comlabs, meta, organizationName }: SchedulePrintModalProps) {
    const [exporting, setExporting] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [paperFormat, setPaperFormat] = useState<SchedulePaperFormat>('a4');
    const [layoutMode, setLayoutMode] = useState<SchedulePrintLayoutMode>('grid');

    const printMeta = useMemo<SchedulePrintMeta>(
        () => ({
            ...meta,
            organizationName: organizationName ?? meta.organizationName,
            paperFormat,
        }),
        [meta, organizationName, paperFormat],
    );

    const printableSections = useMemo(
        () => buildPrintableScheduleSections(schedules, comlabs),
        [schedules, comlabs],
    );

    const gridModel = useMemo(() => buildScheduleGridPrintModel(schedules, comlabs), [schedules, comlabs]);
    const paperLayout = useMemo(() => getSchedulePaperLayout(paperFormat), [paperFormat]);
    const gridSlotColumns = useMemo(() => countGridMaxSlotColumns(gridModel), [gridModel]);
    const gridPreviewMinWidth = useMemo(
        () => gridPreviewMinWidthPx(gridSlotColumns, paperLayout),
        [gridSlotColumns, paperLayout],
    );

    const gridPreviewHtml = useMemo(
        () => (gridModel.sections.length > 0 ? buildScheduleGridPrintHtml(gridModel, printMeta) : ''),
        [gridModel, printMeta],
    );

    const listRowCount = countPrintableScheduleRows(printableSections);
    const gridHasSections = gridModel.sections.length > 0;
    const gridHasFilledCells = gridModelHasFilledCells(gridModel);
    const canExport = layoutMode === 'grid' ? gridHasSections : listRowCount > 0;

    const handleExportPdf = async () => {
        setExporting(true);
        try {
            if (layoutMode === 'grid') {
                const result = await exportScheduleGridPdf(gridModel, printMeta);
                if (!result.ok) {
                    toast.error(result.error);
                } else {
                    toast.success('PDF downloaded');
                }
            } else {
                exportSchedulePdf(printableSections, printMeta);
                toast.success('PDF downloaded');
            }
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('[handleExportPdf]', error);
            }
            toast.error('Failed to generate PDF.');
        } finally {
            setExporting(false);
        }
    };

    const handlePrint = async () => {
        setPrinting(true);
        try {
            if (layoutMode === 'grid') {
                const result = await printScheduleGridDocument(gridModel, printMeta);
                if (!result.ok) {
                    toast.error(result.error);
                }
            } else {
                const result = await printScheduleDocument(printableSections, printMeta);
                if (!result.ok) {
                    toast.error(result.error);
                }
            }
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('[handlePrint]', error);
            }
            toast.error('Failed to open print dialog.');
        } finally {
            setPrinting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[min(96vh,calc(100dvh-0.75rem))] w-[calc(100vw-1rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
                <DialogHeader className="shrink-0 border-b border-border/60 px-6 pb-4 pt-6 pr-12">
                    <DialogTitle className="font-serif">Print schedule</DialogTitle>
                    <DialogDescription>
                        Preview the class timetable grid (each day as a separate column) or a legacy list by comlab.
                        Choose paper size, then print or download a PDF.
                    </DialogDescription>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="print_layout" className="font-serif text-sm">
                                Layout
                            </Label>
                            <Select value={layoutMode} onValueChange={(v) => setLayoutMode(v as SchedulePrintLayoutMode)}>
                                <SelectTrigger id="print_layout" className="font-serif">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="grid" className="font-serif">
                                        Timetable grid (recommended)
                                    </SelectItem>
                                    <SelectItem value="list" className="font-serif">
                                        List by comlab (legacy)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="paper_format" className="font-serif text-sm">
                                Paper format
                            </Label>
                            <Select value={paperFormat} onValueChange={(v) => setPaperFormat(v as SchedulePaperFormat)}>
                                <SelectTrigger id="paper_format" className="font-serif">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SCHEDULE_PAPER_FORMAT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value} className="font-serif">
                                            {opt.label} — {opt.description}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </DialogHeader>

                <div className={`min-h-0 flex-1 bg-muted/40 px-3 py-5 sm:px-6 ${scrollHide}`}>
                    {layoutMode === 'grid' ? (
                        gridHasSections ? (
                            <div className="space-y-2">
                                {!gridHasFilledCells ? (
                                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center font-serif text-sm text-amber-900">
                                        {GRID_EMPTY_SLOTS_HINT}
                                    </p>
                                ) : null}
                                <ScheduleGridPrintPreview
                                    html={gridPreviewHtml}
                                    minWidthPx={gridPreviewMinWidth}
                                    layout={paperLayout}
                                />
                            </div>
                        ) : (
                            <p className="py-12 text-center font-serif text-sm text-muted-foreground">
                                No schedules to display in the grid.
                            </p>
                        )
                    ) : (
                        <ScheduleListPrintPaper sections={printableSections} meta={printMeta} paperFormat={paperFormat} />
                    )}
                </div>

                <DialogFooter className="shrink-0 flex flex-col gap-2 border-t border-border/60 bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-serif text-xs text-muted-foreground">
                        Export: {paperLayout.label}, landscape
                        {layoutMode === 'grid' ? ', timetable grid (by day)' : ', grouped by comlab'}
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="outline" className="font-serif" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            className="font-serif"
                            onClick={() => void handlePrint()}
                            disabled={!canExport || printing}
                        >
                            <Printer className="mr-2 size-4" aria-hidden />
                            {printing ? 'Preparing…' : 'Print'}
                        </Button>
                        <Button
                            type="button"
                            className="font-serif"
                            onClick={() => void handleExportPdf()}
                            disabled={!canExport || exporting}
                        >
                            <FileDown className="mr-2 size-4" aria-hidden />
                            {exporting ? 'Generating…' : 'Generate PDF'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
