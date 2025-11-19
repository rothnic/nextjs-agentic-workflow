import '@testing-library/jest-dom';

// Mock scrollIntoView which is not implemented in JSDOM
Element.prototype.scrollIntoView = jest.fn();

// Polyfill Request for API route tests
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = input;
      this.method = init.method || 'GET';
      this.headers = init.headers || {};
      this._bodyInit = init.body;
    }

    async json() {
      return JSON.parse(this._bodyInit);
    }
  };
}
