import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.NEXT_PUBLIC_SECRET_KEY || "default_secret_key";

export function encryptText(text: string): string {
  if (!text) return "";

  const iv = CryptoJS.lib.WordArray.random(16);
  const key = CryptoJS.SHA256(SECRET_KEY); // derive 256-bit key

  const encrypted = CryptoJS.AES.encrypt(text, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const combined = `${CryptoJS.enc.Base64.stringify(iv)}:${encrypted.toString()}`;

  return combined;
}

// 🔓 رمزگشایی با IV
export function decryptText(cipherText: string): string {
  if (!cipherText) return "";

  const parts = cipherText.split(":");
  if (parts.length !== 2) {
    return "";
  }

  const iv = CryptoJS.enc.Base64.parse(parts[0]);
  const encrypted = parts[1];
  const key = CryptoJS.SHA256(SECRET_KEY);

  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const result = decrypted.toString(CryptoJS.enc.Utf8);
  return result;
}
