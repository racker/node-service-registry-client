/**
 *  Copyright 2012 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var querystring = require('querystring');
var util = require('util');

var logmagic = require('logmagic');
var log = require('logmagic').local('farscape-client');
var sprintf = require('sprintf').sprintf;
var KeystoneClient = require('keystone-client').KeystoneClient;

var misc = require('rackspace-shared-utils/lib/misc');
var request = require('rackspace-shared-utils/lib/request');
var errors = require('rackspace-shared-utils/lib/errors');

/**
 * Default auth API urls.
 */
var DEFAULT_AUTH_URLS = {
  'us': 'https://identity.api.rackspacecloud.com/v2.0',
  'uk': 'https://lon.identity.api.rackspacecloud.com/v2.0'
};

/**
 * @constructor
 * @param {String} url Full API url including a version.
 * @param {String} username API username.
 * @param {String} apiKey API key.
 * @param {?Object} options Options object with the following keys:
 * - authUrl - auth api url.
 * - debug - true to enable debug mode and print log messages.
 */
function BaseClient(url, username, apiKey, region, options) {
  region = region || 'us';
  options = options || {};

  if (url.charAt(url.length - 1) === '/') {
    url = url.slice(0, url.length - 1);
  }

  this._url = url;
  this._username = username;
  this._apiKey = apiKey;
  this._region = region;
  this._debug = options.debug || false;
  this._options = options;

  if (options.authUrl) {
    this._authUrl = options.authUrl;
  }
  else {
    if (!DEFAULT_AUTH_URLS.hasOwnProperty(region)) {
      throw new Error('Invalid region: ' + region);
    }

    this._authUrl = DEFAULT_AUTH_URLS[region];
  }

  this._client = new KeystoneClient(this._authUrl, {'username': username,
                                                    'apiKey': apiKey});
  if (this._debug) {
    logmagic.route('farscape-client', logmagic.DEBUG, 'console');
    this._client.on('log', function(level, msg, obj) {
      log[level](msg, obj);
    });
  }
  else {
    logmagic.registerSink('null', function() {});
    logmagic.route('__root__', logmagic.DEBUG, 'null');
  }
}

BaseClient.prototype._request = function(path, method, payload, options, callback) {
  method = method || 'GET';
  payload = payload || null;
  options = options || {};
  var extraHeaders = options.headers || {}, expectedStatusCode = options.expectedStatusCode,
      qs = options.queryString || {}, reqOptions, defaultHeaders, url, headers, curlCmd, self = this;

  this._client.getTenantIdAndToken(function(err, data) {
    var baseUrl = self._url;

    if (err) {
      callback(err);
      return;
    }

    baseUrl += '/' + data.tenantId;

    defaultHeaders = {
      'X-Auth-Token': data.token,
      'User-Agent': 'farscape-client/v0.1.0',
      'Content-Type': 'application/json'
    };

    if (payload) {
      payload = JSON.stringify(payload);
    }

    headers = misc.merge(defaultHeaders, extraHeaders);
    url = sprintf('%s%s', baseUrl, path);
    qs = querystring.stringify(qs);

    if (qs) {
      url += '?' + qs;
    }

    curlCmd = request.buildCurlCommand(url, method, headers, payload);
    log.debugf('curl command: ${cmd}', {'cmd': curlCmd});
    reqOptions = {
      'expected_status_codes': [expectedStatusCode],
      'return_response': true,
      'parse_json': true,
      'headers': headers,
      'persistent': options.persistent
    };

    request.request(url, method, payload, reqOptions, callback);
  });
};

BaseClient.prototype._getIdFromUrl = function(url) {
  var split, id;

  split = url.split('/');
  id = split[split.length - 1];
  return id;
};

BaseClient.prototype._list = function(path, options, callback) {
  options = options || {};
  options.queryString = options.queryString || {};
  options.expectedStatusCode = 200;

  if (options.marker) {
    options.queryString.marker = options.marker;
  }

  if (options.limit) {
    options.queryString.limit = options.limit;
  }

  this._request(path, 'GET', null, options, function(err, res) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, res.body.values);
  });
};

BaseClient.prototype._get = function(path, options, callback) {
  options = options || {};
  options.expectedStatusCode = 200;

  this._request(path, 'GET', null, options, function(err, res) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, res.body);
  });
};

