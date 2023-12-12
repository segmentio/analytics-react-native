export const createCallbackManager = <V, R = void>() => {
  type Callback = (value: V) => R;
  const callbacks: Callback[] = [];

  const deregister = (callback: Callback) => {
    callbacks.splice(callbacks.indexOf(callback), 1);
  };

  const register = (callback: Callback) => {
    callbacks.push(callback);
    return () => {
      deregister(callback);
    };
  };

  const run = (value: V) => {
    for (const callback of [...callbacks]) {
      callback(value);
    }
  };

  return { register, deregister, run };
};
