import crypto from 'crypto';

/**
 * BreatheWise AI — Password Hashing & Verification Engine
 * 
 * STANDARDS COMPLIANCE:
 * - NIST SP 800-63B / OWASP Password Storage Guidelines.
 * - Algorithm: Memory-hard scrypt KDF.
 * - Parameters: N=16384 (CPU/memory cost), r=8 (block size), p=1 (parallelization), keyLen=64.
 * - Salt: 16 bytes (128 bits) of cryptographically secure randomness via crypto.randomBytes.
 * - Constant-Time Verification: crypto.timingSafeEqual protects against side-channel timing attacks.
 */

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

/**
 * Derives a cryptographic hash from a plaintext password using scrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');

  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      KEY_LEN,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P },
      (err, derivedKey) => {
        if (err) return reject(err);
        const hash = derivedKey.toString('hex');
        resolve(`scrypt$N=${SCRYPT_N},r=${SCRYPT_R},p=${SCRYPT_P}$${salt}$${hash}`);
      }
    );
  });
}

/**
 * Constant-time verification of a plaintext password against a stored scrypt hash.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    if (!storedHash || !storedHash.startsWith('scrypt$')) {
      return false;
    }

    const parts = storedHash.split('$');
    if (parts.length !== 4) {
      return false;
    }

    const [, , salt, originalHashHex] = parts;

    // Strict validation of salt (16 bytes = 32 hex chars) and derived key (64 bytes = 128 hex chars)
    if (
      !salt ||
      salt.length !== 32 ||
      !/^[0-9a-f]{32}$/i.test(salt) ||
      !originalHashHex ||
      originalHashHex.length !== 128 ||
      !/^[0-9a-f]{128}$/i.test(originalHashHex)
    ) {
      return false;
    }

    const originalHash = Buffer.from(originalHashHex, 'hex');

    return new Promise((resolve) => {
      crypto.scrypt(
        password,
        salt,
        originalHash.length,
        { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P },
        (err, derivedKey) => {
          if (err || !derivedKey) return resolve(false);
          // Constant-time comparison
          const match = crypto.timingSafeEqual(derivedKey, originalHash);
          resolve(match);
        }
      );
    });
  } catch {
    return false;
  }
}

/**
 * Constant-time dummy verification executed when a user account does NOT exist,
 * ensuring response latency is indistinguishable and defeating timing-based user enumeration.
 */
export async function dummyPasswordVerification(): Promise<void> {
  const dummySalt = '00000000000000000000000000000000';
  const dummyHash = Buffer.alloc(KEY_LEN, 0);

  return new Promise((resolve) => {
    crypto.scrypt(
      'dummy_password_for_timing_mitigation',
      dummySalt,
      KEY_LEN,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P },
      () => {
        crypto.timingSafeEqual(dummyHash, dummyHash);
        resolve();
      }
    );
  });
}
