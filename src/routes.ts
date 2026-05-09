import express, { Request, Response } from 'express';
import multer from 'multer';
import { importTrades } from './importService';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

interface UploadRequest extends Request {
  file?: Express.Multer.File;
}

router.post('/import', upload.single('file'), async (req: UploadRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided',
        message: 'Please upload a CSV file',
      });
    }

    const csvText = req.file.buffer.toString('utf-8');
    const result = await importTrades(csvText);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error processing import:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
