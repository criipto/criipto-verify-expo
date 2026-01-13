export function createMemoryStorage(): Storage {
  let values: { [key: string]: string } = {};
  return {
    getItem(key) {
      return values[key];
    },
    setItem(key, value) {
      values[key] = value;
    },
    removeItem(key) {
      delete values[key];
    },
    clear() {
      values = {};
    },
    key(index) {
      return Object.keys(values)[index];
    },
    get length() {
      return Object.values(values).length;
    },
  };
}
