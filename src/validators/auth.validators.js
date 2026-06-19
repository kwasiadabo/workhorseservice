const { z } = require('zod');

const registerTenantSchema = {
  body: z.object({
    businessName: z.string().min(2).max(150),
    businessType: z.string().min(1).max(100),
    address: z.string().max(255).optional(),
    ownerFirstName: z.string().min(1).max(100),
    ownerLastName: z.string().min(1).max(100),
    email: z.string().email().max(150),
    phone: z.string().min(1).max(30),
    password: z.string().min(8).max(100),
  }),
};

const loginSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
};

const forgotPasswordSchema = {
  body: z.object({
    email: z.string().email(),
  }),
};

const resetPasswordSchema = {
  body: z.object({
    email: z.string().email(),
    token: z.string().min(1),
    newPassword: z.string().min(8).max(100),
  }),
};

const changePasswordSchema = {
  body: z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(100),
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: 'New password must be different from current password',
      path: ['newPassword'],
    }),
};

module.exports = {
  registerTenantSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};
