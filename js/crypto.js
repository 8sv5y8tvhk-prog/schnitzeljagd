/* ── Ver-/Entschlüsselung der Stadt-Dateien ──
 *
 * Schlüssel wird per PBKDF2 aus dem Startcode abgeleitet, Inhalt mit
 * AES-GCM verschlüsselt. Wird von der App (Entschlüsseln) und von
 * tools/encrypt.html (Verschlüsseln) gemeinsam benutzt.
 * Codes sind unempfindlich gegen Groß-/Kleinschreibung, Leerzeichen
 * und Umlaute – "Geheim 42" und "GEHEIM42" sind derselbe Code.
 */

const HuntCrypto = {
  FORMAT: 'schnitzeljagd-enc-v1',
  ITERATIONS: 300000,

  normalizeCode(code) {
    return code
      .toLowerCase()
      .trim()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '');
  },

  b64encode(bytes) {
    let s = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(s);
  },

  b64decode(str) {
    return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
  },

  async deriveKey(code, salt, usage, iterations = this.ITERATIONS) {
    const material = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(this.normalizeCode(code)),
      'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false, [usage]
    );
  },

  isEncrypted(obj) {
    return obj && obj.format === this.FORMAT;
  },

  async encrypt(huntObj, code) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(code, salt, 'encrypt');
    const plaintext = new TextEncoder().encode(JSON.stringify(huntObj));
    const ct = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
    );
    return {
      format: this.FORMAT,
      kdf: 'PBKDF2-SHA256',
      iterations: this.ITERATIONS,
      salt: this.b64encode(salt),
      iv: this.b64encode(iv),
      ct: this.b64encode(ct),
    };
  },

  async decrypt(encObj, code) {
    const key = await this.deriveKey(
      code, this.b64decode(encObj.salt), 'decrypt', encObj.iterations
    );
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: this.b64decode(encObj.iv) },
      key,
      this.b64decode(encObj.ct)
    );
    return JSON.parse(new TextDecoder().decode(pt));
  },
};
