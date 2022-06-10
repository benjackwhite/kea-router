/* global window */
import {
  kea,
  getPluginContext,
  path,
  actions,
  reducers,
  selectors,
  listeners,
  sharedListeners,
  afterMount,
  beforeUnmount,
  setPluginContext,
} from 'kea'
import { combineUrl } from './utils'
import { routerType } from './routerType'
import { LocationChangedPayload, RouterPluginContext } from './types'

function preventUnload(): boolean {
  // We only check the last reference for unloading. Generally there should only be one loaded anyway.
  const { beforeUnloadInterceptors } = getRouterContext()

  if (!beforeUnloadInterceptors) {
    return
  }

  for (const beforeUnload of Array.from(beforeUnloadInterceptors)) {
    if (!beforeUnload.enabled()) {
      continue
    }

    if (confirm(beforeUnload.message)) {
      beforeUnload.onConfirm?.()
      return false
    }
    return true
  }

  return false
}

export const router = kea<routerType>([
  path(['kea', 'router']),

  actions({
    push: (url: string, searchInput?: string | Record<string, any>, hashInput?: string | Record<string, any>) => ({
      url,
      searchInput,
      hashInput,
    }),
    replace: (url: string, searchInput?: string | Record<string, any>, hashInput?: string | Record<string, any>) => ({
      url,
      searchInput,
      hashInput,
    }),
    locationChanged: ({
      method,
      pathname,
      search,
      searchParams,
      hash,
      hashParams,
      initial,
    }: LocationChangedPayload) => ({
      method,
      pathname,
      search,
      searchParams,
      hash,
      hashParams,
      initial: initial || false,
    }),
    clearUnloadInterceptors: true, // Useful for "save" events where you don't want to wait for a re-render before a push
  }),

  reducers(() => ({
    location: [
      getLocationFromContext(),
      {
        locationChanged: (_, { pathname, search, hash }) => ({ pathname, search, hash }),
      },
    ],
    searchParams: [
      getRouterContext().decodeParams(getLocationFromContext().search, '?'),
      {
        locationChanged: (_, { searchParams }) => searchParams,
      },
    ],
    hashParams: [
      getRouterContext().decodeParams(getLocationFromContext().hash, '#'),
      {
        locationChanged: (_, { hashParams }) => hashParams,
      },
    ],
    lastMethod: [
      null as string | null,
      {
        locationChanged: (_, { method }) => method,
      },
    ],
  })),

  selectors({
    currentLocation: [
      (s) => [s.location, s.searchParams, s.hashParams, s.lastMethod],
      (location, searchParams, hashParams, method) => ({ ...location, searchParams, hashParams, method }),
    ],
  }),

  sharedListeners(({ actions }) => ({
    updateLocation: ({ url, searchInput, hashInput }, breakpoint, action) => {
      const method: 'push' | 'replace' = action.type === actions.push.toString() ? 'push' : 'replace'
      const routerContext = getRouterContext()
      const { history } = routerContext
      const response = combineUrl(url, searchInput, hashInput)

      if (preventUnload()) {
        return
      }

      routerContext.historyStateCount = (routerContext.historyStateCount ?? 0) + 1
      history[`${method}State`]({ count: routerContext.historyStateCount }, '', response.url)
      actions.locationChanged({ method: method.toUpperCase() as 'PUSH' | 'REPLACE', ...response })
    },
  })),

  listeners(({ sharedListeners }) => ({
    push: sharedListeners.updateLocation,
    replace: sharedListeners.updateLocation,
    clearUnloadHandlers: () => {
      const routerContext = getRouterContext()
      routerContext.beforeUnloadInterceptors.clear()
    },
  })),

  afterMount(({ actions, cache }) => {
    if (typeof window === 'undefined') {
      return
    }

    cache.popListener = (event: PopStateEvent) => {
      const routerContext = getRouterContext()
      const { location, decodeParams } = routerContext

      const eventStateCount = event.state?.count

      console.log('KEA_ROUTER', {
        eventStateCount: eventStateCount,
        stateCount: routerContext.historyStateCount,
        listenerLength: cache.__unloadConfirmations?.length,
      })

      if (eventStateCount !== routerContext.historyStateCount && preventUnload()) {
        if (typeof eventStateCount !== 'number' || routerContext.historyStateCount === null) {
          // If we can't determine the direction then we just live with the url being wrong
          return
        }
        if (eventStateCount < routerContext.historyStateCount) {
          routerContext.historyStateCount = eventStateCount + 1 // Account for page reloads
          history.forward()
        } else {
          routerContext.historyStateCount = eventStateCount - 1 // Account for page reloads
          history.back()
        }
        return
      }

      routerContext.historyStateCount =
        typeof eventStateCount === 'number' ? eventStateCount : routerContext.historyStateCount

      if (location) {
        actions.locationChanged({
          method: 'POP',
          pathname: location.pathname,
          search: location.search,
          searchParams: decodeParams(location.search, '?'),
          hash: location.hash,
          hashParams: decodeParams(location.hash, '#'),
          url: `${location.pathname}${location.search}${location.hash}`,
        })
      }
    }
    window.addEventListener('popstate', cache.popListener)
  }),

  beforeUnmount(({ cache }) => {
    if (typeof window === 'undefined') {
      return
    }
    window.removeEventListener('popstate', cache.popListener)
  }),
])

export function getRouterContext(): RouterPluginContext {
  return getPluginContext('router') as RouterPluginContext
}

export function setRouterContext(context: RouterPluginContext): void {
  setPluginContext('router', context)
}

function getLocationFromContext() {
  const {
    location: { pathname, search, hash },
  } = getRouterContext()
  return { pathname, search, hash }
}
