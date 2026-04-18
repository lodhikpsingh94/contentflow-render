import 'dotenv/config';

export const getSecurityConfig = () => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
        process.exit(1);
    }
    return {
        jwtSecret,
    };
};