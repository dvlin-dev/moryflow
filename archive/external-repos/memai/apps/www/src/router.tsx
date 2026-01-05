import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

let router: ReturnType<typeof createTanStackRouter> | undefined

export function createRouter() {
  if (router) return router

  router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
  })

  return router
}

export function getRouter() {
  return createRouter()
}
