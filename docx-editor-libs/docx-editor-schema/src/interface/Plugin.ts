export type PluginFunction<Options> = (editor: any, options?: Options) => any

export type UsePlugin = <Options>(
  pluginFunction: PluginFunction<Options>,
  options?: Options
) => void
