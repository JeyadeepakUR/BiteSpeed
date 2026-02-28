import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import identityRoutes from './routes/identity.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', identityRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Identity Reconciliation Service is running.' });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
