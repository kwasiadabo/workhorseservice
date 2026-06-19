const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');
const { TENANT_ASSIGNABLE_ROLES } = require('../config/permissions');

const createUserSchema = {
  body: z.object({
    employeeId: z.string().uuid().optional(),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email().max(150),
    password: z.string().min(8).max(100),
    phone: z.string().max(30).optional(),
    role: z.enum(TENANT_ASSIGNABLE_ROLES),
    branchId: z.string().uuid().optional(),
  }),
};

const updateUserSchema = {
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().max(30).optional(),
    role: z.enum(TENANT_ASSIGNABLE_ROLES).optional(),
    branchId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
  }),
};

const listUsersSchema = {
  query: paginationQuerySchema.extend({
    role: z.enum(TENANT_ASSIGNABLE_ROLES).optional(),
    branchId: z.string().uuid().optional(),
  }),
};

module.exports = { createUserSchema, updateUserSchema, listUsersSchema };
