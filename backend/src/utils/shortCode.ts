// 短链接生成工具
export class ShortCodeGenerator {
  private static readonly CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  private static readonly CODE_LENGTH = 8;

  /**
   * 生成随机短代码
   */
  static generate(): string {
    let result = '';
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      result += this.CHARS.charAt(Math.floor(Math.random() * this.CHARS.length));
    }
    return result;
  }

  /**
   * 基于图片ID生成确定性短代码（可选实现）
   */
  static generateFromId(imageId: number): string {
    // 使用简单的编码算法，也可以使用更复杂的哈希算法
    const base = this.CHARS.length;
    let num = imageId + 1000000; // 避免太短的代码
    let result = '';
    
    while (num > 0) {
      result = this.CHARS[num % base] + result;
      num = Math.floor(num / base);
    }
    
    return result.padStart(this.CODE_LENGTH, this.CHARS[0]);
  }

  /**
   * 验证短代码格式
   */
  static isValid(code: string): boolean {
    if (code.length !== this.CODE_LENGTH) return false;
    return [...code].every(char => this.CHARS.includes(char));
  }
}