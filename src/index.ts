import express from 'express';
import cors from 'cors';
import subjectsRouter from './routes/subjects';

const app = express();
const PORT = 8000;
const frontendOrigin = process.env.FRONTEND_URL ?? 'http://localhost:5173';

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL must be set in production');
}

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set in .env file');
}

app.use(cors({
    origin: frontendOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}))

app.use(express.json());

app.use('/api/subjects', subjectsRouter);

app.get('/', (req, res) => {
    res.send('Hello, Welcome to the Classroom API!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});