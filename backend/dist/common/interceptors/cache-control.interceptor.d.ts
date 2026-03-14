import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
export type CachePreset = 'immutable' | 'slow' | 'daily' | 'frequent';
export declare function CacheControlInterceptor(preset: CachePreset): {
    new (): {
        intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
    };
};
