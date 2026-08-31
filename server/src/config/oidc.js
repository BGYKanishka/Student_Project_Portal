// openid-client v6 is ESM-only; the rest of this server is CommonJS, so we
// reach it via a cached dynamic import() instead of converting the whole
// server to ESM. Both the raw module and the discovered Configuration are
// memoized after the first call — discovery only needs to happen once.
let clientPromise;
let configPromise;

function getClient() {
  if (!clientPromise) {
    clientPromise = import('openid-client');
  }
  return clientPromise;
}

function getOidcConfig() {
  if (!configPromise) {
    configPromise = getClient().then(({ discovery }) =>
      discovery(
        new URL(process.env.OIDC_ISSUER),
        process.env.OIDC_CLIENT_ID,
        process.env.OIDC_CLIENT_SECRET
      )
    );
  }
  return configPromise;
}

module.exports = { getClient, getOidcConfig };
