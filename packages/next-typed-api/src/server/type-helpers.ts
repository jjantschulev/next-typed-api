import { ZodTypeAny, z } from 'zod';

export type PartialZodObject<T extends z.AnyZodObject> = z.ZodObject<
  {
    [K in keyof T['shape']]: z.ZodOptional<T['shape'][K]>;
  },
  T['_def']['unknownKeys'],
  T['_def']['catchall']
>;

export type BodyTypesDontConflict<
  T1 extends ValidBodyTypes,
  T2 extends ValidBodyTypes,
> = T1 extends z.AnyZodObject
  ? T2 extends z.AnyZodObject
    ? ZodObjectsDontConflict<T1, T2>
    : T1
  : T1;

export type ZodObjectsDontConflict<
  T1 extends z.AnyZodObject,
  T2 extends z.AnyZodObject,
> = ObjectsDontConflict<T1['shape'], T2['shape']> extends never ? never : T1;

export type ObjectsDontConflict<T1 extends object, T2 extends object> = {
  [K in keyof T1]: K extends keyof T2
    ? T1[K] extends T2[K]
      ? T2[K] extends T1[K]
        ? true
        : false
      : false
    : never;
}[keyof T1] extends true
  ? T1
  : never;

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type ExpandRecursively<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandRecursively<O[K]> }
    : never
  : T;

export type MergeTypes<A, B> = Expand<B & Omit<A, keyof B>>;
export type TripleMerge<A, B, C> = Expand<
  C & Omit<B, keyof C> & Omit<A, keyof B | keyof A>
>;

export type MergeZodObjects<
  A extends z.AnyZodObject,
  B extends z.AnyZodObject,
> = z.ZodObject<
  z.objectUtil.extendShape<A['shape'], B['shape']>,
  B['_def']['unknownKeys'],
  B['_def']['catchall']
>;

export type MergeValidBodyTypes<
  A extends ValidBodyTypes,
  B extends ValidBodyTypes,
> = A extends IgnoreRequestBody
  ? B
  : B extends IgnoreRequestBody
  ? A
  : A extends z.AnyZodObject
  ? B extends z.AnyZodObject
    ? MergeZodObjects<A, B>
    : B
  : B;

export type ExtendZodObject<
  A extends z.AnyZodObject,
  B extends z.ZodRawShape,
> = z.ZodObject<
  z.objectUtil.extendShape<A['shape'], B>,
  A['_def']['unknownKeys'],
  A['_def']['catchall']
>;

export type ExtendsBig<T, U> = T extends U ? T : never;
export type ExtendsSmall<T, U> = T extends U ? U : never;

export type Assert<T, U extends T> = T;
export type WithErrors<
  T,
  E,
  ThrowErrors extends boolean | undefined,
> = ThrowErrors extends false
  ? { status: 'error'; error: E } | { status: 'ok'; data: T }
  : T;
export type RemoveNever<T> = Pick<
  T,
  {
    [K in keyof T]: T[K] extends never ? never : K;
  }[keyof T]
>;
export type ObjectToNever<T> = object extends Required<T> ? never : T;
export type EmptyRecordToNever<T> = Record<string, never> extends T ? never : T;

export type PickUndefined<T> = {
  [P in keyof T as undefined extends T[P] ? P : never]: T[P];
};

export type PickNotUndefined<T> = {
  [P in keyof T as undefined extends T[P] ? never : P]: T[P];
};

export type AddOptionalsToUndefined<T> = {
  [K in keyof PickUndefined<T>]?: T[K];
} & {
  [K in keyof PickNotUndefined<T>]: T[K];
};

export type MakeObjectWithOptionalKeysUndefinable<T> = keyof T extends keyof {
  [K in keyof T as undefined extends T[K] ? K : never]: true;
}
  ? T | undefined
  : T;

export class IgnoreRequestBody {
  private readonly _ignoreRequestBody = 'ignoreRequestBody';
}

export type ValidBodyTypes =
  | IgnoreRequestBody
  | z.ZodAny
  | z.ZodUnknown
  | z.ZodArray<any, any>
  | z.ZodObject<any, any, any>
  | z.ZodUnion<any>
  | z.ZodDiscriminatedUnion<any, any>
  | z.ZodIntersection<any, any>
  | z.ZodTuple<any, any>
  | z.ZodRecord<any, any>
  | z.ZodMap<any>
  | z.ZodSet<any>;

export const ValidBodyTypeClasses = [
  z.ZodAny,
  z.ZodUnknown,
  z.ZodArray,
  z.ZodObject,
  z.ZodUnion,
  z.ZodDiscriminatedUnion,
  z.ZodIntersection,
  z.ZodTuple,
  z.ZodRecord,
  z.ZodMap,
  z.ZodSet,
  IgnoreRequestBody,
];

export type InferBodyType<T extends ValidBodyTypes> = T extends ZodTypeAny
  ? z.infer<T>
  : never;
