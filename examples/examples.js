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

var async = require('async');

var Client = require('../lib/client').Client;

var client = new Client('joe', 'dev', null, {'debug': true,
  'url': 'http://127.0.0.1:9000/v1.0/',
  'authUrl': 'http://127.0.0.1:23542/v2.0'});

async.waterfall([
  function createSession(callback) {
    client.sessions.create(15, {}, function(err, id, data, hb) {
      console.log('Create session');
      console.log('error: ' + err);
      console.log('data: ' + data);
      callback(null, id, data.token);
      
      // optional:
      // hb.start();
      hb.on('error', function(err) {
        // recover. Probably recreate the session and start up again.
      });
    });
  },

  function getSession(seId, initialToken, callback) {
    client.sessions.get(seId, function(err, data) {
      console.log('Get session');
      console.log('error: ' + err);
      console.log('data: ' + data);
      callback(null, seId, initialToken);
    });
  },

  function heartbeatSession(seId, initialToken, callback) {
    client.sessions.heartbeat(seId, initialToken, function(err, nextToken) {
      console.log('Heartbeat session');
      console.log('error: ' + err);
      console.log('next token: ' + nextToken);
      callback(null, seId);
    });
  },

  function updateSession(seId, callback) {
    var payload = {'heartbeat_timeout': 20};

    client.sessions.update(seId, payload, function(err, id) {
      console.log('Update session');
      console.log('error: ' + err);
      console.log('session id: ' + id);
      callback(null, seId);
    });
  },

  function listSessions(seId, callback) {
    client.sessions.list(null, function(err, data) {
      console.log('List sessions');
      console.log('error: ' + err);
      console.log('data: ' + data);
      callback(null, seId);
    });
  },

  function createService(seId, callback) {
    var payload = {
      'tags': ['tag1', 'tag2'],
      'metadata': {'region': 'dfw', 'port': '9000'}
    };

    client.services.create(seId, 'serviceId', payload, function(err, id) {
      console.log('Create service');
      console.log('error: ' + err);
      console.log('service id: ' + id);
      callback();
    });
  },

  function getService(callback) {
    client.services.get('serviceId', function(err, data) {
      console.log('Get service');
      console.log('error: ' + err);
      console.log('data: ' + data);
      callback();
    });
  },

  function listServices(callback) {
    client.services.list({}, function(err, data) {
      console.log('List services');
      console.log('error: ' + err);
      console.log('data: ' + data);
      callback();
    });
  },

  function removeService(callback) {
    client.services.remove('serviceId', function(err) {
      console.log('Remove service');
      console.log('error: ' + err);
      callback();
    });
  },

  function setConfiguration(callback) {
    client.configuration.set('configId', 'configValue', function(err) {
      console.log('Set configuration');
      console.log('error: ' + err);
      callback();
    });
  },

  function getConfiguration(callback) {
    client.configuration.get('configId', function(err, data) {
      console.log('Get configuration');
      console.log('error: ' + err);
      console.log('data: ' + data);
      callback();
    });
  },

  function listConfiguration(callback) {
    client.configuration.list(null, function(err, data) {
      console.log('List configuration');
      console.log('error: ' + err);
      console.log('data: ' + data);
      callback();
    });
  },

  function removeConfiguration(callback) {
    client.configuration.remove('configId', function(err) {
      console.log('Remove configuration');
      console.log('error: ' + err);
      callback();
    });
  },

  function listEvents(callback) {
    client.events.list(null, {}, function(err, data) {
      console.log('List events');
      console.log('error: ' + err);
      console.log('data: ' + data);
      callback();
    });
  }

], process.exit);