BaseClient.prototype._create = function(path, payload, options, callback) {
  options = options || {};
  options.expectedStatusCode = 201;
  this._request(path, 'POST', payload, options, function(err, res) {
    callback(err, res);
  });
};

BaseClient.prototype._update = function(path, payload, options, callback) {
  options = options || {};
  options.expectedStatusCode = 204;
  this._request(path, 'PUT', payload, options, function(err, res) {
    callback(err, res);
  });
};

BaseClient.prototype._remove = function(path, options, callback) {
  options = options || {};
  options.expectedStatusCode = 204;
  this._request(path, 'DELETE', null, options, function(err, res) {
    callback(err);
  });
};

/* Sessions */

function SessionsClient() {
  BaseClient.apply(this, arguments);
}

util.inherits(SessionsClient, BaseClient);

SessionsClient.prototype.list = function(options, callback) {
  var url = sprintf('/sessions');
  this._list(url, options, callback);
};

SessionsClient.prototype.get = function(id, callback) {
  var url = sprintf('/sessions/%(id)s', {'id': id});
  this._get(url, {}, callback);
};

SessionsClient.prototype.create = function(heartbeatTimeout, payload, callback) {
  payload = payload || {};
  payload.heartbeat_timeout = heartbeatTimeout;
  var url = sprintf('/sessions'), self = this;
  this._create(url, payload, {}, function(err, res) {
    var hb, sessionId, initialToken, resp = res.body;

    if (err) {
      callback(err);
      return;
    }

    sessionId = self._getIdFromUrl(res.headers.location);
    resp.sessionId = sessionId;
    initialToken = res.body.token;
    hb = new HeartBeater(self._url, self._username, self._apiKey, self._region,
                         self._options, sessionId, initialToken, heartbeatTimeout);

    callback(null, resp, hb);
  });
};

SessionsClient.prototype.heartbeat = function(sessionId, token, callback) {
  var url = sprintf('/sessions/%(sessionId)s/heartbeat', {'sessionId': sessionId}),
      payload = {'token': token};
  this._request(url, 'POST', payload, {'expectedStatusCode': 200}, function(err, res) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, res.body.token);
  });
};

SessionsClient.prototype.update = function(sessionId, payload, callback) {
  var url = sprintf('/sessions/%(sessionId)s', {'sessionId': sessionId});
  this._update(url, payload, {}, function(err, res) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, res.headers.location);
  });
};


/* Events */

function EventsClient() {
  BaseClient.apply(this, arguments);
}

util.inherits(EventsClient, BaseClient);

EventsClient.prototype.list = function(marker, options, callback) {
  var url;
  options = options || {};

  if (marker !== null && marker !== undefined) {
    options.queryString = {'marker': marker};
  }
  url = sprintf('/events');
  this._list(url, options, callback);
};

/* Services */

function ServicesClient() {
  BaseClient.apply(this, arguments);
}

util.inherits(ServicesClient, BaseClient);

ServicesClient.prototype.list = function(options, callback) {
  var url = sprintf('/services');
  this._list(url, options, callback);
};

ServicesClient.prototype.listForTag = function(tag, options, callback) {
  options = options || {};
  options.queryString = {'tag': tag};

  var url = '/services';
  this._list(url, options, callback);
};

ServicesClient.prototype.get = function(serviceId, callback) {
  var url = sprintf('/services/%(serviceId)s', {'serviceId': serviceId});
  this._get(url, {}, callback);
};

ServicesClient.prototype.create = function(sessionId, serviceId, payload, callback) {
  payload = payload || {};
  payload.id = serviceId;
  payload.session_id = sessionId;
  var url = '/services';

  this._create(url, payload, {}, function(err, res) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, res.headers.location);
  });
};

ServicesClient.prototype.update = function(serviceId, payload, callback) {
  var url = sprintf('/services/%(serviceId)s', {'serviceId': serviceId});
  this._update(url, payload, {}, function(err, res) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, res.headers.location);
  });
};

ServicesClient.prototype.remove = function(serviceId, callback) {
  var url = sprintf('/services/%(serviceId)s', {'serviceId': serviceId});
  this._remove(url, {}, callback);
};

