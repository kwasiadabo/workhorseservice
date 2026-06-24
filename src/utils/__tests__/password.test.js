const { hashPassword, comparePassword, generateTemporaryPassword } = require('../password');

describe('hashPassword / comparePassword', () => {
  it('hashes a password such that the original verifies correctly against it', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(hash).not.toBe('correct-horse-battery-staple');
    await expect(comparePassword('correct-horse-battery-staple', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password against a real hash', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    await expect(comparePassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('produces a different hash each time (random salt) even for the same input', async () => {
    const [a, b] = await Promise.all([hashPassword('same-password'), hashPassword('same-password')]);
    expect(a).not.toBe(b);
  });
});

describe('generateTemporaryPassword', () => {
  it('generates a password of the requested length', () => {
    expect(generateTemporaryPassword(12)).toHaveLength(12);
    expect(generateTemporaryPassword(20)).toHaveLength(20);
  });

  it('never includes visually-ambiguous characters (0/O, 1/l/I)', () => {
    // Run many times since generation is random — a single pass could miss a bug.
    for (let i = 0; i < 200; i += 1) {
      expect(generateTemporaryPassword(16)).not.toMatch(/[0O1lI]/);
    }
  });
});
