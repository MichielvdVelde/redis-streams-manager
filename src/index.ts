'use strict'

import { EventEmitter } from 'events'
import { Redis } from 'ioredis'

import { delay, array2object } from './util'

export interface StreamListener {
  (data: Record<string, string>, id: string, name: string): void
}

export interface StreamManagerOptions {
  blockingTimeout?: number,
  count?: number
}

export default class StreamsManager extends EventEmitter {
  private _started = false
  private _streams: Map<string, string> = new Map()
  private _client: Redis
  private _opts: StreamManagerOptions

  public constructor (blockingClient: Redis, opts: StreamManagerOptions = {}) {
    super()
    this._client = blockingClient
    this._opts = {
      blockingTimeout: 10000,
      ...opts
    }
  }

  public get started () {
    return this._started
  }

  public get size () {
    return this._streams.size
  }

  public has (stream: string) {
    return this._streams.has(stream)
  }

  public start () {
    if (this._started || !this._streams.size) {
      return
    }

    this._consumeEvents().catch(err => this.emit('error', err))
  }

  public stop () {
    this._started = false
  }

  public getId (stream: string) {
    return this._streams.get(stream)
  }

  private async _consumeEvents () {
    this._started = true

    while (this._started) {
      try {
        const data = await this._client.xread(
          ...this._buildCommandArgs()
        ) as any

        if (!data) {
          continue
        }

        for (const stream of data) {
          const name = stream[0]

          if (!this._streams.has(name)) {
            continue
          }

          const events = stream[1]

          for (const event of events) {
            const id = event[0]
            const args = array2object(event[1])

            this._streams.set(name, id)
            this.emit(name, args, id, name)
          }
        }

      } catch (err) {
        if (err.message !== 'Connection is closed.') {
          this._started = false
          throw err
        }

        await delay(5000)
      }
    }
  }

  private _buildCommandArgs () {
    const args: (string | number)[] = [
      'BLOCK', this._opts.blockingTimeout
    ]

    if (this._opts.count) {
      args.push('COUNT', this._opts.count)
    }

    args.push(
      'STREAMS',
      ...this._streams.keys(),
      ...this._streams.values()
    )

    return args
  }

  public on (stream: string, ...listeners: StreamListener[]) {
    return this.addListeners(stream, ...listeners)
  }

  public off (stream: string, ...listeners: StreamListener[]) {
    return this.removeListeners(stream, ...listeners)
  }

  public once (stream: string, ...listeners: StreamListener[]) {
    for (const listener of listeners) {
      super.once(stream, (data: Record<string, string>, id: string, name: string) => {
        if (!this.listenerCount(stream)) {
          this.remove(stream)
        }

        listener(data, id, name)
      })
    }

    if (!this._streams.has(stream)) {
      this.add(stream)
    }

    return this
  }

  public addListener (stream: string, listener: StreamListener) {
    return this.addListeners(stream, listener)
  }

  public addListeners (stream: string, ...listeners: StreamListener[]) {
    for (const listener of listeners) {
      super.addListener(stream, listener)
    }

    if (!this._streams.has(stream)) {
      this.add(stream)
    }

    return this
  }

  public removeListener (stream: string, listener: StreamListener) {
    return this.removeListeners(stream, listener)
  }

  public removeListeners (stream: string, ...listeners: StreamListener[]) {
    for (const listener of listeners) {
      super.removeListener(stream, listener)
    }

    if (!this.listenerCount(stream)) {
      this.remove(stream)
    }

    return this
  }

  public prependListener (stream: string, listener: StreamListener) {
    return this.prependListeners(stream, listener)
  }

  public prependListeners (stream: string, ...listeners: StreamListener[]) {
    for (const listener of listeners) {
      super.prependListener(stream, listener)
    }

    if (!this._streams.has(stream)) {
      this.add(stream)
    }

    return this
  }

  public prependOnceListener (stream: string, listener: StreamListener) {
    return this.prependOnceListeners(stream, listener)
  }

  public prependOnceListeners (stream: string, ...listeners: StreamListener[]) {
    for (const listener of listeners) {
      super.prependOnceListener(stream, (data: Record<string, string>, id: string, name: string) => {
        if (!this.listenerCount(stream)) {
          this.remove(stream)
        }

        listener(data, id, name)
      })
    }

    if (!this._streams.has(stream)) {
      this.add(stream)
    }

    return this
  }

  public removeAllListeners (...streams: string[]) {
    if (!streams.length) {
      super.removeAllListeners()
    } else {
      this.remove(...streams)

      for (const stream of streams) {
        super.removeAllListeners(stream)
      }
    }

    return this
  }

  public add (...streams: ({ key: string, id?: string } | string)[]) {
    if (!streams.length) {
      throw new TypeError('add() expects at least one stream')
    }

    for (let stream of streams) {
      if (typeof stream === 'string') {
        stream = { key: stream }
      }

      if (!this._streams.has(stream.key)) {
        this._streams.set(stream.key, stream.id || '$')
      }
    }

    if (!this._started) {
      this.start()
    }
  }

  public remove (...streams: string[]) {
    if (!streams.length) {
      throw new TypeError('remove() expects at least one stream')
    }

    for (const stream of streams) {
      this._streams.delete(stream)
    }

    if (!this._streams.size && this._started) {
      this.stop()
    }
  }
}
