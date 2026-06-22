import { validatePassword } from '../utils/password';

describe('Password validation', () => {
  it('accepts strong passwords', () => {
    expect(() => validatePassword('StrongPass1!')).not.toThrow();
  });

  it('rejects weak passwords', () => {
    expect(() => validatePassword('weak')).toThrow();
    expect(() => validatePassword('nouppercase1!')).toThrow();
    expect(() => validatePassword('NOLOWERCASE1!')).toThrow();
    expect(() => validatePassword('NoNumbers!')).toThrow();
    expect(() => validatePassword('NoSpecial1')).toThrow();
  });
});
