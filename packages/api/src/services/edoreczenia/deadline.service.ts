import { PrismaClient } from '@prisma/client';
import { LetterAnalysis, LetterDeadline } from './types';

const FIKCJA_DAYS = 14;

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export class EDoreczeniaDeadlineService {
  constructor(private readonly prisma: PrismaClient) {}

  buildDeadlines(receivedAt: Date, analysis: LetterAnalysis): LetterDeadline[] {
    const fikcjaDate = new Date(receivedAt);
    fikcjaDate.setUTCDate(fikcjaDate.getUTCDate() + FIKCJA_DAYS);
    const fikcja: LetterDeadline = {
      type: 'fikcja_doreczenia',
      dueDate: toIsoDate(fikcjaDate),
      description: 'Termin fikcji doręczenia (14 dni)',
    };
    // AI deadlines first, statutory fikcja always appended.
    return [...analysis.deadlines, fikcja];
  }

  async persistDeadlines(letterId: string, userId: string, deadlines: LetterDeadline[]): Promise<void> {
    if (deadlines.length === 0) return;
    await this.prisma.eDoreczeniaDeadline.createMany({
      data: deadlines.map((d) => ({
        letterId,
        userId,
        type: d.type,
        dueDate: new Date(`${d.dueDate}T00:00:00Z`),
        description: d.description,
      })),
    });
  }
}
