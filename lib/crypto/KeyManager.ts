export type EncryptedPayload = {
  ciphertextBase64: string;
  ivBase64: string;
  authTagBase64?: string; // WebCrypto AES-GCMはauthTagが内部管理
};

export class KeyManager {
  // 将来: KMSや環境変数からマスター鍵を取得し、ユーザー単位のUDKをラップ/アンラップ
  static async encryptPlaintext(_userId: string, plaintext: string): Promise<EncryptedPayload> {
    // MVPスタブ: 暗号化は未実装、平文をそのままbase64にして返す（DB層では暗号化カラムを用意）
    const ciphertextBase64 = Buffer.from(plaintext, 'utf8').toString('base64');
    const ivBase64 = Buffer.from('stub-iv').toString('base64');
    return { ciphertextBase64, ivBase64 };
  }

  static async decryptToPlaintext(_userId: string, payload: EncryptedPayload): Promise<string> {
    // MVPスタブ: 逆変換
    return Buffer.from(payload.ciphertextBase64, 'base64').toString('utf8');
  }
}


