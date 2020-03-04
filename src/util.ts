'use strict'

export async function delay (ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

// extracted/copied from bullmq
// https://github.com/taskforcesh/bullmq/blob/master/src/utils.ts
export function array2object (arr: any[]) {
  const obj: { [index: string]: string } = {}

  for (let i = 0; i < arr.length; i += 2) {
    obj[arr[i]] = arr[i + 1]
  }

  return obj
}
