import type {
  UseMutationOptions,
  UseQueryOptions,
  useMutation as useMutationType,
  useQuery as useQueryType,
} from '@tanstack/react-query';

import { RequestMethod } from '../server/handler-types';
import {
  RequestConfig,
  RequestError,
  RouteDefinitions,
  UrlOverrides,
  buildUrl,
  makeApiRequestFunction,
} from './request';

export function makeUseApiMutation<
  Routes extends RouteDefinitions,
  Method extends RequestMethod,
>(
  method: Method,
  useMutation: typeof useMutationType,
  urlOverrides: UrlOverrides = {},
) {
  const mutateFunction = makeApiRequestFunction(method, urlOverrides);

  return function <Route extends keyof Routes>(
    route: Route,
    options?: Omit<
      UseMutationOptions<
        Routes[Route]['api']['data'],
        RequestError,
        RequestConfig<Routes[Route], Method>
      >,
      'mutationKey' | 'mutationFn'
    > & {
      fetchOptions?: Parameters<typeof mutateFunction>[2];
    },
  ) {
    const result = useMutation<
      Routes[Route]['api']['data'],
      RequestError,
      RequestConfig<Routes[Route], Method>
    >(
      [route],
      (variables) =>
        mutateFunction(
          route as string,
          variables as any,
          options?.fetchOptions,
        ),
      options,
    );
    return result;
  };
}

export function makeUseApiQuery<
  Routes extends RouteDefinitions,
  Method extends RequestMethod,
>(
  method: Routes[string]['api']['method'],
  useQuery: typeof useQueryType,
  urlOverrides: UrlOverrides = {},
) {
  const getterFunction = makeApiRequestFunction(method, urlOverrides);

  return function <Route extends keyof Routes>(
    route: Route,
    variables: RequestConfig<Routes[Route], Method>,
    options?: Omit<
      UseQueryOptions<
        Routes[Route]['api']['data'],
        RequestError,
        Routes[Route]['api']['data']
      >,
      'queryKey' | 'queryFn'
    > & {
      fetchOptions?: Parameters<typeof getterFunction>[2];
    },
  ) {
    const { fetchOptions, ...rest } = options || {};

    const queryKey = buildUrl(
      route as string,
      (variables as any)?.params,
      urlOverrides,
    );
    const result = useQuery<Routes[Route]['api']['data'], RequestError>(
      [queryKey],
      () => getterFunction(route as string, variables as any, fetchOptions),
      rest as any,
    );
    return result;
  };
}
