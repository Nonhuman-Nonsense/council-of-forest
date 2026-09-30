import type { Express, Request, Response } from "express";
import { z } from "zod";
import { sendReport, type ErrorReport } from "@utils/errorbot.js";

export const ClientReportBody = z.object({
    message: z.string().min(1).max(2000),
    source: z.string().min(1).max(200),
    meetingId: z.number().int().positive().optional(),
    url: z.string().max(500).optional(),
    cause: z.unknown().optional(),
    severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
    clientImpact: z.enum(['none', 'notified', 'terminal', 'process_exit']).optional(),
    // Optional so reports from older cached bundles still validate.
    interacted: z.boolean().optional(),
    webdriver: z.boolean().optional(),
    // Diagnostic only: a malformed value is dropped rather than costing us the report.
    network: z.object({
        online: z.boolean(),
        effectiveType: z.string().max(16).optional(),
        rttMs: z.number().nonnegative().optional(),
        downlinkMbps: z.number().nonnegative().optional(),
    }).optional().catch(undefined),
});

export type ClientReportInput = z.infer<typeof ClientReportBody>;

const MAX_USER_AGENT_LENGTH = 200;

/** `[net 3g rtt=450ms 1.5Mbps]` — whatever the browser could tell us. */
function describeNetwork(network: NonNullable<ClientReportInput['network']>): string | null {
    const parts = [
        network.effectiveType,
        network.rttMs !== undefined ? `rtt=${network.rttMs}ms` : undefined,
        network.downlinkMbps !== undefined ? `${network.downlinkMbps}Mbps` : undefined,
    ].filter((part): part is string => part !== undefined);
    return parts.length > 0 ? `[net ${parts.join(' ')}]` : null;
}

/**
 * A second line telling a visitor from a crawler, and a bad network from a
 * fault of ours: bots run our JavaScript but never interact, headless browsers
 * announce themselves via webdriver, and the browser knows when it is offline.
 */
function describeClient(input: ClientReportInput, userAgent: string | undefined): string {
    const tags: string[] = [];
    if (input.interacted === false) tags.push('[no-interaction]');
    if (input.webdriver) tags.push('[webdriver]');
    if (input.network?.online === false) tags.push('[offline]');
    const network = input.network ? describeNetwork(input.network) : null;
    if (network) tags.push(network);
    tags.push(`UA: ${userAgent ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : 'unknown'}`);
    return tags.join(' ');
}

/** Builds the errorbot report for a validated client report body, applying defaults. */
export function buildClientErrorReport(input: ClientReportInput, userAgent?: string): ErrorReport {
    const { message, source, meetingId, url, cause, severity, clientImpact } = input;
    const context = `client ${source}`;
    const detail = `${url ? `${message} (${url})` : message}\n${describeClient(input, userAgent)}`;
    const impact = clientImpact ?? 'terminal';
    // Recoverable reports (a realtime agent reconnecting, say) also come
    // through here; labelling those TERMINAL would misread at a glance.
    const prefix = impact === 'terminal' || impact === 'process_exit'
        ? '[CLIENT TERMINAL]'
        : '[CLIENT]';

    return {
        context,
        severity: severity ?? 'critical',
        message: `${prefix} ${detail}`,
        error: cause,
        clientImpact: impact,
        source: 'client',
        meetingId,
    };
}

/**
 * Ingest for client-side terminal failures (ErrorBoundary crashes, fatal socket/API
 * errors, window.onerror/unhandledrejection) — relays them to the errorbot.
 */
export function registerClientReportRoutes(app: Express): void {
    app.post('/api/client-report', async (req: Request, res: Response) => {
        const parsed = ClientReportBody.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: 'Invalid client report' });
            return;
        }

        res.status(204).end();

        await sendReport(buildClientErrorReport(parsed.data, req.get('user-agent')));
    });
}
