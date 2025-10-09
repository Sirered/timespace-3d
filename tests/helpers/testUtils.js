export async function flushPromises() {
  return new Promise(setImmediate);
}