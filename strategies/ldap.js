'use strict';

const passport = require('passport'),
  LDAPStrategy = require('passport-ldapauth'),
  basicAuth = require('basic-auth'),
  { verify, getAuthUrl, getPathOrBase } = require('../utils');

/**
 * verify LDAP auth a little differently
 * note: this basically wraps verify with a different function signature
 * @param {object} site
 * @returns {function}
 */
function verifyLdap(site) {
  return function (req, user, done) {
    // the callback for LDAP is different than oauth, so we need to
    // pass different options to verify()
    verify({ // allows this to be mocked in tests
      username: 'sAMAccountName',
      imageUrl: '', // ldap generally has no images
      name: 'displayName',
      provider: 'ldap'
    }, site)(req, null, null, user, done); // eslint-disable-line
  };
}

/**
 * ldap / active directory auth strategy
 * @param {object} site
 */
function createLDAPStrategy(site) {
  passport.use(`ldap-${site.slug}`, new LDAPStrategy({
    server: {
      url: process.env.LDAP_URL,
      adminDn: process.env.LDAP_BIND_DN,
      adminPassword: process.env.LDAP_BIND_CREDENTIALS,
      searchBase: process.env.LDAP_SEARCH_BASE,
      searchFilter: process.env.LDAP_SEARCH_FILTER
    },
    passReqToCallback: true,
    credentialsLookup: basicAuth,
  }, verifyLdap(site)));
}

/**
 * add authorization routes to the router
 * @param {express.Router} router
 * @param {object} site
 * @param {object} provider
 */
function addAuthRoutes(router, site, provider) {
  router.get(`/_auth/${provider}`, checkCredentials, passport.authenticate(`${provider}-${site.slug}`, {
    // passport options
    failureRedirect: `${getAuthUrl(site)}/login`,
    failureFlash: true,
    successReturnToOrRedirect: getPathOrBase(site)
  }));
}

module.exports = createLDAPStrategy;
module.exports.addAuthRoutes = addAuthRoutes;
