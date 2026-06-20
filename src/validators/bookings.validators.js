const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const BOOKING_STATUSES = ['confirmed', 'in_progress', 'awaiting_payment', 'completed', 'cancelled', 'no_show'];
const ASSIGNMENT_STATUSES = ['waiting', 'in_progress', 'completed', 'cancelled'];

// The only statuses that can be set manually via PATCH /bookings/:id. Every
// other transition (confirmed -> in_progress -> awaiting_payment ->
// completed) happens automatically, driven by assignment/payment events.
const MANUAL_BOOKING_STATUSES = ['cancelled', 'no_show'];

const bookingServiceItemSchema = z.object({
  serviceId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
});

const createBookingSchema = {
  body: z.object({
    branchId: z.string().uuid(),
    customerId: z.string().uuid(),
    scheduledAt: z.coerce.date(),
    notes: z.string().optional(),
    services: z.array(bookingServiceItemSchema).min(1),
    vehicleId: z.string().uuid().optional(),
    vehicleTypeId: z.string().uuid().optional(),
    vehicleRegistration: z.string().max(50).optional(),
    vehicleMake: z.string().max(100).optional(),
    vehicleModel: z.string().max(100).optional(),
  }),
};

const updateBookingSchema = {
  body: z.object({
    branchId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    scheduledAt: z.coerce.date().optional(),
    status: z.enum(MANUAL_BOOKING_STATUSES).optional(),
    notes: z.string().optional(),
    completedAt: z.coerce.date().optional(),
    customerBehavior: z.string().max(1000).optional(),
    satisfactionRating: z.coerce.number().int().min(1).max(5).optional(),
    employeeConcerns: z.string().max(1000).optional(),
    vehicleTypeId: z.string().uuid().optional().nullable(),
    vehicleRegistration: z.string().max(50).optional(),
    vehicleMake: z.string().max(100).optional(),
    vehicleModel: z.string().max(100).optional(),
  }),
};

const listBookingsSchema = {
  query: paginationQuerySchema.extend({
    status: z.enum(BOOKING_STATUSES).optional(),
    branchId: z.string().uuid().optional(),
    employeeId: z.string().uuid().optional(),
    scheduledFrom: z.coerce.date().optional(),
    scheduledTo: z.coerce.date().optional(),
    unpaidOnly: z.coerce.boolean().optional(),
    search: z.string().optional(),
  }),
};

const addBookingServiceSchema = { body: bookingServiceItemSchema };

const createAssignmentSchema = {
  body: z.object({
    employeeId: z.string().uuid(),
    bookingServiceId: z.string().uuid().optional(),
    isTeamLead: z.boolean().optional(),
  }),
};

const updateAssignmentSchema = {
  body: z
    .object({
      status: z.enum(ASSIGNMENT_STATUSES).optional(),
      isTeamLead: z.boolean().optional(),
    })
    .refine((data) => data.status !== undefined || data.isTeamLead !== undefined, {
      message: 'status or isTeamLead is required',
    }),
};

module.exports = {
  BOOKING_STATUSES,
  ASSIGNMENT_STATUSES,
  MANUAL_BOOKING_STATUSES,
  createBookingSchema,
  updateBookingSchema,
  listBookingsSchema,
  addBookingServiceSchema,
  createAssignmentSchema,
  updateAssignmentSchema,
};
