import { parse } from '@swc/core';
import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';
import { RequestMethod } from '../server/typed-api';

type Segment = {
  type: 'static' | 'param' | 'catchAll' | 'group';
  value: string;
};

type Route = {
  path: string;
  segment: Segment;
  children: Route[];
  parent: Route | null;
  hasHandler?: boolean;
};

export async function parseDir(
  dir: string,
  parent: Route | null,
  initialSegment?: Segment,
): Promise<Route | null> {
  const filesAndFolders = await readdir(dir);
  const folderName = path.basename(dir);

  const segment: Segment = initialSegment ?? getSegment(folderName);

  const hasHandler = filesAndFolders.includes('route.ts');

  const route: Route = {
    path: dir,
    children: [],
    segment,
    parent,
    hasHandler,
  };

  for (const file of filesAndFolders) {
    const filePath = path.join(dir, file);
    if ((await stat(filePath)).isDirectory()) {
      const child = await parseDir(filePath, route);
      if (child) route.children.push(child);
    }
  }

  if (!route.hasHandler && route.children.length === 0) {
    return null;
  }

  return route;
}

export type ApiPath = {
  filepath: string;
  url: string;
  methods: Record<RequestMethod, boolean>;
  params: Record<string, 'string' | 'array'>;
};

export async function getApiPaths(route: Route): Promise<ApiPath[]> {
  const urls: ApiPath[] = [];
  const routesWithHandlers = getRoutesWithHandlers(route);
  for (const route of routesWithHandlers) {
    const segments = getRoutePath(route);
    const filepath = route.path + '/route.ts';
    const url = segments
      .filter((s) => s.segment.type !== 'group')
      .map((s) =>
        s.segment.type === 'static'
          ? s.segment.value
          : s.segment.type === 'catchAll'
          ? `*${s.segment.value}`
          : `:${s.segment.value}`,
      )
      .join('/');

    const params = segments
      .filter(
        (s) => s.segment.type === 'param' || s.segment.type === 'catchAll',
      )
      .reduce((acc, s) => {
        if (acc[s.segment.value]) {
          console.log(
            `WARNING: Ignored duplicate param: ${s.segment.value} in route: ${url} in file: ${filepath}`,
          );
          return acc;
        }
        acc[s.segment.value] = s.segment.type === 'param' ? 'string' : 'array';
        return acc;
      }, {} as Record<string, 'string' | 'array'>);

    const methods: Record<RequestMethod, boolean> = (
      await getNamedExports(filepath)
    ).reduce((acc, name) => {
      if (
        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(
          name,
        )
      ) {
        acc[name as RequestMethod] = true;
      }
      return acc;
    }, {} as Record<RequestMethod, boolean>);

    if (!Object.values(methods).some((v) => v)) {
      console.log(
        `WARNING: No handler methods found for route: ${url} in file: ${filepath}`,
      );
      continue;
    }

    urls.push({
      filepath,
      url,
      params,
      methods,
    });
  }

  return urls;
}

function getRoutePath(route: Route): Route[] {
  const segments: Route[] = [];
  let currentRoute: Route | null = route;
  while (currentRoute) {
    segments.unshift(currentRoute);
    currentRoute = currentRoute.parent;
  }
  return segments;
}

function getRoutesWithHandlers(route: Route): Route[] {
  const routes: Route[] = [];
  if (route.hasHandler) {
    routes.push(route);
  }
  route.children.forEach((child) => {
    routes.push(...getRoutesWithHandlers(child));
  });
  return routes;
}

function getSegment(folderName: string): Segment {
  if (isDynamicSegment(folderName)) {
    const result = dynamicSegmentRegex.exec(folderName);
    return {
      type: 'param',
      value: result?.[1] || '',
    };
  }
  if (isCatchAllSegment(folderName)) {
    const result = catchAllSegmentRegex.exec(folderName);
    return {
      type: 'catchAll',
      value: result?.[1] || '',
    };
  }
  if (isRouteGroupSegment(folderName)) {
    const result = routeGroupSegmentRegex.exec(folderName);
    return {
      type: 'group',
      value: result?.[1] || '',
    };
  }
  return {
    type: 'static',
    value: folderName,
  };
}

export const dynamicSegmentRegex = /\[((?!\.\.\.).*)\]/;
export const isDynamicSegment = (segment: string) =>
  dynamicSegmentRegex.test(segment);

export const catchAllSegmentRegex = /\[\.\.\.(.*)\]/;
export const isCatchAllSegment = (segment: string) =>
  catchAllSegmentRegex.test(segment);

export const routeGroupSegmentRegex = /\((.*)\)/;
export const isRouteGroupSegment = (segment: string) =>
  routeGroupSegmentRegex.test(segment);

async function getNamedExports(filepath: string) {
  const code = await readFile(filepath, { encoding: 'utf8' });
  const ast = await parse(code, {
    syntax: 'typescript',
  });
  const exports = [];
  for (const item of ast.body) {
    if (item.type === 'ExportDeclaration') {
      const { declaration } = item;
      if (declaration.type === 'VariableDeclaration') {
        const { declarations } = declaration;
        for (const variableDeclarator of declarations) {
          if (variableDeclarator.id.type === 'Identifier')
            exports.push(variableDeclarator.id.value);
        }
      } else if (declaration.type === 'FunctionDeclaration')
        exports.push(declaration.identifier.value);
    } else if (item.type === 'ExportNamedDeclaration') {
      for (const specifier of item.specifiers) {
        if (specifier.type === 'ExportSpecifier') {
          if (specifier.exported) exports.push(specifier.exported.value);
          else exports.push(specifier.orig.value);
        }
      }
    }
  }
  return exports;
}