/* Configuration */

function ConfigurationClient() {
  BaseClient.apply(this, arguments);
}

util.inherits(ConfigurationClient, BaseClient);

ConfigurationClient.prototype.list = function(options, callback) {
  var url = sprintf('/configuration');
  this._list(url, options, callback);
};

ConfigurationClient.prototype.get = function(configurationId, callback) {
  var url = sprintf('/configuration/%(configurationId)s', {'configurationId': configurationId});
  this._get(url, {}, function(err, data) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, data.value);
  });
};

ConfigurationClient.prototype.set = function(configurationId, value, callback) {
  var payload = {'value': value};
  var url = sprintf('/configuration/%(configurationId)s', {'configurationId': configurationId});
  this._update(url, payload, {}, function(err, res) {
    callback(err);
  });
};

ConfigurationClient.prototype.remove = function(configurationId, callback) {
  var url = sprintf('/configuration/%(configurationId)s', {'configurationId': configurationId});
  this._remove(url, {}, callback);
};

/* Account */

function AccountClient() {
  BaseClient.apply(this, arguments);
}

util.inherits(AccountClient, BaseClient);

AccountClient.prototype.getLimits = function(callback) {
  var url = sprintf('/limits');
  this._get(url, {}, callback);
};

/* HeartBeater */

function HeartBeater(url, username, apiKey, region, options, sessionId, initialToken, timeout) {
  this._sessionId = sessionId;
  this._heartbeatTimeout = timeout;

  if (this.heartbeatTimeout < 15) {
    this._heartbeatInterval = (this._heartbeatTimeout * 0.6);
  }
  else {
    this._heartbeatInterval = (this._heartbeatTimeout * 0.8);
  }

  this._timeoutId = null;
  this._nextToken = initialToken;

  this._stopped = false;

  HeartBeater.super_.call(this, url, username, apiKey, region, options);
}

util.inherits(HeartBeater, BaseClient);

HeartBeater.prototype._startHeartbeating = function() {
  // TODO: persistent connection doesn't work with 0.8
  var url = sprintf('/sessions/%(sessionId)s/heartbeat',
      {'sessionId': this._sessionId}),
      payload = {'token': this._nextToken},
      reqOptions = {'expectedStatusCode': 200},
      // reqOptions = {'expectedStatusCode': 200, 'persistent': true},
      self = this, interval;

  if (this._stopped) {
    return;
  }

  // TODO: Use a persistent connection
  log.debug('Sending heartbeat', {'sessionId': this._sessionId, 'token': this._nextToken});

  this._request(url, 'POST', payload, reqOptions, function(err, res) {
    if (err) {
      log.error('API endpoint returned an error', {'error': err});

      if ((err instanceof errors.UnexpectedStatusCodeError) && err.statusCode === 404) {
        log.error('Got 404, won\'t resume heartbeating');
        return;
      }
    }

    interval = self._heartbeatInterval;

    // Jitter for the heartbeat interval
    if (interval > 5) {
      interval = interval + misc.getRandomInt(-3, 1);
    }

    interval = interval * 1000;

    log.debugf('Scheduling next interval for ${interval}s in future',
              {'sessionId': self._sessionId, 'interval': parseInt(interval / 1000, 10)});

    self._nextToken = res.body.token;
    self._timeoutId = setTimeout(self._startHeartbeating.bind(self), interval);
  });
};

HeartBeater.prototype.start = function() {
  log.debug('Starting heartbeating', {'sessionId': this._sessionId});
  this._startHeartbeating();
};

HeartBeater.prototype.stop = function() {
  log.debug('Stopping heartbeating', {'sessionId': this._sessionId});

  this._stopped = true;
  clearTimeout(this._timeoutId);
};

function Client(url, username, apiKey, region, options) {
  this.events = new EventsClient(url, username, apiKey, region, options);
  this.sessions = new SessionsClient(url, username, apiKey, region, options);
  this.services = new ServicesClient(url, username, apiKey, region, options);
  this.configuration = new ConfigurationClient(url, username, apiKey, region, options);
  this.account = new AccountClient(url, username, apiKey, region, options);
}

exports.Client = Client;
exports.HeartBeater = HeartBeater;
