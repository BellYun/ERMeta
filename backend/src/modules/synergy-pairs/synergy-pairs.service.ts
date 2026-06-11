import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

@Injectable()
export class SynergyPairsService {
  async readPairJson(code: string): Promise<string | null> {
    const padded = code.padStart(3, '0');
    const filePath = join(__dirname, 'data', `${padded}.json`);

    try {
      return await fs.readFile(filePath, 'utf8');
    } catch {
      return null;
    }
  }
}
