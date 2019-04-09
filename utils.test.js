'use strict';

const _startCase = require('lodash/startCase'),
  handlebars = require('handlebars'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require(`./${filename}`),
  storage = require('./test/fixtures/mocks/storage');

describe(_startCase(filename), function () {
  let fakeDb;

  beforeEach(function () {
    fakeDb = storage();

    lib.setDb(fakeDb);
  });

  describe('compileTemplate', function () {
    const fn = lib[this.description];

    it('calls the compile method', function () {
      handlebars.compile = jest.fn();

      fn('login.handlebars');

      expect(handlebars.compile).toHaveBeenCalled();
    });
  });

  describe('serializeUser', function () {
    const fn = lib[this.description];

    it('calls `next` if no error', function () {
      const done = jest.fn(),
        mockUser = { username: 'fake', provider: 'google' };

      fn(mockUser, done);
      expect(done).toBeCalled();
    });
  });

  describe('deserializeUser', function () {
    const fn = lib[this.description];

    it('calls `next` if no error', function () {
      const next = jest.fn(),
        mockUser = { username: 'fake', provider: 'google' };

      fakeDb.get.mockResolvedValue(mockUser);

      return fn('foo', next)
        .then(() => {
          expect(fakeDb.get).toBeCalledWith('/_users/foo');
          expect(next).toBeCalledWith(null, mockUser);
        });
    });

    it('calls `next` with error', function () {
      const next = jest.fn(),
        mockError = new Error('Error getting user data');

      fakeDb.get.mockRejectedValue();

      return fn('bar', next)
        .catch(() => {
          expect(fakeDb.get).toBeCalledWith('/_users/bar');
          expect(next).toBeCalledWith(mockError);
        });

    });
  });

  describe('getPathOrBase', function () {
    const fn = lib[this.description];

    it('adds initial slash if site path is emptystring', function () {
      expect(fn({ path: '' })).toEqual('/');
    });

    it('does not add slash if site path exists', function () {
      expect(fn({ path: '/foo'})).toEqual('/foo');
    });
  });

  describe('getCallbackUrl', function () {
    const fn = lib[this.description];

    it('adds initial slash (after the site path) if site has a path', function () {
      expect(fn({ path: '/foo', prefix: 'domain.com/foo', port: '80'}, 'twitter')).toEqual('http://domain.com/foo/_auth/twitter/callback');
    });

    it('does not add slash if site has no path', function () {
      expect(fn({ prefix: 'domain.com/', port: '80'}, 'twitter')).toEqual('http://domain.com/_auth/twitter/callback');
    });
  });

  describe('encode', function () {
    const fn = lib[this.description];

    it('hashes a username and password as base64', function () {
      const expected = Buffer.from('foo@bar', 'utf8').toString('base64');

      expect(fn('foo', 'bar')).toEqual(expected);
    });
  });

  describe('getAuthUrl', function () {
    const fn = lib[this.description];

    it('does not add slash to auth path if url has trailing slash', function () {
      const site = {
        prefix: 'foo.com',
        protocol: 'http',
        port: '80'
      };

      expect(fn(site)).toEqual('http://foo.com/_auth');
    });

    it('does add slash to auth path if url has no trailing slash', function () {
      const site = {
        prefix: 'foo.com/',
        protocol: 'http',
        port: '80'
      };

      expect(fn(site)).toEqual('http://foo.com/_auth');
    });
  });

  describe('removePrefix', function () {
    const fn = lib[this.description];

    it('removes the prefix token and anything before it', function () {
      expect(fn('foo/bar', '/')).toEqual('bar');
    });

    it('returns the same string if the prefix token is not found', function () {
      expect(fn('foo-bar', '/')).toEqual('foo-bar');
    });
  });

  describe('generateStrategyName', function () {
    const fn = lib[this.description];

    it('generates a string with provider and slug', function () {
      const site = { slug: 'nymag' };

      expect(fn('twitter', site)).toEqual('twitter-nymag');
    });
  });

  describe('removeQueryString', function () {
    const fn = lib[this.description];

    it('removes the queryString from path url', function () {
      expect(fn('http://nymag.com?edit=true')).toEqual('http://nymag.com');
    });

    it('returns the same path url if there are no queryStrings', function () {
      expect(fn('http://nymag.com')).toEqual('http://nymag.com');
    });
  });

  describe('removeExtension', function () {
    const fn = lib[this.description];

    it('removes the extension from the url path', function () {
      expect(fn('http://nymag.com/_pages/homepage.html')).toEqual('http://nymag.com/_pages/homepage');
      expect(fn('http://nymag.com/_pages/homepage.html?edit=true')).toEqual('http://nymag.com/_pages/homepage');
    });

    it('returns the same path url if there are no extensions', function () {
      expect(fn('http://nymag.com/_pages/homepage')).toEqual('http://nymag.com/_pages/homepage');
    });
  });

  describe('getUri', function () {
    const fn = lib[this.description];

    it('returns a formatted uri', function () {
      const req = {
        hostname: 'foo.com',
        baseUrl: '/bar',
        path: '/pizza'
      };

      expect(fn(req)).toEqual('foo.com/bar/pizza');
    });
  });

  describe('getProviders', function () {
    const fn = lib[this.description];

    it('removes apikey and local providers', function () {
      const providers = ['apikey', 'local', 'google'],
        site = {
          prefix: 'foo.com',
          protocol: 'http',
          port: 80
        },
        expected = [{
          name: 'google',
          url: 'http://foo.com/_auth/google',
          title: 'Log in with Google',
          icon: () => {}
        }],
        results = fn(providers, site);

      expect(results.length).toEqual(1);
      expect(results[0].url).toEqual(expected[0].url);
    });
  });
});
