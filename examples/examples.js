var async = require('async');

var Client = require('../lib/client').Client;

var client = new Client('http://127.0.0.1:9000/v1.0/', '7777', 'dev', {'debug': true});

async.waterfall([
  function listSessions(callback) {
    client.sessions.list(null, function(err, url) {
      console.log('List sessions');
      console.log('error: ' + err);
      console.log('location: ' + url);
      callback();
    });
  },

  function createSession(callback) {
    client.sessions.create(15, null, function(err, url) {
      console.log('Create session');
      console.log('error: ' + err);
      console.log('location: ' + url);
      callback();
    });
  },

  function heartbeat(callback) {
    client.sessions.heartbeat(1, 'someToken', function(err, url) {
      console.log('Heartbeat');
      console.log('error: ' + err);
      console.log('location: ' + url);
      callback();
    });
  },

  function updateSession(callback) {
    var payload = {'heartbeat_timeout': 20};
    client.sessions.update(1, payload, function(err, url) {
      console.log('Update session');
      console.log('error: ' + err);
      console.log('location: ' + url);
      callback();
    });
  },

  function listEvents(callback) {
    client.events.list(0, null, function(err, url) {
      console.log('List events');
      console.log('error: ' + err);
      console.log('location: ' + url);
      callback();
    });
  },

  function listServices(callback) {
    client.services.list(null, function(err, url) {
      console.log('List services');
      console.log('error: ' + err);
      console.log('location: ' + url);
      callback();
    });
  },

  function joinService(callback) {
    client.services.join(1, 1, null, function(err, url) {
      console.log('Join service');
      console.log('error: ' + err);
      console.log('location: ' + url);
      callback();
    });
  },

  function leaveService(callback) {
    client.services.leave(1, 1, function(err, url) {
      console.log('Leave service');
      console.log('error: ' + err);
      console.log('location: ' + url);
      callback();
    });
  },

  function getService(callback) {
    client.services.get(1, function(err, url) {
      console.log('Fetch service');
      console.log('error: ' + err);
      console.log('location: ' + url);
      callback();
    });
  },

  function listConfiguration(callback) {
    client.configuration.list(null, function(err, url) {
      console.log('List configuration');
      console.log('error: ' + err);
      console.log('location: ' + url);
      callback();
    });
  },

  function getConfiguration(callback) {
    client.configuration.get(1, function(err, url) {
      console.log('Fetch configuration');
      console.log('error: ' + err);
      console.log('location: ' + url);
      callback();
    });
  },

  function setConfiguration(callback) {
    client.configuration.set(1, {'value': 'foo'}, function(err, url) {
      console.log('Update configuration');
      console.log('error: ' + err);
      console.log('location: ' + url);
      callback();
    });
  },

  function removeConfiguration(callback) {
    client.configuration.remove(1, function(err, url) {
      console.log('Remove configuration');
      console.log('error: ' + err);
      console.log('location: ' + url);
      callback();
    });
  }

], process.exit);
