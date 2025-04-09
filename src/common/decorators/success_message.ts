/** Custom decorator to allow setting specific success messages for each endpoint */
export const SuccessMessage = (message: string) => {
  return (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    // Store the custom message in the method's metadata
    Reflect.defineMetadata('success_message', message, descriptor.value);
    return descriptor;
  };
};
