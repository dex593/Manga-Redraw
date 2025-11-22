// This file tells TypeScript how to handle imports for files ending in .json.
// It declares that any such file will have a default export of type `any`.
// This resolves the "Cannot find module '*.json'" error (TS2307).
declare module '*.json' {
  const value: any;
  export default value;
}
