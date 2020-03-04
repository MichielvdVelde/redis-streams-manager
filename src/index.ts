'use strict'

import { EventEmitter } from 'events'
import { Redis } from 'ioredis'

import { delay, array2object } from './util'

export interface StreamListener<T = { [key: string]: string }> {
  (data: T, id: string, name: string): void
}

export default class StreamsManager extends EventEmitter {
  private _started = false
  private _streams: Map<string, string> = new Map()
  private _client: Redis

  public constructor (blockingClient: Redis) {
    super()
    this._client = blockingClient
  }

  public get started () {
    return this._started
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

  private async _consumeEvents () {
    this._started = true

    while (this._started) {
      try {
        const data = await this._client.xread(
          'BLOCK',
          10000,
          'STREAMS',
          ...this._streams.keys(),
          ...this._streams.values()
        ) as any

        if (!data) {
          continue
        }

        for (const stream of data) {
          const name = stream[0]
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

  public on<T extends { [key: string]: string }> (stream: string, listener: StreamListener<T>) {
    return this.addListener(stream, listener)
  }

  public off (stream: string, listener: StreamListener<any>) {
    return this.removeListener(stream, listener)
  }

  public once<T extends { [key: string]: string }> (stream: string, listener: StreamListener<T>) {
    super.once(stream, (data: T, id: string, name: string) => {
      if (!this.listenerCount(stream)) {
        this.remove(stream)
      }

      listener(data, id, name)
    })

    if (!this._streams.has(stream)) {
      this.add(stream)
    }

    return this
  }

  public addListener (stream: string, listener: StreamListener<any>) {
    super.addListener(stream, listener)

    if (!this._streams.has(stream)) {
      this.add(stream)
    }

    return this
  }

  public removeListener (stream: string, listener: StreamListener<any>) {
    super.removeListener(stream, listener)

    if (!this.listenerCount(stream)) {
      this.remove(stream)
    }

    return this
  }

  public add (...streams: ({ key: string, id?: string } | string)[]) {
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
    for (const stream of streams) {
      this._streams.delete(stream)
      this.removeAllListeners(stream)
    }

    if (!this._streams.size && this._started) {
      this.stop()
    }
  }
}
