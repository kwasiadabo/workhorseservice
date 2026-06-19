const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const env = require('./env');

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'VX-Workhorse API',
    version: '0.1.0',
    description:
      'REST API for VX-Workhorse, a multi-tenant SaaS platform for service businesses ' +
      '(barbershops, salons, spas, car washes, nail studios, cleaning services, massage centers, etc.).\n\n' +
      '### Authentication\n' +
      'Send `Authorization: Bearer <accessToken>` on every request except ' +
      '`POST /auth/register-tenant`, `POST /auth/login`, and `POST /auth/refresh`. ' +
      'The refresh token is issued as an httpOnly `refreshToken` cookie scoped to `/api/v1/auth` ' +
      'and is not exposed in response bodies.\n\n' +
      '### Response envelope\n' +
      'Successful responses are shaped as `{ "success": true, "data": ..., "meta": ... }` ' +
      '(`meta` is present on paginated list endpoints). ' +
      'Errors are shaped as `{ "success": false, "message": "...", "errors": [...] }` (`errors` only on validation failures).',
    contact: {
      name: 'VX-Workhorse API support',
    },
  },
  servers: [
    {
      url: `${env.APP_BASE_URL}/api/v1`,
      description: `${env.NODE_ENV} server`,
    },
  ],
  tags: [
    { name: 'Auth', description: 'Registration, login, token refresh and session management' },
    { name: 'Users', description: "Tenant user account management (logins, roles, branch assignment)" },
    { name: 'Branches', description: 'Tenant branch/location management' },
    { name: 'Employees', description: 'Tenant staff management' },
    { name: 'Customers', description: 'Tenant customer management' },
    { name: 'Service Categories', description: 'Grouping for services offered by a tenant' },
    { name: 'Services', description: 'Services offered by a tenant' },
    { name: 'Bookings', description: 'Appointments, line items and staff assignments' },
    { name: 'Payments', description: 'Payments recorded against bookings' },
    { name: 'Cash Handovers', description: 'Team-lead cash accountability for payments received over a period' },
    { name: 'Dashboard', description: "Personal analytics for the authenticated user's linked employee record" },
    { name: 'Admin - Tenants', description: 'Super-admin only: manage tenants across the platform' },
    { name: 'Admin - Users', description: 'Super-admin only: manage user accounts across all tenants' },
  ],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token returned by `/auth/login`, `/auth/register-tenant` or `/auth/refresh`.',
      },
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number (1-indexed)',
        schema: { type: 'integer', minimum: 1, default: 1 },
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Items per page',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
      SortParam: {
        name: 'sort',
        in: 'query',
        description: 'Field to sort by; prefix with `-` for descending order, e.g. `-createdAt`',
        schema: { type: 'string' },
      },
      SearchParam: {
        name: 'search',
        in: 'query',
        description: 'Free-text search (only on resources that support it)',
        schema: { type: 'string' },
      },
      IdParam: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Resource UUID',
        schema: { type: 'string', format: 'uuid' },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing/invalid/expired access token, or bad credentials',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      Forbidden: {
        description: 'Authenticated but lacks the required permission/role',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      NotFound: {
        description: 'Resource not found, or not found for this tenant',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      Conflict: {
        description: 'Conflict — unique constraint or related-resource-in-use',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      ValidationError: {
        description: 'Validation error (Zod or Sequelize)',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } },
      },
      NoContent: {
        description: 'Deleted successfully — no response body',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Not found' },
        },
      },
      ValidationErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string', example: 'email' },
                message: { type: 'string', example: 'Invalid email' },
              },
            },
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 57 },
          totalPages: { type: 'integer', example: 3 },
          totals: {
            type: 'object',
            description:
              'Aggregate totals over the full filtered result set (not just '
              + 'the current page). Shape varies by endpoint — see each '
              + 'endpoint description.',
            additionalProperties: true,
          },
        },
      },

      Plan: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Starter' },
          description: { type: 'string', nullable: true },
          priceMonthly: { type: 'string', example: '0.00' },
          priceYearly: { type: 'string', example: '0.00' },
          currency: { type: 'string', example: 'GH¢' },
          maxBranches: { type: 'integer', nullable: true },
          maxEmployees: { type: 'integer', nullable: true },
          maxBookingsPerMonth: { type: 'integer', nullable: true },
          features: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
        },
      },

      Tenant: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Demo Barbershop' },
          slug: { type: 'string', example: 'demo-barbershop' },
          businessType: {
            type: 'string',
            enum: ['barbershop', 'salon', 'spa', 'car_wash', 'nail_studio', 'cleaning', 'massage', 'other'],
          },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          logoUrl: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['trial', 'active', 'suspended', 'cancelled'] },
          planId: { type: 'string', format: 'uuid', nullable: true },
          trialEndsAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          Plan: { $ref: '#/components/schemas/Plan' },
        },
      },

      TenantWithUsers: {
        allOf: [
          { $ref: '#/components/schemas/Tenant' },
          {
            type: 'object',
            properties: {
              Users: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    email: { type: 'string', format: 'email' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    isActive: { type: 'boolean' },
                    lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
                  },
                },
              },
            },
          },
        ],
      },

      UpdateTenantInput: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 150 },
          status: { type: 'string', enum: ['trial', 'active', 'suspended', 'cancelled'] },
          planId: { type: 'string', format: 'uuid', nullable: true },
          trialEndsAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },

      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid', nullable: true },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phone: { type: 'string', nullable: true },
          avatarUrl: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
          lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
          role: { type: 'string', example: 'tenant_owner' },
          permissions: {
            type: 'array',
            items: { type: 'string' },
            example: ['branches.view', 'branches.manage'],
          },
        },
      },

      RegisterTenantInput: {
        type: 'object',
        required: ['businessName', 'businessType', 'ownerFirstName', 'ownerLastName', 'email', 'password'],
        properties: {
          businessName: { type: 'string', minLength: 2, maxLength: 150, example: 'Demo Barbershop' },
          businessType: {
            type: 'string',
            enum: ['barbershop', 'salon', 'spa', 'car_wash', 'nail_studio', 'cleaning', 'massage', 'other'],
            example: 'barbershop',
          },
          address: { type: 'string', maxLength: 255, example: '12 Independence Ave, Accra' },
          ownerFirstName: { type: 'string', minLength: 1, maxLength: 100, example: 'Ama' },
          ownerLastName: { type: 'string', minLength: 1, maxLength: 100, example: 'Owusu' },
          email: { type: 'string', format: 'email', maxLength: 150, example: 'ama@demobarbershop.com' },
          phone: { type: 'string', maxLength: 30, example: '+233200000000' },
          password: { type: 'string', minLength: 8, maxLength: 100, format: 'password', example: 'S3curePass!' },
        },
      },

      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'ama@demobarbershop.com' },
          password: { type: 'string', format: 'password', example: 'S3curePass!' },
        },
      },

      AuthSession: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
      },

      RegisterTenantResponseData: {
        type: 'object',
        properties: {
          tenant: { $ref: '#/components/schemas/Tenant' },
          user: { $ref: '#/components/schemas/User' },
          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
      },

      Branch: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Osu Branch' },
          address: { type: 'string', nullable: true, example: 'Oxford St' },
          city: { type: 'string', nullable: true, example: 'Accra' },
          phone: { type: 'string', nullable: true, example: '+233200000001' },
          email: { type: 'string', format: 'email', nullable: true },
          isActive: { type: 'boolean', default: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      BranchInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 150, example: 'Osu Branch' },
          address: { type: 'string', maxLength: 255 },
          city: { type: 'string', maxLength: 100 },
          phone: { type: 'string', maxLength: 30 },
          email: { type: 'string', format: 'email', maxLength: 150 },
          isActive: { type: 'boolean' },
        },
      },

      Employee: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          branchId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid', nullable: true },
          firstName: { type: 'string', example: 'Kojo' },
          middleName: { type: 'string', nullable: true, example: 'Yaw' },
          lastName: { type: 'string', example: 'Mensah' },
          email: { type: 'string', format: 'email', nullable: true },
          phone: { type: 'string', nullable: true },
          positionId: { type: 'string', format: 'uuid', nullable: true },
          hireDate: { type: 'string', format: 'date', nullable: true },
          status: { type: 'string', enum: ['active', 'inactive', 'on_leave'], default: 'active' },
          avatarUrl: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      EmployeeInput: {
        type: 'object',
        required: ['branchId', 'firstName', 'lastName'],
        properties: {
          branchId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid', nullable: true },
          firstName: { type: 'string', minLength: 1, maxLength: 100, example: 'Kojo' },
          middleName: { type: 'string', maxLength: 100, example: 'Yaw' },
          lastName: { type: 'string', minLength: 1, maxLength: 100, example: 'Mensah' },
          email: { type: 'string', format: 'email', maxLength: 150 },
          phone: { type: 'string', maxLength: 30 },
          positionId: { type: 'string', format: 'uuid', nullable: true },
          hireDate: { type: 'string', format: 'date' },
          status: { type: 'string', enum: ['active', 'inactive', 'on_leave'] },
          avatarUrl: { type: 'string', format: 'uri', maxLength: 500 },
        },
      },

      TenantUser: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string', example: 'Kojo' },
          lastName: { type: 'string', example: 'Mensah' },
          phone: { type: 'string', nullable: true },
          avatarUrl: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
          lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
          role: { type: 'string', enum: ['tenant_owner', 'manager', 'receptionist', 'employee'], nullable: true },
          employeeId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'ID of the linked Employee record, if this user is assigned to a branch.',
          },
          branchId: { type: 'string', format: 'uuid', nullable: true },
          branch: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string', example: 'Osu Branch' },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateTenantUserInput: {
        type: 'object',
        required: ['firstName', 'lastName', 'email', 'password', 'role'],
        properties: {
          employeeId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description:
              "If provided, links the new login to this existing Employee record (which must not already have a user account) instead of creating a new one. The employee's existing branch assignment is kept and `branchId` is ignored.",
          },
          firstName: { type: 'string', minLength: 1, maxLength: 100, example: 'Kojo' },
          lastName: { type: 'string', minLength: 1, maxLength: 100, example: 'Mensah' },
          email: { type: 'string', format: 'email', maxLength: 150, example: 'kojo@demobarbershop.com' },
          password: { type: 'string', minLength: 8, maxLength: 100, format: 'password' },
          phone: { type: 'string', maxLength: 30 },
          role: { type: 'string', enum: ['manager', 'receptionist', 'employee'], example: 'employee' },
          branchId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'If provided (and employeeId is not), also creates an Employee record linking this user to the branch.',
          },
        },
      },
      UpdateTenantUserInput: {
        type: 'object',
        properties: {
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          phone: { type: 'string', maxLength: 30 },
          role: { type: 'string', enum: ['manager', 'receptionist', 'employee'] },
          branchId: { type: 'string', format: 'uuid' },
          isActive: { type: 'boolean' },
        },
      },

      ResetPasswordResult: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/TenantUser' },
          temporaryPassword: {
            type: 'string',
            example: 'k7K2!fXq9pTr',
            description: 'One-time temporary password. Returned only in this response — share it securely with the user.',
          },
        },
      },

      AdminUser: {
        allOf: [
          { $ref: '#/components/schemas/TenantUser' },
          {
            type: 'object',
            properties: {
              tenant: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string', example: 'Demo Barbershop' },
                  slug: { type: 'string', example: 'demo-barbershop' },
                  status: { type: 'string', enum: ['trial', 'active', 'suspended', 'cancelled'] },
                },
              },
            },
          },
        ],
      },
      UpdateAdminUserInput: {
        type: 'object',
        properties: {
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          phone: { type: 'string', maxLength: 30 },
          isActive: { type: 'boolean' },
        },
      },

      Customer: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Esi Boateng' },
          email: { type: 'string', format: 'email', nullable: true },
          phone: { type: 'string', example: '+233244000000' },
          notes: { type: 'string', nullable: true },
          loyaltyPoints: { type: 'integer', default: 0 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CustomerInput: {
        type: 'object',
        required: ['name', 'phone'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200, example: 'Esi Boateng' },
          email: { type: 'string', format: 'email', maxLength: 150 },
          phone: { type: 'string', minLength: 1, maxLength: 30, example: '+233244000000' },
          notes: { type: 'string' },
        },
      },

      Position: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Barber' },
          displayOrder: { type: 'integer', default: 0 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PositionInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100, example: 'Barber' },
          displayOrder: { type: 'integer', minimum: 0 },
        },
      },

      ServiceCategory: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Hair' },
          description: { type: 'string', nullable: true },
          displayOrder: { type: 'integer', default: 0 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ServiceCategoryInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100, example: 'Hair' },
          description: { type: 'string' },
          displayOrder: { type: 'integer', minimum: 0 },
        },
      },

      Service: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          categoryId: { type: 'string', format: 'uuid', nullable: true },
          name: { type: 'string', example: 'Classic Haircut' },
          description: { type: 'string', nullable: true },
          durationMinutes: { type: 'integer', default: 30, example: 30 },
          price: { type: 'string', example: '25.00' },
          currency: { type: 'string', example: 'GH¢' },
          isActive: { type: 'boolean', default: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ServiceInput: {
        type: 'object',
        required: ['name', 'price'],
        properties: {
          categoryId: { type: 'string', format: 'uuid', nullable: true },
          name: { type: 'string', minLength: 1, maxLength: 150, example: 'Classic Haircut' },
          description: { type: 'string' },
          durationMinutes: { type: 'integer', minimum: 1, maximum: 1440, example: 30 },
          price: { type: 'number', minimum: 0, example: 25 },
          currency: { type: 'string', minLength: 3, maxLength: 3, example: 'GH¢' },
          isActive: { type: 'boolean' },
        },
      },

      ExpenseCategory: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Rent' },
          displayOrder: { type: 'integer', default: 0 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ExpenseCategoryInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100, example: 'Rent' },
          displayOrder: { type: 'integer', minimum: 0 },
        },
      },

      Expense: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          branchId: { type: 'string', format: 'uuid', nullable: true },
          categoryId: { type: 'string', format: 'uuid', nullable: true },
          description: { type: 'string', nullable: true },
          amount: { type: 'string', example: '150.00' },
          currency: { type: 'string', example: 'GH¢' },
          expenseDate: { type: 'string', format: 'date' },
          recordedBy: { type: 'string', format: 'uuid', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          Branch: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
            },
          },
          ExpenseCategory: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
            },
          },
          recorder: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
            },
          },
        },
      },
      ExpenseInput: {
        type: 'object',
        required: ['categoryId', 'amount', 'expenseDate'],
        properties: {
          branchId: { type: 'string', format: 'uuid', nullable: true },
          categoryId: { type: 'string', format: 'uuid' },
          description: { type: 'string' },
          amount: { type: 'number', minimum: 0, exclusiveMinimum: true, example: 150 },
          currency: { type: 'string', minLength: 3, maxLength: 3, example: 'GH¢' },
          expenseDate: { type: 'string', format: 'date', example: '2026-06-15' },
        },
      },

      BookingServiceItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          serviceId: { type: 'string', format: 'uuid' },
          priceAtBooking: { type: 'string', example: '25.00' },
          durationAtBooking: { type: 'integer', example: 30 },
          quantity: { type: 'integer', example: 1 },
          Service: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string', example: 'Classic Haircut' },
              durationMinutes: { type: 'integer', example: 30 },
              price: { type: 'string', example: '25.00' },
              currency: { type: 'string', example: 'GH¢' },
            },
          },
        },
      },
      BookingAssignment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          bookingId: { type: 'string', format: 'uuid' },
          bookingServiceId: { type: 'string', format: 'uuid', nullable: true },
          employeeId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['waiting', 'in_progress', 'completed', 'cancelled'] },
          assignedAt: { type: 'string', format: 'date-time' },
          startedAt: { type: 'string', format: 'date-time', nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          isTeamLead: {
            type: 'boolean',
            description: 'Exactly one assignment per booking can be the team lead (bookkeeping only).',
          },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          branchId: { type: 'string', format: 'uuid' },
          customerId: { type: 'string', format: 'uuid' },
          bookingNumber: { type: 'string', example: 'BK-20260611-0001' },
          status: {
            type: 'string',
            enum: ['confirmed', 'in_progress', 'awaiting_payment', 'completed', 'cancelled', 'no_show'],
            description:
              'confirmed -> in_progress -> awaiting_payment -> completed advance automatically based on ' +
              'assignment progress and payments; cancelled/no_show are manual exceptions.',
          },
          scheduledAt: { type: 'string', format: 'date-time' },
          totalAmount: { type: 'string', example: '75.00' },
          notes: { type: 'string', nullable: true },
          createdBy: { type: 'string', format: 'uuid', nullable: true },
          startedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description:
              'Set automatically the first time status moves to in_progress, or backfilled from ' +
              'scheduledAt if it reaches awaiting_payment/completed without ever being in_progress.',
          },
          completedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Set automatically the first time status moves to awaiting_payment or completed.',
          },
          durationMinutes: {
            type: 'integer',
            nullable: true,
            example: 45,
            description: 'Auto-calculated as completedAt - startedAt (minutes) whenever both are set.',
          },
          customerBehavior: { type: 'string', nullable: true },
          satisfactionRating: { type: 'integer', nullable: true, minimum: 1, maximum: 5 },
          employeeConcerns: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          bookingServices: { type: 'array', items: { $ref: '#/components/schemas/BookingServiceItem' } },
          assignments: { type: 'array', items: { $ref: '#/components/schemas/BookingAssignment' } },
          Payments: { type: 'array', items: { $ref: '#/components/schemas/Payment' } },
          Customer: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              phone: { type: 'string', nullable: true },
              email: { type: 'string', nullable: true },
            },
          },
          Branch: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
            },
          },
          creator: {
            type: 'object',
            nullable: true,
            description: 'The staff member who created the booking (createdBy).',
            properties: {
              id: { type: 'string', format: 'uuid' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
            },
          },
        },
      },
      CreateBookingInput: {
        type: 'object',
        required: ['branchId', 'customerId', 'scheduledAt', 'services'],
        properties: {
          branchId: { type: 'string', format: 'uuid' },
          customerId: { type: 'string', format: 'uuid' },
          scheduledAt: { type: 'string', format: 'date-time', example: '2026-06-15T10:00:00.000Z' },
          notes: { type: 'string', example: 'First-time customer' },
          services: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['serviceId'],
              properties: {
                serviceId: { type: 'string', format: 'uuid' },
                quantity: { type: 'integer', minimum: 1, maximum: 20, default: 1 },
              },
            },
          },
        },
      },
      UpdateBookingInput: {
        type: 'object',
        properties: {
          branchId: { type: 'string', format: 'uuid' },
          customerId: { type: 'string', format: 'uuid' },
          scheduledAt: { type: 'string', format: 'date-time' },
          status: {
            type: 'string',
            enum: ['cancelled', 'no_show'],
            description:
              'The only statuses settable manually. confirmed -> in_progress -> awaiting_payment -> ' +
              'completed advance automatically based on assignment/payment events.',
          },
          notes: { type: 'string' },
          completedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Actual service completion time. Triggers durationMinutes recalculation against startedAt.',
          },
          customerBehavior: { type: 'string', maxLength: 1000, description: "Notes on the customer's comportment." },
          satisfactionRating: { type: 'integer', minimum: 1, maximum: 5, description: 'Customer satisfaction, 1-5.' },
          employeeConcerns: { type: 'string', maxLength: 1000, description: 'Concerns raised by the assigned staff.' },
        },
      },
      AddBookingServiceInput: {
        type: 'object',
        required: ['serviceId'],
        properties: {
          serviceId: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer', minimum: 1, maximum: 20, default: 1 },
        },
      },
      CreateAssignmentInput: {
        type: 'object',
        required: ['employeeId'],
        properties: {
          employeeId: { type: 'string', format: 'uuid' },
          bookingServiceId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Omit or set to null to assign to the whole booking rather than one line item.',
          },
          isTeamLead: {
            type: 'boolean',
            description:
              'Nominate this assignment as the team lead on creation, demoting any existing lead. The ' +
              'first assignment on a booking is always promoted to lead automatically regardless of this flag.',
          },
        },
      },
      UpdateAssignmentInput: {
        type: 'object',
        description: 'At least one of `status` or `isTeamLead` is required.',
        properties: {
          status: { type: 'string', enum: ['waiting', 'in_progress', 'completed', 'cancelled'] },
          isTeamLead: {
            type: 'boolean',
            enum: [true],
            description:
              'Set to true to nominate this assignment as the team lead (demotes the current lead). ' +
              'Cannot be set to false directly — nominate a replacement instead.',
          },
        },
      },

      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          bookingId: { type: 'string', format: 'uuid' },
          amount: { type: 'string', example: '50.00' },
          currency: { type: 'string', example: 'GH¢' },
          method: { type: 'string', enum: ['cash', 'card', 'mobile_money', 'bank_transfer', 'other'] },
          status: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded'] },
          referenceNumber: { type: 'string', nullable: true, example: 'RCPT-0001' },
          receivedBy: { type: 'string', format: 'uuid', nullable: true },
          paidAt: { type: 'string', format: 'date-time' },
          notes: { type: 'string', nullable: true },
          cashHandoverId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Set once this payment has been included in a cash handover\'s `expectedAmount`.',
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreatePaymentInput: {
        type: 'object',
        required: ['bookingId', 'amount'],
        properties: {
          bookingId: { type: 'string', format: 'uuid' },
          amount: { type: 'number', exclusiveMinimum: 0, example: 50 },
          currency: { type: 'string', minLength: 3, maxLength: 3, example: 'GH¢' },
          method: { type: 'string', enum: ['cash', 'card', 'mobile_money', 'bank_transfer', 'other'] },
          referenceNumber: { type: 'string', maxLength: 100, example: 'RCPT-0001' },
          paidAt: { type: 'string', format: 'date-time' },
          notes: { type: 'string', example: 'Partial payment' },
        },
      },

      CashHandover: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          branchId: { type: 'string', format: 'uuid' },
          employeeId: { type: 'string', format: 'uuid' },
          periodStart: { type: 'string', format: 'date-time' },
          periodEnd: { type: 'string', format: 'date-time' },
          expectedAmount: {
            type: 'string',
            example: '120.00',
            description:
              'Sum of this employee\'s `completed` payments (Payment.receivedBy) with `paidAt` in ' +
              '[periodStart, periodEnd] that had not already been included in a previous handover, ' +
              'computed server-side at submission time. Those payments are then stamped with this ' +
              "handover's id (`Payment.cashHandoverId`) so they can't be counted again.",
          },
          declaredAmount: { type: 'string', example: '115.00' },
          variance: {
            type: 'string',
            example: '-5.00',
            description: 'declaredAmount - expectedAmount. Negative means a shortfall.',
          },
          currency: { type: 'string', example: 'GH¢' },
          status: { type: 'string', enum: ['submitted', 'reconciled', 'disputed'] },
          notes: { type: 'string', nullable: true },
          reviewNotes: { type: 'string', nullable: true },
          submittedBy: { type: 'string', format: 'uuid' },
          submittedAt: { type: 'string', format: 'date-time' },
          reconciledBy: { type: 'string', format: 'uuid', nullable: true },
          reconciledAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          Employee: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
            },
          },
          Branch: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
            },
          },
          submitter: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
            },
          },
          reconciler: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
            },
          },
        },
      },
      CreateCashHandoverInput: {
        type: 'object',
        required: ['periodStart', 'periodEnd', 'declaredAmount'],
        properties: {
          employeeId: {
            type: 'string',
            format: 'uuid',
            description: 'Required — the employee this cash handover is being declared on behalf of.',
          },
          branchId: {
            type: 'string',
            format: 'uuid',
            description: "Defaults to the employee's own branch if omitted.",
          },
          periodStart: { type: 'string', format: 'date-time' },
          periodEnd: { type: 'string', format: 'date-time' },
          declaredAmount: { type: 'number', minimum: 0, example: 115 },
          notes: { type: 'string', example: 'End of day handover' },
        },
      },
      ReviewCashHandoverInput: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['reconciled', 'disputed'] },
          reviewNotes: { type: 'string', example: 'Counted and matches' },
        },
      },
      CashHandoverPreview: {
        type: 'object',
        properties: {
          employeeId: { type: 'string', format: 'uuid' },
          expectedAmount: {
            type: 'number',
            example: 120,
            description: 'Sum of `amount` across `payments` below.',
          },
          periodAlreadySubmitted: {
            type: 'boolean',
            description: 'True if this employee already has a cash handover (any status) whose period overlaps [periodStart, periodEnd] — submitting would be rejected with 409.',
          },
          payments: {
            type: 'array',
            description: "This employee's `completed` payments in [periodStart, periodEnd] not yet included in a previous handover — the payments this handover would cover.",
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                amount: { type: 'number', example: 35 },
                currency: { type: 'string', example: 'GH¢' },
                method: { type: 'string', example: 'cash' },
                paidAt: { type: 'string', format: 'date-time' },
                bookingNumber: { type: 'string', nullable: true, example: 'BK-20260614-0007' },
                customerName: { type: 'string', nullable: true, example: 'John Doe' },
              },
            },
          },
        },
      },
    },
  },
};

const options = {
  definition,
  apis: [path.join(__dirname, '..', 'routes', '*.routes.js')],
};

module.exports = swaggerJsdoc(options);
