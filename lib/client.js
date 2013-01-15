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

var util = require('util');

var async = require('async');
var logmagic = require('logmagic');
var log = require('logmagic').local('service-registry-client.client');
var sprintf = require('sprintf').sprintf;

var misc = require('rackspace-shared-utils/lib/misc');
var request = require('rackspace-shared-utils/lib/request');
var errors = require('rackspace-shared-utils/lib/errors');

var BaseClient = require('./base').BaseClient;
var HeartBeater = require('./heartbeater').HeartBeater;


/**
 * Maximum heartbeat timeout in seconds.
 */
var MAX_HEARTBEAT_TIMEOUT = 30 * 1000;

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
  payload = misc.merge(payload || {}, {});
  payload.heartbeat_timeout = heartbeatTimeout;
  var url = sprintf('/sessions'), self = this, response;
  this._create(url, payload, {}, function(err, res) {
    var hb, sessionId, initialToken;

    if (err) {
      callback(err);
      return;
    }

    sessionId = self._getIdFromUrl(res.headers.location);
    initialToken = res.body.token;
    hb = new HeartBeater(self._username, self._apiKey, self._region,
                         self._options, sessionId, initialToken, heartbeatTimeout);

    hb.on('error', function(err) {
      log.error('Unrecoverable error in heartbeat.', {err: err});
      hb.stop();
    });
    response = self._options.raw ? res : res.body;
    callback(null, sessionId, response, hb);
  });
};

SessionsClient.prototype.heartbeat = function(sessionId, token, callback) {
  var url = sprintf('/sessions/%(sessionId)s/heartbeat', {'sessionId': sessionId}),
      payload = {'token': token}, self = this, response;
  this._request(url, 'POST', payload, {'expectedStatusCode': 200}, function(err, res) {
    if (err) {
      callback(err);
      return;
    }

    response = self._options.raw ? res : res.body.token;
    callback(null, response);
  });
};

SessionsClient.prototype.update = function(sessionId, payload, callback) {
  var url = sprintf('/sessions/%(sessionId)s', {'sessionId': sessionId}),
      self = this, response;

  this._update(url, payload, {}, function(err, res) {
    var sessionId;

    if (err) {
      callback(err);
      return;
    }

    sessionId = self._getIdFromUrl(res.headers.location);
    response = self._options.raw ? res : sessionId;
    callback(null, response);
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
  payload = misc.merge(payload || {}, {});
  payload.id = serviceId;
  payload.session_id = sessionId;
  var url = '/services', self = this, response;

  this._create(url, payload, {}, function(err, res) {
    var serviceId;

    if (err) {
      callback(err);
      return;
    }

    serviceId = self._getIdFromUrl(res.headers.location);
    response = self._options.raw ? res : serviceId;
    callback(null, response);
  });
};

ServicesClient.prototype.register = function(sessionId, serviceId, payload, options, callback) {
  options = options || {};
  var retryDelay = options.retryDelay || 2000,
      retryCount = options.retryCount || (MAX_HEARTBEAT_TIMEOUT / retryDelay),
      retryCounter = 0, success = false, res = null, lastErr = null,
      self = this;

  async.whilst(
    function testFunction() {
      retryCounter++;
      return (retryCounter < retryCount && !success);
    },

    function createService(callback) {
      self.create(sessionId, serviceId, payload, function(err, _res) {
        lastErr = err;

        if (err && err.response && err.response.body &&
            (err.response.body.type === 'serviceWithThisIdExists')) {
          log.info('Service which this ID already exists, assuming this service has died, retrying...');
          err = null;
        }
        else if (!err) {
          success = true;
          res = _res;
        }

        setTimeout(callback.bind(null, err), retryDelay);
      });
    },

    function(err) {
      callback(err || lastErr, res);
    }
  );
};

ServicesClient.prototype.update = function(serviceId, payload, callback) {
  var url = sprintf('/services/%(serviceId)s', {'serviceId': serviceId}),
      self = this, response;

  this._update(url, payload, {}, function(err, res) {
    var serviceId;

    if (err) {
      callback(err);
      return;
    }
    serviceId = self._getIdFromUrl(res.headers.location);
    response = self._options.raw ? res : serviceId;
    callback(null, response);
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
  var url = sprintf('/configuration/%(configurationId)s', {'configurationId': configurationId}),
      self = this, response;
  this._get(url, {}, function(err, data) {
    if (err) {
      callback(err);
      return;
    }

    response = self._options.raw ? data : data.value;
    callback(null, response);
  });
};

ConfigurationClient.prototype.set = function(configurationId, value, callback) {
  var payload = {'value': value}, self = this, response, url;
  url = sprintf('/configuration/%(configurationId)s', {'configurationId': configurationId});
  this._update(url, payload, {}, function(err, res) {
    if (self._options.raw) {
      callback(err, res);
    }
    else {
      callback(err);
    }
  });
};

ConfigurationClient.prototype.remove = function(configurationId, callback) {
  var url = sprintf('/configuration/%(configurationId)s', {'configurationId': configurationId});
  this._remove(url, {}, callback);
};

/* Views */

function ViewsClient() {
  BaseClient.apply(this, arguments);
}

util.inherits(ViewsClient, BaseClient);

ViewsClient.prototype.getOverview = function(options, callback) {
  var url = sprintf('/views/overview');
  this._list(url, options, callback);
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


function Client(username, apiKey, region, options) {
  this.events = new EventsClient(username, apiKey, region, options);
  this.sessions = new SessionsClient(username, apiKey, region, options);
  this.services = new ServicesClient(username, apiKey, region, options);
  this.configuration = new ConfigurationClient(username, apiKey, region, options);
  this.views = new ViewsClient(username, apiKey, region, options);
  this.account = new AccountClient(username, apiKey, region, options);
}

exports.Client = Client;
