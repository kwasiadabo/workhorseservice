const { Payment } = require('../models');

// Sum of all `completed` payments recorded against a booking — the amount
// that counts toward `totalAmount` when deciding if a booking is fully paid.
const getTotalPaid = async (bookingId, transaction) => {
  const payments = await Payment.findAll({ where: { bookingId, status: 'completed' }, transaction });
  return payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
};

module.exports = { getTotalPaid };
