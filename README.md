# Node.js Service Registry client

Service Registry client in Node.

# License

Library is distributed under the [Apache license](http://www.apache.org/licenses/LICENSE-2.0.html).

# Usage

```Javascript
var Client = require('farscape-client').Client;

// An options Object can have a key 'debug' to enable debug mode and print log messages:
var options = {'debug': true};

var cilent = var client = new Client('http://127.0.0.1:9000/v1.0/', '7777', 'dev', options);
```

Create a session with a heartbeat timeout of 10:

```Javascript
// Optional metadata (must contain string keys and values, up to 255 chars)
var options = {'key': 'value'},
    heartbeatTimeout = 10;

client.sessions.create(heartbeatTimeout, options, function(err, url, data) {...});
```

## Sessions

List sessions:

```Javascript
client.sessions.list(null, function(err, data) {...});
```

Get session:

```Javascript
var sessionId = 1;

client.sessions.get(sessionId, function(err, data) {...});
```

Heartbeat a session:

```Javascript
var sessionId = 1,
    token = 'token';

client.sessions.heartbeat(sessionId, token, function(err, data) {...});
```

## Events

List events:

```Javascript
var sinceToken = 'last-seen-token';

client.events.list(sinceToken, function(err, data) {...});
```

## Services

List services:

```Javascript
var tag = 'tag',
    options = {};

client.services.list(tag, options, function(err, data) {...});
```

## Configuration

List configuration values:

```Javascript
var options = {};

client.configuration.list(options, function(err, data {...});
```

Get configuration value by id:

```Javascript
var configurationId = 1;

client.configuration.get(configurationId, function(err, data {...});
```

Update configuration value:

```Javascript
var configurationId = 1,
    value = 'new-value';

client.configuration.set(configurationId, value, function(err, data {...});
```

Delete configuration value:

```Javascript
var configurationId = 1;

client.configuration.remove(configurationId, function(err, data {...});
```

## Accounts

Get account limits:

```Javascript
client.account.getLimits(function(err, data {...});
```
