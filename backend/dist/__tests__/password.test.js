"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const password_1 = require("../utils/password");
describe('Password validation', () => {
    it('accepts strong passwords', () => {
        expect(() => (0, password_1.validatePassword)('StrongPass1!')).not.toThrow();
    });
    it('rejects weak passwords', () => {
        expect(() => (0, password_1.validatePassword)('weak')).toThrow();
        expect(() => (0, password_1.validatePassword)('nouppercase1!')).toThrow();
        expect(() => (0, password_1.validatePassword)('NOLOWERCASE1!')).toThrow();
        expect(() => (0, password_1.validatePassword)('NoNumbers!')).toThrow();
        expect(() => (0, password_1.validatePassword)('NoSpecial1')).toThrow();
    });
});
