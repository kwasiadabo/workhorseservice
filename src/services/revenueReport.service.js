const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

const getPeriod = (query) => {
  const now = new Date();
  const endInput = query.endDate ? new Date(query.endDate) : now;
  const endDate = new Date(Date.UTC(endInput.getUTCFullYear(), endInput.getUTCMonth(), endInput.getUTCDate()));
  const exclusiveEnd = new Date(endDate);
  exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
  const startInput = query.startDate
    ? new Date(query.startDate)
    : new Date(exclusiveEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = new Date(Date.UTC(startInput.getUTCFullYear(), startInput.getUTCMonth(), startInput.getUTCDate()));
  return { startDate, endDate, exclusiveEnd };
};

// MSSQL expression that truncates paidAt to the granularity bucket key (ISO string).
// daily   → 'YYYY-MM-DD'
// weekly  → 'YYYY-MM-DD' of the Monday of that ISO week
// monthly → 'YYYY-MM'
// yearly  → 'YYYY'
const periodExpr = (granularity, col = 'p.[paidAt]') => {
  switch (granularity) {
    case 'weekly':
      // Subtract (weekday + 5) % 7 days to land on Monday.
      // DATEPART(weekday, d): Sun=1 Mon=2 … Sat=7 (@@DATEFIRST=7)
      return `CONVERT(VARCHAR(10), DATEADD(day, -((DATEPART(weekday, ${col}) + 5) % 7), CAST(${col} AS DATE)), 23)`;
    case 'monthly':
      return `CONVERT(VARCHAR(7), ${col}, 23)`; // 'YYYY-MM'
    case 'yearly':
      return `CAST(YEAR(${col}) AS VARCHAR(4))`; // 'YYYY'
    default: // 'daily'
      return `CONVERT(VARCHAR(10), ${col}, 23)`; // 'YYYY-MM-DD'
  }
};

// Zero-fill: return an ordered list of all period keys between start and end.
const generatePeriodKeys = (startDate, endDate, granularity) => {
  const keys = [];
  const cur = new Date(startDate);

  if (granularity === 'daily') {
    while (cur <= endDate) {
      keys.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  } else if (granularity === 'weekly') {
    // Align to the Monday on or before startDate.
    const dow = (cur.getUTCDay() + 6) % 7; // 0=Mon … 6=Sun
    cur.setUTCDate(cur.getUTCDate() - dow);
    while (cur <= endDate) {
      keys.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 7);
    }
  } else if (granularity === 'monthly') {
    cur.setUTCDate(1);
    while (cur <= endDate) {
      keys.push(`${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}`);
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
  } else {
    // yearly
    while (cur.getUTCFullYear() <= endDate.getUTCFullYear()) {
      keys.push(String(cur.getUTCFullYear()));
      cur.setUTCFullYear(cur.getUTCFullYear() + 1);
    }
  }
  return keys;
};

// Human-readable label for a period key.
const labelForKey = (key, granularity) => {
  switch (granularity) {
    case 'daily': {
      const [y, m, d] = key.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      });
    }
    case 'weekly': {
      const [y, m, d] = key.split('-').map(Number);
      return `w/c ${new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
    }
    case 'monthly': {
      const [y, m] = key.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    }
    case 'yearly':
      return key;
    default:
      return key;
  }
};

const getRevenueReport = async (tenantId, query) => {
  const { startDate, endDate, exclusiveEnd } = getPeriod(query);
  const granularity = query.granularity || 'daily';
  const { branchId } = query;

  const periodKeys = generatePeriodKeys(startDate, endDate, granularity);
  const zeroMap = () => new Map(periodKeys.map((k) => [k, { period: k, label: labelForKey(k, granularity), total: 0, count: 0 }]));

  const branchClause = branchId ? `AND bk.[branchId] = :branchId` : '';

  // -- overall time-series --
  const seriesRows = await sequelize.query(
    `SELECT ${periodExpr(granularity)} AS period,
            SUM(p.[amount]) AS total,
            COUNT(p.[id]) AS cnt
     FROM [Payments] p
     JOIN [Bookings] bk ON p.[bookingId] = bk.[id]
     WHERE p.[tenantId] = :tenantId
       AND p.[status] = 'completed'
       AND p.[paidAt] >= :startDate
       AND p.[paidAt] <  :exclusiveEnd
       ${branchClause}
     GROUP BY ${periodExpr(granularity)}
     ORDER BY period`,
    {
      replacements: { tenantId, startDate, exclusiveEnd, branchId: branchId || null },
      type: QueryTypes.SELECT,
    }
  );

  const seriesMap = zeroMap();
  seriesRows.forEach((row) => {
    const entry = seriesMap.get(row.period);
    if (entry) {
      entry.total = Number(row.total);
      entry.count = Number(row.cnt);
    }
  });
  const timeSeries = [...seriesMap.values()];

  const totalRevenue = timeSeries.reduce((s, r) => s + r.total, 0);
  const txCount = timeSeries.reduce((s, r) => s + r.count, 0);

  // -- by branch time-series (only when not already filtered to one branch) --
  let byBranch = [];
  if (!branchId) {
    const branchSeriesRows = await sequelize.query(
      `SELECT bk.[branchId],
              b.[name] AS branchName,
              ${periodExpr(granularity)} AS period,
              SUM(p.[amount]) AS total,
              COUNT(p.[id]) AS cnt
       FROM [Payments] p
       JOIN [Bookings] bk ON p.[bookingId] = bk.[id]
       JOIN [Branches] b  ON bk.[branchId] = b.[id]
       WHERE p.[tenantId] = :tenantId
         AND p.[status] = 'completed'
         AND p.[paidAt] >= :startDate
         AND p.[paidAt] <  :exclusiveEnd
       GROUP BY bk.[branchId], b.[name], ${periodExpr(granularity)}
       ORDER BY branchName, period`,
      {
        replacements: { tenantId, startDate, exclusiveEnd },
        type: QueryTypes.SELECT,
      }
    );

    const branchMap = new Map();
    branchSeriesRows.forEach((row) => {
      if (!branchMap.has(row.branchId)) {
        branchMap.set(row.branchId, {
          branchId: row.branchId,
          branchName: row.branchName,
          total: 0,
          count: 0,
          seriesMap: zeroMap(),
        });
      }
      const b = branchMap.get(row.branchId);
      b.total += Number(row.total);
      b.count += Number(row.cnt);
      const entry = b.seriesMap.get(row.period);
      if (entry) {
        entry.total = Number(row.total);
        entry.count = Number(row.cnt);
      }
    });

    byBranch = [...branchMap.values()]
      .sort((a, b) => b.total - a.total)
      .map(({ seriesMap: sm, ...rest }) => ({ ...rest, timeSeries: [...sm.values()] }));
  }

  // -- by payment method --
  const methodRows = await sequelize.query(
    `SELECT p.[method],
            SUM(p.[amount]) AS total,
            COUNT(p.[id]) AS cnt
     FROM [Payments] p
     JOIN [Bookings] bk ON p.[bookingId] = bk.[id]
     WHERE p.[tenantId] = :tenantId
       AND p.[status] = 'completed'
       AND p.[paidAt] >= :startDate
       AND p.[paidAt] <  :exclusiveEnd
       ${branchClause}
     GROUP BY p.[method]
     ORDER BY total DESC`,
    {
      replacements: { tenantId, startDate, exclusiveEnd, branchId: branchId || null },
      type: QueryTypes.SELECT,
    }
  );
  const byMethod = methodRows.map((r) => ({ method: r.method, total: Number(r.total), count: Number(r.cnt) }));

  return {
    period: { startDate, endDate, granularity },
    summary: {
      totalRevenue,
      txCount,
      avgPayment: txCount > 0 ? totalRevenue / txCount : 0,
    },
    timeSeries,
    byBranch,
    byMethod,
  };
};

module.exports = { getRevenueReport };
