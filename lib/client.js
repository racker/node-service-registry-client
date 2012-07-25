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
