// Mock nanoid for Jest tests
let counter = 0;

export const nanoid = () => {
  return `test-id-${counter++}`;
};

export const customAlphabet = () => {
  return () => `test-custom-${counter++}`;
};
