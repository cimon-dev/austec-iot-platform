import { Router } from 'express';
import { UploadController, uploadMulter } from './upload.controller.js';
import { createRouterFromController } from '../../core/decorators/index.js';

export { uploadMulter };
export const uploadRouter: Router = createRouterFromController(new UploadController());

