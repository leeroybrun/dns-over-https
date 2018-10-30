const util = require('util');
const https = require('https');
const querystring = require('querystring');
const getStream = require('get-stream');
const envProxyAgent = require('env-proxy-agent');
const module = require('../package.json');
const DNSError = require('./dns-error');

const debug = util.debuglog('dns-over-https');

const get = options => new Promise(resolve => https.get(options, resolve));
const { stringify } = querystring;

const GOOGLE_HOST = 'dns.google.com';
const GOOGLE_ENDPOINT = 'resolve';

const STATUS_NOERROR = 0;

const USER_AGENT = `${module.name} v${module.version} via Node.js ${
  process.version
} on ${process.platform}`;

debug(USER_AGENT);

async function resolveRecord(
  name,
  type = 'A',
  {
    disableDNSSEC = false,
    EDNSClientSubnet = null,
    padding = false,

    headers = {},
    requestOptions = {}
  } = {}
) {
  const query = { name, type };

  if (disableDNSSEC) query.cd = 1;
  if (EDNSClientSubnet) query.edns_client_subnet = EDNSClientSubnet;

  if (padding)
    throw new Error(
      'Padding is not yet implemented. Open an issue or submit a PR.'
    );

  debug('Query:', query);

  const agent = envProxyAgent(`https://${GOOGLE_HOST}`);
  debug('Proxy:', agent && agent.proxyUri);

  const response = await get({
    host: GOOGLE_HOST,
    path: `/${GOOGLE_ENDPOINT}?${stringify(query)}`,
    headers: {
      'user-agent': USER_AGENT,
      ...headers
    },
    agent,
    ...requestOptions
  });

  const body = await getStream(response);
  debug(body);

  const json = JSON.parse(body);
  debug(json);

  if (json.Status !== STATUS_NOERROR) throw new DNSError(query, json);

  return json;
}

module.exports = resolveRecord;
