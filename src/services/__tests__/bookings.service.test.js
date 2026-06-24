jest.mock('../../models', () => ({
  Branch: { count: jest.fn() },
  Service: { count: jest.fn() },
  Employee: { count: jest.fn() },
  BookingAssignment: { update: jest.fn(), findOne: jest.fn() },
  BookingService: { findAll: jest.fn() },
  Booking: { update: jest.fn() },
}));

const { Op } = require('sequelize');
const { Branch, Service, Employee, BookingAssignment, BookingService, Booking } = require('../../models');
const {
  assertBookable,
  recalculateTotal,
  promoteTeamLead,
  reassignLeadIfVacant,
  computeStatusStamps,
} = require('../bookings.service');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('assertBookable', () => {
  it('resolves without error when branches, services and employees all exist', async () => {
    Branch.count.mockResolvedValue(1);
    Service.count.mockResolvedValue(1);
    Employee.count.mockResolvedValue(1);
    await expect(assertBookable('tenant-1')).resolves.toBeUndefined();
  });

  it('rejects naming every missing resource, not just the first one found', async () => {
    Branch.count.mockResolvedValue(0);
    Service.count.mockResolvedValue(0);
    Employee.count.mockResolvedValue(1);
    await expect(assertBookable('tenant-1')).rejects.toThrow(/Branches, Services/);
  });

  it('rejects with just the one missing resource when only Workers are missing', async () => {
    Branch.count.mockResolvedValue(1);
    Service.count.mockResolvedValue(1);
    Employee.count.mockResolvedValue(0);
    await expect(assertBookable('tenant-1')).rejects.toThrow(/missing: Workers$/);
  });
});

describe('recalculateTotal', () => {
  it('sums priceAtBooking * quantity across every line item and persists it', async () => {
    BookingService.findAll.mockResolvedValue([
      { priceAtBooking: '50.00', quantity: 2 },
      { priceAtBooking: '30', quantity: 1 },
    ]);

    await recalculateTotal('booking-1', 'txn');

    expect(Booking.update).toHaveBeenCalledWith(
      { totalAmount: 130 },
      { where: { id: 'booking-1' }, transaction: 'txn' }
    );
  });

  it('persists zero when a booking has no line items left', async () => {
    BookingService.findAll.mockResolvedValue([]);
    await recalculateTotal('booking-1', 'txn');
    expect(Booking.update).toHaveBeenCalledWith({ totalAmount: 0 }, expect.anything());
  });
});

describe('promoteTeamLead', () => {
  it('demotes every other assignment on the booking before promoting the new one', async () => {
    await promoteTeamLead('booking-1', 'assignment-2', 'txn');

    expect(BookingAssignment.update).toHaveBeenNthCalledWith(
      1,
      { isTeamLead: false },
      { where: { bookingId: 'booking-1', isTeamLead: true, id: { [Op.ne]: 'assignment-2' } }, transaction: 'txn' }
    );
    expect(BookingAssignment.update).toHaveBeenNthCalledWith(
      2,
      { isTeamLead: true },
      { where: { id: 'assignment-2' }, transaction: 'txn' }
    );
  });
});

describe('reassignLeadIfVacant', () => {
  it('does nothing if the booking already has a team lead', async () => {
    BookingAssignment.findOne.mockResolvedValueOnce({ id: 'existing-lead' });

    await reassignLeadIfVacant('booking-1', 'txn');

    expect(BookingAssignment.update).not.toHaveBeenCalled();
  });

  it('promotes the earliest active assignment when leadership is vacant', async () => {
    BookingAssignment.findOne
      .mockResolvedValueOnce(null) // no existing lead
      .mockResolvedValueOnce({ id: 'earliest-active' }); // candidate

    await reassignLeadIfVacant('booking-1', 'txn');

    expect(BookingAssignment.update).toHaveBeenCalledWith(
      { isTeamLead: true },
      { where: { id: 'earliest-active' }, transaction: 'txn' }
    );
  });

  it('leaves the booking without a lead if there are no active assignments to promote', async () => {
    BookingAssignment.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await reassignLeadIfVacant('booking-1', 'txn');

    expect(BookingAssignment.update).not.toHaveBeenCalled();
  });
});

describe('computeStatusStamps', () => {
  it('stamps startedAt the first time a booking moves to in_progress', () => {
    const booking = { startedAt: null, completedAt: null, scheduledAt: new Date('2026-01-01T10:00:00Z') };
    const stamps = computeStatusStamps(booking, { status: 'in_progress' });
    expect(stamps.startedAt).toBeInstanceOf(Date);
    expect(stamps.completedAt).toBeUndefined();
  });

  it('backfills startedAt from scheduledAt when a booking skips straight to awaiting_payment', () => {
    const booking = { startedAt: null, completedAt: null, scheduledAt: new Date('2026-01-01T10:00:00Z') };
    const stamps = computeStatusStamps(booking, { status: 'awaiting_payment' });
    expect(stamps.startedAt).toEqual(booking.scheduledAt);
    expect(stamps.completedAt).toBeInstanceOf(Date);
  });

  it('computes durationMinutes once both startedAt and completedAt are known', () => {
    const booking = {
      startedAt: new Date('2026-01-01T10:00:00Z'),
      completedAt: null,
      scheduledAt: new Date('2026-01-01T10:00:00Z'),
    };
    const stamps = computeStatusStamps(booking, { status: 'completed' });
    expect(stamps.durationMinutes).toBeGreaterThanOrEqual(0);
  });

  it('does not re-stamp startedAt on a booking that already started', () => {
    const booking = {
      startedAt: new Date('2026-01-01T09:00:00Z'),
      completedAt: null,
      scheduledAt: new Date('2026-01-01T10:00:00Z'),
    };
    const stamps = computeStatusStamps(booking, { status: 'in_progress' });
    expect(stamps.startedAt).toBeUndefined();
  });
});
