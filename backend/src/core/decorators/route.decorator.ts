import { RequestHandler, Router, Request, Response, NextFunction } from 'express';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

export interface RouteMetadata {
  method: HttpMethod;
  path: string;
  handlerName: string;
  middlewares: RequestHandler[];
}

export interface ControllerMetadata {
  basePath: string;
  middlewares: RequestHandler[];
  routes: RouteMetadata[];
}

export const CONTROLLER_METADATA_KEY = Symbol('controller_metadata');
export const ROUTES_METADATA_KEY = Symbol('routes_metadata');

/**
 * Controller Class Decorator
 * @param basePath Prefix URL cho controller (VD: '/devices', '/admin')
 * @param middlewares Middlewares cấp controller
 */
export function Controller(basePath: string = '', ...middlewares: RequestHandler[]): ClassDecorator {
  return function (target: any) {
    const proto = target.prototype;
    const existingRoutes: RouteMetadata[] = proto[ROUTES_METADATA_KEY] || [];
    const meta: ControllerMetadata = {
      basePath: basePath.startsWith('/') ? basePath : (basePath ? `/${basePath}` : ''),
      middlewares,
      routes: existingRoutes,
    };
    proto[CONTROLLER_METADATA_KEY] = meta;
  };
}

function createRouteDecorator(method: HttpMethod) {
  return function (path: string = '', ...middlewares: RequestHandler[]) {
    return function (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) {
      if (!target[ROUTES_METADATA_KEY]) {
        target[ROUTES_METADATA_KEY] = [];
      }
      const normalizedPath = path.startsWith('/') || path === '' ? path : `/${path}`;
      target[ROUTES_METADATA_KEY].push({
        method,
        path: normalizedPath,
        handlerName: propertyKey as string,
        middlewares,
      });
      return descriptor;
    };
  };
}

export const Get = createRouteDecorator('get');
export const Post = createRouteDecorator('post');
export const Put = createRouteDecorator('put');
export const Patch = createRouteDecorator('patch');
export const Delete = createRouteDecorator('delete');

/**
 * Decorator gắn thêm Middleware cho từng handler method
 */
export function Use(...middlewares: RequestHandler[]) {
  return function (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) {
    if (!target[ROUTES_METADATA_KEY]) {
      target[ROUTES_METADATA_KEY] = [];
    }
    const route = target[ROUTES_METADATA_KEY].find((r: RouteMetadata) => r.handlerName === propertyKey);
    if (route) {
      route.middlewares.unshift(...middlewares);
    }
    return descriptor;
  };
}

/**
 * Xây dựng Express Router từ một Controller instance đã được gắn decorator @Controller
 */
export function createRouterFromController(controllerInstance: any): Router {
  const router = Router();
  const prototype = Object.getPrototypeOf(controllerInstance);
  const meta: ControllerMetadata = prototype[CONTROLLER_METADATA_KEY];

  if (!meta) {
    console.warn(`[DecoratorRouter] Cảnh báo: Controller ${controllerInstance.constructor.name} chưa được gắn @Controller() decorator.`);
    return router;
  }

  const routes = meta.routes || prototype[ROUTES_METADATA_KEY] || [];

  for (const route of routes) {
    const rawHandler = controllerInstance[route.handlerName];
    if (typeof rawHandler !== 'function') {
      console.warn(`[DecoratorRouter] Không tìm thấy handler [${route.handlerName}] trên ${controllerInstance.constructor.name}`);
      continue;
    }

    // Wrap handler tự động bắt async exception
    const boundHandler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        await rawHandler.call(controllerInstance, req, res, next);
      } catch (err) {
        next(err);
      }
    };

    const allMiddlewares = [...meta.middlewares, ...route.middlewares];
    const fullRoutePath = `${meta.basePath}${route.path}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/';

    (router as any)[route.method](fullRoutePath, ...allMiddlewares, boundHandler);
  }

  return router;
}

/**
 * Đăng ký hàng loạt Controller vào Router hoặc App
 */
export function registerControllers(parent: Router | any, controllers: any[]): Router {
  const router = Router();
  for (const c of controllers) {
    const r = createRouterFromController(c);
    router.use(r);
  }
  if (parent && typeof parent.use === 'function') {
    parent.use(router);
  }
  return router;
}
