// Vite worker imports
declare module '*?worker&inline' {
  const workerConstructor: {
    new (): Worker
  }
  export default workerConstructor
}

// JSON imports
declare module '*.json' {
  const value: any
  export default value
  export const version: string
}

// CSS module imports
declare module '*.css' {
  const content: string
  export default content
}
