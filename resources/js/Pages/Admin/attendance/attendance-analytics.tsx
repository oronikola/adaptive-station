import '../../../../css/attendance-analytics.css';

export interface AttendanceAnalyticsData {
    recorded_days: number;
    average_taps: number;
    busiest_day: { date: string; total: number } | null;
    granularity: 'day' | 'month' | 'year';
    date_from: string | null;
    date_to: string | null;
    trend: { date: string; total: number; unique_people: number; in: number; out: number }[];
    stations: { id: string; name: string; total: number }[];
}

function dateLabel(value: string, granularity: AttendanceAnalyticsData['granularity'] = 'day'): string {
    return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
        timeZone: 'UTC', year: 'numeric',
        ...(granularity !== 'year' ? { month: 'short' as const } : {}),
        ...(granularity === 'day' ? { day: 'numeric' as const } : {}),
    });
}

export default function AttendanceAnalytics({ analytics, totalTaps, isUpdating }: {
    analytics: AttendanceAnalyticsData;
    totalTaps: number;
    isUpdating: boolean;
}) {
    const maxTaps = Math.max(1, ...analytics.trend.map((period) => period.total));
    const periodLabel = { day: 'Daily', month: 'Monthly', year: 'Yearly' }[analytics.granularity];

    return (
        <section className="attendance-analytics" aria-labelledby="attendance-analytics-title" aria-busy={isUpdating}>
            <div className="attendance-analytics-heading">
                <div>
                    <h2 id="attendance-analytics-title">Attendance analytics</h2>
                    <p>All records matching the applied filters, across every page.</p>
                </div>
                {isUpdating && <span role="status">Updating analytics…</span>}
            </div>
            {analytics.recorded_days === 0 ? (
                <div className="pf-panel attendance-analytics-empty"><strong>No matching attendance yet</strong><p>Try a wider date range or adjust the filters to see attendance patterns.</p></div>
            ) : (
                <>
                    <dl className="attendance-insights">
                        <div><dt>Days with records</dt><dd>{analytics.recorded_days.toLocaleString()}</dd><span>Dates with at least one matching tap</span></div>
                        <div><dt>Average taps per recorded day</dt><dd>{analytics.average_taps.toLocaleString(undefined, { maximumFractionDigits: 1 })}</dd><span>Excludes dates without matching taps</span></div>
                        <div><dt>Busiest day</dt><dd className="attendance-insight-date">{analytics.busiest_day ? dateLabel(analytics.busiest_day.date) : '—'}</dd><span>{analytics.busiest_day?.total.toLocaleString()} taps · latest date if tied</span></div>
                    </dl>
                    <div className="attendance-analytics-grid">
                        <div className="pf-panel">
                            <div className="pf-panel-header">
                                <div><h3 className="pf-panel-title">{periodLabel} attendance trend</h3><p className="pf-panel-count">Recorded range: {analytics.date_from && dateLabel(analytics.date_from)} – {analytics.date_to && dateLabel(analytics.date_to)}</p></div>
                                <div className="attendance-trend-legend" aria-label="Chart legend"><span><i className="attendance-swatch-in" />IN</span><span><i className="attendance-swatch-out" />OUT</span></div>
                            </div>
                            <div className="attendance-chart-scroll" tabIndex={0} role="region" aria-label="Attendance chart. Scroll horizontally for more dates; exact values are available below.">
                                <div className="attendance-trend" style={{ minWidth: `${analytics.trend.length * 54}px`, gridTemplateColumns: `repeat(${analytics.trend.length}, minmax(0, 1fr))` }} role="img" aria-label={`${periodLabel} IN and OUT attendance taps. ${totalTaps.toLocaleString()} matching taps in total. Expand exact totals below for all values.`}>
                                    {analytics.trend.map((period) => (
                                        <div className="attendance-trend-column" key={period.date} aria-hidden="true" title={`${dateLabel(period.date, analytics.granularity)}: ${period.in} IN, ${period.out} OUT, ${period.unique_people} unique people`}>
                                            <span className="attendance-trend-value">{period.total.toLocaleString()}</span>
                                            <div className="attendance-trend-track">
                                                <div className="attendance-trend-stack" style={{ height: `${period.total / maxTaps * 100}%` }}>
                                                    <div className="attendance-trend-out" style={{ flex: period.out }} />
                                                    <div className="attendance-trend-in" style={{ flex: period.in }} />
                                                </div>
                                            </div>
                                            <span className="attendance-trend-label">{analytics.granularity === 'day' ? new Date(`${period.date}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric' }) : dateLabel(period.date, analytics.granularity)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <details className="attendance-trend-details">
                                <summary>View exact {analytics.granularity === 'day' ? 'daily' : analytics.granularity === 'month' ? 'monthly' : 'yearly'} totals</summary>
                                <div className="pf-table-wrap"><table className="pf-table">
                                    <caption className="sr-only">Attendance totals for each period in the chart</caption>
                                    <thead><tr><th scope="col">Period</th><th scope="col">IN</th><th scope="col">OUT</th><th scope="col">Total</th><th scope="col">Unique people</th></tr></thead>
                                    <tbody>{analytics.trend.map((period) => <tr key={period.date}><th scope="row">{dateLabel(period.date, analytics.granularity)}</th><td>{period.in.toLocaleString()}</td><td>{period.out.toLocaleString()}</td><td>{period.total.toLocaleString()}</td><td>{period.unique_people.toLocaleString()}</td></tr>)}</tbody>
                                </table></div>
                            </details>
                        </div>
                        <div className="pf-panel">
                            <div className="pf-panel-header"><div><h3 className="pf-panel-title">Attendance by station</h3><p className="pf-panel-count">Top 5 stations · share of all matching taps</p></div></div>
                            <ol className="attendance-station-ranks">
                                {analytics.stations.map((station) => <li key={station.id}>
                                    <div className="attendance-station-heading"><span>{station.name}</span><strong>{station.total.toLocaleString()}</strong></div>
                                    <div className="attendance-station-track" aria-hidden="true"><div style={{ width: `${station.total / Math.max(1, totalTaps) * 100}%` }} /></div>
                                    <span className="attendance-station-share">{(totalTaps > 0 ? station.total / totalTaps * 100 : 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}% of matching taps</span>
                                </li>)}
                            </ol>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
