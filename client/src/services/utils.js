export function renameKeys(obj, keyMap) {
  return Object.keys(obj).reduce((acc, key, i) => {
    const newKey = keyMap[key] || key; // Use the new key if it exists in the keyMap, otherwise use the original key
    acc[newKey] = obj[key];
    return acc;
  }, {});
}
