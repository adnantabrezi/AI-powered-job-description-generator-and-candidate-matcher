"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePassword = exports.passwordSchema = void 0;
const zod_1 = require("zod");
exports.passwordSchema = zod_1.z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');
const validatePassword = (password) => {
    exports.passwordSchema.parse(password);
};
exports.validatePassword = validatePassword;
