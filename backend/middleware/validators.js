import { body, param, validationResult } from 'express-validator';

// Middleware to check validation results
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Registration validation
export const validateRegistration = [
  body('email')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail()
    .trim(),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  body('phone')
    .optional()
    .matches(/^\+?254[0-9]{9}$/).withMessage('Invalid Kenyan phone number (e.g., +254712345678)'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role')
    .isIn(['client', 'minion']).withMessage('Role must be either client or minion'),
  handleValidationErrors
];

// Login validation
export const validateLogin = [
  body('email')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail()
    .trim(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

// Task creation validation
export const validateTaskCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters')
    .escape(), // Sanitize HTML
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters')
    .escape(),
  body('budget')
    .isFloat({ min: 50 }).withMessage('Budget must be at least KSh 50')
    .toFloat(),
  body('category')
    .isIn(['Cleaning', 'Plumbing', 'Electrical', 'Gardening', 'Delivery', 'Moving', 'Carpentry', 'Painting', 'Repairs', 'Errands', 'Tutoring', 'Beauty & Grooming', 'Other'])
    .withMessage('Invalid category'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Location must be less than 200 characters')
    .escape(),
  body('invitedMinionId')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('Invited minion ID must be a valid user ID')
    .toInt(),
  handleValidationErrors
];

// Task application validation
export const validateTaskApplication = [
  param('taskId')
    .isInt({ min: 1 }).withMessage('Invalid task ID')
    .toInt(),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Message must be less than 500 characters')
    .escape(),
  handleValidationErrors
];

// Generic ID param validators
export const validateTaskIdParam = [
  param('taskId')
    .isInt({ min: 1 }).withMessage('Invalid task ID')
    .toInt(),
  handleValidationErrors
];

export const validateRouteIdParam = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid ID')
    .toInt(),
  handleValidationErrors
];

export const validateApplicationIdParam = [
  param('applicationId')
    .isInt({ min: 1 }).withMessage('Invalid application ID')
    .toInt(),
  handleValidationErrors
];

export const validateMinionIdParam = [
  param('minionId')
    .isInt({ min: 1 }).withMessage('Invalid minion ID')
    .toInt(),
  handleValidationErrors
];

// Task update validation (all fields optional)
export const validateTaskUpdate = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid task ID')
    .toInt(),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters')
    .escape(),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters')
    .escape(),
  body('budget')
    .optional()
    .isFloat({ min: 50 }).withMessage('Budget must be at least KSh 50')
    .toFloat(),
  body('category')
    .optional()
    .isIn(['Cleaning', 'Plumbing', 'Electrical', 'Gardening', 'Delivery', 'Moving', 'Carpentry', 'Painting', 'Repairs', 'Errands', 'Tutoring', 'Beauty & Grooming', 'Other'])
    .withMessage('Invalid category'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Location must be less than 200 characters')
    .escape(),
  body('invitedMinionId')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('Invited minion ID must be a valid user ID')
    .toInt(),
  handleValidationErrors
];

export const validateTaskStatusUpdate = [
  param('taskId')
    .isInt({ min: 1 }).withMessage('Invalid task ID')
    .toInt(),
  body('status')
    .isIn(['in_progress', 'completed', 'cancelled']).withMessage('Invalid status'),
  handleValidationErrors
];

export const validateTaskRating = [
  param('taskId')
    .isInt({ min: 1 }).withMessage('Invalid task ID')
    .toInt(),
  body('rating')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
    .toInt(),
  handleValidationErrors
];

export const validateAdminTaskUpdate = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid task ID')
    .toInt(),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters')
    .escape(),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters')
    .escape(),
  body('budget')
    .optional()
    .isFloat({ min: 50 }).withMessage('Budget must be at least KSh 50')
    .toFloat(),
  body('category')
    .optional()
    .isIn(['Cleaning', 'Plumbing', 'Electrical', 'Gardening', 'Delivery', 'Moving', 'Carpentry', 'Painting', 'Repairs', 'Errands', 'Tutoring', 'Beauty & Grooming', 'Other'])
    .withMessage('Invalid category'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Location must be less than 200 characters')
    .escape(),
  body('status')
    .optional()
    .isIn(['open', 'pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'paid', 'paused', 'archived'])
    .withMessage('Invalid task status'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid task priority'),
  body('minionId')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('Minion ID must be a valid user ID')
    .toInt(),
  handleValidationErrors
];

export const validateDisputeCreation = [
  param('taskId')
    .isInt({ min: 1 }).withMessage('Invalid task ID')
    .toInt(),
  body('reason')
    .isIn([
      'scope_change',
      'work_quality',
      'delay_or_no_show',
      'payment_issue',
      'safety_concern',
      'communication_issue',
      'other'
    ])
    .withMessage('Invalid dispute reason'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 }).withMessage('Description must be 10-1000 characters')
    .escape(),
  handleValidationErrors
];

export const validateDisputeIdParam = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid dispute ID')
    .toInt(),
  handleValidationErrors
];

export const validateAdminDisputeUpdate = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid dispute ID')
    .toInt(),
  body('status')
    .optional()
    .isIn(['open', 'under_review', 'resolved', 'rejected'])
    .withMessage('Invalid dispute status'),
  body('adminNote')
    .optional()
    .trim()
    .isLength({ max: 1500 }).withMessage('Admin note must be 1500 characters or fewer')
    .escape(),
  body('resolutionAction')
    .optional({ nullable: true })
    .isIn(['resolved', 'reject_dispute', 'reassign_task', 'cancel_task'])
    .withMessage('Invalid resolution action'),
  body('minionId')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('Minion ID must be a valid user ID')
    .toInt(),
  handleValidationErrors
];

export const validateAdminUserAction = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid user ID')
    .toInt(),
  handleValidationErrors
];
