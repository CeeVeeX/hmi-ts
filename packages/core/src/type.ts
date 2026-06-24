/**
 * 将指定 keys 变为可选，其余保持必填
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * 将指定 keys 变为必填，其余保持可选
 */
export type RequiredBy<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>
