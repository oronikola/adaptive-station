<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>SMS Delivery Log — {{ $filters['phone_number'] }}</title>
    <style>
        :root {
            color-scheme: light;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 32px;
            background: #f1f5f9;
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 13px;
        }

        .toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            max-width: 900px;
            margin: 0 auto 16px;
        }

        .toolbar p {
            margin: 0;
            color: #475569;
            font-size: 13px;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 18px;
            border: none;
            border-radius: 10px;
            background: #1e293b;
            color: #fff;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
        }

        .btn:hover {
            background: #0f172a;
        }

        .sheet {
            max-width: 900px;
            margin: 0 auto;
            padding: 40px;
            border-radius: 16px;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
        }

        .report-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            padding-bottom: 20px;
            margin-bottom: 8px;
            border-bottom: 2px solid #0f172a;
        }

        .report-header h1 {
            margin: 0 0 4px;
            font-size: 20px;
        }

        .report-header p {
            margin: 0;
            color: #475569;
        }

        .report-meta {
            text-align: right;
            font-size: 12px;
            color: #475569;
        }

        .summary-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 16px 0 24px;
        }

        .summary-chip {
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 8px 14px;
            border-radius: 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            min-width: 84px;
        }

        .summary-chip span.label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            color: #64748b;
            font-weight: 700;
        }

        .summary-chip span.value {
            font-size: 18px;
            font-weight: 800;
        }

        .date-heading {
            margin: 22px 0 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #cbd5e1;
            font-size: 13px;
            font-weight: 800;
            color: #1e293b;
        }

        .date-heading:first-of-type {
            margin-top: 0;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            padding: 7px 10px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12.5px;
            vertical-align: top;
        }

        th {
            text-transform: uppercase;
            letter-spacing: 0.03em;
            font-size: 10px;
            color: #64748b;
        }

        tbody tr:nth-child(even) {
            background: #f8fafc;
        }

        .time-cell {
            white-space: nowrap;
            font-variant-numeric: tabular-nums;
        }

        .pill {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
        }

        .pill--good    { background: #e3f6ea; color: #1a8a4c; }
        .pill--neutral { background: #eef1f6; color: #475569; }
        .pill--bad     { background: #fef2f2; color: #dc2626; }
        .pill--in      { background: #e3f6ea; color: #1a8a4c; }
        .pill--out     { background: #fdf1e0; color: #92400e; }

        .empty {
            padding: 40px 0;
            text-align: center;
            color: #64748b;
        }

        .error-text {
            color: #dc2626;
        }

        .muted {
            color: #94a3b8;
        }

        @media print {
            body {
                padding: 0;
                background: #ffffff;
            }

            .toolbar {
                display: none;
            }

            .sheet {
                box-shadow: none;
                border-radius: 0;
                max-width: none;
                padding: 0;
            }

            .date-heading {
                break-after: avoid;
            }

            tr {
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <p>Preview this report, then print or save it as a PDF from your browser's print dialog.</p>
        <button type="button" class="btn" onclick="window.print()">
            Print / Save as PDF
        </button>
    </div>

    <div class="sheet">
        <div class="report-header">
            <div>
                <h1>SMS Delivery Log</h1>
                <p>{{ $tenant?->name ?? 'School' }}</p>
                <p>Phone number: <strong>{{ $filters['phone_number'] }}</strong></p>
            </div>
            <div class="report-meta">
                @if ($filters['date_from'] ?? null)
                    <p>From: {{ \Illuminate\Support\Carbon::parse($filters['date_from'])->toFormattedDateString() }}</p>
                @endif
                @if ($filters['date_to'] ?? null)
                    <p>To: {{ \Illuminate\Support\Carbon::parse($filters['date_to'])->toFormattedDateString() }}</p>
                @endif
                <p>Generated {{ now()->format('M j, Y g:i A') }}</p>
            </div>
        </div>

        <div class="summary-bar">
            <div class="summary-chip">
                <span class="label">Total</span>
                <span class="value">{{ $totalCount }}</span>
            </div>
            <div class="summary-chip">
                <span class="label">Tapped In</span>
                <span class="value">{{ $directionCounts['IN'] ?? 0 }}</span>
            </div>
            <div class="summary-chip">
                <span class="label">Tapped Out</span>
                <span class="value">{{ $directionCounts['OUT'] ?? 0 }}</span>
            </div>
        </div>

        @if ($totalCount === 0)
            <p class="empty">No messages found for this number{{ ($filters['date_from'] ?? null) || ($filters['date_to'] ?? null) ? ' in this date range' : '' }}.</p>
        @else
            @foreach ($messagesByDate as $date => $dayMessages)
                <p class="date-heading">{{ \Illuminate\Support\Carbon::parse($date)->format('l, F j, Y') }}</p>

                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Direction</th>
                            <th>Student</th>
                            <th>Station</th>
                            <th>Status</th>
                            <th>Sent</th>
                            <th>Delivered</th>
                            <th>Error</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($dayMessages as $message)
                            <tr>
                                <td class="time-cell">{{ $message->created_at->format('g:i A') }}</td>
                                <td>
                                    @if ($message->parsed['direction'] === 'IN')
                                        <span class="pill pill--in">Tapped In</span>
                                    @elseif ($message->parsed['direction'] === 'OUT')
                                        <span class="pill pill--out">Tapped Out</span>
                                    @else
                                        <span class="muted">—</span>
                                    @endif
                                </td>
                                <td>{{ $message->parsed['student'] ?? '—' }}</td>
                                <td>{{ $message->parsed['station'] ?? '—' }}</td>
                                <td>
                                    @php
                                        $pillClass = match ($message->status->value) {
                                            'sent', 'delivered' => 'pill--good',
                                            'failed', 'expired' => 'pill--bad',
                                            default => 'pill--neutral',
                                        };
                                    @endphp
                                    <span class="pill {{ $pillClass }}">{{ $message->status->value }}</span>
                                </td>
                                <td class="time-cell">{{ $message->sent_at?->format('g:i A') ?? '—' }}</td>
                                <td class="time-cell">{{ $message->delivered_at?->format('g:i A') ?? '—' }}</td>
                                <td class="{{ $message->last_error ? 'error-text' : '' }}">{{ $message->last_error ?? '—' }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endforeach
        @endif
    </div>
</body>
</html>
