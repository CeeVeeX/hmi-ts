/**
 * 将指定 keys 变为可选，其余保持必填
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * 将指定 keys 变为必填，其余保持可选
 */
export type RequiredBy<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>

/**
 * 将联合类型 T 中的每个成员类型都应用 Omit<T, K>，然后再合并为一个联合类型
 * 也就是对联合类型的每个成员类型都去掉指定的 keys
 * @example
 * type A = { a: number; b: string }
 * type B = { a: number; c: boolean }
 * type C = A | B
 * type D = DistributiveOmit<C, 'a'> // { b: string } | { c: boolean }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never
