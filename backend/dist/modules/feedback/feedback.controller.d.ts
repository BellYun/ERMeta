import { Request } from 'express';
import { FeedbackService } from './feedback.service';
export declare class FeedbackDto {
    category?: string;
    message: string;
    contact?: string;
}
export declare class FeedbackController {
    private readonly feedbackService;
    constructor(feedbackService: FeedbackService);
    submit(body: FeedbackDto, req: Request): Promise<{
        success: boolean;
    }>;
}
