/**
 * Represents a constructor function for a class.
 * @param {Array<any>} arguments_ The arguments to pass to the constructor.
 * @returns {T} The created instance.
 * @template T The type of the class.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/container#dynamic-factory-functions}
 */
export type TConstructor<T> = new (...arguments_: Array<any>) => T;
