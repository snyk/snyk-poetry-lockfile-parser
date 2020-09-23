import * as lib from '../lib';

describe('CHANGE_ME', () => {
  it('doubles', () => {
    expect(lib.foo(2)).toEqual(4);
  });
  it('does not double', () => {
    expect(lib.foo(-2)).toEqual(0);
  });
});
