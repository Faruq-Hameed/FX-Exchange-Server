import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// Define the structure of our API response
export interface Response<T> {
  success: boolean; // Indicates if the operation was successful
  statusCode: number; //
  message: string;  // A human-readable message about the operation
  data: T;        // The actual response data
}


/** Interceptor to transform response from controller */
@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    // Get HTTP context and request details
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    const handler = context.getHandler();
    
    
    // Check if a custom success message was set using the @SuccessMessage decorator
    const customMessage = Reflect.getMetadata('success_message', handler);

    return next.handle().pipe(
      // Transform successful responses
      map(data => ({
        statusCode: response.statusCode, // Add the HTTP status code  
        success: true,    
        message: customMessage || this.getSuccessMessage(request.method, request.route.path), // Use custom message or generate default
        data, // Original response data
      })),
      // Handle errors
      catchError(error => {
        // If it's a known HTTP exception, then let it pass through to be handled by exception filter
        if (error instanceof HttpException) {
          return throwError(() => error);
        }
        // For unexpected errors, create a standardized error response
        return throwError(() => ({
          success: false,
          message: 'An unexpected error occurred',
          error: error.message,
        }));
      }),
    );
  }

  // Generate default success messages based on HTTP method and resource path
  private getSuccessMessage(method: string, path: string): string {
    // Extract resource name from the path (e.g., 'tracks' from '/tracks')
    const resource = path.split('/')[1];
    
    // Return appropriate message based on HTTP method
    switch (method) {
      case 'POST':
        return `${resource} created successfully`;
      case 'GET':
        return `${resource} retrieved successfully`;
      case 'PATCH':
      case 'PUT':
        return `${resource} updated successfully`;
      case 'DELETE':
        return `${resource} deleted successfully`;
      default:
        return 'Operation successful';
    }
  }
}
