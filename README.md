# Node.js Service Registry client

Service Registry client in Node.

# License

Library is distributed under the [Apache license](http://www.apache.org/licenses/LICENSE-2.0.html).

# Usage

```Javascript
var Client = require('farscape-client').Client;

// An options Object can have a key 'debug' to enable debug mode and print log messages:
var options = {'debug': true},
  username = 'username',
  apiKey = 'apiKey',
  region = 'us',
  options = {'debug': true};

var cilent = var client = new Client(username, apiKey, region, options);
```

## Sessions

Create a session with a heartbeat timeout of 10:

```Javascript
// Optional metadata (must contain string keys and values, up to 255 chars)
var options = {'key': 'value'},
    heartbeatTimeout = 10;

client.sessions.create(heartbeatTimeout, options, function(err, id, data, hb) {...});
```

List sessions:

```Javascript
client.sessions.list(null, function(err, data) {...});
```

Get session:

```Javascript
var sessionId = 'seFoo';

client.sessions.get(sessionId, function(err, data) {...});
```

Heartbeat a session:

```Javascript
var sessionId = 'seFoo',
    token = 'token';

client.sessions.heartbeat(sessionId, token, function(err, data) {...});
```

Update existing session:

```Javascript
var sessionId = 'seFoo',
    payload = {
      'heartbeat_timeout': 15
    };

client.sessions.update(sessionId, payload, function(err, id) {...});
```

## Events

List events:

```Javascript
var marker = 'last-seen-token';

client.events.list(marker, function(err, data) {...});
```

## Services

List services:

```Javascript
var options = {};

client.services.list(options, function(err, data) {...});
```

List services for a specific tag:

```Javascript
var tag = 'tag',
    options = {};

client.services.listForTag(tag, options, function(err, data) {...});
```

Get service by ID:

```Javascript
var serviceId = 'messenger1';

client.services.get(serviceId, function(err, data) {...});
```

Create a new service:

```Javascript
var sessionId = 'sessionId',
    serviceId = 'messenger1',
    payload = {
      'tags': ['messenger', 'stats'],
      'metadata': {'someKey': 'someValue', 'anotherKey': 'anotherValue'}
    };

client.services.create(sessionId, serviceId, payload, function(err, id) {...});
```

Update existing service:

```Javascript
var serviceId = 'messenger1',
    payload = {
      'tags': ['tag1', 'tag2'],
      'metadata': {'aKey': 'aValue'}
    };

client.services.update(serviceId, payload, function(err, id) {...});
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
