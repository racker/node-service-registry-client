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

  this._baseUrl = url;
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
  payload = payload || '';
  options = options || {};
  var extraHeaders = options.headers || {}, expectedStatusCode = options.expectedStatusCode,
      qs = options.queryString || {}, reqOptions, defaultHeaders, url, headers, curlCmd;

  defaultHeaders = {
    'X-Tenant-Id': this._tenantId,
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
  var qs = {};

  if (options.marker) {
    qs.marker = options.marker;
  }

  if (options.limit) {
    qs.limit = options.limit;
  }

  // TODO: Pagination
  this._request(path, 'GET', null, {'expectedStatusCode': 200, 'queryString': qs}, function(err, res) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, res.body.values);
  });
};

BaseClient.prototype._get = function(path, options, callback) {
  this._request(path, 'GET', null, {'expectedStatusCode': 200}, function(err, res) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, res.body);
  });
};

BaseClient.prototype._create = function(path, payload, options, callback) {
  this._request(path, 'POST', payload, {'expectedStatusCode': 201}, function(err, res) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, res.headers.location);
  });
};

BaseClient.prototype._update = function(path, payload, options, callback) {
  this._request(path, 'PUT', payload, {'expectedStatusCode': 204}, function(err, res) {
    callback(err);
  });
};

BaseClient.prototype._remove = function(path, options, callback) {
  this._request(path, 'DELETE', null, {'expectedStatusCode': 204}, function(err, res) {
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

SessionsClient.prototype.create = function(params, options, callback) {
  var url = sprintf('/sessions');
  this._create(url, params, options, callback);
};

SessionsClient.prototype.heartbeat = function(sessionId, params, options, callback) {
  var url = sprintf('/sessions/%(sessionId)s/heartbeat', {'sessionId': sessionId});
  this._request(path, 'POST', payload, {'expectedStatusCode': 200}, function(err, res) {
    callback(err);
  });
};

SessionsClient.prototype.update = function(sessionId, params, options, callback) {
  var url = sprintf('/sessions/%(sessionId)s', {'sessionId': sessionId});
  this._update(url, params, options, callback);
};


/* Events */

function EventsClient() {
      BaseClient.apply(this, arguments);
}

util.inherits(EventsClient, BaseClient);

EventsClient.prototype.list = function(sinceToken, options, callback) {
  var url = sprintf('/events/%(sinceToken)s', {'sinceToken': sinceToken});
  this._list(url, options, callback);
};

/* Services */

function ServicesClient() {
      BaseClient.apply(this, arguments);
}

util.inherits(ServicesClient, BaseClient);

ServicesClient.prototype.list = function(options, callback) {
  var url = sprintf('/services/');
  this._list(url, options, callback);
};

ServicesClient.prototype.join = function(serviceId, sessionId, params, options, callback) {
  params = params || {};
  params.session_id = sessionId;
  var url = sprintf('/services/%(serviceId)s', {'serviceId': serviceId});
  this._create(url, params, options, callback);
};

ServicesClient.prototype.leave = function(serviceId, params, options, callback) {
  params = params || {};
  params.session_id = sessionId;
  var url = sprintf('/services/%(serviceId)s', {'serviceId': serviceId});
  this._remove(url, params, options, callback);
};

ServicesClient.prototype.get = function(serviceId, params, options, callback) {
  var url = sprintf('/services/%(serviceId)s', {'serviceId': serviceId});
  this._get(url, params, options, callback);
};

function Client(url, tenantId, token, options) {
  this.events = new EventsClient(url, tenantId, token, options);
  this.sessions = new SessionsClient(url, tenantId, token, options);
}

exports.Client = Client;
