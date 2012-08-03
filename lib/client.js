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

var misc = require('rackspace-shared-utils/lib/misc');
var request = require('rackspace-shared-utils/lib/request');

/**
 * @constructor
 * @param {String} url Full API url including a version.
 * @param {String} tenantId Tenant id.
 * @param {String} token Auth token.
 * @param {?Object} options Options object with the following keys:
 * - debug - true to enable debug mode and print log messages.
 */
function BaseClient(url, tenantId, token, options) {
  options = options || {};

  this._baseUrl = url + tenantId;
  this._tenantId = tenantId;
  this._token = token;
  this._debug = options.debug || false;

  if (this._debug) {
    logmagic.route('farscape-client', logmagic.DEBUG, 'console');
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
      qs = options.queryString || {}, reqOptions, defaultHeaders, url, headers, curlCmd;

  defaultHeaders = {
    'X-Auth-Token': this._token,
    'User-Agent': 'farscape-client/v0.1.0',
    'Content-Type': 'application/json'
  };

  if (payload) {
    payload = JSON.stringify(payload);
  }

  headers = misc.merge(defaultHeaders, extraHeaders);
  url = sprintf('%s%s', this._baseUrl, path);
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
    'headers': headers
  };

  request.request(url, method, payload, reqOptions, callback);
};

BaseClient.prototype._list = function(path, options, callback) {
  options = options || {};
  var qs = options.queryString || {};
  options.expectedStatusCode = 200;

  if (options.marker) {
    qs.marker = options.marker;
  }

  if (options.limit) {
    qs.limit = options.limit;
  }

  // TODO: Pagination
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
    if (err) {
      callback(err);
      return;
    }

    callback(null, res);
  });
};

BaseClient.prototype._update = function(path, payload, options, callback) {
  options = options || {};
  options.expectedStatusCode = 204;
  this._request(path, 'PUT', payload, options, function(err, res) {
    callback(err);
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
  var url = sprintf('/sessions');
  this._create(url, payload, {}, function(err, res) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, res.headers.location, res.body);
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
  this._update(url, payload, {}, callback);
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
  this._update(url, payload, {}, callback);
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
  this._update(url, payload, {}, callback);
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

function Client(url, tenantId, token, options) {
  this.events = new EventsClient(url, tenantId, token, options);
  this.sessions = new SessionsClient(url, tenantId, token, options);
  this.services = new ServicesClient(url, tenantId, token, options);
  this.configuration = new ConfigurationClient(url, tenantId, token, options);
  this.account = new AccountClient(url, tenantId, token, options);
}

exports.Client = Client;
