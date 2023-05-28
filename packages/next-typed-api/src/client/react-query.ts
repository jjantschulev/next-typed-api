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
  buildUrl,
  makeApiRequestFunction,
} from './request';

export function makeUseApiMutation<
  Routes extends RouteDefinitions,
  Method extends RequestMethod,
>(
  method: Method,
  useMutation: typeof useMutationType,
  buildTimeBaseUrl?: string,
) {
  const mutateFunction = makeApiRequestFunction(method, buildTimeBaseUrl);

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
  buildTimeBaseUrl?: string,
) {
  const getterFunction = makeApiRequestFunction(method, buildTimeBaseUrl);

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
      buildTimeBaseUrl,
    );
    const result = useQuery<
      Routes[Route]['api']['data'],
      RequestError,
      RequestConfig<Routes[Route], Method>
    >(
      [queryKey],
      () => getterFunction(route as string, variables as any, fetchOptions),
      rest as any,
    );
    return result;
  };
}
