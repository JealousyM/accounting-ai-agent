import express from 'express';
import request from 'supertest';

jest.mock('../../middleware/auth.middleware', () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => { (req as { user: unknown }).user = { userId: 'u1' }; next(); },
}));
jest.mock('../../services/edoreczenia', () => ({
  edoreczeniaService: {
    getLetters: jest.fn().mockResolvedValue([{ id: 'L1', senderName: 'US' }]),
    beginOnboarding: jest.fn().mockResolvedValue({ csrPem: 'CSR' }),
  },
}));

import edoreczeniaRoutes from '../edoreczenia.routes';
import { edoreczeniaService } from '../../services/edoreczenia';

const app = express();
app.use(express.json());
app.use('/api/edoreczenia', edoreczeniaRoutes);

describe('edoreczenia routes', () => {
  it('GET /letters returns the user\'s letters', async () => {
    const res = await request(app).get('/api/edoreczenia/letters');
    expect(res.status).toBe(200);
    expect(res.body.letters[0].id).toBe('L1');
    expect((edoreczeniaService.getLetters as jest.Mock)).toHaveBeenCalledWith('u1', 'all');
  });

  it('POST /onboarding/csr returns a CSR for download', async () => {
    const res = await request(app).post('/api/edoreczenia/onboarding/csr').send({ commonName: 'ADE-PL-1' });
    expect(res.status).toBe(200);
    expect(res.body.csrPem).toBe('CSR');
  });
});
