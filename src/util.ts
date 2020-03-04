'use strict'

export async function delay (ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

export function array2object (arr: any[]) {
  const obj: { [index: string]: string } = {}

  for (let i = 0; i < arr.length; i += 2) {
    // escape double quotes - https://gist.github.com/getify/3667624
    obj[arr[i]] = arr[i + 1].replace(/\\([\s\S])|(")/g,"\\$1$2")
  }

  return obj
}
