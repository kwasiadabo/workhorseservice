const { Op, fn, col, literal } = require('sequelize');
const { BankTransaction, BankAccount, Bank } = require('../models');
const { withTenantScope } = require('../utils/tenantScope');
const sequelize = require('../config/database');

const getReport = async (tenantId, { startDate, endDate, bankAccountId }) => {
  const txWhere = withTenantScope(tenantId, {
    transactionDate: { [Op.between]: [startDate, endDate] },
  });
  if (bankAccountId) txWhere.bankAccountId = bankAccountId;

  // Totals summary
  const [deposits, withdrawals] = await Promise.all([
    BankTransaction.sum('amount', { where: { ...txWhere, type: 'deposit' } }),
    BankTransaction.sum('amount', { where: { ...txWhere, type: 'withdrawal' } }),
  ]);

  const totalDeposits = Number(deposits ?? 0);
  const totalWithdrawals = Number(withdrawals ?? 0);

  // Aggregate totals per account+type — raw:true avoids MSSQL GROUP BY issues
  // with non-aggregated columns from nested includes.
  const txTotals = await BankTransaction.findAll({
    where: txWhere,
    attributes: [
      'bankAccountId',
      'type',
      [fn('SUM', col('amount')), 'total'],
      [fn('COUNT', col('BankTransaction.id')), 'count'],
    ],
    group: ['bankAccountId', 'type'],
    raw: true,
  });

  // All accounts for the tenant — includes zero-transaction accounts and
  // supplies the display fields (name, bank, currency, opening balance).
  const allAccounts = await BankAccount.findAll({
    where: withTenantScope(tenantId, bankAccountId ? { id: bankAccountId } : {}),
    include: [{ model: Bank, attributes: ['name', 'shortCode'] }],
  });

  const accountMap = {};
  for (const acc of allAccounts) {
    accountMap[acc.id] = {
      bankAccountId: acc.id,
      accountName: acc.accountName,
      accountNumber: acc.accountNumber,
      currency: acc.currency,
      bankName: acc.Bank?.name,
      bankShortCode: acc.Bank?.shortCode,
      openingBalance: Number(acc.openingBalance ?? 0),
      periodDeposits: 0,
      periodWithdrawals: 0,
      depositCount: 0,
      withdrawalCount: 0,
    };
  }

  for (const row of txTotals) {
    const entry = accountMap[row.bankAccountId];
    if (!entry) continue;
    const total = Number(row.total ?? 0);
    const count = Number(row.count ?? 0);
    if (row.type === 'deposit') {
      entry.periodDeposits = total;
      entry.depositCount = count;
    } else {
      entry.periodWithdrawals = total;
      entry.withdrawalCount = count;
    }
  }

  // Compute all-time balance (from inception to endDate) for reconciliation
  const allTimeWhere = withTenantScope(tenantId, {
    transactionDate: { [Op.lte]: endDate },
  });
  if (bankAccountId) allTimeWhere.bankAccountId = bankAccountId;

  const allTimeRows = await BankTransaction.findAll({
    where: allTimeWhere,
    attributes: [
      'bankAccountId',
      'type',
      [fn('SUM', col('amount')), 'total'],
    ],
    group: ['bankAccountId', 'type'],
    raw: true,
  });

  const allTimeMap = {};
  for (const row of allTimeRows) {
    if (!allTimeMap[row.bankAccountId]) allTimeMap[row.bankAccountId] = { deposits: 0, withdrawals: 0 };
    if (row.type === 'deposit') allTimeMap[row.bankAccountId].deposits = Number(row.total ?? 0);
    else allTimeMap[row.bankAccountId].withdrawals = Number(row.total ?? 0);
  }

  const reconciliation = Object.values(accountMap).map((acc) => {
    const allTime = allTimeMap[acc.bankAccountId] ?? { deposits: 0, withdrawals: 0 };
    const currentBalance = acc.openingBalance + allTime.deposits - allTime.withdrawals;
    return { ...acc, currentBalance };
  });

  // Monthly trend (last 6 months ending at endDate)
  const trendRows = await BankTransaction.findAll({
    where: withTenantScope(tenantId, {
      transactionDate: { [Op.between]: [startDate, endDate] },
      ...(bankAccountId ? { bankAccountId } : {}),
    }),
    attributes: [
      [fn('FORMAT', col('transactionDate'), 'yyyy-MM'), 'month'],
      'type',
      [fn('SUM', col('amount')), 'total'],
      [fn('COUNT', col('BankTransaction.id')), 'count'],
    ],
    group: [literal("FORMAT(transactionDate, 'yyyy-MM')"), 'type'],
    order: [[literal("FORMAT(transactionDate, 'yyyy-MM')"), 'ASC']],
    raw: true,
  });

  const trendMap = {};
  for (const row of trendRows) {
    const month = row.month;
    if (!trendMap[month]) trendMap[month] = { month, deposits: 0, withdrawals: 0, depositCount: 0, withdrawalCount: 0 };
    if (row.type === 'deposit') {
      trendMap[month].deposits = Number(row.total ?? 0);
      trendMap[month].depositCount = Number(row.count ?? 0);
    } else {
      trendMap[month].withdrawals = Number(row.total ?? 0);
      trendMap[month].withdrawalCount = Number(row.count ?? 0);
    }
  }
  const trend = Object.values(trendMap).sort((a, b) => a.month.localeCompare(b.month));

  return {
    period: { startDate, endDate },
    summary: {
      totalDeposits,
      totalWithdrawals,
      netMovement: totalDeposits - totalWithdrawals,
    },
    reconciliation,
    trend,
  };
};

module.exports = { getReport };
