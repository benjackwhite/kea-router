import { Logic } from 'kea'

export interface RouterPluginOptions {
  history?: undefined
  location?: undefined
  pathFromRoutesToWindow?: (path: string) => string
  pathFromWindowToRoutes?: (path: string) => string
  encodeParams?: (obj: Record<string, any>, symbol: string) => string
  decodeParams?: (input: string, symbol: string) => Record<string, any>
  urlPatternOptions?: UrlPatternOptions
}

export interface RouterPluginContext {
  history: {
    pushState(state: Record<string, any>, title: string, url: string): void
    replaceState(state: Record<string, any>, title: string, url: string): void
  }
  location: { pathname: string; search: string; hash: string }
  pathFromRoutesToWindow: (path: string) => string
  pathFromWindowToRoutes: (path: string) => string
  encodeParams: (obj: Record<string, any>, symbol: string) => string
  decodeParams: (input: string, symbol: string) => Record<string, any>
  options: RouterPluginOptions
}

// from node_modules/url-pattern/index.d.ts
export interface UrlPatternOptions {
  escapeChar?: string
  segmentNameStartChar?: string
  segmentValueCharset?: string
  segmentNameCharset?: string
  optionalSegmentStartChar?: string
  optionalSegmentEndChar?: string
  wildcardChar?: string
}

export type ActionToUrlReturn =
  | void
  | string
  | [string]
  | [string, string | Record<string, any> | undefined]
  | [string, string | Record<string, any> | undefined, string | Record<string, any> | undefined]
  | [string, string | Record<string, any> | undefined, string | Record<string, any> | undefined, { replace?: boolean }]

export interface LocationChangedPayload {
  method: 'PUSH' | 'REPLACE' | 'POP'
  pathname: string
  search: string
  searchParams: Record<string, any>
  hash: string
  hashParams: Record<string, any>
  url: string
  initial?: boolean
}

export type UrlToActionPayload<L extends Logic = Logic> = Record<
  string,
  (
    params: Record<string, string | undefined>,
    searchParams: Record<string, any>,
    hashParams: Record<string, any>,
    payload: {
      method: 'PUSH' | 'REPLACE' | 'POP'
      pathname: string
      search: string
      searchParams: Record<string, any>
      hash: string
      hashParams: Record<string, any>
      url: string
      initial?: boolean
    },
    previousLocation: {
      method: 'PUSH' | 'REPLACE' | 'POP' | null
      pathname: string
      search: string
      searchParams: Record<string, any>
      hash: string
      hashParams: Record<string, any>
      url: string
    },
  ) => any
>

export type ActionToUrlPayload<L extends Logic = Logic> = {
  [K in keyof L['actionCreators']]?: (
    payload: Record<string, any>,
  ) =>
    | void
    | string
    | [string]
    | [string, string | Record<string, any> | undefined]
    | [string, string | Record<string, any> | undefined, string | Record<string, any> | undefined]
    | [
        string,
        string | Record<string, any> | undefined,
        string | Record<string, any> | undefined,
        { replace?: boolean },
      ]
}
