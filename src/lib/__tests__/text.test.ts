import { noOrphan } from '../text';

describe('noOrphan', () => {
  it('joins the last two words', () => {
    expect(noOrphan('ההתראות יגיעו בזמן')).toBe('ההתראות יגיעו בזמן');
  });

  it('leaves one word alone', () => {
    expect(noOrphan('סוללה')).toBe('סוללה');
    expect(noOrphan('')).toBe('');
  });
});
