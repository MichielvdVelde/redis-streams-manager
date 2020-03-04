# redis-streams-manager

Easy Redis Streams manager. The manager handles the consumption of multiple
Streams, and emits new entries by stream name.

* Is an `EventEmitter` which emits stream entries by stream name
* Use `on` and `once` for automatic starting and stopping
* Use `removeListener` for automatic stopping

Extracted from a personal project in which I required an easy way to work
with multiple streams.

[ioredis](https://github.com/luin/ioredis) is marked as a peer dependency,
you'll need to install it yourself.

The code was heavily inspired by [BullMQ](https://github.com/taskforcesh/bullmq/blob/master/src/classes/queue-events.ts).

## Install

```
npm i redis-streams-manager
```

## Example

Small and confusing example. See the source code for more information.

```ts
import IORedis from 'ioredis'
import StreamsManager, { StreamsListener } from 'redis-streams-manager'

const blockingClient = new IORedis()
// manager uses blocking commands,
// so it needs a dedicated Redis connection!
const streams = new StreamsManager(blockingClient)

// define a listener
const listener: StreamListener = (data, id, name) => {
  // `data` is a key-value object
  // `id` is the stream message id
  // `name` is the stream name
}

// consumption will start automatically
// when using `on` and not started yet
streams.on('myStream', listener)

// consumption will stop automatically
// when using `removeListener` and no remaining listeners
streams.removeListener('myStream', listener)

// manually add one or more streams
// if `id` is omitted, defaults to `$`
streams.add('myStream', { key: 'myStream', id: '$' })

// manually remove one or more streams
streams.remove('myStream')
```

## License

Copyright 2020 Michiel van der Velde.

This software is licensed under [the MIT License](LICENSE).
